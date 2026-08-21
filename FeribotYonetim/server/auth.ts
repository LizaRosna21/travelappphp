import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { getUserByUsername, getUser } from "./bypass-memstorage";
import { parse as parseCookie } from "cookie";
import signature from "cookie-signature";
import type { IncomingMessage } from "http";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  // Şifreler asla loglanmaz ve hiçbir koşulda sabit değerle eşleştirilmez.
  if (!supplied || !stored) return false;

  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error('Şifre karşılaştırma hatası');
    return false;
  }
}

/**
 * Kullanıcı nesnesinden şifre alanını çıkarır.
 * İstemciye dönen hiçbir yanıt şifre hash'i içermemelidir.
 */
function toSafeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password, ...safeUser } = user;
  return safeUser;
}

/** Oturum çerezini doğrulamak için setupAuth sırasında saklanan secret. */
let activeSessionSecret: string | null = null;

/**
 * Bir HTTP upgrade isteğindeki oturum çerezinden kullanıcı kimliğini çözer.
 * WebSocket bağlantıları için tek geçerli kimlik kaynağı budur; istemcinin
 * mesajla gönderdiği userId'ye asla güvenilmez.
 */
export function resolveSessionUserId(req: IncomingMessage): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const cookieHeader = req.headers?.cookie;
      if (!cookieHeader || !activeSessionSecret) return resolve(null);

      const rawCookie = parseCookie(cookieHeader)["connect.sid"];
      if (!rawCookie || !rawCookie.startsWith("s:")) return resolve(null);

      const sessionId = signature.unsign(rawCookie.slice(2), activeSessionSecret);
      if (!sessionId) return resolve(null);

      storage.sessionStore.get(sessionId, (err, session: any) => {
        if (err || !session) return resolve(null);
        const userId = session?.passport?.user;
        resolve(typeof userId === "number" ? userId : null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET üretim ortamında zorunludur. Rastgele ve uzun bir değer tanımlayın.",
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "insecure-development-only-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  activeSessionSecret = sessionSettings.secret as string;

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Önce veritabanını kontrol et
        let user = await getUserByUsername(username);
        
        if (!user) {
          // Eğer veritabanında bulunamazsa MemStorage'a bak
          user = await storage.getUserByUsername(username);
        }
        
        // Şifre kontrolü
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
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
      // Performans iyileştirmesi: Önbellekleme ve gereksiz log'ları kaldırma
      // Öncelikle veritabanından kullanıcıyı almayı deneyelim
      let user = await getUser(id);
      
      if (!user) {
        // Veritabanında bulunamazsa MemStorage'a bakalım
        user = await storage.getUser(id);
      }
      
      // Hassas verileri temizle. Şifre hash'i oturum nesnesinde taşınmaz;
      // parola doğrulaması yalnızca LocalStrategy içinde, giriş anında yapılır.
      done(null, user ? toSafeUser(user) : null);
    } catch (error) {
      console.error("Deserialize hatası:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if user already exists
      let existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create new user
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(toSafeUser(user));
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info);
        return res.status(401).json(info || { message: "Authentication failed" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return next(loginErr);
        }
        return res.status(200).json(toSafeUser(user));
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
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    // Hassas bilgileri filtreleyen yanıt döndür
    res.json(toSafeUser(req.user));
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
