import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { NextFunction, Request, Response } from 'express';

// WhatsApp Business API servisi
export class WhatsAppBusinessAPIClient {
  private _isConnected: boolean = false;
  private wss: WebSocketServer | null = null;
  private demoMode: boolean = true;

  constructor() {
    // API anahtarının varlığını kontrol et
    this.demoMode = !process.env.WHATSAPP_API_KEY;
    console.log(`[${this.demoMode ? 'DEMO' : 'PROD'}] WhatsApp Business API ${this.demoMode ? 'demo modunda' : ''} başlatıldı`);
    this._isConnected = true; // Demo modunda bağlantı her zaman aktif
  }

  // WebSocket server'ı başlat
  initialize(server: Server, path: string = '/ws') {
    this.wss = new WebSocketServer({ server, path });
    console.log('WhatsApp servisi başlatıldı');
    return this;
  }

  // Bağlantı durumunu kontrol et
  isReady(): boolean {
    return this._isConnected;
  }
  
  // isConnected metodu - compatibility için eklendi
  isConnected(): boolean {
    return this._isConnected;
  }

  // Mesaj gönder
  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.demoMode) {
      console.log(`[DEMO] WhatsApp mesajı gönderiliyor: "${message}" alıcı: ${to}`);
      
      // Demo cevabını tüm WebSocket clientlarına gönder
      setTimeout(() => {
        this.broadcastMessage({
          type: 'whatsapp_message',
          message: 'Bu bir demo yanıtıdır. WhatsApp Business API aktif olduğunda gerçek yanıtlar alacaksınız.',
          timestamp: new Date().toISOString()
        });
      }, 2000);
      
      return { 
        success: true, 
        messageId: `demo-${Date.now()}` 
      };
    }
    
    try {
      // Gerçek WhatsApp API ile entegrasyon burada yapılacak
      throw new Error('WhatsApp Business API henüz yapılandırılmadı');
    } catch (error) {
      console.error('WhatsApp mesaj gönderme hatası:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // WebSocket üzerinden mesaj yayınla
  broadcastMessage(message: any): void {
    if (!this.wss) {
      console.warn('WebSocket server başlatılmadı');
      return;
    }

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Webhook doğrulama
  verifyWebhook(req: Request, res: Response, next: NextFunction): void {
    // WhatsApp Business API webhook doğrulama
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(req.query['hub.challenge']);
    } else {
      next();
    }
  }
  
  // Webhook mesajlarını işle
  handleWebhook(req: Request, res: Response): void {
    const body = req.body;
    
    if (this.demoMode) {
      console.log('[DEMO] WhatsApp webhook alındı:', JSON.stringify(body).substring(0, 100) + '...');
      res.status(200).send('OK');
      return;
    }
    
    // Gerçek webhook işleme buraya gelecek
    if (body.object === 'whatsapp_business_account') {
      res.status(200).send('OK');
    } else {
      res.sendStatus(404);
    }
  }
}

// Demo WhatsApp bildirim servisi
export class WhatsAppNotificationService {
  private whatsappClient: WhatsAppBusinessAPIClient;

  constructor(whatsappClient: WhatsAppBusinessAPIClient) {
    this.whatsappClient = whatsappClient;
  }

  // Rezervasyon onay bildirimi - ID ile
  async sendBookingConfirmation(bookingId: number): Promise<boolean> {
    try {
      // Burada gerçek implementasyonda booking detayları veritabanından çekilecek
      console.log(`Rezervasyon onay bildirimi gönderiliyor, booking ID: ${bookingId}`);
      
      // Demo implementasyon
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Rezervasyon onay bildirimi gönderildi, booking ID: ${bookingId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Rezervasyon onay bildirimi gönderme hatası, booking ID: ${bookingId}`, error);
      return false;
    }
  }

  // Rezervasyon onay bildirimi - Detaylar ile
  async sendBookingConfirmationWithDetails(phoneNumber: string, bookingReference: string, departureDate: string, departurePort: string, arrivalPort: string): Promise<boolean> {
    const message = `Rezervasyon onayı: ${bookingReference} referans numaralı ${departureDate} tarihli ${departurePort} - ${arrivalPort} feribot biletiniz onaylanmıştır. İyi yolculuklar dileriz!`;
    const result = await this.whatsappClient.sendMessage(phoneNumber, message);
    return result.success;
  }

  // Ödeme onay bildirimi - ID ile
  async sendPaymentConfirmation(bookingId: number): Promise<boolean> {
    try {
      // Burada gerçek implementasyonda booking ve ödeme detayları veritabanından çekilecek
      console.log(`Ödeme onay bildirimi gönderiliyor, booking ID: ${bookingId}`);
      
      // Demo implementasyon
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Ödeme onay bildirimi gönderildi, booking ID: ${bookingId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Ödeme onay bildirimi gönderme hatası, booking ID: ${bookingId}`, error);
      return false;
    }
  }

  // Ödeme onay bildirimi - Detaylar ile
  async sendPaymentConfirmationWithDetails(phoneNumber: string, bookingReference: string, amount: string, currency: string): Promise<boolean> {
    const message = `Ödeme onayı: ${bookingReference} referans numaralı rezervasyonunuz için ${amount} ${currency} tutarındaki ödemeniz alınmıştır. Teşekkür ederiz!`;
    const result = await this.whatsappClient.sendMessage(phoneNumber, message);
    return result.success;
  }

  // İptal bildirimi - Detaylar ile
  async sendCancellationNotice(phoneNumber: string, bookingReference: string, refundAmount: string | null): Promise<boolean> {
    let message = `İptal bildirimi: ${bookingReference} referans numaralı rezervasyonunuz iptal edilmiştir.`;
    if (refundAmount) {
      message += ` ${refundAmount} tutarındaki iade işleminiz 3-5 iş günü içinde tamamlanacaktır.`;
    }
    const result = await this.whatsappClient.sendMessage(phoneNumber, message);
    return result.success;
  }
  
  // İptal bildirimi - ID ile
  async sendCancellationNotification(bookingId: number, reason: string): Promise<boolean> {
    try {
      // Burada gerçek implementasyonda booking detayları veritabanından çekilecek
      console.log(`İptal bildirimi gönderiliyor, booking ID: ${bookingId}, sebep: ${reason}`);
      
      // Demo implementasyon
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] İptal bildirimi gönderildi, booking ID: ${bookingId}, sebep: ${reason}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`İptal bildirimi gönderme hatası, booking ID: ${bookingId}`, error);
      return false;
    }
  }

  // Check-in hatırlatıcısı
  async sendCheckInReminder(phoneNumber: string, bookingReference: string, departureDate: string, checkInTime: string): Promise<boolean> {
    const message = `Check-in hatırlatması: ${bookingReference} referans numaralı ${departureDate} tarihli seyahatiniz için lütfen ${checkInTime} saatinde limanda olunuz. Güvenli yolculuklar dileriz!`;
    const result = await this.whatsappClient.sendMessage(phoneNumber, message);
    return result.success;
  }
  
  // Hareket saati hatırlatıcısı - ID ile
  async sendDepartureReminder(bookingId: number): Promise<boolean> {
    try {
      // Burada gerçek implementasyonda booking detayları veritabanından çekilecek
      console.log(`Hareket saati hatırlatıcısı gönderiliyor, booking ID: ${bookingId}`);
      
      // Demo implementasyon
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Hareket saati hatırlatıcısı gönderildi, booking ID: ${bookingId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Hareket saati hatırlatıcısı gönderme hatası, booking ID: ${bookingId}`, error);
      return false;
    }
  }
  
  // Gecikme bildirimi
  async sendDelayNotification(bookingId: number, newDepartureTime: string, delayReason: string): Promise<boolean> {
    try {
      // Burada gerçek implementasyonda booking detayları veritabanından çekilecek
      console.log(`Gecikme bildirimi gönderiliyor, booking ID: ${bookingId}, yeni kalkış: ${newDepartureTime}, sebep: ${delayReason}`);
      
      // Demo implementasyon
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Gecikme bildirimi gönderildi, booking ID: ${bookingId}, yeni kalkış: ${newDepartureTime}, sebep: ${delayReason}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Gecikme bildirimi gönderme hatası, booking ID: ${bookingId}`, error);
      return false;
    }
  }
}

// WhatsApp servisini oluştur ve dışa aktar
export const whatsappClient = new WhatsAppBusinessAPIClient();
export const whatsappNotificationService = new WhatsAppNotificationService(whatsappClient);