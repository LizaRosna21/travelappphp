import Stripe from 'stripe';

// Test anahtarları - gerçek anahtarlar environment'tan yüklenecek
const TEST_STRIPE_SECRET_KEY = 'sk_test_REDACTED_SEE_COMMIT_MESSAGE';
const TEST_VITE_STRIPE_PUBLIC_KEY = 'pk_test_51O4TFRFZnC8KcXMbrbAHhrzVAeJcfvlK6MixkHSFPRZOcYW9dlKjdmDflQqJWocHNGp6lqmvg3jyPzHPbIGG7kg400xvlJOZwg';

// Stripe instance oluştur - environment'ta anahtar varsa kullan, yoksa test anahtarını kullan
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || TEST_STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// Stripe public key'i döndür - environment'ta anahtar varsa kullan, yoksa test anahtarını kullan
export const getStripePublicKey = () => {
  return process.env.VITE_STRIPE_PUBLIC_KEY || TEST_VITE_STRIPE_PUBLIC_KEY;
};

// Ödeme niyeti oluştur
export const createPaymentIntent = async (amount: number, currency: string = 'try') => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Kuruş/cent cinsinden
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        integration_check: 'ferry_ticket_booking'
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
  } catch (error: any) {
    console.error('Stripe ödeme niyeti oluşturma hatası:', error.message);
    throw new Error(`Ödeme işlemi başlatılamadı: ${error.message}`);
  }
};

// Ödeme durumunu kontrol et
export const retrievePaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    console.error('Stripe ödeme durumu kontrol hatası:', error.message);
    throw new Error(`Ödeme durumu kontrol edilemedi: ${error.message}`);
  }
};

// İade işlemi
export const createRefund = async (paymentIntentId: string, amount?: number) => {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    
    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Kısmi iade için
    }
    
    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error: any) {
    console.error('Stripe iade işlemi hatası:', error.message);
    throw new Error(`İade işlemi yapılamadı: ${error.message}`);
  }
};

// Webhook olayını doğrula ve işle
export const constructEventFromPayload = (signature: string, payload: Buffer) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret ayarlanmamış');
  }
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error: any) {
    console.error('Webhook imza doğrulama hatası:', error.message);
    throw new Error(`Webhook imzası doğrulanamadı: ${error.message}`);
  }
};

export default {
  createPaymentIntent,
  retrievePaymentIntent,
  createRefund,
  constructEventFromPayload,
  getStripePublicKey
};