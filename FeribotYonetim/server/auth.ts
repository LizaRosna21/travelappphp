import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { getUserByUsername, getUser } from "./bypass-memstorage";

declare global {
  namespace Express {
    // Parola hash'i oturumda taşınmaz; req.user her zaman parolasız kullanıcıdır.
    interface User extends Omit<SelectUser, "password"> {}
  }
}

export async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Demo kurulumunda kullanılan sabit şifreler. Yalnızca aşağıdaki hesaplar için
// ve yalnızca demo modu açıkken geçerlidir; üretimde tamamen devre dışıdır.
const DEMO_ACCOUNT_PASSWORDS: Record<string, string> = {
  admin: "admin123",
  superadmin: "superadmin123",
  demo: "demo123",
  agent: "agent123",
  member: "member123",
};

function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
}

async function comparePasswords(username: string, supplied: string, stored: string) {
  try {
    // Demo kısayolu: sadece bilinen demo hesapları, sadece kendi şifresiyle ve
    // sadece demo modunda. Diğer tüm hesaplar bcrypt ile doğrulanır.
    if (isDemoLoginEnabled() && DEMO_ACCOUNT_PASSWORDS[username] === supplied) {
      console.log(`Demo login shortcut used for account: ${username}`);
      return true;
    }

    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    // Geçersiz/boş hash bcrypt.compare tarafından hata olarak döner -> giriş reddedilir
    console.error('Error comparing passwords:', error);
    return false;
  }
}

// Oturum/yanıt gövdelerinden parola hash'ini ayıklar
function toSafeUser<T extends Record<string, any>>(user: T): Omit<T, "password"> {
  const { password, ...safeUser } = user;
  return safeUser;
}

// Oturum ara katmanı; WebSocket el sıkışmasında da kullanılabilmesi için saklanır.
let sessionMiddleware: ReturnType<typeof session> | null = null;

/**
 * Express oturum ara katmanını döndürür. HTTP dışı bağlamlarda (ör. WebSocket
 * upgrade isteği) oturumu çözmek için kullanılır.
 */
export function getSessionMiddleware(): ReturnType<typeof session> {
  if (!sessionMiddleware) {
    throw new Error("setupAuth() must be called before getSessionMiddleware()");
  }
  return sessionMiddleware;
}

export function setupAuth(app: Express) {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET must be set in production; refusing to start with the built-in development secret.",
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ferry-booking-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  sessionMiddleware = session(sessionSettings);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Login attempt for:", username);
        
        // Önce veritabanını kontrol et
        let user = await getUserByUsername(username);
        
        if (!user) {
          // Eğer veritabanında bulunamazsa MemStorage'a bak
          console.log(`DB'de kullanıcı bulunamadı: ${username}, MemStorage kontrol ediliyor...`);
          user = await storage.getUserByUsername(username);
        } else {
          console.log(`DB'den kullanıcı bulundu: ${username}, ID: ${user.id}, Rol: ${user.role}`);
        }
        
        // Şifre kontrolü
        if (!user || !(await comparePasswords(username, password, user.password))) {
          console.log("Kimlik doğrulama başarısız: Geçersiz kullanıcı adı veya şifre");
          return done(null, false, { message: "Invalid username or password" });
        } else {
          console.log(`Kullanıcı başarıyla doğrulandı: ${username}`);
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
      
      // Hassas verileri temizle: parola hash'i oturuma/req.user'a hiç konmaz.
      // Parola yalnızca giriş anında LocalStrategy içinde kullanılır.
      if (user) {
        done(null, toSafeUser(user));
      } else {
        done(null, null);
      }
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
    console.log("Login attempt for:", req.body.username);
    
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info);
        return res.status(401).json(info || { message: "Authentication failed" });
      }

      console.log("User authenticated successfully:", user.username);
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return next(loginErr);
        }
        console.log("Login completed successfully for:", user.username);
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
    
    // Hassas bilgileri filtreleyen optimize edilmiş yanıt döndür
    // Bu, gereksiz veri transferini azaltır ve güvenliği artırır
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

// Helper function to check if a user is an admin (predicate function).
// Tip koruyucusu olarak yazıldı: kontrolden sonra req.user tanımlı kabul edilir.
export function checkIsAdmin(
  req: Express.Request,
): req is Express.Request & { user: Express.User } {
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
