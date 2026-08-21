import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Backoffice API Entegrasyon Servisi
 * http://api.backoffice.web.tr/swagger/index.html API'si ile entegrasyon sağlar
 */
export class BackofficeApiService {
  private apiClient: AxiosInstance;
  private apiKey: string | null = null;
  private apiPassword: string | null = null;
  private baseUrl = 'http://api.backoffice.web.tr';
  private isInitialized = false;

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // API anahtarı ve şifresini .env dosyasından kontrol et
    if (process.env.BACKOFFICE_API_KEY && process.env.BACKOFFICE_API_PASSWORD) {
      this.initialize(process.env.BACKOFFICE_API_KEY, process.env.BACKOFFICE_API_PASSWORD);
    } else {
      console.log('BACKOFFICE_API_KEY veya BACKOFFICE_API_PASSWORD bulunamadı, demo modunda çalışılıyor');
    }
  }

  /**
   * API servisini başlat ve yetkilendirme başlığını hazırla
   * @param apiKey API Anahtarı
   * @param apiPassword API Şifresi
   */
  public initialize(apiKey: string, apiPassword: string): void {
    this.apiKey = apiKey;
    this.apiPassword = apiPassword;
    this.isInitialized = true;

    // Tüm isteklere authorization başlığı ekle
    this.apiClient.interceptors.request.use((config) => {
      // Axios 1.x için headers objesini oluştur
      if (!config.headers) {
        config.headers = {};
      }
      
      // Basic auth header oluştur
      if (this.apiKey && this.apiPassword) {
        const credentials = `${this.apiKey}:${this.apiPassword}`;
        const base64Credentials = Buffer.from(credentials).toString('base64');
        config.headers['Authorization'] = `Basic ${base64Credentials}`;
      }
      
      return config;
    });

    console.log('Backoffice API servisi başlatıldı');
  }

  /**
   * API hazır olup olmadığını kontrol et
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Genel API istek fonksiyonu
   * @param method HTTP metodu
   * @param endpoint API endpoint'i
   * @param data İstek verisi
   * @param config Axios konfigürasyonu
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.isInitialized) {
      return this.handleDemoMode<T>(endpoint, method);
    }

    try {
      let response;

      switch (method) {
        case 'GET':
          response = await this.apiClient.get<T>(endpoint, config);
          break;
        case 'POST':
          response = await this.apiClient.post<T>(endpoint, data, config);
          break;
        case 'PUT':
          response = await this.apiClient.put<T>(endpoint, data, config);
          break;
        case 'DELETE':
          response = await this.apiClient.delete<T>(endpoint, config);
          break;
      }

      return response.data;
    } catch (error) {
      console.error(`Backoffice API isteği başarısız (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Demo mod için sahte API yanıtı oluştur
   */
  private handleDemoMode<T>(endpoint: string, method: string): Promise<T> {
    console.log(`[DEMO] Backoffice API isteği: ${method} ${endpoint}`);
    
    // Endpoint'e göre sahte veri döndür
    return new Promise((resolve) => {
      setTimeout(() => {
        // Endpoint'e göre örnek yanıtlar
        const demoResponses: Record<string, any> = {
          // Rota bilgileri
          '/api/routes': [
            { id: 'DEMO-1', name: 'Istanbul - Izmir', departurePort: 'Istanbul', arrivalPort: 'Izmir' },
            { id: 'DEMO-2', name: 'Istanbul - Bursa', departurePort: 'Istanbul', arrivalPort: 'Bursa' },
          ],
          // Sefer bilgileri
          '/api/voyages': [
            { id: 'VOY-1', routeId: 'DEMO-1', departureTime: '2023-04-15T08:00:00', price: 250.00 },
            { id: 'VOY-2', routeId: 'DEMO-1', departureTime: '2023-04-15T14:00:00', price: 230.00 },
          ],
          // Varsayılan yanıt
          'default': { success: true, message: 'Demo yanıtı', timestamp: new Date().toISOString() }
        };

        // Endpoint'e göre yanıt döndür veya varsayılan yanıt kullan
        const matchingEndpoint = Object.keys(demoResponses).find(key => endpoint.includes(key));
        const response = matchingEndpoint ? demoResponses[matchingEndpoint] : demoResponses['default'];
        
        resolve(response as T);
      }, 500); // 500ms gecikme ile demo yanıt
    });
  }

  /**
   * Rotaları getir
   */
  public async getRoutes(): Promise<any[]> {
    return this.request<any[]>('GET', '/api/routes');
  }

  /**
   * Belirli bir rota için seferleri getir
   * @param routeId Rota ID
   */
  public async getVoyagesByRoute(routeId: string): Promise<any[]> {
    return this.request<any[]>('GET', `/api/voyages?routeId=${routeId}`);
  }

  /**
   * Rezervasyon oluştur
   * @param reservationData Rezervasyon verileri
   */
  public async createReservation(reservationData: any): Promise<any> {
    return this.request<any>('POST', '/api/reservations', reservationData);
  }

  /**
   * PNR ile rezervasyon sorgula
   * @param pnr PNR kodu
   */
  public async getReservationByPnr(pnr: string): Promise<any> {
    return this.request<any>('GET', `/api/reservations/pnr/${pnr}`);
  }

  /**
   * API durumunu kontrol et
   */
  public async checkStatus(): Promise<{ status: string; message: string }> {
    try {
      const result = await this.request<{ status: string }>('GET', '/api/status');
      return { status: 'success', message: 'API bağlantısı başarılı' };
    } catch (error) {
      return { status: 'error', message: 'API bağlantısı kurulamadı' };
    }
  }
}

// Servis örneğini oluştur ve dışa aktar
export const backofficeApiService = new BackofficeApiService();