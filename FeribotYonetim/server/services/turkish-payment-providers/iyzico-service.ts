import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Iyzico ödeme sistemi entegrasyonu
 * Dokümantasyon: https://dev.iyzico.com/
 */
export class IyzicoService {
  private apiUrl: string;
  private apiKey: string;
  private secretKey: string;
  private demoMode: boolean = true;

  constructor() {
    // API anahtarlarını kontrol et
    if (process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY) {
      this.apiKey = process.env.IYZICO_API_KEY;
      this.secretKey = process.env.IYZICO_SECRET_KEY;
      this.demoMode = false;
      this.apiUrl = 'https://api.iyzipay.com';
    } else {
      this.apiKey = 'DEMO_API_KEY';
      this.secretKey = 'DEMO_SECRET_KEY';
      this.demoMode = true;
      this.apiUrl = 'https://sandbox-api.iyzipay.com';
      console.log('[DEMO] Iyzico servisi demo modunda başlatıldı');
    }
  }

  /**
   * Iyzico için HMAC-SHA1 Base64 formatında imza oluşturur
   */
  private generateAuthorizationHeader(uri: string, body: string, randomString: string, timestamp: number): string {
    const stringToHash = this.apiKey + randomString + timestamp + uri + body;
    const hash = crypto.createHmac('sha1', this.secretKey)
      .update(stringToHash)
      .digest('base64');
      
    return 'IYZWS ' + this.apiKey + ':' + hash;
  }

  /**
   * Iyzico API için gerekli HTTP başlıklarını oluşturur
   */
  private generateHttpHeaders(uri: string, body: any = {}): Record<string, string> {
    const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = JSON.stringify(body) || '';
    
    const authorization = this.generateAuthorizationHeader(uri, bodyString, randomString, timestamp);
    
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'x-iyzi-rnd': randomString,
      'x-iyzi-timestamp': timestamp.toString()
    };
  }

  /**
   * Ödeme başlatma işlemi
   */
  async createPayment(paymentData: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] Iyzico ödeme başlatma isteği:', paymentData);
      return {
        success: true,
        demoMode: true,
        paymentId: `demo_iyzico_${Date.now()}`,
        checkoutForm: `<form id="demo-payment-form" action="/demo-payment-response" method="post">
          <input type="hidden" name="status" value="success">
          <input type="hidden" name="provider" value="iyzico">
          <input type="hidden" name="paymentId" value="demo_iyzico_${Date.now()}">
          <button type="submit">Ödemeyi Tamamla</button>
        </form>`
      };
    }

    try {
      const uri = '/payment/checkout/initialize';
      
      // Iyzico için gerekli parametreleri hazırla
      const requestData = {
        locale: 'tr',
        conversationId: paymentData.orderRef || `order_${Date.now()}`,
        price: paymentData.amount,
        paidPrice: paymentData.amount,
        currency: paymentData.currency || 'TRY',
        installment: 1,
        basketId: paymentData.orderRef || `basket_${Date.now()}`,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        callbackUrl: paymentData.callbackUrl || 'https://example.com/payment-callback',
        
        buyer: {
          id: paymentData.userId || `user_${Date.now()}`,
          name: paymentData.firstName,
          surname: paymentData.lastName,
          gsmNumber: paymentData.phone,
          email: paymentData.email,
          identityNumber: paymentData.identityNumber || '11111111111',
          registrationAddress: paymentData.address || 'Address',
          ip: paymentData.ip || '85.34.78.112',
          city: paymentData.city || 'Istanbul',
          country: paymentData.country || 'Turkey',
          zipCode: paymentData.zipCode || '34732'
        },
        
        shippingAddress: {
          contactName: `${paymentData.firstName} ${paymentData.lastName}`,
          city: paymentData.city || 'Istanbul',
          country: paymentData.country || 'Turkey',
          address: paymentData.address || 'Address',
          zipCode: paymentData.zipCode || '34732'
        },
        
        billingAddress: {
          contactName: `${paymentData.firstName} ${paymentData.lastName}`,
          city: paymentData.city || 'Istanbul',
          country: paymentData.country || 'Turkey',
          address: paymentData.address || 'Address',
          zipCode: paymentData.zipCode || '34732'
        },
        
        basketItems: [
          {
            id: paymentData.productCode || 'FERRY-TICKET',
            name: paymentData.productName || 'Ferry Ticket Booking',
            category1: 'Ferry',
            category2: 'Ticket',
            itemType: 'VIRTUAL',
            price: paymentData.amount
          }
        ]
      };
      
      // HTTP başlıklarını oluştur
      const headers = this.generateHttpHeaders(uri, requestData);
      
      // Iyzico'ya POST isteği gönder
      const response = await axios.post(`${this.apiUrl}${uri}`, requestData, { headers });
      
      if (response.data.status === 'success') {
        return {
          success: true,
          paymentId: response.data.token,
          checkoutForm: response.data.checkoutFormContent,
          rawResponse: response.data
        };
      } else {
        throw new Error(`Iyzico ödeme başlatılamadı: ${response.data.errorMessage}`);
      }
    } catch (error: any) {
      console.error('Iyzico ödeme hatası:', error.response?.data || error.message);
      throw new Error('Iyzico ödeme işlemi başlatılamadı');
    }
  }

  /**
   * Ödeme durumu sorgulama
   */
  async checkPaymentStatus(paymentId: string): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] Iyzico ödeme durumu sorgusu:', paymentId);
      return {
        success: true,
        demoMode: true,
        paymentId,
        status: 'COMPLETED',
        amount: '100.00',
        currency: 'TRY',
        date: new Date().toISOString()
      };
    }

    try {
      const uri = '/payment/detail';
      
      // Durum sorgusu için gerekli parametreleri hazırla
      const requestData = {
        locale: 'tr',
        conversationId: `query_${Date.now()}`,
        paymentId: paymentId
      };
      
      // HTTP başlıklarını oluştur
      const headers = this.generateHttpHeaders(uri, requestData);
      
      // Iyzico'ya POST isteği gönder
      const response = await axios.post(`${this.apiUrl}${uri}`, requestData, { headers });
      
      if (response.data.status === 'success') {
        return {
          success: true,
          paymentId: paymentId,
          status: response.data.status,
          amount: response.data.price,
          currency: response.data.currency,
          date: new Date().toISOString(),
          rawResponse: response.data
        };
      } else {
        throw new Error(`Iyzico ödeme durumu alınamadı: ${response.data.errorMessage}`);
      }
    } catch (error: any) {
      console.error('Iyzico ödeme durumu sorgu hatası:', error.response?.data || error.message);
      throw new Error('Iyzico ödeme durumu sorgulanamadı');
    }
  }

  /**
   * İade işlemi
   */
  async createRefund(refundData: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] Iyzico iade işlemi:', refundData);
      return {
        success: true,
        demoMode: true,
        refundId: `demo_refund_iyzico_${Date.now()}`,
        status: 'COMPLETED',
        amount: refundData.amount || '100.00',
        currency: 'TRY',
        date: new Date().toISOString()
      };
    }

    try {
      const uri = '/payment/refund';
      
      // İade işlemi için gerekli parametreleri hazırla
      const requestData = {
        locale: 'tr',
        conversationId: `refund_${Date.now()}`,
        paymentTransactionId: refundData.paymentId,
        price: refundData.amount,
        currency: refundData.currency || 'TRY',
        ip: refundData.ip || '85.34.78.112'
      };
      
      // HTTP başlıklarını oluştur
      const headers = this.generateHttpHeaders(uri, requestData);
      
      // Iyzico'ya POST isteği gönder
      const response = await axios.post(`${this.apiUrl}${uri}`, requestData, { headers });
      
      if (response.data.status === 'success') {
        return {
          success: true,
          refundId: response.data.paymentId || `refund_${Date.now()}`,
          status: response.data.status,
          amount: refundData.amount,
          currency: refundData.currency || 'TRY',
          date: new Date().toISOString(),
          rawResponse: response.data
        };
      } else {
        throw new Error(`Iyzico iade işlemi başarısız: ${response.data.errorMessage}`);
      }
    } catch (error: any) {
      console.error('Iyzico iade işlemi hatası:', error.response?.data || error.message);
      throw new Error('Iyzico iade işlemi gerçekleştirilemedi');
    }
  }

  /**
   * Webhook doğrulama
   */
  verifyWebhook(requestData: any, headers: any): boolean {
    if (this.demoMode) {
      console.log('[DEMO] Iyzico webhook doğrulama');
      return true;
    }

    try {
      // Iyzico'dan gelen imzayı al
      const receivedSignature = headers['x-iyzi-signature'];
      
      if (!receivedSignature) {
        console.error('Iyzico webhook imzası bulunamadı');
        return false;
      }
      
      // Tam URI yolu
      const uri = '/payment/webhook';
      
      // İmza oluştur ve kontrol et
      const randomString = headers['x-iyzi-rnd'] || '';
      const timestamp = parseInt(headers['x-iyzi-timestamp'] || '0');
      const body = typeof requestData === 'string' ? requestData : JSON.stringify(requestData);
      
      const stringToHash = this.apiKey + randomString + timestamp + uri + body;
      const calculatedSignature = crypto.createHmac('sha1', this.secretKey)
        .update(stringToHash)
        .digest('base64');
      
      return calculatedSignature === receivedSignature;
    } catch (error) {
      console.error('Iyzico webhook doğrulama hatası:', error);
      return false;
    }
  }

  /**
   * Webhook işleme
   */
  async handleWebhook(requestData: any, headers: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] Iyzico webhook işleme');
      return {
        success: true,
        demoMode: true,
        receivedData: requestData
      };
    }

    try {
      // Webhook imzasını doğrula
      const isValid = this.verifyWebhook(requestData, headers);
      
      if (!isValid) {
        throw new Error('Iyzico webhook imzası geçersiz');
      }
      
      // İşlem türünü belirle
      const eventType = requestData.type || 'UNKNOWN';
      
      // Yanıtı işle ve döndür
      return {
        success: true,
        paymentId: requestData.paymentId,
        eventType: eventType,
        status: requestData.status,
        amount: requestData.price,
        currency: requestData.currency || 'TRY',
        rawData: requestData
      };
    } catch (error) {
      console.error('Iyzico webhook işleme hatası:', error);
      throw new Error('Iyzico webhook işlenemedi');
    }
  }
}