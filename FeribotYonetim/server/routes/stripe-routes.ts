import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { isAuthenticated } from '../auth';
import { IStorage } from '../storage';

// Stripe API anahtarını ortam değişkeninden al, yoksa test anahtarını kullan
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_REDACTED_SEE_COMMIT_MESSAGE';

// Stripe servisini başlat
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export function registerStripeRoutes(router: Router, storage: IStorage) {
  // Stripe public key'i dön
  router.get('/stripe/config', (req: Request, res: Response) => {
    res.json({
      publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51O4TFRFZnC8KcXMbrbAHhrzVAeJcfvlK6MixkHSFPRZOcYW9dlKjdmDflQqJWocHNGp6lqmvg3jyPzHPbIGG7kg400xvlJOZwg',
    });
  });

  // Ödeme niyeti oluşturma
  router.post('/stripe/create-payment-intent', async (req: Request, res: Response) => {
    try {
      const { amount, currency = 'try' } = req.body;

      if (!amount) {
        return res.status(400).json({ error: 'Tutar belirtilmelidir' });
      }

      // Kuruş biriminde hesaplama
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Stripe ödeme niyeti oluştur
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        description: 'Ferry ticket purchase',
        metadata: {
          integration_check: 'accept_a_payment',
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents / 100,
        currency: currency.toUpperCase(),
        id: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Stripe ödeme niyeti oluşturma hatası:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook'u
  router.post('/stripe/webhook', async (req: Request, res: Response) => {
    let event = req.body;
    
    // Webhook secret varsa olayın imzasını doğrula
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        const signature = req.headers['stripe-signature'] as string;
        
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        console.error(`Webhook imza doğrulama hatası:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    // Olay tipine göre işlem yap
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Başarılı ödemeyi işle
        console.log(`PaymentIntent ${paymentIntent.id} başarıyla ödendi!`);
        
        // Eğer metadata'da booking_id varsa, rezervasyon durumunu güncelle
        if (paymentIntent.metadata && paymentIntent.metadata.booking_id) {
          const bookingId = parseInt(paymentIntent.metadata.booking_id, 10);
          try {
            await storage.updateBookingPaymentStatus(bookingId, 'paid');
            console.log(`Rezervasyon #${bookingId} ödendi olarak güncellendi.`);
          } catch (error) {
            console.error(`Rezervasyon güncelleme hatası:`, error);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log(`Ödeme başarısız: ${failedPaymentIntent.id}`);
        
        // Eğer metadata'da booking_id varsa, rezervasyon durumunu güncelle
        if (failedPaymentIntent.metadata && failedPaymentIntent.metadata.booking_id) {
          const bookingId = parseInt(failedPaymentIntent.metadata.booking_id, 10);
          try {
            await storage.updateBookingPaymentStatus(bookingId, 'failed');
            console.log(`Rezervasyon #${bookingId} başarısız olarak güncellendi.`);
          } catch (error) {
            console.error(`Rezervasyon güncelleme hatası:`, error);
          }
        }
        break;
        
      default:
        console.log(`Bilinmeyen olay tipi: ${event.type}`);
    }

    res.json({ received: true });
  });

  // Rezervasyon ödemesi onaylama
  router.post('/stripe/confirm-booking/:bookingId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'Ödeme ID gerekli' });
      }

      // Rezervasyonu bul
      const booking = await storage.getBookingByReference(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Rezervasyon bulunamadı' });
      }

      // Ödeme durumunu güncelle
      await storage.updateBookingPaymentStatus(booking.id, 'paid');

      // Kullanıcıya başarılı yanıt dön
      res.status(200).json({
        success: true,
        message: 'Rezervasyon ödeme durumu başarıyla güncellendi',
        booking: {
          id: booking.id,
          reference: booking.bookingReference,
          totalPrice: booking.totalPrice,
          currency: booking.currency,
          status: 'paid'
        }
      });
    } catch (error: any) {
      console.error('Ödeme onaylama hatası:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ödeme iadesi
  router.post('/stripe/refund', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, amount, reason } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'Ödeme ID gerekli' });
      }

      // Stripe'da iadesi oluştur
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(parseFloat(amount) * 100) : undefined, // Kısmi iade için
        reason: reason || 'requested_by_customer'
      });

      res.status(200).json({
        success: true,
        refund: refund
      });
    } catch (error: any) {
      console.error('İade işlemi hatası:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}