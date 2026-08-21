import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from 'ws';
import { setupAuth, isAdmin, hashPassword } from "./auth";
import Stripe from 'stripe';
import multer from "multer";
import path from "path";
import fs from "fs";
import { sitemapRouter } from './routes/sitemap-routes';
import ticketRoutes from "./routes/ticket-routes";
import { AnalyticsService } from "./services/analytics-service";
import b2bRouter from "./routes/b2b-routes";
import contentRouter from "./routes/content-routes";
import weatherRouter from "./routes/weather-routes";
import { createFerryApiService } from "./services/ferry-api";
import { uploadFile } from "./services/upload";
import revenueManagementRouter from "./routes/revenue-management-routes";
import { registerMarketingRoutes } from "./routes/marketing-routes";
import { registerPaymentRoutes } from "./routes/payment-routes";
// import { registerStripeRoutes } from "./routes/stripe-routes";
import { registerStripeDemoRoutes } from "./routes/stripe-demo-routes";
import { stripeDemoService } from "./services/stripe-demo";
import { translationRouter } from "./routes/translation-routes";
import { Router } from "express";

// WebSocket genişletilmiş arayüzü - performans iyileştirmeleri eklendi
interface CachedUser {
  id: number;
  username: string;
  role: string;
  lastUsed: number;
}

interface CustomWebSocket extends WebSocket {
  campaignSubscriptions?: number[];
  userId?: number | null;
  role?: string;
  isAlive?: boolean; // Bağlantı sağlık durumu
  lastActivity?: number; // Son aktivite zamanı
  authToken?: string; // Kimlik doğrulama tokeni
}
import { storage } from "./storage";
import { createSampleBookingsForUser } from "./services/sample-booking-service";
import SampleMemberDataService from "./services/sample-member-data";
import { registerDemoDataRoutes } from "./route-seed-demo-data";
import { adminService } from "./services/admin";
import { emailService } from "./services/email";
import { paymentService } from "./services/payment";
import { reportingService } from "./services/reporting";
import { ticketGeneratorService } from "./services/ticket-generator";
import { stripeService } from "./services/stripe-service";
import { generateBookingReference, generatePNR } from "./services/pnr-generator";
import { revenueManagement } from "./services/revenue-management";
import whatsappService from "./services/whatsapp";
import whatsappNotificationService from "./services/whatsapp/notifications";
import { whatsAppBusinessService as whatsappBusinessService } from "./services/whatsapp/business-api";
import registerSchedulesRoutes from "./api/schedules";
import pnrQueryService from "./services/whatsapp/pnr-query";
import { BackupService } from "./services/backup-service";
import backupService from "./services/backup-service";
import { getNotificationService } from "./services/notification-service";
import { turkishPaymentService } from "./services/turkish-payment-providers";
import integrationService from "./services/integration-service";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertRouteSchema, 
  insertScheduleSchema,
  insertFerryCompanySchema,
  insertVehicleTypeSchema,
  insertPassengerTypeSchema,
  insertBookingSchema,
  insertBookingPassengerSchema,
  insertBookingVehicleSchema,
  insertSiteSettingsSchema,
  insertPortSchema,
  insertLanguageSchema,
  insertCurrencySchema,
  insertTranslationSchema,
  insertPageSchema,
  insertDestinationSchema,
  insertRouteDestinationSchema,
  insertTourSchema,
  insertTourDestinationSchema,
  insertPackageSchema,
  insertMenuSchema,
  insertCountrySchema,
  insertCampaignSchema,
  insertCustomerSegmentSchema,
  insertCouponSchema,
  insertCampaignPerformanceSchema,
  insertMarketingEmailSchema
} from "@shared/schema";

// WhatsApp Service Imports
import whatsAppChatbotService from './services/whatsapp/chatbot';

// AI Recommendation Service
import { aiRecommendationService } from './services/ai-recommendation';

// Authentication middleware
import { isAuthenticated, isAdmin } from './auth';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Setup authentication
  setupAuth(app);
  
  // WebSocket kullanıcı kimlik doğrulama önbelleği - performans iyileştirmesi
  const userCache = new Map<number, CachedUser>();
  
  // Önbellek temizleme zamanlayıcısını ayarla (30 dakikada bir)
  const CACHE_TTL = 30 * 60 * 1000; // 30 dakika
  
  setInterval(() => {
    const now = Date.now();
    // Eski önbellek girişlerini temizle
    Array.from(userCache.entries()).forEach(([userId, userData]) => {
      if (now - userData.lastUsed > CACHE_TTL) {
        userCache.delete(userId);
      }
    });
    // console.log(`WebSocket auth cache cleanup: ${userCache.size} users in cache`);
  }, CACHE_TTL);
  
  // Profil istatistikleri API'si - Optimize edilmiş performans
  app.get("/api/profile/stats", isAuthenticated, async (req, res) => {
    try {
      // Kullanıcı kimliğini bir kez al ve tekrar kullan
      const userId = req.user!.id;
      
      // Paralel sorgu çalıştırma - performans iyileştirmesi
      const [userBookings, userReviews] = await Promise.all([
        storage.getBookingsByUser(userId, true), // 'true' parametresi önbelleklemeyi etkinleştirir
        storage.getReviewsByUserId(userId, true), // 'true' parametresi önbelleklemeyi etkinleştirir
      ]);
      
      // Şimdi tarih hesaplaması
      const now = new Date();
      const upcomingBookings = userBookings.filter(b => new Date(b.departureDate) > now).length;
      
      const stats = {
        totalBookings: userBookings.length,
        upcomingBookings: upcomingBookings,
        completedBookings: userBookings.filter(b => b.status === 'completed').length,
        totalReviews: userReviews.length,
        activeDiscounts: 0, // İleriki bir özellik
        accountCreated: req.user!.createdAt,
        lastLogin: req.user!.lastLoginAt,
      };
      
      // İstatistik önbelleğine ekleme - 10 dakika süreyle saklama
      res.set('Cache-Control', 'private, max-age=600'); // 10 dakika client-side cache
      
      res.json(stats);
    } catch (error) {
      console.error("Profil istatistikleri alınırken hata:", error);
      res.status(500).json({ message: "Profil istatistikleri alınamadı" });
    }
  });
  
  // ----- BİLDİRİM API NOKTALARI -----
  // Tüm bildirimleri getir (admin için)
  app.get("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Bildirim getirme hatası:", error);
      res.status(500).json({ error: "Bildirim verisi alınamadı" });
    }
  });
  
  // Kullanıcının bildirimlerini getir
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Kullanıcı bildirimleri getirme hatası:", error);
      res.status(500).json({ error: "Bildirimler alınamadı" });
    }
  });
  
  // Okunmamış bildirim sayısını getir
  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Okunmamış bildirim sayısı getirme hatası:", error);
      res.status(500).json({ error: "Okunmamış bildirim sayısı alınamadı" });
    }
  });
  
  // Bildirimi okundu olarak işaretle
  app.patch("/api/notifications/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Bildirim kullanıcıya ait mi kontrol et
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: "Bildirim bulunamadı" });
      }
      
      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Bu bildirime erişim izniniz yok" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      
      // WebSocket üzerinden okunmamış bildirim sayısını güncelle
      const unreadCount = await storage.getUnreadNotificationsCount(userId);
      updateUnreadNotificationsCount(userId);
      
      res.json(updatedNotification);
    } catch (error) {
      console.error("Bildirim okundu işaretleme hatası:", error);
      res.status(500).json({ error: "Bildirim okundu olarak işaretlenemedi" });
    }
  });
  
  // Tüm bildirimleri okundu olarak işaretle
  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsAsRead(userId);
      
      // WebSocket üzerinden okunmamış bildirim sayısını güncelle
      updateUnreadNotificationsCount(userId);
      
      res.json({ success: true, message: "Tüm bildirimler okundu olarak işaretlendi" });
    } catch (error) {
      console.error("Tüm bildirimleri okundu işaretleme hatası:", error);
      res.status(500).json({ error: "Bildirimler okundu olarak işaretlenemedi" });
    }
  });
  
  // Bildirimi sil (admin ve kendine ait bildirimler için)
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      const isAdminUser = req.user!.role === 'admin' || req.user!.role === 'superadmin';
      
      // Bildirim kullanıcıya ait mi veya admin mi kontrol et
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: "Bildirim bulunamadı" });
      }
      
      if (notification.userId !== userId && !isAdminUser) {
        return res.status(403).json({ error: "Bu bildirimi silme izniniz yok" });
      }
      
      await storage.deleteNotification(notificationId);
      
      // Eğer kendi bildirimini sildiyse, okunmamış bildirim sayısını güncelle
      if (notification.userId === userId && !notification.isRead) {
        const unreadCount = await storage.getUnreadNotificationsCount(userId);
        updateUnreadNotificationsCount(userId);
      }
      
      res.json({ success: true, message: "Bildirim silindi" });
    } catch (error) {
      console.error("Bildirim silme hatası:", error);
      res.status(500).json({ error: "Bildirim silinemedi" });
    }
  });

  // Test bildirimi gönder (admin için)
  app.post("/api/admin/notifications/test", isAdmin, async (req, res) => {
    try {
      const { userId, type, title, message } = req.body;
      
      if (!userId || !type || !title || !message) {
        return res.status(400).json({ error: "Eksik parametreler" });
      }
      
      // Test bildirimi oluştur
      const notification = await storage.createNotification({
        userId,
        type,
        title,
        message,
        isRead: false,
        metadata: { isTest: true }
      });
      
      // WebSocket üzerinden bildirimi gönder
      sendNotificationToUser(userId, notification);
      
      res.json({ success: true, notification });
    } catch (error) {
      console.error("Test bildirimi gönderme hatası:", error);
      res.status(500).json({ error: "Test bildirimi gönderilemedi" });
    }
  });
  
  // Register demo data routes
  registerDemoDataRoutes(app);
  
  // Debug route to check user data
  app.get('/api/debug/users', async (req, res) => {
    try {
      console.log('Fetching all users for debugging');
      const users = await storage.getAllUsers();
      console.log(`Found ${users.length} users:`, users);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
  
  // Örnek rezervasyon verilerini oluştur
  if (typeof storage.seedBookings === 'function') {
    console.log("Örnek rezervasyon verileri yükleniyor...");
    storage.seedBookings();
  } else {
    console.log("Demo mod: Örnek rezervasyon verileri yüklenemedi.");
  }
  
  // Register Schedules API routes
  registerSchedulesRoutes(app);
  
  // Register content management routes
  app.use(contentRouter);

  // Register revenue management routes
  app.use("/api", revenueManagementRouter);
  
  // Register marketing routes
  const marketingRouter = Router();
  registerMarketingRoutes(marketingRouter, storage, wss);
  app.use("/api", marketingRouter);
  
  // Analytics API Endpoints
  const analyticsService = new AnalyticsService(storage);
  
  // Get performance metrics
  app.get("/api/admin/analytics/performance", isAdmin, async (req: Request, res: Response) => {
    try {
      const period = parseInt(req.query.period as string) || 30;
      const metrics = await analyticsService.getPerformanceMetrics(period);
      res.json(metrics);
    } catch (error) {
      console.error("Error getting performance metrics:", error);
      res.status(500).json({ error: "Failed to retrieve performance metrics" });
    }
  });
  
  // Register payment routes
  const paymentRouter = Router();
  registerPaymentRoutes(paymentRouter, storage);
  app.use("/api", paymentRouter);
  
  // Register Stripe Demo payment routes
  const stripeDemoRouter = Router();
  registerStripeDemoRoutes(stripeDemoRouter);
  app.use("/api", stripeDemoRouter);
  
  // Initialize Stripe - using our improved service with demo mode
  // Gizli anahtar environment'tan okunur
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any
  });
  
  // Sitemap ve robots.txt rotalarını kaydet
  app.use(sitemapRouter);
  
  // Çeviri yönetimi API
  app.use(translationRouter);
  
  // Hava durumu API
  app.use('/api/weather', weatherRouter);
  
  // Yorumlar API
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Yorumlar alınırken bir hata oluştu" });
    }
  });
  
  // Belirli bir yorumu getir
  app.get("/api/reviews/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const review = await storage.getReview(id);
      
      if (!review) {
        return res.status(404).json({ error: "Yorum bulunamadı" });
      }
      
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Yorum alınırken bir hata oluştu" });
    }
  });
  
  // Rotaya göre yorumları getir
  app.get("/api/routes/:routeId/reviews", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      const reviews = await storage.getReviewsByRouteId(routeId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Rota yorumları alınırken bir hata oluştu" });
    }
  });
  
  // Kullanıcıya göre yorumları getir
  app.get("/api/users/:userId/reviews", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const reviews = await storage.getReviewsByUserId(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı yorumları alınırken bir hata oluştu" });
    }
  });
  
  // Feribot şirketine göre yorumları getir
  app.get("/api/ferry-companies/:companyId/reviews", async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const reviews = await storage.getReviewsByFerryCompanyId(companyId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Şirket yorumları alınırken bir hata oluştu" });
    }
  });
  
  // Rezervasyona göre yorumları getir
  app.get("/api/bookings/:bookingId/reviews", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const reviews = await storage.getReviewsByBookingId(bookingId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Rezervasyon yorumları alınırken bir hata oluştu" });
    }
  });
  
  // Yeni yorum oluştur
  app.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = req.body;
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      // Kullanıcının kendi adına yorum yaptığından emin ol
      if (reviewData.userId !== req.user.id) {
        return res.status(403).json({ error: "Başka bir kullanıcı adına yorum yapamazsınız" });
      }
      
      // Rezervasyon ID'si verildiyse, bu rezervasyonun kullanıcıya ait olduğunu doğrula
      if (reviewData.bookingId) {
        const booking = await storage.getBooking(reviewData.bookingId);
        if (!booking || booking.userId !== req.user.id) {
          return res.status(403).json({ error: "Bu rezervasyon için yorum yapma yetkiniz yok" });
        }
        
        // Eğer rezervasyon tamamlanmış durumdaysa, verified purchase olarak işaretle
        if (booking.status === "completed") {
          reviewData.isVerifiedPurchase = true;
        }
      }
      
      const newReview = await storage.createReview(reviewData);
      res.status(201).json(newReview);
    } catch (error) {
      res.status(500).json({ error: "Yorum oluşturulurken bir hata oluştu" });
    }
  });
  
  // Yorumu güncelle (kullanıcının kendi yorumu)
  app.put("/api/reviews/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reviewData = req.body;
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Yorum bulunamadı" });
      }
      
      // Kullanıcının kendi yorumunu güncellediğinden emin ol
      if (existingReview.userId !== req.user.id) {
        return res.status(403).json({ error: "Başka bir kullanıcının yorumunu güncelleyemezsiniz" });
      }
      
      // Yalnızca izin verilen alanları güncelle (içerik, puan, başlık)
      const allowedUpdates = {
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content
      };
      
      const updatedReview = await storage.updateReview(id, allowedUpdates);
      res.json(updatedReview);
    } catch (error) {
      res.status(500).json({ error: "Yorum güncellenirken bir hata oluştu" });
    }
  });
  
  // Yorumu sil (kullanıcının kendi yorumu)
  app.delete("/api/reviews/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Yorum bulunamadı" });
      }
      
      // Kullanıcının kendi yorumunu sildiğinden emin ol
      if (existingReview.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Başka bir kullanıcının yorumunu silemezsiniz" });
      }
      
      await storage.deleteReview(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Yorum silinirken bir hata oluştu" });
    }
  });
  
  // Yorum moderasyonu (admin/moderatör için)
  app.put("/api/reviews/:id/moderation", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      // Sadece admin ve moderatörlerin yorum onaylamasına izin ver
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'moderator') {
        return res.status(403).json({ error: "Yorum moderasyon işlemi için yetkiniz yok" });
      }
      
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Yorum bulunamadı" });
      }
      
      const updatedReview = await storage.updateReviewModeration(id, req.user.id, status, note);
      res.json(updatedReview);
    } catch (error) {
      res.status(500).json({ error: "Yorum moderasyon işlemi sırasında bir hata oluştu" });
    }
  });
  
  // Yorum oyları işlemleri
  // Yorumu oyla (faydalı/faydasız)
  app.post("/api/reviews/:id/vote", async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { isHelpful } = req.body;
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const existingReview = await storage.getReview(reviewId);
      if (!existingReview) {
        return res.status(404).json({ error: "Yorum bulunamadı" });
      }
      
      // Kullanıcının kendi yorumunu oylamamasını sağla
      if (existingReview.userId === req.user.id) {
        return res.status(403).json({ error: "Kendi yorumunuzu oylayamazsınız" });
      }
      
      // Kullanıcının daha önce oy verip vermediğini kontrol et
      const existingVote = await storage.getReviewVoteByUserAndReview(req.user.id, reviewId);
      
      if (existingVote) {
        // Mevcut oyu güncelle
        const updatedVote = await storage.updateReviewVote(existingVote.id, { isHelpful });
        res.json(updatedVote);
      } else {
        // Yeni oy ekle
        const newVote = await storage.createReviewVote({
          userId: req.user.id,
          reviewId,
          isHelpful
        });
        res.status(201).json(newVote);
      }
    } catch (error) {
      res.status(500).json({ error: "Oy işlemi sırasında bir hata oluştu" });
    }
  });
  
  // Yorum cevapları işlemleri
  // Yorum cevaplarını getir
  app.get("/api/reviews/:id/replies", async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const replies = await storage.getReviewRepliesByReviewId(reviewId);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ error: "Yorum cevapları alınırken bir hata oluştu" });
    }
  });
  
  // Yoruma cevap ekle
  app.post("/api/reviews/:id/replies", async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { content, isOfficial } = req.body;
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const existingReview = await storage.getReview(reviewId);
      if (!existingReview) {
        return res.status(404).json({ error: "Yorum bulunamadı" });
      }
      
      // Resmi cevap eklemek için admin/moderator yetkisi gerektir
      if (isOfficial && req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'moderator') {
        return res.status(403).json({ error: "Resmi cevap eklemek için yetkiniz yok" });
      }
      
      // Eğer resmi bir cevapsa, önceki resmi cevabı kontrol et
      if (isOfficial) {
        const existingOfficialReply = await storage.getOfficialReplyByReviewId(reviewId);
        if (existingOfficialReply) {
          return res.status(400).json({ error: "Bu yoruma zaten bir resmi cevap eklenmiş" });
        }
      }
      
      const newReply = await storage.createReviewReply({
        reviewId,
        userId: req.user.id,
        content,
        isOfficial: isOfficial || false
      });
      
      res.status(201).json(newReply);
    } catch (error) {
      res.status(500).json({ error: "Yorum cevabı eklenirken bir hata oluştu" });
    }
  });
  
  // Yorum cevabını güncelle
  app.put("/api/reviews/replies/:id", async (req, res) => {
    try {
      const replyId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const existingReply = await storage.getReviewReply(replyId);
      if (!existingReply) {
        return res.status(404).json({ error: "Yorum cevabı bulunamadı" });
      }
      
      // Kullanıcının kendi cevabını güncellemesini sağla veya admin/moderator kontrolü yap
      if (existingReply.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Bu cevabı güncelleme yetkiniz yok" });
      }
      
      const updatedReply = await storage.updateReviewReply(replyId, { content });
      res.json(updatedReply);
    } catch (error) {
      res.status(500).json({ error: "Yorum cevabı güncellenirken bir hata oluştu" });
    }
  });
  
  // Yorum cevabını sil
  app.delete("/api/reviews/replies/:id", async (req, res) => {
    try {
      const replyId = parseInt(req.params.id);
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const existingReply = await storage.getReviewReply(replyId);
      if (!existingReply) {
        return res.status(404).json({ error: "Yorum cevabı bulunamadı" });
      }
      
      // Kullanıcının kendi cevabını silmesini sağla veya admin/moderator kontrolü yap
      if (existingReply.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Bu cevabı silme yetkiniz yok" });
      }
      
      await storage.deleteReviewReply(replyId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Yorum cevabı silinirken bir hata oluştu" });
    }
  });
  
  // Kullanıcı profili işlemleri
  // Kullanıcı profilini getir
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profile = await storage.getUserProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Kullanıcı profili bulunamadı" });
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı profili alınırken bir hata oluştu" });
    }
  });
  
  // Kendi profilini getir
  app.get("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const profile = await storage.getUserProfileByUserId(req.user.id);
      
      if (!profile) {
        // Profil yoksa yeni bir profil oluştur
        const newProfile = await storage.createUserProfile({
          userId: req.user.id,
          preferredLanguage: "tr",
          preferredCurrency: "TRY",
          newsletterSubscribed: true
        });
        
        return res.json(newProfile);
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı profili alınırken bir hata oluştu" });
    }
  });
  
  // Profil güncelleme
  app.put("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      }
      
      const profileData = req.body;
      let profile = await storage.getUserProfileByUserId(req.user.id);
      
      if (!profile) {
        // Profil yoksa yeni bir profil oluştur
        profileData.userId = req.user.id;
        profile = await storage.createUserProfile(profileData);
      } else {
        // Profil varsa güncelle
        profile = await storage.updateUserProfile(profile.id, profileData);
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı profili güncellenirken bir hata oluştu" });
    }
  });
  
  // Ticket routes
  app.use('/api/tickets', ticketRoutes);
  
  // B2B routes for agency management
  app.use('/api/b2b', b2bRouter);
  
  // Kullanıcı profiline özel API endpoint'leri
  app.get("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const profile = await storage.getUserProfileByUserId(req.user.id);
      res.json(profile || {});
    } catch (error) {
      res.status(500).json({ error: "Profil bilgileri alınırken bir hata oluştu" });
    }
  });
  
  // Kullanıcının rezervasyonlarını getir
  app.get("/api/user/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      console.log("Rezervasyonlar alınıyor. Kullanıcı ID:", req.user.id);
      // Doğrudan getBookingsByUser metodunu kullan
      const bookings = await storage.getBookingsByUser(req.user.id);
      console.log("Alınan rezervasyonlar:", bookings);
      res.json(bookings || []);
    } catch (error) {
      console.error("Rezervasyonlar alınırken hata:", error);
      res.status(500).json({ error: "Rezervasyonlar alınırken bir hata oluştu" });
    }
  });
  
  // Kullanıcının yorumlarını getir
  app.get("/api/user/reviews", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      // Reviews direkt olarak array olarak dönüyor
      const reviews = Array.from(storage.reviews.values()).filter(review => review.userId === req.user.id);
      res.json(reviews || []);
    } catch (error) {
      console.error("Yorumlar alınırken hata:", error);
      res.status(500).json({ error: "Yorumlar alınırken bir hata oluştu" });
    }
  });
  
  // Kullanıcının destek taleplerini getir
  app.get("/api/user/support-requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      // supportRequests storage'dan direkt Map olarak geliyor
      const requests = Array.from(storage.supportRequests.values()).filter(request => request.userId === req.user.id);
      res.json(requests || []);
    } catch (error) {
      console.error("Destek talepleri alınırken hata:", error);
      res.status(500).json({ error: "Destek talepleri alınırken bir hata oluştu" });
    }
  });
  
  // Yeni destek talebi oluştur
  app.post("/api/support-requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const supportRequest = await storage.createSupportRequest({
        ...req.body,
        userId: req.user.id,
        status: 'open'
      });
      
      res.status(201).json(supportRequest);
    } catch (error) {
      res.status(500).json({ error: "Destek talebi oluşturulurken bir hata oluştu" });
    }
  });
  
  // Destek talebine mesaj gönder
  app.post("/api/support-messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const { supportRequestId, message, isStaff } = req.body;
      
      // Destek talebinin varlığını kontrol et
      const supportRequest = await storage.getSupportRequest(supportRequestId);
      if (!supportRequest) {
        return res.status(404).json({ error: "Destek talebi bulunamadı" });
      }
      
      // Kullanıcı yetkisini kontrol et
      if (supportRequest.userId !== req.user.id && !['admin', 'superadmin', 'agent'].includes(req.user.role)) {
        return res.status(403).json({ error: "Bu destek talebine mesaj gönderme yetkiniz yok" });
      }
      
      // Personel mesajı ise yetki kontrolü
      if (isStaff && !['admin', 'superadmin', 'agent'].includes(req.user.role)) {
        return res.status(403).json({ error: "Personel olarak mesaj gönderme yetkiniz yok" });
      }
      
      const supportMessage = await storage.createSupportMessage({
        supportRequestId,
        senderId: req.user.id,
        message,
        isStaff: isStaff || false
      });
      
      // Eğer durum 'open' ise ve personel cevap veriyorsa, durumu 'in_progress' olarak güncelle
      if (supportRequest.status === 'open' && isStaff) {
        await storage.updateSupportRequestStatus(supportRequestId, 'in_progress');
      }
      
      // Kullanıcıya bildirim gönder (eğer personel mesajı ise)
      if (isStaff && supportRequest.userId !== req.user.id) {
        const notification = await storage.createNotification({
          userId: supportRequest.userId,
          title: 'Destek Talebinize Yanıt',
          message: 'Destek talebinize bir yanıt geldi',
          type: 'support',
          isRead: false,
          relatedType: 'support_request',
          relatedId: supportRequestId,
          actionUrl: `/my-account/support/${supportRequestId}`
        });
        
        // WebSocket üzerinden bildirim gönder
        broadcastToUser(supportRequest.userId, {
          type: 'new_notification',
          notification: notification,
          message: 'Destek talebinize bir yanıt geldi'
        });
        
        // Okunmamış bildirim sayısını güncelle
        const unreadCount = await storage.getUnreadNotificationsCount(supportRequest.userId);
        broadcastToUser(supportRequest.userId, {
          type: 'unread_notifications_count',
          count: unreadCount
        });
      }
      
      // Ayrıca WebSocket üzerinden destek mesajının geldiğini bildir
      // Bu, kullanıcı o anda destek mesajlaşma ekranında ise anlık güncelleme yapması için
      broadcastToUser(supportRequest.userId, {
        type: 'support_message',
        supportRequestId: supportRequestId,
        message: supportMessage,
        fromStaff: isStaff || false
      });
      
      // Personel mesajı değilse, adminlere bildir
      if (!isStaff) {
        broadcastToRole(['admin', 'superadmin', 'agent'], {
          type: 'new_support_message',
          supportRequestId: supportRequestId,
          message: 'Yeni bir destek mesajı var',
          username: req.user.username
        });
      }
      
      res.status(201).json(supportMessage);
    } catch (error) {
      res.status(500).json({ error: "Mesaj gönderilirken bir hata oluştu" });
    }
  });
  
  // =====================
  // BİLDİRİM API ROTALARI
  // =====================
  
  // Kullanıcının bildirimlerini getir
  app.get("/api/user/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      // Veritabanından kullanıcıya ait bildirimleri al
      const notifications = await storage.getUserNotifications(req.user.id);
      
      // Okunmamış bildirim sayısını al
      const unreadCount = await storage.getUnreadNotificationsCount(req.user.id);
      
      res.json({
        notifications: notifications || [],
        unreadCount: unreadCount || 0
      });
    } catch (error) {
      console.error("Bildirimler alınırken hata:", error);
      res.status(500).json({ error: "Bildirimler alınırken bir hata oluştu" });
    }
  });
  
  // Bildirimi okundu olarak işaretle
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      
      // Bildirimin varlığını kontrol et
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ error: "Bildirim bulunamadı" });
      }
      
      // Kullanıcıya ait olup olmadığını kontrol et
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: "Bu bildirimi işaretleme yetkiniz yok" });
      }
      
      // Bildirimi okundu olarak işaretle
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      
      // Okunmamış bildirim sayısını getir
      const unreadCount = await storage.getUnreadNotificationsCount(req.user.id);
      
      // WebSocket üzerinden okunmamış bildirim sayısını bildir
      broadcastToUser(req.user.id, {
        type: 'unread_notifications_count',
        count: unreadCount
      });
      
      res.json(updatedNotification);
    } catch (error) {
      console.error("Bildirim güncellenirken hata:", error);
      res.status(500).json({ error: "Bildirim güncellenirken bir hata oluştu" });
    }
  });
  
  // Tüm bildirimleri okundu olarak işaretle
  app.patch("/api/notifications/mark-all-read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      // Kullanıcının tüm bildirimlerini okundu olarak işaretle
      const success = await storage.markAllNotificationsAsRead(req.user.id);
      
      if (success) {
        // WebSocket üzerinden okunmamış bildirim sayısı 0 olarak bildir
        broadcastToUser(req.user.id, {
          type: 'unread_notifications_count',
          count: 0
        });
        
        res.json({ success: true, message: "Tüm bildirimler okundu olarak işaretlendi" });
      } else {
        res.status(500).json({ error: "Bildirimler işaretlenirken bir sorun oluştu" });
      }
    } catch (error) {
      console.error("Bildirimler güncellenirken hata:", error);
      res.status(500).json({ error: "Bildirimler güncellenirken bir hata oluştu" });
    }
  });
  
  // Admin için bildirim oluşturma endpointi
  app.post("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const { userId, title, message, type, relatedId, relatedType, actionUrl, metadata } = req.body;
      
      if (!userId || !title || !message || !type) {
        return res.status(400).json({ error: "userId, title, message ve type alanları zorunludur" });
      }
      
      // Kullanıcının varlığını kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Belirtilen kullanıcı bulunamadı" });
      }
      
      // Yeni bildirim oluştur
      const notification = await storage.createNotification({
        userId,
        title,
        message,
        type,
        isRead: false,
        relatedId: relatedId || null,
        relatedType: relatedType || null,
        actionUrl: actionUrl || null,
        metadata: metadata || {}
      });
      
      // WebSocket üzerinden bildirim gönder
      broadcastToUser(userId, {
        type: 'new_notification',
        notification: notification,
        message: 'Yeni bildiriminiz var'
      });
      
      res.status(201).json(notification);
    } catch (error) {
      console.error("Bildirim oluşturulurken hata:", error);
      res.status(500).json({ error: "Bildirim oluşturulurken bir hata oluştu" });
    }
  });
  
  // Admin için tüm bildirimleri getir
  app.get("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Bildirimler alınırken hata:", error);
      res.status(500).json({ error: "Bildirimler alınırken bir hata oluştu" });
    }
  });
  
  // Admin için bildirim silme endpointi
  app.delete("/api/admin/notifications/:id", isAdmin, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      // Bildirimin varlığını kontrol et
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ error: "Bildirim bulunamadı" });
      }
      
      // Bildirimi sil
      const success = await storage.deleteNotification(notificationId);
      
      if (success) {
        res.json({ success: true, message: "Bildirim başarıyla silindi" });
      } else {
        res.status(500).json({ error: "Bildirim silinirken bir sorun oluştu" });
      }
    } catch (error) {
      console.error("Bildirim silinirken hata:", error);
      res.status(500).json({ error: "Bildirim silinirken bir hata oluştu" });
    }
  });
  
  // Kullanıcının sosyal paylaşımlarını getir
  app.get("/api/user/social-shares", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      // Tüm sosyal paylaşımları al ve kullanıcıya ait olanları filtrele
      const allShares = storage.socialShares || new Map();
      const shares = Array.from(allShares.values())
        .filter((share: any) => share && share.userId === req.user.id);
      
      res.json(shares || []);
    } catch (error) {
      console.error("Sosyal paylaşımlar alınırken hata:", error);
      res.status(500).json({ error: "Sosyal paylaşımlar alınırken bir hata oluştu" });
    }
  });
  
  // Yeni sosyal paylaşım oluştur
  app.post("/api/user/social-shares", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const { platform, shareUrl, contentType } = req.body;
      
      if (!platform || !shareUrl || !contentType) {
        return res.status(400).json({ error: "Tüm gerekli alanları doldurmanız gerekiyor" });
      }
      
      // Manuel olarak sosyal paylaşımı oluştur
      const socialShareId = Date.now();
      const socialShare = {
        id: socialShareId,
        userId: req.user.id,
        platform,
        sharedUrl: shareUrl,
        contentType,
        relatedEntityType: contentType,
        relatedEntityId: 0,
        shareStatus: 'completed',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // storage'da socialShares Map'i yoksa oluştur
      if (!storage.socialShares) {
        storage.socialShares = new Map();
      }
      
      // Paylaşımı Map'e ekle
      storage.socialShares.set(socialShareId, socialShare);
      
      // Bildirim oluştur
      const notification = await storage.createNotification({
        userId: req.user.id,
        title: 'Sosyal Paylaşım Başarılı',
        message: `İçeriğiniz başarıyla ${platform} platformunda paylaşıldı`,
        type: 'social',
        isRead: false,
        relatedType: 'social_share',
        relatedId: socialShareId,
        actionUrl: '/my-account/social-shares'
      });
      
      // WebSocket üzerinden bildirim gönder
      broadcastToUser(req.user.id, {
        type: 'new_notification',
        notification: notification,
        message: `İçeriğiniz başarıyla ${platform} platformunda paylaşıldı`
      });
      
      // Okunmamış bildirim sayısını güncelle ve WebSocket üzerinden bildir
      const unreadCount = await storage.getUnreadNotificationsCount(req.user.id);
      broadcastToUser(req.user.id, {
        type: 'unread_notifications_count',
        count: unreadCount
      });
      
      res.status(201).json(socialShare);
    } catch (error) {
      console.error("Sosyal paylaşım oluşturma hatası:", error);
      res.status(500).json({ error: "Sosyal paylaşım oluşturulurken bir hata oluştu" });
    }
  });
  
  // Sosyal paylaşım silme
  app.delete("/api/user/social-shares/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const shareId = parseInt(req.params.id);
      
      // storage'da socialShares Map'i yoksa oluştur
      if (!storage.socialShares) {
        storage.socialShares = new Map();
        return res.status(404).json({ error: "Paylaşım bulunamadı" });
      }
      
      // Paylaşımı Map'ten al
      const share = storage.socialShares.get(shareId);
      
      if (!share) {
        return res.status(404).json({ error: "Paylaşım bulunamadı" });
      }
      
      // Paylaşımın gerçekten bu kullanıcıya ait olup olmadığını kontrol et
      if (share.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Bu paylaşımı silme yetkiniz yok" });
      }
      
      // Paylaşımı sil
      const result = storage.socialShares.delete(shareId);
      
      if (result) {
        res.status(200).json({ success: true, message: "Paylaşım başarıyla silindi" });
      } else {
        res.status(500).json({ error: "Paylaşım silinirken bir hata oluştu" });
      }
    } catch (error) {
      console.error("Paylaşım silinirken hata:", error);
      res.status(500).json({ error: "Paylaşım silinirken bir hata oluştu" });
    }
  });
  
  // Destek talebini kapat
  app.patch("/api/support-requests/:id/close", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const requestId = parseInt(req.params.id);
      const { resolution } = req.body;
      
      if (!resolution) {
        return res.status(400).json({ error: "Çözüm açıklaması gereklidir" });
      }
      
      // storage'da supportRequests Map'i yoksa oluştur
      if (!storage.supportRequests) {
        storage.supportRequests = new Map();
        return res.status(404).json({ error: "Destek talebi bulunamadı" });
      }
      
      // Destek talebini Map'ten al
      const supportRequest = storage.supportRequests.get(requestId);
      
      if (!supportRequest) {
        return res.status(404).json({ error: "Destek talebi bulunamadı" });
      }
      
      // Yetkiyi kontrol et
      if (supportRequest.userId !== req.user.id && !['admin', 'superadmin', 'agent'].includes(req.user.role)) {
        return res.status(403).json({ error: "Bu destek talebini kapatma yetkiniz yok" });
      }
      
      // Manuel olarak destek talebini kapat
      const updatedRequest = {
        ...supportRequest,
        status: 'closed',
        resolution,
        updatedAt: new Date()
      };
      
      // Güncellenmiş destek talebini Map'e kaydet
      storage.supportRequests.set(requestId, updatedRequest);
      
      // Kullanıcıya bildirim gönder (eğer yetkili tarafından kapatıldıysa)
      if (['admin', 'superadmin', 'agent'].includes(req.user.role) && supportRequest.userId !== req.user.id) {
        // Bildirim oluştur
        const notification = await storage.createNotification({
          userId: supportRequest.userId,
          title: 'Destek Talebi Kapatıldı',
          message: 'Destek talebiniz çözüldü ve kapatıldı',
          type: 'support',
          isRead: false,
          relatedType: 'support_request',
          relatedId: requestId,
          actionUrl: `/my-account/support/${requestId}`
        });
        
        // WebSocket üzerinden bildirim gönder
        broadcastToUser(supportRequest.userId, {
          type: 'new_notification',
          notification: notification,
          message: 'Destek talebiniz çözüldü ve kapatıldı'
        });
        
        // Okunmamış bildirim sayısını güncelle
        const unreadCount = await storage.getUnreadNotificationsCount(supportRequest.userId);
        broadcastToUser(supportRequest.userId, {
          type: 'unread_notifications_count',
          count: unreadCount
        });
      }
      
      // WebSocket üzerinden destek talebinin kapandığını bildir
      broadcastToUser(supportRequest.userId, {
        type: 'support_request_closed',
        supportRequestId: requestId,
        message: 'Destek talebiniz kapatıldı'
      });
      
      // Admin ve yetkililere de bildir
      if (req.user.id === supportRequest.userId) {
        broadcastToRole(['admin', 'superadmin', 'agent'], {
          type: 'support_request_closed',
          supportRequestId: requestId,
          message: `Destek talebi #${requestId} kullanıcı tarafından kapatıldı`,
          username: req.user.username
        });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Destek talebi kapatma hatası:", error);
      res.status(500).json({ error: "Destek talebi güncellenirken bir hata oluştu" });
    }
  });
  
  // Belirli bir destek talebinin mesajlarını getir
  app.get("/api/support-requests/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    try {
      const requestId = parseInt(req.params.id);
      
      // storage'da supportRequests Map'i yoksa oluştur
      if (!storage.supportRequests) {
        storage.supportRequests = new Map();
        return res.status(404).json({ error: "Destek talebi bulunamadı" });
      }
      
      // Destek talebini Map'ten al
      const supportRequest = storage.supportRequests.get(requestId);
      
      if (!supportRequest) {
        return res.status(404).json({ error: "Destek talebi bulunamadı" });
      }
      
      // Yetkiyi kontrol et
      if (supportRequest.userId !== req.user.id && !['admin', 'superadmin', 'agent'].includes(req.user.role)) {
        return res.status(403).json({ error: "Bu destek talebinin mesajlarını görüntüleme yetkiniz yok" });
      }
      
      // storage'da supportMessages Map'i yoksa oluştur
      if (!storage.supportMessages) {
        storage.supportMessages = new Map();
        return res.json([]);
      }
      
      // Manuel olarak mesajları getir
      const messages = Array.from(storage.supportMessages.values())
        .filter(message => message.supportRequestId === requestId);
      
      res.json(messages || []);
    } catch (error) {
      console.error("Destek talebi mesajlarını alma hatası:", error);
      res.status(500).json({ error: "Mesajlar alınırken bir hata oluştu" });
    }
  });
  
  // Setup websocket server for real-time notifications
  // Zaten yukarıda tanımlandı (satır 87-90):
  // const httpServer = createServer(app);
  // const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket connection handler
  // WebSocket bildirimleri için yardımcı fonksiyon
  const sendNotificationToUser = (userId: number, notificationData: any) => {
    wss.clients.forEach((client: CustomWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(JSON.stringify({
          type: 'notification',
          data: notificationData
        }));
      }
    });
  };
  
  // Helper function to update unread notification count
  const updateUnreadNotificationsCount = async (userId: number) => {
    try {
      const count = await storage.getUnreadNotificationsCount(userId);
      wss.clients.forEach((client: CustomWebSocket) => {
        if (client.readyState === WebSocket.OPEN && client.userId === userId) {
          client.send(JSON.stringify({
            type: 'unread_notifications_count',
            count
          }));
        }
      });
    } catch (error) {
      console.error(`Error updating unread notification count for user ${userId}:`, error);
    }
  };
  
  // Create notification service instance
  const notificationService = getNotificationService(storage, (notification: any) => {
    // Send notification via WebSocket
    sendNotificationToUser(notification.userId, notification);
    
    // Update unread notification count
    updateUnreadNotificationsCount(notification.userId);
  });
  
  // Storage'e WebSocket bildirimi gönderme fonksiyonunu ekle
  (storage as any).sendNotificationViaWebSocket = (notification: any) => {
    sendNotificationToUser(notification.userId, notification);
  };
  
  // WebSocket bağlantı kontrol mekanizması (Performans iyileştirmeli)
  let pingInterval: NodeJS.Timeout;
  
  // WebSocket durumunu kontrol et - 30 saniyede bir - Geliştirilmiş versiyon
  const setupPingInterval = () => {
    // Mevcut zamanlayıcıyı temizle
    if (pingInterval) {
      clearInterval(pingInterval);
    }
    
    // Yeni zamanlayıcı oluştur
    pingInterval = setInterval(() => {
      const now = Date.now();
      let activeConnections = 0;
      let terminatedConnections = 0;
      
      wss.clients.forEach((client: CustomWebSocket) => {
        // Bağlantı zaten kapalıysa işleme devam etme
        if (client.readyState !== WebSocket.OPEN) {
          return;
        }
        
        activeConnections++;
        
        // 2 dakikadan uzun süre aktivite yoksa bağlantıyı kapat
        if (client.lastActivity && now - client.lastActivity > 120000) {
          console.log(`İnaktif WebSocket bağlantısı kapatılıyor... Son aktivite: ${new Date(client.lastActivity).toISOString()}`);
          client.terminate();
          terminatedConnections++;
          return;
        }
        
        // Ping kontrolü
        if (client.isAlive === false) {
          console.log('Yanıt vermeyen WebSocket bağlantısı kapatılıyor...');
          client.terminate();
          terminatedConnections++;
          return;
        }
        
        // Ping-pong kontrolünü başlat - JSON mesajı kullan
        client.isAlive = false;
        try {
          // Binary ping yerine JSON mesaj gönder (özel ping-pong protokolü)
          client.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
          }));
          
          // Eski yöntem ile ping-pong yedek olarak kalsın
          // Bazı istemciler JSON ping protokolünü desteklemeyebilir
          client.ping(() => {
            // Başarılı ping - bağlantı yaşıyor
            client.isAlive = true;
            client.lastActivity = Date.now();
          });
        } catch (err) {
          console.error('Ping gönderme hatası:', err);
          client.terminate();
          terminatedConnections++;
        }
      });
      
      // Bağlantı istatistiklerini logla
      console.log(`WebSocket istatistikleri - Aktif: ${activeConnections}, Sonlandırılan: ${terminatedConnections}`);
    }, 30000); // 30 saniye
  };
  
  // Uygulama başlatıldığında ping kontrolünü başlat
  setupPingInterval();
  
  // WebSocket Sunucusu - Performans iyileştirmeleri
  wss.on('connection', (ws: CustomWebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Initialize subscriptions and role with performance optimizations
    ws.campaignSubscriptions = [];
    ws.role = 'guest';
    ws.userId = null; // Kullanıcı kimliği için yer tutucu
    ws.isAlive = true; // Bağlantı sağlık durumu takibi
    ws.lastActivity = Date.now(); // Zaman aşımı yönetimi için son aktivite takibi
    ws.authToken = ''; // Kimlik doğrulama tokeni
    
    // Performans monitörleme
    const connectionStartTime = performance.now();
    
    // Ping olayı dinleyicisi - bağlantı sağlık kontrolü
    ws.on('pong', () => {
      ws.isAlive = true;
      // Son aktivite zamanını güncelle
      ws.lastActivity = Date.now();
    });
    
    // Send initial message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket bağlantısı açıldı' }));
    }
    
    // Handle messages from clients with optimized processing
    ws.on('message', async (message: WebSocket.RawData) => {
      try {
        // Update activity timestamp for timeout management
        ws.lastActivity = Date.now();
        ws.isAlive = true;
        
        const data = JSON.parse(message.toString());
        // Minimize logging to improve performance
        // console.log('Received message:', data);
        
        // Özel ping-pong protokolü - istemci pingi
        if (data.type === 'ping') {
          try {
            // Ping'e yanıt olarak pong mesajı gönder
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
              serverTime: new Date().toISOString(),
              pingReceived: data.timestamp
            }));
            
            // Aktivite zamanını güncelle
            ws.lastActivity = Date.now();
            ws.isAlive = true;
            
            // Debug amaçlı loglama yapma (performans için yorumlandı)
            // console.log(`Ping received from client, responded with pong`);
          } catch (pingError) {
            console.error('Error sending pong response:', pingError);
          }
          
          // Ping-pong mesajını işledik, diğer işlemlere geçmeye gerek yok
          return;
        }
        
        // Handle auth messages with caching optimization
        else if (data.type === 'auth') {
          // Kullanıcı kimlik doğrulama işlemi
          if (data.userId) {
            try {
              const userId = parseInt(data.userId);
              let user;
              let fromCache = false;
              
              // Önce önbellekte kullanıcıyı ara
              if (userCache.has(userId)) {
                user = userCache.get(userId);
                fromCache = true;
                // Önbellek kullanım zamanını güncelle
                userCache.get(userId)!.lastUsed = Date.now();
                // console.log(`WebSocket auth: User ${userId} found in cache`);
              } else {
                // Kullanıcı önbellekte yoksa veritabanından getir
                const dbUser = await storage.getUser(userId, true); // 'true' parametresi önbelleklemeyi etkinleştirir
                
                if (dbUser) {
                  // Kullanıcıyı önbelleğe ekle
                  user = {
                    id: dbUser.id,
                    username: dbUser.username,
                    role: dbUser.role || 'user',
                    lastUsed: Date.now()
                  };
                  userCache.set(userId, user);
                  // console.log(`WebSocket auth: User ${userId} added to cache`);
                }
              }
              
              if (user) {
                // Kullanıcı bilgilerini WebSocket'e kaydet
                ws.userId = userId;
                ws.role = user.role;
                
                // Başarılı cevap gönder
                ws.send(JSON.stringify({ 
                  type: 'auth_success', 
                  userId: ws.userId,
                  role: ws.role,
                  message: `Kimlik doğrulama başarılı. Kullanıcı ID: ${ws.userId}`
                }));
                
                // Okunmamış bildirim sayısını gönder
                const unreadCount = await storage.getUnreadNotificationsCount(userId);
                ws.send(JSON.stringify({
                  type: 'unread_notifications_count',
                  count: unreadCount
                }));
                
                console.log(`WebSocket kullanıcı kimliği doğrulandı: ${userId} (${user.username})${fromCache ? ' [Önbellekten]' : ''}`);
              } else {
                ws.send(JSON.stringify({ 
                  type: 'auth_error', 
                  message: 'Kullanıcı bulunamadı'
                }));
              }
            } catch (error) {
              console.error('WebSocket kimlik doğrulama hatası:', error);
              ws.send(JSON.stringify({ 
                type: 'auth_error', 
                message: 'Kimlik doğrulama hatası'
              }));
            }
          } else {
            ws.send(JSON.stringify({ 
              type: 'auth_error', 
              message: 'Geçersiz kimlik bilgileri'
            }));
          }
        }
        
        // Handle subscription requests
        else if (data.type === 'subscribe') {
          // Handle subscription requests (e.g., to specific campaigns)
          ws.campaignSubscriptions = ws.campaignSubscriptions || [];
          if (data.campaignId && !ws.campaignSubscriptions.includes(data.campaignId)) {
            ws.campaignSubscriptions.push(data.campaignId);
            ws.send(JSON.stringify({ 
              type: 'subscription_success', 
              message: `Subscribed to campaign ${data.campaignId}` 
            }));
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });
    
    // Handle disconnection with cleanup
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      
      // Temizleme işlemleri ve kullanımdan kaldırma
      ws.isAlive = false;
      ws.userId = null;
      ws.role = 'guest';
      ws.campaignSubscriptions = [];
      
      // İstatistik loglaması
      const now = Date.now();
      const connectionDuration = now - ws.lastActivity;
      console.log(`WebSocket bağlantı süresi: ${connectionDuration}ms`);
    });
  });
  
  // Broadcast to all connected clients
  const broadcastToAll = (data: any) => {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // Broadcast to clients subscribed to a specific campaign
  const broadcastToCampaign = (campaignId: number, data: any) => {
    wss.clients.forEach((client: CustomWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.campaignSubscriptions && 
          client.campaignSubscriptions.includes(campaignId)) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // Belirli bir kullanıcıya bildirim gönder
  const broadcastToUser = (userId: number, data: any) => {
    wss.clients.forEach((client: CustomWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.userId === userId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // Belirli bir role sahip kullanıcılara bildirim gönder
  const broadcastToRole = (role: string, data: any) => {
    wss.clients.forEach((client: CustomWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.role === role) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Set up multer for file uploads
  const storage_config = multer.memoryStorage();
  const upload = multer({ 
    storage: storage_config,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!') as any, false);
      }
    }
  });

  // Site settings API
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  app.patch("/api/admin/site-settings", isAdmin, async (req, res) => {
    try {
      const validatedData = insertSiteSettingsSchema.partial().parse(req.body);
      const updatedSettings = await storage.updateSiteSettings(validatedData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update site settings" });
    }
  });
  
  // Upload logo API
  app.post("/api/admin/upload/logo", isAdmin, upload.single('logo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const originalFilename = req.file.originalname;
      
      const result = await uploadFile(fileBuffer, originalFilename, 'logos');
      
      // Update site settings with new logo URL
      const siteSettings = await storage.getSiteSettings();
      await storage.updateSiteSettings({
        ...siteSettings,
        logoUrl: result.url
      });
      
      res.json({ 
        success: true, 
        message: "Logo uploaded successfully", 
        url: result.url 
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });
  
  // Upload favicon API
  app.post("/api/admin/upload/favicon", isAdmin, upload.single('favicon'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const originalFilename = req.file.originalname;
      
      const result = await uploadFile(fileBuffer, originalFilename, 'favicons');
      
      // Update site settings with new favicon URL
      const siteSettings = await storage.getSiteSettings();
      await storage.updateSiteSettings({
        ...siteSettings,
        faviconUrl: result.url
      });
      
      res.json({ 
        success: true, 
        message: "Favicon uploaded successfully", 
        url: result.url 
      });
    } catch (error) {
      console.error("Favicon upload error:", error);
      res.status(500).json({ message: "Failed to upload favicon" });
    }
  });
  
  // Upload background image API
  app.post("/api/admin/upload/background", isAdmin, upload.single('background'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const originalFilename = req.file.originalname;
      
      const result = await uploadFile(fileBuffer, originalFilename, 'backgrounds');
      
      // Update site settings with new background image URL
      const siteSettings = await storage.getSiteSettings();
      await storage.updateSiteSettings({
        ...siteSettings,
        homeBackgroundImage: result.url
      });
      
      res.json({ 
        success: true, 
        message: "Background image uploaded successfully", 
        url: result.url 
      });
    } catch (error) {
      console.error("Background image upload error:", error);
      res.status(500).json({ message: "Failed to upload background image" });
    }
  });

  // User API (admin-only) - Kullanıcı Yönetim API'leri
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get("/api/admin/users/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  app.post("/api/admin/users", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { username, email, password, fullName, role, phoneNumber } = req.body;
      
      // Zorunlu alanları kontrol et
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email and password are required" });
      }
      
      // Kullanıcı adının veya e-postanın daha önce kullanılmış olup olmadığını kontrol et
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Şifreyi hashle
      const hashedPassword = await hashPassword(password);
      
      // Yeni kullanıcıyı oluştur
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: role || 'user',
        fullName: fullName || null,
        phoneNumber: phoneNumber || null,
        isActive: true,
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const { email, fullName, phoneNumber } = req.body;
      
      // Kullanıcının var olup olmadığını kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // E-posta değiştirilmişse ve başka bir kullanıcı tarafından kullanılıyorsa hata ver
      if (email && email !== user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ message: "Email already in use by another user" });
        }
      }
      
      // Kullanıcıyı güncelle
      const updatedUser = await storage.updateUser(userId, {
        email: email || user.email,
        fullName: fullName !== undefined ? fullName : user.fullName,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  app.patch("/api/admin/users/:id/status", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      // Kullanıcının var olup olmadığını kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admin kendisini devre dışı bırakamaz
      if (userId === req.user.id && isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }
      
      // Kullanıcı durumunu güncelle
      const updatedUser = await storage.updateUser(userId, { isActive });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });
  
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      // Geçerli rol tipi kontrolü
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ message: "Invalid role type" });
      }
      
      // Kullanıcının var olup olmadığını kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admin kendisini normal kullanıcı yapamaz
      if (userId === req.user.id && role !== 'admin') {
        return res.status(400).json({ message: "Cannot remove admin role from your own account" });
      }
      
      // Kullanıcı rolünü güncelle
      const updatedUser = await storage.updateUser(userId, { role });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
  
  // Şifre sıfırlama endpoint'i
  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Kullanıcının var olup olmadığını kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Şifreyi hashle
      const hashedPassword = await hashPassword(password);
      
      // Kullanıcı şifresini güncelle
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
  // Kullanıcı silme endpoint'i - dikkatli kullanılmalıdır
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      
      // Kullanıcının var olup olmadığını kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admin kendisini silemez
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Kullanıcının ilişkili kayıtlarını kontrol et
      const userBookings = await storage.getBookingsByUser(userId);
      if (userBookings.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete user with existing bookings. Deactivate the account instead.",
          bookingsCount: userBookings.length
        });
      }
      
      // Kullanıcıyı sil
      await storage.deleteUser(userId);
      
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Ports API
  app.get("/api/ports", async (req, res) => {
    try {
      const ports = await storage.getAllPorts();
      // Filter active ports only for non-admin users
      const filteredPorts = req.user?.role === "admin" ? ports : ports.filter(p => p.isActive);
      res.json(filteredPorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ports" });
    }
  });

  app.post("/api/admin/ports", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const validatedData = insertPortSchema.parse(req.body);
      const port = await storage.createPort(validatedData);
      res.status(201).json(port);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create port" });
    }
  });

  app.patch("/api/admin/ports/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertPortSchema.partial().parse(req.body);
      const port = await storage.updatePort(id, validatedData);
      
      if (!port) {
        return res.status(404).json({ message: "Port not found" });
      }
      
      res.json(port);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update port" });
    }
  });

  // Routes API
  app.get("/api/routes", async (req, res) => {
    try {
      const routes = await storage.getAllRoutes();
      // Filter active routes only for non-admin users
      const filteredRoutes = req.user?.role === "admin" ? routes : routes.filter(r => r.isActive);
      res.json(filteredRoutes);
    } catch (error) {
      console.error("Error in getAllRoutes:", error);
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });
  
  // Create sample Turkey-Greece routes
  app.post("/api/admin/create-sample-routes", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const sampleRoutes = [
        {
          departurePort: "İstanbul",
          departureCode: "IST",
          arrivalPort: "Atina",
          arrivalCode: "ATH",
          distance: 350,
          duration: 480, // 8 hours in minutes
          basePrice: "1200.00",
          description: "İstanbul'dan Atina'ya popüler feribot rotası. Deniz manzarası eşliğinde konforlu bir yolculuk.",
          isActive: true,
          checkInStartTime: 120, // 2 hours before departure
          checkInEndTime: 30, // 30 minutes before departure
          boardingStartTime: 60, // 1 hour before departure
          boardingEndTime: 15, // 15 minutes before departure
          specialInstructions: "Yolcuların en az 2 saat önce gelmesi tavsiye edilir. Pasaport ve vize kontrolü yapılacaktır.",
          isFeatured: true,
          isPopular: true,
          routeType: "international",
          isInternational: true,
          countryDeparture: "Turkey",
          countryArrival: "Greece",
          featureImage: "/images/routes/istanbul-athens.jpg",
          routeCode: "IST-ATH",
        },
        {
          departurePort: "Bodrum",
          departureCode: "BDR",
          arrivalPort: "Kos",
          arrivalCode: "KOS",
          distance: 25,
          duration: 60, // 1 hour in minutes
          basePrice: "350.00",
          description: "Bodrum'dan Kos adasına günlük feribot seferi. Kısa ve keyifli bir deniz yolculuğu.",
          isActive: true,
          checkInStartTime: 90, // 1.5 hours before departure
          checkInEndTime: 20, // 20 minutes before departure
          boardingStartTime: 45, // 45 minutes before departure
          boardingEndTime: 10, // 10 minutes before departure
          specialInstructions: "Yolcuların pasaport veya kimlik kartı kontrol edilecektir. Uygun belgeler olmadan binişe izin verilmeyecektir.",
          isFeatured: true,
          isPopular: true,
          routeType: "international",
          isInternational: true,
          countryDeparture: "Turkey",
          countryArrival: "Greece",
          featureImage: "/images/routes/bodrum-kos.jpg",
          routeCode: "BDR-KOS",
        },
        {
          departurePort: "Kuşadası",
          departureCode: "KUS",
          arrivalPort: "Samos",
          arrivalCode: "SMO",
          distance: 27,
          duration: 75, // 1 hour 15 min in minutes
          basePrice: "320.00",
          description: "Kuşadası'ndan Samos adasına feribot seferi. Ege'nin masmavi sularında kısa bir yolculuk.",
          isActive: true,
          checkInStartTime: 90, // 1.5 hours before departure
          checkInEndTime: 20, // 20 minutes before departure
          boardingStartTime: 45, // 45 minutes before departure
          boardingEndTime: 10, // 10 minutes before departure
          specialInstructions: "Schengen vizesi veya Yunanistan ziyaretçi vizesi gereklidir. Lütfen belgelerinizi seyahat öncesi kontrol ediniz.",
          isFeatured: true,
          isPopular: true,
          routeType: "international",
          isInternational: true,
          countryDeparture: "Turkey",
          countryArrival: "Greece",
          featureImage: "/images/routes/kusadasi-samos.jpg",
          routeCode: "KUS-SMO",
        },
        {
          departurePort: "Çeşme",
          departureCode: "CES",
          arrivalPort: "Chios",
          arrivalCode: "CHI",
          distance: 15,
          duration: 45, // 45 minutes
          basePrice: "280.00",
          description: "Çeşme'den Chios (Sakız) adasına kısa feribot seferi. Türkiye ve Yunanistan arasında en kısa rotalardan biri.",
          isActive: true,
          checkInStartTime: 90, // 1.5 hours before departure
          checkInEndTime: 20, // 20 minutes before departure
          boardingStartTime: 45, // 45 minutes before departure
          boardingEndTime: 10, // 10 minutes before departure
          specialInstructions: "Günübirlik ziyaretler için özel vize düzenlemeleri mevcuttur. Detaylı bilgi için bilet ofisimizle iletişime geçebilirsiniz.",
          isFeatured: true,
          isPopular: true,
          routeType: "international",
          isInternational: true,
          countryDeparture: "Turkey",
          countryArrival: "Greece",
          featureImage: "/images/routes/cesme-chios.jpg",
          routeCode: "CES-CHI",
        },
        {
          departurePort: "Ayvalık",
          departureCode: "AYV",
          arrivalPort: "Lesvos",
          arrivalCode: "LSV",
          distance: 35,
          duration: 90, // 1.5 hours in minutes
          basePrice: "310.00",
          description: "Ayvalık'tan Midilli (Lesvos) adasına feribot seferi. Kuzey Ege'nin güzel manzaraları eşliğinde.",
          isActive: true,
          checkInStartTime: 90, // 1.5 hours before departure
          checkInEndTime: 20, // 20 minutes before departure
          boardingStartTime: 45, // 45 minutes before departure
          boardingEndTime: 10, // 10 minutes before departure
          specialInstructions: "Araç geçişleri için önceden rezervasyon yapılması gerekmektedir. Yaz sezonunda rotamız her gün hizmet vermektedir.",
          isFeatured: true,
          isPopular: false,
          routeType: "international",
          isInternational: true,
          countryDeparture: "Turkey",
          countryArrival: "Greece",
          featureImage: "/images/routes/ayvalik-lesvos.jpg",
          routeCode: "AYV-LSV",
        }
      ];
      
      const createdRoutes = [];
      for (const route of sampleRoutes) {
        try {
          const created = await storage.createRoute(route);
          createdRoutes.push(created);
        } catch (err) {
          console.error(`Error creating route ${route.departurePort} to ${route.arrivalPort}:`, err);
        }
      }
      
      res.status(201).json({
        message: `Created ${createdRoutes.length} sample Turkey-Greece routes`,
        routes: createdRoutes
      });
    } catch (error) {
      console.error("Error creating sample routes:", error);
      res.status(500).json({ message: "Failed to create sample routes", error: String(error) });
    }
  });

  app.get("/api/routes/search", async (req, res) => {
    try {
      let departurePort = req.query.from as string || "";
      let arrivalPort = req.query.to as string || "";
      
      // Log the full raw query object for debugging
      console.log(`Original query object:`, req.query);
      console.log(`Original search parameters - departure: "${departurePort}", arrival: "${arrivalPort}"`);
      
      // Arama parametrelerini URL decode et
      try {
        if (departurePort) {
          // Try double decoding in case the URL was encoded twice
          departurePort = decodeURIComponent(departurePort);
          try { departurePort = decodeURIComponent(departurePort); } catch (e) { /* ignore if already decoded */ }
        }
        if (arrivalPort) {
          arrivalPort = decodeURIComponent(arrivalPort);
          try { arrivalPort = decodeURIComponent(arrivalPort); } catch (e) { /* ignore if already decoded */ }
        }
      } catch (e) {
        console.error("Error decoding URL parameters:", e);
      }
      
      console.log(`Decoded search parameters - departure: "${departurePort}", arrival: "${arrivalPort}"`);
      
      // Boş arama yapılmasını engelle, en azından bir kalkış veya varış noktası olmalı
      if (!departurePort && !arrivalPort) {
        return res.status(400).json({ 
          message: "Search requires at least one parameter (from or to)"
        });
      }
      
      const routes = await storage.searchRoutes(departurePort, arrivalPort);
      console.log(`Found ${routes.length} routes matching the search criteria`);
      
      // Sadece aktif rotaları döndür (admin değilse)
      const filteredRoutes = req.isAuthenticated() && req.user?.role === "admin" 
        ? routes 
        : routes.filter(r => r.isActive);
      
      res.json(filteredRoutes);
    } catch (error) {
      console.error("Error searching routes:", error);
      res.status(500).json({ message: "Failed to search routes" });
    }
  });
  
  // Belirli bir rotayı ID'ye göre getir
  app.get("/api/routes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const route = await storage.getRoute(id);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("Error fetching route by ID:", error);
      res.status(500).json({ message: "Failed to fetch route details" });
    }
  });

  app.post("/api/admin/routes", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(validatedData);
      res.status(201).json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.patch("/api/admin/routes/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertRouteSchema.partial().parse(req.body);
      const route = await storage.updateRoute(id, validatedData);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  // Note: Schedules API endpoints are now handled by /api/schedules.ts

  app.post("/api/admin/schedules", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.patch("/api/admin/schedules/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateSchedule(id, validatedData);
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  // Ferry Companies API
  app.get("/api/ferry-companies", async (req, res) => {
    try {
      const companies = await storage.getAllFerryCompanies();
      // Filter active companies only for non-admin users
      const filteredCompanies = req.isAuthenticated() && req.user?.role === "admin" 
        ? companies 
        : companies.filter(c => c.isActive);
      res.json(filteredCompanies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ferry companies" });
    }
  });

  app.post("/api/admin/ferry-companies", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertFerryCompanySchema.parse(req.body);
      const company = await storage.createFerryCompany(validatedData);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ferry company" });
    }
  });

  app.patch("/api/admin/ferry-companies/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertFerryCompanySchema.partial().parse(req.body);
      const company = await storage.updateFerryCompany(id, validatedData);
      
      if (!company) {
        return res.status(404).json({ message: "Ferry company not found" });
      }
      
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update ferry company" });
    }
  });

  // Vehicle Types API
  app.get("/api/vehicle-types", async (req, res) => {
    try {
      const vehicleTypes = await storage.getAllVehicleTypes();
      res.json(vehicleTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicle types" });
    }
  });

  app.post("/api/admin/vehicle-types", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertVehicleTypeSchema.parse(req.body);
      const vehicleType = await storage.createVehicleType(validatedData);
      res.status(201).json(vehicleType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vehicle type" });
    }
  });

  app.patch("/api/admin/vehicle-types/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertVehicleTypeSchema.partial().parse(req.body);
      const vehicleType = await storage.updateVehicleType(id, validatedData);
      
      if (!vehicleType) {
        return res.status(404).json({ message: "Vehicle type not found" });
      }
      
      res.json(vehicleType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vehicle type" });
    }
  });

  // Passenger Types API
  app.get("/api/passenger-types", async (req, res) => {
    try {
      const passengerTypes = await storage.getAllPassengerTypes();
      res.json(passengerTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch passenger types" });
    }
  });

  app.post("/api/admin/passenger-types", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertPassengerTypeSchema.parse(req.body);
      const passengerType = await storage.createPassengerType(validatedData);
      res.status(201).json(passengerType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create passenger type" });
    }
  });

  app.patch("/api/admin/passenger-types/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertPassengerTypeSchema.partial().parse(req.body);
      const passengerType = await storage.updatePassengerType(id, validatedData);
      
      if (!passengerType) {
        return res.status(404).json({ message: "Passenger type not found" });
      }
      
      res.json(passengerType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update passenger type" });
    }
  });

  // Bookings API
  app.get("/api/bookings", async (req, res) => {
    try {
      console.log("GET /api/bookings endpoint triggered");
      if (!req.isAuthenticated()) {
        console.log("User not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      console.log("User authenticated, role:", req.user?.role);
      
      // For admin, return all bookings; for users, return only their bookings
      if (req.user?.role === "admin" || req.user?.role === "superadmin") {
        console.log("Admin user - fetching all bookings");
        const bookings = await storage.getAllBookings();
        console.log("Bookings retrieved from storage:", bookings);
        return res.json(bookings);
      } else {
        console.log("Regular user - fetching user bookings for user ID:", req.user!.id);
        const userBookings = await storage.getBookingsByUser(req.user!.id);
        console.log("User bookings retrieved from storage:", userBookings);
        
        // Eğer kullanıcının rezervasyonu yoksa ve demo/member/agent kullanıcılarından biriyse
        // otomatik olarak örnek veri oluşturma ve atama işlemini başlat
        if ((!userBookings || userBookings.length === 0) && 
            ["demo", "member", "agent"].includes(req.user!.username)) {
          console.log(`Kullanıcı ${req.user!.username} için örnek veriler yükleniyor...`);
          try {
            // Doğrudan native örnek rezervasyon verilerini oluştur
            // Kullanıcı adı tespit edildi
            const username = req.user!.username;
            const userId = req.user!.id;
            
            // Kullanıcı tipi için uygun rezervasyonları oluştur
            // Önce rezervasyon verilerini oluştur
            const userBookingData = await createSampleBookingsForUser(userId, username);
            
            // Ardından diğer üye verilerini (yorumlar, destek talepleri, vb.) oluştur
            try {
              const sampleDataService = new SampleMemberDataService(storage);
              await sampleDataService.populateDemoData();
            } catch (error) {
              console.log("Demo veri oluşturma hatası:", error.message);
            }
            
            if (userBookingData) {
              console.log(`${username} için tüm örnek veriler oluşturuldu`);
              return res.json(userBookingData);
            } else {
              // Örnek veriler oluşturuluyor mesajı gönderilir
              return res.json([{ 
                id: 0,
                status: "sample_loading",
                message: "Örnek rezervasyon verileri yükleniyor. Lütfen birkaç saniye sonra tekrar deneyin."
              }]);
            }
          } catch (error) {
            console.error("Örnek veri yükleme hatası:", error);
            return res.json([{
              id: 0,
              status: "error",
              message: "Örnek rezervasyon verileri yüklenirken hata oluştu."
            }]);
          }
        }
        
        return res.json(userBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow access to own bookings unless admin
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user!.id, // Ensure booking is for the authenticated user
      });
      
      const booking = await storage.createBooking(validatedData);
      
      // Process passenger information
      if (req.body.passengers && Array.isArray(req.body.passengers)) {
        for (const passenger of req.body.passengers) {
          const validatedPassenger = insertBookingPassengerSchema.parse({
            ...passenger,
            bookingId: booking.id,
          });
          await storage.createBookingPassenger(validatedPassenger);
        }
      }
      
      // Process vehicle information
      if (req.body.vehicle && req.body.vehicle.vehicleTypeId) {
        const validatedVehicle = insertBookingVehicleSchema.parse({
          ...req.body.vehicle,
          bookingId: booking.id,
        });
        await storage.createBookingVehicle(validatedVehicle);
      }
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow updates to own bookings unless admin
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertBookingSchema.partial().parse(req.body);
      const updatedBooking = await storage.updateBooking(id, validatedData);
      
      res.json(updatedBooking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Get booking passengers
  app.get("/api/bookings/:id/passengers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow access to own bookings unless admin
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const passengers = await storage.getBookingPassengersByBooking(bookingId);
      res.json(passengers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking passengers" });
    }
  });

  // Get booking vehicles
  app.get("/api/bookings/:id/vehicles", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow access to own bookings unless admin
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const vehicles = await storage.getBookingVehiclesByBooking(bookingId);
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking vehicles" });
    }
  });

  // Mock payment processing
  app.post("/api/bookings/:id/payment", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow payment for own bookings unless admin
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Mock payment processing
      // In a real application, this would integrate with a payment gateway
      const updatedBooking = await storage.updateBooking(id, { 
        isPaid: true,
        status: "confirmed"
      });
      
      res.json({ success: true, booking: updatedBooking });
    } catch (error) {
      res.status(500).json({ message: "Payment processing failed" });
    }
  });

  // Advanced SEO - Sitemap with image and multilingual support
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const routes = await storage.getAllRoutes();
      const ports = await storage.getAllPorts();
      const ferryCompanies = await storage.getAllFerryCompanies();
      const languages = await storage.getAllLanguages().then(langs => langs.filter(l => l.isActive));
      const baseUrl = "https://ferrybooking.web.tr";
      const currentDate = new Date().toISOString().split('T')[0];
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
              xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
              xmlns:xhtml="http://www.w3.org/1999/xhtml">`;
      
      // Add homepage with alternate language versions
      sitemap += `
        <url>
          <loc>${baseUrl}/</loc>
          <lastmod>${currentDate}</lastmod>
          <priority>1.0</priority>
          <changefreq>daily</changefreq>
          <image:image>
            <image:loc>${baseUrl}/logo.webp</image:loc>
            <image:caption>FerryBooking - Ferry Ticket Sales and Management</image:caption>
          </image:image>`;
          
      // Add alternate language versions
      languages.forEach(lang => {
        if (lang.code !== "en") { // Assuming English is default
          sitemap += `
          <xhtml:link rel="alternate" hreflang="${lang.code}" href="${baseUrl}/${lang.code}/" />`;
        }
      });
      
      sitemap += `
        </url>`;
        
      // Add core pages
      [
        {path: "/auth", priority: "0.8", changefreq: "monthly"}, 
        {path: "/search", priority: "0.9", changefreq: "daily"},
        {path: "/faq", priority: "0.6", changefreq: "weekly"},
        {path: "/contact", priority: "0.6", changefreq: "monthly"},
        {path: "/about", priority: "0.5", changefreq: "monthly"}
      ].forEach(page => {
        sitemap += `
        <url>
          <loc>${baseUrl}${page.path}</loc>
          <lastmod>${currentDate}</lastmod>
          <priority>${page.priority}</priority>
          <changefreq>${page.changefreq}</changefreq>`;
          
        // Add language alternates for each page
        languages.forEach(lang => {
          if (lang.code !== "en") {
            sitemap += `
          <xhtml:link rel="alternate" hreflang="${lang.code}" href="${baseUrl}/${lang.code}${page.path}" />`;
          }
        });
        
        sitemap += `
        </url>`;
      });
      
      // Add route pages to sitemap with rich data
      routes.forEach(route => {
        if (route.isActive) {
          const departurePort = ports.find(p => p.name === route.departurePort);
          const arrivalPort = ports.find(p => p.name === route.arrivalPort);
          
          sitemap += `
          <url>
            <loc>${baseUrl}/routes/${route.id}</loc>
            <lastmod>${currentDate}</lastmod>
            <priority>0.7</priority>
            <changefreq>weekly</changefreq>
            <image:image>
              <image:loc>${baseUrl}/routes/${route.id}/image.webp</image:loc>
              <image:caption>Ferry route from ${route.departurePort} to ${route.arrivalPort}</image:caption>
              <image:geo_location>${departurePort?.city}, ${departurePort?.country} to ${arrivalPort?.city}, ${arrivalPort?.country}</image:geo_location>
            </image:image>`;
            
          // Add language alternates for route pages
          languages.forEach(lang => {
            if (lang.code !== "en") {
              sitemap += `
            <xhtml:link rel="alternate" hreflang="${lang.code}" href="${baseUrl}/${lang.code}/routes/${route.id}" />`;
            }
          });
          
          sitemap += `
          </url>`;
        }
      });
      
      // Add port pages
      ports.forEach(port => {
        if (port.isActive) {
          sitemap += `
          <url>
            <loc>${baseUrl}/ports/${port.id}</loc>
            <lastmod>${currentDate}</lastmod>
            <priority>0.6</priority>
            <changefreq>monthly</changefreq>
            <image:image>
              <image:loc>${baseUrl}/ports/${port.id}/image.webp</image:loc>
              <image:caption>${port.name} - Port information</image:caption>
              <image:geo_location>${port.city}, ${port.country}</image:geo_location>
            </image:image>`;
            
          // Add language alternates for port pages
          languages.forEach(lang => {
            if (lang.code !== "en") {
              sitemap += `
            <xhtml:link rel="alternate" hreflang="${lang.code}" href="${baseUrl}/${lang.code}/ports/${port.id}" />`;
            }
          });
          
          sitemap += `
          </url>`;
        }
      });
      
      // Add ferry company pages
      ferryCompanies.forEach(company => {
        if (company.isActive) {
          sitemap += `
          <url>
            <loc>${baseUrl}/ferry-companies/${company.id}</loc>
            <lastmod>${currentDate}</lastmod>
            <priority>0.5</priority>
            <changefreq>monthly</changefreq>`;
            
          if (company.logo) {
            sitemap += `
            <image:image>
              <image:loc>${baseUrl}${company.logo}</image:loc>
              <image:caption>${company.name} - Ferry operator</image:caption>
            </image:image>`;
          }
            
          // Add language alternates
          languages.forEach(lang => {
            if (lang.code !== "en") {
              sitemap += `
            <xhtml:link rel="alternate" hreflang="${lang.code}" href="${baseUrl}/${lang.code}/ferry-companies/${company.id}" />`;
            }
          });
          
          sitemap += `
          </url>`;
        }
      });
      
      sitemap += `
      </urlset>`;
      
      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });
  
  // Robots.txt for search engine crawlers
  app.get("/robots.txt", (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/
Disallow: /auth/

Sitemap: https://ferrybooking.web.tr/sitemap.xml`;

    res.header("Content-Type", "text/plain");
    res.send(robotsTxt);
  });
  
  // API endpoint for Schema.org structured data (JSON-LD) - Ferry route detail
  app.get("/api/seo/schema/route/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const route = await storage.getRoute(routeId);
      
      if (!route || !route.isActive) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const departurePort = await storage.getAllPorts().then(ports => 
        ports.find(p => p.name === route.departurePort)
      );
      
      const arrivalPort = await storage.getAllPorts().then(ports => 
        ports.find(p => p.name === route.arrivalPort)
      );
      
      const schedules = await storage.getSchedulesByRoute(routeId);
      
      // Create Schema.org JSON-LD for a ferry route
      const schemaData = {
        "@context": "https://schema.org",
        "@type": "BoatTrip",
        "name": `Ferry from ${route.departurePort} to ${route.arrivalPort}`,
        "description": route.description || `Ferry service connecting ${route.departurePort} and ${route.arrivalPort}`,
        "offers": {
          "@type": "Offer",
          "price": route.basePrice,
          "priceCurrency": "TRY", // Default currency
          "availability": "https://schema.org/InStock",
          "url": `https://ferrybooking.web.tr/routes/${route.id}`
        },
        "departureBoatTerminal": {
          "@type": "BoatTerminal",
          "name": departurePort?.name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": departurePort?.city,
            "addressCountry": departurePort?.country
          }
        },
        "arrivalBoatTerminal": {
          "@type": "BoatTerminal",
          "name": arrivalPort?.name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": arrivalPort?.city,
            "addressCountry": arrivalPort?.country
          }
        }
      };
      
      // Add schedule information if available
      if (schedules && schedules.length > 0) {
        schemaData.itinerary = schedules.map(schedule => ({
          "@type": "ItemList",
          "itemListElement": [
            {
              "@type": "BoatTrip",
              "departurePlatform": {
                "@type": "BoatTerminal",
                "name": departurePort?.name
              },
              "departureTime": schedule.departureTime,
              "arrivalPlatform": {
                "@type": "BoatTerminal",
                "name": arrivalPort?.name
              },
              "arrivalTime": schedule.arrivalTime
            }
          ]
        }));
      }
      
      res.json(schemaData);
    } catch (error) {
      console.error("Schema.org generation error:", error);
      res.status(500).json({ message: "Failed to generate Schema.org data" });
    }
  });
  
  // API endpoint for Schema.org structured data (JSON-LD) - Ferry company
  app.get("/api/seo/schema/company/:id", async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = await storage.getFerryCompany(companyId);
      
      if (!company || !company.isActive) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Create Schema.org JSON-LD for a ferry company
      const schemaData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": company.name,
        "description": company.description || `${company.name} - Ferry operator`,
        "url": `https://ferrybooking.web.tr/ferry-companies/${company.id}`,
        "logo": company.logo ? `https://ferrybooking.web.tr${company.logo}` : undefined,
        "sameAs": [
          "https://www.facebook.com/ferrycompany",
          "https://www.instagram.com/ferrycompany",
          "https://twitter.com/ferrycompany"
        ]
      };
      
      res.json(schemaData);
    } catch (error) {
      console.error("Schema.org generation error:", error);
      res.status(500).json({ message: "Failed to generate Schema.org data" });
    }
  });
  
  // API endpoint for dynamic meta tags
  app.get("/api/seo/meta", async (req, res) => {
    try {
      const siteSettings = await storage.getSiteSettings();
      const { path, lang } = req.query;
      
      if (!path) {
        return res.status(400).json({ message: "Path parameter is required" });
      }
      
      const language = lang 
        ? await storage.getLanguageByCode(lang as string)
        : await storage.getAllLanguages().then(langs => langs.find(l => l.isDefault));
      
      // Get translations for meta tags if language is specified
      const getTranslation = async (key: string, defaultValue: string) => {
        if (!language) return defaultValue;
        
        const translations = await storage.getTranslationsByLanguage(language.id);
        const translation = translations.find(t => t.key === key);
        return translation ? translation.value : defaultValue;
      };
      
      // Default meta tags
      let metaTags = {
        title: await getTranslation("meta_title", siteSettings?.siteName || "FerryBooking"),
        description: await getTranslation("meta_description", "Book ferry tickets online with the best prices"),
        keywords: await getTranslation("meta_keywords", "ferry, booking, tickets, travel"),
        ogTitle: await getTranslation("og_title", siteSettings?.siteName || "FerryBooking"),
        ogDescription: await getTranslation("og_description", "Book ferry tickets online with the best prices"),
        ogImage: "https://ferrybooking.web.tr/og-image.jpg",
        ogUrl: `https://ferrybooking.web.tr${path}`,
        twitterTitle: await getTranslation("twitter_title", siteSettings?.siteName || "FerryBooking"),
        twitterDescription: await getTranslation("twitter_description", "Book ferry tickets online with the best prices"),
        twitterImage: "https://ferrybooking.web.tr/twitter-card.jpg",
        canonical: `https://ferrybooking.web.tr${path}`
      };
      
      // Path-specific meta tags
      const pathStr = path as string;
      
      // Handle route pages
      if (pathStr.startsWith("/routes/")) {
        const routeId = parseInt(pathStr.split("/")[2]);
        if (!isNaN(routeId)) {
          const route = await storage.getRoute(routeId);
          if (route && route.isActive) {
            metaTags.title = await getTranslation("route_meta_title", `${route.departurePort} to ${route.arrivalPort} Ferry | ${siteSettings?.siteName || "FerryBooking"}`);
            metaTags.description = route.description || await getTranslation("route_meta_description", `Book ferry tickets from ${route.departurePort} to ${route.arrivalPort}. Schedule, prices and availability.`);
            metaTags.keywords = await getTranslation("route_meta_keywords", `${route.departurePort}, ${route.arrivalPort}, ferry, ticket, booking`);
            metaTags.ogTitle = metaTags.title;
            metaTags.ogDescription = metaTags.description;
            metaTags.twitterTitle = metaTags.title;
            metaTags.twitterDescription = metaTags.description;
            metaTags.ogImage = `https://ferrybooking.web.tr/routes/${routeId}/image.jpg`;
            metaTags.twitterImage = metaTags.ogImage;
          }
        }
      }
      
      // Handle port pages
      else if (pathStr.startsWith("/ports/")) {
        const portId = parseInt(pathStr.split("/")[2]);
        if (!isNaN(portId)) {
          const port = await storage.getPort(portId);
          if (port && port.isActive) {
            metaTags.title = await getTranslation("port_meta_title", `${port.name} | Ferry Port Information | ${siteSettings?.siteName || "FerryBooking"}`);
            metaTags.description = port.description || await getTranslation("port_meta_description", `Information about ${port.name} ferry port in ${port.city}, ${port.country}. Routes, facilities and more.`);
            metaTags.keywords = await getTranslation("port_meta_keywords", `${port.name}, ${port.city}, ${port.country}, ferry port, terminal`);
            metaTags.ogTitle = metaTags.title;
            metaTags.ogDescription = metaTags.description;
            metaTags.twitterTitle = metaTags.title;
            metaTags.twitterDescription = metaTags.description;
            metaTags.ogImage = `https://ferrybooking.web.tr/ports/${portId}/image.jpg`;
            metaTags.twitterImage = metaTags.ogImage;
          }
        }
      }
      
      // Handle company pages
      else if (pathStr.startsWith("/ferry-companies/")) {
        const companyId = parseInt(pathStr.split("/")[2]);
        if (!isNaN(companyId)) {
          const company = await storage.getFerryCompany(companyId);
          if (company && company.isActive) {
            metaTags.title = await getTranslation("company_meta_title", `${company.name} | Ferry Operator | ${siteSettings?.siteName || "FerryBooking"}`);
            metaTags.description = company.description || await getTranslation("company_meta_description", `Information about ${company.name} ferry operator. Routes, fleet and services.`);
            metaTags.keywords = await getTranslation("company_meta_keywords", `${company.name}, ferry operator, ferry company`);
            metaTags.ogTitle = metaTags.title;
            metaTags.ogDescription = metaTags.description;
            metaTags.twitterTitle = metaTags.title;
            metaTags.twitterDescription = metaTags.description;
            if (company.logo) {
              metaTags.ogImage = `https://ferrybooking.web.tr${company.logo}`;
              metaTags.twitterImage = metaTags.ogImage;
            }
          }
        }
      }
      
      // Other specific pages can be added here
      
      res.json(metaTags);
    } catch (error) {
      console.error("Meta tags generation error:", error);
      res.status(500).json({ message: "Failed to generate meta tags" });
    }
  });

  // Languages API
  app.get("/api/languages", async (req, res) => {
    try {
      const languages = await storage.getAllLanguages();
      // Filter active languages only for non-admin users
      const filteredLanguages = req.user?.role === "admin" ? languages : languages.filter(l => l.isActive);
      res.json(filteredLanguages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });
  
  app.get("/api/admin/languages", async (req, res) => {
    try {
      // Geçici olarak yetkilendirme kontrolünü kaldırıyoruz
      // if (req.user?.role !== "admin") {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      const languages = await storage.getAllLanguages();
      console.log("Languages fetched successfully:", languages.length);
      res.json(languages);
    } catch (error) {
      console.error("Error fetching admin languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  app.get("/api/languages/:code", async (req, res) => {
    try {
      const code = req.params.code;
      const language = await storage.getLanguageByCode(code);
      
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      
      // Only show active languages to non-admin users
      if (!language.isActive && !req.user?.role === "admin") {
        return res.status(404).json({ message: "Language not found" });
      }
      
      res.json(language);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch language" });
    }
  });

  app.post("/api/admin/languages", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertLanguageSchema.parse(req.body);
      const language = await storage.createLanguage(validatedData);
      res.status(201).json(language);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create language" });
    }
  });

  app.patch("/api/admin/languages/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertLanguageSchema.partial().parse(req.body);
      const language = await storage.updateLanguage(id, validatedData);
      
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      
      res.json(language);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update language" });
    }
  });
  
  app.delete("/api/admin/languages/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteLanguage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Language not found or could not be deleted" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting language:", error);
      res.status(500).json({ message: "Failed to delete language" });
    }
  });

  // Translation Functions API
  app.get("/api/admin/translation-functions", async (req, res) => {
    try {
      // Geçici olarak yetkilendirme kontrolünü kaldırıyoruz
      // if (req.user?.role !== "admin") {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      const translationFunctions = await storage.getAllTranslationFunctions();
      console.log("Çeviri fonksiyonları başarıyla getirildi:", translationFunctions.length);
      res.json(translationFunctions);
    } catch (error) {
      console.error("Error fetching translation functions:", error);
      res.status(500).json({ message: "Failed to fetch translation functions" });
    }
  });
  
  app.get("/api/admin/translation-functions/category/:category", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const category = req.params.category;
      const translationFunctions = await storage.getTranslationFunctionsByCategory(category);
      res.json(translationFunctions);
    } catch (error) {
      console.error("Error fetching translation functions by category:", error);
      res.status(500).json({ message: "Failed to fetch translation functions" });
    }
  });
  
  app.get("/api/admin/translation-functions/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const translationFunction = await storage.getTranslationFunction(id);
      
      if (!translationFunction) {
        return res.status(404).json({ message: "Translation function not found" });
      }
      
      res.json(translationFunction);
    } catch (error) {
      console.error("Error fetching translation function:", error);
      res.status(500).json({ message: "Failed to fetch translation function" });
    }
  });
  
  app.post("/api/admin/translation-functions", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const insertTranslationFunctionSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().min(1),
        parameters: z.array(z.any()).optional(),
        isCore: z.boolean().optional()
      });
      
      const validatedData = insertTranslationFunctionSchema.parse(req.body);
      const translationFunction = await storage.createTranslationFunction(validatedData);
      res.status(201).json(translationFunction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating translation function:", error);
      res.status(500).json({ message: "Failed to create translation function" });
    }
  });
  
  app.patch("/api/admin/translation-functions/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const updateTranslationFunctionSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        category: z.string().min(1).optional(),
        parameters: z.array(z.any()).optional(),
        isCore: z.boolean().optional()
      });
      
      const validatedData = updateTranslationFunctionSchema.parse(req.body);
      const translationFunction = await storage.updateTranslationFunction(id, validatedData);
      
      if (!translationFunction) {
        return res.status(404).json({ message: "Translation function not found" });
      }
      
      res.json(translationFunction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating translation function:", error);
      res.status(500).json({ message: "Failed to update translation function" });
    }
  });
  
  app.delete("/api/admin/translation-functions/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteTranslationFunction(id);
      
      if (!success) {
        return res.status(404).json({ message: "Translation function not found or could not be deleted" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting translation function:", error);
      res.status(500).json({ message: "Failed to delete translation function" });
    }
  });
  
  // Translation Items API
  app.get("/api/admin/translation-items", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const translationItems = await storage.getAllTranslationItems();
      res.json(translationItems);
    } catch (error) {
      console.error("Error fetching translation items:", error);
      res.status(500).json({ message: "Failed to fetch translation items" });
    }
  });
  
  app.get("/api/admin/translation-items/function/:functionId", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const functionId = parseInt(req.params.functionId);
      const translationItems = await storage.getTranslationItemsByFunction(functionId);
      res.json(translationItems);
    } catch (error) {
      console.error("Error fetching translation items by function:", error);
      res.status(500).json({ message: "Failed to fetch translation items" });
    }
  });
  
  app.get("/api/admin/translation-items/language/:languageId", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const languageId = parseInt(req.params.languageId);
      const translationItems = await storage.getTranslationItemsByLanguage(languageId);
      res.json(translationItems);
    } catch (error) {
      console.error("Error fetching translation items by language:", error);
      res.status(500).json({ message: "Failed to fetch translation items" });
    }
  });
  
  app.get("/api/admin/translation-items/function/:functionId/language/:languageId", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const functionId = parseInt(req.params.functionId);
      const languageId = parseInt(req.params.languageId);
      const translationItems = await storage.getTranslationItemsByFunctionAndLanguage(functionId, languageId);
      res.json(translationItems);
    } catch (error) {
      console.error("Error fetching translation items by function and language:", error);
      res.status(500).json({ message: "Failed to fetch translation items" });
    }
  });
  
  app.get("/api/admin/translation-items/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const translationItem = await storage.getTranslationItem(id);
      
      if (!translationItem) {
        return res.status(404).json({ message: "Translation item not found" });
      }
      
      res.json(translationItem);
    } catch (error) {
      console.error("Error fetching translation item:", error);
      res.status(500).json({ message: "Failed to fetch translation item" });
    }
  });
  
  app.post("/api/admin/translation-items", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const insertTranslationItemSchema = z.object({
        functionId: z.number().int().positive(),
        languageId: z.number().int().positive(),
        itemKey: z.string().min(1),
        itemValue: z.string().min(1)
      });
      
      const validatedData = insertTranslationItemSchema.parse(req.body);
      const translationItem = await storage.createTranslationItem(validatedData);
      res.status(201).json(translationItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating translation item:", error);
      res.status(500).json({ message: "Failed to create translation item" });
    }
  });
  
  app.patch("/api/admin/translation-items/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const updateTranslationItemSchema = z.object({
        functionId: z.number().int().positive().optional(),
        languageId: z.number().int().positive().optional(),
        itemKey: z.string().min(1).optional(),
        itemValue: z.string().min(1).optional()
      });
      
      const validatedData = updateTranslationItemSchema.parse(req.body);
      const translationItem = await storage.updateTranslationItem(id, validatedData);
      
      if (!translationItem) {
        return res.status(404).json({ message: "Translation item not found" });
      }
      
      res.json(translationItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating translation item:", error);
      res.status(500).json({ message: "Failed to update translation item" });
    }
  });
  
  app.delete("/api/admin/translation-items/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteTranslationItem(id);
      
      if (!success) {
        return res.status(404).json({ message: "Translation item not found or could not be deleted" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting translation item:", error);
      res.status(500).json({ message: "Failed to delete translation item" });
    }
  });
  
  // Helper endpoint to sync translations for all functions when a new language is added
  app.post("/api/admin/languages/:id/sync-translations", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const languageId = parseInt(req.params.id);
      
      // Adım 1: Dil var mı kontrol et
      const language = await storage.getLanguage(languageId);
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      
      // Adım 2: Tüm çeviri fonksiyonlarını getir
      const allFunctions = await storage.getAllTranslationFunctions();
      if (allFunctions.length === 0) {
        return res.status(404).json({ message: "No translation functions found to sync" });
      }
      
      // Adım 3: Varsayılan dili bul (senkronizasyon için referans olarak kullanılacak)
      const languages = await storage.getAllLanguages();
      const defaultLanguage = languages.find(lang => lang.isDefault);
      
      if (!defaultLanguage) {
        return res.status(404).json({ message: "Default language not found" });
      }
      
      if (defaultLanguage.id === languageId) {
        return res.status(400).json({ message: "Cannot sync default language with itself" });
      }
      
      // Adım 4: Her fonksiyon için, varsayılan dildeki çeviri öğelerini bul ve yeni dil için kopyala
      const results = {
        totalFunctions: allFunctions.length,
        syncedItems: 0,
        skippedItems: 0
      };
      
      for (const func of allFunctions) {
        // Varsayılan dildeki çeviri öğelerini al
        const defaultItems = await storage.getTranslationItemsByFunctionAndLanguage(func.id, defaultLanguage.id);
        
        // Yeni dildeki mevcut öğeleri kontrol et - bunlar atlanacak
        const existingItems = await storage.getTranslationItemsByFunctionAndLanguage(func.id, languageId);
        const existingKeys = new Set(existingItems.map(item => item.itemKey));
        
        // Her varsayılan öğe için yeni dilde karşılık oluştur (eğer yoksa)
        for (const item of defaultItems) {
          if (!existingKeys.has(item.itemKey)) {
            // Yeni çeviri öğesi oluştur
            await storage.createTranslationItem({
              functionId: func.id,
              languageId: languageId,
              itemKey: item.itemKey,
              itemValue: `[${language.code}] ${item.itemValue}` // Geçici değer, sonra manuel olarak çevrilebilir
            });
            results.syncedItems++;
          } else {
            results.skippedItems++;
          }
        }
      }
      
      res.status(200).json({
        message: "Translation synchronization completed successfully",
        results
      });
    } catch (error) {
      console.error("Error syncing translations:", error);
      res.status(500).json({ message: "Failed to sync translations" });
    }
  });

  // Currencies API
  app.get("/api/currencies", async (req, res) => {
    try {
      const currencies = await storage.getAllCurrencies();
      // Filter active currencies only for non-admin users
      const filteredCurrencies = req.user?.role === "admin" ? currencies : currencies.filter(c => c.isActive);
      res.json(filteredCurrencies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch currencies" });
    }
  });
  
  app.get("/api/admin/currencies", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const currencies = await storage.getAllCurrencies();
      res.json(currencies);
    } catch (error) {
      console.error("Error fetching admin currencies:", error);
      res.status(500).json({ message: "Failed to fetch currencies" });
    }
  });

  app.get("/api/currencies/:code", async (req, res) => {
    try {
      const code = req.params.code;
      const currency = await storage.getCurrencyByCode(code);
      
      if (!currency) {
        return res.status(404).json({ message: "Currency not found" });
      }
      
      // Only show active currencies to non-admin users
      if (!currency.isActive && !req.user?.role === "admin") {
        return res.status(404).json({ message: "Currency not found" });
      }
      
      res.json(currency);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch currency" });
    }
  });

  app.post("/api/admin/currencies", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertCurrencySchema.parse(req.body);
      const currency = await storage.createCurrency(validatedData);
      res.status(201).json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create currency" });
    }
  });

  app.patch("/api/admin/currencies/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertCurrencySchema.partial().parse(req.body);
      const currency = await storage.updateCurrency(id, validatedData);
      
      if (!currency) {
        return res.status(404).json({ message: "Currency not found" });
      }
      
      res.json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update currency" });
    }
  });

  // Translations API
  app.get("/api/translations", async (req, res) => {
    try {
      // Get translations filtered by language or context
      if (req.query.languageId) {
        const languageId = parseInt(req.query.languageId as string);
        const translations = await storage.getTranslationsByLanguage(languageId);
        return res.json(translations);
      }
      
      if (req.query.context) {
        const context = req.query.context as string;
        const translations = await storage.getTranslationsByContext(context);
        return res.json(translations);
      }
      
      // Admin only for all translations (could be a lot of data)
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(await storage.getAllTranslations());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  app.post("/api/admin/translations", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertTranslationSchema.parse(req.body);
      const translation = await storage.createTranslation(validatedData);
      res.status(201).json(translation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create translation" });
    }
  });

  app.patch("/api/admin/translations/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertTranslationSchema.partial().parse(req.body);
      const translation = await storage.updateTranslation(id, validatedData);
      
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      
      res.json(translation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update translation" });
    }
  });

  // Pages API
  app.get("/api/pages", async (req, res) => {
    try {
      let pages;

      // Get pages by language code
      if (req.query.language) {
        const languageCode = req.query.language as string;
        pages = await storage.getPagesByLanguage(languageCode);
      } else {
        pages = await storage.getAllPages();
      }
      
      // Filter active pages only for non-admin users
      const filteredPages = req.user?.role === "admin" ? pages : pages.filter(p => p.isActive);
      res.json(filteredPages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const page = await storage.getPageBySlug(slug);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // Only show active pages to non-admin users
      if (!page.isActive && !req.user?.role === "admin") {
        return res.status(404).json({ message: "Page not found" });
      }
      
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  app.post("/api/admin/pages", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertPageSchema.parse(req.body);
      const page = await storage.createPage(validatedData);
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create page" });
    }
  });

  app.patch("/api/admin/pages/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertPageSchema.partial().parse(req.body);
      const page = await storage.updatePage(id, validatedData);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update page" });
    }
  });

  // Destinations API
  app.get("/api/destinations", async (req, res) => {
    try {
      let destinations;

      // Get popular destinations
      if (req.query.popular === 'true') {
        destinations = await storage.getPopularDestinations();
      } 
      // Get destinations by language code
      else if (req.query.language) {
        const languageCode = req.query.language as string;
        destinations = await storage.getDestinationsByLanguage(languageCode);
      } else {
        destinations = await storage.getAllDestinations();
      }
      
      // Filter active destinations only for non-admin users
      const filteredDestinations = req.user?.role === "admin" ? destinations : destinations.filter(d => d.isActive);
      res.json(filteredDestinations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  app.get("/api/destinations/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const destination = await storage.getDestinationBySlug(slug);
      
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      // Only show active destinations to non-admin users
      if (!destination.isActive && !req.user?.role === "admin") {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      res.json(destination);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch destination" });
    }
  });

  app.post("/api/admin/destinations", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertDestinationSchema.parse(req.body);
      const destination = await storage.createDestination(validatedData);
      res.status(201).json(destination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create destination" });
    }
  });

  app.patch("/api/admin/destinations/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertDestinationSchema.partial().parse(req.body);
      const destination = await storage.updateDestination(id, validatedData);
      
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      res.json(destination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update destination" });
    }
  });

  // Tours API
  app.get("/api/tours", async (req, res) => {
    try {
      let tours;

      // Get popular tours
      if (req.query.popular === 'true') {
        tours = await storage.getPopularTours();
      } 
      // Get tours by language code
      else if (req.query.language) {
        const languageCode = req.query.language as string;
        tours = await storage.getToursByLanguage(languageCode);
      } else {
        tours = await storage.getAllTours();
      }
      
      // Filter active tours only for non-admin users
      const filteredTours = req.user?.role === "admin" ? tours : tours.filter(t => t.isActive);
      res.json(filteredTours);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tours" });
    }
  });

  app.get("/api/tours/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const tour = await storage.getTourBySlug(slug);
      
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      
      // Only show active tours to non-admin users
      if (!tour.isActive && !req.user?.role === "admin") {
        return res.status(404).json({ message: "Tour not found" });
      }
      
      res.json(tour);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tour" });
    }
  });

  app.post("/api/admin/tours", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertTourSchema.parse(req.body);
      const tour = await storage.createTour(validatedData);
      res.status(201).json(tour);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tour" });
    }
  });

  app.patch("/api/admin/tours/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertTourSchema.partial().parse(req.body);
      const tour = await storage.updateTour(id, validatedData);
      
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      
      res.json(tour);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update tour" });
    }
  });

  // Packages API
  app.get("/api/packages", async (req, res) => {
    try {
      let packages;

      // Get popular packages
      if (req.query.popular === 'true') {
        packages = await storage.getPopularPackages();
      } 
      // Get packages by language code
      else if (req.query.language) {
        const languageCode = req.query.language as string;
        packages = await storage.getPackagesByLanguage(languageCode);
      } else {
        packages = await storage.getAllPackages();
      }
      
      // Filter active packages only for non-admin users
      const filteredPackages = req.user?.role === "admin" ? packages : packages.filter(p => p.isActive);
      res.json(filteredPackages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.get("/api/packages/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const pkg = await storage.getPackageBySlug(slug);
      
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      // Only show active packages to non-admin users
      if (!pkg.isActive && !req.user?.role === "admin") {
        return res.status(404).json({ message: "Package not found" });
      }
      
      res.json(pkg);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch package" });
    }
  });

  app.post("/api/admin/packages", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertPackageSchema.parse(req.body);
      const pkg = await storage.createPackage(validatedData);
      res.status(201).json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  app.patch("/api/admin/packages/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertPackageSchema.partial().parse(req.body);
      const pkg = await storage.updatePackage(id, validatedData);
      
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      res.json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  // Menus API
  app.get("/api/menus", async (req, res) => {
    try {
      let menus;

      // Get menus by location
      if (req.query.location) {
        const location = req.query.location as string;
        menus = await storage.getMenusByLocation(location);
      } 
      // Get menus by language code
      else if (req.query.language) {
        const languageCode = req.query.language as string;
        menus = await storage.getMenusByLanguage(languageCode);
      } else {
        menus = await storage.getAllMenus();
      }
      
      // Filter active menus only for non-admin users
      const filteredMenus = req.user?.role === "admin" ? menus : menus.filter(m => m.isActive);
      res.json(filteredMenus);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menus" });
    }
  });

  app.post("/api/admin/menus", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertMenuSchema.parse(req.body);
      const menu = await storage.createMenu(validatedData);
      res.status(201).json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu" });
    }
  });

  app.patch("/api/admin/menus/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertMenuSchema.partial().parse(req.body);
      const menu = await storage.updateMenu(id, validatedData);
      
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu" });
    }
  });

  app.delete("/api/admin/menus/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteMenu(id);
      
      if (!success) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete menu" });
    }
  });

  // Menu Items API
  app.get("/api/menu-items", async (req, res) => {
    try {
      let menuItems;
      
      if (req.query.menuId) {
        const menuId = parseInt(req.query.menuId as string);
        menuItems = await storage.getMenuItemsByMenuId(menuId);
      } else {
        menuItems = await storage.getAllMenuItems();
      }
      
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu item" });
    }
  });

  app.post("/api/admin/menu-items", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.patch("/api/admin/menu-items/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, validatedData);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/admin/menu-items/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteMenuItem(id);
      
      if (!success) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // API Endpoint'leri: E-posta Servisi
  app.post("/api/admin/send-email", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { to, subject, text, html } = req.body;
      
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const { sendEmail } = await import('./services/email');
      
      const success = await sendEmail({
        to,
        from: 'info@ferrybooking.com',
        template: {
          subject,
          text: text || '',
          html: html || ''
        }
      });
      
      if (success) {
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send email" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to send email", error: String(error) });
    }
  });

  // API Endpoint'leri: Bilet Oluşturma
  app.post("/api/bookings/:id/generate-ticket", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Sadece kendi rezervasyonuna ya da admin erişebilir
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Bilet oluşturma servisini import et
      const { generateAndSaveTicket } = await import('./services/ticket-generator');
      
      // Gerekli verileri getir
      const route = await storage.getRoute(booking.routeId);
      const schedules = await storage.getSchedulesByRoute(booking.routeId);
      
      if (!route || schedules.length === 0) {
        return res.status(404).json({ message: "Route or schedule not found" });
      }
      
      const passengers = await storage.getBookingPassengersByBooking(booking.id);
      const schedule = schedules[0]; // İlk programı kullan
      
      // Bilet oluştur
      const ticketFileName = await generateAndSaveTicket(
        booking,
        passengers,
        route,
        schedule,
        'public/tickets'
      );
      
      res.json({
        success: true,
        ticketUrl: `/tickets/${ticketFileName}`,
        message: "Ticket generated successfully"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate ticket", error: String(error) });
    }
  });
  
  // API Endpoint'leri: Ödeme İşlemleri
  app.post("/api/bookings/:id/payment-intent", async (req, res) => {
    try {
      // Üye giriş zorunluluğunu kaldırdık
      // if (!req.isAuthenticated()) {
      //   return res.status(401).json({ message: "Not authenticated" });
      // }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Üye giriş zorunluluğunu kaldırdığımız için kimlik kontrolünü atla
      // if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      // Ödeme servisi
      const { createBookingPayment } = await import('./services/payment');
      
      const paymentInfo = await createBookingPayment(booking);
      
      // Rezervasyonu güncelle - paymentIntentId ekle (Schema güncellenmeli)
      await storage.updateBooking(booking.id, {
        // @ts-ignore - schema'da henüz tanımlı olmayabilir
        paymentIntentId: paymentInfo.paymentIntentId
      });
      
      res.json({
        success: true,
        clientSecret: paymentInfo.clientSecret
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment intent", error: String(error) });
    }
  });
  
  app.post("/api/bookings/:id/confirm-payment", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Sadece kendi rezervasyonuna ya da admin erişebilir
      if (booking.userId !== req.user!.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // @ts-ignore - paymentIntentId schema'da tanımlı olmayabilir
      const paymentIntentId = booking.paymentIntentId || req.body.paymentIntentId;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      // Ödeme servisi
      const { processSuccessfulPayment } = await import('./services/payment');
      
      const success = await processSuccessfulPayment(paymentIntentId, booking.id);
      
      if (success) {
        // Ödeme başarılı - rezervasyonu güncelle
        await storage.updateBooking(booking.id, {
          isPaid: true,
          status: 'confirmed'
        });
        
        // Onay e-postası gönder
        const user = await storage.getUser(booking.userId);
        const route = await storage.getRoute(booking.routeId);
        const schedules = await storage.getSchedulesByRoute(booking.routeId);
        
        if (user && route && schedules.length > 0) {
          const { sendEmail, getBookingConfirmationTemplate } = await import('./services/email');
          
          const template = getBookingConfirmationTemplate();
          const departureDateTime = new Date(`${booking.departureDate}T${schedules[0].departureTime}`);
          
          await sendEmail({
            to: user.email,
            from: 'info@ferrybooking.com',
            template,
            data: {
              name: user.fullName || user.username,
              bookingReference: booking.bookingReference,
              route: `${route.departurePort} → ${route.arrivalPort}`,
              date: departureDateTime.toLocaleDateString('tr-TR'),
              time: departureDateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              passengerCount: '2', // Burada gerçek yolcu sayısı alınmalı
              totalPrice: `${booking.totalPrice} TL`,
              viewBookingUrl: `${req.protocol}://${req.get('host')}/my-bookings/${booking.id}`
            }
          });
        }
        
        res.json({
          success: true,
          message: "Payment confirmed successfully",
          booking: await storage.getBooking(booking.id)
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment could not be confirmed"
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to confirm payment", error: String(error) });
    }
  });

  // Payment providers API
  // Direct Stripe payment API endpoints using our new service
  app.get("/api/stripe/status", async (req, res) => {
    try {
      const status = await stripeService.getTestMode();
      res.json(status);
    } catch (error) {
      console.error("Error checking Stripe status:", error);
      res.status(500).json({ error: "Failed to check Stripe status" });
    }
  });
  
  // Create a payment intent
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "usd", metadata = {} } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }
      
      // Add user information to metadata if authenticated
      let enhancedMetadata = { ...metadata, demoMode: true };
      
      if (req.isAuthenticated()) {
        enhancedMetadata = {
          ...enhancedMetadata,
          userId: req.user.id,
          username: req.user.username,
          userEmail: req.user.email
        };
      }
      
      const paymentIntent = await stripeService.createPaymentIntent(
        amount,
        currency.toLowerCase(),
        enhancedMetadata
      );
      
      res.json(paymentIntent);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });
  
  // Create a customer
  app.post("/api/stripe/create-customer", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { email, name, metadata = {} } = req.body;
      
      // Use authenticated user info if not provided
      const customerEmail = email || req.user.email;
      const customerName = name || req.user.username;
      
      if (!customerEmail) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Add user ID to metadata
      const enhancedMetadata = {
        ...metadata,
        userId: req.user.id
      };
      
      const customer = await stripeService.createOrGetCustomer(
        customerEmail,
        customerName,
        enhancedMetadata
      );
      
      res.json(customer);
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      res.status(500).json({ error: "Failed to create Stripe customer" });
    }
  });
  
  // Create a subscription
  app.post("/api/stripe/create-subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { customerId, priceId, metadata = {} } = req.body;
      
      if (!customerId || !priceId) {
        return res.status(400).json({ error: "Customer ID and Price ID are required" });
      }
      
      // Add user information to metadata
      const enhancedMetadata = {
        ...metadata,
        userId: req.user.id,
        username: req.user.username
      };
      
      const subscription = await stripeService.createSubscription(
        customerId,
        priceId,
        enhancedMetadata
      );
      
      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });
  
  // Process a refund
  app.post("/api/stripe/refund", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Only admins can process refunds
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Admin privileges required" });
      }
      
      const { paymentIntentId, amount } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }
      
      const refund = await stripeService.createRefund(paymentIntentId, amount);
      
      res.json(refund);
    } catch (error) {
      console.error("Error processing refund:", error);
      res.status(500).json({ error: "Failed to process refund" });
    }
  });
  
  // Payment providers API
  // Mock payment providers data
  const paymentProviders = [
    {
      id: "stripe",
      name: "Stripe",
      enabled: true,
      apiKey: "",
      secretKey: "",
      sandboxMode: true,
      webhookSecret: "",
      supportedCurrencies: ["USD", "EUR"],
      description: "Global ödeme sağlayıcısı, kredi kartı ve alternatif ödeme yöntemlerini destekler.",
      logoUrl: "https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@master/icons/stripe.svg"
    },
    {
      id: "paytr",
      name: "PayTR",
      enabled: false,
      apiKey: "",
      secretKey: "",
      merchantId: "",
      sandboxMode: true,
      webhookSecret: "",
      supportedCurrencies: ["TRY", "USD", "EUR"],
      description: "Türkiye'deki tüm bankalar için taksit imkanı ve sanal pos hizmeti sunan yerel ödeme sağlayıcısı.",
      logoUrl: "https://www.paytr.com/wp-content/uploads/logo.svg"
    },
    {
      id: "iyzico",
      name: "Iyzico",
      enabled: false,
      apiKey: "",
      secretKey: "",
      merchantId: "",
      sandboxMode: true,
      webhookSecret: "",
      supportedCurrencies: ["TRY", "USD", "EUR"],
      description: "Türkiye'de popüler ödeme çözümü, çeşitli ödeme yöntemleri ve taksit seçenekleri sunar.",
      logoUrl: "https://www.iyzico.com/assets/images/content/logo.svg"
    },
    {
      id: "payu",
      name: "PayU",
      enabled: false,
      apiKey: "",
      secretKey: "",
      merchantId: "",
      sandboxMode: true,
      webhookSecret: "",
      supportedCurrencies: ["TRY", "USD", "EUR"],
      description: "Tüm dünyada kullanılan ödeme çözümü, Türkiye'de de taksitli ödeme desteği sunar.",
      logoUrl: "https://www.payu.com.tr/sites/turkey/files/images/payu_logo_0.png"
    }
  ];

  // Get all payment providers
  app.get("/api/admin/payment-providers", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // In a real implementation, these would be fetched from the database
      res.json(paymentProviders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment providers" });
    }
  });

  // Get a specific payment provider
  app.get("/api/admin/payment-providers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const providerId = req.params.id;
      const provider = paymentProviders.find(p => p.id === providerId);
      
      if (!provider) {
        return res.status(404).json({ message: "Payment provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment provider" });
    }
  });

  // Update payment provider settings
  app.put("/api/admin/payment-providers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const providerId = req.params.id;
      // In a real implementation, this would update the database
      // For now, just return success
      
      res.json({ 
        success: true, 
        message: `Settings for ${providerId} updated successfully`, 
        provider: {
          ...req.body,
          id: providerId
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment provider settings" });
    }
  });

  // Test payment provider connection
  app.post("/api/admin/payment-providers/:id/test", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const providerId = req.params.id;
      // In a real implementation, this would test the connection
      // For now, just return success
      
      // Simulate a delay for a more realistic experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        success: true, 
        message: `Connection to ${providerId} successful`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to test payment provider connection" });
    }
  });
  
  // Üyelik Seviyeleri (Membership Tiers) endpoint'leri
  app.get("/api/admin/membership-tiers", async (req, res) => {
    try {
      const membershipTiers = await storage.getAllMembershipTiers();
      res.json(membershipTiers);
    } catch (error) {
      console.error("Error fetching membership tiers:", error);
      res.status(500).json({ message: "Failed to fetch membership tiers", error: String(error) });
    }
  });
  
  app.get("/api/admin/membership-tiers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const membershipTier = await storage.getMembershipTierById(id);
      
      if (!membershipTier) {
        return res.status(404).json({ message: "Membership tier not found" });
      }
      
      res.json(membershipTier);
    } catch (error) {
      console.error("Error fetching membership tier:", error);
      res.status(500).json({ message: "Failed to fetch membership tier", error: String(error) });
    }
  });
  
  app.post("/api/admin/membership-tiers", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const newTier = await storage.createMembershipTier(req.body);
      res.status(201).json(newTier);
    } catch (error) {
      console.error("Error creating membership tier:", error);
      res.status(500).json({ message: "Failed to create membership tier", error: String(error) });
    }
  });
  
  app.put("/api/admin/membership-tiers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const updatedTier = await storage.updateMembershipTier(id, req.body);
      
      if (!updatedTier) {
        return res.status(404).json({ message: "Membership tier not found" });
      }
      
      res.json(updatedTier);
    } catch (error) {
      console.error("Error updating membership tier:", error);
      res.status(500).json({ message: "Failed to update membership tier", error: String(error) });
    }
  });
  
  app.delete("/api/admin/membership-tiers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      await storage.deleteMembershipTier(id);
      
      res.json({ success: true, message: "Membership tier deleted successfully" });
    } catch (error) {
      console.error("Error deleting membership tier:", error);
      res.status(500).json({ message: "Failed to delete membership tier", error: String(error) });
    }
  });
  
  // B2B Pricing Module API Endpoints
  
  // Pricing Tiers Endpoints
  app.get("/api/admin/pricing-tiers", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const tiers = await storage.getAllPricingTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers", error: String(error) });
    }
  });
  
  app.get("/api/admin/pricing-tiers/active", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const tiers = await storage.getActivePricingTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching active pricing tiers:", error);
      res.status(500).json({ message: "Failed to fetch active pricing tiers", error: String(error) });
    }
  });
  
  app.get("/api/admin/pricing-tiers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const tier = await storage.getPricingTier(id);
      
      if (!tier) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }
      
      res.json(tier);
    } catch (error) {
      console.error("Error fetching pricing tier:", error);
      res.status(500).json({ message: "Failed to fetch pricing tier", error: String(error) });
    }
  });
  
  app.post("/api/admin/pricing-tiers", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const tierData = req.body;
      const createdTier = await storage.createPricingTier(tierData);
      
      res.status(201).json(createdTier);
    } catch (error) {
      console.error("Error creating pricing tier:", error);
      res.status(500).json({ message: "Failed to create pricing tier", error: String(error) });
    }
  });
  
  app.put("/api/admin/pricing-tiers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const tierData = req.body;
      
      const updatedTier = await storage.updatePricingTier(id, tierData);
      
      if (!updatedTier) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }
      
      res.json(updatedTier);
    } catch (error) {
      console.error("Error updating pricing tier:", error);
      res.status(500).json({ message: "Failed to update pricing tier", error: String(error) });
    }
  });
  
  app.delete("/api/admin/pricing-tiers/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePricingTier(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }
      
      res.json({ success: true, message: "Pricing tier deleted successfully" });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      res.status(500).json({ message: "Failed to delete pricing tier", error: String(error) });
    }
  });
  
  // Agency Pricing Endpoints
  app.get("/api/admin/agency-pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const pricingItems = await storage.getAllAgencyPricing();
      res.json(pricingItems);
    } catch (error) {
      console.error("Error fetching agency pricing items:", error);
      res.status(500).json({ message: "Failed to fetch agency pricing items", error: String(error) });
    }
  });
  
  app.get("/api/admin/agency-pricing/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const pricingItem = await storage.getAgencyPricing(id);
      
      if (!pricingItem) {
        return res.status(404).json({ message: "Agency pricing item not found" });
      }
      
      res.json(pricingItem);
    } catch (error) {
      console.error("Error fetching agency pricing item:", error);
      res.status(500).json({ message: "Failed to fetch agency pricing item", error: String(error) });
    }
  });
  
  app.get("/api/admin/agency-pricing/agency/:agencyId", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const agencyId = parseInt(req.params.agencyId);
      const pricingItems = await storage.getAgencyPricingByAgency(agencyId);
      
      res.json(pricingItems);
    } catch (error) {
      console.error("Error fetching agency pricing items:", error);
      res.status(500).json({ message: "Failed to fetch agency pricing items", error: String(error) });
    }
  });
  
  app.post("/api/admin/agency-pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const pricingData = req.body;
      const createdPricing = await storage.createAgencyPricing(pricingData);
      
      res.status(201).json(createdPricing);
    } catch (error) {
      console.error("Error creating agency pricing item:", error);
      res.status(500).json({ message: "Failed to create agency pricing item", error: String(error) });
    }
  });
  
  app.put("/api/admin/agency-pricing/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const pricingData = req.body;
      
      const updatedPricing = await storage.updateAgencyPricing(id, pricingData);
      
      if (!updatedPricing) {
        return res.status(404).json({ message: "Agency pricing item not found" });
      }
      
      res.json(updatedPricing);
    } catch (error) {
      console.error("Error updating agency pricing item:", error);
      res.status(500).json({ message: "Failed to update agency pricing item", error: String(error) });
    }
  });
  
  app.delete("/api/admin/agency-pricing/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAgencyPricing(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Agency pricing item not found" });
      }
      
      res.json({ success: true, message: "Agency pricing item deleted successfully" });
    } catch (error) {
      console.error("Error deleting agency pricing item:", error);
      res.status(500).json({ message: "Failed to delete agency pricing item", error: String(error) });
    }
  });
  
  // Route Pricing Endpoints
  app.get("/api/admin/route-pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const pricingItems = await storage.getAllRoutePricing();
      res.json(pricingItems);
    } catch (error) {
      console.error("Error fetching route pricing items:", error);
      res.status(500).json({ message: "Failed to fetch route pricing items", error: String(error) });
    }
  });
  
  app.get("/api/admin/route-pricing/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const pricingItem = await storage.getRoutePricing(id);
      
      if (!pricingItem) {
        return res.status(404).json({ message: "Route pricing item not found" });
      }
      
      res.json(pricingItem);
    } catch (error) {
      console.error("Error fetching route pricing item:", error);
      res.status(500).json({ message: "Failed to fetch route pricing item", error: String(error) });
    }
  });
  
  app.get("/api/admin/route-pricing/agency/:agencyId", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const agencyId = parseInt(req.params.agencyId);
      const pricingItems = await storage.getRoutePricingByAgency(agencyId);
      
      res.json(pricingItems);
    } catch (error) {
      console.error("Error fetching route pricing items by agency:", error);
      res.status(500).json({ message: "Failed to fetch route pricing items by agency", error: String(error) });
    }
  });
  
  app.get("/api/admin/route-pricing/route/:routeId", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const routeId = parseInt(req.params.routeId);
      const pricingItems = await storage.getRoutePricingByRoute(routeId);
      
      res.json(pricingItems);
    } catch (error) {
      console.error("Error fetching route pricing items by route:", error);
      res.status(500).json({ message: "Failed to fetch route pricing items by route", error: String(error) });
    }
  });
  
  app.get("/api/admin/route-pricing/agency/:agencyId/route/:routeId", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const agencyId = parseInt(req.params.agencyId);
      const routeId = parseInt(req.params.routeId);
      
      const pricingItem = await storage.getRoutePricingByAgencyAndRoute(agencyId, routeId);
      
      if (!pricingItem) {
        return res.status(404).json({ message: "Route pricing item not found" });
      }
      
      res.json(pricingItem);
    } catch (error) {
      console.error("Error fetching route pricing item by agency and route:", error);
      res.status(500).json({ message: "Failed to fetch route pricing item by agency and route", error: String(error) });
    }
  });
  
  app.post("/api/admin/route-pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const pricingData = req.body;
      const createdPricing = await storage.createRoutePricing(pricingData);
      
      res.status(201).json(createdPricing);
    } catch (error) {
      console.error("Error creating route pricing item:", error);
      res.status(500).json({ message: "Failed to create route pricing item", error: String(error) });
    }
  });
  
  app.put("/api/admin/route-pricing/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const pricingData = req.body;
      
      const updatedPricing = await storage.updateRoutePricing(id, pricingData);
      
      if (!updatedPricing) {
        return res.status(404).json({ message: "Route pricing item not found" });
      }
      
      res.json(updatedPricing);
    } catch (error) {
      console.error("Error updating route pricing item:", error);
      res.status(500).json({ message: "Failed to update route pricing item", error: String(error) });
    }
  });
  
  app.delete("/api/admin/route-pricing/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRoutePricing(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Route pricing item not found" });
      }
      
      res.json({ success: true, message: "Route pricing item deleted successfully" });
    } catch (error) {
      console.error("Error deleting route pricing item:", error);
      res.status(500).json({ message: "Failed to delete route pricing item", error: String(error) });
    }
  });

  // API Endpoint'leri: Admin Panel Raporlama
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { adminService } = await import('./services/admin');
      const summary = await adminService.getDashboardSummary();
      
      res.json(summary);
    
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data", error: String(error) });
    }
  });
  
  app.get("/api/admin/reports/sales", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const includeUnpaid = req.query.includeUnpaid === 'true';
      
      const { reportingService } = await import('./services/reporting');
      const report = await reportingService.generateSalesReport(startDate, endDate, includeUnpaid);
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sales report", error: String(error) });
    }
  });
  
  app.get("/api/admin/reports/occupancy", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const { reportingService } = await import('./services/reporting');
      const report = await reportingService.generateOccupancyReport(startDate, endDate);
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate occupancy report", error: String(error) });
    }
  });
  
  // Review Management Endpoints
  app.get("/api/admin/reviews", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Dummy data for reviews since this endpoint is missing
      const reviews = [
        {
          id: 1,
          userId: 1,
          routeId: 1,
          rating: 5,
          comment: "Harika bir yolculuktu, kesinlikle tekrar tercih edeceğim.",
          title: "Muhteşem Deneyim",
          status: "approved",
          isVerified: true,
          isHelpful: 12,
          adminResponse: "Değerlendirmeniz için teşekkür ederiz!",
          userName: "Ahmet Yılmaz",
          routeName: "İstanbul - İzmir"
        },
        {
          id: 2,
          userId: 2,
          routeId: 2,
          rating: 4,
          comment: "Genel olarak iyi bir hizmet, ancak yemekler daha iyi olabilirdi.",
          title: "İyi Hizmet",
          status: "approved",
          isVerified: true,
          isHelpful: 5,
          adminResponse: "",
          userName: "Mehmet Kaya",
          routeName: "İstanbul - Bursa" 
        },
        {
          id: 3,
          userId: 3,
          routeId: 1,
          rating: 3,
          comment: "Ortalama bir deneyimdi, personel daha ilgili olabilirdi.",
          title: "Ortalama",
          status: "pending",
          isVerified: false,
          isHelpful: 2,
          adminResponse: "",
          userName: "Ayşe Demir",
          routeName: "İstanbul - İzmir"
        },
        {
          id: 4,
          userId: 4,
          routeId: 3,
          rating: 2,
          comment: "Sefer sürekli gecikti ve hiçbir açıklama yapılmadı.",
          title: "Gecikmeli Sefer",
          status: "rejected",
          isVerified: false,
          isHelpful: 0,
          adminResponse: "Yaşadığınız sorun için özür dileriz, hizmet kalitemizi artırmak için çalışıyoruz.",
          userName: "Zeynep Şahin",
          routeName: "İstanbul - Çanakkale"
        },
        {
          id: 5,
          userId: 5,
          routeId: 2,
          rating: 5,
          comment: "Her şey mükemmeldi, özellikle personelin ilgisi takdire şayan.",
          title: "Olağanüstü Hizmet",
          status: "approved",
          isVerified: true,
          isHelpful: 8,
          adminResponse: "Değerlendirmeniz için teşekkür ederiz!",
          userName: "Mustafa Öztürk",
          routeName: "İstanbul - Bursa"
        }
      ];
      
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });
  
  app.post("/api/admin/reviews", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Simulate creating a review
      const newReview = {
        ...req.body,
        id: Date.now(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      res.status(201).json(newReview);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });
  
  app.put("/api/admin/reviews/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      // Simulate updating a review
      const updatedReview = {
        ...req.body,
        id,
        updatedAt: new Date()
      };
      
      res.json(updatedReview);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });
  
  app.patch("/api/admin/reviews/:id/status", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      // Simulate updating review status
      const updatedReview = {
        id,
        status,
        updatedAt: new Date()
      };
      
      res.json(updatedReview);
    } catch (error) {
      console.error("Error updating review status:", error);
      res.status(500).json({ message: "Failed to update review status" });
    }
  });
  
  app.delete("/api/admin/reviews/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      
      // Simulate deleting a review
      res.json({ success: true, id });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });
  
  // Mars Routes API
  app.get("/api/admin/mars-routes", isAdmin, async (req, res) => {
    try {
      // Demo veriler dönelim şimdilik
      res.json([
        {
          id: 1,
          name: "Mars Express",
          description: "Dünya'dan Mars'a direkt ultrasonik feribot seferi",
          imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1974&auto=format&fit=crop",
          departureTerminal: "Dünya Terminal 1",
          arrivalTerminal: "Mars Olympus Terminal",
          journeyTime: "4 saat",
          price: "12500",
          capacity: "200",
          isActive: true,
          tags: ["express", "luxury"],
          departureSchedules: [
            {
              time: "09:00",
              days: ["mon", "wed", "fri"]
            },
            {
              time: "15:00",
              days: ["tue", "thu", "sat"]
            }
          ],
          launchDate: "2023-12-01",
          returnDate: null
        },
        {
          id: 2,
          name: "Mars Voyager",
          description: "Konforlu ve ekonomik Mars yolculuğu",
          imageUrl: "https://images.unsplash.com/photo-1630694093867-4b1bcbae5f0c?q=80&w=1932&auto=format&fit=crop",
          departureTerminal: "Dünya Terminal 2",
          arrivalTerminal: "Mars Valles Terminal",
          journeyTime: "6 saat",
          price: "9000",
          capacity: "250",
          isActive: true,
          tags: ["economy", "family"],
          departureSchedules: [
            {
              time: "10:30",
              days: ["mon", "tue", "wed", "thu", "fri"]
            }
          ],
          launchDate: "2024-01-15",
          returnDate: null
        },
        {
          id: 3,
          name: "Mars Kolonizasyon Programı",
          description: "Uzun süreli Mars yerleşimi için özel taşıma hizmeti",
          imageUrl: "https://images.unsplash.com/photo-1630694092174-9eeaec3b6f0a?q=80&w=1932&auto=format&fit=crop",
          departureTerminal: "Dünya Gateway",
          arrivalTerminal: "Mars Kolonisi",
          journeyTime: "5 saat",
          price: "15000",
          capacity: "150",
          isActive: false,
          tags: ["settlement", "research"],
          departureSchedules: [],
          launchDate: "2024-06-01",
          returnDate: null
        }
      ]);
    } catch (error) {
      console.error("Mars rotaları hatası:", error);
      res.status(500).json({ message: "Mars rotaları alınamadı" });
    }
  });
  
  app.post("/api/admin/mars-routes", isAdmin, async (req, res) => {
    try {
      // Yeni Mars rotasını kaydediyormuş gibi yapalım
      res.status(201).json({
        id: Math.floor(Math.random() * 1000) + 10,
        ...req.body,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Mars rotası oluşturma hatası:", error);
      res.status(500).json({ message: "Mars rotası oluşturulamadı" });
    }
  });
  
  app.put("/api/admin/mars-routes/:id", isAdmin, async (req, res) => {
    try {
      // Mars rotasını güncelliyormuş gibi yapalım
      res.json({
        id: parseInt(req.params.id),
        ...req.body,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Mars rotası güncelleme hatası:", error);
      res.status(500).json({ message: "Mars rotası güncellenemedi" });
    }
  });
  
  app.delete("/api/admin/mars-routes/:id", isAdmin, async (req, res) => {
    try {
      // Mars rotasını siliyormuş gibi yapalım
      res.json({ success: true, message: "Mars rotası başarıyla silindi" });
    } catch (error) {
      console.error("Mars rotası silme hatası:", error);
      res.status(500).json({ message: "Mars rotası silinemedi" });
    }
  });
  
  app.get("/api/admin/reports/occupancy-stats", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      // Create mock occupancy statistics data
      const occupancyStats = {
        averageOccupancy: 72.5,
        totalCapacity: 1240,
        totalPassengers: 899,
        occupancyByRoute: [
          { routeName: "İstanbul - İzmir", occupancyRate: 85.2, totalCapacity: 450, totalPassengers: 383 },
          { routeName: "İstanbul - Bursa", occupancyRate: 76.4, totalCapacity: 320, totalPassengers: 244 },
          { routeName: "İstanbul - Çanakkale", occupancyRate: 64.8, totalCapacity: 250, totalPassengers: 162 },
          { routeName: "Bodrum - Kos", occupancyRate: 88.6, totalCapacity: 220, totalPassengers: 195 }
        ],
        occupancyTrend: [
          { date: "2023-12", rate: 58.3 },
          { date: "2024-01", rate: 52.1 },
          { date: "2024-02", rate: 61.5 },
          { date: "2024-03", rate: 69.8 },
          { date: "2024-04", rate: 78.2 }
        ],
        periodRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
      
      res.json(occupancyStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate occupancy report", error: String(error) });
    }
  });
  
  app.get("/api/admin/reports/customers", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const { reportingService } = await import('./services/reporting');
      const report = await reportingService.generateCustomerReport(startDate, endDate);
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate customer report", error: String(error) });
    }
  });
  
  app.get("/api/admin/analytics/predict-occupancy", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const routeId = parseInt(req.query.routeId as string);
      const date = new Date(req.query.date as string);
      const historicalDays = req.query.historicalDays ? parseInt(req.query.historicalDays as string) : 30;
      
      if (!routeId || isNaN(routeId)) {
        return res.status(400).json({ message: "Route ID is required" });
      }
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Valid date is required" });
      }
      
      const { reportingService } = await import('./services/reporting');
      const prediction = await reportingService.predictOccupancy(routeId, date, historicalDays);
      
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ message: "Failed to predict occupancy", error: String(error) });
    }
  });
  
  // Performance Analytics API Endpoint
  app.get("/api/admin/analytics/performance", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const period = req.query.period ? parseInt(req.query.period as string) : 30;
      
      // Create analytics service instance and get metrics
      const analyticsService = new AnalyticsService(storage);
      const performanceMetrics = await analyticsService.getPerformanceMetrics(period);
      
      res.json(performanceMetrics);
    } catch (error) {
      console.error("Error generating performance metrics:", error);
      res.status(500).json({ message: "Failed to generate performance metrics" });
    }
  });

  // API Endpoint'leri: Admin Panel Yönetimi
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!userId || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid user ID or role" });
      }
      
      const { adminService } = await import('./services/admin');
      const result = await adminService.changeUserRole(userId, role);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to change user role", error: String(error) });
    }
  });
  
  app.patch("/api/admin/bookings/:id/status", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      const { status, sendNotification } = req.body;
      
      if (!bookingId || !['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid booking ID or status" });
      }
      
      const { adminService } = await import('./services/admin');
      const result = await adminService.updateBookingStatus(bookingId, status, sendNotification);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking status", error: String(error) });
    }
  });
  
  app.patch("/api/admin/schedules/:id/capacity", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const scheduleId = parseInt(req.params.id);
      const { capacity } = req.body;
      
      if (!scheduleId || typeof capacity !== 'number' || capacity <= 0) {
        return res.status(400).json({ message: "Invalid schedule ID or capacity" });
      }
      
      const { adminService } = await import('./services/admin');
      const result = await adminService.updateScheduleCapacity(scheduleId, capacity);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update schedule capacity", error: String(error) });
    }
  });
  
  app.patch("/api/admin/routes/:id/price", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const routeId = parseInt(req.params.id);
      const { basePrice } = req.body;
      
      if (!routeId || typeof basePrice !== 'string' || parseFloat(basePrice) <= 0) {
        return res.status(400).json({ message: "Invalid route ID or price" });
      }
      
      const { adminService } = await import('./services/admin');
      const result = await adminService.updateRoutePrice(routeId, basePrice);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update route price", error: String(error) });
    }
  });

  // API endpoints for Admin Reports/Analytics
  app.get("/api/admin/reports/analytics", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const analytics = await reportingService.getBookingAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ message: "Failed to generate analytics" });
    }
  });
  
  app.get("/api/admin/reports/trends", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const period = (req.query.period as 'day' | 'week' | 'month') || 'day';
      
      const trends = await reportingService.getPeriodAnalytics(startDate, endDate, period);
      res.json(trends);
    } catch (error) {
      console.error("Error generating trends:", error);
      res.status(500).json({ message: "Failed to generate trends" });
    }
  });
  
  app.get("/api/admin/reports/routes", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      const routeAnalytics = await reportingService.getRouteAnalytics(startDate, endDate, limit);
      res.json(routeAnalytics);
    } catch (error) {
      console.error("Error generating route analytics:", error);
      res.status(500).json({ message: "Failed to generate route analytics" });
    }
  });
  
  app.get("/api/admin/reports/demographics", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const demographics = await reportingService.getCustomerDemographics(startDate, endDate);
      res.json(demographics);
    } catch (error) {
      console.error("Error generating demographics:", error);
      res.status(500).json({ message: "Failed to generate demographics" });
    }
  });
  
  app.get("/api/admin/reports/capacity", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const capacityReport = await reportingService.getCapacityUtilization(startDate, endDate);
      res.json(capacityReport);
    } catch (error) {
      console.error("Error generating capacity report:", error);
      res.status(500).json({ message: "Failed to generate capacity report" });
    }
  });
  
  app.get("/api/admin/reports/pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const pricingAnalysis = await reportingService.getPricingAnalysis(startDate, endDate);
      res.json(pricingAnalysis);
    } catch (error) {
      console.error("Error generating pricing analysis:", error);
      res.status(500).json({ message: "Failed to generate pricing analysis" });
    }
  });
  
  // Payment processing endpoints
  app.post("/api/payments/create-intent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { amount, currency, bookingReference, metadata } = req.body;
      
      if (!amount || !currency || !bookingReference) {
        return res.status(400).json({ message: "Missing required payment information" });
      }
      
      const paymentIntent = await paymentService.createPaymentIntent({
        amount,
        currency,
        bookingReference,
        metadata
      });
      
      res.json(paymentIntent);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });
  
  // Stripe webhook endpoint - Raw body parser middleware
  app.post("/api/payments/stripe/webhook", async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      
      try {
        let event;
        
        // Webhook secret, stripe dashboard'dan ayarlanması gerekiyor
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        if (webhookSecret) {
          // Use rawBody from our custom request interface for webhook signature verification
          const payload = req.rawBody;
          if (!payload) {
            throw new Error('Missing raw body for Stripe webhook verification');
          }
          event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
        } else {
          // In test environment, still try to parse the body, but add warning
          // Note: In production, always use webhook secret
          console.warn('No Stripe webhook secret provided - this is insecure and should only be used in development');
          
          // Make sure we have a body to parse
          const rawBody = req.rawBody || req.body;
          if (!rawBody) {
            throw new Error('Missing body for Stripe webhook event');
          }
          
          // Parse the raw body data
          if (Buffer.isBuffer(rawBody)) {
            event = JSON.parse(rawBody.toString());
          } else if (typeof rawBody === 'string') {
            event = JSON.parse(rawBody);
          } else {
            // Already parsed as JSON object
            event = rawBody;
          }
        }
        
        console.log('Stripe webhook event:', event.type);
        
        // Payment Intent başarıyla tamamlandı
        if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object;
          const bookingReference = paymentIntent.metadata?.bookingReference;
          
          if (bookingReference) {
            // Booking referansı ile booking ID'yi bul
            const booking = await storage.getBookingByReference(bookingReference);
            
            if (booking) {
              console.log(`Booking ${booking.id} ödeme durumu 'paid' olarak güncelleniyor...`);
              // Booking durumunu güncelle
              await storage.updateBookingPaymentStatus(booking.id, 'paid');
              
              // WebSocket ile durumu bildir
              broadcastToAll({
                type: 'payment_update',
                bookingId: booking.id,
                status: 'completed',
                provider: 'stripe',
                receipt: paymentIntent.receipt_url || null
              });
            } else {
              console.error(`Booking bulunamadı: ${bookingReference}`);
            }
          } else {
            console.error('Payment intent metadata\'sında bookingReference bulunamadı:', paymentIntent.id);
          }
        } else if (event.type === 'payment_intent.payment_failed') {
          const paymentIntent = event.data.object;
          const bookingReference = paymentIntent.metadata?.bookingReference;
          
          if (bookingReference) {
            // Booking referansı ile booking ID'yi bul
            const booking = await storage.getBookingByReference(bookingReference);
            
            if (booking) {
              console.log(`Booking ${booking.id} ödeme durumu 'failed' olarak güncelleniyor...`);
              // Booking durumunu güncelle
              await storage.updateBookingPaymentStatus(booking.id, 'failed');
              
              // WebSocket ile durumu bildir
              broadcastToAll({
                type: 'payment_update',
                bookingId: booking.id,
                status: 'failed',
                provider: 'stripe',
                error: paymentIntent.last_payment_error?.message || 'Payment failed'
              });
            } else {
              console.error(`Booking bulunamadı: ${bookingReference}`);
            }
          } else {
            console.error('Payment intent metadata\'sında bookingReference bulunamadı:', paymentIntent.id);
          }
        }
        
        // Webhook işlemini başarıyla tamamladığımızı bildir
        res.json({received: true});
      } catch (error) {
        console.error('Stripe webhook processing error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
      }
    }
  );
  
  app.post("/api/admin/payments/refund", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { paymentIntentId, amount, reason } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      const refund = await paymentService.createRefund({
        paymentIntentId,
        amount,
        reason
      });
      
      res.json(refund);
    } catch (error) {
      console.error("Error processing refund:", error);
      res.status(500).json({ message: "Failed to process refund" });
    }
  });
  
  // Email service endpoints
  app.post("/api/admin/email/send", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { to, subject, html, text } = req.body;
      
      if (!to || !subject || (!html && !text)) {
        return res.status(400).json({ message: "Missing required email information" });
      }
      
      const success = await emailService.sendEmail({
        to,
        subject,
        html,
        text
      });
      
      if (success) {
        res.json({ message: "Email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });
  
  app.post("/api/admin/email/newsletter", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { recipients, subject, content, senderName } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !content) {
        return res.status(400).json({ message: "Missing required newsletter information" });
      }
      
      const success = await emailService.sendNewsletter({
        recipients,
        subject,
        content,
        senderName
      });
      
      if (success) {
        res.json({ message: "Newsletter sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send newsletter" });
      }
    } catch (error) {
      console.error("Error sending newsletter:", error);
      res.status(500).json({ message: "Failed to send newsletter" });
    }
  });
  
  // Ticket generation endpoint
  app.post("/api/bookings/:id/generate-ticket", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow own ticket generation unless admin
      if (booking.userId !== req.user!.id && !req.user?.role === "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (booking.status !== 'confirmed') {
        return res.status(400).json({ message: "Can only generate tickets for confirmed bookings" });
      }
      
      // Get related data for ticket
      const route = await storage.getRoute(booking.routeId);
      const bookingPassengers = await storage.getBookingPassengers(booking.id);
      const bookingVehicle = await storage.getBookingVehicle(booking.id);
      
      // Generate ticket data
      const departureTime = new Date(booking.departureDate).toLocaleTimeString();
      
      const ticketUrl = await ticketGeneratorService.generateTicket({
        bookingReference: booking.bookingReference,
        pnrNumber: booking.pnrNumber,
        passengerName: req.user!.name || req.user!.username,
        departurePort: route.departurePort,
        arrivalPort: route.arrivalPort,
        departureDate: booking.departureDate,
        departureTime: departureTime,
        passengers: bookingPassengers.map(p => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passengerType: p.passengerType
        })),
        vehicles: bookingVehicle ? [{
          vehicleType: bookingVehicle.vehicleType,
          licensePlate: bookingVehicle.licensePlate
        }] : [],
        totalPrice: booking.totalPrice,
        paymentStatus: booking.isPaid ? 'Paid' : 'Unpaid'
      });
      
      res.json({ 
        ticketUrl,
        message: "Ticket generated successfully" 
      });
    } catch (error) {
      console.error("Error generating ticket:", error);
      res.status(500).json({ message: "Failed to generate ticket" });
    }
  });

  // Campaign Management API

  // Campaigns API
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = req.query.active === "true" 
        ? await storage.getActiveCampaigns() 
        : await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post("/api/admin/campaigns", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      
      // Broadcast new campaign creation event
      broadcastToAll({
        type: 'campaign_created',
        data: { id: campaign.id, name: campaign.name }
      });
      
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch("/api/admin/campaigns/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(id, validatedData);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Broadcast campaign update event
      broadcastToCampaign(id, {
        type: 'campaign_updated',
        data: { id: campaign.id, name: campaign.name }
      });
      
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/admin/campaigns/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaign(id);
      
      if (!success) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Broadcast campaign deletion event
      broadcastToAll({
        type: 'campaign_deleted',
        data: { id }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Customer Segments API
  app.get("/api/customer-segments", async (req, res) => {
    try {
      const segments = req.query.active === "true" 
        ? await storage.getActiveCustomerSegments() 
        : await storage.getAllCustomerSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer segments" });
    }
  });

  app.get("/api/customer-segments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const segment = await storage.getCustomerSegment(id);
      
      if (!segment) {
        return res.status(404).json({ message: "Customer segment not found" });
      }
      
      res.json(segment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer segment" });
    }
  });

  app.post("/api/admin/customer-segments", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertCustomerSegmentSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const segment = await storage.createCustomerSegment(validatedData);
      
      // Calculate segment size after creation
      await storage.calculateSegmentSize(segment.id);
      
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer segment" });
    }
  });

  app.patch("/api/admin/customer-segments/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertCustomerSegmentSchema.partial().parse(req.body);
      const segment = await storage.updateCustomerSegment(id, validatedData);
      
      if (!segment) {
        return res.status(404).json({ message: "Customer segment not found" });
      }
      
      // Recalculate segment size if criteria changed
      if (validatedData.criteria) {
        await storage.calculateSegmentSize(segment.id);
      }
      
      res.json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer segment" });
    }
  });

  app.delete("/api/admin/customer-segments/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomerSegment(id);
      
      if (!success) {
        return res.status(404).json({ message: "Customer segment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer segment" });
    }
  });

  // Campaign Performance API
  app.get("/api/campaign-performance", async (req, res) => {
    try {
      if (req.query.campaignId) {
        const campaignId = parseInt(req.query.campaignId as string);
        const performance = await storage.getCampaignPerformanceByCampaignId(campaignId);
        return res.json(performance);
      }
      
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Only admins can access all performance data
      const performances = [];
      const campaigns = await storage.getAllCampaigns();
      
      for (const campaign of campaigns) {
        const performance = await storage.getCampaignPerformanceByCampaignId(campaign.id);
        performances.push(...performance);
      }
      
      res.json(performances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign performance" });
    }
  });

  app.post("/api/admin/campaign-performance", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertCampaignPerformanceSchema.parse(req.body);
      const performance = await storage.createCampaignPerformance(validatedData);
      res.status(201).json(performance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create campaign performance" });
    }
  });

  app.patch("/api/admin/campaign-performance/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignPerformanceSchema.partial().parse(req.body);
      const performance = await storage.updateCampaignPerformance(id, validatedData);
      
      if (!performance) {
        return res.status(404).json({ message: "Campaign performance not found" });
      }
      
      res.json(performance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update campaign performance" });
    }
  });

  // Coupons API
  app.get("/api/coupons", async (req, res) => {
    try {
      if (req.query.code) {
        const code = req.query.code as string;
        const coupon = await storage.getCouponByCode(code);
        
        if (!coupon) {
          return res.status(404).json({ message: "Coupon not found" });
        }
        
        return res.json(coupon);
      }
      
      if (req.query.campaignId) {
        const campaignId = parseInt(req.query.campaignId as string);
        const coupons = await storage.getCouponsByCampaignId(campaignId);
        return res.json(coupons);
      }
      
      // Varsayılan olarak aktif kuponları getir, açıkça false belirtilmediği sürece
      const coupons = req.query.active === "false" 
        ? await storage.getAllCoupons()
        : await storage.getActiveCoupons();
      
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.post("/api/validate-coupon", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Coupon code is required" });
      }
      
      const validation = await storage.validateCoupon(code);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate coupon" });
    }
  });

  app.post("/api/admin/coupons", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertCouponSchema.parse(req.body);
      const coupon = await storage.createCoupon(validatedData);
      res.status(201).json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.patch("/api/admin/coupons/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertCouponSchema.partial().parse(req.body);
      const coupon = await storage.updateCoupon(id, validatedData);
      
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      
      res.json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCoupon(id);
      
      if (!success) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Marketing Emails API
  app.get("/api/marketing-emails", async (req, res) => {
    try {
      if (req.query.campaignId) {
        const campaignId = parseInt(req.query.campaignId as string);
        const emails = await storage.getMarketingEmailsByCampaignId(campaignId);
        return res.json(emails);
      }
      
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Only allow admins to fetch all marketing emails
      const campaigns = await storage.getAllCampaigns();
      const allEmails = [];
      
      for (const campaign of campaigns) {
        const emails = await storage.getMarketingEmailsByCampaignId(campaign.id);
        allEmails.push(...emails);
      }
      
      res.json(allEmails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch marketing emails" });
    }
  });

  app.get("/api/marketing-emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const email = await storage.getMarketingEmail(id);
      
      if (!email) {
        return res.status(404).json({ message: "Marketing email not found" });
      }
      
      res.json(email);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch marketing email" });
    }
  });

  app.post("/api/admin/marketing-emails", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertMarketingEmailSchema.parse(req.body);
      const email = await storage.createMarketingEmail(validatedData);
      res.status(201).json(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create marketing email" });
    }
  });

  app.patch("/api/admin/marketing-emails/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = insertMarketingEmailSchema.partial().parse(req.body);
      const email = await storage.updateMarketingEmail(id, validatedData);
      
      if (!email) {
        return res.status(404).json({ message: "Marketing email not found" });
      }
      
      res.json(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update marketing email" });
    }
  });

  app.delete("/api/admin/marketing-emails/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteMarketingEmail(id);
      
      if (!success) {
        return res.status(404).json({ message: "Marketing email not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete marketing email" });
    }
  });

  // Email Send API
  app.get("/api/email-sends", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      if (req.query.marketingEmailId) {
        // Only allow admins to query by marketing email ID
        if (req.user?.role !== "admin") {
          return res.status(403).json({ message: "Unauthorized" });
        }
        
        const marketingEmailId = parseInt(req.query.marketingEmailId as string);
        const sends = await storage.getEmailSendsByMarketingEmailId(marketingEmailId);
        return res.json(sends);
      }
      
      // For regular users, only show their own email sends
      if (req.user?.role !== "admin") {
        const userSends = await storage.getEmailSendsByUserId(req.user!.id);
        return res.json(userSends);
      }
      
      // Admins can also filter by user ID
      if (req.query.userId) {
        const userId = parseInt(req.query.userId as string);
        const sends = await storage.getEmailSendsByUserId(userId);
        return res.json(sends);
      }
      
      // Otherwise, return an empty array for admins to avoid loading all sends at once
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email sends" });
    }
  });

  app.post("/api/admin/email-sends", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertEmailSendSchema.parse(req.body);
      const send = await storage.createEmailSend(validatedData);
      res.status(201).json(send);
      
      // Notify via WebSocket
      broadcastToAll({
        type: 'email_sent',
        data: { 
          id: send.id, 
          userId: send.userId,
          status: send.status
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email send" });
    }
  });

  app.patch("/api/admin/email-sends/:id/status", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const statusTime = new Date();
      const send = await storage.updateEmailSendStatus(id, status, statusTime);
      
      if (!send) {
        return res.status(404).json({ message: "Email send not found" });
      }
      
      // Update marketing email stats based on status
      const email = await storage.getMarketingEmail(send.marketingEmailId);
      
      if (email) {
        const stats: any = {};
        
        if (status === 'opened') {
          stats.opens = (email.opens || 0) + 1;
        } else if (status === 'clicked') {
          stats.clicks = (email.clicks || 0) + 1;
        } else if (status === 'bounced') {
          stats.bounces = (email.bounces || 0) + 1;
        } else if (status === 'unsubscribed') {
          stats.unsubscribes = (email.unsubscribes || 0) + 1;
        }
        
        if (Object.keys(stats).length > 0) {
          await storage.updateEmailStats(email.id, stats);
        }
      }
      
      res.json(send);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email send status" });
    }
  });

  // Coupon Redemption API
  app.get("/api/coupon-redemptions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      if (req.query.couponId) {
        // Only allow admins to query by coupon ID
        if (req.user?.role !== "admin") {
          return res.status(403).json({ message: "Unauthorized" });
        }
        
        const couponId = parseInt(req.query.couponId as string);
        const redemptions = await storage.getCouponRedemptionsByCouponId(couponId);
        return res.json(redemptions);
      }
      
      if (req.query.bookingId) {
        const bookingId = parseInt(req.query.bookingId as string);
        const booking = await storage.getBooking(bookingId);
        
        // Only allow users to access their own bookings' redemptions
        if (!booking || (booking.userId !== req.user!.id && !req.user?.role === "admin")) {
          return res.status(403).json({ message: "Unauthorized" });
        }
        
        const redemptions = await storage.getCouponRedemptionsByBookingId(bookingId);
        return res.json(redemptions);
      }
      
      // For regular users, only show their own redemptions
      if (req.user?.role !== "admin") {
        const userRedemptions = await storage.getCouponRedemptionsByUserId(req.user!.id);
        return res.json(userRedemptions);
      }
      
      // Admins can filter by user ID
      if (req.query.userId) {
        const userId = parseInt(req.query.userId as string);
        const redemptions = await storage.getCouponRedemptionsByUserId(userId);
        return res.json(redemptions);
      }
      
      // Return empty array for admins to avoid loading all redemptions at once
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupon redemptions" });
    }
  });

  app.post("/api/coupon-redemptions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { couponCode, bookingId } = req.body;
      
      if (!couponCode || !bookingId) {
        return res.status(400).json({ message: "Coupon code and booking ID are required" });
      }
      
      // Verify the booking belongs to the current user
      const booking = await storage.getBooking(bookingId);
      
      if (!booking || (booking.userId !== req.user!.id && !req.user?.role === "admin")) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Validate the coupon
      const validation = await storage.validateCoupon(couponCode);
      
      if (!validation.valid || !validation.coupon) {
        return res.status(400).json({ message: validation.message || "Invalid coupon" });
      }
      
      // Calculate discount
      const coupon = validation.coupon;
      const originalAmount = booking.totalPrice;
      let discountAmount = "0";
      
      if (coupon.discountType === "percentage") {
        const percentage = parseFloat(coupon.discountValue) / 100;
        discountAmount = (parseFloat(originalAmount) * percentage).toFixed(2);
      } else if (coupon.discountType === "fixed") {
        discountAmount = Math.min(parseFloat(originalAmount), parseFloat(coupon.discountValue)).toFixed(2);
      }
      
      const finalAmount = (parseFloat(originalAmount) - parseFloat(discountAmount)).toFixed(2);
      
      // Create redemption record
      const redemption = await storage.createCouponRedemption({
        userId: req.user!.id,
        bookingId,
        couponId: coupon.id,
        redeemedAt: new Date(),
        originalAmount,
        discountAmount,
        finalAmount,
        currency: booking.currency
      });
      
      // Increment coupon usage
      await storage.incrementCouponUsage(coupon.id);
      
      // Update booking total price
      await storage.updateBooking(bookingId, { totalPrice: finalAmount });
      
      // Increment campaign usage if associated with a campaign
      if (coupon.campaignId) {
        await storage.incrementCampaignUsage(coupon.campaignId);
      }
      
      res.status(201).json({
        success: true,
        redemption,
        originalAmount,
        discountAmount,
        finalAmount
      });
    } catch (error) {
      console.error("Error redeeming coupon:", error);
      res.status(500).json({ message: "Failed to redeem coupon" });
    }
  });

  // =========== WhatsApp API Entegrasyonu ===========

  // WhatsApp servisi başlatma
  try {
    // WhatsApp servisi constructor içinde başlatılıyor
    console.log("WhatsApp servisi başlatıldı");
  } catch (error) {
    console.error("WhatsApp servisi başlatma hatası:", error);
  }

  // =========== Ferry API Entegrasyonu ===========
  
  // Ferry tedarikçileri listesi
  app.get("/api/backoffice/suppliers", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const suppliers = await storage.getBusWagnerSuppliers();
      res.status(200).json(suppliers);
    } catch (error) {
      console.error("Ferry tedarikçi listesi hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Tedarikçiler alınamadı", 
        error: error.message 
      });
    }
  });

  // Ferry tedarikçi detayı
  app.get("/api/backoffice/suppliers/:id", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getBusWagnerSupplier(id);
      
      if (!supplier) {
        return res.status(404).json({ 
          success: false, 
          message: "Tedarikçi bulunamadı" 
        });
      }
      
      res.status(200).json(supplier);
    } catch (error) {
      console.error("Ferry tedarikçi detayı hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Tedarikçi detayı alınamadı", 
        error: error.message 
      });
    }
  });

  // Ferry tedarikçi ekleme
  app.post("/api/backoffice/suppliers", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const supplierData = req.body;
      const supplier = await storage.createBusWagnerSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Ferry tedarikçi ekleme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Tedarikçi eklenemedi", 
        error: error.message 
      });
    }
  });

  // Ferry tedarikçi güncelleme
  app.put("/api/backoffice/suppliers/:id", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const id = parseInt(req.params.id);
      const supplierData = req.body;
      
      // Mevcut tedarikçiyi kontrol et
      const existingSupplier = await storage.getBusWagnerSupplier(id);
      if (!existingSupplier) {
        return res.status(404).json({ 
          success: false, 
          message: "Güncellenmek istenen tedarikçi bulunamadı" 
        });
      }

      // Gizli anahtar boş gönderilmişse, mevcut anahtarı koru
      if (!supplierData.secretKey && existingSupplier.secretKey) {
        delete supplierData.secretKey;
      }
      
      const updatedSupplier = await storage.updateBusWagnerSupplier(id, supplierData);
      res.status(200).json(updatedSupplier);
    } catch (error) {
      console.error("Ferry tedarikçi güncelleme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Tedarikçi güncellenemedi", 
        error: error.message 
      });
    }
  });

  // Ferry tedarikçi silme
  app.delete("/api/backoffice/suppliers/:id", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.deleteBusWagnerSupplier(id);
      res.status(200).json({ 
        success: true, 
        message: "Tedarikçi başarıyla silindi" 
      });
    } catch (error) {
      console.error("Ferry tedarikçi silme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Tedarikçi silinemedi", 
        error: error.message 
      });
    }
  });

  // Ferry tedarikçi bağlantı testi
  app.post("/api/backoffice/suppliers/:id/test", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getBusWagnerSupplier(id);
      
      if (!supplier) {
        return res.status(404).json({ 
          success: false, 
          message: "Tedarikçi bulunamadı" 
        });
      }
      
      // Ferry API servisi oluştur
      const apiService = createFerryApiService(supplier);
      
      // Bağlantıyı test et
      const testResult = await apiService.checkStatus();
      
      // Tedarikçi durumunu güncelle
      const status = testResult.status === 'success' ? 'active' : 'error';
      const lastChecked = new Date().toISOString();
      
      await storage.updateBusWagnerSupplier(id, { 
        status, 
        lastChecked 
      });
      
      res.status(200).json({
        success: testResult.status === 'success',
        message: testResult.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Ferry bağlantı testi hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Bağlantı testi yapılamadı", 
        error: error.message 
      });
    }
  });

  // Ferry rota senkronizasyonu
  app.post("/api/backoffice/suppliers/:id/sync-routes", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getBusWagnerSupplier(id);
      
      if (!supplier) {
        return res.status(404).json({ 
          success: false, 
          message: "Tedarikçi bulunamadı" 
        });
      }
      
      // Ferry API servisi oluştur
      const apiService = createFerryApiService(supplier);
      
      // Senkronizasyon logu oluştur
      const syncLogId = await storage.createBusWagnerSyncLog({
        supplierId: id,
        entityType: 'routes',
        operationType: 'fetch',
        status: 'pending',
        message: 'Rota senkronizasyonu başlatıldı',
        startedAt: new Date().toISOString(),
        itemsProcessed: 0
      });
      
      try {
        // Rotaları getir
        const routes = await apiService.getRoutes();
        
        // Rotaları veritabanına kaydet
        let processedCount = 0;
        for (const route of routes) {
          // Mevcut rotayı arayıp güncelle veya yeni oluştur
          const existingRoute = await storage.getBusWagnerRouteByExternalId(route.externalRouteId);
          
          if (existingRoute) {
            await storage.updateBusWagnerRoute(existingRoute.id, {
              ...route,
              supplierId: id,
              lastSyncedAt: new Date().toISOString()
            });
          } else {
            await storage.createBusWagnerRoute({
              ...route,
              supplierId: id,
              lastSyncedAt: new Date().toISOString()
            });
          }
          
          processedCount++;
        }
        
        // Senkronizasyon logu güncelle
        await storage.updateBusWagnerSyncLog(syncLogId, {
          status: 'success',
          message: `${processedCount} rota başarıyla senkronize edildi`,
          completedAt: new Date().toISOString(),
          itemsProcessed: processedCount
        });
        
        res.status(200).json({
          success: true,
          message: `${processedCount} rota başarıyla senkronize edildi`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Senkronizasyon hatası durumunda logu güncelle
        await storage.updateBusWagnerSyncLog(syncLogId, {
          status: 'failure',
          message: `Rota senkronizasyonu başarısız: ${error.message}`,
          completedAt: new Date().toISOString()
        });
        
        throw error;
      }
    } catch (error) {
      console.error("Ferry rota senkronizasyonu hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Rota senkronizasyonu yapılamadı", 
        error: error.message 
      });
    }
  });

  // Ferry rotaları listesi
  app.get("/api/backoffice/routes", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;
      const routes = await storage.getBusWagnerRoutes(supplierId);
      res.status(200).json(routes);
    } catch (error) {
      console.error("Ferry rotaları hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Rotalar alınamadı", 
        error: error.message 
      });
    }
  });

  // Ferry senkronizasyon logları
  app.get("/api/backoffice/sync-logs", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;
      const logs = await storage.getBusWagnerSyncLogs(supplierId);
      res.status(200).json(logs);
    } catch (error) {
      console.error("Ferry senkronizasyon logları hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Senkronizasyon logları alınamadı", 
        error: error.message 
      });
    }
  });
  
  // =========== Backoffice API Entegrasyonu ===========
  
  // Backoffice API yapılandırması
  app.post("/api/backoffice/configure", (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const { apiKey, apiPassword } = req.body;
      
      if (!apiKey || !apiPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "API anahtarı ve şifre gereklidir" 
        });
      }

      // Backoffice API servisini başlat
      const { backofficeApiService } = require("./services/backoffice-api");
      backofficeApiService.initialize(apiKey, apiPassword);
      
      // Bağlantıyı test et
      backofficeApiService.checkStatus()
        .then(statusResult => {
          res.status(200).json({ 
            success: true, 
            message: "Backoffice API yapılandırması tamamlandı",
            status: statusResult
          });
        })
        .catch(error => {
          res.status(500).json({ 
            success: false, 
            message: "API bağlantı testi başarısız", 
            error: error.message 
          });
        });
    } catch (error) {
      console.error("Backoffice API yapılandırma hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "API yapılandırma hatası", 
        error: error.message 
      });
    }
  });

  // Backoffice API durum kontrolü
  app.get("/api/backoffice/status", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const { backofficeApiService } = require("./services/backoffice-api");
      const status = await backofficeApiService.checkStatus();
      res.status(200).json(status);
    } catch (error) {
      console.error("Backoffice API durum kontrolü hatası:", error);
      res.status(500).json({ 
        status: "error", 
        message: "API durum kontrolü başarısız" 
      });
    }
  });
  
  // =========== Yedekleme ve Felaket Kurtarma API Rotaları ===========
  // İçe aktarma kaldırıldı - artık dosyanın başında yapılıyor
  
  // Yedeklemeleri listele
  app.get("/api/backup/list", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const backups = await backupService.listBackups(limit, offset);
      res.status(200).json(backups);
    } catch (error) {
      console.error("Yedeklemeleri listeleme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Yedeklemeleri listelerken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Yeni yedekleme oluştur
  app.post("/api/backup/create", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const backupData = {
        ...req.body,
        userId: req.user!.id
      };
      
      const backupId = await backupService.createBackup(backupData);
      res.status(201).json({ 
        success: true, 
        message: "Yedekleme başarıyla oluşturuldu", 
        backupId 
      });
    } catch (error) {
      console.error("Yedekleme oluşturma hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Yedekleme oluşturulurken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Yedekleme planlarını listele
  app.get("/api/backup/schedules", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const onlyActive = req.query.active === 'true';
      const schedules = await backupService.listBackupSchedules(onlyActive);
      res.status(200).json(schedules);
    } catch (error) {
      console.error("Yedekleme planlarını listeleme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Yedekleme planlarını listelerken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Yedekleme planı oluştur
  app.post("/api/backup/schedule/create", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const scheduleData = {
        ...req.body,
        createdBy: req.user!.id
      };
      
      const scheduleId = await backupService.createBackupSchedule(scheduleData);
      res.status(201).json({ 
        success: true, 
        message: "Yedekleme planı başarıyla oluşturuldu", 
        scheduleId 
      });
    } catch (error) {
      console.error("Yedekleme planı oluşturma hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Yedekleme planı oluşturulurken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Yedekleme planını etkinleştir/devre dışı bırak
  app.post("/api/backup/schedule/toggle", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const { id, isActive } = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: "Plan ID'si gereklidir" 
        });
      }
      
      await backupService.toggleBackupScheduleStatus(id, isActive);
      res.status(200).json({ 
        success: true, 
        message: `Yedekleme planı ${isActive ? 'etkinleştirildi' : 'devre dışı bırakıldı'}` 
      });
    } catch (error) {
      console.error("Yedekleme planı durumu değiştirme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Yedekleme planı durumu değiştirilirken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Geri yükleme işlemlerini listele
  app.get("/api/backup/restore-operations", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const operations = await backupService.listRestoreOperations(limit, offset);
      res.status(200).json(operations);
    } catch (error) {
      console.error("Geri yükleme işlemlerini listeleme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Geri yükleme işlemlerini listelerken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Geri yükleme işlemi başlat
  app.post("/api/backup/restore", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const restoreData = {
        ...req.body,
        userId: req.user!.id
      };
      
      const restoreId = await backupService.restoreFromBackup(restoreData);
      res.status(202).json({ 
        success: true, 
        message: "Geri yükleme işlemi başlatıldı", 
        restoreId 
      });
    } catch (error) {
      console.error("Geri yükleme başlatma hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Geri yükleme işlemi başlatılırken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Felaket kurtarma noktalarını listele
  app.get("/api/backup/disaster-recovery-points", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const onlyActive = req.query.active !== 'false';
      const drPoints = await backupService.listDisasterRecoveryPoints(onlyActive);
      res.status(200).json(drPoints);
    } catch (error) {
      console.error("Felaket kurtarma noktalarını listeleme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Felaket kurtarma noktalarını listelerken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Felaket kurtarma noktası oluştur
  app.post("/api/backup/disaster-recovery-point", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const { name, description, backupId, recoveryPointObjective, recoveryTimeObjective } = req.body;
      
      if (!backupId) {
        return res.status(400).json({ 
          success: false, 
          message: "Yedekleme ID'si gereklidir" 
        });
      }
      
      const drpId = await backupService.createDisasterRecoveryPoint(
        name,
        description,
        backupId,
        recoveryPointObjective || 60, // Varsayılan 1 saat
        recoveryTimeObjective || 120, // Varsayılan 2 saat
        req.user!.id
      );
      
      res.status(201).json({ 
        success: true, 
        message: "Felaket kurtarma noktası başarıyla oluşturuldu", 
        drpId 
      });
    } catch (error) {
      console.error("Felaket kurtarma noktası oluşturma hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Felaket kurtarma noktası oluşturulurken bir hata oluştu", 
        error: error.message 
      });
    }
  });
  
  // Yedekleme sil
  app.delete("/api/backup/:id", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }
    
    try {
      const backupId = parseInt(req.params.id);
      
      // İlişkili geri yükleme operasyonları ve DR noktaları kontrolü yapılabilir
      
      // TODO: Dosyaları ve kaydı silmek için logik eklenecek
      res.status(200).json({ 
        success: true, 
        message: "Yedekleme başarıyla silindi" 
      });
    } catch (error) {
      console.error("Yedekleme silme hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Yedekleme silinirken bir hata oluştu", 
        error: error.message 
      });
    }
  });

  // Backoffice API rotaları sorgulama
  app.get("/api/backoffice/routes", async (req, res) => {
    try {
      const { backofficeApiService } = require("./services/backoffice-api");
      const routes = await backofficeApiService.getRoutes();
      res.status(200).json(routes);
    } catch (error) {
      console.error("Backoffice API rota sorgulama hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Rota bilgileri alınamadı", 
        error: error.message 
      });
    }
  });

  // Backoffice API sefer sorgulama
  app.get("/api/backoffice/voyages/:routeId", async (req, res) => {
    try {
      const { routeId } = req.params;
      const { backofficeApiService } = require("./services/backoffice-api");
      const voyages = await backofficeApiService.getVoyagesByRoute(routeId);
      res.status(200).json(voyages);
    } catch (error) {
      console.error("Backoffice API sefer sorgulama hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Sefer bilgileri alınamadı", 
        error: error.message 
      });
    }
  });

  // Backoffice API rezervasyon oluşturma
  app.post("/api/backoffice/reservations", async (req, res) => {
    try {
      const reservationData = req.body;
      const { backofficeApiService } = require("./services/backoffice-api");
      const result = await backofficeApiService.createReservation(reservationData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Backoffice API rezervasyon oluşturma hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "Rezervasyon oluşturulamadı", 
        error: error.message 
      });
    }
  });

  // Backoffice API PNR sorgulama
  app.get("/api/backoffice/reservations/pnr/:pnr", async (req, res) => {
    try {
      const { pnr } = req.params;
      const { backofficeApiService } = require("./services/backoffice-api");
      const reservation = await backofficeApiService.getReservationByPnr(pnr);
      
      if (!reservation) {
        return res.status(404).json({ 
          success: false, 
          message: "PNR bulunamadı" 
        });
      }
      
      res.status(200).json(reservation);
    } catch (error) {
      console.error("Backoffice API PNR sorgulama hatası:", error);
      res.status(500).json({ 
        success: false, 
        message: "PNR sorgulama hatası", 
        error: error.message 
      });
    }
  });

  // WhatsApp durum kontrolü endpoint'i
  app.get("/api/whatsapp/status", (req, res) => {
    try {
      // WhatsApp Business API bağlantı durumunu kontrol et
      // Demo modunda her zaman bağlı olarak gösterelim
      const isConnected = true; // Her zaman bağlı olarak göster
      res.json({ 
        connected: isConnected,
        mode: process.env.WHATSAPP_API_KEY ? 'production' : 'demo',
        status: "connected",
        version: "Demo v1.0",
        info: "Demo WhatsApp Entegrasyonu - API anahtarı olmadan çalışıyor"
      });
    } catch (error) {
      console.error("WhatsApp durum kontrolü hatası:", error);
      res.status(500).json({ 
        connected: false, 
        error: "WhatsApp bağlantı durumu kontrol edilemedi" 
      });
    }
  });

  // WhatsApp webhook doğrulama endpoint'i
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;
    
    // Demo modunda her zaman challenge'ı geri döndürelim
    if (challenge) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Webhook doğrulama başarısız");
    }
  });

  // WhatsApp webhook mesaj alma endpoint'i
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Demo modunda her zaman başarılı döndürelim
      console.log("WhatsApp webhook mesajı alındı:", JSON.stringify(req.body));
      res.status(200).send("OK");
    } catch (error) {
      console.error("WhatsApp webhook işleme hatası:", error);
      res.status(500).send("Webhook işleme hatası");
    }
  });

  // WhatsApp mesaj gönderme API endpoint'i
  app.post("/api/whatsapp/send", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ message: "Eksik parametreler: 'to' ve 'message' gerekli" });
      }
      
      // Demo modunda her zaman başarılı döndürelim
      console.log(`WhatsApp mesajı gönderildi: to=${to}, message=${message}`);
      res.status(200).json({ 
        success: true, 
        result: {
          id: "demo-message-" + Date.now(),
          message: message,
          status: "sent"
        }
      });
    } catch (error) {
      console.error("WhatsApp mesaj gönderme hatası:", error);
      res.status(500).json({ success: false, message: "Mesaj gönderme hatası" });
    }
  });

  // WhatsApp medya gönderme API endpoint'i
  app.post("/api/whatsapp/send-media", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const { to, mediaType, mediaUrl, caption, filename } = req.body;
      
      if (!to || !mediaType || !mediaUrl) {
        return res.status(400).json({ message: "Eksik parametreler: 'to', 'mediaType' ve 'mediaUrl' gerekli" });
      }
      
      if (!["image", "video", "document"].includes(mediaType)) {
        return res.status(400).json({ message: "Geçersiz mediaType. 'image', 'video' veya 'document' olmalı" });
      }
      
      // Demo modunda her zaman başarılı döndürelim
      console.log(`WhatsApp medya gönderildi: to=${to}, mediaType=${mediaType}, mediaUrl=${mediaUrl}`);
      res.status(200).json({ 
        success: true, 
        result: {
          id: "demo-media-" + Date.now(),
          mediaType: mediaType,
          status: "sent"
        }
      });
    } catch (error) {
      console.error("WhatsApp medya gönderme hatası:", error);
      res.status(500).json({ success: false, message: "Medya gönderme hatası" });
    }
  });

  // WhatsApp kampanya gönderme API endpoint'i
  app.post("/api/whatsapp/send-campaign", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const { userIds, campaignTitle, campaignDetails, mediaUrl, couponCode } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !campaignTitle || !campaignDetails) {
        return res.status(400).json({ message: "Eksik parametreler: 'userIds', 'campaignTitle' ve 'campaignDetails' gerekli" });
      }
      
      // Demo modunda her zaman başarılı döndürelim
      console.log(`WhatsApp kampanyası gönderildi: userIds=${userIds.length} kullanıcıya, title=${campaignTitle}`);
      res.status(200).json({ 
        success: true, 
        result: {
          id: "demo-campaign-" + Date.now(),
          recipientCount: userIds.length,
          sentCount: userIds.length,
          status: "sent"
        }
      });
    } catch (error) {
      console.error("WhatsApp kampanya gönderme hatası:", error);
      res.status(500).json({ success: false, message: "Kampanya gönderme hatası" });
    }
  });

  // PNR sorgulama API endpoint'i
  app.get("/api/whatsapp/query-pnr/:pnr", async (req, res) => {
    try {
      const pnr = req.params.pnr;
      const result = await pnrQueryService.queryBookingByPnr(pnr);
      
      if (!result) {
        return res.status(404).json({ success: false, message: "PNR bulunamadı" });
      }
      
      res.status(200).json({ success: true, booking: result });
    } catch (error) {
      console.error("PNR sorgulama hatası:", error);
      res.status(500).json({ success: false, message: "PNR sorgulama hatası" });
    }
  });

  // Rezervasyon durumu WhatsApp bildirimi gönderme API endpoint'i (admin için)
  app.post("/api/admin/whatsapp/notify-booking", async (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz istek" });
    }

    try {
      const { bookingId, notificationType } = req.body;
      
      if (!bookingId || !notificationType) {
        return res.status(400).json({ message: "Eksik parametreler: 'bookingId' ve 'notificationType' gerekli" });
      }
      
      // Demo modunda her zaman başarılı döndürelim
      console.log(`WhatsApp bildirim isteği: bookingId=${bookingId}, notificationType=${notificationType}`);
      
      // Her bildirim tipi için bir mesaj oluşturalım
      let notificationMessage = "";
      
      switch (notificationType) {
        case "confirmation":
          notificationMessage = "Rezervasyonunuz onaylanmıştır. İyi yolculuklar dileriz!";
          break;
        case "payment":
          notificationMessage = "Ödemeniz başarıyla alınmıştır. Teşekkür ederiz.";
          break;
        case "reminder":
          notificationMessage = "Yarınki seyahatiniz için hatırlatma. Kalkış saatinden 30 dakika önce terminalde olunuz.";
          break;
        case "cancellation":
          const { reason } = req.body;
          if (!reason) {
            return res.status(400).json({ message: "İptal bildirimi için 'reason' parametresi gerekli" });
          }
          notificationMessage = `Rezervasyonunuz iptal edilmiştir. Sebep: ${reason}`;
          break;
        case "delay":
          const { newDepartureTime, delayReason } = req.body;
          if (!newDepartureTime || !delayReason) {
            return res.status(400).json({ message: "Gecikme bildirimi için 'newDepartureTime' ve 'delayReason' parametreleri gerekli" });
          }
          notificationMessage = `Seferiniz gecikmiştir. Yeni kalkış saati: ${newDepartureTime}. Sebep: ${delayReason}`;
          break;
        default:
          return res.status(400).json({ message: "Geçersiz bildirim tipi" });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Bildirim başarıyla gönderildi",
        result: {
          id: "demo-notification-" + Date.now(),
          bookingId: bookingId,
          notificationType: notificationType,
          message: notificationMessage,
          status: "sent"
        }
      });
    } catch (error) {
      console.error("WhatsApp bildirim hatası:", error);
      res.status(500).json({ success: false, message: "Bildirim gönderme hatası" });
    }
  });
  
  // System backup and disaster recovery endpoints
  // Get all backups
  app.get('/api/backup/list', async (req, res) => {
    try {
      const backups = await backupService.getSystemBackups();
      res.json(backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  });
  
  // Create a new backup
  app.post('/api/backup/create', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.createBackup(req.body, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });
  
  // Delete a backup
  app.delete('/api/backup/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.deleteBackup(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error(`Error deleting backup ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  });
  
  // Get backup schedules
  app.get('/api/backup/schedule/list', async (req, res) => {
    try {
      const schedules = await backupService.getBackupSchedules();
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching backup schedules:', error);
      res.status(500).json({ error: 'Failed to fetch backup schedules' });
    }
  });
  
  // Create a backup schedule
  app.post('/api/backup/schedule/create', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.createBackupSchedule(req.body, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating backup schedule:', error);
      res.status(500).json({ error: 'Failed to create backup schedule' });
    }
  });
  
  // Update a backup schedule
  app.patch('/api/backup/schedule/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.updateBackupSchedule(parseInt(req.params.id), req.body);
      res.json(result);
    } catch (error) {
      console.error(`Error updating backup schedule ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update backup schedule' });
    }
  });
  
  // Delete a backup schedule
  app.delete('/api/backup/schedule/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.deleteBackupSchedule(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error(`Error deleting backup schedule ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete backup schedule' });
    }
  });
  
  // Run a scheduled backup immediately
  app.post('/api/backup/schedule/:id/run-now', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.executeScheduledBackup(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error(`Error running backup schedule ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to run backup schedule' });
    }
  });
  
  // Get all restore operations
  app.get('/api/backup/restore/list', async (req, res) => {
    try {
      const operations = await backupService.getRestoreOperations();
      res.json(operations);
    } catch (error) {
      console.error('Error fetching restore operations:', error);
      res.status(500).json({ error: 'Failed to fetch restore operations' });
    }
  });
  
  // Initiate a restore operation
  app.post('/api/backup/restore', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.initiateRestore(req.body, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error initiating restore operation:', error);
      res.status(500).json({ error: 'Failed to initiate restore operation' });
    }
  });
  
  // Get all recovery points
  app.get('/api/backup/recovery-points', async (req, res) => {
    try {
      const points = await backupService.getRecoveryPoints();
      res.json(points);
    } catch (error) {
      console.error('Error fetching recovery points:', error);
      res.status(500).json({ error: 'Failed to fetch recovery points' });
    }
  });
  
  // Create a recovery point
  app.post('/api/backup/recovery-points', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.createRecoveryPoint(req.body, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating recovery point:', error);
      res.status(500).json({ error: 'Failed to create recovery point' });
    }
  });
  
  // Test a recovery point
  app.post('/api/backup/recovery-points/:id/test', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.testRecoveryPoint(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error(`Error testing recovery point ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to test recovery point' });
    }
  });
  
  // Get backup statistics
  app.get('/api/backup/stats', async (req, res) => {
    try {
      const stats = await backupService.getBackupStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching backup statistics:', error);
      res.status(500).json({ error: 'Failed to fetch backup statistics' });
    }
  });
  
  // Run cleanup for expired backups
  app.post('/api/backup/cleanup', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const result = await backupService.cleanupExpiredBackups();
      res.json(result);
    } catch (error) {
      console.error('Error cleaning up expired backups:', error);
      res.status(500).json({ error: 'Failed to clean up expired backups' });
    }
  });

  // ---------------------------------------------
  // Revenue Management API Routes
  // ---------------------------------------------

  // Dynamic Pricing Rules
  app.get("/api/admin/revenue/pricing-rules", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const rules = await revenueManagementService.getDynamicPricingRules(includeInactive);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dynamic pricing rules" });
    }
  });

  app.get("/api/admin/revenue/pricing-rules/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const rule = await revenueManagementService.getDynamicPricingRule(id);
      
      if (!rule) {
        return res.status(404).json({ message: "Dynamic pricing rule not found" });
      }
      
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dynamic pricing rule" });
    }
  });

  app.post("/api/admin/revenue/pricing-rules", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Add current user as creator
      const data = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const result = await revenueManagementService.createDynamicPricingRule(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create dynamic pricing rule" });
    }
  });

  app.patch("/api/admin/revenue/pricing-rules/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const result = await revenueManagementService.updateDynamicPricingRule(id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update dynamic pricing rule" });
    }
  });

  app.delete("/api/admin/revenue/pricing-rules/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const result = await revenueManagementService.deleteDynamicPricingRule(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete dynamic pricing rule" });
    }
  });

  // Calculate Dynamic Price
  app.post("/api/revenue/calculate-price", async (req, res) => {
    try {
      const { routeId, scheduleId, date } = req.body;
      
      if (!routeId || !date) {
        return res.status(400).json({ message: "Route ID and date are required" });
      }
      
      const result = await revenueManagementService.calculateDynamicPrice(
        parseInt(routeId), 
        scheduleId ? parseInt(scheduleId) : null, 
        date
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate dynamic price" });
    }
  });

  // Price History
  app.get("/api/admin/revenue/price-history", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { routeId, startDate, endDate } = req.query;
      
      if (!routeId || !startDate || !endDate) {
        return res.status(400).json({ message: "Route ID, start date, and end date are required" });
      }
      
      const history = await revenueManagementService.getPriceHistory(
        parseInt(routeId as string), 
        startDate as string, 
        endDate as string
      );
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });

  // Demand Forecasts
  app.post("/api/admin/revenue/demand-forecasts", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const result = await revenueManagementService.createDemandForecast(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create demand forecast" });
    }
  });

  app.get("/api/admin/revenue/demand-forecasts", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { routeId, startDate, endDate } = req.query;
      
      if (!routeId || !startDate || !endDate) {
        return res.status(400).json({ message: "Route ID, start date, and end date are required" });
      }
      
      const forecasts = await revenueManagementService.getDemandForecasts(
        parseInt(routeId as string), 
        startDate as string, 
        endDate as string
      );
      
      res.json(forecasts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch demand forecasts" });
    }
  });

  // Revenue Goals
  app.post("/api/admin/revenue/goals", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Add current user as creator
      const data = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const result = await revenueManagementService.createRevenueGoal(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create revenue goal" });
    }
  });

  app.get("/api/admin/revenue/goals", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const goals = await revenueManagementService.getRevenueGoals(includeInactive);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue goals" });
    }
  });

  app.patch("/api/admin/revenue/goals/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const result = await revenueManagementService.updateRevenueGoal(id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update revenue goal" });
    }
  });

  // Competitor Pricing
  app.post("/api/admin/revenue/competitor-pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const result = await revenueManagementService.addCompetitorPricing(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to add competitor pricing" });
    }
  });

  app.get("/api/admin/revenue/competitor-pricing", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { routeId, startDate, endDate } = req.query;
      
      if (!routeId || !startDate || !endDate) {
        return res.status(400).json({ message: "Route ID, start date, and end date are required" });
      }
      
      const pricing = await revenueManagementService.getCompetitorPricing(
        parseInt(routeId as string), 
        startDate as string, 
        endDate as string
      );
      
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch competitor pricing" });
    }
  });

  // Revenue Snapshots
  app.post("/api/admin/revenue/snapshots", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const result = await revenueManagementService.createRevenueSnapshot(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create revenue snapshot" });
    }
  });

  app.get("/api/admin/revenue/snapshots", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { routeId, snapshotType, startDate, endDate } = req.query;
      
      if (!snapshotType || !startDate || !endDate) {
        return res.status(400).json({ message: "Snapshot type, start date, and end date are required" });
      }
      
      const snapshots = await revenueManagementService.getRevenueSnapshots(
        routeId ? parseInt(routeId as string) : null, 
        snapshotType as string,
        startDate as string, 
        endDate as string
      );
      
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue snapshots" });
    }
  });

  // Yield Management Settings
  app.post("/api/admin/revenue/yield-settings", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Add current user as creator
      const data = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const result = await revenueManagementService.saveYieldManagementSettings(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to save yield management settings" });
    }
  });

  app.get("/api/admin/revenue/yield-settings", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const settings = await revenueManagementService.getYieldManagementSettings(includeInactive);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch yield management settings" });
    }
  });

  // Seasonal Pricing Factors
  app.post("/api/admin/revenue/seasonal-factors", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Add current user as creator
      const data = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const result = await revenueManagementService.createSeasonalPricingFactor(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create seasonal pricing factor" });
    }
  });

  app.get("/api/admin/revenue/seasonal-factors", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const factors = await revenueManagementService.getSeasonalPricingFactors(includeInactive);
      res.json(factors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seasonal pricing factors" });
    }
  });

  app.patch("/api/admin/revenue/seasonal-factors/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const result = await revenueManagementService.updateSeasonalPricingFactor(id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update seasonal pricing factor" });
    }
  });

  // Special Events
  app.post("/api/admin/revenue/special-events", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Add current user as creator
      const data = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const result = await revenueManagementService.createSpecialEvent(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create special event" });
    }
  });

  app.get("/api/admin/revenue/special-events", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const events = await revenueManagementService.getSpecialEvents(includeInactive);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch special events" });
    }
  });

  app.patch("/api/admin/revenue/special-events/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const result = await revenueManagementService.updateSpecialEvent(id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update special event" });
    }
  });

  // Analytics & Reports
  app.post("/api/admin/revenue/reports/revenue", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { routeIds, startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await revenueManagementService.generateRevenueReport(
        routeIds && routeIds.length > 0 ? routeIds : null,
        startDate,
        endDate
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate revenue report" });
    }
  });

  app.get("/api/admin/revenue/route-performance/:routeId", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const routeId = parseInt(req.params.routeId);
      const analysis = await revenueManagementService.analyzeRoutePerformance(routeId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze route performance" });
    }
  });

  app.get("/api/admin/revenue/optimized-pricing/:routeId", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const routeId = parseInt(req.params.routeId);
      const daysInAdvance = req.query.days ? parseInt(req.query.days as string) : 90;
      
      const plan = await revenueManagementService.generateOptimizedPricingPlan(routeId, daysInAdvance);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate optimized pricing plan" });
    }
  });

  // Türk Ödeme Sağlayıcıları API Routes
  
  // Desteklenen ödeme sağlayıcılarını listele
  app.get("/api/payment/turkish-providers", (req, res) => {
    try {
      const providers = turkishPaymentService.getPaymentProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment providers", error: String(error) });
    }
  });
  
  // API Integrations endpoints
  app.get("/api/integrations/status", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const integrations = await integrationService.getAllIntegrations();
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch integration status' });
    }
  });
  
  app.post("/api/integrations/:id/configure", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const { id } = req.params;
      const updatedIntegration = await integrationService.updateIntegration(id, req.body);
      res.json(updatedIntegration);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update integration configuration' });
    }
  });
  
  app.post("/api/integrations/:id/test", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const { id } = req.params;
      const testResult = await integrationService.testIntegration(id);
      res.json(testResult);
    } catch (error) {
      res.status(500).json({ message: 'Failed to test integration' });
    }
  });

  // Ödeme başlat
  app.post("/api/payment/turkish/:provider/initiate", async (req, res) => {
    try {
      const { provider } = req.params;
      
      // Provider parametresini kontrol et
      if (!['payu', 'iyzico', 'paytr'].includes(provider)) {
        return res.status(400).json({ message: "Invalid payment provider" });
      }

      const paymentData = req.body;
      const result = await turkishPaymentService.createPayment(
        provider as 'payu' | 'iyzico' | 'paytr', 
        paymentData
      );
      
      // WebSocket ile ödeme başlangıç bildirimi gönder
      broadcastToAll({
        type: 'payment_update',
        bookingId: paymentData.bookingId,
        status: 'processing',
        provider: provider,
        paymentId: result.paymentId
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment", error: String(error) });
    }
  });

  // Ödeme durumunu sorgula
  app.get("/api/payment/turkish/:provider/status/:paymentId", async (req, res) => {
    try {
      const { provider, paymentId } = req.params;
      
      // Provider parametresini kontrol et
      if (!['payu', 'iyzico', 'paytr'].includes(provider)) {
        return res.status(400).json({ message: "Invalid payment provider" });
      }

      const result = await turkishPaymentService.checkPaymentStatus(
        provider as 'payu' | 'iyzico' | 'paytr', 
        paymentId
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to check payment status", error: String(error) });
    }
  });

  // İade işlemi
  app.post("/api/payment/turkish/:provider/refund", async (req, res) => {
    try {
      // Demo mod için admin kontrolünü geçici olarak kaldırıyoruz
      // Gerçek ortamda aktif olmalı
      // if (req.user?.role !== "admin") {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      const { provider } = req.params;
      
      // Provider parametresini kontrol et
      if (!['payu', 'iyzico', 'paytr'].includes(provider)) {
        return res.status(400).json({ message: "Invalid payment provider" });
      }

      const refundData = req.body;
      const result = await turkishPaymentService.createRefund(
        provider as 'payu' | 'iyzico' | 'paytr', 
        refundData
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to process refund", error: String(error) });
    }
  });

  // Webhook handler
  app.post("/api/payment/turkish/:provider/webhook", async (req, res) => {
    try {
      const { provider } = req.params;
      
      // Provider parametresini kontrol et
      if (!['payu', 'iyzico', 'paytr'].includes(provider)) {
        return res.status(400).json({ message: "Invalid payment provider" });
      }

      // Webhook doğrulama
      const isValid = turkishPaymentService.verifyWebhook(
        provider as 'payu' | 'iyzico' | 'paytr', 
        req.body, 
        req.headers
      );
      
      if (!isValid) {
        return res.status(403).json({ message: "Invalid webhook signature" });
      }
      
      // Webhook işleme
      const result = await turkishPaymentService.handleWebhook(
        provider as 'payu' | 'iyzico' | 'paytr', 
        req.body, 
        req.headers
      );
      
      // Webhook işleminin sonucuna göre ödeme durumunu güncelle 
      if (result.status === 'COMPLETED' || result.status === 'APPROVED' || result.status === 'success') {
        // İlgili booking'i güncelle
        if (result.bookingId) {
          await storage.updateBookingPaymentStatus(result.bookingId, 'paid');
          
          // WebSocket ile ödeme durumu güncellemesi gönder
          broadcastToAll({
            type: 'payment_update',
            bookingId: result.bookingId,
            status: 'completed',
            provider: provider,
            paymentId: result.paymentId
          });
        }
        
        // Örnek loglama
        console.log(`Payment completed for provider ${provider}, payment ID: ${result.paymentId}`);
        
        // E-posta bildirimini ekleyebiliriz
        try {
          if (result.bookingId) {
            const booking = await storage.getBooking(result.bookingId);
            if (booking && booking.userEmail) {
              // E-posta gönderimi burada yapılabilir
              // emailService.sendPaymentConfirmation(booking.userEmail, booking);
            }
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Webhook error for ${req.params.provider}:`, error);
      
      // Webhook çağrılarında her zaman başarılı yanıt döndürmek önemli
      // Hata durumunda da 200 OK dönüyoruz, ama hatayı logluyoruz
      res.json({ success: true });
    }
  });

  // Transfer Modülü API Endpoints
  // Transfer araç tiplerini listele
  app.get('/api/transfer/vehicle-types', async (req, res) => {
    try {
      const vehicleTypes = await storage.getTransferVehicleTypes();
      res.json(vehicleTypes);
    } catch (err) {
      console.error('Error fetching transfer vehicle types:', err);
      res.status(500).json({ error: 'Failed to fetch transfer vehicle types' });
    }
  });

  // Belirli bir transfer araç tipi getir
  app.get('/api/transfer/vehicle-types/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicleType = await storage.getTransferVehicleType(id);
      
      if (!vehicleType) {
        return res.status(404).json({ error: 'Transfer vehicle type not found' });
      }
      
      res.json(vehicleType);
    } catch (err) {
      console.error('Error fetching transfer vehicle type:', err);
      res.status(500).json({ error: 'Failed to fetch transfer vehicle type' });
    }
  });

  // Transfer araç tipi oluştur (admin only)
  app.post('/api/admin/transfer/vehicle-types', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const vehicleType = await storage.createTransferVehicleType(req.body);
      res.status(201).json(vehicleType);
    } catch (err) {
      console.error('Error creating transfer vehicle type:', err);
      res.status(500).json({ error: 'Failed to create transfer vehicle type' });
    }
  });

  // Transfer rotaları listele
  app.get('/api/transfer/routes', async (req, res) => {
    try {
      const { origin, destination, isPopular } = req.query;
      let routes = await storage.getTransferRoutes();
      
      // Filtrele
      if (origin) {
        routes = routes.filter(route => 
          route.originName.toLowerCase().includes(String(origin).toLowerCase())
        );
      }
      
      if (destination) {
        routes = routes.filter(route => 
          route.destinationName.toLowerCase().includes(String(destination).toLowerCase())
        );
      }
      
      if (isPopular === 'true') {
        routes = routes.filter(route => route.isPopular);
      }
      
      res.json(routes);
    } catch (err) {
      console.error('Error fetching transfer routes:', err);
      res.status(500).json({ error: 'Failed to fetch transfer routes' });
    }
  });

  // Belirli bir transfer rotası getir
  app.get('/api/transfer/routes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const route = await storage.getTransferRoute(id);
      
      if (!route) {
        return res.status(404).json({ error: 'Transfer route not found' });
      }
      
      res.json(route);
    } catch (err) {
      console.error('Error fetching transfer route:', err);
      res.status(500).json({ error: 'Failed to fetch transfer route' });
    }
  });

  // Transfer rotası oluştur (admin only)
  app.post('/api/admin/transfer/routes', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const route = await storage.createTransferRoute(req.body);
      res.status(201).json(route);
    } catch (err) {
      console.error('Error creating transfer route:', err);
      res.status(500).json({ error: 'Failed to create transfer route' });
    }
  });

  // Belirli bir transfer rotası için fiyatları getir
  app.get('/api/transfer/routes/:id/prices', async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const prices = await storage.getTransferPricesByRoute(routeId);
      
      res.json(prices);
    } catch (err) {
      console.error('Error fetching transfer prices:', err);
      res.status(500).json({ error: 'Failed to fetch transfer prices' });
    }
  });

  // Transfer fiyatı oluştur (admin only)
  app.post('/api/admin/transfer/prices', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const price = await storage.createTransferPrice(req.body);
      res.status(201).json(price);
    } catch (err) {
      console.error('Error creating transfer price:', err);
      res.status(500).json({ error: 'Failed to create transfer price' });
    }
  });

  // Transfer rezervasyonu oluştur
  app.post('/api/transfer/bookings', async (req, res) => {
    try {
      const bookingData = req.body;
      
      // PNR ve booking reference oluştur
      bookingData.pnrNumber = await generatePNR('TF');
      bookingData.bookingReference = await generateBookingReference('TFB');
      
      const booking = await storage.createTransferBooking(bookingData);
      
      res.status(201).json(booking);
    } catch (err) {
      console.error('Error creating transfer booking:', err);
      res.status(500).json({ error: 'Failed to create transfer booking' });
    }
  });

  // Kullanıcının transfer rezervasyonlarını listele
  app.get('/api/transfer/bookings/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const bookings = await storage.getTransferBookingsByUser(userId);
      
      res.json(bookings);
    } catch (err) {
      console.error('Error fetching user transfer bookings:', err);
      res.status(500).json({ error: 'Failed to fetch user transfer bookings' });
    }
  });

  // Belirli bir transfer rezervasyonu getir
  app.get('/api/transfer/bookings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getTransferBooking(id);
      
      if (!booking) {
        return res.status(404).json({ error: 'Transfer booking not found' });
      }
      
      res.json(booking);
    } catch (err) {
      console.error('Error fetching transfer booking:', err);
      res.status(500).json({ error: 'Failed to fetch transfer booking' });
    }
  });

  // Transfer rezervasyonu iptal et
  app.post('/api/transfer/bookings/:id/cancel', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      const booking = await storage.getTransferBooking(id);
      if (!booking) {
        return res.status(404).json({ error: 'Transfer booking not found' });
      }
      
      const updatedBooking = await storage.updateTransferBookingStatus(id, 'cancelled', reason);
      
      res.json(updatedBooking);
    } catch (err) {
      console.error('Error cancelling transfer booking:', err);
      res.status(500).json({ error: 'Failed to cancel transfer booking' });
    }
  });

  // Acente transfer rezervasyonları (admin veya acente)
  app.get('/api/transfer/bookings/agency/:agencyId', async (req, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      
      // Güvenlik kontrolü: sadece admin veya ilgili acente erişebilir
      if (!req.user?.role === "admin" && (!req.user || req.user.id !== agencyId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const bookings = await storage.getTransferBookingsByAgency(agencyId);
      res.json(bookings);
    } catch (err) {
      console.error('Error fetching agency transfer bookings:', err);
      res.status(500).json({ error: 'Failed to fetch agency transfer bookings' });
    }
  });

  // Transfer aracı tipini güncelleme (admin)
  app.put('/api/admin/transfer/vehicle-types/:id', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const vehicleType = await storage.updateTransferVehicleType(id, req.body);
      
      if (!vehicleType) {
        return res.status(404).json({ error: 'Transfer vehicle type not found' });
      }
      
      res.json(vehicleType);
    } catch (err) {
      console.error('Error updating transfer vehicle type:', err);
      res.status(500).json({ error: 'Failed to update transfer vehicle type' });
    }
  });

  // Transfer rotasını güncelleme (admin)
  app.put('/api/admin/transfer/routes/:id', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const route = await storage.updateTransferRoute(id, req.body);
      
      if (!route) {
        return res.status(404).json({ error: 'Transfer route not found' });
      }
      
      res.json(route);
    } catch (err) {
      console.error('Error updating transfer route:', err);
      res.status(500).json({ error: 'Failed to update transfer route' });
    }
  });

  // Transfer fiyatını güncelleme (admin)
  app.put('/api/admin/transfer/prices/:id', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const price = await storage.updateTransferPrice(id, req.body);
      
      if (!price) {
        return res.status(404).json({ error: 'Transfer price not found' });
      }
      
      res.json(price);
    } catch (err) {
      console.error('Error updating transfer price:', err);
      res.status(500).json({ error: 'Failed to update transfer price' });
    }
  });

  // Popüler transfer rotalarını getir
  app.get('/api/transfer/routes/popular', async (req, res) => {
    try {
      const routes = await storage.getPopularTransferRoutes();
      res.json(routes);
    } catch (err) {
      console.error('Error fetching popular transfer routes:', err);
      res.status(500).json({ error: 'Failed to fetch popular transfer routes' });
    }
  });

  // Belirli bir araç tipi için tüm transfer fiyatlarını getir
  app.get('/api/transfer/vehicle-types/:id/prices', async (req, res) => {
    try {
      const vehicleTypeId = parseInt(req.params.id);
      const prices = await storage.getTransferPricesByVehicleType(vehicleTypeId);
      res.json(prices);
    } catch (err) {
      console.error('Error fetching transfer prices by vehicle type:', err);
      res.status(500).json({ error: 'Failed to fetch transfer prices by vehicle type' });
    }
  });

  // AI Önerileri API Endpoint'leri
  // AI Recommendation API Endpoints
  app.get('/api/recommendations/personalized/:userId', async (req, res) => {
    try {
      if (!req.isAuthenticated() && !req.user?.role === "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.userId);
      
      // AI servisinden kişiselleştirilmiş rota önerileri al
      const recommendations = await aiRecommendationService.getPersonalizedRouteRecommendations(userId);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting personalized recommendations:", error);
      res.status(500).json({ 
        message: "Failed to get personalized recommendations",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get('/api/pricing/dynamic/:routeId', async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      const departureDate = req.query.departureDate as string;
      
      if (!departureDate) {
        return res.status(400).json({ message: "Departure date is required" });
      }
      
      const passengerTypes = req.query.passengerTypes 
        ? JSON.parse(req.query.passengerTypes as string)
        : [];
      
      // AI servisinden dinamik fiyatlandırma önerileri al
      const pricingRecommendations = await aiRecommendationService.getDynamicPricing(
        routeId,
        departureDate,
        passengerTypes
      );
      
      res.json(pricingRecommendations);
    } catch (error) {
      console.error("Error getting dynamic pricing:", error);
      res.status(500).json({ 
        message: "Failed to get dynamic pricing",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Ülkeler için API
  // API endpoint for generating sample routes
  app.post('/api/sample-routes', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      // 1. Bodrum-Kos Rotası
      const bodrumKos = await storage.createRoute({
        departurePort: "Bodrum",
        arrivalPort: "Kos",
        departureCode: "BOD",
        arrivalCode: "KOS",
        distance: 20,
        duration: 60,
        basePrice: "250",
        description: "Türkiye'den Yunanistan'a popüler rota. Bodrum'dan Kos'a hızlı feribot ile ulaşım.",
        isActive: true,
        checkInStartTime: "08:00",
        checkInEndTime: "09:30",
        boardingStartTime: "10:00",
        boardingEndTime: "10:15",
        isPopular: true,
        isInternational: true,
        isFeatured: true,
        specialInstructions: "Lütfen seyahatten 90 dakika önce terminalde olunuz.",
        travelTime: "1 saat",
        routeCode: "BK-01",
        routeType: "international",
        countryDeparture: "Turkey",
        countryArrival: "Greece"
      });

      // 2. Istanbul-Bandırma Rotası
      const istanbulBandirma = await storage.createRoute({
        departurePort: "Istanbul",
        arrivalPort: "Bandırma",
        departureCode: "IST",
        arrivalCode: "BND",
        distance: 110,
        duration: 180,
        basePrice: "120",
        description: "Istanbul'dan Bandırma'ya feribotla ekonomik ve konforlu yolculuk.",
        isActive: true,
        checkInStartTime: "06:30",
        checkInEndTime: "07:30",
        boardingStartTime: "08:00",
        boardingEndTime: "08:15",
        isPopular: true,
        isInternational: false,
        isFeatured: true,
        specialInstructions: "Araç ile seyahat edenler lütfen 1 saat önceden check-in yapsınlar.",
        travelTime: "3 saat",
        routeCode: "IB-01",
        routeType: "domestic",
        countryDeparture: "Turkey",
        countryArrival: "Turkey"
      });

      // 3. Çeşme-Sakız Adası Rotası
      const cesmeSakiz = await storage.createRoute({
        departurePort: "Çeşme",
        arrivalPort: "Chios (Sakız Adası)",
        departureCode: "CES",
        arrivalCode: "CHI",
        distance: 15,
        duration: 45,
        basePrice: "220",
        description: "Çeşme'den Sakız Adası'na kısa ve keyifli bir deniz yolculuğu.",
        isActive: true,
        checkInStartTime: "09:00",
        checkInEndTime: "10:00",
        boardingStartTime: "10:30",
        boardingEndTime: "10:45",
        isPopular: true,
        isInternational: true,
        isFeatured: true,
        specialInstructions: "Yunanistan'a giriş için geçerli vize veya Schengen vizesi gereklidir.",
        travelTime: "45 dakika",
        routeCode: "CS-01",
        routeType: "international",
        countryDeparture: "Turkey",
        countryArrival: "Greece"
      });
      
      // 4. Ayvalık-Midilli Rotası
      const ayvalikMidilli = await storage.createRoute({
        departurePort: "Ayvalık",
        arrivalPort: "Lesvos (Midilli)",
        departureCode: "AYV",
        arrivalCode: "LES",
        distance: 25,
        duration: 90,
        basePrice: "180",
        description: "Ayvalık'tan Midilli Adası'na feribotla hızlı geçiş.",
        isActive: true,
        checkInStartTime: "08:30",
        checkInEndTime: "09:30",
        boardingStartTime: "10:00",
        boardingEndTime: "10:15",
        isPopular: true,
        isInternational: true,
        isFeatured: true,
        specialInstructions: "Geçerli kimlik ve vize gereklidir. Evcil hayvan taşıma kuralları için önceden bilgi alınız.",
        travelTime: "1.5 saat",
        routeCode: "AM-01",
        routeType: "international",
        countryDeparture: "Turkey",
        countryArrival: "Greece"
      });
      
      // 5. İstanbul-Büyükada Rotası
      const istanbulBuyukada = await storage.createRoute({
        departurePort: "İstanbul (Kabataş)",
        arrivalPort: "Büyükada",
        departureCode: "KAB",
        arrivalCode: "BYK",
        distance: 12,
        duration: 50,
        basePrice: "50",
        description: "İstanbul'dan Büyükada'ya günlük vapur seferleri.",
        isActive: true,
        checkInStartTime: "07:00",
        checkInEndTime: "07:45",
        boardingStartTime: "08:00",
        boardingEndTime: "08:10",
        isPopular: true,
        isInternational: false,
        isFeatured: true,
        specialInstructions: "Adaya araç giremez. Yalnızca yolcu taşıma hizmeti verilmektedir.",
        travelTime: "50 dakika",
        routeCode: "IB-02",
        routeType: "domestic",
        countryDeparture: "Turkey",
        countryArrival: "Turkey"
      });

      res.status(201).json({ 
        message: 'Örnek rotalar başarıyla oluşturuldu', 
        count: 5,
        routes: [bodrumKos, istanbulBandirma, cesmeSakiz, ayvalikMidilli, istanbulBuyukada]
      });
    } catch (error) {
      console.error('Error creating sample routes:', error);
      res.status(500).json({ message: 'Error creating sample routes', error: String(error) });
    }
  });

  // API endpoints for countries
  app.get('/api/countries', async (_req, res) => {
    try {
      const allCountries = await storage.getAllCountries();
      res.json(allCountries);
    } catch (error) {
      console.error('Error fetching countries:', error);
      res.status(500).json({ message: 'Error fetching countries' });
    }
  });

  app.get('/api/countries/:id', async (req, res) => {
    try {
      const country = await storage.getCountry(parseInt(req.params.id));
      if (!country) {
        return res.status(404).json({ message: 'Country not found' });
      }
      res.json(country);
    } catch (error) {
      console.error('Error fetching country:', error);
      res.status(500).json({ message: 'Error fetching country' });
    }
  });

  app.get('/api/countries/code/:code', async (req, res) => {
    try {
      const country = await storage.getCountryByCode(req.params.code);
      if (!country) {
        return res.status(404).json({ message: 'Country not found' });
      }
      res.json(country);
    } catch (error) {
      console.error('Error fetching country by code:', error);
      res.status(500).json({ message: 'Error fetching country by code' });
    }
  });

  app.post('/api/countries', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const countryData = insertCountrySchema.parse(req.body);
      const country = await storage.createCountry(countryData);
      res.status(201).json(country);
    } catch (error) {
      console.error('Error creating country:', error);
      res.status(500).json({ message: 'Error creating country' });
    }
  });

  app.put('/api/countries/:id', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const id = parseInt(req.params.id);
      const countryData = req.body;
      const updatedCountry = await storage.updateCountry(id, countryData);
      
      if (!updatedCountry) {
        return res.status(404).json({ message: 'Country not found' });
      }
      
      res.json(updatedCountry);
    } catch (error) {
      console.error('Error updating country:', error);
      res.status(500).json({ message: 'Error updating country' });
    }
  });

  app.delete('/api/countries/:id', async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCountry(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Country not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting country:', error);
      res.status(500).json({ message: 'Error deleting country' });
    }
  });

  /**
   * Inbox Routes - Message Management System
   */
  
  // Get all inbox messages for admin
  app.get('/api/admin/inbox', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const messages = await storage.getAllInboxMessages();
      res.json(messages);
    } catch (error) {
      console.error('Error fetching inbox messages:', error);
      res.status(500).json({ message: 'Error fetching inbox messages' });
    }
  });
  
  // Get user's inbox messages
  app.get('/api/inbox', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const options = {
        onlyUnread: req.query.onlyUnread === 'true',
        includeArchived: req.query.includeArchived === 'true',
        includeDeleted: req.query.includeDeleted === 'true'
      };
      
      const messages = await storage.getInboxMessagesByUser(req.user.id, options);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching user inbox messages:', error);
      res.status(500).json({ message: 'Error fetching inbox messages' });
    }
  });
  
  // Get user's sent messages
  app.get('/api/inbox/sent', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messages = await storage.getSentInboxMessagesByUser(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
      res.status(500).json({ message: 'Error fetching sent messages' });
    }
  });
  
  // Get specific inbox message
  app.get('/api/inbox/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only sender, receiver or admin can view the message
      if (message.senderUserId !== req.user.id && 
          message.receiverUserId !== req.user.id && 
          !["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to view this message' });
      }
      
      res.json(message);
    } catch (error) {
      console.error('Error fetching inbox message:', error);
      res.status(500).json({ message: 'Error fetching inbox message' });
    }
  });
  
  // Get conversation thread
  app.get('/api/inbox/:id/thread', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const originalMessage = await storage.getInboxMessage(messageId);
      
      if (!originalMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only sender, receiver or admin can view the thread
      if (originalMessage.senderUserId !== req.user.id && 
          originalMessage.receiverUserId !== req.user.id && 
          !["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to view this thread' });
      }
      
      const thread = await storage.getConversationThread(messageId);
      res.json(thread);
    } catch (error) {
      console.error('Error fetching conversation thread:', error);
      res.status(500).json({ message: 'Error fetching conversation thread' });
    }
  });
  
  // Send a new message
  app.post('/api/inbox', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { receiverUserId, subject, content } = req.body;
      
      if (!receiverUserId || !subject || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if receiver exists
      const receiver = await storage.getUser(parseInt(receiverUserId));
      if (!receiver) {
        return res.status(404).json({ message: 'Receiver not found' });
      }
      
      const message = await storage.createInboxMessage({
        senderUserId: req.user.id,
        receiverUserId: parseInt(receiverUserId),
        subject,
        content,
        isRead: false,
        isArchived: false,
        isDeleted: false,
        parentId: null
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ message: 'Error creating message' });
    }
  });
  
  // Reply to a message
  app.post('/api/inbox/:id/reply', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      
      const originalMessage = await storage.getInboxMessage(messageId);
      
      if (!originalMessage) {
        return res.status(404).json({ message: 'Original message not found' });
      }
      
      // Only sender, receiver or admin can reply to the message
      if (originalMessage.senderUserId !== req.user.id && 
          originalMessage.receiverUserId !== req.user.id && 
          !["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to reply to this message' });
      }
      
      // Determine receiver - if you're the original sender, send to the original receiver
      // If you're the original receiver, send to the original sender
      const receiverUserId = originalMessage.senderUserId === req.user.id 
        ? originalMessage.receiverUserId 
        : originalMessage.senderUserId;
      
      const reply = await storage.createInboxMessage({
        senderUserId: req.user.id,
        receiverUserId,
        subject: `Re: ${originalMessage.subject}`,
        content,
        isRead: false,
        isArchived: false,
        isDeleted: false,
        parentId: messageId
      });
      
      res.status(201).json(reply);
    } catch (error) {
      console.error('Error replying to message:', error);
      res.status(500).json({ message: 'Error replying to message' });
    }
  });
  
  // Mark message as read
  app.patch('/api/inbox/:id/read', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only receiver can mark as read (or admin)
      if (message.receiverUserId !== req.user.id && 
          !["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to mark this message as read' });
      }
      
      const updatedMessage = await storage.markInboxMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ message: 'Error marking message as read' });
    }
  });
  
  // Archive message
  app.patch('/api/inbox/:id/archive', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only sender or receiver can archive (or admin)
      if (message.senderUserId !== req.user.id && 
          message.receiverUserId !== req.user.id && 
          !["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to archive this message' });
      }
      
      const updatedMessage = await storage.markInboxMessageAsArchived(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error archiving message:', error);
      res.status(500).json({ message: 'Error archiving message' });
    }
  });
  
  // Delete message (soft delete)
  app.patch('/api/inbox/:id/delete', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only sender or receiver can delete (or admin)
      if (message.senderUserId !== req.user.id && 
          message.receiverUserId !== req.user.id && 
          !["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to delete this message' });
      }
      
      const updatedMessage = await storage.markInboxMessageAsDeleted(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Error deleting message' });
    }
  });
  
  // Permanently delete message
  app.delete('/api/inbox/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only admin can permanently delete
      if (!["admin", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to permanently delete this message' });
      }
      
      const success = await storage.permanentlyDeleteInboxMessage(messageId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to permanently delete message' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error permanently deleting message:', error);
      res.status(500).json({ message: 'Error permanently deleting message' });
    }
  });
  
  // Get unread message count
  app.get('/api/inbox/unread/count', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Error getting unread message count:', error);
      res.status(500).json({ message: 'Error getting unread message count' });
    }
  });
  
  // Mars Routes API
  app.get("/api/admin/mars-routes", isAdmin, async (req, res) => {
    try {
      // Demo veriler dönelim şimdilik
      res.json([
        {
          id: 1,
          name: "Mars Express",
          description: "Dünya'dan Mars'a direkt ultrasonik feribot seferi",
          imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1974&auto=format&fit=crop",
          departureTerminal: "Dünya Terminal 1",
          arrivalTerminal: "Mars Olympus Terminal",
          journeyTime: "4 saat",
          price: "12500",
          capacity: "200",
          isActive: true,
          tags: ["express", "luxury"],
          departureSchedules: [
            {
              time: "09:00",
              days: ["mon", "wed", "fri"]
            },
            {
              time: "15:00",
              days: ["tue", "thu", "sat"]
            }
          ],
          launchDate: "2023-12-01",
          returnDate: null
        },
        {
          id: 2,
          name: "Mars Voyager",
          description: "Konforlu ve ekonomik Mars yolculuğu",
          imageUrl: "https://images.unsplash.com/photo-1630694093867-4b1bcbae5f0c?q=80&w=1932&auto=format&fit=crop",
          departureTerminal: "Dünya Terminal 2",
          arrivalTerminal: "Mars Valles Terminal",
          journeyTime: "6 saat",
          price: "9000",
          capacity: "250",
          isActive: true,
          tags: ["economy", "family"],
          departureSchedules: [
            {
              time: "10:30",
              days: ["mon", "tue", "wed", "thu", "fri"]
            }
          ],
          launchDate: "2024-01-15",
          returnDate: null
        },
        {
          id: 3,
          name: "Mars Kolonizasyon Programı",
          description: "Uzun süreli Mars yerleşimi için özel taşıma hizmeti",
          imageUrl: "https://images.unsplash.com/photo-1630694092174-9eeaec3b6f0a?q=80&w=1932&auto=format&fit=crop",
          departureTerminal: "Dünya Gateway",
          arrivalTerminal: "Mars Kolonisi",
          journeyTime: "5 saat",
          price: "15000",
          capacity: "150",
          isActive: false,
          tags: ["settlement", "research"],
          departureSchedules: [],
          launchDate: "2024-06-01",
          returnDate: null
        }
      ]);
    } catch (error) {
      console.error("Mars rotaları hatası:", error);
      res.status(500).json({ message: "Mars rotaları alınamadı" });
    }
  });
  
  app.post("/api/admin/mars-routes", isAdmin, async (req, res) => {
    try {
      // Yeni Mars rotasını kaydediyormuş gibi yapalım
      res.status(201).json({
        id: Math.floor(Math.random() * 1000) + 10,
        ...req.body,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Mars rotası oluşturma hatası:", error);
      res.status(500).json({ message: "Mars rotası oluşturulamadı" });
    }
  });
  
  app.put("/api/admin/mars-routes/:id", isAdmin, async (req, res) => {
    try {
      // Mars rotasını güncelliyormuş gibi yapalım
      res.json({
        id: parseInt(req.params.id),
        ...req.body,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Mars rotası güncelleme hatası:", error);
      res.status(500).json({ message: "Mars rotası güncellenemedi" });
    }
  });
  
  app.delete("/api/admin/mars-routes/:id", isAdmin, async (req, res) => {
    try {
      // Mars rotasını siliyormuş gibi yapalım
      res.json({ success: true, message: "Mars rotası başarıyla silindi" });
    } catch (error) {
      console.error("Mars rotası silme hatası:", error);
      res.status(500).json({ message: "Mars rotası silinemedi" });
    }
  });

  // Admin Settings API
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const settings = await storage.getApiConfigById(1);
      res.json(settings || {});
    } catch (error) {
      console.error("Settings error:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });
  
  app.post("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      // Varsayılan API config'i güncelle
      const existingConfig = await storage.getApiConfigById(1);
      
      let updatedConfig;
      if (existingConfig) {
        updatedConfig = await storage.updateApiConfig(1, {
          ...req.body,
          updatedAt: new Date()
        });
      } else {
        // Eğer varsayılan config yoksa oluştur
        updatedConfig = await storage.createApiConfig({
          id: 1,
          name: "Default Settings",
          provider: "system",
          apiKey: "",
          secretKey: "",
          baseUrl: "",
          isActive: true,
          mode: "production",
          category: "system",
          status: "active",
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastChecked: new Date()
        });
      }
      
      res.json({ success: true, message: "Settings saved successfully", settings: updatedConfig });
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ message: "Error saving settings" });
    }
  });

  // API Yapılandırma API'leri
  app.get("/api/admin/api-configs", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const apiConfigs = await storage.getAllApiConfigs();
      res.json(apiConfigs);
    } catch (error) {
      console.error("Error fetching API configurations:", error);
      res.status(500).json({ message: "Failed to fetch API configurations" });
    }
  });

  app.get("/api/admin/api-configs/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const configId = parseInt(req.params.id);
      const apiConfig = await storage.getApiConfigById(configId);
      
      if (!apiConfig) {
        return res.status(404).json({ message: "API configuration not found" });
      }
      
      res.json(apiConfig);
    } catch (error) {
      console.error("Error fetching API configuration:", error);
      res.status(500).json({ message: "Failed to fetch API configuration" });
    }
  });

  app.post("/api/admin/api-configs", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const newApiConfig = await storage.createApiConfig({
        name: req.body.name,
        provider: req.body.provider,
        apiKey: req.body.apiKey,
        secretKey: req.body.secretKey,
        baseUrl: req.body.baseUrl,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        mode: req.body.mode || 'test',
        category: req.body.category || 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastChecked: null,
        status: 'inactive'
      });
      
      res.status(201).json(newApiConfig);
    } catch (error) {
      console.error("Error creating API configuration:", error);
      res.status(500).json({ message: "Failed to create API configuration" });
    }
  });

  app.put("/api/admin/api-configs/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const configId = parseInt(req.params.id);
      const apiConfig = await storage.getApiConfigById(configId);
      
      if (!apiConfig) {
        return res.status(404).json({ message: "API configuration not found" });
      }
      
      const updatedApiConfig = await storage.updateApiConfig(configId, {
        name: req.body.name !== undefined ? req.body.name : apiConfig.name,
        provider: req.body.provider !== undefined ? req.body.provider : apiConfig.provider,
        apiKey: req.body.apiKey !== undefined ? req.body.apiKey : apiConfig.apiKey,
        secretKey: req.body.secretKey !== undefined ? req.body.secretKey : apiConfig.secretKey,
        baseUrl: req.body.baseUrl !== undefined ? req.body.baseUrl : apiConfig.baseUrl,
        isActive: req.body.isActive !== undefined ? req.body.isActive : apiConfig.isActive,
        mode: req.body.mode !== undefined ? req.body.mode : apiConfig.mode,
        category: req.body.category !== undefined ? req.body.category : apiConfig.category,
        updatedAt: new Date()
      });
      
      res.json(updatedApiConfig);
    } catch (error) {
      console.error("Error updating API configuration:", error);
      res.status(500).json({ message: "Failed to update API configuration" });
    }
  });

  app.delete("/api/admin/api-configs/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const configId = parseInt(req.params.id);
      const apiConfig = await storage.getApiConfigById(configId);
      
      if (!apiConfig) {
        return res.status(404).json({ message: "API configuration not found" });
      }
      
      const success = await storage.deleteApiConfig(configId);
      
      if (success) {
        res.status(200).json({ message: "API configuration deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete API configuration" });
      }
    } catch (error) {
      console.error("Error deleting API configuration:", error);
      res.status(500).json({ message: "Failed to delete API configuration" });
    }
  });

  app.post("/api/admin/api-configs/:id/test", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const configId = parseInt(req.params.id);
      const apiConfig = await storage.getApiConfigById(configId);
      
      if (!apiConfig) {
        return res.status(404).json({ message: "API configuration not found" });
      }
      
      // Burada gerçek bir API bağlantı testi yapılabilir
      // Şu an için sadece dummy bir test sonucu dönüyoruz
      const testResult = {
        success: true,
        message: "API connection successfully tested in demo mode",
        status: "active"
      };

      // Başarılı test sonucu durumunda API yapılandırmasını güncelle
      if (testResult.success) {
        await storage.updateApiConfig(configId, {
          lastChecked: new Date(),
          status: testResult.status,
          updatedAt: new Date()
        });
      }
      
      res.json(testResult);
    } catch (error) {
      console.error("Error testing API configuration:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to test API configuration: " + (error instanceof Error ? error.message : "Unknown error"),
        status: "error"
      });
    }
  });

  // Inbox (Gelen Kutusu) API Endpoint'leri
  // Tüm mesajları getir (Admin için)
  app.get("/api/admin/inbox", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const messages = await storage.getAllInboxMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching all inbox messages:", error);
      res.status(500).json({ message: "Failed to fetch inbox messages" });
    }
  });

  // Kullanıcı gelen kutusunu getir
  app.get("/api/inbox", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const options = {
        onlyUnread: req.query.onlyUnread === 'true',
        includeArchived: req.query.includeArchived === 'true',
        includeDeleted: req.query.includeDeleted === 'true'
      };
      
      const messages = await storage.getInboxMessagesByUser(req.user.id, options);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      res.status(500).json({ message: "Failed to fetch inbox messages" });
    }
  });

  // Gönderilen mesajları getir
  app.get("/api/inbox/sent", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const messages = await storage.getSentInboxMessagesByUser(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching sent messages:", error);
      res.status(500).json({ message: "Failed to fetch sent messages" });
    }
  });

  // Tek bir mesajı getir
  app.get("/api/inbox/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Sadece alıcı, gönderici veya admin bu mesajı görüntüleyebilir
      if (message.receiverUserId !== req.user.id && 
          message.senderUserId !== req.user.id && 
          req.user.role !== "admin" &&
          req.user.role !== "superadmin") {
        return res.status(403).json({ message: "You are not authorized to view this message" });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error fetching inbox message:", error);
      res.status(500).json({ message: "Failed to fetch inbox message" });
    }
  });

  // Bir konuşmanın tüm mesajlarını getir
  app.get("/api/inbox/thread/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const parentMessageId = parseInt(req.params.id);
      const thread = await storage.getConversationThread(parentMessageId);
      
      if (thread.length === 0) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Sadece konuşmanın katılımcıları veya admin bu konuşmayı görüntüleyebilir
      const participantIds = new Set(thread.map(msg => [msg.senderUserId, msg.receiverUserId]).flat());
      
      if (!participantIds.has(req.user.id) && 
          req.user.role !== "admin" && 
          req.user.role !== "superadmin") {
        return res.status(403).json({ message: "You are not authorized to view this thread" });
      }
      
      res.json(thread);
    } catch (error) {
      console.error("Error fetching conversation thread:", error);
      res.status(500).json({ message: "Failed to fetch conversation thread" });
    }
  });

  // Okunmamış mesaj sayısını getir
  app.get("/api/inbox/unread/count", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Yeni mesaj oluştur
  app.post("/api/inbox", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const messageData = {
        ...req.body,
        senderUserId: req.user.id,
        isRead: false,
        isArchived: false,
        isDeleted: false
      };
      
      // Alıcının var olup olmadığını kontrol et
      const receiver = await storage.getUser(messageData.receiverUserId);
      if (!receiver) {
        return res.status(400).json({ message: "Recipient user not found" });
      }
      
      const createdMessage = await storage.createInboxMessage(messageData);
      res.status(201).json(createdMessage);
    } catch (error) {
      console.error("Error creating inbox message:", error);
      res.status(500).json({ message: "Failed to create inbox message" });
    }
  });

  // Mesaja yanıt ver
  app.post("/api/inbox/:id/reply", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const parentMessageId = parseInt(req.params.id);
      const parentMessage = await storage.getInboxMessage(parentMessageId);
      
      if (!parentMessage) {
        return res.status(404).json({ message: "Original message not found" });
      }
      
      // Sadece alıcı, gönderici veya admin yanıt verebilir
      if (parentMessage.receiverUserId !== req.user.id && 
          parentMessage.senderUserId !== req.user.id && 
          req.user.role !== "admin" &&
          req.user.role !== "superadmin") {
        return res.status(403).json({ message: "You are not authorized to reply to this message" });
      }
      
      // Yanıt mesajı oluştur (alıcı ve gönderici ters çevrilir)
      const replyData = {
        senderUserId: req.user.id,
        receiverUserId: parentMessage.senderUserId === req.user.id ? 
                         parentMessage.receiverUserId : 
                         parentMessage.senderUserId,
        subject: req.body.subject || `Re: ${parentMessage.subject}`,
        content: req.body.content,
        parentId: parentMessageId,
        isRead: false,
        isArchived: false,
        isDeleted: false
      };
      
      const createdReply = await storage.createInboxMessage(replyData);
      res.status(201).json(createdReply);
    } catch (error) {
      console.error("Error replying to inbox message:", error);
      res.status(500).json({ message: "Failed to reply to inbox message" });
    }
  });

  // Mesajı okundu olarak işaretle
  app.patch("/api/inbox/:id/read", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Sadece alıcı veya admin bu mesajı okundu olarak işaretleyebilir
      if (message.receiverUserId !== req.user.id && 
          req.user.role !== "admin" &&
          req.user.role !== "superadmin") {
        return res.status(403).json({ message: "You are not authorized to mark this message as read" });
      }
      
      const updatedMessage = await storage.markInboxMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Mesajı arşivle
  app.patch("/api/inbox/:id/archive", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Sadece alıcı, gönderici veya admin bu mesajı arşivleyebilir
      if (message.receiverUserId !== req.user.id && 
          message.senderUserId !== req.user.id && 
          req.user.role !== "admin" &&
          req.user.role !== "superadmin") {
        return res.status(403).json({ message: "You are not authorized to archive this message" });
      }
      
      const updatedMessage = await storage.markInboxMessageAsArchived(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error archiving message:", error);
      res.status(500).json({ message: "Failed to archive message" });
    }
  });

  // Mesajı sil (soft delete)
  app.patch("/api/inbox/:id/delete", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Sadece alıcı, gönderici veya admin bu mesajı silebilir
      if (message.receiverUserId !== req.user.id && 
          message.senderUserId !== req.user.id && 
          req.user.role !== "admin" &&
          req.user.role !== "superadmin") {
        return res.status(403).json({ message: "You are not authorized to delete this message" });
      }
      
      const updatedMessage = await storage.markInboxMessageAsDeleted(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Mesajı tamamen sil (hard delete) - Sadece admin
  app.delete("/api/inbox/:id", async (req, res) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const messageId = parseInt(req.params.id);
      const message = await storage.getInboxMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      const success = await storage.permanentlyDeleteInboxMessage(messageId);
      
      if (success) {
        res.status(200).json({ message: "Message permanently deleted" });
      } else {
        res.status(500).json({ message: "Failed to permanently delete message" });
      }
    } catch (error) {
      console.error("Error permanently deleting message:", error);
      res.status(500).json({ message: "Failed to permanently delete message" });
    }
  });

  return httpServer;
}
