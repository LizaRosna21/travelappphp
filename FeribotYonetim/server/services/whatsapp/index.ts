import { Client, ClientOptions, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { formatPhoneForWhatsApp } from '../utils';

// ES Modules için __dirname ve __filename oluşturma
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type declaration for the session data
type SessionData = {
  WABrowserId: string;
  WASecretBundle: string;
  WAToken1: string;
  WAToken2: string;
};

/**
 * WhatsApp Web API Service
 * Web tabanlı WhatsApp API servisi
 */
class WhatsAppService {
  private client: Client | null = null;
  private clientReady = false;
  private sessionDataPath: string;
  private qrCodeCallback: ((qrCodeData: string) => void) | null = null;

  constructor() {
    // Session data için dosya yolu
    this.sessionDataPath = path.join(__dirname, '../../../.wwebjs_auth/session.json');
    
    // Demo modunda veya üretim dışı ortamlarda client başlatma
    const isDemoMode = process.env.DEMO_MODE === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction || isDemoMode) {
      this.initializeDemoMode();
    } else {
      this.initializeClient();
    }
  }

  /**
   * Demo modunda çalışma (sadece log üretir)
   */
  private initializeDemoMode() {
    console.log('[DEMO] WhatsApp Web Service initialized in demo mode');
    
    // Demo modunda mesaj gönderebilmek için clientReady'i true yap
    setTimeout(() => {
      this.clientReady = true;
      console.log('[DEMO] WhatsApp Web Service ready in demo mode');
    }, 1000);
  }

  /**
   * WhatsApp client'ı başlat
   */
  private initializeClient() {
    try {
      console.log('Initializing WhatsApp Web Service');
      
      // Önceki oturum verisini yükle
      const sessionData = this.loadSessionData();
      
      // Client options
      const clientOptions: ClientOptions = {
        authTimeoutMs: 60000,
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      };

      // Oturum verisini client options'a ekle
      if (sessionData) {
        clientOptions.session = sessionData;
      }

      // Client oluştur
      this.client = new Client(clientOptions);
      
      // QR kod olayı
      this.client.on('qr', (qr) => {
        console.log('WhatsApp QR Code received, scan with your phone');
        
        // Terminal için QR kod
        qrcode.generate(qr, { small: true });
        
        // QR code callback'i çağır
        if (this.qrCodeCallback) {
          this.qrCodeCallback(qr);
        }
      });
      
      // Ready olayı
      this.client.on('ready', () => {
        console.log('WhatsApp Web Service is ready');
        this.clientReady = true;
      });
      
      // Authenticated olayı
      this.client.on('authenticated', (session) => {
        console.log('WhatsApp Web Service authenticated');
        if (session) {
          this.saveSessionData(session as unknown as SessionData);
        }
      });
      
      // Auth failure olayı
      this.client.on('auth_failure', (error) => {
        console.error('WhatsApp Web Service authentication failed:', error);
        this.clientReady = false;
        
        // Oturum verisini temizle
        this.clearSessionData();
      });
      
      // Disconnected olayı
      this.client.on('disconnected', (reason) => {
        console.log('WhatsApp Web Service disconnected:', reason);
        this.clientReady = false;
        
        // Oturum verisini temizle
        this.clearSessionData();
        
        // Yeniden bağlan
        setTimeout(() => {
          console.log('Attempting to reconnect WhatsApp Web Service');
          this.initializeClient();
        }, 5000);
      });
      
      // Client'ı başlat
      this.client.initialize();
      
    } catch (error) {
      console.error('Error initializing WhatsApp Web Service:', error);
      this.clientReady = false;
    }
  }

  /**
   * Oturum verisini yükle
   */
  private loadSessionData(): SessionData | null {
    try {
      if (fs.existsSync(this.sessionDataPath)) {
        const sessionData = JSON.parse(fs.readFileSync(this.sessionDataPath, 'utf8'));
        console.log('WhatsApp session data loaded');
        return sessionData;
      }
    } catch (error) {
      console.error('Error loading WhatsApp session data:', error);
    }
    return null;
  }

  /**
   * Oturum verisini kaydet
   */
  private saveSessionData(sessionData: SessionData): void {
    try {
      // Dizin yoksa oluştur
      const dir = path.dirname(this.sessionDataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.sessionDataPath, JSON.stringify(sessionData), 'utf8');
      console.log('WhatsApp session data saved');
    } catch (error) {
      console.error('Error saving WhatsApp session data:', error);
    }
  }

  /**
   * Oturum verisini temizle
   */
  private clearSessionData(): void {
    try {
      if (fs.existsSync(this.sessionDataPath)) {
        fs.unlinkSync(this.sessionDataPath);
        console.log('WhatsApp session data cleared');
      }
    } catch (error) {
      console.error('Error clearing WhatsApp session data:', error);
    }
  }

  /**
   * Client'ın hazır olup olmadığını kontrol et
   */
  public isClientReady(): boolean {
    return this.clientReady;
  }

  /**
   * QR kod için callback ekle
   */
  public onQRCode(callback: (qrCodeData: string) => void): void {
    this.qrCodeCallback = callback;
  }

  /**
   * Mesaj gönder
   */
  public async sendMessage(to: string, message: string): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp message to ${to}: ${message.substring(0, 50)}...`);
        return { id: `demo_${Date.now()}` };
      }
      
      // Client hazır değilse hata döndür
      if (!this.client || !this.clientReady) {
        throw new Error('WhatsApp client is not ready');
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Mesajı gönder
      const response = await this.client.sendMessage(`${formattedNumber}@c.us`, message);
      return { id: response.id.id };
    } catch (error) {
      console.error(`Error sending WhatsApp message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Medya gönder
   */
  public async sendMedia(to: string, mediaUrl: string, caption?: string): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp media to ${to}: ${mediaUrl}`);
        return { id: `demo_${Date.now()}` };
      }
      
      // Client hazır değilse hata döndür
      if (!this.client || !this.clientReady) {
        throw new Error('WhatsApp client is not ready');
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Demo modda zaten kontrol yapıyoruz, bu kısma ulaşılamaz
      const message = `${caption || ''}\n\nMedia: ${mediaUrl}`;
      const media = await this.client.sendMessage(`${formattedNumber}@c.us`, message);
      
      return { id: media.id.id };
    } catch (error) {
      console.error(`Error sending WhatsApp media to ${to}:`, error);
      
      // Medya gönderimi başarısız olursa, sadece link ile mesaj gönder
      try {
        const message = `${caption || ''}\n\nMedia: ${mediaUrl}`;
        return await this.sendMessage(to, message);
      } catch (fallbackError) {
        console.error(`Fallback error sending WhatsApp message to ${to}:`, fallbackError);
        throw error;
      }
    }
  }

  /**
   * Toplu mesaj gönder
   */
  public async sendBulkMessages(recipients: string[], message: string): Promise<any[]> {
    const results = [];
    
    // Her alıcıya tek tek mesaj gönder
    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(recipient, message);
        results.push({ recipient, success: true, id: result.id });
      } catch (error) {
        console.error(`Error sending bulk WhatsApp message to ${recipient}:`, error);
        results.push({ 
          recipient, 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }
}

// Singleton instance
const whatsAppService = new WhatsAppService();

export default whatsAppService;