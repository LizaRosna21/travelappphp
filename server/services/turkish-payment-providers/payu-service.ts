import axios from 'axios';
import * as crypto from 'crypto';

/**
 * PayU ödeme sistemi entegrasyonu
 * Dokümantasyon: https://payuturkiye.github.io/PayU-Turkiye-Entegrasyon-Dokumani/
 */
export class PayuService {
  private apiUrl: string;
  private merchantId: string;
  private secretKey: string;
  private demoMode: boolean = true;

  constructor() {
    // API anahtarlarını kontrol et
    if (process.env.PAYU_MERCHANT_ID && process.env.PAYU_SECRET_KEY) {
      this.merchantId = process.env.PAYU_MERCHANT_ID;
      this.secretKey = process.env.PAYU_SECRET_KEY;
      this.demoMode = false;
      this.apiUrl = 'https://secure.payu.com.tr/order/';
    } else {
      this.merchantId = 'DEMO_MERCHANT';
      this.secretKey = 'DEMO_SECRET';
      this.demoMode = true;
      this.apiUrl = 'https://sandbox.payu.com.tr/order/';
      console.log('[DEMO] PayU servisi demo modunda başlatıldı');
    }
  }

  /**
   * Ödeme başlatma işlemi
   */
  async createPayment(paymentData: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayU ödeme başlatma isteği:', paymentData);
      return {
        success: true,
        demoMode: true,
        paymentId: `demo_payu_${Date.now()}`,
        redirectUrl: '/demo-payment-response?status=success&provider=payu'
      };
    }

    try {
      // PayU için gerekli parametreleri hazırla
      const merchantReference = paymentData.orderRef || `order_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      const requestData: Record<string, any> = {
        MERCHANT: this.merchantId,
        ORDER_REF: merchantReference,
        ORDER_DATE: timestamp,
        PRICES_CURRENCY: paymentData.currency || 'TRY',
        ORDER_SHIPPING: paymentData.shippingAmount || 0,
        ORDER_PNAME: [paymentData.productName || 'Ferry Booking'],
        ORDER_PCODE: [paymentData.productCode || 'FERRY-TICKET'],
        ORDER_PINFO: [paymentData.productInfo || 'Ferry Ticket Booking'],
        ORDER_PRICE: [paymentData.amount],
        ORDER_QTY: [1],
        BILL_FNAME: paymentData.firstName,
        BILL_LNAME: paymentData.lastName,
        BILL_EMAIL: paymentData.email,
        BILL_PHONE: paymentData.phone,
        BILL_ADDRESS: paymentData.address || '',
        BILL_CITY: paymentData.city || '',
        BILL_COUNTRYCODE: paymentData.countryCode || 'TR',
        BILL_ZIPCODE: paymentData.zipCode || '',
        ORDER_HASH: '', // Bu değer aşağıda hesaplanacak
        BACK_REF: paymentData.callbackUrl || 'https://example.com/payment-callback',
      };
      
      // Hash değerini hesapla (HMAC-MD5)
      const dataToHash = Object.entries(requestData)
        .filter(([key]) => key !== 'ORDER_HASH' && key !== 'BACK_REF')
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([_, value]) => Array.isArray(value) ? value.join('') : value)
        .join('');
      
      const hash = crypto.createHmac('md5', this.secretKey)
        .update(dataToHash)
        .digest('hex');
      
      requestData.ORDER_HASH = hash;
      
      // PayU'ya POST isteği gönder
      const response = await axios.post(this.apiUrl, requestData);
      
      return {
        success: true,
        paymentId: merchantReference,
        redirectUrl: response.data.url || this.apiUrl,
        rawResponse: response.data
      };
    } catch (error) {
      console.error('PayU ödeme hatası:', error);
      throw new Error('PayU ödeme işlemi başlatılamadı');
    }
  }

  /**
   * Ödeme durumu sorgulama
   */
  async checkPaymentStatus(paymentId: string): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayU ödeme durumu sorgusu:', paymentId);
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
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // Durum sorgusu için gerekli parametreleri hazırla
      const requestData: Record<string, any> = {
        MERCHANT: this.merchantId,
        ORDER_REF: paymentId,
        REQUEST_TIMESTAMP: timestamp,
      };
      
      // Hash değerini hesapla
      const dataToHash = Object.entries(requestData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([_, value]) => value)
        .join('');
      
      const hash = crypto.createHmac('md5', this.secretKey)
        .update(dataToHash)
        .digest('hex');
      
      // Yeni obje oluştur 
      const requestWithHash = {
        ...requestData,
        REQUEST_HASH: hash
      };
      
      // PayU'ya POST isteği gönder
      const response = await axios.post(`${this.apiUrl}/idn/status`, requestWithHash);
      
      // Yanıtı işle ve döndür
      if (response.data && response.data.status) {
        return {
          success: true,
          paymentId,
          status: response.data.status,
          amount: response.data.amount,
          currency: response.data.currency,
          date: response.data.date,
          rawResponse: response.data
        };
      } else {
        throw new Error('PayU ödeme durumu alınamadı');
      }
    } catch (error) {
      console.error('PayU ödeme durumu sorgu hatası:', error);
      throw new Error('PayU ödeme durumu sorgulanamadı');
    }
  }

  /**
   * İade işlemi
   */
  async createRefund(refundData: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayU iade işlemi:', refundData);
      return {
        success: true,
        demoMode: true,
        refundId: `demo_refund_payu_${Date.now()}`,
        status: 'COMPLETED',
        amount: refundData.amount || '100.00',
        currency: 'TRY',
        date: new Date().toISOString()
      };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // İade işlemi için gerekli parametreleri hazırla
      const requestData: Record<string, any> = {
        MERCHANT: this.merchantId,
        ORDER_REF: refundData.paymentId,
        ORDER_AMOUNT: refundData.amount,
        REQUEST_TIMESTAMP: timestamp,
        REFUND_REASON: refundData.reason || 'Customer request',
      };
      
      // Hash değerini hesapla
      const dataToHash = Object.entries(requestData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([_, value]) => value)
        .join('');
      
      const hash = crypto.createHmac('md5', this.secretKey)
        .update(dataToHash)
        .digest('hex');
      
      // Yeni obje oluştur
      const requestWithHash = {
        ...requestData,
        REQUEST_HASH: hash
      };
      
      // PayU'ya POST isteği gönder
      const response = await axios.post(`${this.apiUrl}/idn/refund`, requestWithHash);
      
      // Yanıtı işle ve döndür
      if (response.data && response.data.status) {
        return {
          success: true,
          refundId: response.data.refundId || `refund_${Date.now()}`,
          status: response.data.status,
          amount: refundData.amount,
          currency: refundData.currency || 'TRY',
          date: new Date().toISOString(),
          rawResponse: response.data
        };
      } else {
        throw new Error('PayU iade işlemi başarısız');
      }
    } catch (error) {
      console.error('PayU iade işlemi hatası:', error);
      throw new Error('PayU iade işlemi gerçekleştirilemedi');
    }
  }

  /**
   * Webhook doğrulama
   */
  verifyWebhook(requestData: any, headers: any): boolean {
    if (this.demoMode) {
      console.log('[DEMO] PayU webhook doğrulama');
      return true;
    }

    try {
      // PayU'dan gelen imzayı al
      const receivedHash = headers['x-payu-signature'] || requestData.SIGNATURE;
      
      if (!receivedHash) {
        console.error('PayU webhook imzası bulunamadı');
        return false;
      }
      
      // Hash için gerekli alanları ayıkla
      const relevantData = { ...requestData };
      delete relevantData.SIGNATURE;
      
      // Hash için string oluştur
      const dataToHash = Object.entries(relevantData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([_, value]) => value)
        .join('');
      
      // Kendi hash değerimizi hesapla
      const calculatedHash = crypto.createHmac('md5', this.secretKey)
        .update(dataToHash)
        .digest('hex');
      
      // Hesaplanan hash ile gelen hash'i karşılaştır
      return calculatedHash === receivedHash;
    } catch (error) {
      console.error('PayU webhook doğrulama hatası:', error);
      return false;
    }
  }

  /**
   * Webhook işleme
   */
  async handleWebhook(requestData: any, headers: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayU webhook işleme');
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
        throw new Error('PayU webhook imzası geçersiz');
      }
      
      // Yanıtı işle ve döndür
      return {
        success: true,
        paymentId: requestData.REFNO || requestData.ORDER_REF,
        status: requestData.ORDERSTATUS,
        amount: requestData.AMOUNT,
        currency: requestData.CURRENCY || 'TRY',
        rawData: requestData
      };
    } catch (error) {
      console.error('PayU webhook işleme hatası:', error);
      throw new Error('PayU webhook işlenemedi');
    }
  }
}