import Stripe from 'stripe';

// Anahtarlar yalnızca ortam değişkenlerinden okunur; kaynak koda gömülmez.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY tanımlı değil - Stripe ödemeleri devre dışı.');
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : (null as unknown as Stripe);

// Stripe public key'i döndür
export const getStripePublicKey = () => {
  return process.env.VITE_STRIPE_PUBLIC_KEY || '';
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