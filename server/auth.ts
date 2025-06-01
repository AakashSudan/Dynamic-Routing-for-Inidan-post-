import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import * as bcrypt from "bcrypt";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  // Using bcrypt for password hashing with cost factor 10
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// The hashed password for 'password' is used for seed data
export const TEST_PASSWORD_HASH = "$2b$10$VI1r0Y6HUdc4Ofv9tNRQJePiAS1ccf.yhvo/7HMNQbPberb1FTQ6K";

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Use bcrypt to compare passwords
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'mail_routing_system_secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false);
        }
        
        console.log(`Found user: ${username}, comparing passwords...`);
        const passwordValid = await comparePasswords(password, user.password);
        console.log(`Password validation result: ${passwordValid}`);
        
        if (!passwordValid) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error('Error in authentication:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Extended user registration schema with validation
  const registerSchema = insertUserSchema.extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["sender", "staff", "admin"]).default("sender"),
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      // Create default notification preferences for the user
      await storage.createNotificationPreference({
        userId: user.id,
        delayNotifications: true,
        weatherAlerts: true,
        statusChanges: true,
        deliveryConfirmations: true,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
        frequency: "realtime"
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't expose password in response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Don't expose password in response
    const { password, ...userWithoutPassword } = req.user!;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't expose password in response
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
}
