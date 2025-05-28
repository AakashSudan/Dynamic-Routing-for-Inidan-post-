import { z } from "zod";

// Enums
const roleEnum = z.enum(["sender", "staff", "admin"]);
const parcelStatusEnum = z.enum(["preparing", "in_transit", "delayed", "delivered", "customs_check"]);
const frequencyEnum = z.enum(["realtime", "hourly", "daily"]);
const issueSeverityEnum = z.enum(["low", "medium", "high"]);
const issueStatusEnum = z.enum(["active", "resolved"]);
const issueTypeEnum = z.enum(["weather", "traffic", "mechanical", "system"]);
const transportModeEnum = z.enum(["road", "rail", "air", "multimodal"]);
const notificationTypeEnum = z.enum(["delay", "status_change", "delivery", "weather"]);
const channelEnum = z.enum(["email", "sms", "push"]);

// User
export const insertUserSchema = z.object({
  id: z.number().optional(),
  username: z.string(),
  password: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: roleEnum,
  phone: z.string().optional().nullable(),
});

// Parcel
const parseDate = (val: unknown) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

export const insertParcelSchema = z.object({
  id: z.number().optional(),
  trackingNumber: z.string(),
  userId: z.number(),
  origin: z.string(),
  destination: z.string(),
  status: parcelStatusEnum,
  transportMode: transportModeEnum,
  createdAt: z.preprocess(parseDate, z.date().optional()),
  estimatedDelivery: z.preprocess(parseDate, z.date().optional().nullable()),
  actualDelivery: z.preprocess(parseDate, z.date().optional().nullable()),
  weight: z.string(),
  dimensions: z.string().optional().nullable(),
  currentLocation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  delayReason: z.string().optional().nullable(),
  delayDuration: z.string().optional().nullable(),
});

// Route
export const insertRouteSchema = z.object({
  id: z.number().optional(),
  parcelId: z.number(),
  routePath: z.array(z.string()),
  transportMode: transportModeEnum,
  duration: z.string(),
  distance: z.string(),
  weather: z.any().optional(), // can refine to match structure
  traffic: z.any().optional(), // can refine to match structure
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
});

// Notification
export const insertNotificationSchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  parcelId: z.number(),
  type: notificationTypeEnum,
  message: z.string(),
  createdAt: z.date().optional(),
  read: z.boolean().default(false),
  sent: z.boolean().default(false),
  channel: channelEnum,
});

// Issue
export const insertIssueSchema = z.object({
  id: z.number().optional(),
  title: z.string(),
  description: z.string(),
  severity: issueSeverityEnum,
  status: issueStatusEnum,
  createdAt: z.date().optional(),
  resolvedAt: z.date().optional().nullable(),
  affectedParcels: z.array(z.number()).optional().nullable(),
  location: z.string().optional().nullable(),
  issueType: issueTypeEnum,
});

// Notification Preferences
export const insertNotificationPreferenceSchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  delayNotifications: z.boolean().default(true),
  weatherAlerts: z.boolean().default(true),
  statusChanges: z.boolean().default(true),
  deliveryConfirmations: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
  frequency: frequencyEnum,
});

// Stats
export const InsertStatsSchema = z.object({
  id: z.number().optional(),
  activeParcels: z.number(),
  activeRoutes: z.number(),
  delayedParcels: z.number(),
  onTimeRate: z.string(),
  roadTransitPercentage: z.string(),
  railTransitPercentage: z.string(),
  airTransitPercentage: z.string(),
  weatherImpactPercentage: z.string(),
  trafficCongestionPercentage: z.string(),
  mechanicalIssuesPercentage: z.string(),
  updatedAt: z.date().optional(),
});

export type User = z.infer<typeof insertUserSchema>;
export type Parcel = z.infer<typeof insertParcelSchema>;
export type Route = z.infer<typeof insertRouteSchema>;
export type Notification = z.infer<typeof insertNotificationSchema>;
export type Issue = z.infer<typeof insertIssueSchema>;
export type NotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type Stats = z.infer<typeof InsertStatsSchema>;
