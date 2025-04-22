import { users, type User, type InsertUser, parcels, type Parcel, type InsertParcel, routes, type Route, type InsertRoute, notifications, type Notification, type InsertNotification, issues, type Issue, type InsertIssue, notificationPreferences, type NotificationPreference, type InsertNotificationPreference, stats, type Stats, type InsertStats } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { nanoid } from "nanoid";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  
  // Parcel operations
  getParcel(id: number): Promise<Parcel | undefined>;
  getParcelByTrackingNumber(trackingNumber: string): Promise<Parcel | undefined>;
  createParcel(parcel: InsertParcel): Promise<Parcel>;
  updateParcel(id: number, parcel: Partial<InsertParcel>): Promise<Parcel | undefined>;
  listParcels(): Promise<Parcel[]>;
  listParcelsByUserId(userId: number): Promise<Parcel[]>;
  
  // Route operations
  getRoute(id: number): Promise<Route | undefined>;
  getRouteByParcelId(parcelId: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, route: Partial<InsertRoute>): Promise<Route | undefined>;
  listRoutes(): Promise<Route[]>;
  listActiveRoutes(): Promise<Route[]>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification | undefined>;
  listNotificationsByUserId(userId: number): Promise<Notification[]>;
  
  // Issue operations
  getIssue(id: number): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, issue: Partial<InsertIssue>): Promise<Issue | undefined>;
  listIssues(): Promise<Issue[]>;
  listActiveIssues(): Promise<Issue[]>;
  
  // Notification preferences operations
  getNotificationPreference(userId: number): Promise<NotificationPreference | undefined>;
  createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreference(userId: number, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined>;
  
  // Stats operations
  getStats(): Promise<Stats | undefined>;
  updateStats(stats: Partial<InsertStats>): Promise<Stats | undefined>;

  // Session storage
  sessionStore: any; // Using any type to avoid session type issues
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private parcels: Map<number, Parcel>;
  private routes: Map<number, Route>;
  private notifications: Map<number, Notification>;
  private issues: Map<number, Issue>;
  private notificationPreferences: Map<number, NotificationPreference>;
  private currentStats: Stats;
  
  currentUserId: number;
  currentParcelId: number;
  currentRouteId: number;
  currentNotificationId: number;
  currentIssueId: number;
  currentNotificationPreferenceId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.parcels = new Map();
    this.routes = new Map();
    this.notifications = new Map();
    this.issues = new Map();
    this.notificationPreferences = new Map();
    
    this.currentUserId = 1;
    this.currentParcelId = 1;
    this.currentRouteId = 1;
    this.currentNotificationId = 1;
    this.currentIssueId = 1;
    this.currentNotificationPreferenceId = 1;
    
    // Initialize stats
    this.currentStats = {
      id: 1,
      activeParcels: 0,
      activeRoutes: 0,
      delayedParcels: 0,
      onTimeRate: "0",
      roadTransitPercentage: "0",
      railTransitPercentage: "0",
      airTransitPercentage: "0",
      weatherImpactPercentage: "0",
      trafficCongestionPercentage: "0",
      mechanicalIssuesPercentage: "0",
      updatedAt: new Date(),
    };
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with mock data
    this.seedData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Parcel operations
  async getParcel(id: number): Promise<Parcel | undefined> {
    return this.parcels.get(id);
  }
  
  async getParcelByTrackingNumber(trackingNumber: string): Promise<Parcel | undefined> {
    return Array.from(this.parcels.values()).find(
      (parcel) => parcel.trackingNumber === trackingNumber,
    );
  }
  
  async createParcel(insertParcel: InsertParcel): Promise<Parcel> {
    const id = this.currentParcelId++;
    // Generate tracking number if not provided
    if (!insertParcel.trackingNumber) {
      insertParcel.trackingNumber = `MRP-${nanoid(7).toUpperCase()}`;
    }
    
    const parcel: Parcel = { 
      ...insertParcel, 
      id, 
      createdAt: new Date(),
      actualDelivery: null
    };
    
    this.parcels.set(id, parcel);
    
    // Update stats
    await this.updateStats({ 
      activeParcels: this.currentStats.activeParcels + 1 
    });
    
    return parcel;
  }
  
  async updateParcel(id: number, parcel: Partial<InsertParcel>): Promise<Parcel | undefined> {
    const existingParcel = this.parcels.get(id);
    if (!existingParcel) {
      return undefined;
    }
    
    const wasDelayed = existingParcel.status === 'delayed';
    const isDelayed = parcel.status === 'delayed';
    
    const updatedParcel = { ...existingParcel, ...parcel };
    this.parcels.set(id, updatedParcel);
    
    // Update stats if delay status changed
    if (!wasDelayed && isDelayed) {
      await this.updateStats({ 
        delayedParcels: this.currentStats.delayedParcels + 1 
      });
    } else if (wasDelayed && !isDelayed) {
      await this.updateStats({ 
        delayedParcels: Math.max(0, this.currentStats.delayedParcels - 1)
      });
    }
    
    return updatedParcel;
  }
  
  async listParcels(): Promise<Parcel[]> {
    return Array.from(this.parcels.values());
  }
  
  async listParcelsByUserId(userId: number): Promise<Parcel[]> {
    return Array.from(this.parcels.values()).filter(
      (parcel) => parcel.userId === userId,
    );
  }
  
  // Route operations
  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }
  
  async getRouteByParcelId(parcelId: number): Promise<Route | undefined> {
    return Array.from(this.routes.values()).find(
      (route) => route.parcelId === parcelId,
    );
  }
  
  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = this.currentRouteId++;
    const route: Route = { 
      ...insertRoute, 
      id, 
      createdAt: new Date()
    };
    
    this.routes.set(id, route);
    
    // Update stats
    if (route.active) {
      await this.updateStats({ 
        activeRoutes: this.currentStats.activeRoutes + 1 
      });
    }
    
    return route;
  }
  
  async updateRoute(id: number, route: Partial<InsertRoute>): Promise<Route | undefined> {
    const existingRoute = this.routes.get(id);
    if (!existingRoute) {
      return undefined;
    }
    
    const wasActive = existingRoute.active;
    const isActive = route.active !== undefined ? route.active : wasActive;
    
    const updatedRoute = { ...existingRoute, ...route };
    this.routes.set(id, updatedRoute);
    
    // Update stats if active status changed
    if (!wasActive && isActive) {
      await this.updateStats({ 
        activeRoutes: this.currentStats.activeRoutes + 1 
      });
    } else if (wasActive && !isActive) {
      await this.updateStats({ 
        activeRoutes: Math.max(0, this.currentStats.activeRoutes - 1)
      });
    }
    
    return updatedRoute;
  }
  
  async listRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }
  
  async listActiveRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.active,
    );
  }
  
  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = { 
      ...insertNotification, 
      id, 
      createdAt: new Date(),
      read: false,
      sent: false
    };
    
    this.notifications.set(id, notification);
    return notification;
  }
  
  async updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification | undefined> {
    const existingNotification = this.notifications.get(id);
    if (!existingNotification) {
      return undefined;
    }
    
    const updatedNotification = { ...existingNotification, ...notification };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async listNotificationsByUserId(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId,
    );
  }
  
  // Issue operations
  async getIssue(id: number): Promise<Issue | undefined> {
    return this.issues.get(id);
  }
  
  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const id = this.currentIssueId++;
    const issue: Issue = { 
      ...insertIssue, 
      id, 
      createdAt: new Date(),
      resolvedAt: null
    };
    
    this.issues.set(id, issue);
    return issue;
  }
  
  async updateIssue(id: number, issue: Partial<InsertIssue>): Promise<Issue | undefined> {
    const existingIssue = this.issues.get(id);
    if (!existingIssue) {
      return undefined;
    }
    
    const wasActive = existingIssue.status === 'active';
    const isActive = issue.status === 'active';
    
    const updatedIssue = { ...existingIssue, ...issue };
    
    // If status changes from active to resolved, set resolvedAt timestamp
    if (wasActive && !isActive) {
      updatedIssue.resolvedAt = new Date();
    }
    
    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }
  
  async listIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values());
  }
  
  async listActiveIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values()).filter(
      (issue) => issue.status === 'active',
    );
  }
  
  // Notification preferences operations
  async getNotificationPreference(userId: number): Promise<NotificationPreference | undefined> {
    return Array.from(this.notificationPreferences.values()).find(
      (pref) => pref.userId === userId,
    );
  }
  
  async createNotificationPreference(insertPreference: InsertNotificationPreference): Promise<NotificationPreference> {
    const id = this.currentNotificationPreferenceId++;
    const preference: NotificationPreference = { 
      ...insertPreference, 
      id
    };
    
    this.notificationPreferences.set(id, preference);
    return preference;
  }
  
  async updateNotificationPreference(userId: number, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined> {
    const existingPreference = Array.from(this.notificationPreferences.values()).find(
      (pref) => pref.userId === userId,
    );
    
    if (!existingPreference) {
      return undefined;
    }
    
    const updatedPreference = { ...existingPreference, ...preference };
    this.notificationPreferences.set(existingPreference.id, updatedPreference);
    return updatedPreference;
  }
  
  // Stats operations
  async getStats(): Promise<Stats | undefined> {
    return this.currentStats;
  }
  
  async updateStats(updatedStats: Partial<InsertStats>): Promise<Stats | undefined> {
    this.currentStats = { 
      ...this.currentStats, 
      ...updatedStats,
      updatedAt: new Date()
    };
    
    return this.currentStats;
  }
  
  // Seed data for initial testing
  private seedData() {
    this.seedUsers();
    this.seedStats();
  }
  
  private seedUsers() {
    // Hashed password for 'password'
    const hashedPassword = "e0d123e5f316bef78bfdf5a008837577ddf7b11f84f0bc6150eaa5a6f4115b8b.8e23cc5f93f9d3d2ad42c7a8bcba2aad";
    
    // Admin user
    this.users.set(1, {
      id: 1,
      username: "admin",
      password: hashedPassword,
      email: "admin@mailrouting.com",
      fullName: "Admin User",
      role: "admin",
      phone: "555-123-4567"
    });
    
    // Staff user
    this.users.set(2, {
      id: 2,
      username: "staff",
      password: hashedPassword,
      email: "staff@mailrouting.com",
      fullName: "Staff User",
      role: "staff",
      phone: "555-123-7890"
    });
    
    // Sender user
    this.users.set(3, {
      id: 3,
      username: "sender",
      password: hashedPassword,
      email: "sender@mailrouting.com",
      fullName: "Sender User",
      role: "sender",
      phone: "555-123-5678"
    });
    
    // Update the current user ID to be after our seeded users
    this.currentUserId = 4;
  }
  
  private seedStats() {
    this.currentStats = {
      id: 1,
      activeParcels: 1248,
      activeRoutes: 87,
      delayedParcels: 24,
      onTimeRate: "94.7%",
      roadTransitPercentage: "64",
      railTransitPercentage: "23",
      airTransitPercentage: "13",
      weatherImpactPercentage: "42",
      trafficCongestionPercentage: "35",
      mechanicalIssuesPercentage: "18",
      updatedAt: new Date(),
    };
  }
}

export const storage = new MemStorage();
