import { storage } from "../storage";
import { 
  PricingRule, InsertPricingRule, 
  SpecialEvent, InsertSpecialEvent,
  DemandForecast, InsertDemandForecast, 
  PriceRecommendation, InsertPriceRecommendation,
  CompetitorPrice, InsertCompetitorPrice,
  RevenueAnalytic, InsertRevenueAnalytic,
  YeildManagementSetting, InsertYeildManagementSetting
} from "@shared/schema";

/**
 * Revenue Management Service
 * 
 * Bu servis fiyat optimizasyonu ve gelir yönetimi işlemlerini işler:
 * - Fiyatlandırma kuralları (Pricing Rules)
 * - Özel etkinlikler (Special Events)
 * - Talep tahminleri (Demand Forecasts)
 * - Fiyat önerileri (Price Recommendations)
 * - Rakip fiyatları (Competitor Prices)
 * - Gelir analizleri (Revenue Analytics)
 * - Gelir yönetimi ayarları (Yield Management Settings)
 */
class RevenueManagementService {

  // ========================== PRICING RULES ==========================
  
  /**
   * Tüm fiyatlandırma kurallarını getir
   */
  async getAllPricingRules(): Promise<PricingRule[]> {
    return storage.pricingRules || [];
  }
  
  /**
   * Belirli bir fiyatlandırma kuralını getir
   * @param id Kural ID
   */
  async getPricingRuleById(id: number): Promise<PricingRule | undefined> {
    return storage.pricingRules?.find(rule => rule.id === id);
  }
  
  /**
   * Rotaya göre fiyatlandırma kurallarını getir
   * @param routeId Rota ID
   */
  async getPricingRulesByRouteId(routeId: number): Promise<PricingRule[]> {
    return storage.pricingRules?.filter(rule => 
      rule.routeId === routeId || rule.routeId === null
    ) || [];
  }
  
  /**
   * Belirli bir zamanda uygulanabilir kuralları getir
   * @param routeId Rota ID
   * @param date Tarih
   */
  async getApplicablePricingRules(routeId: number, date: Date): Promise<PricingRule[]> {
    const allRules = await this.getPricingRulesByRouteId(routeId);
    
    return allRules.filter(rule => {
      const startDate = rule.startDate ? new Date(rule.startDate) : null;
      const endDate = rule.endDate ? new Date(rule.endDate) : null;
      
      // Tarih kontrolü
      const isWithinDateRange = (!startDate || startDate <= date) && (!endDate || endDate >= date);
      
      // Kural etkin mi?
      const isActive = rule.isActive;
      
      return isWithinDateRange && isActive;
    });
  }
  
  /**
   * Yeni fiyatlandırma kuralı oluştur
   * @param data Kural verisi
   */
  async createPricingRule(data: InsertPricingRule): Promise<PricingRule> {
    const newId = storage.pricingRules ? Math.max(0, ...storage.pricingRules.map(r => r.id)) + 1 : 1;
    
    const newRule: PricingRule = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    
    if (!storage.pricingRules) {
      storage.pricingRules = [];
    }
    
    storage.pricingRules.push(newRule);
    return newRule;
  }
  
  /**
   * Fiyatlandırma kuralını güncelle
   * @param id Kural ID
   * @param data Güncellenecek veriler
   */
  async updatePricingRule(id: number, data: Partial<PricingRule>): Promise<PricingRule> {
    const ruleIndex = storage.pricingRules?.findIndex(rule => rule.id === id) ?? -1;
    
    if (ruleIndex === -1 || !storage.pricingRules) {
      throw new Error(`Fiyatlandırma kuralı bulunamadı: ID ${id}`);
    }
    
    const updatedRule = {
      ...storage.pricingRules[ruleIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.pricingRules[ruleIndex] = updatedRule;
    return updatedRule;
  }
  
  /**
   * Fiyatlandırma kuralını sil
   * @param id Kural ID
   */
  async deletePricingRule(id: number): Promise<void> {
    if (!storage.pricingRules) return;
    
    const ruleIndex = storage.pricingRules.findIndex(rule => rule.id === id);
    
    if (ruleIndex !== -1) {
      storage.pricingRules.splice(ruleIndex, 1);
    }
  }
  
  // ========================== SPECIAL EVENTS ==========================
  
  /**
   * Tüm özel etkinlikleri getir
   */
  async getAllSpecialEvents(): Promise<SpecialEvent[]> {
    return storage.specialEvents || [];
  }
  
  /**
   * Aktif özel etkinlikleri getir
   */
  async getActiveSpecialEvents(): Promise<SpecialEvent[]> {
    const now = new Date();
    return (storage.specialEvents || []).filter(event => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      return event.isActive && startDate <= now && endDate >= now;
    });
  }
  
  /**
   * Belirli bir özel etkinliği getir
   * @param id Etkinlik ID
   */
  async getSpecialEventById(id: number): Promise<SpecialEvent | undefined> {
    return storage.specialEvents?.find(event => event.id === id);
  }
  
  /**
   * Yeni özel etkinlik oluştur
   * @param data Etkinlik verisi
   */
  async createSpecialEvent(data: InsertSpecialEvent): Promise<SpecialEvent> {
    const newId = storage.specialEvents ? Math.max(0, ...storage.specialEvents.map(e => e.id)) + 1 : 1;
    
    const newEvent: SpecialEvent = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    
    if (!storage.specialEvents) {
      storage.specialEvents = [];
    }
    
    storage.specialEvents.push(newEvent);
    return newEvent;
  }
  
  /**
   * Özel etkinliği güncelle
   * @param id Etkinlik ID
   * @param data Güncellenecek veriler
   */
  async updateSpecialEvent(id: number, data: Partial<SpecialEvent>): Promise<SpecialEvent> {
    const eventIndex = storage.specialEvents?.findIndex(event => event.id === id) ?? -1;
    
    if (eventIndex === -1 || !storage.specialEvents) {
      throw new Error(`Özel etkinlik bulunamadı: ID ${id}`);
    }
    
    const updatedEvent = {
      ...storage.specialEvents[eventIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.specialEvents[eventIndex] = updatedEvent;
    return updatedEvent;
  }
  
  /**
   * Özel etkinliği sil
   * @param id Etkinlik ID
   */
  async deleteSpecialEvent(id: number): Promise<void> {
    if (!storage.specialEvents) return;
    
    const eventIndex = storage.specialEvents.findIndex(event => event.id === id);
    
    if (eventIndex !== -1) {
      storage.specialEvents.splice(eventIndex, 1);
    }
  }
  
  // ========================== DEMAND FORECASTS ==========================
  
  /**
   * Tüm talep tahminlerini getir
   */
  async getAllDemandForecasts(): Promise<DemandForecast[]> {
    return storage.demandForecasts || [];
  }
  
  /**
   * Belirli bir talep tahmini getir
   * @param id Tahmin ID
   */
  async getDemandForecastById(id: number): Promise<DemandForecast | undefined> {
    return storage.demandForecasts?.find(forecast => forecast.id === id);
  }
  
  /**
   * Rotaya göre talep tahminlerini getir
   * @param routeId Rota ID
   */
  async getDemandForecastsByRouteId(routeId: number): Promise<DemandForecast[]> {
    return storage.demandForecasts?.filter(forecast => forecast.routeId === routeId) || [];
  }
  
  /**
   * Tarih aralığına göre talep tahminlerini getir
   * @param routeId Rota ID
   * @param startDate Başlangıç tarihi
   * @param endDate Bitiş tarihi
   */
  async getDemandForecastsByDateRange(routeId: number, startDate: Date, endDate: Date): Promise<DemandForecast[]> {
    return (storage.demandForecasts || []).filter(forecast => {
      const forecastDate = new Date(forecast.forecastDate);
      return forecast.routeId === routeId && forecastDate >= startDate && forecastDate <= endDate;
    });
  }
  
  /**
   * Yeni talep tahmini oluştur
   * @param data Tahmin verisi
   */
  async createDemandForecast(data: InsertDemandForecast): Promise<DemandForecast> {
    const newId = storage.demandForecasts ? Math.max(0, ...storage.demandForecasts.map(f => f.id)) + 1 : 1;
    
    const newForecast: DemandForecast = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      actualDemand: null,
      accuracy: null,
      ...data
    };
    
    if (!storage.demandForecasts) {
      storage.demandForecasts = [];
    }
    
    storage.demandForecasts.push(newForecast);
    return newForecast;
  }
  
  /**
   * Talep tahmini güncelle
   * @param id Tahmin ID
   * @param data Güncellenecek veriler
   */
  async updateDemandForecast(id: number, data: Partial<DemandForecast>): Promise<DemandForecast> {
    const forecastIndex = storage.demandForecasts?.findIndex(forecast => forecast.id === id) ?? -1;
    
    if (forecastIndex === -1 || !storage.demandForecasts) {
      throw new Error(`Talep tahmini bulunamadı: ID ${id}`);
    }
    
    const updatedForecast = {
      ...storage.demandForecasts[forecastIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.demandForecasts[forecastIndex] = updatedForecast;
    return updatedForecast;
  }
  
  /**
   * Talep tahminine gerçek değeri ekle ve doğruluk hesapla
   * @param id Tahmin ID
   * @param actualDemand Gerçek talep değeri
   */
  async updateDemandForecastWithActual(id: number, actualDemand: number): Promise<DemandForecast> {
    const forecast = await this.getDemandForecastById(id);
    
    if (!forecast) {
      throw new Error(`Talep tahmini bulunamadı: ID ${id}`);
    }
    
    // Tahmin doğruluğunu hesapla (% olarak)
    let accuracy = 100;
    if (forecast.predictedDemand > 0) {
      const diff = Math.abs(forecast.predictedDemand - actualDemand);
      accuracy = 100 - Math.min(100, (diff / forecast.predictedDemand) * 100);
    }
    
    return this.updateDemandForecast(id, {
      actualDemand,
      accuracy: parseFloat(accuracy.toFixed(2)),
      isVerified: true
    });
  }
  
  // ========================== PRICE RECOMMENDATIONS ==========================
  
  /**
   * Tüm fiyat önerilerini getir
   */
  async getAllPriceRecommendations(): Promise<PriceRecommendation[]> {
    return storage.priceRecommendations || [];
  }
  
  /**
   * Bekleyen (onay bekleyen) fiyat önerilerini getir
   */
  async getPendingPriceRecommendations(): Promise<PriceRecommendation[]> {
    return (storage.priceRecommendations || []).filter(rec => rec.status === 'pending');
  }
  
  /**
   * Belirli bir fiyat önerisi getir
   * @param id Öneri ID
   */
  async getPriceRecommendationById(id: number): Promise<PriceRecommendation | undefined> {
    return storage.priceRecommendations?.find(rec => rec.id === id);
  }
  
  /**
   * Rotaya göre fiyat önerilerini getir
   * @param routeId Rota ID
   */
  async getPriceRecommendationsByRouteId(routeId: number): Promise<PriceRecommendation[]> {
    return storage.priceRecommendations?.filter(rec => rec.routeId === routeId) || [];
  }
  
  /**
   * Sefere göre fiyat önerilerini getir
   * @param scheduleId Sefer ID
   */
  async getPriceRecommendationsByScheduleId(scheduleId: number): Promise<PriceRecommendation[]> {
    return storage.priceRecommendations?.filter(rec => rec.scheduleId === scheduleId) || [];
  }
  
  /**
   * Yeni fiyat önerisi oluştur
   * @param data Öneri verisi
   */
  async createPriceRecommendation(data: InsertPriceRecommendation): Promise<PriceRecommendation> {
    const newId = storage.priceRecommendations ? Math.max(0, ...storage.priceRecommendations.map(r => r.id)) + 1 : 1;
    
    const newRecommendation: PriceRecommendation = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      ...data
    };
    
    if (!storage.priceRecommendations) {
      storage.priceRecommendations = [];
    }
    
    storage.priceRecommendations.push(newRecommendation);
    return newRecommendation;
  }
  
  /**
   * Fiyat önerisi güncelle
   * @param id Öneri ID
   * @param data Güncellenecek veriler
   */
  async updatePriceRecommendation(id: number, data: Partial<PriceRecommendation>): Promise<PriceRecommendation> {
    const recIndex = storage.priceRecommendations?.findIndex(rec => rec.id === id) ?? -1;
    
    if (recIndex === -1 || !storage.priceRecommendations) {
      throw new Error(`Fiyat önerisi bulunamadı: ID ${id}`);
    }
    
    const updatedRecommendation = {
      ...storage.priceRecommendations[recIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.priceRecommendations[recIndex] = updatedRecommendation;
    return updatedRecommendation;
  }
  
  /**
   * Fiyat önerisi uygula (onaylama)
   * @param id Öneri ID
   * @param approvedBy Onaylayan kullanıcı ID
   */
  async applyPriceRecommendation(id: number, approvedBy: number): Promise<PriceRecommendation> {
    const recommendation = await this.getPriceRecommendationById(id);
    
    if (!recommendation) {
      throw new Error(`Fiyat önerisi bulunamadı: ID ${id}`);
    }
    
    if (recommendation.status !== 'pending') {
      throw new Error(`Bu fiyat önerisi zaten ${recommendation.status} durumunda`);
    }
    
    // İlgili rotada veya seferde fiyat güncellemesi yapılabilir
    // Örnek kod:
    // if (recommendation.routeId) {
    //   await this.updateRoutePrice(recommendation.routeId, recommendation.recommendedPrice);
    // } else if (recommendation.scheduleId) {
    //   await this.updateSchedulePrice(recommendation.scheduleId, recommendation.recommendedPrice);
    // }
    
    return this.updatePriceRecommendation(id, {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy
    });
  }
  
  // ========================== COMPETITOR PRICES ==========================
  
  /**
   * Tüm rakip fiyatlarını getir
   */
  async getAllCompetitorPrices(): Promise<CompetitorPrice[]> {
    return storage.competitorPrices || [];
  }
  
  /**
   * Belirli bir rakip fiyatını getir
   * @param id Fiyat ID
   */
  async getCompetitorPriceById(id: number): Promise<CompetitorPrice | undefined> {
    return storage.competitorPrices?.find(price => price.id === id);
  }
  
  /**
   * Rotaya göre rakip fiyatlarını getir
   * @param routeId Rota ID
   */
  async getCompetitorPricesByRouteId(routeId: number): Promise<CompetitorPrice[]> {
    return storage.competitorPrices?.filter(price => price.routeId === routeId) || [];
  }
  
  /**
   * Yeni rakip fiyatı oluştur
   * @param data Fiyat verisi
   */
  async createCompetitorPrice(data: InsertCompetitorPrice): Promise<CompetitorPrice> {
    const newId = storage.competitorPrices ? Math.max(0, ...storage.competitorPrices.map(p => p.id)) + 1 : 1;
    
    const newPrice: CompetitorPrice = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    
    if (!storage.competitorPrices) {
      storage.competitorPrices = [];
    }
    
    storage.competitorPrices.push(newPrice);
    return newPrice;
  }
  
  /**
   * Rakip fiyatı güncelle
   * @param id Fiyat ID
   * @param data Güncellenecek veriler
   */
  async updateCompetitorPrice(id: number, data: Partial<CompetitorPrice>): Promise<CompetitorPrice> {
    const priceIndex = storage.competitorPrices?.findIndex(price => price.id === id) ?? -1;
    
    if (priceIndex === -1 || !storage.competitorPrices) {
      throw new Error(`Rakip fiyatı bulunamadı: ID ${id}`);
    }
    
    const updatedPrice = {
      ...storage.competitorPrices[priceIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.competitorPrices[priceIndex] = updatedPrice;
    return updatedPrice;
  }
  
  // ========================== REVENUE ANALYTICS ==========================
  
  /**
   * Tüm gelir analizlerini getir
   */
  async getAllRevenueAnalytics(): Promise<RevenueAnalytic[]> {
    return storage.revenueAnalytics || [];
  }
  
  /**
   * Belirli bir gelir analizini getir
   * @param id Analiz ID
   */
  async getRevenueAnalyticById(id: number): Promise<RevenueAnalytic | undefined> {
    return storage.revenueAnalytics?.find(analytic => analytic.id === id);
  }
  
  /**
   * Rotaya göre gelir analizlerini getir
   * @param routeId Rota ID
   */
  async getRevenueAnalyticsByRouteId(routeId: number): Promise<RevenueAnalytic[]> {
    return storage.revenueAnalytics?.filter(analytic => analytic.routeId === routeId) || [];
  }
  
  /**
   * Dönem tipine göre gelir analizlerini getir
   * @param periodType Dönem tipi (daily, weekly, monthly, quarterly, yearly)
   */
  async getRevenueAnalyticsByPeriodType(periodType: string): Promise<RevenueAnalytic[]> {
    return storage.revenueAnalytics?.filter(analytic => analytic.periodType === periodType) || [];
  }
  
  /**
   * Tarih aralığına göre gelir analizlerini getir
   * @param startDate Başlangıç tarihi
   * @param endDate Bitiş tarihi
   */
  async getRevenueAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<RevenueAnalytic[]> {
    return (storage.revenueAnalytics || []).filter(analytic => {
      const analyticDate = new Date(analytic.periodStart);
      return analyticDate >= startDate && analyticDate <= endDate;
    });
  }
  
  /**
   * Yeni gelir analizi oluştur
   * @param data Analiz verisi
   */
  async createRevenueAnalytic(data: InsertRevenueAnalytic): Promise<RevenueAnalytic> {
    const newId = storage.revenueAnalytics ? Math.max(0, ...storage.revenueAnalytics.map(a => a.id)) + 1 : 1;
    
    const newAnalytic: RevenueAnalytic = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    
    if (!storage.revenueAnalytics) {
      storage.revenueAnalytics = [];
    }
    
    storage.revenueAnalytics.push(newAnalytic);
    return newAnalytic;
  }
  
  /**
   * Gelir analizi güncelle
   * @param id Analiz ID
   * @param data Güncellenecek veriler
   */
  async updateRevenueAnalytic(id: number, data: Partial<RevenueAnalytic>): Promise<RevenueAnalytic> {
    const analyticIndex = storage.revenueAnalytics?.findIndex(analytic => analytic.id === id) ?? -1;
    
    if (analyticIndex === -1 || !storage.revenueAnalytics) {
      throw new Error(`Gelir analizi bulunamadı: ID ${id}`);
    }
    
    const updatedAnalytic = {
      ...storage.revenueAnalytics[analyticIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.revenueAnalytics[analyticIndex] = updatedAnalytic;
    return updatedAnalytic;
  }
  
  // ========================== YIELD MANAGEMENT SETTINGS ==========================
  
  /**
   * Tüm gelir yönetimi ayarlarını getir
   */
  async getAllYeildManagementSettings(): Promise<YeildManagementSetting[]> {
    return storage.yeildManagementSettings || [];
  }
  
  /**
   * Belirli bir gelir yönetimi ayarını getir
   * @param id Ayar ID
   */
  async getYeildManagementSettingById(id: number): Promise<YeildManagementSetting | undefined> {
    return storage.yeildManagementSettings?.find(setting => setting.id === id);
  }
  
  /**
   * Rotaya göre gelir yönetimi ayarını getir
   * @param routeId Rota ID
   */
  async getYeildManagementSettingByRouteId(routeId: number): Promise<YeildManagementSetting | undefined> {
    return storage.yeildManagementSettings?.find(setting => setting.routeId === routeId);
  }
  
  /**
   * Global gelir yönetimi ayarlarını getir
   */
  async getGlobalYeildManagementSettings(): Promise<YeildManagementSetting | undefined> {
    return storage.yeildManagementSettings?.find(setting => setting.isGlobal === true);
  }
  
  /**
   * Yeni gelir yönetimi ayarı oluştur
   * @param data Ayar verisi
   */
  async createYeildManagementSetting(data: InsertYeildManagementSetting): Promise<YeildManagementSetting> {
    const newId = storage.yeildManagementSettings ? Math.max(0, ...storage.yeildManagementSettings.map(s => s.id)) + 1 : 1;
    
    const newSetting: YeildManagementSetting = {
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    
    if (!storage.yeildManagementSettings) {
      storage.yeildManagementSettings = [];
    }
    
    storage.yeildManagementSettings.push(newSetting);
    return newSetting;
  }
  
  /**
   * Gelir yönetimi ayarını güncelle
   * @param id Ayar ID
   * @param data Güncellenecek veriler
   */
  async updateYeildManagementSetting(id: number, data: Partial<YeildManagementSetting>): Promise<YeildManagementSetting> {
    const settingIndex = storage.yeildManagementSettings?.findIndex(setting => setting.id === id) ?? -1;
    
    if (settingIndex === -1 || !storage.yeildManagementSettings) {
      throw new Error(`Gelir yönetimi ayarı bulunamadı: ID ${id}`);
    }
    
    const updatedSetting = {
      ...storage.yeildManagementSettings[settingIndex],
      ...data,
      updatedAt: new Date()
    };
    
    storage.yeildManagementSettings[settingIndex] = updatedSetting;
    return updatedSetting;
  }
  
  // ========================== DYNAMIC PRICING ==========================
  
  /**
   * Dinamik fiyat hesaplama
   * @param routeId Rota ID
   * @param scheduleId Sefer ID (opsiyonel)
   * @param departureDate Kalkış tarihi
   * @param basePrice Temel fiyat
   */
  async calculateDynamicPrice(
    routeId: number,
    scheduleId: number,
    departureDate: Date,
    basePrice: number
  ): Promise<{
    originalPrice: number;
    calculatedPrice: number;
    priceChange: number;
    changePercentage: number;
    appliedRules: PricingRule[];
    affectingEvents: SpecialEvent[];
    demandForecast?: DemandForecast;
    competitorPrices: CompetitorPrice[];
    calculationDetails: Record<string, any>;
  }> {
    let calculatedPrice = basePrice;
    let totalMultiplier = 1;
    let totalAddition = 0;
    
    // Uygulanabilir kuralları getir
    const rules = await this.getApplicablePricingRules(routeId, departureDate);
    
    // Özel etkinlikler
    const events = (await this.getActiveSpecialEvents()).filter(event => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      return departureDate >= startDate && departureDate <= endDate &&
        (event.routeId === null || event.routeId === routeId);
    });
    
    // Talep tahmini
    const demandForecasts = await this.getDemandForecastsByDateRange(
      routeId,
      new Date(departureDate.setHours(0, 0, 0, 0)),
      new Date(departureDate.setHours(23, 59, 59, 999))
    );
    const demandForecast = demandForecasts.length > 0 ? demandForecasts[0] : undefined;
    
    // Rakip fiyatları
    const competitorPrices = await this.getCompetitorPricesByRouteId(routeId);
    
    // Kayıt tutmak için hesaplama detayları
    const calculationDetails: Record<string, any> = {
      basePrice,
      ruleMultipliers: {},
      ruleAdditions: {},
      eventFactors: {},
      demandFactor: 1,
      competitiveFactor: 1
    };
    
    // Fiyatlandırma kurallarını uygula
    for (const rule of rules) {
      if (rule.adjustmentType === 'percentage') {
        const multiplier = 1 + (rule.adjustmentValue / 100);
        totalMultiplier *= multiplier;
        calculationDetails.ruleMultipliers[`rule_${rule.id}`] = {
          name: rule.name,
          multiplier
        };
      } else if (rule.adjustmentType === 'fixed') {
        totalAddition += rule.adjustmentValue;
        calculationDetails.ruleAdditions[`rule_${rule.id}`] = {
          name: rule.name,
          addition: rule.adjustmentValue
        };
      }
    }
    
    // Özel etkinlikleri uygula
    for (const event of events) {
      const eventFactor = 1 + (event.priceEffect / 100);
      totalMultiplier *= eventFactor;
      calculationDetails.eventFactors[`event_${event.id}`] = {
        name: event.name,
        factor: eventFactor
      };
    }
    
    // Talep faktörü
    let demandFactor = 1;
    if (demandForecast) {
      // Tahmin edilen doluluk oranına göre fiyat ayarlaması
      // Yüksek doluluk = yüksek fiyat, düşük doluluk = düşük fiyat
      const occupancyRatio = demandForecast.predictedDemand / demandForecast.totalCapacity;
      if (occupancyRatio > 0.8) {
        demandFactor = 1.2; // %20 artış 
      } else if (occupancyRatio > 0.6) {
        demandFactor = 1.1; // %10 artış
      } else if (occupancyRatio < 0.3) {
        demandFactor = 0.9; // %10 azalış
      }
      
      totalMultiplier *= demandFactor;
      calculationDetails.demandFactor = demandFactor;
    }
    
    // Rakip fiyatları
    let competitiveFactor = 1;
    if (competitorPrices.length > 0) {
      // Ortalama rakip fiyatı hesapla
      const avgCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price.price, 0) / competitorPrices.length;
      
      // Fiyatımız rakiplerden çok yüksek veya çok düşükse ayarla
      if (calculatedPrice > avgCompetitorPrice * 1.3) {
        competitiveFactor = 0.9; // %10 azalt (rakiplerden çok yükseksek)
      } else if (calculatedPrice < avgCompetitorPrice * 0.7) {
        competitiveFactor = 1.1; // %10 artır (rakiplerden çok düşüksek)
      }
      
      totalMultiplier *= competitiveFactor;
      calculationDetails.competitiveFactor = competitiveFactor;
      calculationDetails.avgCompetitorPrice = avgCompetitorPrice;
    }
    
    // Toplam faktörleri uygula
    calculatedPrice = basePrice * totalMultiplier + totalAddition;
    
    // Fiyatı yuvarlama (örneğin en yakın 9'lu değere)
    calculatedPrice = Math.ceil(calculatedPrice / 10) * 10 - 1;
    
    const priceChange = calculatedPrice - basePrice;
    const changePercentage = (priceChange / basePrice) * 100;
    
    return {
      originalPrice: basePrice,
      calculatedPrice,
      priceChange,
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      appliedRules: rules,
      affectingEvents: events,
      demandForecast,
      competitorPrices,
      calculationDetails
    };
  }
  
  // ========================== DASHBOARD ANALYTICS ==========================
  
  /**
   * En yüksek gelirli rotaları getir
   * @param limit Sonuç limiti
   */
  async getTopRevenueRoutes(limit: number = 5): Promise<any[]> {
    // Gerçek uygulamada bu veri veritabanından alınmalıdır
    // Burada örnek veri üretiyoruz
    return [
      { id: 1, routeName: "İstanbul - Atina", revenue: 456000, growth: 12.5, totalBookings: 1230 },
      { id: 2, routeName: "Bodrum - Rodos", revenue: 378000, growth: 8.3, totalBookings: 980 },
      { id: 3, routeName: "Çeşme - Sakız", revenue: 325000, growth: 15.7, totalBookings: 840 },
      { id: 4, routeName: "Ayvalık - Midilli", revenue: 284000, growth: 4.2, totalBookings: 750 },
      { id: 5, routeName: "Kuşadası - Samos", revenue: 246000, growth: 6.8, totalBookings: 640 }
    ].slice(0, limit);
  }
  
  /**
   * En yüksek doluluk oranına sahip rotaları getir
   * @param limit Sonuç limiti
   */
  async getTopOccupancyRoutes(limit: number = 5): Promise<any[]> {
    // Gerçek uygulamada bu veri veritabanından alınmalıdır
    // Burada örnek veri üretiyoruz
    return [
      { id: 3, routeName: "Çeşme - Sakız", occupancy: 92.5, totalCapacity: 1200, change: 5.3 },
      { id: 1, routeName: "İstanbul - Atina", occupancy: 88.4, totalCapacity: 1500, change: 3.2 },
      { id: 4, routeName: "Ayvalık - Midilli", occupancy: 85.7, totalCapacity: 900, change: 7.8 },
      { id: 2, routeName: "Bodrum - Rodos", occupancy: 83.1, totalCapacity: 1300, change: 2.5 },
      { id: 5, routeName: "Kuşadası - Samos", occupancy: 79.6, totalCapacity: 1100, change: 4.1 }
    ].slice(0, limit);
  }
}

export const revenueManagement = new RevenueManagementService();
export default revenueManagement;