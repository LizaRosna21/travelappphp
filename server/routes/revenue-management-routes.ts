import express from "express";
import { revenueManagement } from "../services/revenue-management";
import { isAdmin } from "../auth";
import { z } from "zod";
import {
  insertPricingRuleSchema,
  insertSpecialEventSchema,
  insertDemandForecastSchema,
  insertPriceRecommendationSchema,
  insertCompetitorPriceSchema,
  insertRevenueAnalyticSchema,
  insertYeildManagementSettingSchema
} from "@shared/schema";

const router = express.Router();

// Middleware to check if user is admin or revenue manager
const isRevenueManager = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
  }
  
  if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'revenue_manager') {
    return next();
  }
  
  return res.status(403).json({ error: "Bu işlem için yetkili değilsiniz" });
};

// ========================== PRICING RULES ==========================

// Tüm fiyatlandırma kurallarını getir
router.get("/pricing-rules", isRevenueManager, async (req, res) => {
  try {
    const rules = await revenueManagement.getAllPricingRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: "Fiyatlandırma kuralları alınırken bir hata oluştu" });
  }
});

// Belirli bir fiyatlandırma kuralını getir
router.get("/pricing-rules/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rule = await revenueManagement.getPricingRuleById(id);
    
    if (!rule) {
      return res.status(404).json({ error: "Fiyatlandırma kuralı bulunamadı" });
    }
    
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: "Fiyatlandırma kuralı alınırken bir hata oluştu" });
  }
});

// Rotaya göre fiyatlandırma kurallarını getir
router.get("/routes/:routeId/pricing-rules", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const rules = await revenueManagement.getPricingRulesByRouteId(routeId);
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: "Rota fiyatlandırma kuralları alınırken bir hata oluştu" });
  }
});

// Yeni fiyatlandırma kuralı oluştur
router.post("/pricing-rules", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertPricingRuleSchema.parse(req.body);
    const newRule = await revenueManagement.createPricingRule(validatedData);
    res.status(201).json(newRule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Fiyatlandırma kuralı oluşturulurken bir hata oluştu" });
  }
});

// Fiyatlandırma kuralını güncelle
router.put("/pricing-rules/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertPricingRuleSchema.partial().parse(req.body);
    
    const updatedRule = await revenueManagement.updatePricingRule(id, validatedData);
    res.json(updatedRule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Fiyatlandırma kuralı güncellenirken bir hata oluştu" });
  }
});

// Fiyatlandırma kuralını sil
router.delete("/pricing-rules/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await revenueManagement.deletePricingRule(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Fiyatlandırma kuralı silinirken bir hata oluştu" });
  }
});

// ========================== SPECIAL EVENTS ==========================

// Tüm özel etkinlikleri getir
router.get("/special-events", isRevenueManager, async (req, res) => {
  try {
    const events = await revenueManagement.getAllSpecialEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Özel etkinlikler alınırken bir hata oluştu" });
  }
});

// Aktif özel etkinlikleri getir
router.get("/special-events/active", async (req, res) => {
  try {
    const events = await revenueManagement.getActiveSpecialEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Aktif etkinlikler alınırken bir hata oluştu" });
  }
});

// Belirli bir özel etkinliği getir
router.get("/special-events/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const event = await revenueManagement.getSpecialEventById(id);
    
    if (!event) {
      return res.status(404).json({ error: "Özel etkinlik bulunamadı" });
    }
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Özel etkinlik alınırken bir hata oluştu" });
  }
});

// Yeni özel etkinlik oluştur
router.post("/special-events", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertSpecialEventSchema.parse(req.body);
    const newEvent = await revenueManagement.createSpecialEvent(validatedData);
    res.status(201).json(newEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Özel etkinlik oluşturulurken bir hata oluştu" });
  }
});

// Özel etkinliği güncelle
router.put("/special-events/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertSpecialEventSchema.partial().parse(req.body);
    
    const updatedEvent = await revenueManagement.updateSpecialEvent(id, validatedData);
    res.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Özel etkinlik güncellenirken bir hata oluştu" });
  }
});

// Özel etkinliği sil
router.delete("/special-events/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await revenueManagement.deleteSpecialEvent(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Özel etkinlik silinirken bir hata oluştu" });
  }
});

// ========================== DEMAND FORECASTS ==========================

// Tüm talep tahminlerini getir
router.get("/demand-forecasts", isRevenueManager, async (req, res) => {
  try {
    const forecasts = await revenueManagement.getAllDemandForecasts();
    res.json(forecasts);
  } catch (error) {
    res.status(500).json({ error: "Talep tahminleri alınırken bir hata oluştu" });
  }
});

// Belirli bir talep tahmini getir
router.get("/demand-forecasts/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const forecast = await revenueManagement.getDemandForecastById(id);
    
    if (!forecast) {
      return res.status(404).json({ error: "Talep tahmini bulunamadı" });
    }
    
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: "Talep tahmini alınırken bir hata oluştu" });
  }
});

// Rotaya göre talep tahminlerini getir
router.get("/routes/:routeId/demand-forecasts", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const forecasts = await revenueManagement.getDemandForecastsByRouteId(routeId);
    res.json(forecasts);
  } catch (error) {
    res.status(500).json({ error: "Rota talep tahminleri alınırken bir hata oluştu" });
  }
});

// Tarih aralığına göre talep tahminlerini getir
router.get("/routes/:routeId/demand-forecasts/date-range", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Geçersiz tarih formatı" });
    }
    
    const forecasts = await revenueManagement.getDemandForecastsByDateRange(routeId, startDate, endDate);
    res.json(forecasts);
  } catch (error) {
    res.status(500).json({ error: "Tarih aralığı talep tahminleri alınırken bir hata oluştu" });
  }
});

// Yeni talep tahmini oluştur
router.post("/demand-forecasts", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertDemandForecastSchema.parse(req.body);
    const newForecast = await revenueManagement.createDemandForecast(validatedData);
    res.status(201).json(newForecast);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Talep tahmini oluşturulurken bir hata oluştu" });
  }
});

// Talep tahmini güncelle
router.put("/demand-forecasts/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertDemandForecastSchema.partial().parse(req.body);
    
    const updatedForecast = await revenueManagement.updateDemandForecast(id, validatedData);
    res.json(updatedForecast);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Talep tahmini güncellenirken bir hata oluştu" });
  }
});

// Talep tahminine gerçek değeri ekle
router.post("/demand-forecasts/:id/actual", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actualDemand } = req.body;
    
    if (typeof actualDemand !== 'number' || actualDemand < 0) {
      return res.status(400).json({ error: "Geçersiz talep değeri" });
    }
    
    const updatedForecast = await revenueManagement.updateDemandForecastWithActual(id, actualDemand);
    res.json(updatedForecast);
  } catch (error) {
    res.status(500).json({ error: "Gerçek talep değeri eklenirken bir hata oluştu" });
  }
});

// ========================== PRICE RECOMMENDATIONS ==========================

// Tüm fiyat önerilerini getir
router.get("/price-recommendations", isRevenueManager, async (req, res) => {
  try {
    const recommendations = await revenueManagement.getAllPriceRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Fiyat önerileri alınırken bir hata oluştu" });
  }
});

// Bekleyen fiyat önerilerini getir
router.get("/price-recommendations/pending", isRevenueManager, async (req, res) => {
  try {
    const recommendations = await revenueManagement.getPendingPriceRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Bekleyen fiyat önerileri alınırken bir hata oluştu" });
  }
});

// Belirli bir fiyat önerisi getir
router.get("/price-recommendations/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const recommendation = await revenueManagement.getPriceRecommendationById(id);
    
    if (!recommendation) {
      return res.status(404).json({ error: "Fiyat önerisi bulunamadı" });
    }
    
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: "Fiyat önerisi alınırken bir hata oluştu" });
  }
});

// Rotaya göre fiyat önerilerini getir
router.get("/routes/:routeId/price-recommendations", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const recommendations = await revenueManagement.getPriceRecommendationsByRouteId(routeId);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Rota fiyat önerileri alınırken bir hata oluştu" });
  }
});

// Sefere göre fiyat önerilerini getir
router.get("/schedules/:scheduleId/price-recommendations", isRevenueManager, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const recommendations = await revenueManagement.getPriceRecommendationsByScheduleId(scheduleId);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Sefer fiyat önerileri alınırken bir hata oluştu" });
  }
});

// Yeni fiyat önerisi oluştur
router.post("/price-recommendations", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertPriceRecommendationSchema.parse(req.body);
    const newRecommendation = await revenueManagement.createPriceRecommendation(validatedData);
    res.status(201).json(newRecommendation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Fiyat önerisi oluşturulurken bir hata oluştu" });
  }
});

// Fiyat önerisi güncelle
router.put("/price-recommendations/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertPriceRecommendationSchema.partial().parse(req.body);
    
    const updatedRecommendation = await revenueManagement.updatePriceRecommendation(id, validatedData);
    res.json(updatedRecommendation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Fiyat önerisi güncellenirken bir hata oluştu" });
  }
});

// Fiyat önerisini onayla
router.post("/price-recommendations/:id/approve", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    const updatedRecommendation = await revenueManagement.applyPriceRecommendation(id, req.user.id);
    res.json(updatedRecommendation);
  } catch (error) {
    res.status(500).json({ error: "Fiyat önerisi onaylanırken bir hata oluştu" });
  }
});

// Fiyat önerisini reddet
router.post("/price-recommendations/:id/reject", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ error: "Ret sebebi gereklidir" });
    }
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    }
    
    const updatedRecommendation = await revenueManagement.updatePriceRecommendation(id, {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: req.user.id,
      rejectionReason
    });
    
    res.json(updatedRecommendation);
  } catch (error) {
    res.status(500).json({ error: "Fiyat önerisi reddedilirken bir hata oluştu" });
  }
});

// ========================== COMPETITOR PRICES ==========================

// Tüm rakip fiyatlarını getir
router.get("/competitor-prices", isRevenueManager, async (req, res) => {
  try {
    const prices = await revenueManagement.getAllCompetitorPrices();
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: "Rakip fiyatları alınırken bir hata oluştu" });
  }
});

// Belirli bir rakip fiyatını getir
router.get("/competitor-prices/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const price = await revenueManagement.getCompetitorPriceById(id);
    
    if (!price) {
      return res.status(404).json({ error: "Rakip fiyatı bulunamadı" });
    }
    
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: "Rakip fiyatı alınırken bir hata oluştu" });
  }
});

// Rotaya göre rakip fiyatlarını getir
router.get("/routes/:routeId/competitor-prices", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const prices = await revenueManagement.getCompetitorPricesByRouteId(routeId);
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: "Rota rakip fiyatları alınırken bir hata oluştu" });
  }
});

// Yeni rakip fiyatı oluştur
router.post("/competitor-prices", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertCompetitorPriceSchema.parse(req.body);
    const newPrice = await revenueManagement.createCompetitorPrice(validatedData);
    res.status(201).json(newPrice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Rakip fiyatı oluşturulurken bir hata oluştu" });
  }
});

// Rakip fiyatı güncelle
router.put("/competitor-prices/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertCompetitorPriceSchema.partial().parse(req.body);
    
    const updatedPrice = await revenueManagement.updateCompetitorPrice(id, validatedData);
    res.json(updatedPrice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Rakip fiyatı güncellenirken bir hata oluştu" });
  }
});

// ========================== REVENUE ANALYTICS ==========================

// Tüm gelir analizlerini getir
router.get("/revenue-analytics", isRevenueManager, async (req, res) => {
  try {
    const analytics = await revenueManagement.getAllRevenueAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: "Gelir analizleri alınırken bir hata oluştu" });
  }
});

// Belirli bir gelir analizi getir
router.get("/revenue-analytics/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const analytic = await revenueManagement.getRevenueAnalyticById(id);
    
    if (!analytic) {
      return res.status(404).json({ error: "Gelir analizi bulunamadı" });
    }
    
    res.json(analytic);
  } catch (error) {
    res.status(500).json({ error: "Gelir analizi alınırken bir hata oluştu" });
  }
});

// Rotaya göre gelir analizlerini getir
router.get("/routes/:routeId/revenue-analytics", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const analytics = await revenueManagement.getRevenueAnalyticsByRouteId(routeId);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: "Rota gelir analizleri alınırken bir hata oluştu" });
  }
});

// Dönem tipine göre gelir analizlerini getir
router.get("/revenue-analytics/by-period/:periodType", isRevenueManager, async (req, res) => {
  try {
    const periodType = req.params.periodType;
    
    // Geçerli period tipi kontrolü
    const validPeriodTypes = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validPeriodTypes.includes(periodType)) {
      return res.status(400).json({ error: "Geçersiz dönem tipi" });
    }
    
    const analytics = await revenueManagement.getRevenueAnalyticsByPeriodType(periodType);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: "Dönem tipi gelir analizleri alınırken bir hata oluştu" });
  }
});

// Tarih aralığına göre gelir analizlerini getir
router.get("/revenue-analytics/by-date-range", isRevenueManager, async (req, res) => {
  try {
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Geçersiz tarih formatı" });
    }
    
    const analytics = await revenueManagement.getRevenueAnalyticsByDateRange(startDate, endDate);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: "Tarih aralığı gelir analizleri alınırken bir hata oluştu" });
  }
});

// Yeni gelir analizi oluştur
router.post("/revenue-analytics", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertRevenueAnalyticSchema.parse(req.body);
    const newAnalytic = await revenueManagement.createRevenueAnalytic(validatedData);
    res.status(201).json(newAnalytic);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Gelir analizi oluşturulurken bir hata oluştu" });
  }
});

// Gelir analizi güncelle
router.put("/revenue-analytics/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertRevenueAnalyticSchema.partial().parse(req.body);
    
    const updatedAnalytic = await revenueManagement.updateRevenueAnalytic(id, validatedData);
    res.json(updatedAnalytic);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Gelir analizi güncellenirken bir hata oluştu" });
  }
});

// ========================== YIELD MANAGEMENT SETTINGS ==========================

// Tüm gelir yönetimi ayarlarını getir
router.get("/yield-management-settings", isRevenueManager, async (req, res) => {
  try {
    const settings = await revenueManagement.getAllYeildManagementSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Gelir yönetimi ayarları alınırken bir hata oluştu" });
  }
});

// Belirli bir gelir yönetimi ayarını getir
router.get("/yield-management-settings/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const setting = await revenueManagement.getYeildManagementSettingById(id);
    
    if (!setting) {
      return res.status(404).json({ error: "Gelir yönetimi ayarı bulunamadı" });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Gelir yönetimi ayarı alınırken bir hata oluştu" });
  }
});

// Rotaya göre gelir yönetimi ayarını getir
router.get("/routes/:routeId/yield-management-settings", isRevenueManager, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const setting = await revenueManagement.getYeildManagementSettingByRouteId(routeId);
    
    if (!setting) {
      return res.status(404).json({ error: "Bu rota için gelir yönetimi ayarı bulunamadı" });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Rota gelir yönetimi ayarı alınırken bir hata oluştu" });
  }
});

// Global gelir yönetimi ayarlarını getir
router.get("/yield-management-settings/global", isRevenueManager, async (req, res) => {
  try {
    const setting = await revenueManagement.getGlobalYeildManagementSettings();
    
    if (!setting) {
      return res.status(404).json({ error: "Global gelir yönetimi ayarı bulunamadı" });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Global gelir yönetimi ayarı alınırken bir hata oluştu" });
  }
});

// Yeni gelir yönetimi ayarı oluştur
router.post("/yield-management-settings", isRevenueManager, async (req, res) => {
  try {
    const validatedData = insertYeildManagementSettingSchema.parse(req.body);
    
    // Eğer global ayar ise, mevcut global ayarı kontrol et
    if (validatedData.isGlobal) {
      const existingGlobal = await revenueManagement.getGlobalYeildManagementSettings();
      if (existingGlobal) {
        return res.status(400).json({ error: "Global gelir yönetimi ayarı zaten mevcut. Lütfen mevcut ayarı güncelleyin." });
      }
    }
    
    // Eğer rotaya özel ayar ise, mevcut rota ayarını kontrol et
    if (validatedData.routeId) {
      const existingRouteSetting = await revenueManagement.getYeildManagementSettingByRouteId(validatedData.routeId);
      if (existingRouteSetting) {
        return res.status(400).json({ error: "Bu rota için gelir yönetimi ayarı zaten mevcut. Lütfen mevcut ayarı güncelleyin." });
      }
    }
    
    const newSetting = await revenueManagement.createYeildManagementSetting(validatedData);
    res.status(201).json(newSetting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Gelir yönetimi ayarı oluşturulurken bir hata oluştu" });
  }
});

// Gelir yönetimi ayarını güncelle
router.put("/yield-management-settings/:id", isRevenueManager, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertYeildManagementSettingSchema.partial().parse(req.body);
    
    const updatedSetting = await revenueManagement.updateYeildManagementSetting(id, validatedData);
    res.json(updatedSetting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Gelir yönetimi ayarı güncellenirken bir hata oluştu" });
  }
});

// ========================== DYNAMIC PRICING ==========================

// Dinamik fiyat hesaplama
router.post("/dynamic-price-calculation", isRevenueManager, async (req, res) => {
  try {
    const { routeId, scheduleId, departureDate, basePrice } = req.body;
    
    if (!routeId || !scheduleId || !departureDate || !basePrice) {
      return res.status(400).json({ error: "routeId, scheduleId, departureDate ve basePrice alanları zorunludur" });
    }
    
    const departureDateObj = new Date(departureDate);
    if (isNaN(departureDateObj.getTime())) {
      return res.status(400).json({ error: "Geçersiz tarih formatı" });
    }
    
    const result = await revenueManagement.calculateDynamicPrice(
      parseInt(routeId),
      parseInt(scheduleId),
      departureDateObj,
      parseFloat(basePrice)
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Dinamik fiyat hesaplanırken bir hata oluştu" });
  }
});

// ========================== DASHBOARD ANALYTICS ==========================

// En yüksek gelirli rotaları getir
router.get("/dashboard/top-revenue-routes", isRevenueManager, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const routes = await revenueManagement.getTopRevenueRoutes(limit);
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: "En yüksek gelirli rotalar alınırken bir hata oluştu" });
  }
});

// En yüksek doluluk oranına sahip rotaları getir
router.get("/dashboard/top-occupancy-routes", isRevenueManager, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const routes = await revenueManagement.getTopOccupancyRoutes(limit);
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: "En yüksek doluluk oranına sahip rotalar alınırken bir hata oluştu" });
  }
});

export default router;