import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertParcelSchema, 
  insertRouteSchema, 
  insertIssueSchema, 
  insertNotificationSchema, 
  insertNotificationPreferenceSchema 
} from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API routes
  
  // ============= PARCELS ==================
  
  // Get all parcels (admin/staff only)
  app.get("/api/parcels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      // Senders can only see their own parcels
      const parcels = await storage.listParcelsByUserId(user.id);
      return res.json(parcels);
    }
    
    // Admin and staff can see all parcels
    const parcels = await storage.listParcels();
    res.json(parcels);
  });
  
  // Get parcel by ID
  app.get("/api/parcels/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid parcel ID" });
    }
    
    const parcel = await storage.getParcel(id);
    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }
    
    const user = req.user!;
    if (user.role === "sender" && parcel.userId !== user.id) {
      return res.sendStatus(403);
    }
    
    res.json(parcel);
  });
  
  // Get parcel by tracking number
  app.get("/api/parcels/tracking/:trackingNumber", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const trackingNumber = req.params.trackingNumber;
    const parcel = await storage.getParcelByTrackingNumber(trackingNumber);
    
    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }
    
    const user = req.user!;
    if (user.role === "sender" && parcel.userId !== user.id) {
      return res.sendStatus(403);
    }
    
    res.json(parcel);
  });
  
  // Create a new parcel
  app.post("/api/parcels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Generate tracking number
      const trackingNumber = `MRP-${nanoid(7).toUpperCase()}`;
      
      // Validate request body
      const validatedData = insertParcelSchema.parse({
        ...req.body,
        estimatedDelivery: req.body.estimatedDelivery.toISOString(),
        trackingNumber,
        userId: req.user!.id, // Ensure the user ID is set to the logged-in user
      });
      
      const parcel = await storage.createParcel(validatedData);
      res.status(201).json(parcel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(400).json({ message: "Invalid parcel data", errors: error });
    }
  });
  
  // Update a parcel
  app.patch("/api/parcels/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid parcel ID" });
    }
    
    const parcel = await storage.getParcel(id);
    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }
    
    const user = req.user!;
    // Only admin/staff can update parcels, or the sender of the parcel
    if (user.role === "sender" && parcel.userId !== user.id) {
      return res.sendStatus(403);
    }
    
    try {
      const updatedParcel = await storage.updateParcel(id, req.body);
      res.json(updatedParcel);
    } catch (error) {
      res.status(400).json({ message: "Invalid parcel data" });
    }
  });
  
  // ============= ROUTES ==================
  
  // Get all routes (admin/staff only)
  app.get("/api/routes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      return res.sendStatus(403);
    }
    
    const routes = await storage.listRoutes();
    res.json(routes);
  });
  
  // Get active routes
  app.get("/api/routes/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const routes = await storage.listActiveRoutes();
    
    // If user is a sender, filter routes for their parcels only
    const user = req.user!;
    if (user.role === "sender") {
      const userParcels = await storage.listParcelsByUserId(user.id);
      const userParcelIds = userParcels.map(p => p.id);
      const filteredRoutes = routes.filter(r => userParcelIds.includes(r.parcelId));
      return res.json(filteredRoutes);
    }
    
    res.json(routes);
  });
  
  // Get route by ID
  app.get("/api/routes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid route ID" });
    }
    
    const route = await storage.getRoute(id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    // If user is a sender, check if they own the related parcel
    const user = req.user!;
    if (user.role === "sender") {
      const parcel = await storage.getParcel(route.parcelId);
      if (!parcel || parcel.userId !== user.id) {
        return res.sendStatus(403);
      }
    }
    
    res.json(route);
  });
  
  // Get route by parcel ID
  app.get("/api/routes/parcel/:parcelId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parcelId = parseInt(req.params.parcelId);
    if (isNaN(parcelId)) {
      return res.status(400).json({ message: "Invalid parcel ID" });
    }
    
    // Check if user has access to this parcel
    const user = req.user!;
    if (user.role === "sender") {
      const parcel = await storage.getParcel(parcelId);
      if (!parcel || parcel.userId !== user.id) {
        return res.sendStatus(403);
      }
    }
    
    const route = await storage.getRouteByParcelId(parcelId);
    if (!route) {
      return res.status(404).json({ message: "Route not found for this parcel" });
    }
    
    res.json(route);
  });
  
  // Create a new route (admin/staff only)
  app.post("/api/routes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      return res.sendStatus(403);
    }
    
    try {
      const validatedData = insertRouteSchema.parse(req.body);
      
      // Check if the parcel exists
      const parcel = await storage.getParcel(validatedData.parcelId);
      if (!parcel) {
        return res.status(404).json({ message: "Parcel not found" });
      }
      
      const route = await storage.createRoute(validatedData);
      res.status(201).json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(400).json({ message: "Invalid route data" });
    }
  });
  
  // Update a route (admin/staff only)
  app.patch("/api/routes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      return res.sendStatus(403);
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid route ID" });
    }
    
    const route = await storage.getRoute(id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    try {
      const updatedRoute = await storage.updateRoute(id, req.body);
      res.json(updatedRoute);
    } catch (error) {
      res.status(400).json({ message: "Invalid route data" });
    }
  });
  
  // ============= ISSUES ==================
  
  // Get all issues
  app.get("/api/issues", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const issues = await storage.listIssues();
    res.json(issues);
  });
  
  // Get active issues
  app.get("/api/issues/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const issues = await storage.listActiveIssues();
    res.json(issues);
  });
  
  // Get issue by ID
  app.get("/api/issues/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }
    
    const issue = await storage.getIssue(id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }
    
    res.json(issue);
  });
  
  // Create a new issue (admin/staff only)
  app.post("/api/issues", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      return res.sendStatus(403);
    }
    
    try {
      const validatedData = insertIssueSchema.parse(req.body);
      const issue = await storage.createIssue(validatedData);
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(400).json({ message: "Invalid issue data" });
    }
  });
  
  // Update an issue (admin/staff only)
  app.patch("/api/issues/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      return res.sendStatus(403);
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }
    
    const issue = await storage.getIssue(id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }
    
    try {
      const updatedIssue = await storage.updateIssue(id, req.body);
      res.json(updatedIssue);
    } catch (error) {
      res.status(400).json({ message: "Invalid issue data" });
    }
  });
  
  // ============= NOTIFICATIONS ==================
  
  // Get user notifications
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id;
    const notifications = await storage.listNotificationsByUserId(userId);
    res.json(notifications);
  });
  
  // Create a notification (admin/staff only)
  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    if (user.role === "sender") {
      return res.sendStatus(403);
    }
    
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      
      // Check if the user exists
      const targetUser = await storage.getUser(validatedData.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the parcel exists
      const parcel = await storage.getParcel(validatedData.parcelId);
      if (!parcel) {
        return res.status(404).json({ message: "Parcel not found" });
      }
      
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(400).json({ message: "Invalid notification data" });
    }
  });
  
  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    
    const notification = await storage.getNotification(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    // Users can only mark their own notifications as read
    if (notification.userId !== req.user!.id) {
      return res.sendStatus(403);
    }
    
    try {
      const updatedNotification = await storage.updateNotification(id, { read: true });
      res.json(updatedNotification);
    } catch (error) {
      res.status(400).json({ message: "Failed to mark notification as read" });
    }
  });
  
  // ============= NOTIFICATION PREFERENCES ==================
  
  // Get user notification preferences
  app.get("/api/notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id;
    const preferences = await storage.getNotificationPreference(userId);
    
    if (!preferences) {
      // Create default preferences if not exists
      const defaultPreferences = await storage.createNotificationPreference({
        userId,
        delayNotifications: true,
        weatherAlerts: true,
        statusChanges: true,
        deliveryConfirmations: true,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
        frequency: "realtime"
      });
      
      return res.json(defaultPreferences);
    }
    
    res.json(preferences);
  });
  
  // Update notification preferences
  app.patch("/api/notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id;
    
    try {
      // Check if preferences exist
      const preferences = await storage.getNotificationPreference(userId);
      
      if (!preferences) {
        // Create new preferences
        const validatedData = insertNotificationPreferenceSchema.parse({
          ...req.body,
          userId
        });
        
        const newPreferences = await storage.createNotificationPreference(validatedData);
        return res.json(newPreferences);
      }
      
      // Update existing preferences
      const updatedPreferences = await storage.updateNotificationPreference(userId, req.body);
      res.json(updatedPreferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(400).json({ message: "Invalid preferences data" });
    }
  });
  
  // ============= STATS ==================
  
  // Get system stats
  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const stats = await storage.getStats();
    if (!stats) {
      return res.status(404).json({ message: "Stats not found" });
    }
    
    res.json(stats);
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
