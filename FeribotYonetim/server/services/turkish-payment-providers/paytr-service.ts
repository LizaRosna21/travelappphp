import axios from 'axios';
import * as crypto from 'crypto';

/**
 * PayTR ödeme sistemi entegrasyonu
 * Dokümantasyon: https://www.paytr.com/entegrasyon
 */
export class PayTRService {
  private apiUrl: string;
  private merchantId: string;
  private merchantKey: string;
  private merchantSalt: string;
  private demoMode: boolean = true;

  constructor() {
    // API anahtarlarını kontrol et
    if (
      process.env.PAYTR_MERCHANT_ID &&
      process.env.PAYTR_MERCHANT_KEY &&
      process.env.PAYTR_MERCHANT_SALT
    ) {
      this.merchantId = process.env.PAYTR_MERCHANT_ID;
      this.merchantKey = process.env.PAYTR_MERCHANT_KEY;
      this.merchantSalt = process.env.PAYTR_MERCHANT_SALT;
      this.demoMode = false;
      this.apiUrl = 'https://www.paytr.com/odeme/api';
    } else {
      this.merchantId = 'DEMO_MERCHANT_ID';
      this.merchantKey = 'DEMO_MERCHANT_KEY';
      this.merchantSalt = 'DEMO_MERCHANT_SALT';
      this.demoMode = true;
      this.apiUrl = 'https://www.paytr.com/odeme/api';
      console.log('[DEMO] PayTR servisi demo modunda başlatıldı');
    }
  }

  /**
   * PayTR için BASE64 formatında imza oluşturur
   */
  private generateToken(data: string): string {
    const hash = crypto.createHmac('sha256', this.merchantKey)
      .update(data + this.merchantSalt)
      .digest('base64');
      
    return hash;
  }

  /**
   * Ödeme başlatma işlemi
   */
  async createPayment(paymentData: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayTR ödeme başlatma isteği:', paymentData);
      return {
        success: true,
        demoMode: true,
        paymentId: `demo_paytr_${Date.now()}`,
        checkoutForm: `<form id="demo-payment-form" action="/demo-payment-response" method="post">
          <input type="hidden" name="status" value="success">
          <input type="hidden" name="provider" value="paytr">
          <input type="hidden" name="paymentId" value="demo_paytr_${Date.now()}">
          <button type="submit">Ödemeyi Tamamla</button>
        </form>`
      };
    }

    try {
      // Sepeti JSON formatında hazırla
      const basket = [{
        name: paymentData.productName || 'Ferry Ticket',
        price: paymentData.amount,
        count: 1
      }];
      
      const basketStr = JSON.stringify(basket);
      
      // Email veya kullanıcı adını al
      const email = paymentData.email || 'customer@example.com';
      const userIp = paymentData.ip || '85.34.78.112';
      
      // Sipariş numarası
      const merchantOid = paymentData.orderRef || `order_${Date.now()}`;
      
      // Kullanıcı bilgileri
      const userBasket = Buffer.from(basketStr).toString('base64');
      const userAddress = paymentData.address || 'Address';
      const userName = `${paymentData.firstName} ${paymentData.lastName}`;
      const userPhone = paymentData.phone || '05001234567';
      
      // Geri dönüş URL'i
      const merchantOkUrl = paymentData.successUrl || 'https://example.com/payment-success';
      const merchantFailUrl = paymentData.failUrl || 'https://example.com/payment-fail';
      
      // Diğer ayarlar
      const paymentAmount = (parseFloat(paymentData.amount) * 100).toFixed(0); // Kuruş cinsinden
      const noInstallment = paymentData.installment ? 0 : 1;
      const maxInstallment = paymentData.maxInstallment || 0;
      const currency = paymentData.currency === 'EUR' ? 'EUR' : paymentData.currency === 'USD' ? 'USD' : 'TL';
      const lang = paymentData.lang || 'tr';
      
      // Test modu
      const testMode = 0; // 1: Test, 0: Production
      
      // Hash için string oluştur
      const hashStr = `${this.merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
      
      // Token oluştur
      const paytrToken = this.generateToken(hashStr);
      
      // PayTR'ye POST isteği gönder
      const requestData = {
        merchant_id: this.merchantId,
        user_ip: userIp,
        merchant_oid: merchantOid,
        email: email,
        payment_amount: paymentAmount,
        paytr_token: paytrToken,
        user_basket: userBasket,
        debug_on: 0,
        no_installment: noInstallment,
        max_installment: maxInstallment,
        user_name: userName,
        user_address: userAddress,
        user_phone: userPhone,
        merchant_ok_url: merchantOkUrl,
        merchant_fail_url: merchantFailUrl,
        timeout_limit: 30,
        currency: currency,
        test_mode: testMode,
        lang: lang
      };
      
      // URLSearchParams için tüm değerleri string'e çevirmeliyiz
      const requestDataAsString: Record<string, string> = {};
      Object.entries(requestData).forEach(([key, value]) => {
        requestDataAsString[key] = String(value);
      });
      
      const response = await axios.post(this.apiUrl, new URLSearchParams(requestDataAsString), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.status === 'success') {
        return {
          success: true,
          paymentId: merchantOid,
          checkoutForm: response.data.token,
          iframeUrl: `https://www.paytr.com/odeme/guvenli/${response.data.token}`,
          rawResponse: response.data
        };
      } else {
        throw new Error(`PayTR ödeme başlatılamadı: ${response.data.reason}`);
      }
    } catch (error: any) {
      console.error('PayTR ödeme hatası:', error.response?.data || error.message);
      throw new Error('PayTR ödeme işlemi başlatılamadı');
    }
  }

  /**
   * Ödeme durumu sorgulama
   */
  async checkPaymentStatus(paymentId: string): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayTR ödeme durumu sorgusu:', paymentId);
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
      // Durum sorgusu için gerekli parametreleri hazırla
      const requestData = {
        merchant_id: this.merchantId,
        merchant_oid: paymentId
      };
      
      // Hash için string oluştur
      const hashStr = `${this.merchantId}${paymentId}${this.merchantSalt}`;
      
      // Hash değerini hesapla
      const hash = crypto.createHmac('sha256', this.merchantKey)
        .update(hashStr)
        .digest('base64');
      
      // PayTR'ye POST isteği gönder
      const response = await axios.post('https://www.paytr.com/odeme/durum-sorgu', {
        ...requestData,
        paytr_token: hash
      });
      
      // Yanıtı işle ve döndür
      if (response.data && response.data.status !== 'error') {
        return {
          success: true,
          paymentId,
          status: response.data.status,
          amount: (parseInt(response.data.total_amount) / 100).toFixed(2), // Kuruştan TL'ye çevir
          currency: 'TRY',
          date: new Date().toISOString(),
          rawResponse: response.data
        };
      } else {
        throw new Error(`PayTR ödeme durumu alınamadı: ${response.data.err_msg || 'Bilinmeyen hata'}`);
      }
    } catch (error: any) {
      console.error('PayTR ödeme durumu sorgu hatası:', error.response?.data || error.message);
      throw new Error('PayTR ödeme durumu sorgulanamadı');
    }
  }

  /**
   * İade işlemi
   */
  async createRefund(refundData: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayTR iade işlemi:', refundData);
      return {
        success: true,
        demoMode: true,
        refundId: `demo_refund_paytr_${Date.now()}`,
        status: 'COMPLETED',
        amount: refundData.amount || '100.00',
        currency: 'TRY',
        date: new Date().toISOString()
      };
    }

    try {
      // İade işlemi için gerekli parametreleri hazırla
      const requestData = {
        merchant_id: this.merchantId,
        merchant_oid: refundData.paymentId,
        return_amount: (parseFloat(refundData.amount) * 100).toFixed(0) // Kuruş cinsinden
      };
      
      // Hash için string oluştur
      const hashStr = `${this.merchantId}${refundData.paymentId}${requestData.return_amount}${this.merchantSalt}`;
      
      // Hash değerini hesapla
      const hash = crypto.createHmac('sha256', this.merchantKey)
        .update(hashStr)
        .digest('base64');
      
      // PayTR'ye POST isteği gönder
      const response = await axios.post('https://www.paytr.com/odeme/iade', {
        ...requestData,
        paytr_token: hash
      });
      
      // Yanıtı işle ve döndür
      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          refundId: `refund_${refundData.paymentId}`,
          status: 'COMPLETED',
          amount: refundData.amount,
          currency: 'TRY',
          date: new Date().toISOString(),
          rawResponse: response.data
        };
      } else {
        throw new Error(`PayTR iade işlemi başarısız: ${response.data.err_msg || 'Bilinmeyen hata'}`);
      }
    } catch (error: any) {
      console.error('PayTR iade işlemi hatası:', error.response?.data || error.message);
      throw new Error('PayTR iade işlemi gerçekleştirilemedi');
    }
  }

  /**
   * Webhook doğrulama
   */
  verifyWebhook(requestData: any, headers: any): boolean {
    if (this.demoMode) {
      console.log('[DEMO] PayTR webhook doğrulama');
      return true;
    }

    try {
      // PayTR'dan gelen parametreleri al
      const { merchant_oid, status, total_amount, hash } = requestData;
      
      if (!hash) {
        console.error('PayTR webhook hash bulunamadı');
        return false;
      }
      
      // Hash için string oluştur
      const hashStr = `${merchant_oid}${this.merchantSalt}${status}${total_amount}`;
      
      // Kendi hash değerimizi hesapla
      const calculatedHash = crypto.createHmac('sha256', this.merchantKey)
        .update(hashStr)
        .digest('base64');
      
      // Hesaplanan hash ile gelen hash'i karşılaştır
      return calculatedHash === hash;
    } catch (error) {
      console.error('PayTR webhook doğrulama hatası:', error);
      return false;
    }
  }

  /**
   * Webhook işleme
   */
  async handleWebhook(requestData: any, headers: any): Promise<any> {
    if (this.demoMode) {
      console.log('[DEMO] PayTR webhook işleme');
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
        throw new Error('PayTR webhook imzası geçersiz');
      }
      
      // Status değerini kontrol et (success, failed, etc.)
      const status = requestData.status || 'unknown';
      
      // Yanıtı işle ve döndür
      return {
        success: true,
        paymentId: requestData.merchant_oid,
        status: status,
        amount: (parseInt(requestData.total_amount) / 100).toFixed(2), // Kuruştan TL'ye çevir
        currency: 'TRY',
        rawData: requestData
      };
    } catch (error) {
      console.error('PayTR webhook işleme hatası:', error);
      throw new Error('PayTR webhook işlenemedi');
    }
  }
}