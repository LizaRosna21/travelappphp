import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { getUserByUsername, getUser } from "./bypass-memstorage";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export async function hashPassword(password: string) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const result = await bcrypt.compare(supplied, stored);
    return result;
  } catch (error) {
    console.error('Şifre karşılaştırma hatası:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // PostgreSQL oturum deposu (production için)
  const PostgresStore = connectPg(session);

  let sessionStore: session.Store;

  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    sessionStore = new PostgresStore({
      pool: pool as any,
      tableName: 'session',
      createTableIfMissing: true,
    });
  } else {
    sessionStore = storage.sessionStore;
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ferry-booking-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: 'feribot.sid',
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 hafta
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'strict' as const : 'lax' as const,
      domain: process.env.COOKIE_DOMAIN || undefined,
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let user = await getUserByUsername(username);

        if (!user) {
          user = await storage.getUserByUsername(username);
        }

        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Geçersiz kullanıcı adı veya şifre" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error("Kimlik doğrulama hatası:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      let user = await getUser(id);

      if (!user) {
        user = await storage.getUser(id);
      }

      done(null, user || null);
    } catch (error) {
      console.error("Deserialize hatası:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      let existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Bu e-posta adresi zaten kullanılıyor" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json(info || { message: "Kimlik doğrulama başarısız" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        const { password, ...safeUser } = user;
        return res.status(200).json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Oturum açılmamış" });
    
    // Hassas bilgileri filtreleyen optimize edilmiş yanıt döndür
    // Bu, gereksiz veri transferini azaltır ve güvenliği artırır
    const { password, ...safeUserData } = req.user;
    res.json(safeUserData);
  });

  // Admin check middleware
  app.use("/api/admin/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Şimdi birden fazla yönetici rolünü kontrol etmek için OR operatörü
    if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  });
}

export function isAuthenticated(req: Express.Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function isAdmin(req: Express.Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Admin veya superadmin rollerine izin ver
  if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  
  next();
}

// Sadece superadmin rolü için middleware
export function isSuperAdmin(req: Express.Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Not authorized - Superadmin required" });
  }
  
  next();
}

// Agent rolü için middleware 
export function isAgent(req: Express.Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.role !== "agent" && req.user?.role !== "admin" && req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Not authorized - Agent access required" });
  }
  
  next();
}

// Helper function to check if a user is an admin (predicate function)
export function checkIsAdmin(req: Express.Request): boolean {
  return req.isAuthenticated() && (req.user?.role === "admin" || req.user?.role === "superadmin");
}

// Helper function to check if a user is a superadmin
export function checkIsSuperAdmin(req: Express.Request): boolean {
  return req.isAuthenticated() && req.user?.role === "superadmin";
}

// Helper function to check if a user is an agent
export function checkIsAgent(req: Express.Request): boolean {
  return req.isAuthenticated() && req.user?.role === "agent";
}
