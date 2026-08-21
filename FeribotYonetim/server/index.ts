import express, { type Request, Response, NextFunction } from "express";
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';

// .env dosyasını yükle
dotenv.config();

// CustomRequestInterface with rawBody for Stripe webhook validation
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection } from "./db";

const app = express();

// CORS ayarları - Hostinger domain için
const corsOrigin = process.env.CORS_ORIGIN || process.env.SITE_URL || '*';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Trust proxy (Hostinger reverse proxy / Nginx arkasında çalışmak için)
app.set("trust proxy", 1);

// Global JSON parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for Stripe webhook verification
    if (req.originalUrl === '/api/payments/stripe/webhook') {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Uploads klasörü için static dosya sunumu
app.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));

// İstek loglama
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Sağlık kontrolü endpoint'i
app.get('/api/health', async (_req, res) => {
  const dbStatus = await testDatabaseConnection();
  res.json({
    status: dbStatus ? 'healthy' : 'degraded',
    database: dbStatus ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

(async () => {
  // Veritabanı bağlantısını test et
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('UYARI: Veritabanına bağlanılamadı! DATABASE_URL ayarlarını kontrol edin.');
    console.error('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Production'da detaylı hata mesajlarını gizle
    if (process.env.NODE_ENV === 'production') {
      console.error('Server Error:', err);
      res.status(status).json({ message: status === 500 ? 'Sunucu hatası' : message });
    } else {
      res.status(status).json({ message });
    }
  });

  // Development modda Vite, production'da statik dosya sunumu
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Port ayarı - Hostinger VPS için yapılandırılabilir
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Sunucu ${port} portunda çalışıyor`);
    log(`Ortam: ${process.env.NODE_ENV || 'development'}`);
    log(`Veritabanı: ${dbConnected ? 'Bağlı' : 'Bağlantı yok!'}`);
    if (process.env.SITE_URL) {
      log(`Site URL: ${process.env.SITE_URL}`);
    }
  });
})();
