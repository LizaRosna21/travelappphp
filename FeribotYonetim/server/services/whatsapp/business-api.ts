import axios from 'axios';
import { formatPhoneForWhatsApp } from '../utils';

/**
 * WhatsApp Business API Client
 * Meta WhatsApp Business API entegrasyonu
 */
class WhatsAppBusinessAPIClient {
  private apiToken: string | null = null;
  private phoneNumberId: string | null = null;
  private businessId: string | null = null;
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private isInitialized = false;

  constructor() {
    this.initialize();
  }
  
  /**
   * API'nin bağlantı durumunu kontrol et
   */
  public isConnected(): boolean {
    // Demo modunda her zaman hazır kabul et
    if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
      return true;
    }
    
    return this.isInitialized;
  }
  
  /**
   * API'nin hazır olup olmadığını kontrol et
   */
  public isReady(): boolean {
    return this.isConnected();
  }

  /**
   * API'yi başlat ve ayarları yükle
   */
  private initialize(): void {
    try {
      // .env dosyasından gerekli değişkenleri al
      this.apiToken = process.env.WHATSAPP_API_TOKEN || null;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
      this.businessId = process.env.WHATSAPP_BUSINESS_ID || null;
      
      // Gerekli değişkenler varsa API'yi initialized olarak işaretle
      if (
        this.apiToken && 
        this.phoneNumberId && 
        this.businessId
      ) {
        this.isInitialized = true;
        console.log('WhatsApp Business API initialized successfully');
      } else {
        // Demo modu kontrolü
        const isDemoMode = process.env.DEMO_MODE === 'true';
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (!isProduction || isDemoMode) {
          console.log('[DEMO] WhatsApp Business API initialized in demo mode');
          this.isInitialized = true;
        } else {
          console.warn('WhatsApp Business API not fully initialized, missing environment variables');
          this.isInitialized = false;
        }
      }
    } catch (error) {
      console.error('Error initializing WhatsApp Business API:', error);
      this.isInitialized = false;
    }
  }
  
  /**
   * Webhook doğrulama
   */
  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    try {
      if (mode === 'subscribe' && (token === process.env.WHATSAPP_VERIFY_TOKEN || token === 'test_verify_token')) {
        return challenge;
      }
      return null;
    } catch (error) {
      console.error('Webhook doğrulama hatası:', error);
      return null;
    }
  }
  
  /**
   * Webhook mesajı işleme
   */
  public async handleWebhook(body: any): Promise<boolean> {
    try {
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log('[DEMO] WhatsApp webhook mesajı işleniyor:', JSON.stringify(body).substring(0, 100) + '...');
        return true;
      }
      
      if (body.object === 'whatsapp_business_account') {
        // Gerçek webhook mesajını işle
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Webhook işleme hatası:', error);
      return false;
    }
  }
  
  /**
   * HTTP isteği gönder
   */
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST', 
    data?: any
  ): Promise<T> {
    try {
      // Demo modunda istek gönderme, simüle et
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] WhatsApp Business API ${method} request to ${endpoint}`);
        console.log(`[DEMO] Request data:`, data);
        
        // Örnek bir yanıt oluştur
        return {
          success: true,
          id: `demo_${Date.now()}`,
          message_id: `demo_${Date.now()}`
        } as unknown as T;
      }
      
      // Gerçek istek için API'nin hazır olduğunu kontrol et
      if (!this.isInitialized) {
        throw new Error('WhatsApp Business API is not initialized');
      }
      
      // İstek URL'sini oluştur
      const url = `${this.baseUrl}${endpoint}`;
      
      // İstek başlıklarını ayarla
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`
      };
      
      // HTTP isteği gönder
      const response = await axios({
        method,
        url,
        headers,
        data: data ? JSON.stringify(data) : undefined
      });
      
      return response.data as T;
    } catch (error) {
      console.error(`Error in WhatsApp Business API ${method} request to ${endpoint}:`, error);
      
      if (axios.isAxiosError(error)) {
        console.error('API response error:', error.response?.data);
        throw new Error(`WhatsApp API error: ${error.response?.data?.error?.message || error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Metin mesajı gönder
   */
  public async sendMessage(to: string, message: string): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp Business API message to ${to}: ${message.substring(0, 50)}...`);
        return { id: `demo_${Date.now()}` };
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Mesaj gövdesini oluştur
      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      };
      
      // İstek gönder
      const endpoint = `/${this.phoneNumberId}/messages`;
      const response = await this.makeRequest(endpoint, 'POST', messageData);
      
      return {
        id: response.messages?.[0]?.id || `unknown_${Date.now()}`
      };
    } catch (error) {
      console.error(`Error sending WhatsApp Business API message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Medya mesajı gönder
   */
  public async sendMedia(
    to: string, 
    mediaUrl: string, 
    caption?: string, 
    mediaType: 'image' | 'document' | 'audio' | 'video' = 'document'
  ): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp Business API ${mediaType} to ${to}: ${mediaUrl}`);
        return { id: `demo_${Date.now()}` };
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Medya gövdesini oluştur
      const mediaData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption || ''
        }
      };
      
      // İstek gönder
      const endpoint = `/${this.phoneNumberId}/messages`;
      const response = await this.makeRequest(endpoint, 'POST', mediaData);
      
      return {
        id: response.messages?.[0]?.id || `unknown_${Date.now()}`
      };
    } catch (error) {
      console.error(`Error sending WhatsApp Business API media to ${to}:`, error);
      
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
   * Şablon mesajı gönder
   */
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string = 'tr',
    components: any[] = []
  ): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp Business API template "${templateName}" to ${to}`);
        console.log(`[DEMO] Template components:`, components);
        return { id: `demo_${Date.now()}` };
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Şablon mesaj gövdesini oluştur
      const templateData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components: components
        }
      };
      
      // İstek gönder
      const endpoint = `/${this.phoneNumberId}/messages`;
      const response = await this.makeRequest(endpoint, 'POST', templateData);
      
      return {
        id: response.messages?.[0]?.id || `unknown_${Date.now()}`
      };
    } catch (error) {
      console.error(`Error sending WhatsApp Business API template to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Hızlı yanıt butonları ile mesaj gönder
   */
  public async sendButtonMessage(
    to: string, 
    bodyText: string, 
    buttons: Array<{ id: string; title: string }>
  ): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp Business API button message to ${to}`);
        console.log(`[DEMO] Message body: ${bodyText}`);
        console.log(`[DEMO] Buttons:`, buttons);
        return { id: `demo_${Date.now()}` };
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Butonları formatla
      const formattedButtons = buttons.map((button, index) => ({
        type: 'reply',
        reply: {
          id: button.id || `button_${index}`,
          title: button.title
        }
      }));
      
      // Mesaj gövdesini oluştur
      const buttonData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: formattedButtons
          }
        }
      };
      
      // İstek gönder
      const endpoint = `/${this.phoneNumberId}/messages`;
      const response = await this.makeRequest(endpoint, 'POST', buttonData);
      
      return {
        id: response.messages?.[0]?.id || `unknown_${Date.now()}`
      };
    } catch (error) {
      console.error(`Error sending WhatsApp Business API button message to ${to}:`, error);
      
      // Buton gönderimi başarısız olursa, normal mesaj olarak gönder
      try {
        const buttonTexts = buttons.map((btn, idx) => `${idx + 1}. ${btn.title}`).join('\n');
        const message = `${bodyText}\n\n${buttonTexts}\n\nLütfen yukarıdaki seçeneklerden birinin numarasını yazarak yanıtlayınız.`;
        return await this.sendMessage(to, message);
      } catch (fallbackError) {
        console.error(`Fallback error sending WhatsApp message to ${to}:`, fallbackError);
        throw error;
      }
    }
  }

  /**
   * Liste mesajı gönder
   */
  public async sendListMessage(
    to: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    buttonText: string,
    sections: Array<{
      title: string,
      rows: Array<{ id: string; title: string; description?: string }>
    }>
  ): Promise<any> {
    try {
      // Demo modunda log oluştur
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Sending WhatsApp Business API list message to ${to}`);
        console.log(`[DEMO] List header: ${headerText}`);
        console.log(`[DEMO] List sections:`, sections);
        return { id: `demo_${Date.now()}` };
      }
      
      // Telefon numarasını formatla
      const formattedNumber = formatPhoneForWhatsApp(to);
      
      // Mesaj gövdesini oluştur
      const listData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: footerText
          },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      };
      
      // İstek gönder
      const endpoint = `/${this.phoneNumberId}/messages`;
      const response = await this.makeRequest(endpoint, 'POST', listData);
      
      return {
        id: response.messages?.[0]?.id || `unknown_${Date.now()}`
      };
    } catch (error) {
      console.error(`Error sending WhatsApp Business API list message to ${to}:`, error);
      
      // Liste gönderimi başarısız olursa, normal mesaj olarak gönder
      try {
        let message = `${headerText}\n\n${bodyText}\n\n`;
        
        sections.forEach(section => {
          message += `*${section.title}*\n`;
          section.rows.forEach((row, idx) => {
            message += `${idx + 1}. ${row.title}${row.description ? `: ${row.description}` : ''}\n`;
          });
          message += '\n';
        });
        
        message += `\n${footerText}\n\nLütfen yukarıdaki seçeneklerden birinin numarasını yazarak yanıtlayınız.`;
        return await this.sendMessage(to, message);
      } catch (fallbackError) {
        console.error(`Fallback error sending WhatsApp message to ${to}:`, fallbackError);
        throw error;
      }
    }
  }

  /**
   * İşletme bilgilerini al
   */
  public async getBusinessProfile(): Promise<any> {
    try {
      // Demo modunda
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Getting WhatsApp Business API profile`);
        return {
          business_profile: {
            name: 'Ferry Tickets Demo',
            about: 'Ferry Tickets Reservation System',
            address: 'Istanbul, Turkey',
            description: 'Online Ferry Ticketing System',
            vertical: 'TRAVEL_TRANSPORTATION',
            email: 'info@ferrytickets.com',
            websites: ['https://www.ferrytickets.com']
          }
        };
      }
      
      // İşletme bilgilerini al
      const endpoint = `/${this.phoneNumberId}/whatsapp_business_profile`;
      const response = await this.makeRequest(endpoint, 'GET');
      
      return response;
    } catch (error) {
      console.error(`Error getting WhatsApp Business API profile:`, error);
      throw error;
    }
  }

  /**
   * Kullanılabilir şablonları listele
   */
  public async getTemplates(): Promise<any> {
    try {
      // Demo modunda
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] Getting WhatsApp Business API templates`);
        return {
          data: [
            {
              name: 'booking_confirmation',
              components: [
                { type: 'HEADER', format: 'TEXT' },
                { type: 'BODY', text: 'Sayın {{1}}, {{2}} numaralı rezervasyonunuz başarıyla oluşturulmuştur.' },
                { type: 'FOOTER', text: 'Ferry Tickets' }
              ],
              language: 'tr'
            },
            {
              name: 'payment_reminder',
              components: [
                { type: 'HEADER', format: 'TEXT' },
                { type: 'BODY', text: 'Sayın {{1}}, {{2}} numaralı rezervasyonunuzun ödeme süresi dolmak üzeredir.' },
                { type: 'FOOTER', text: 'Ferry Tickets' }
              ],
              language: 'tr'
            }
          ]
        };
      }
      
      // Şablonları listele
      const endpoint = `/${this.businessId}/message_templates`;
      const response = await this.makeRequest(endpoint, 'GET');
      
      return response;
    } catch (error) {
      console.error(`Error getting WhatsApp Business API templates:`, error);
      throw error;
    }
  }
  
  /**
   * Toplu kampanya mesajı gönder
   */
  public async sendBulkCampaign(
    userIds: number[],
    campaignTitle: string,
    campaignDetails: string,
    mediaUrl?: string,
    couponCode?: string
  ): Promise<any> {
    try {
      // Demo modunda istek gönderme, simüle et
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        console.log(`[DEMO] WhatsApp kampanya gönderiliyor: "${campaignTitle}" ${userIds.length} kullanıcıya`);
        
        return {
          success: true,
          sentCount: userIds.length,
          campaignId: `demo_${Date.now()}`
        };
      }
      
      // Gerçek implementasyon burada yapılacak
      throw new Error("Toplu kampanya gönderimi şu anda desteklenmiyor");
    } catch (error) {
      console.error('WhatsApp kampanya gönderme hatası:', error);
      throw error;
    }
  }
}

// Singleton instance
const whatsAppBusinessService = new WhatsAppBusinessAPIClient();

// Export both as default and named export for flexibility
export default whatsAppBusinessService;
export { whatsAppBusinessService };