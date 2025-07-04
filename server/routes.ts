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
import fetch from "node-fetch";
import { sendEmail } from "./updates";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API routes
  // ============= MAP ==================

  // Proxy for /api/geocode
app.get("/api/geocode", async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ error: "Missing location" });
  console.log(`Geocoding location: ${location}`);
  const fastApiUrl = `http://localhost:8000/geocode?location=${encodeURIComponent(location as string)}`;
  try {
    const response = await fetch(fastApiUrl);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from map backend" });
  }
});

  // Proxy for /api/traffic/incidents
  app.get("/api/traffic/incidents", async (req, res) => {
    const { location, incident_type } = req.query;
    if (!location) return res.status(400).json({ error: "Missing location" });
    let fastApiUrl = `http://localhost:8000/traffic/incidents?location=${encodeURIComponent(location as string)}`;
    if (incident_type) fastApiUrl += `&incident_type=${encodeURIComponent(incident_type as string)}`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/traffic/flow
  app.get("/api/traffic/flow", async (req, res) => {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: "Missing location" });
    const fastApiUrl = `http://localhost:8000/traffic/flow?location=${encodeURIComponent(location as string)}`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/weather
  app.get("/api/weather", async (req, res) => {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: "Missing location" });
    const fastApiUrl = `http://localhost:8000/weather?location=${encodeURIComponent(location as string)}`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/transport/schedules
  app.get("/api/transport/schedules", async (req, res) => {
    const fastApiUrl = `http://localhost:8000/transport/schedules`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/route/optimized
  app.post("/api/route/optimized", async (req, res) => {
    const { start, end, route_type } = req.body;
    // console.log(`Optimizing route from ${start} to ${end}`);
    if (!start || !end) return res.status(400).json({ error: "Missing start or end: " + req.body });
    const fastApiUrl = `http://localhost:8000/route/optimized?start=${encodeURIComponent(start as string)}&end=${encodeURIComponent(end as string)}&optimized_mode=${encodeURIComponent(route_type as string)}`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/all-data
  app.get("/api/all-data", async (req, res) => {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: "Missing location" });
    const fastApiUrl = `http://localhost:8000/all-data?location=${encodeURIComponent(location as string)}`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/weather/coords
  app.get("/api/weather/coords", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing lat or lon" });
    const fastApiUrl = `http://localhost:8000/weather/coords?lat=${encodeURIComponent(lat as string)}&lon=${encodeURIComponent(lon as string)}`;
    try {
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

  // Proxy for /api/route/dynamic (POST)
  app.post("/api/route/dynamic", async (req, res) => {
    const fastApiUrl = `http://localhost:8000/route/dynamic`;
    try {
      const response = await fetch(fastApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch from map backend" });
    }
  });

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
    // Admin and staff can see all parcels (with user info)
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

  // Delete a parcel (admin/staff only)
  app.delete("/api/parcels/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    if (user.role === "sender") return res.sendStatus(403);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid parcel ID" });
    try {
      await storage.deleteParcel(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete parcel" });
    }
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
        trackingNumber,
        // estimatedDelivery: req.body.estimatedDelivery.toISOString(),
        userId: req.user!.id, // Ensure the user ID is set to the logged-in user
      });
      
      const parcel = await storage.createParcel(validatedData);
      res.status(201).json(parcel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(400).json({ message: error });
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
      // If status changed, send email to sender
      if (req.body.status && req.body.status !== parcel.status) {
        const sender = parcel.user || (await storage.getUser(parcel.userId));
        if (sender && sender.email) {
          const subject = `Parcel status updated: ${updatedParcel.trackingNumber}`;
          const text = `Your parcel status is now: ${req.body.status}`;
          await sendEmail(sender.email, subject, text);
        }
      }
      res.json(updatedParcel);
    } catch (error) {
      res.status(400).json({ message: "Invalid parcel data" });
    }
  });
  
  // Send update email to sender
  app.post("/api/parcels/:id/send-update", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid parcel ID" });
    const parcel = await storage.getParcel(id);
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    // Only admin/staff or the sender can send update
    const user = req.user!;
    if (user.role === "sender" && parcel.userId !== user.id) return res.sendStatus(403);
    // Get sender info
    const sender = parcel.user;
    if (!sender || !sender.email) return res.status(400).json({ message: "Sender email not found" });
    // Compose email
    const subject = `Update for your parcel (${parcel.trackingNumber})`;
    const text = req.body?.message || `Your parcel status is: ${parcel.status}`;
    try {
      await sendEmail(sender.email, subject, text);
      res.json({ message: "Update email sent" });
    } catch (err) {
      console.error("Failed to send email:", err);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // ============= ROUTES ==================
  
  app.get("/api/postoffices", async (req, res) => {
  // If you want to restrict, add authentication checks here
  // if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    const postOffices = await storage.listPostOffices();
    res.json(postOffices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch post offices" });
  }
});

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

  // Update system stats (admin/staff only)
  app.patch("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    if (user.role === "sender") return res.sendStatus(403);
    try {
      const updated = await storage.updateStats(req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update stats" });
    }
  });

  // ============= USERS ==================
  // Get all users (admin/staff only)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    if (user.role === "sender") return res.sendStatus(403);
    const users = await storage.listUsers();
    // Don't expose passwords
    const usersWithoutPasswords = users.map(({ password, ...u }) => u);
    res.json(usersWithoutPasswords);
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
