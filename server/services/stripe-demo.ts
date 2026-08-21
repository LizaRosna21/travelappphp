import Stripe from 'stripe';

/**
 * Demo amaçlı bir Stripe servisi. 
 * Bu servis, gerçek Stripe API anahtarları olmadan da çalışabilir.
 */
class StripeDemoService {
  private stripe: Stripe | null;
  private demoMode: boolean;
  private demoData: {
    paymentIntents: Map<string, any>;
    customers: Map<string, any>;
    refunds: Map<string, any>;
    products: any[];
  };

  constructor() {
    // Gerçek Stripe API anahtarı varsa kullan, yoksa demo modunda çalış
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    this.demoMode = !stripeKey || stripeKey.startsWith('sk_test_dummy');
    
    try {
      if (!this.demoMode) {
        this.stripe = new Stripe(stripeKey!, {
          apiVersion: '2023-10-16'
        });
      } else {
        this.stripe = new Stripe('sk_test_dummy', {
          apiVersion: '2023-10-16'
        });
      }
    } catch (error) {
      console.warn('Stripe API başlatılamadı, demo mod kullanılacak:', error);
      this.demoMode = true;
      this.stripe = null;
    }
    
    // Demo veriler için Map oluştur
    this.demoData = {
      paymentIntents: new Map(),
      customers: new Map(),
      refunds: new Map(),
      products: [
        {
          id: 'prod_demo1',
          name: 'Ferry Ticket - Standard',
          description: 'Standard ferry ticket without extras',
          active: true,
          price: 100,
          currency: 'try'
        },
        {
          id: 'prod_demo2',
          name: 'Ferry Ticket - Premium',
          description: 'Premium ferry ticket with extras',
          active: true,
          price: 250,
          currency: 'try'
        }
      ]
    };
  }

  /**
   * Yeni bir ödeme niyeti (payment intent) oluşturur
   */
  async createPaymentIntent(amount: number, currency: string, metadata: any = {}): Promise<any> {
    if (!this.demoMode && this.stripe) {
      try {
        // Gerçek Stripe ile ödeme niyeti oluştur
        return await this.stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Tutarı cent'e çevir
          currency: currency.toLowerCase(),
          metadata
        });
      } catch (error) {
        console.error('Gerçek Stripe ödeme niyeti oluşturulamadı, demo mod kullanılacak:', error);
        // Hata durumunda demo moda geç
        this.demoMode = true;
      }
    }
    
    // Demo mod - sahte ödeme niyeti oluştur
    const paymentIntent = {
      id: 'pi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      object: 'payment_intent',
      amount: Math.round(amount * 100), // Tutarı cent'e çevir
      currency: currency.toLowerCase(),
      status: 'requires_payment_method',
      client_secret: 'pi_' + Date.now() + '_secret_' + Math.random().toString(36).substr(2, 9),
      created: Math.floor(Date.now() / 1000),
      metadata: metadata || {}
    };
    
    // Demo verilere ekle
    this.demoData.paymentIntents.set(paymentIntent.id, paymentIntent);
    
    return paymentIntent;
  }

  /**
   * Bir ödeme niyetini doğrular
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<any> {
    if (!this.demoMode && this.stripe) {
      try {
        // Gerçek Stripe ile ödeme niyetini getir
        return await this.stripe.paymentIntents.retrieve(paymentIntentId);
      } catch (error) {
        console.error('Gerçek Stripe ödeme niyeti getirilemedi, demo mod kullanılacak:', error);
        // Hata durumunda demo moda geç
        this.demoMode = true;
      }
    }
    
    // Demo mod - sahte ödeme niyeti doğrula
    let paymentIntent = this.demoData.paymentIntents.get(paymentIntentId);
    
    if (!paymentIntent) {
      // ID bulunamadıysa demo ödeme niyeti oluştur
      paymentIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 10000, // 100 TL
        currency: 'try',
        status: 'succeeded',
        client_secret: paymentIntentId + '_secret',
        created: Math.floor(Date.now() / 1000),
        metadata: {
          bookingId: 'DEMO-' + Date.now()
        }
      };
      
      this.demoData.paymentIntents.set(paymentIntentId, paymentIntent);
    } else {
      // Mevcut ödeme niyetini başarılı olarak güncelle
      paymentIntent.status = 'succeeded';
    }
    
    return paymentIntent;
  }

  /**
   * İade işlemi
   */
  async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    if (!this.demoMode && this.stripe) {
      try {
        // Gerçek Stripe ile iade oluştur
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: paymentIntentId,
          reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer'
        };
        
        if (amount) {
          refundParams.amount = Math.round(amount * 100);
        }
        
        return await this.stripe.refunds.create(refundParams);
      } catch (error) {
        console.error('Gerçek Stripe iade oluşturulamadı, demo mod kullanılacak:', error);
        // Hata durumunda demo moda geç
        this.demoMode = true;
      }
    }
    
    // Ödeme niyetini kontrol et
    const paymentIntent = this.demoData.paymentIntents.get(paymentIntentId);
    
    if (!paymentIntent) {
      throw new Error('İade için ödeme bulunamadı');
    }
    
    // Demo mod - sahte iade oluştur
    const refundAmount = amount ? Math.round(amount * 100) : paymentIntent.amount;
    const refund = {
      id: 're_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      object: 'refund',
      amount: refundAmount,
      currency: paymentIntent.currency,
      payment_intent: paymentIntentId,
      status: 'succeeded',
      reason: reason || 'requested_by_customer',
      created: Math.floor(Date.now() / 1000)
    };
    
    // Demo verilere ekle
    this.demoData.refunds.set(refund.id, refund);
    
    // Ödeme niyetini güncelle
    paymentIntent.status = refundAmount === paymentIntent.amount ? 'refunded' : 'partially_refunded';
    
    return refund;
  }

  /**
   * Ürünleri listele
   */
  async listProducts(): Promise<any[]> {
    if (!this.demoMode && this.stripe) {
      try {
        // Gerçek Stripe ile ürünleri getir
        const products = await this.stripe.products.list();
        return products.data;
      } catch (error) {
        console.error('Gerçek Stripe ürünleri getirilemedi, demo mod kullanılacak:', error);
        // Hata durumunda demo moda geç
        this.demoMode = true;
      }
    }
    
    // Demo mod - sahte ürünleri döndür
    return this.demoData.products;
  }

  /**
   * Demo mod durumunu döndür
   */
  isDemoMode(): boolean {
    return this.demoMode;
  }

  /**
   * Stripe nesnesini döndür
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }
}

export const stripeDemoService = new StripeDemoService();