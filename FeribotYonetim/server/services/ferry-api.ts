/**
 * Ferry API Servis Modülü
 * 
 * Bu modül, Ferry API entegrasyonu için gerekli fonksiyonları içerir.
 * Farklı tedarikçilere ait API'ları tek bir arayüz altında yönetir.
 */
import axios, { AxiosInstance } from 'axios';
import { BusWagnerSupplier } from '@shared/schema';

// Hata mesajları için localization
const ERRORS = {
  CONNECTION: 'API bağlantısı kurulamadı',
  UNAUTHORIZED: 'API yetkilendirme hatası',
  INVALID_RESPONSE: 'Geçersiz API yanıtı',
  RATE_LIMITED: 'API istek limiti aşıldı',
  SERVER_ERROR: 'Tedarikçi API sunucusu hatası',
  TIMEOUT: 'API istek zaman aşımı',
  UNKNOWN: 'Bilinmeyen API hatası'
};

// API endpoint'leri
const ENDPOINTS = {
  STATUS: '/api/v1/status',
  ROUTES: '/api/v1/routes',
  SCHEDULES: '/api/v1/schedules',
  SEATS: '/api/v1/seats',
  BOOKING: '/api/v1/bookings',
  CITIES: '/api/v1/cities'
};

/**
 * Ferry API için temel servis oluşturur
 */
export class FerryApiService {
  private client: AxiosInstance;
  private supplier: BusWagnerSupplier;
  private retryCount: number = 3;
  private lastApiCall: number = 0;
  private rateLimitDelay: number = 1000; // ms

  constructor(supplier: BusWagnerSupplier) {
    this.supplier = supplier;
    
    // API istemcisi yapılandırması
    this.client = axios.create({
      baseURL: supplier.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Api-Key': supplier.apiKey
      }
    });
    
    // İstek interceptor'ı - tüm isteklerde otomatik yetkilendirme
    this.client.interceptors.request.use(
      (config) => {
        if (config.headers && !config.headers['Authorization'] && this.supplier.secretKey) {
          config.headers['Authorization'] = `Bearer ${this.supplier.secretKey}`;
        }
        
        // Rate limiting kontrolü
        const now = Date.now();
        const timeElapsed = now - this.lastApiCall;
        
        if (timeElapsed < this.rateLimitDelay) {
          return new Promise(resolve => {
            setTimeout(() => {
              this.lastApiCall = Date.now();
              resolve(config);
            }, this.rateLimitDelay - timeElapsed);
          });
        }
        
        this.lastApiCall = now;
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Yanıt interceptor'ı - hata işleme
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error;
        
        // Yeniden deneme sayısını kontrol et
        if (config && config._retry === undefined) {
          config._retry = 0;
        }
        
        // Rate limiting durumunda otomatik yeniden deneme
        if (response && response.status === 429 && config._retry < this.retryCount) {
          config._retry++;
          const delay = response.headers['retry-after'] 
            ? parseInt(response.headers['retry-after']) * 1000 
            : this.rateLimitDelay * 2;
          
          return new Promise(resolve => {
            setTimeout(() => resolve(this.client(config)), delay);
          });
        }
        
        // Yetkilendirme sorunu durumunda otomatik token yenileme ve yeniden deneme
        if (response && response.status === 401 && config._retry < this.retryCount) {
          config._retry++;
          try {
            // Token yenileme isteği (eğer supplier.refreshToken varsa)
            if (this.supplier.refreshToken) {
              const refreshResult = await this.refreshAccessToken();
              if (refreshResult.success) {
                config.headers['Authorization'] = `Bearer ${refreshResult.accessToken}`;
                return this.client(config);
              }
            }
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        
        // Standart hata yanıtı oluştur
        return Promise.reject(this.formatError(error));
      }
    );
  }
  
  /**
   * API hata mesajlarını formatlama
   */
  private formatError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      
      // Duruma göre özel hata mesajı oluştur
      switch (status) {
        case 401:
          return new Error(data?.message || ERRORS.UNAUTHORIZED);
        case 429:
          return new Error(data?.message || ERRORS.RATE_LIMITED);
        case 500:
        case 502:
        case 503:
        case 504:
          return new Error(data?.message || ERRORS.SERVER_ERROR);
        default:
          return new Error(data?.message || `${ERRORS.UNKNOWN} (${status})`);
      }
    } else if (error.request) {
      // İstek gönderildi ama yanıt alınamadı
      return new Error(error.code === 'ECONNABORTED' ? ERRORS.TIMEOUT : ERRORS.CONNECTION);
    }
    
    // İstek oluşturulurken hata
    return new Error(error.message || ERRORS.UNKNOWN);
  }
  
  /**
   * Yetkilendirme token'ını yenileme
   */
  private async refreshAccessToken(): Promise<{ success: boolean; accessToken?: string }> {
    try {
      if (!this.supplier.refreshToken) {
        return { success: false };
      }
      
      const response = await axios.post(
        `${this.supplier.apiUrl}/auth/refresh`,
        { refresh_token: this.supplier.refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.data && response.data.access_token) {
        // Token'ı güncelle
        this.supplier.secretKey = response.data.access_token;
        
        // Eğer veritabanında güncellemek için bir callback sağlanmışsa kullan
        if (this.supplier.onTokenRefresh) {
          await this.supplier.onTokenRefresh(response.data.access_token);
        }
        
        return { 
          success: true, 
          accessToken: response.data.access_token 
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Token yenileme hatası:', error);
      return { success: false };
    }
  }
  
  /**
   * API durum kontrolü
   */
  async checkStatus(): Promise<{ status: 'success' | 'error'; message: string; details?: any }> {
    try {
      const response = await this.client.get(ENDPOINTS.STATUS);
      
      if (response.status === 200) {
        return { 
          status: 'success', 
          message: 'API bağlantısı başarılı',
          details: response.data
        };
      }
      
      return {
        status: 'error',
        message: 'API yanıt verdi ancak beklenmeyen durum kodu: ' + response.status
      };
    } catch (error) {
      console.error('API durum kontrolü hatası:', error);
      return {
        status: 'error',
        message: error.message || ERRORS.UNKNOWN,
        details: error.response?.data
      };
    }
  }
  
  /**
   * Tüm rotaları getir
   */
  async getRoutes(): Promise<any[]> {
    try {
      const response = await this.client.get(ENDPOINTS.ROUTES);
      
      if (!response.data || !Array.isArray(response.data.routes)) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }
      
      // API yanıtını standardize et
      return response.data.routes.map(route => ({
        externalRouteId: route.id || route.route_id,
        supplierId: this.supplier.id,
        departureCity: route.departure_city,
        arrivalCity: route.arrival_city,
        departureLocation: route.departure_location,
        arrivalLocation: route.arrival_location,
        distance: route.distance,
        duration: route.duration,
        basePrice: route.base_price,
        currency: route.currency || 'TRY',
        isActive: route.is_active === undefined ? true : Boolean(route.is_active),
        routeType: route.route_type || 'standard',
        description: route.description || null,
        amenities: route.amenities || null
      }));
    } catch (error) {
      console.error('Rota alma hatası:', error);
      throw error;
    }
  }
  
  /**
   * Belirli bir rotanın seferlerini getir
   */
  async getSchedules(routeId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`${ENDPOINTS.SCHEDULES}?routeId=${routeId}`);
      
      if (!response.data || !Array.isArray(response.data.schedules)) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }
      
      // API yanıtını standardize et
      return response.data.schedules.map(schedule => ({
        externalScheduleId: schedule.id || schedule.schedule_id,
        routeId: routeId,
        supplierId: this.supplier.id,
        departureTime: schedule.departure_time,
        arrivalTime: schedule.arrival_time,
        departureDate: schedule.departure_date,
        arrivalDate: schedule.arrival_date,
        availableSeats: schedule.available_seats,
        totalSeats: schedule.total_seats,
        price: schedule.price,
        currency: schedule.currency || 'TRY',
        isActive: schedule.is_active === undefined ? true : Boolean(schedule.is_active),
        vehicleType: schedule.vehicle_type || null,
        features: schedule.features || null
      }));
    } catch (error) {
      console.error('Sefer alma hatası:', error);
      throw error;
    }
  }
  
  /**
   * Belirli bir seferin koltuk durumunu getir
   */
  async getSeats(scheduleId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`${ENDPOINTS.SEATS}?scheduleId=${scheduleId}`);
      
      if (!response.data || !Array.isArray(response.data.seats)) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }
      
      // API yanıtını standardize et
      return response.data.seats.map(seat => ({
        externalSeatId: seat.id || seat.seat_id,
        scheduleId: scheduleId,
        supplierId: this.supplier.id,
        seatNumber: seat.seat_number,
        seatType: seat.seat_type || 'standard',
        status: seat.status,
        price: seat.price,
        currency: seat.currency || 'TRY',
        features: seat.features || null
      }));
    } catch (error) {
      console.error('Koltuk alma hatası:', error);
      throw error;
    }
  }
  
  /**
   * Rezervasyon oluştur
   */
  async createBooking(bookingData: any): Promise<any> {
    try {
      // Rezervasyon isteği formatını standardize et
      const formattedBookingData = {
        schedule_id: bookingData.scheduleId,
        passengers: bookingData.passengers.map(passenger => ({
          first_name: passenger.firstName,
          last_name: passenger.lastName,
          gender: passenger.gender,
          identity_number: passenger.identityNumber,
          seat_number: passenger.seatNumber
        })),
        contact: {
          name: bookingData.contactName,
          phone: bookingData.contactPhone,
          email: bookingData.contactEmail
        },
        additional_info: bookingData.additionalInfo || {}
      };
      
      const response = await this.client.post(ENDPOINTS.BOOKING, formattedBookingData);
      
      if (!response.data || !response.data.booking) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }
      
      // API yanıtını standardize et
      return {
        externalBookingId: response.data.booking.id || response.data.booking.booking_id,
        pnrNumber: response.data.booking.pnr,
        supplierId: this.supplier.id,
        status: response.data.booking.status,
        scheduleId: bookingData.scheduleId,
        totalPrice: response.data.booking.total_price,
        currency: response.data.booking.currency || 'TRY',
        paymentStatus: response.data.booking.payment_status,
        passengerCount: bookingData.passengers.length,
        createdAt: new Date(),
        expiresAt: response.data.booking.expires_at
      };
    } catch (error) {
      console.error('Rezervasyon oluşturma hatası:', error);
      throw error;
    }
  }
  
  /**
   * Rezervasyon bilgilerini getir
   */
  async getBooking(bookingId: string): Promise<any> {
    try {
      const response = await this.client.get(`${ENDPOINTS.BOOKING}/${bookingId}`);
      
      if (!response.data || !response.data.booking) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }
      
      // API yanıtını standardize et
      return {
        externalBookingId: response.data.booking.id || response.data.booking.booking_id,
        pnrNumber: response.data.booking.pnr,
        supplierId: this.supplier.id,
        status: response.data.booking.status,
        scheduleId: response.data.booking.schedule_id,
        totalPrice: response.data.booking.total_price,
        currency: response.data.booking.currency || 'TRY',
        paymentStatus: response.data.booking.payment_status,
        passengerCount: response.data.booking.passenger_count,
        createdAt: response.data.booking.created_at,
        expiresAt: response.data.booking.expires_at,
        passengers: response.data.booking.passengers.map(passenger => ({
          firstName: passenger.first_name,
          lastName: passenger.last_name,
          gender: passenger.gender,
          identityNumber: passenger.identity_number,
          seatNumber: passenger.seat_number
        }))
      };
    } catch (error) {
      console.error('Rezervasyon alma hatası:', error);
      throw error;
    }
  }
  
  /**
   * Rezervasyon iptal et
   */
  async cancelBooking(bookingId: string, reason: string = ''): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post(`${ENDPOINTS.BOOKING}/${bookingId}/cancel`, { reason });
      
      if (response.status === 200 || response.status === 204) {
        return {
          success: true,
          message: 'Rezervasyon başarıyla iptal edildi'
        };
      }
      
      return {
        success: false,
        message: response.data?.message || 'Rezervasyon iptal işlemi başarısız'
      };
    } catch (error) {
      console.error('Rezervasyon iptal hatası:', error);
      return {
        success: false,
        message: error.message || ERRORS.UNKNOWN
      };
    }
  }
  
  /**
   * Şehir listesini getir
   */
  async getCities(): Promise<any[]> {
    try {
      const response = await this.client.get(ENDPOINTS.CITIES);
      
      if (!response.data || !Array.isArray(response.data.cities)) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }
      
      // API yanıtını standardize et
      return response.data.cities.map(city => ({
        externalCityId: city.id || city.city_id,
        name: city.name,
        code: city.code,
        country: city.country,
        isActive: city.is_active === undefined ? true : Boolean(city.is_active),
        locations: Array.isArray(city.locations) ? city.locations.map(location => ({
          id: location.id,
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude
        })) : []
      }));
    } catch (error) {
      console.error('Şehir listesi alma hatası:', error);
      throw error;
    }
  }
}

/**
 * Ferry API servisi oluşturma fabrika fonksiyonu
 */
export function createFerryApiService(supplier: BusWagnerSupplier): FerryApiService {
  return new FerryApiService(supplier);
}