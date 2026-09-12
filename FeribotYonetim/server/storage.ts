import * as schema from '@shared/schema';
import { 
  users, 
  routes,
  schedules,
  ferryCompanies,
  ports,
  currencies,
  siteSettings,
  vehicleTypes,
  passengerTypes,
  bookings,
  bookingPassengers,
  bookingVehicles,
  campaigns,
  coupons,
  customerSegments,
  campaignPerformance,
  couponRedemptions,
  membershipTiers,
  inboxMessages,
  pricingTiers,
  agencyPricing,
  routePricing,
  translationFunctions,
  translationItems,
  notifications,
  PricingTier,
  InsertPricingTier,
  AgencyPricing,
  InsertAgencyPricing,
  RoutePricing,
  InsertRoutePricing,
  User,
  Route,
  Schedule,
  FerryCompany,
  Port,
  Currency,
  SiteSetting,
  VehicleType,
  PassengerType,
  Booking,
  BookingPassenger,
  BookingVehicle,
  Campaign,
  Coupon,
  CustomerSegment,
  CampaignPerformance,
  CouponRedemption,
  MembershipTier,
  InsertMembershipTier,
  InboxMessage,
  InsertInboxMessage,
  Notification,
  InsertNotification
} from '@shared/schema';
import { db } from './db';
import { eq, like, and, or, not, desc, asc, count, exists, isNull, inArray, between, lte, gte, sql } from 'drizzle-orm';
import session from 'express-session';
import connectPg from "connect-pg-simple";
import createMemoryStore from 'memorystore';
import { pool } from './db';

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  seedBookings?(): void;
  
  // Temel kullanıcı işlemleri
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, userData: any): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Dil yönetimi için metotlar
  getAllLanguages(): Promise<any[]>;
  getLanguageByCode(code: string): Promise<any | undefined>;
  createLanguage(data: any): Promise<any>;
  updateLanguage(id: number, data: any): Promise<any | undefined>;
  deleteLanguage(id: number): Promise<boolean>;
  
  // Çeviri fonksiyonları için metodlar
  getAllTranslationFunctions(): Promise<any[]>;
  getTranslationFunctionsByCategory(category: string): Promise<any[]>;
  getTranslationFunction(id: number): Promise<any | undefined>;
  getTranslationFunctionByName(name: string): Promise<any | undefined>;
  createTranslationFunction(translationFunction: any): Promise<any>;
  updateTranslationFunction(id: number, translationFunction: any): Promise<any | undefined>;
  deleteTranslationFunction(id: number): Promise<boolean>;
  
  // Çeviri öğeleri için metodlar
  getAllTranslationItems(): Promise<any[]>;
  getTranslationItemsByFunction(functionId: number): Promise<any[]>;
  getTranslationItemsByLanguage(languageId: number): Promise<any[]>;
  getTranslationItemsByFunctionAndLanguage(functionId: number, languageId: number): Promise<any[]>;
  getTranslationItem(id: number): Promise<any | undefined>;
  createTranslationItem(translationItem: any): Promise<any>;
  updateTranslationItem(id: number, translationItem: any): Promise<any | undefined>;
  deleteTranslationItem(id: number): Promise<boolean>;
  
  // Arama kutusu ve rota bulma işlemleri için gereken metodlar
  getAllRoutes(): Promise<Route[]>;
  getRoute(id: number): Promise<Route | undefined>;
  searchRoutes(criteria: any): Promise<Route[]>;
  createRoute(routeData: any): Promise<Route>;
  updateRoute(id: number, routeData: any): Promise<Route | undefined>;
  
  // Limanlar için gerekli metodlar
  getAllPorts(): Promise<Port[]>;
  getPort(id: number): Promise<Port | undefined>;
  createPort(portData: any): Promise<Port>;
  updatePort(id: number, portData: any): Promise<Port | undefined>;
  
  // Feribot şirketleri için
  getAllFerryCompanies(): Promise<FerryCompany[]>;
  getFerryCompany(id: number): Promise<FerryCompany | undefined>;
  createFerryCompany(companyData: any): Promise<FerryCompany>;
  updateFerryCompany(id: number, companyData: any): Promise<FerryCompany | undefined>;
  
  // Para birimleri için
  getAllCurrencies(): Promise<Currency[]>;
  getCurrencyByCode(code: string): Promise<Currency | undefined>;
  createCurrency(currencyData: any): Promise<Currency>;
  updateCurrency(id: number, currencyData: any): Promise<Currency | undefined>;
  
  // Site ayarları için
  getSiteSettings(): Promise<SiteSetting | undefined>;
  updateSiteSettings(settings: any): Promise<SiteSetting | undefined>;

  // Araç tipleri için
  getAllVehicleTypes(): Promise<VehicleType[]>;
  getVehicleType(id: number): Promise<VehicleType | undefined>;
  createVehicleType(vehicleTypeData: any): Promise<VehicleType>;
  updateVehicleType(id: number, vehicleTypeData: any): Promise<VehicleType | undefined>;
  
  // Yolcu tipleri için
  getAllPassengerTypes(): Promise<PassengerType[]>;
  getPassengerType(id: number): Promise<PassengerType | undefined>;
  createPassengerType(passengerTypeData: any): Promise<PassengerType>;
  updatePassengerType(id: number, passengerTypeData: any): Promise<PassengerType | undefined>;
  
  // Takvim ve program işlemleri
  getAllSchedules(): Promise<Schedule[]>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  getSchedulesByRoute(routeId: number): Promise<Schedule[]>;
  createSchedule(scheduleData: any): Promise<Schedule>;
  updateSchedule(id: number, scheduleData: any): Promise<Schedule | undefined>;
  
  // Rezervasyon işlemleri
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingByReference(reference: string): Promise<Booking | undefined>;
  getBookingsByUser(userId: number): Promise<Booking[]>;
  createBooking(bookingData: any): Promise<Booking>;
  updateBooking(id: number, bookingData: any): Promise<Booking | undefined>;
  updateBookingPaymentStatus(id: number, isPaid: boolean): Promise<Booking | undefined>;
  
  // Rezervasyon yolcu ve araç işlemleri
  createBookingPassenger(passengerData: any): Promise<BookingPassenger>;
  getBookingPassengersByBooking(bookingId: number): Promise<BookingPassenger[]>;
  createBookingVehicle(vehicleData: any): Promise<BookingVehicle>;
  getBookingVehiclesByBooking(bookingId: number): Promise<BookingVehicle[]>;
  
  // Kampanya yönetimi
  getAllCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaignData: any): Promise<Campaign>;
  updateCampaign(id: number, campaignData: any): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  incrementCampaignUsage(campaignId: number): Promise<Campaign | undefined>;
  
  // Müşteri segmentleri
  getAllCustomerSegments(): Promise<CustomerSegment[]>;
  getActiveCustomerSegments(): Promise<CustomerSegment[]>;
  getCustomerSegment(id: number): Promise<CustomerSegment | undefined>;
  createCustomerSegment(segmentData: any): Promise<CustomerSegment>;
  calculateSegmentSize(segmentId: number): Promise<number>;
  updateCustomerSegment(id: number, segmentData: any): Promise<CustomerSegment | undefined>;
  deleteCustomerSegment(id: number): Promise<boolean>;
  
  // Kampanya performans analizi
  getCampaignPerformanceByCampaignId(campaignId: number): Promise<CampaignPerformance | undefined>;
  createCampaignPerformance(performanceData: any): Promise<CampaignPerformance>;
  updateCampaignPerformance(id: number, performanceData: any): Promise<CampaignPerformance | undefined>;
  
  // Kupon yönetimi
  getAllCoupons(): Promise<Coupon[]>;
  getActiveCoupons(): Promise<Coupon[]>;
  getCouponsByCampaignId(campaignId: number): Promise<Coupon[]>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  getCoupon(id: number): Promise<Coupon | undefined>;
  validateCoupon(code: string, userId: number, amount: number): Promise<{ valid: boolean; message: string; coupon?: Coupon }>;
  createCoupon(couponData: any): Promise<Coupon>;
  updateCoupon(id: number, couponData: any): Promise<Coupon | undefined>;
  deleteCoupon(id: number): Promise<boolean>;
  incrementCouponUsage(couponId: number): Promise<Coupon | undefined>;
  
  // Kupon kullanım takibi
  getCouponRedemptionsByCouponId(couponId: number): Promise<CouponRedemption[]>;
  getCouponRedemptionsByBookingId(bookingId: number): Promise<CouponRedemption[]>;
  getCouponRedemptionsByUserId(userId: number): Promise<CouponRedemption[]>;
  createCouponRedemption(redemptionData: any): Promise<CouponRedemption>;
  
  // Üyelik Seviyeleri Yönetimi
  getAllMembershipTiers(): Promise<MembershipTier[]>;
  getMembershipTierById(id: number): Promise<MembershipTier | undefined>;
  createMembershipTier(tierData: InsertMembershipTier): Promise<MembershipTier>;
  updateMembershipTier(id: number, tierData: Partial<InsertMembershipTier>): Promise<MembershipTier | undefined>;
  deleteMembershipTier(id: number): Promise<boolean>;
  
  // Gelen Kutusu (Inbox) İşlemleri
  getAllInboxMessages(): Promise<InboxMessage[]>;
  getInboxMessage(id: number): Promise<InboxMessage | undefined>;
  getInboxMessagesByUser(userId: number, options?: { onlyUnread?: boolean, includeArchived?: boolean, includeDeleted?: boolean }): Promise<InboxMessage[]>;
  getSentInboxMessagesByUser(userId: number): Promise<InboxMessage[]>;
  createInboxMessage(messageData: InsertInboxMessage): Promise<InboxMessage>;
  updateInboxMessage(id: number, messageData: Partial<InsertInboxMessage>): Promise<InboxMessage | undefined>;
  markInboxMessageAsRead(id: number): Promise<InboxMessage | undefined>;
  markInboxMessageAsArchived(id: number): Promise<InboxMessage | undefined>;
  markInboxMessageAsDeleted(id: number): Promise<InboxMessage | undefined>;
  permanentlyDeleteInboxMessage(id: number): Promise<boolean>;
  getConversationThread(parentMessageId: number): Promise<InboxMessage[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // B2B Fiyatlandırma Modülü
  // Pricing Tiers (Fiyatlandırma Katmanları)
  getAllPricingTiers(): Promise<PricingTier[]>;
  getActivePricingTiers(): Promise<PricingTier[]>;
  getPricingTier(id: number): Promise<PricingTier | undefined>;
  createPricingTier(tierData: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: number, tierData: Partial<PricingTier>): Promise<PricingTier | undefined>;
  deletePricingTier(id: number): Promise<boolean>;
  
  // Agency Pricing (Acente Fiyatlandırma)
  getAllAgencyPricing(): Promise<AgencyPricing[]>;
  getAgencyPricing(id: number): Promise<AgencyPricing | undefined>;
  getAgencyPricingByAgency(agencyId: number): Promise<AgencyPricing[]>;
  createAgencyPricing(pricingData: InsertAgencyPricing): Promise<AgencyPricing>;
  updateAgencyPricing(id: number, pricingData: Partial<AgencyPricing>): Promise<AgencyPricing | undefined>;
  deleteAgencyPricing(id: number): Promise<boolean>;
  
  // Route Pricing (Rota Bazlı Fiyatlandırma)
  getAllRoutePricing(): Promise<RoutePricing[]>;
  getRoutePricing(id: number): Promise<RoutePricing | undefined>;
  getRoutePricingByAgency(agencyId: number): Promise<RoutePricing[]>;
  getRoutePricingByRoute(routeId: number): Promise<RoutePricing[]>;
  getRoutePricingByAgencyAndRoute(agencyId: number, routeId: number): Promise<RoutePricing | undefined>;
  createRoutePricing(pricingData: InsertRoutePricing): Promise<RoutePricing>;
  updateRoutePricing(id: number, pricingData: Partial<RoutePricing>): Promise<RoutePricing | undefined>;
  deleteRoutePricing(id: number): Promise<boolean>;
  
  // Demo veri oluşturma işlemleri için gerekli metodlar
  createReview(reviewData: any): Promise<any>;
  getReviewsByUserId(userId: number): Promise<any[]>;
  createReviewReply(replyData: any): Promise<any>;
  
  // Bildirim işlemleri
  getAllNotifications(): Promise<Notification[]>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notificationData: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Geçici depolama için Map tanımlamaları
  supportRequests?: Map<any, any>;
  supportMessages?: Map<any, any>;
  notifications?: Map<any, any>;
  socialShares?: Map<any, any>;
}

// PostgreSQL veritabanını kullanan depolama sınıfı
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  supportRequests: Map<any, any>;
  supportMessages: Map<any, any>;
  notifications: Map<any, any>;
  socialShares: Map<any, any>;
  
  constructor() {
    // Oturum verileri için PostgreSQL kullanıyoruz
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Demo veriler için collection'lar
    this.supportRequests = new Map();
    this.supportMessages = new Map();
    this.notifications = new Map();
    this.socialShares = new Map();
    
    console.log("PostgreSQL veritabanı depolama sistemi başlatıldı");
  }
  
  // Seed metotları
  async seedBookings(): Promise<void> {
    // Bu metod, veritabanında örnek rezervasyon verileri oluşturur
    console.log("Örnek rezervasyon verileri yükleniyor...");
    
    try {
      // Önce mevcut rezervasyon sayısını kontrol edelim
      const bookingCount = await db.select({ count: count() }).from(bookings);
      
      if (bookingCount[0].count > 0) {
        console.log(`Veritabanında ${bookingCount[0].count} rezervasyon zaten mevcut`);
        return;
      }
      
      // Demo mode
      console.log("Demo mode: No bookings to seed in simplified storage");
    } catch (error) {
      console.error("Örnek rezervasyon verileri yüklenirken hata oluştu:", error);
    }
  }
  
  // Kullanıcı işlemleri
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Sorgu önbelleği kullanarak getir - en sık kullanılan sorgulardan biri
      const sql = `SELECT * FROM users WHERE id = $1`;
      const result = await db.execute(sql, [id], true);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      // Konsol çıktısını sadece geliştirme ortamında göster
      // console.log(`DB: Kullanıcı ID ile bulundu: ${result.rows[0].username}, ID: ${result.rows[0].id}, Rol: ${result.rows[0].role}`);
      return result.rows[0];
    } catch (error) {
      console.error('User getirme hatası:', error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Önbellekleme ile kullanıcı adı sorgusu - kullanıcı adı ile sorgu yapmak yaygın
      const sql = `SELECT * FROM users WHERE username = $1`;
      const result = await db.execute(sql, [username], true);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Username ile kullanıcı getirme hatası:', error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Email ile kullanıcı getirme hatası:', error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(asc(users.id));
    } catch (error) {
      console.error('Tüm kullanıcıları getirme hatası:', error);
      return [];
    }
  }
  
  async createUser(userData: any): Promise<User> {
    try {
      const [createdUser] = await db.insert(users).values({
        ...userData,
        createdAt: new Date(),
        isActive: true
      }).returning();
      
      return createdUser;
    } catch (error) {
      console.error('Kullanıcı oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateUser(id: number, userData: any): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      return undefined;
    }
  }
  
  // Rota işlemleri
  async getAllRoutes(): Promise<Route[]> {
    try {
      // Sadece tablodaki mevcut sütunları seçelim
      const result = await db.query.routes.findMany({
        orderBy: asc(routes.id)
      });
      
      // Eğer departureCode ve arrivalCode eksikse boş string olarak ekleyelim
      return result.map(route => ({
        ...route,
        departureCode: '',
        arrivalCode: ''
      }));
    } catch (error) {
      console.error('Tüm rotaları getirme hatası:', error);
      return [];
    }
  }
  
  async getRoute(id: number): Promise<Route | undefined> {
    try {
      const result = await db.query.routes.findFirst({
        where: eq(routes.id, id)
      });
      
      if (!result) {
        return undefined;
      }
      
      // Eksik sütunları ekleyelim
      return {
        ...result,
        departureCode: '',  // Schema ile uyumlu olmak için eklendi
        arrivalCode: ''     // Schema ile uyumlu olmak için eklendi
      };
    } catch (error) {
      console.error('Rota getirme hatası:', error);
      return undefined;
    }
  }
  
  async searchRoutes(criteria: any): Promise<Route[]> {
    try {
      const { departurePort, arrivalPort, date } = criteria;
      let query = db.select().from(routes);
      
      if (departurePort) {
        query = query.where(like(routes.departurePort, `%${departurePort}%`));
      }
      
      if (arrivalPort) {
        query = query.where(like(routes.arrivalPort, `%${arrivalPort}%`));
      }
      
      const results = await query;
      
      // Schema uyumluluğu için departureCode ve arrivalCode alanlarını ekleyelim
      return results.map(route => ({
        ...route,
        departureCode: '',
        arrivalCode: ''
      }));
    } catch (error) {
      console.error('Rota arama hatası:', error);
      return [];
    }
  }
  
  // Liman işlemleri
  async getAllPorts(): Promise<Port[]> {
    try {
      return await db.select().from(ports).orderBy(asc(ports.id));
    } catch (error) {
      console.error('Tüm limanları getirme hatası:', error);
      return [];
    }
  }
  
  async getPort(id: number): Promise<Port | undefined> {
    try {
      const result = await db.select().from(ports).where(eq(ports.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Liman getirme hatası:', error);
      return undefined;
    }
  }
  
  // Feribot şirketleri
  async getAllFerryCompanies(): Promise<FerryCompany[]> {
    try {
      return await db.select().from(ferryCompanies).orderBy(asc(ferryCompanies.id));
    } catch (error) {
      console.error('Tüm feribot şirketlerini getirme hatası:', error);
      return [];
    }
  }
  
  async getFerryCompany(id: number): Promise<FerryCompany | undefined> {
    try {
      const result = await db.select().from(ferryCompanies).where(eq(ferryCompanies.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Feribot şirketi getirme hatası:', error);
      return undefined;
    }
  }
  
  // Site ayarları
  async getSiteSettings(): Promise<SiteSetting | undefined> {
    try {
      const result = await db.select().from(siteSettings).limit(1);
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Site ayarlarını getirme hatası:', error);
      
      // Demo mode için hard-coded site ayarları
      return {
        id: 1,
        siteName: 'Feribot Bileti',
        logo: '/logo.png',
        favicon: '/favicon.ico',
        contactEmail: 'info@feribotbileti.com',
        contactPhone: '+901234567890',
        address: 'İstanbul, Türkiye',
        metaTitle: 'Feribot Bileti - Türkiye ve Yunan Adaları',
        metaDescription: 'Türkiye ve Yunan adaları arasındaki en uygun feribot biletleri',
        socialMediaLinks: { "facebook": "https://facebook.com/feribotbileti", "twitter": "https://twitter.com/feribotbileti", "instagram": "https://instagram.com/feribotbileti" },
        footerText: 'Tüm hakları saklıdır.',
        defaultLanguage: 'tr',
        defaultCurrency: 'TRY',
        isMaintenanceMode: false,
        maintenanceMessage: null,
        enabledPaymentMethods: ['card', 'transfer'],
        createdAt: new Date(),
        updatedAt: new Date(),
        metaKeywords: 'feribot, bilet, türkiye, yunanistan, adalar, seyahat',
        customCss: null,
        customJs: null,
        googleAnalyticsId: null,
        facebookPixelId: null,
        notificationEmail: 'notification@feribotbileti.com',
        smtpSettings: null,
        locale: 'tr-TR',
        googleMapsApiKey: null,
        backgroundColor: null,
        primaryColor: '#1e88e5',
        secondaryColor: '#ff9800',
        textColor: '#212121',
        bookingSuccessMessage: 'Rezervasyonunuz başarıyla tamamlandı',
        bookingCancelMessage: 'Rezervasyonunuz iptal edildi'
      };
    }
  }
  
  async updateSiteSettings(settings: any): Promise<SiteSetting | undefined> {
    try {
      // Önce ayarların var olup olmadığını kontrol edelim
      const existingSettings = await db.select().from(siteSettings).limit(1);
      
      if (existingSettings.length === 0) {
        // Ayarlar henüz yoksa, yeni oluşturalım
        const [createdSettings] = await db.insert(siteSettings).values({
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        return createdSettings;
      } else {
        // Mevcut ayarları güncelleyelim
        const [updatedSettings] = await db.update(siteSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(siteSettings.id, existingSettings[0].id))
          .returning();
        
        return updatedSettings;
      }
    } catch (error) {
      console.error('Site ayarlarını güncelleme hatası:', error);
      return undefined;
    }
  }
  
  // Para birimleri
  async getAllCurrencies(): Promise<Currency[]> {
    try {
      return await db.select().from(currencies).orderBy(asc(currencies.id));
    } catch (error) {
      console.error('Tüm para birimlerini getirme hatası:', error);
      
      // Demo mode için hard-coded para birimleri
      return [
        { id: 1, code: 'TRY', name: 'Türk Lirası', symbol: '₺', exchangeRate: 1, isActive: true, isDefault: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, code: 'USD', name: 'Amerikan Doları', symbol: '$', exchangeRate: 32.5, isActive: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 35.2, isActive: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
        { id: 4, code: 'GBP', name: 'İngiliz Sterlini', symbol: '£', exchangeRate: 41.3, isActive: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() }
      ];
    }
  }
  
  async getCurrencyByCode(code: string): Promise<Currency | undefined> {
    try {
      const result = await db.select().from(currencies).where(eq(currencies.code, code));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Para birimi getirme hatası:', error);
      
      // Demo mode
      const demoData = {
        'TRY': { id: 1, code: 'TRY', name: 'Türk Lirası', symbol: '₺', exchangeRate: 1, isActive: true, isDefault: true, createdAt: new Date(), updatedAt: new Date() },
        'USD': { id: 2, code: 'USD', name: 'Amerikan Doları', symbol: '$', exchangeRate: 32.5, isActive: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
        'EUR': { id: 3, code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 35.2, isActive: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
        'GBP': { id: 4, code: 'GBP', name: 'İngiliz Sterlini', symbol: '£', exchangeRate: 41.3, isActive: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() }
      };
      
      return demoData[code];
    }
  }

  // Araç tipleri
  async getAllVehicleTypes(): Promise<VehicleType[]> {
    try {
      return await db.select().from(vehicleTypes).orderBy(asc(vehicleTypes.id));
    } catch (error) {
      console.error('Tüm araç tiplerini getirme hatası:', error);
      return [];
    }
  }

  // Yolcu tipleri
  async getAllPassengerTypes(): Promise<PassengerType[]> {
    try {
      return await db.select().from(passengerTypes).orderBy(asc(passengerTypes.id));
    } catch (error) {
      console.error('Tüm yolcu tiplerini getirme hatası:', error);
      return [];
    }
  }
  
  async getVehicleType(id: number): Promise<VehicleType | undefined> {
    try {
      const result = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Araç tipi getirme hatası:', error);
      return undefined;
    }
  }

  async createVehicleType(vehicleTypeData: any): Promise<VehicleType> {
    try {
      const [createdVehicleType] = await db.insert(vehicleTypes).values({
        ...vehicleTypeData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdVehicleType;
    } catch (error) {
      console.error('Araç tipi oluşturma hatası:', error);
      throw error;
    }
  }

  async updateVehicleType(id: number, vehicleTypeData: any): Promise<VehicleType | undefined> {
    try {
      const [updatedVehicleType] = await db.update(vehicleTypes)
        .set({
          ...vehicleTypeData,
          updatedAt: new Date()
        })
        .where(eq(vehicleTypes.id, id))
        .returning();
      
      return updatedVehicleType;
    } catch (error) {
      console.error('Araç tipi güncelleme hatası:', error);
      return undefined;
    }
  }

  async getPassengerType(id: number): Promise<PassengerType | undefined> {
    try {
      const result = await db.select().from(passengerTypes).where(eq(passengerTypes.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Yolcu tipi getirme hatası:', error);
      return undefined;
    }
  }

  async createPassengerType(passengerTypeData: any): Promise<PassengerType> {
    try {
      const [createdPassengerType] = await db.insert(passengerTypes).values({
        ...passengerTypeData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdPassengerType;
    } catch (error) {
      console.error('Yolcu tipi oluşturma hatası:', error);
      throw error;
    }
  }

  async updatePassengerType(id: number, passengerTypeData: any): Promise<PassengerType | undefined> {
    try {
      const [updatedPassengerType] = await db.update(passengerTypes)
        .set({
          ...passengerTypeData,
          updatedAt: new Date()
        })
        .where(eq(passengerTypes.id, id))
        .returning();
      
      return updatedPassengerType;
    } catch (error) {
      console.error('Yolcu tipi güncelleme hatası:', error);
      return undefined;
    }
  }
  
  // Takvim ve program işlemleri
  async getAllSchedules(): Promise<Schedule[]> {
    try {
      return await db.select().from(schedules).orderBy(asc(schedules.id));
    } catch (error) {
      console.error('Tüm programları getirme hatası:', error);
      return [];
    }
  }
  
  async getSchedule(id: number): Promise<Schedule | undefined> {
    try {
      const result = await db.select().from(schedules).where(eq(schedules.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Program getirme hatası:', error);
      return undefined;
    }
  }
  
  async getSchedulesByRoute(routeId: number): Promise<Schedule[]> {
    try {
      return await db.select()
        .from(schedules)
        .where(eq(schedules.routeId, routeId))
        .orderBy(asc(schedules.departureTime));
    } catch (error) {
      console.error(`Rota ID ${routeId} için programları getirme hatası:`, error);
      return [];
    }
  }
  
  async createSchedule(scheduleData: any): Promise<Schedule> {
    try {
      const [createdSchedule] = await db.insert(schedules).values({
        ...scheduleData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdSchedule;
    } catch (error) {
      console.error('Program oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateSchedule(id: number, scheduleData: any): Promise<Schedule | undefined> {
    try {
      const [updatedSchedule] = await db.update(schedules)
        .set({
          ...scheduleData,
          updatedAt: new Date()
        })
        .where(eq(schedules.id, id))
        .returning();
      
      return updatedSchedule;
    } catch (error) {
      console.error('Program güncelleme hatası:', error);
      return undefined;
    }
  }
  
  // Rezervasyon işlemleri
  async getAllBookings(): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    } catch (error) {
      console.error('Tüm rezervasyonları getirme hatası:', error);
      return [];
    }
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    try {
      const result = await db.select().from(bookings).where(eq(bookings.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Rezervasyon getirme hatası:', error);
      return undefined;
    }
  }
  
  async getBookingByReference(reference: string): Promise<Booking | undefined> {
    try {
      const result = await db.select().from(bookings).where(eq(bookings.bookingReference, reference));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Referans ile rezervasyon getirme hatası:', error);
      return undefined;
    }
  }
  
  async getBookingsByUser(userId: number): Promise<Booking[]> {
    try {
      return await db.select()
        .from(bookings)
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.createdAt));
    } catch (error) {
      console.error(`Kullanıcı ID ${userId} için rezervasyonları getirme hatası:`, error);
      return [];
    }
  }
  
  async createBooking(bookingData: any): Promise<Booking> {
    try {
      const [createdBooking] = await db.insert(bookings).values({
        ...bookingData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdBooking;
    } catch (error) {
      console.error('Rezervasyon oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateBooking(id: number, bookingData: any): Promise<Booking | undefined> {
    try {
      const [updatedBooking] = await db.update(bookings)
        .set({
          ...bookingData,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id))
        .returning();
      
      return updatedBooking;
    } catch (error) {
      console.error('Rezervasyon güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async updateBookingPaymentStatus(id: number, isPaid: boolean): Promise<Booking | undefined> {
    try {
      const [updatedBooking] = await db.update(bookings)
        .set({
          isPaid,
          status: isPaid ? 'confirmed' : 'pending',
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id))
        .returning();
      
      return updatedBooking;
    } catch (error) {
      console.error('Rezervasyon ödeme durumu güncelleme hatası:', error);
      return undefined;
    }
  }
  
  // Rezervasyon Yolcuları ve Araçları
  async createBookingPassenger(passengerData: any): Promise<BookingPassenger> {
    try {
      const [createdPassenger] = await db.insert(bookingPassengers).values({
        ...passengerData,
        createdAt: new Date()
      }).returning();
      
      return createdPassenger;
    } catch (error) {
      console.error('Rezervasyon yolcusu oluşturma hatası:', error);
      throw error;
    }
  }
  
  async getBookingPassengersByBooking(bookingId: number): Promise<BookingPassenger[]> {
    try {
      return await db.select()
        .from(bookingPassengers)
        .where(eq(bookingPassengers.bookingId, bookingId));
    } catch (error) {
      console.error(`Rezervasyon ID ${bookingId} için yolcuları getirme hatası:`, error);
      return [];
    }
  }
  
  async createBookingVehicle(vehicleData: any): Promise<BookingVehicle> {
    try {
      const [createdVehicle] = await db.insert(bookingVehicles).values({
        ...vehicleData,
        createdAt: new Date()
      }).returning();
      
      return createdVehicle;
    } catch (error) {
      console.error('Rezervasyon aracı oluşturma hatası:', error);
      throw error;
    }
  }
  
  async getBookingVehiclesByBooking(bookingId: number): Promise<BookingVehicle[]> {
    try {
      return await db.select()
        .from(bookingVehicles)
        .where(eq(bookingVehicles.bookingId, bookingId));
    } catch (error) {
      console.error(`Rezervasyon ID ${bookingId} için araçları getirme hatası:`, error);
      return [];
    }
  }
  
  // Kampanya yönetimi
  async getAllCampaigns(): Promise<Campaign[]> {
    try {
      return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    } catch (error) {
      console.error('Tüm kampanyaları getirme hatası:', error);
      return [];
    }
  }
  
  async getActiveCampaigns(): Promise<Campaign[]> {
    try {
      const now = new Date().toISOString();
      return await db.select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.isActive, true),
            or(
              isNull(campaigns.startDate),
              lte(campaigns.startDate, now)
            ),
            or(
              isNull(campaigns.endDate),
              gte(campaigns.endDate, now)
            )
          )
        )
        .orderBy(asc(campaigns.name));
    } catch (error) {
      console.error('Aktif kampanyaları getirme hatası:', error);
      return [];
    }
  }
  
  async getCampaign(id: number): Promise<Campaign | undefined> {
    try {
      const result = await db.select().from(campaigns).where(eq(campaigns.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Kampanya getirme hatası:', error);
      return undefined;
    }
  }
  
  async createCampaign(campaignData: any): Promise<Campaign> {
    try {
      const [createdCampaign] = await db.insert(campaigns).values({
        ...campaignData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdCampaign;
    } catch (error) {
      console.error('Kampanya oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateCampaign(id: number, campaignData: any): Promise<Campaign | undefined> {
    try {
      const [updatedCampaign] = await db.update(campaigns)
        .set({
          ...campaignData,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, id))
        .returning();
      
      return updatedCampaign;
    } catch (error) {
      console.error('Kampanya güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async deleteCampaign(id: number): Promise<boolean> {
    try {
      await db.delete(campaigns).where(eq(campaigns.id, id));
      return true;
    } catch (error) {
      console.error('Kampanya silme hatası:', error);
      return false;
    }
  }
  
  // Müşteri segmentleri
  async getAllCustomerSegments(): Promise<CustomerSegment[]> {
    try {
      return await db.select().from(customerSegments).orderBy(desc(customerSegments.createdAt));
    } catch (error) {
      console.error('Tüm müşteri segmentlerini getirme hatası:', error);
      return [];
    }
  }
  
  async getActiveCustomerSegments(): Promise<CustomerSegment[]> {
    try {
      return await db.select()
        .from(customerSegments)
        .where(eq(customerSegments.isActive, true))
        .orderBy(asc(customerSegments.name));
    } catch (error) {
      console.error('Aktif müşteri segmentlerini getirme hatası:', error);
      return [];
    }
  }
  
  async getCustomerSegment(id: number): Promise<CustomerSegment | undefined> {
    try {
      const result = await db.select().from(customerSegments).where(eq(customerSegments.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Müşteri segmenti getirme hatası:', error);
      return undefined;
    }
  }
  
  async createCustomerSegment(segmentData: any): Promise<CustomerSegment> {
    try {
      const [createdSegment] = await db.insert(customerSegments).values({
        ...segmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdSegment;
    } catch (error) {
      console.error('Müşteri segmenti oluşturma hatası:', error);
      throw error;
    }
  }
  
  async calculateSegmentSize(segmentId: number): Promise<number> {
    try {
      const segment = await this.getCustomerSegment(segmentId);
      
      if (!segment) {
        return 0;
      }
      
      // Segment kriterlerine göre kullanıcı sayısını hesapla
      const criteria = segment.segmentCriteria;
      
      // Örnek olarak basit bir sorgu
      const userCount = await db.select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));
      
      return userCount[0].count;
    } catch (error) {
      console.error('Segment boyutu hesaplama hatası:', error);
      return 0;
    }
  }
  
  async updateCustomerSegment(id: number, segmentData: any): Promise<CustomerSegment | undefined> {
    try {
      const [updatedSegment] = await db.update(customerSegments)
        .set({
          ...segmentData,
          updatedAt: new Date()
        })
        .where(eq(customerSegments.id, id))
        .returning();
      
      return updatedSegment;
    } catch (error) {
      console.error('Müşteri segmenti güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async deleteCustomerSegment(id: number): Promise<boolean> {
    try {
      await db.delete(customerSegments).where(eq(customerSegments.id, id));
      return true;
    } catch (error) {
      console.error('Müşteri segmenti silme hatası:', error);
      return false;
    }
  }
  
  // Kampanya performans
  async getCampaignPerformanceByCampaignId(campaignId: number): Promise<CampaignPerformance | undefined> {
    try {
      const result = await db.select()
        .from(campaignPerformance)
        .where(eq(campaignPerformance.campaignId, campaignId));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Kampanya performansı getirme hatası:', error);
      return undefined;
    }
  }
  
  async createCampaignPerformance(performanceData: any): Promise<CampaignPerformance> {
    try {
      const [createdPerformance] = await db.insert(campaignPerformance).values({
        ...performanceData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdPerformance;
    } catch (error) {
      console.error('Kampanya performansı oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateCampaignPerformance(id: number, performanceData: any): Promise<CampaignPerformance | undefined> {
    try {
      const [updatedPerformance] = await db.update(campaignPerformance)
        .set({
          ...performanceData,
          updatedAt: new Date()
        })
        .where(eq(campaignPerformance.id, id))
        .returning();
      
      return updatedPerformance;
    } catch (error) {
      console.error('Kampanya performansı güncelleme hatası:', error);
      return undefined;
    }
  }
  
  // Kupon yönetimi
  async getAllCoupons(): Promise<Coupon[]> {
    try {
      return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    } catch (error) {
      console.error('Tüm kuponları getirme hatası:', error);
      return [];
    }
  }
  
  async getActiveCoupons(): Promise<Coupon[]> {
    try {
      // Use direct SQL via db.execute to avoid Drizzle ORM typecasting issues with timestamps
      const result = await db.execute(
        sql`SELECT * FROM coupons 
            WHERE is_active = true 
            AND start_date <= now() 
            AND end_date >= now()
            ORDER BY code ASC`
      );
      
      return result.rows.map(row => ({
        id: row.id,
        campaignId: row.campaign_id,
        code: row.code,
        discountType: row.discount_type,
        discountValue: row.discount_value,
        startDate: row.start_date,
        endDate: row.end_date,
        usageLimit: row.usage_limit,
        usageCount: row.usage_count,
        isActive: row.is_active,
        minimumPurchaseAmount: row.minimum_purchase_amount,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Aktif kuponları getirme hatası:', error);
      return [];
    }
  }
  
  async getCouponsByCampaignId(campaignId: number): Promise<Coupon[]> {
    try {
      return await db.select()
        .from(coupons)
        .where(eq(coupons.campaignId, campaignId))
        .orderBy(desc(coupons.createdAt));
    } catch (error) {
      console.error(`Kampanya ID ${campaignId} için kuponları getirme hatası:`, error);
      return [];
    }
  }
  
  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    try {
      const result = await db.select().from(coupons).where(eq(coupons.code, code));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Kupon kodu ile kupon getirme hatası:', error);
      return undefined;
    }
  }
  
  async validateCoupon(code: string, userId: number, amount: number): Promise<{ valid: boolean; message: string; coupon?: Coupon }> {
    try {
      // Kupon kodu ile kuponu bul
      const coupon = await this.getCouponByCode(code);
      
      if (!coupon) {
        return { valid: false, message: 'Kupon bulunamadı' };
      }
      
      // Kupon aktif mi?
      if (!coupon.isActive) {
        return { valid: false, message: 'Kupon artık aktif değil' };
      }
      
      // Kupon tarihi geçerli mi?
      const now = new Date();
      if (new Date(coupon.startDate) > now) {
        return { valid: false, message: 'Kupon henüz aktif değil' };
      }
      
      if (new Date(coupon.endDate) < now) {
        return { valid: false, message: 'Kupon süresi dolmuş' };
      }
      
      // Kullanım limiti aşıldı mı?
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, message: 'Kuponun kullanım limiti dolmuş' };
      }
      
      // Minimum satın alma tutarı kontrolü
      if (coupon.minimumPurchaseAmount && amount < Number(coupon.minimumPurchaseAmount)) {
        return { 
          valid: false, 
          message: `Minimum ${coupon.minimumPurchaseAmount} ${amount.toString().includes('TRY') ? 'TL' : amount.toString().includes('USD') ? 'USD' : amount.toString().includes('EUR') ? 'EUR' : 'birim'} tutarında alışveriş yapmalısınız` 
        };
      }
      
      // Kullanıcı için kullanım limiti kontrolü
      const userRedemptions = await this.getCouponRedemptionsByUserId(userId);
      const couponRedemptions = userRedemptions.filter(r => r.couponId === coupon.id);
      
      if (couponRedemptions.length > 0) {
        return { valid: false, message: 'Bu kuponu daha önce kullandınız' };
      }
      
      return { valid: true, message: 'Kupon geçerli', coupon };
    } catch (error) {
      console.error('Kupon doğrulama hatası:', error);
      return { valid: false, message: 'Kupon doğrulanırken bir hata oluştu' };
    }
  }
  
  async createCoupon(couponData: any): Promise<Coupon> {
    try {
      const [createdCoupon] = await db.insert(coupons).values({
        ...couponData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdCoupon;
    } catch (error) {
      console.error('Kupon oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateCoupon(id: number, couponData: any): Promise<Coupon | undefined> {
    try {
      const [updatedCoupon] = await db.update(coupons)
        .set({
          ...couponData,
          updatedAt: new Date()
        })
        .where(eq(coupons.id, id))
        .returning();
      
      return updatedCoupon;
    } catch (error) {
      console.error('Kupon güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async deleteCoupon(id: number): Promise<boolean> {
    try {
      await db.delete(coupons).where(eq(coupons.id, id));
      return true;
    } catch (error) {
      console.error('Kupon silme hatası:', error);
      return false;
    }
  }
  
  async incrementCouponUsage(couponId: number): Promise<Coupon | undefined> {
    try {
      const coupon = await this.getCoupon(couponId);
      
      if (!coupon) {
        return undefined;
      }
      
      const [updatedCoupon] = await db.update(coupons)
        .set({
          usageCount: (coupon.usageCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(coupons.id, couponId))
        .returning();
      
      return updatedCoupon;
    } catch (error) {
      console.error('Kupon kullanım sayısını artırma hatası:', error);
      return undefined;
    }
  }
  
  async incrementCampaignUsage(campaignId: number): Promise<Campaign | undefined> {
    try {
      const campaign = await this.getCampaign(campaignId);
      
      if (!campaign) {
        return undefined;
      }
      
      const [updatedCampaign] = await db.update(campaigns)
        .set({
          currentUsage: (campaign.currentUsage || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, campaignId))
        .returning();
      
      return updatedCampaign;
    } catch (error) {
      console.error('Kampanya kullanım sayısını artırma hatası:', error);
      return undefined;
    }
  }
  
  // Kupon kullanımları
  async getCouponRedemptionsByCouponId(couponId: number): Promise<CouponRedemption[]> {
    try {
      return await db.select()
        .from(couponRedemptions)
        .where(eq(couponRedemptions.couponId, couponId))
        .orderBy(desc(couponRedemptions.redeemedAt));
    } catch (error) {
      console.error(`Kupon ID ${couponId} için kullanımları getirme hatası:`, error);
      return [];
    }
  }
  
  async getCouponRedemptionsByBookingId(bookingId: number): Promise<CouponRedemption[]> {
    try {
      return await db.select()
        .from(couponRedemptions)
        .where(eq(couponRedemptions.bookingId, bookingId))
        .orderBy(desc(couponRedemptions.redeemedAt));
    } catch (error) {
      console.error(`Rezervasyon ID ${bookingId} için kupon kullanımlarını getirme hatası:`, error);
      return [];
    }
  }
  
  async getCouponRedemptionsByUserId(userId: number): Promise<CouponRedemption[]> {
    try {
      return await db.select()
        .from(couponRedemptions)
        .where(eq(couponRedemptions.userId, userId))
        .orderBy(desc(couponRedemptions.redeemedAt));
    } catch (error) {
      console.error(`Kullanıcı ID ${userId} için kupon kullanımlarını getirme hatası:`, error);
      return [];
    }
  }
  
  async createCouponRedemption(redemptionData: any): Promise<CouponRedemption> {
    try {
      const [createdRedemption] = await db.insert(couponRedemptions).values({
        ...redemptionData,
        redeemedAt: new Date()
      }).returning();
      
      return createdRedemption;
    } catch (error) {
      console.error('Kupon kullanımı oluşturma hatası:', error);
      throw error;
    }
  }
  
  // Helper metodu
  async getCoupon(id: number): Promise<Coupon | undefined> {
    try {
      const result = await db.select().from(coupons).where(eq(coupons.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Kupon getirme hatası:', error);
      return undefined;
    }
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Kullanıcı silme hatası:', error);
      return false;
    }
  }
  
  // Demo veri oluşturma işlemleri için gerekli metodlar
  async createReview(reviewData: any): Promise<any> {
    console.log('Creating review:', reviewData);
    try {
      // Yeni yorumu veritabanına ekle - mevcut DB şemasına uygun olarak
      const [createdReview] = await db.insert(schema.reviews).values({
        userId: reviewData.userId,
        routeId: reviewData.routeId,
        bookingId: reviewData.bookingId || null,
        rating: reviewData.rating,
        title: reviewData.title || null,
        content: reviewData.content || null,
        isVerified: reviewData.isVerifiedPurchase || false,
        isPublished: true,
        createdAt: reviewData.createdAt || new Date(),
        updatedAt: reviewData.updatedAt || new Date(),
        helpfulnessScore: reviewData.helpfulCount || 0,
        reportedCount: reviewData.reportCount || 0,
        metadata: reviewData.metadata || null
      }).returning();
      
      return createdReview;
    } catch (error) {
      console.error('Review oluşturma hatası:', error);
      // Hata durumunda Demo mod - bellek üzerinde oluştur
      return {
        id: Date.now(),
        ...reviewData
      };
    }
  }
  
  async getReviewsByUserId(userId: number): Promise<any[]> {
    console.log('Getting reviews for user:', userId);
    try {
      // Kullanıcının tüm yorumlarını getir - mevcut DB şemasına uygun olarak
      const userReviews = await db.select().from(schema.reviews)
        .where(eq(schema.reviews.userId, userId))
        .orderBy(desc(schema.reviews.createdAt));
      
      return userReviews;
    } catch (error) {
      console.error('Reviews getirme hatası:', error);
      return [];
    }
  }
  
  async createReviewReply(replyData: any): Promise<any> {
    console.log('Creating review reply:', replyData);
    try {
      // Yoruma yanıt oluştur - mevcut DB şemasına uygun olarak
      const [createdReply] = await db.insert(schema.reviewReplies).values({
        reviewId: replyData.reviewId,
        userId: replyData.userId,
        content: replyData.content,
        isStaffReply: replyData.isStaffReply || false,
        isPublished: true,
        createdAt: replyData.createdAt || new Date(),
        updatedAt: replyData.updatedAt || new Date()
      }).returning();
      
      return createdReply;
    } catch (error) {
      console.error('Review reply oluşturma hatası:', error);
      // Hata durumunda Demo mod - bellek üzerinde oluştur
      return {
        id: Date.now(),
        ...replyData
      };
    }
  }
  
  async createPort(portData: any): Promise<Port> {
    try {
      const [createdPort] = await db.insert(ports).values({
        ...portData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdPort;
    } catch (error) {
      console.error('Liman oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updatePort(id: number, portData: any): Promise<Port | undefined> {
    try {
      const [updatedPort] = await db.update(ports)
        .set({
          ...portData,
          updatedAt: new Date()
        })
        .where(eq(ports.id, id))
        .returning();
      
      return updatedPort;
    } catch (error) {
      console.error('Liman güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async createFerryCompany(companyData: any): Promise<FerryCompany> {
    try {
      const [createdCompany] = await db.insert(ferryCompanies).values({
        ...companyData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdCompany;
    } catch (error) {
      console.error('Feribot şirketi oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateFerryCompany(id: number, companyData: any): Promise<FerryCompany | undefined> {
    try {
      const [updatedCompany] = await db.update(ferryCompanies)
        .set({
          ...companyData,
          updatedAt: new Date()
        })
        .where(eq(ferryCompanies.id, id))
        .returning();
      
      return updatedCompany;
    } catch (error) {
      console.error('Feribot şirketi güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async createCurrency(currencyData: any): Promise<Currency> {
    try {
      const [createdCurrency] = await db.insert(currencies).values({
        ...currencyData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdCurrency;
    } catch (error) {
      console.error('Para birimi oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateCurrency(id: number, currencyData: any): Promise<Currency | undefined> {
    try {
      const [updatedCurrency] = await db.update(currencies)
        .set({
          ...currencyData,
          updatedAt: new Date()
        })
        .where(eq(currencies.id, id))
        .returning();
      
      return updatedCurrency;
    } catch (error) {
      console.error('Para birimi güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async createRoute(routeData: any): Promise<Route> {
    try {
      const [createdRoute] = await db.insert(routes).values({
        ...routeData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Schema uyumluluğu için departureCode ve arrivalCode alanlarını ekleyelim
      return {
        ...createdRoute,
        departureCode: '',
        arrivalCode: ''
      };
    } catch (error) {
      console.error('Rota oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateRoute(id: number, routeData: any): Promise<Route | undefined> {
    try {
      const [updatedRoute] = await db.update(routes)
        .set({
          ...routeData,
          updatedAt: new Date()
        })
        .where(eq(routes.id, id))
        .returning();
      
      if (!updatedRoute) {
        return undefined;
      }
      
      // Schema uyumluluğu için departureCode ve arrivalCode alanlarını ekleyelim
      return {
        ...updatedRoute,
        departureCode: '',
        arrivalCode: ''
      };
    } catch (error) {
      console.error('Rota güncelleme hatası:', error);
      return undefined;
    }
  }
  // Üyelik Seviyeleri Yönetimi
  async getAllMembershipTiers(): Promise<MembershipTier[]> {
    try {
      console.log("Tüm üyelik seviyeleri getiriliyor...");
      return await db.select().from(membershipTiers).orderBy(asc(membershipTiers.priority));
    } catch (error) {
      console.error('Üyelik seviyelerini getirme hatası:', error);
      return [];
    }
  }

  async getMembershipTierById(id: number): Promise<MembershipTier | undefined> {
    try {
      const result = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Üyelik seviyesini getirme hatası:', error);
      return undefined;
    }
  }

  async createMembershipTier(tierData: InsertMembershipTier): Promise<MembershipTier> {
    try {
      const [createdTier] = await db.insert(membershipTiers).values({
        ...tierData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdTier;
    } catch (error) {
      console.error('Üyelik seviyesi oluşturma hatası:', error);
      throw error;
    }
  }

  async updateMembershipTier(id: number, tierData: Partial<InsertMembershipTier>): Promise<MembershipTier | undefined> {
    try {
      const [updatedTier] = await db.update(membershipTiers)
        .set({
          ...tierData,
          updatedAt: new Date()
        })
        .where(eq(membershipTiers.id, id))
        .returning();
      
      return updatedTier;
    } catch (error) {
      console.error('Üyelik seviyesi güncelleme hatası:', error);
      return undefined;
    }
  }

  async deleteMembershipTier(id: number): Promise<boolean> {
    try {
      const result = await db.delete(membershipTiers)
        .where(eq(membershipTiers.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Üyelik seviyesi silme hatası:', error);
      return false;
    }
  }
  
  // Gelen Kutusu (Inbox) İşlemleri
  async getAllInboxMessages(): Promise<InboxMessage[]> {
    try {
      const messages = await db.query.inboxMessages.findMany({
        orderBy: [desc(inboxMessages.createdAt)],
        with: {
          sender: true,
          receiver: true
        }
      });
      return messages;
    } catch (error) {
      console.error('Tüm mesajları getirme hatası:', error);
      return [];
    }
  }
  
  async getInboxMessage(id: number): Promise<InboxMessage | undefined> {
    try {
      const result = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Mesaj getirme hatası:', error);
      return undefined;
    }
  }
  
  async getInboxMessagesByUser(
    userId: number, 
    options?: { onlyUnread?: boolean, includeArchived?: boolean, includeDeleted?: boolean }
  ): Promise<InboxMessage[]> {
    try {
      let query = db.select().from(inboxMessages)
        .where(eq(inboxMessages.receiverUserId, userId));
      
      // Sadece okunmamış mesajları getir
      if (options?.onlyUnread) {
        query = query.where(eq(inboxMessages.isRead, false));
      }
      
      // Arşivlenmiş mesajları dahil etme
      if (!options?.includeArchived) {
        query = query.where(eq(inboxMessages.isArchived, false));
      }
      
      // Silinmiş mesajları dahil etme
      if (!options?.includeDeleted) {
        query = query.where(eq(inboxMessages.isDeleted, false));
      }
      
      const results = await query.orderBy(desc(inboxMessages.createdAt));
      return results;
    } catch (error) {
      console.error('Kullanıcı mesajlarını getirme hatası:', error);
      return [];
    }
  }
  
  async getSentInboxMessagesByUser(userId: number): Promise<InboxMessage[]> {
    try {
      const results = await db.select().from(inboxMessages)
        .where(eq(inboxMessages.senderUserId, userId))
        .where(eq(inboxMessages.isDeleted, false))
        .orderBy(desc(inboxMessages.createdAt));
      
      return results;
    } catch (error) {
      console.error('Gönderilen mesajları getirme hatası:', error);
      return [];
    }
  }
  
  async createInboxMessage(messageData: InsertInboxMessage): Promise<InboxMessage> {
    try {
      const [createdMessage] = await db.insert(inboxMessages).values({
        ...messageData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdMessage;
    } catch (error) {
      console.error('Mesaj oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateInboxMessage(id: number, messageData: Partial<InsertInboxMessage>): Promise<InboxMessage | undefined> {
    try {
      const [updatedMessage] = await db.update(inboxMessages)
        .set({
          ...messageData,
          updatedAt: new Date()
        })
        .where(eq(inboxMessages.id, id))
        .returning();
      
      return updatedMessage;
    } catch (error) {
      console.error('Mesaj güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async markInboxMessageAsRead(id: number): Promise<InboxMessage | undefined> {
    try {
      const [updatedMessage] = await db.update(inboxMessages)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(eq(inboxMessages.id, id))
        .returning();
      
      return updatedMessage;
    } catch (error) {
      console.error('Mesajı okundu olarak işaretleme hatası:', error);
      return undefined;
    }
  }
  
  async markInboxMessageAsArchived(id: number): Promise<InboxMessage | undefined> {
    try {
      const [updatedMessage] = await db.update(inboxMessages)
        .set({
          isArchived: true,
          updatedAt: new Date()
        })
        .where(eq(inboxMessages.id, id))
        .returning();
      
      return updatedMessage;
    } catch (error) {
      console.error('Mesajı arşivlenmiş olarak işaretleme hatası:', error);
      return undefined;
    }
  }
  
  async markInboxMessageAsDeleted(id: number): Promise<InboxMessage | undefined> {
    try {
      const [updatedMessage] = await db.update(inboxMessages)
        .set({
          isDeleted: true,
          updatedAt: new Date()
        })
        .where(eq(inboxMessages.id, id))
        .returning();
      
      return updatedMessage;
    } catch (error) {
      console.error('Mesajı silinmiş olarak işaretleme hatası:', error);
      return undefined;
    }
  }
  
  async permanentlyDeleteInboxMessage(id: number): Promise<boolean> {
    try {
      const result = await db.delete(inboxMessages)
        .where(eq(inboxMessages.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Mesajı kalıcı olarak silme hatası:', error);
      return false;
    }
  }
  
  async getConversationThread(parentMessageId: number): Promise<InboxMessage[]> {
    try {
      // Önce ebeveyn mesajı bulalım
      const parentMessage = await this.getInboxMessage(parentMessageId);
      
      if (!parentMessage) {
        return [];
      }
      
      // Mesajın kendisini ve tüm yanıtlarını alalım
      const thread = await db.select().from(inboxMessages)
        .where(
          or(
            eq(inboxMessages.id, parentMessageId),
            eq(inboxMessages.parentId, parentMessageId)
          )
        )
        .orderBy(asc(inboxMessages.createdAt));
      
      return thread;
    } catch (error) {
      console.error('Konuşma dizisini getirme hatası:', error);
      return [];
    }
  }
  
  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(inboxMessages)
        .where(eq(inboxMessages.receiverUserId, userId))
        .where(eq(inboxMessages.isRead, false))
        .where(eq(inboxMessages.isDeleted, false));
      
      return result[0].count;
    } catch (error) {
      console.error('Okunmamış mesaj sayısını getirme hatası:', error);
      return 0;
    }
  }

  //===== B2B FİYATLANDIRMA MODÜLÜ =====//

  // Pricing Tiers (Fiyatlandırma Katmanları)
  async getAllPricingTiers(): Promise<PricingTier[]> {
    try {
      return await db.select().from(pricingTiers).orderBy(asc(pricingTiers.id));
    } catch (error) {
      console.error('Tüm fiyatlandırma katmanlarını getirme hatası:', error);
      return [];
    }
  }

  async getActivePricingTiers(): Promise<PricingTier[]> {
    try {
      return await db.select().from(pricingTiers)
        .where(eq(pricingTiers.isActive, true))
        .orderBy(asc(pricingTiers.id));
    } catch (error) {
      console.error('Aktif fiyatlandırma katmanlarını getirme hatası:', error);
      return [];
    }
  }

  async getPricingTier(id: number): Promise<PricingTier | undefined> {
    try {
      const result = await db.select().from(pricingTiers).where(eq(pricingTiers.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Fiyatlandırma katmanı getirme hatası:', error);
      return undefined;
    }
  }

  async createPricingTier(tierData: InsertPricingTier): Promise<PricingTier> {
    try {
      const [createdTier] = await db.insert(pricingTiers).values({
        ...tierData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdTier;
    } catch (error) {
      console.error('Fiyatlandırma katmanı oluşturma hatası:', error);
      throw error;
    }
  }

  async updatePricingTier(id: number, tierData: Partial<PricingTier>): Promise<PricingTier | undefined> {
    try {
      const [updatedTier] = await db.update(pricingTiers)
        .set({
          ...tierData,
          updatedAt: new Date()
        })
        .where(eq(pricingTiers.id, id))
        .returning();
      
      return updatedTier;
    } catch (error) {
      console.error('Fiyatlandırma katmanı güncelleme hatası:', error);
      return undefined;
    }
  }

  async deletePricingTier(id: number): Promise<boolean> {
    try {
      const result = await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
      
      return true;
    } catch (error) {
      console.error('Fiyatlandırma katmanı silme hatası:', error);
      return false;
    }
  }

  // Agency Pricing (Acente Fiyatlandırma)
  async getAllAgencyPricing(): Promise<AgencyPricing[]> {
    try {
      return await db.select().from(agencyPricing).orderBy(asc(agencyPricing.id));
    } catch (error) {
      console.error('Tüm acente fiyatlandırmalarını getirme hatası:', error);
      return [];
    }
  }

  async getAgencyPricing(id: number): Promise<AgencyPricing | undefined> {
    try {
      const result = await db.select().from(agencyPricing).where(eq(agencyPricing.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Acente fiyatlandırması getirme hatası:', error);
      return undefined;
    }
  }

  async getAgencyPricingByAgency(agencyId: number): Promise<AgencyPricing[]> {
    try {
      return await db.select().from(agencyPricing)
        .where(eq(agencyPricing.agencyId, agencyId))
        .orderBy(asc(agencyPricing.id));
    } catch (error) {
      console.error('Acente bazlı fiyatlandırmaları getirme hatası:', error);
      return [];
    }
  }

  async createAgencyPricing(pricingData: InsertAgencyPricing): Promise<AgencyPricing> {
    try {
      const [createdPricing] = await db.insert(agencyPricing).values({
        ...pricingData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdPricing;
    } catch (error) {
      console.error('Acente fiyatlandırması oluşturma hatası:', error);
      throw error;
    }
  }

  async updateAgencyPricing(id: number, pricingData: Partial<AgencyPricing>): Promise<AgencyPricing | undefined> {
    try {
      const [updatedPricing] = await db.update(agencyPricing)
        .set({
          ...pricingData,
          updatedAt: new Date()
        })
        .where(eq(agencyPricing.id, id))
        .returning();
      
      return updatedPricing;
    } catch (error) {
      console.error('Acente fiyatlandırması güncelleme hatası:', error);
      return undefined;
    }
  }

  async deleteAgencyPricing(id: number): Promise<boolean> {
    try {
      await db.delete(agencyPricing).where(eq(agencyPricing.id, id));
      
      return true;
    } catch (error) {
      console.error('Acente fiyatlandırması silme hatası:', error);
      return false;
    }
  }

  // Route Pricing (Rota Bazlı Fiyatlandırma)
  async getAllRoutePricing(): Promise<RoutePricing[]> {
    try {
      return await db.select().from(routePricing).orderBy(asc(routePricing.id));
    } catch (error) {
      console.error('Tüm rota fiyatlandırmalarını getirme hatası:', error);
      return [];
    }
  }

  async getRoutePricing(id: number): Promise<RoutePricing | undefined> {
    try {
      const result = await db.select().from(routePricing).where(eq(routePricing.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Rota fiyatlandırması getirme hatası:', error);
      return undefined;
    }
  }

  async getRoutePricingByAgency(agencyId: number): Promise<RoutePricing[]> {
    try {
      return await db.select().from(routePricing)
        .where(eq(routePricing.agencyId, agencyId))
        .orderBy(asc(routePricing.id));
    } catch (error) {
      console.error('Acente bazlı rota fiyatlandırmalarını getirme hatası:', error);
      return [];
    }
  }

  async getRoutePricingByRoute(routeId: number): Promise<RoutePricing[]> {
    try {
      return await db.select().from(routePricing)
        .where(eq(routePricing.routeId, routeId))
        .orderBy(asc(routePricing.id));
    } catch (error) {
      console.error('Rota bazlı fiyatlandırmaları getirme hatası:', error);
      return [];
    }
  }

  async getRoutePricingByAgencyAndRoute(agencyId: number, routeId: number): Promise<RoutePricing | undefined> {
    try {
      const result = await db.select().from(routePricing)
        .where(
          and(
            eq(routePricing.agencyId, agencyId),
            eq(routePricing.routeId, routeId)
          )
        );
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error('Acente ve rota bazlı fiyatlandırma getirme hatası:', error);
      return undefined;
    }
  }

  async createRoutePricing(pricingData: InsertRoutePricing): Promise<RoutePricing> {
    try {
      const [createdPricing] = await db.insert(routePricing).values({
        ...pricingData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return createdPricing;
    } catch (error) {
      console.error('Rota fiyatlandırması oluşturma hatası:', error);
      throw error;
    }
  }

  async updateRoutePricing(id: number, pricingData: Partial<RoutePricing>): Promise<RoutePricing | undefined> {
    try {
      const [updatedPricing] = await db.update(routePricing)
        .set({
          ...pricingData,
          updatedAt: new Date()
        })
        .where(eq(routePricing.id, id))
        .returning();
      
      return updatedPricing;
    } catch (error) {
      console.error('Rota fiyatlandırması güncelleme hatası:', error);
      return undefined;
    }
  }

  async deleteRoutePricing(id: number): Promise<boolean> {
    try {
      await db.delete(routePricing).where(eq(routePricing.id, id));
      
      return true;
    } catch (error) {
      console.error('Rota fiyatlandırması silme hatası:', error);
      return false;
    }
  }
  
  // Dil yönetimi fonksiyonları
  async checkAndSeedLanguages(): Promise<void> {
    try {
      // Languages tablosunu import edilmeden doğrudan kullanıyoruz
      const existingLanguages = await db.select().from(schema.languages);
      if (existingLanguages.length === 0) {
        console.log("Dil tablosu boş, temel dilleri ekliyorum...");
        
        // Temel dilleri ekle
        const defaultLanguages = [
          {
            code: "tr",
            name: "Turkish",
            localName: "Türkçe",
            flagEmoji: "🇹🇷",
            rtl: false,
            isActive: true,
            isDefault: true
          },
          {
            code: "en",
            name: "English",
            localName: "English",
            flagEmoji: "🇬🇧",
            rtl: false,
            isActive: true,
            isDefault: false
          },
          {
            code: "fr",
            name: "French",
            localName: "Français",
            flagEmoji: "🇫🇷",
            rtl: false,
            isActive: true,
            isDefault: false
          },
          {
            code: "de",
            name: "German",
            localName: "Deutsch",
            flagEmoji: "🇩🇪",
            rtl: false,
            isActive: true,
            isDefault: false
          },
          {
            code: "el",
            name: "Greek",
            localName: "Ελληνικά",
            flagEmoji: "🇬🇷",
            rtl: false,
            isActive: true,
            isDefault: false
          },
          {
            code: "ru",
            name: "Russian",
            localName: "Русский",
            flagEmoji: "🇷🇺",
            rtl: false,
            isActive: true,
            isDefault: false
          },
          {
            code: "zh",
            name: "Chinese",
            localName: "中文",
            flagEmoji: "🇨🇳",
            rtl: false,
            isActive: true,
            isDefault: false
          },
          {
            code: "ja",
            name: "Japanese",
            localName: "日本語",
            flagEmoji: "🇯🇵",
            rtl: false,
            isActive: true,
            isDefault: false
          }
        ];
        
        for (const lang of defaultLanguages) {
          await db.insert(schema.languages).values(lang);
        }
        
        console.log("Temel diller başarıyla eklendi.");
      } else {
        console.log(`${existingLanguages.length} dil zaten mevcut.`);
      }
    } catch (error) {
      console.error("Dil veri eklemesi sırasında hata:", error);
    }
  }
  
  async getAllLanguages(): Promise<any[]> {
    try {
      await this.checkAndSeedLanguages(); // Önce dil kontrolü yap
      
      const result = await db.select().from(schema.languages)
        .orderBy(desc(schema.languages.isDefault), asc(schema.languages.name));
      console.log("Raw languages data:", result.length);
      
      // Eski ham sorgu yerine drizzle ORM kullanıyoruz
      return result.map(lang => ({
        id: lang.id,
        code: lang.code,
        name: lang.name,
        localName: lang.localName,
        flagEmoji: lang.flagEmoji,
        rtl: lang.rtl,
        isActive: lang.isActive,
        isDefault: lang.isDefault
      }));
    } catch (error) {
      console.error('Tüm dilleri getirme hatası:', error);
      return [];
    }
  }
  
  async getLanguageByCode(code: string): Promise<any | undefined> {
    try {
      const result = await db.select().from(schema.languages).where(eq(schema.languages.code, code));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return {
        id: result[0].id,
        code: result[0].code,
        name: result[0].name,
        localName: result[0].localName,
        flagEmoji: result[0].flagEmoji,
        rtl: result[0].rtl,
        isActive: result[0].isActive,
        isDefault: result[0].isDefault
      };
    } catch (error) {
      console.error('Dil kodu ile dil getirme hatası:', error);
      return undefined;
    }
  }
  
  async createLanguage(data: any): Promise<any> {
    try {
      // Eğer veride "isDefault" true ise, diğer tüm dillerin isDefault değerini false yap
      if (data.isDefault) {
        await db.query.raw(`UPDATE languages SET is_default = false`);
      }
      
      const result = await db.query.raw(`
        INSERT INTO languages (
          code, name, is_active, is_default, local_name, flag_emoji, rtl
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING id, code, name, is_active as "isActive", is_default as "isDefault", 
                   local_name as "localName", flag_emoji as "flagEmoji", rtl
      `, [
        data.code,
        data.name,
        data.isActive !== undefined ? data.isActive : true,
        data.isDefault !== undefined ? data.isDefault : false,
        data.localName || null,
        data.flagEmoji || null,
        data.rtl !== undefined ? data.rtl : false
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Dil oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateLanguage(id: number, data: any): Promise<any | undefined> {
    try {
      // Eğer veride "isDefault" true ise, diğer tüm dillerin isDefault değerini false yap
      if (data.isDefault) {
        await db.query.raw(`UPDATE languages SET is_default = false`);
      }
      
      // Mevcut dil kaydını alalım
      const existingLanguage = await db.query.raw(`
        SELECT * FROM languages WHERE id = $1
      `, [id]);
      
      if (existingLanguage.rows.length === 0) {
        return undefined;
      }
      
      // Güncellenecek değerleri hazırlayalım
      const updateData = {
        code: data.code !== undefined ? data.code : existingLanguage.rows[0].code,
        name: data.name !== undefined ? data.name : existingLanguage.rows[0].name,
        is_active: data.isActive !== undefined ? data.isActive : existingLanguage.rows[0].is_active,
        is_default: data.isDefault !== undefined ? data.isDefault : existingLanguage.rows[0].is_default,
        local_name: data.localName !== undefined ? data.localName : existingLanguage.rows[0].local_name,
        flag_emoji: data.flagEmoji !== undefined ? data.flagEmoji : existingLanguage.rows[0].flag_emoji,
        rtl: data.rtl !== undefined ? data.rtl : existingLanguage.rows[0].rtl
      };
      
      const result = await db.query.raw(`
        UPDATE languages SET
          code = $1,
          name = $2,
          is_active = $3,
          is_default = $4,
          local_name = $5,
          flag_emoji = $6,
          rtl = $7
        WHERE id = $8
        RETURNING id, code, name, is_active as "isActive", is_default as "isDefault", 
                 local_name as "localName", flag_emoji as "flagEmoji", rtl
      `, [
        updateData.code,
        updateData.name,
        updateData.is_active,
        updateData.is_default,
        updateData.local_name,
        updateData.flag_emoji,
        updateData.rtl,
        id
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Dil güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async deleteLanguage(id: number): Promise<boolean> {
    try {
      // Önce dil kaydını kontrol et (varsayılan dil silinemez)
      const language = await db.query.raw(`
        SELECT is_default FROM languages WHERE id = $1
      `, [id]);
      
      if (language.rows.length === 0) {
        return false;
      }
      
      if (language.rows[0].is_default) {
        throw new Error('Varsayılan dil silinemez');
      }
      
      await db.query.raw(`DELETE FROM languages WHERE id = $1`, [id]);
      return true;
    } catch (error) {
      console.error('Dil silme hatası:', error);
      return false;
    }
  }
  
  // Translation Functions metotları
  async getAllTranslationFunctions(): Promise<any[]> {
    try {
      const result = await db.query.raw(`
        SELECT id, name, description, category, parameters, is_core as "isCore", 
               created_at as "createdAt", updated_at as "updatedAt"
        FROM translation_functions 
        ORDER BY category ASC, name ASC
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Tüm çeviri fonksiyonlarını getirme hatası:', error);
      return [];
    }
  }
  
  async getTranslationFunctionsByCategory(category: string): Promise<any[]> {
    try {
      const result = await db.query.raw(`
        SELECT id, name, description, category, parameters, is_core as "isCore", 
               created_at as "createdAt", updated_at as "updatedAt"
        FROM translation_functions 
        WHERE category = $1
        ORDER BY name ASC
      `, [category]);
      return result.rows || [];
    } catch (error) {
      console.error('Kategori bazlı çeviri fonksiyonlarını getirme hatası:', error);
      return [];
    }
  }
  
  async getTranslationFunction(id: number): Promise<any | undefined> {
    try {
      const result = await db.query.raw(`
        SELECT id, name, description, category, parameters, is_core as "isCore", 
               created_at as "createdAt", updated_at as "updatedAt"
        FROM translation_functions 
        WHERE id = $1
      `, [id]);
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('Çeviri fonksiyonu getirme hatası:', error);
      return undefined;
    }
  }
  
  async getTranslationFunctionByName(name: string): Promise<any | undefined> {
    try {
      const result = await db.query.raw(`
        SELECT id, name, description, category, parameters, is_core as "isCore", 
               created_at as "createdAt", updated_at as "updatedAt"
        FROM translation_functions 
        WHERE name = $1
      `, [name]);
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('İsim ile çeviri fonksiyonu getirme hatası:', error);
      return undefined;
    }
  }
  
  async createTranslationFunction(translationFunction: any): Promise<any> {
    try {
      const result = await db.query.raw(`
        INSERT INTO translation_functions (
          name, description, category, parameters, is_core
        ) VALUES (
          $1, $2, $3, $4, $5
        ) RETURNING id, name, description, category, parameters, is_core as "isCore", 
                   created_at as "createdAt", updated_at as "updatedAt"
      `, [
        translationFunction.name,
        translationFunction.description || null,
        translationFunction.category,
        JSON.stringify(translationFunction.parameters || []),
        translationFunction.isCore !== undefined ? translationFunction.isCore : false
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Çeviri fonksiyonu oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateTranslationFunction(id: number, translationFunction: any): Promise<any | undefined> {
    try {
      // Önce mevcut veriyi alalım
      const existingFunction = await this.getTranslationFunction(id);
      if (!existingFunction) return undefined;
      
      // Güncellenecek alanları hazırlayalım
      const updatedValues = {
        name: translationFunction.name || existingFunction.name,
        description: translationFunction.description !== undefined ? translationFunction.description : existingFunction.description,
        category: translationFunction.category || existingFunction.category,
        parameters: translationFunction.parameters !== undefined ? JSON.stringify(translationFunction.parameters) : existingFunction.parameters,
        isCore: translationFunction.isCore !== undefined ? translationFunction.isCore : existingFunction.isCore,
      };
      
      const result = await db.query.raw(`
        UPDATE translation_functions SET
          name = $1,
          description = $2,
          category = $3,
          parameters = $4,
          is_core = $5,
          updated_at = NOW()
        WHERE id = $6
        RETURNING id, name, description, category, parameters, is_core as "isCore", 
                 created_at as "createdAt", updated_at as "updatedAt"
      `, [
        updatedValues.name,
        updatedValues.description,
        updatedValues.category,
        updatedValues.parameters,
        updatedValues.isCore,
        id
      ]);
      
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('Çeviri fonksiyonu güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async deleteTranslationFunction(id: number): Promise<boolean> {
    try {
      // Fonksiyona bağlı tüm çeviri öğelerini de silmek gerekli
      await db.query.raw(`DELETE FROM translation_items WHERE function_id = $1`, [id]);
      
      // Fonksiyonun kendisini silelim
      const result = await db.query.raw(`DELETE FROM translation_functions WHERE id = $1 RETURNING id`, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Çeviri fonksiyonu silme hatası:', error);
      return false;
    }
  }
  
  // Translation Items metotları
  async getAllTranslationItems(): Promise<any[]> {
    try {
      const result = await db.query.raw(`
        SELECT i.id, i.function_id as "functionId", i.language_id as "languageId", 
               i.item_key as "itemKey", i.item_value as "itemValue", 
               i.created_at as "createdAt", i.updated_at as "updatedAt",
               f.name as "functionName", l.code as "languageCode"
        FROM translation_items i
        JOIN translation_functions f ON i.function_id = f.id
        JOIN languages l ON i.language_id = l.id
        ORDER BY f.name ASC, i.item_key ASC, l.code ASC
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Tüm çeviri öğelerini getirme hatası:', error);
      return [];
    }
  }
  
  async getTranslationItemsByFunction(functionId: number): Promise<any[]> {
    try {
      const result = await db.query.raw(`
        SELECT i.id, i.function_id as "functionId", i.language_id as "languageId", 
               i.item_key as "itemKey", i.item_value as "itemValue", 
               i.created_at as "createdAt", i.updated_at as "updatedAt",
               f.name as "functionName", l.code as "languageCode"
        FROM translation_items i
        JOIN translation_functions f ON i.function_id = f.id
        JOIN languages l ON i.language_id = l.id
        WHERE i.function_id = $1
        ORDER BY i.item_key ASC, l.code ASC
      `, [functionId]);
      return result.rows || [];
    } catch (error) {
      console.error('Fonksiyona göre çeviri öğelerini getirme hatası:', error);
      return [];
    }
  }
  
  async getTranslationItemsByLanguage(languageId: number): Promise<any[]> {
    try {
      const result = await db.query.raw(`
        SELECT i.id, i.function_id as "functionId", i.language_id as "languageId", 
               i.item_key as "itemKey", i.item_value as "itemValue", 
               i.created_at as "createdAt", i.updated_at as "updatedAt",
               f.name as "functionName", l.code as "languageCode"
        FROM translation_items i
        JOIN translation_functions f ON i.function_id = f.id
        JOIN languages l ON i.language_id = l.id
        WHERE i.language_id = $1
        ORDER BY f.name ASC, i.item_key ASC
      `, [languageId]);
      return result.rows || [];
    } catch (error) {
      console.error('Dile göre çeviri öğelerini getirme hatası:', error);
      return [];
    }
  }
  
  async getTranslationItemsByFunctionAndLanguage(functionId: number, languageId: number): Promise<any[]> {
    try {
      const result = await db.query.raw(`
        SELECT i.id, i.function_id as "functionId", i.language_id as "languageId", 
               i.item_key as "itemKey", i.item_value as "itemValue", 
               i.created_at as "createdAt", i.updated_at as "updatedAt",
               f.name as "functionName", l.code as "languageCode"
        FROM translation_items i
        JOIN translation_functions f ON i.function_id = f.id
        JOIN languages l ON i.language_id = l.id
        WHERE i.function_id = $1 AND i.language_id = $2
        ORDER BY i.item_key ASC
      `, [functionId, languageId]);
      return result.rows || [];
    } catch (error) {
      console.error('Fonksiyon ve dile göre çeviri öğelerini getirme hatası:', error);
      return [];
    }
  }
  
  async getTranslationItem(id: number): Promise<any | undefined> {
    try {
      const result = await db.query.raw(`
        SELECT i.id, i.function_id as "functionId", i.language_id as "languageId", 
               i.item_key as "itemKey", i.item_value as "itemValue", 
               i.created_at as "createdAt", i.updated_at as "updatedAt",
               f.name as "functionName", l.code as "languageCode"
        FROM translation_items i
        JOIN translation_functions f ON i.function_id = f.id
        JOIN languages l ON i.language_id = l.id
        WHERE i.id = $1
      `, [id]);
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('Çeviri öğesi getirme hatası:', error);
      return undefined;
    }
  }
  
  async createTranslationItem(translationItem: any): Promise<any> {
    try {
      const result = await db.query.raw(`
        INSERT INTO translation_items (
          function_id, language_id, item_key, item_value
        ) VALUES (
          $1, $2, $3, $4
        ) RETURNING id, function_id as "functionId", language_id as "languageId", 
                   item_key as "itemKey", item_value as "itemValue", 
                   created_at as "createdAt", updated_at as "updatedAt"
      `, [
        translationItem.functionId,
        translationItem.languageId,
        translationItem.itemKey,
        translationItem.itemValue
      ]);
      
      // Ek olarak fonksiyon adı ve dil kodunu ekleyelim
      const item = result.rows[0];
      const function_ = await this.getTranslationFunction(item.functionId);
      const language = await this.getLanguageByCode(item.languageId);
      
      return {
        ...item,
        functionName: function_?.name,
        languageCode: language?.code
      };
    } catch (error) {
      console.error('Çeviri öğesi oluşturma hatası:', error);
      throw error;
    }
  }
  
  async updateTranslationItem(id: number, translationItem: any): Promise<any | undefined> {
    try {
      // Önce mevcut veriyi alalım
      const existingItem = await this.getTranslationItem(id);
      if (!existingItem) return undefined;
      
      // Güncellenecek alanları hazırlayalım
      const updatedValues = {
        functionId: translationItem.functionId || existingItem.functionId,
        languageId: translationItem.languageId || existingItem.languageId,
        itemKey: translationItem.itemKey || existingItem.itemKey,
        itemValue: translationItem.itemValue !== undefined ? translationItem.itemValue : existingItem.itemValue,
      };
      
      const result = await db.query.raw(`
        UPDATE translation_items SET
          function_id = $1,
          language_id = $2,
          item_key = $3,
          item_value = $4,
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, function_id as "functionId", language_id as "languageId", 
                 item_key as "itemKey", item_value as "itemValue", 
                 created_at as "createdAt", updated_at as "updatedAt"
      `, [
        updatedValues.functionId,
        updatedValues.languageId,
        updatedValues.itemKey,
        updatedValues.itemValue,
        id
      ]);
      
      if (result.rows.length === 0) return undefined;
      
      // Ek olarak fonksiyon adı ve dil kodunu ekleyelim
      const item = result.rows[0];
      const function_ = await this.getTranslationFunction(item.functionId);
      const language = await this.getLanguageByCode(item.languageId);
      
      return {
        ...item,
        functionName: function_?.name,
        languageCode: language?.code
      };
    } catch (error) {
      console.error('Çeviri öğesi güncelleme hatası:', error);
      return undefined;
    }
  }
  
  async deleteTranslationItem(id: number): Promise<boolean> {
    try {
      const result = await db.query.raw(`DELETE FROM translation_items WHERE id = $1 RETURNING id`, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Çeviri öğesi silme hatası:', error);
      return false;
    }
  }
  
  // ==================
  // BİLDİRİM METOTLARI
  // ==================
  
  // Kullanıcının okunmamış bildirim sayısını al
  async getUnreadNotificationsCount(userId: number): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      return result[0].count;
    } catch (error) {
      console.error(`${userId} ID'li kullanıcının okunmamış bildirim sayısını getirme hatası:`, error);
      return 0;
    }
  }
  

  
  // Bildirim detaylarını getir
  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const result = await db.select()
        .from(notifications)
        .where(eq(notifications.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      console.error(`${id} ID'li bildirimi getirme hatası:`, error);
      return undefined;
    }
  }
  
  // Tüm bildirimleri getir (admin için)
  async getAllNotifications(): Promise<Notification[]> {
    try {
      const result = await db.select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));
      
      return result;
    } catch (error) {
      console.error('Tüm bildirimleri getirme hatası:', error);
      return [];
    }
  }
  
  // Kullanıcının bildirimlerini getir
  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      const result = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
      
      return result;
    } catch (error) {
      console.error(`${userId} ID'li kullanıcının bildirimlerini getirme hatası:`, error);
      return [];
    }
  }
  
  // Yeni bildirim oluştur
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const [notification] = await db.insert(notifications)
        .values({
          ...notificationData,
          createdAt: new Date()
        })
        .returning();
      
      console.log(`Bildirim oluşturuldu: ${notification.title} (${notification.id})`);
      
      // WebSocket üzerinden ilgili kullanıcıya bildirim gönder (eğer WebSocket bağlantısı kurulmuşsa)
      if (notificationData.userId) {
        this.sendNotificationViaWebSocket(notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
      throw error;
    }
  }
  
  // WebSocket üzerinden bildirim gönderme
  private sendNotificationViaWebSocket(notification: Notification): void {
    try {
      // Bu metot, routes.ts'deki WebSocket yapısını kullanır
      // routes.ts içinde tanımlı bir webSocketServer'a erişim olmadığından burada sadece log bırakıyoruz.
      // WebSocket üzerinden bildirim gönderimi routes.ts'de ayrıca ele alınacak
      console.log(`WebSocket üzerinden bildirim gönderilecek. Kullanıcı ID: ${notification.userId}`);
    } catch (error) {
      console.error('WebSocket üzerinden bildirim gönderme hatası:', error);
    }
  }
  
  // Bildirimi okundu olarak işaretle
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
      
      return notification;
    } catch (error) {
      console.error(`${id} ID'li bildirimi okundu olarak işaretleme hatası:`, error);
      return undefined;
    }
  }
  
  // Kullanıcının tüm bildirimlerini okundu olarak işaretle
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      return true;
    } catch (error) {
      console.error(`${userId} ID'li kullanıcının tüm bildirimlerini okundu olarak işaretleme hatası:`, error);
      return false;
    }
  }
  
  // Bildirimi sil
  async deleteNotification(id: number): Promise<boolean> {
    try {
      const result = await db.delete(notifications)
        .where(eq(notifications.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`${id} ID'li bildirimi silme hatası:`, error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
