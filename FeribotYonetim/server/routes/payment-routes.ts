import { Request, Response, Router } from "express";
import { IStorage } from "../storage";
import { isAuthenticated } from "../auth";
import * as stripeService from "../services/payment-stripe";

export function registerPaymentRoutes(router: Router, storage: IStorage) {
  // Stripe public key endpoint
  router.get("/stripe/config", (req: Request, res: Response) => {
    try {
      res.json({ 
        publishableKey: stripeService.getStripePublicKey() 
      });
    } catch (error: any) {
      console.error("Stripe config hatası:", error);
      res.status(500).json({ message: "Ödeme yapılandırması alınamadı" });
    }
  });

  // Create a payment intent
  router.post("/stripe/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { amount, currency = 'try' } = req.body;

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Geçerli bir ödeme tutarı gerekli" });
      }

      const paymentIntent = await stripeService.createPaymentIntent(
        parseFloat(amount),
        currency
      );

      res.json(paymentIntent);
    } catch (error: any) {
      console.error("Ödeme niyeti oluşturma hatası:", error);
      res.status(500).json({ message: error.message || "Ödeme işlemi başlatılamadı" });
    }
  });

  // Payment success webhook
  router.post("/stripe/webhook", async (req: Request, res: Response) => {
    // Webhook işlemleri için raw body gerekiyor
    const signature = req.headers["stripe-signature"] as string;
    
    if (!signature) {
      return res.status(400).json({ message: "Stripe imzası bulunamadı" });
    }

    try {
      const event = stripeService.constructEventFromPayload(signature, req.body);

      // Event tipine göre işlem yap
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log(`Ödeme başarılı: ${paymentIntent.id}`);
          // Başarılı ödeme sonrası işlemleri gerçekleştir
          // örn: rezervasyon durumunu güncelle, bilet oluştur, email gönder
          break;
        case "payment_intent.payment_failed":
          const failedPayment = event.data.object;
          console.log(`Ödeme başarısız: ${failedPayment.id}`);
          // Başarısız ödeme işlemlerini gerçekleştir
          break;
        default:
          console.log(`Bilinmeyen event tipi: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook işleme hatası:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Reservation confirmation after payment
  router.post("/stripe/confirm-booking/:bookingId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "Ödeme ID'si gerekli" });
      }

      // Ödeme durumunu kontrol et
      const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ 
          message: "Ödeme henüz tamamlanmadı", 
          status: paymentIntent.status 
        });
      }

      // Booking'i güncelle
      const booking = await storage.getBooking(parseInt(bookingId));
      
      if (!booking) {
        return res.status(404).json({ message: "Rezervasyon bulunamadı" });
      }
      
      // Rezervasyon güncelleme işlemleri
      const updatedBooking = await storage.updateBooking(parseInt(bookingId), {
        status: "confirmed",
        isPaid: true,
        paymentMethod: "stripe",
        paymentReference: paymentIntentId
      });

      // Başarılı yanıt dön
      res.json({
        success: true,
        booking: updatedBooking
      });
    } catch (error: any) {
      console.error("Rezervasyon onaylama hatası:", error);
      res.status(500).json({ message: error.message || "Rezervasyon onaylanamadı" });
    }
  });

  // Refund endpoint
  router.post("/stripe/refund", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, amount } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "Ödeme ID'si gerekli" });
      }

      const refund = await stripeService.createRefund(
        paymentIntentId,
        amount ? parseFloat(amount) : undefined
      );

      res.json({
        success: true,
        refund: refund
      });
    } catch (error: any) {
      console.error("İade işlemi hatası:", error);
      res.status(500).json({ message: error.message || "İade işlemi yapılamadı" });
    }
  });

  return router;
}