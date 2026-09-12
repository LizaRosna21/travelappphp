import { PayuService } from './payu-service';
import { IyzicoService } from './iyzico-service';
import { PayTRService } from './paytr-service';

/**
 * Türk ödeme sağlayıcıları için entegrasyon servisi
 * PayU, Iyzico ve PayTR ödeme sistemlerini tek bir arayüzden yönetir
 */
class TurkishPaymentService {
  private payuService: PayuService;
  private iyzicoService: IyzicoService;
  private paytrService: PayTRService;
  private demoMode: boolean = true;

  constructor() {
    this.payuService = new PayuService();
    this.iyzicoService = new IyzicoService();
    this.paytrService = new PayTRService();
    
    // Eğer tüm sağlayıcılar için anahtar ayarlanmışsa, demo modunu kapat
    if (
      process.env.PAYU_MERCHANT_ID && 
      process.env.PAYU_SECRET_KEY &&
      process.env.IYZICO_API_KEY && 
      process.env.IYZICO_SECRET_KEY &&
      process.env.PAYTR_MERCHANT_ID && 
      process.env.PAYTR_MERCHANT_KEY && 
      process.env.PAYTR_MERCHANT_SALT
    ) {
      this.demoMode = false;
      console.log('Türk ödeme sağlayıcıları aktif modda başlatıldı');
    } else {
      console.log('[DEMO] Türk ödeme sağlayıcıları demo modunda başlatıldı');
    }
  }

  /**
   * Ödeme sağlayıcısına göre ödeme işlemi başlatır
   */
  async createPayment(provider: 'payu' | 'iyzico' | 'paytr', paymentData: any): Promise<any> {
    switch (provider) {
      case 'payu':
        return this.payuService.createPayment(paymentData);
      case 'iyzico':
        return this.iyzicoService.createPayment(paymentData);
      case 'paytr':
        return this.paytrService.createPayment(paymentData);
      default:
        throw new Error('Geçersiz ödeme sağlayıcısı');
    }
  }

  /**
   * Ödeme durumunu kontrol eder
   */
  async checkPaymentStatus(provider: 'payu' | 'iyzico' | 'paytr', paymentId: string): Promise<any> {
    switch (provider) {
      case 'payu':
        return this.payuService.checkPaymentStatus(paymentId);
      case 'iyzico':
        return this.iyzicoService.checkPaymentStatus(paymentId);
      case 'paytr':
        return this.paytrService.checkPaymentStatus(paymentId);
      default:
        throw new Error('Geçersiz ödeme sağlayıcısı');
    }
  }

  /**
   * İade işlemi yapar
   */
  async createRefund(provider: 'payu' | 'iyzico' | 'paytr', refundData: any): Promise<any> {
    switch (provider) {
      case 'payu':
        return this.payuService.createRefund(refundData);
      case 'iyzico':
        return this.iyzicoService.createRefund(refundData);
      case 'paytr':
        return this.paytrService.createRefund(refundData);
      default:
        throw new Error('Geçersiz ödeme sağlayıcısı');
    }
  }

  /**
   * Webhook doğrulama işlemi
   */
  verifyWebhook(provider: 'payu' | 'iyzico' | 'paytr', requestData: any, headers: any): boolean {
    switch (provider) {
      case 'payu':
        return this.payuService.verifyWebhook(requestData, headers);
      case 'iyzico':
        return this.iyzicoService.verifyWebhook(requestData, headers);
      case 'paytr':
        return this.paytrService.verifyWebhook(requestData, headers);
      default:
        throw new Error('Geçersiz ödeme sağlayıcısı');
    }
  }

  /**
   * Webhook işleme
   */
  async handleWebhook(provider: 'payu' | 'iyzico' | 'paytr', requestData: any, headers: any): Promise<any> {
    switch (provider) {
      case 'payu':
        return this.payuService.handleWebhook(requestData, headers);
      case 'iyzico':
        return this.iyzicoService.handleWebhook(requestData, headers);
      case 'paytr':
        return this.paytrService.handleWebhook(requestData, headers);
      default:
        throw new Error('Geçersiz ödeme sağlayıcısı');
    }
  }

  /**
   * Desteklenen ödeme sağlayıcıları ve durumlarını döndürür
   */
  getPaymentProviders() {
    return {
      payu: {
        name: 'PayU',
        description: 'PayU ödeme sistemi',
        logo: '/images/payment-logos/payu.png',
        isActive: true,
        demoMode: this.demoMode
      },
      iyzico: {
        name: 'Iyzico',
        description: 'Iyzico ödeme sistemi',
        logo: '/images/payment-logos/iyzico.png',
        isActive: true,
        demoMode: this.demoMode
      },
      paytr: {
        name: 'PayTR',
        description: 'PayTR ödeme sistemi',
        logo: '/images/payment-logos/paytr.png',
        isActive: true,
        demoMode: this.demoMode
      }
    };
  }
}

export const turkishPaymentService = new TurkishPaymentService();