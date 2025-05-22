import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("sender"), // sender, staff, admin
  fullName: text("fullName").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  phone: true,
  role: true,
  fullName: true,
});

// Parcels being shipped
export const parcels = pgTable("parcels", {
  id: serial("id").primaryKey(),
  trackingNumber: text("trackingNumber").notNull().unique(),
  userId: integer("userId").notNull(), // sender
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  status: text("status").notNull().default("preparing"), // preparing, in_transit, delayed, delivered, customs_check
  transportMode: text("transportMode").notNull(), // road, rail, air, multimodal
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  estimatedDelivery: timestamp("estimatedDelivery"),
  actualDelivery: timestamp("actualDelivery"),
  weight: text("weight").notNull(),
  dimensions: text("dimensions"),
  currentLocation: text("currentLocation"),
  notes: text("notes"),
  delayReason: text("delayReason"),
  delayDuration: text("delayDuration"),
});

export const insertParcelSchema = createInsertSchema(parcels).pick({
  trackingNumber: true,
  userId: true,
  origin: true,
  destination: true,
  status: true,
  transportMode: true,
  estimatedDelivery: true,
  weight: true,
  dimensions: true,
  currentLocation: true,
  notes: true,
});

// Routes for the parcels
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  parcelId: integer("parcelId").notNull(),
  routePath: json("routePath").notNull(), // Array of locations
  transportMode: text("transportMode").notNull(), // road, rail, air
  duration: text("duration").notNull(),
  distance: text("distance").notNull(),
  weather: json("weather"), // Weather conditions
  traffic: json("traffic"), // Traffic conditions
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const insertRouteSchema = createInsertSchema(routes).pick({
  parcelId: true,
  routePath: true,
  transportMode: true,
  duration: true,
  distance: true,
  weather: true, 
  traffic: true,
  active: true,
});

// Notifications for users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  parcelId: integer("parcelId").notNull(),
  type: text("type").notNull(), // delay, status_change, delivery, weather
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
  sent: boolean("sent").notNull().default(false),
  channel: text("channel").notNull(), // email, sms, push
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  parcelId: true,
  type: true,
  message: true,
  channel: true,
  read: true,
});

// Issues affecting routes
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // low, medium, high
  status: text("status").notNull().default("active"), // active, resolved
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  resolvedAt: timestamp("resolvedAt"),
  affectedParcels: json("affectedParcels"), // Array of parcel IDs
  location: text("location"),
  issueType: text("issueType").notNull(), // weather, traffic, mechanical, system
});

export const insertIssueSchema = createInsertSchema(issues).pick({
  title: true,
  description: true, 
  severity: true,
  status: true,
  affectedParcels: true,
  location: true,
  issueType: true,
});

// User notification preferences
export const notificationPreferences = pgTable("notificationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  delayNotifications: boolean("delayNotifications").notNull().default(true),
  weatherAlerts: boolean("weatherAlerts").notNull().default(true),
  statusChanges: boolean("statusChanges").notNull().default(true),
  deliveryConfirmations: boolean("deliveryConfirmations").notNull().default(true),
  emailEnabled: boolean("emailEnabled").notNull().default(true),
  smsEnabled: boolean("smsEnabled").notNull().default(true),
  pushEnabled: boolean("pushEnabled").notNull().default(false),
  frequency: text("frequency").notNull().default("realtime"), // realtime, hourly, daily
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).pick({
  userId: true,
  delayNotifications: true,
  weatherAlerts: true, 
  statusChanges: true,
  deliveryConfirmations: true,
  emailEnabled: true,
  smsEnabled: true,
  pushEnabled: true,
  frequency: true,
});

// Stats for dashboard
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  activeParcels: integer("activeParcels").notNull().default(0),
  activeRoutes: integer("activeRoutes").notNull().default(0),
  delayedParcels: integer("delayedParcels").notNull().default(0),
  onTimeRate: text("onTimeRate").notNull().default("0"),
  roadTransitPercentage: text("roadTransitPercentage").notNull().default("0"),
  railTransitPercentage: text("railTransitPercentage").notNull().default("0"),
  airTransitPercentage: text("airTransitPercentage").notNull().default("0"),
  weatherImpactPercentage: text("weatherImpactPercentage").notNull().default("0"),
  trafficCongestionPercentage: text("trafficCongestionPercentage").notNull().default("0"),
  mechanicalIssuesPercentage: text("mechanicalIssuesPercentage").notNull().default("0"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const insertStatsSchema = createInsertSchema(stats).omit({
  id: true,
  updatedAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertParcel = z.infer<typeof insertParcelSchema>;
export type Parcel = typeof parcels.$inferSelect;

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

export type InsertStats = z.infer<typeof insertStatsSchema>;
export type Stats = typeof stats.$inferSelect;
