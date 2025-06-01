import { PrismaClient, User, Parcel, Route, Notification, Issue, NotificationPreference, Stats } from '../generated/prisma';
import type { Prisma } from '../generated/prisma';

type InsertUser = Prisma.UserCreateInput;
type InsertParcel = Prisma.ParcelCreateInput;
type InsertRoute = Prisma.RouteCreateInput;
type InsertNotification = Prisma.NotificationCreateInput;
type InsertIssue = Prisma.IssueCreateInput;
type InsertNotificationPreference = Prisma.NotificationPreferenceCreateInput;
type InsertStats = Prisma.StatsCreateInput;

const prisma = new PrismaClient();

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | null>;
  listUsers(): Promise<User[]>;

  // Parcel operations
  getParcel(id: number): Promise<Parcel | null>;
  getParcelByTrackingNumber(trackingNumber: string): Promise<Parcel | null>;
  createParcel(parcel: InsertParcel): Promise<Parcel>;
  updateParcel(id: number, parcel: Partial<InsertParcel>): Promise<Parcel | null>;
  listParcels(): Promise<Parcel[]>;
  listParcelsByUserId(userId: number): Promise<Parcel[]>;

  // Route operations
  getRoute(id: number): Promise<Route | null>;
  getRouteByParcelId(parcelId: number): Promise<Route | null>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, route: Partial<InsertRoute>): Promise<Route | null>;
  listRoutes(): Promise<Route[]>;
  listActiveRoutes(): Promise<Route[]>;

  // Notification operations
  getNotification(id: number): Promise<Notification | null>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification | null>;
  listNotificationsByUserId(userId: number): Promise<Notification[]>;

  // Issue operations
  getIssue(id: number): Promise<Issue | null>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, issue: Partial<InsertIssue>): Promise<Issue | null>;
  listIssues(): Promise<Issue[]>;
  listActiveIssues(): Promise<Issue[]>;

  // Notification preferences operations
  getNotificationPreference(userId: number): Promise<NotificationPreference | null>;
  createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreference(userId: number, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference | null>;

  // Stats operations
  getStats(): Promise<Stats | null>;
  updateStats(stats: Partial<InsertStats>): Promise<Stats | null>;

  // Session storage (not implemented here)
  sessionStore: any;
}


// import type { InsertUser, InsertParcel, InsertRoute, InsertNotification, InsertIssue, InsertNotificationPreference, InsertStats } from '@shared/schema';

function normalizeParcelPayload(parcel: any) {
  return {
    ...parcel,
    actualDelivery: parcel.actualDelivery ?? null,
    estimatedDelivery: parcel.estimatedDelivery ?? null,
    dimensions: parcel.dimensions === '' ? null : parcel.dimensions,
    currentLocation: parcel.currentLocation === '' ? null : parcel.currentLocation,
    notes: parcel.notes === '' ? null : parcel.notes,
    delayReason: parcel.delayReason === undefined || parcel.delayReason === '' ? null : parcel.delayReason,
    delayDuration: parcel.delayDuration === undefined || parcel.delayDuration === '' ? null : parcel.delayDuration,
  };
}

function normalizeRoutePayload(route: any) {
  return {
    ...route,
    weather: route.weather ?? null,
    traffic: route.traffic ?? null,
  };
}

function normalizeNotificationPayload(notification: any) {
  return {
    ...notification,
    message: notification.message === '' ? null : notification.message,
    channel: notification.channel === '' ? null : notification.channel,
  };
}

function normalizeIssuePayload(issue: any) {
  return {
    ...issue,
    resolvedAt: issue.resolvedAt ?? null,
    affectedParcels: issue.affectedParcels ?? [],
    location: issue.location === '' ? null : issue.location,
  };
}

export class PrismaStorage implements IStorage {
  sessionStore: any = null; // Not implemented

  // User operations
  async getUser(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }
  async getUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  }
  async createUser(user: InsertUser) {
    return prisma.user.create({ data: user });
  }
  async updateUser(id: number, user: Partial<InsertUser>) {
    return prisma.user.update({ where: { id }, data: user });
  }
  async listUsers() {
    return prisma.user.findMany();
  }

  // Parcel operations
  async getParcel(id: number) {
    return prisma.parcel.findUnique({ where: { id } });
  }
  async getParcelByTrackingNumber(trackingNumber: string) {
    return prisma.parcel.findUnique({ where: { trackingNumber } });
  }
  async createParcel(parcel: InsertParcel) {
    const normalized = normalizeParcelPayload(parcel);
    console.log('createParcel normalized payload:', normalized);
    return prisma.parcel.create({ data: normalized });
  }
  async updateParcel(id: number, parcel: Partial<InsertParcel>) {
    const normalized = normalizeParcelPayload(parcel);
    console.log('updateParcel normalized payload:', normalized);
    return prisma.parcel.update({ where: { id }, data: normalized });
  }
  async listParcels() {
    return prisma.parcel.findMany();
  }
  async listParcelsByUserId(userId: number) {
    return prisma.parcel.findMany({ where: { userId } });
  }

  // Route operations
  async getRoute(id: number) {
    return prisma.route.findUnique({ where: { id } });
  }
  async getRouteByParcelId(parcelId: number) {
    return prisma.route.findFirst({ where: { parcelId } });
  }
  async createRoute(route: InsertRoute) {
    const normalized = normalizeRoutePayload(route);
    console.log('createRoute normalized payload:', normalized);
    return prisma.route.create({ data: normalized });
  }
  async updateRoute(id: number, route: Partial<InsertRoute>) {
    const normalized = normalizeRoutePayload(route);
    console.log('updateRoute normalized payload:', normalized);
    return prisma.route.update({ where: { id }, data: normalized });
  }
  async listRoutes() {
    return prisma.route.findMany();
  }
  async listActiveRoutes() {
    return prisma.route.findMany({ where: { active: true } });
  }

  // Notification operations
  async getNotification(id: number) {
    return prisma.notification.findUnique({ where: { id } });
  }
  async createNotification(notification: InsertNotification) {
    const normalized = normalizeNotificationPayload(notification);
    console.log('createNotification normalized payload:', normalized);
    return prisma.notification.create({ data: normalized });
  }
  async updateNotification(id: number, notification: Partial<InsertNotification>) {
    const normalized = normalizeNotificationPayload(notification);
    console.log('updateNotification normalized payload:', normalized);
    return prisma.notification.update({ where: { id }, data: normalized });
  }
  async listNotificationsByUserId(userId: number) {
    return prisma.notification.findMany({ where: { userId } });
  }

  // Issue operations
  async getIssue(id: number) {
    return prisma.issue.findUnique({ where: { id } });
  }
  async createIssue(issue: InsertIssue) {
    const normalized = normalizeIssuePayload(issue);
    console.log('createIssue normalized payload:', normalized);
    return prisma.issue.create({ data: normalized });
  }
  async updateIssue(id: number, issue: Partial<InsertIssue>) {
    const normalized = normalizeIssuePayload(issue);
    console.log('updateIssue normalized payload:', normalized);
    return prisma.issue.update({ where: { id }, data: normalized });
  }
  async listIssues() {
    return prisma.issue.findMany();
  }
  async listActiveIssues() {
    return prisma.issue.findMany({ where: { status: 'active' } });
  }

  // Notification preferences operations
  async getNotificationPreference(userId: number) {
    return prisma.notificationPreference.findFirst({ where: { userId } });
  }
  async createNotificationPreference(preference: InsertNotificationPreference) {
    return prisma.notificationPreference.create({ data: preference });
  }
  async updateNotificationPreference(userId: number, preference: Partial<InsertNotificationPreference>) {
    const existing = await prisma.notificationPreference.findFirst({ where: { userId } });
    if (!existing) return null;
    return prisma.notificationPreference.update({
      where: { id: existing.id },
      data: preference,
    });
  }

  // Stats operations
  async getStats() {
    return prisma.stats.findFirst();
  }
  async updateStats(stats: Partial<InsertStats>) {
    const existing = await prisma.stats.findFirst();
    if (!existing) return null;
    return prisma.stats.update({
      where: { id: existing.id },
      data: stats,
    });
  }
}

export const storage = new PrismaStorage();