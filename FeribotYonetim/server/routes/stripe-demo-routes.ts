import { Request, Response, Router } from 'express';
import { stripeDemoService } from '../services/stripe-demo';
import { isAuthenticated } from '../auth';

/**
 * Demo amaçlı Stripe rotalarını kaydet
 */
export function registerStripeDemoRoutes(router: Router) {
  /**
   * Demo modu durumunu kontrol et
   */
  router.get('/stripe/demo-status', (req: Request, res: Response) => {
    try {
      res.json({ 
        isDemoMode: stripeDemoService.isDemoMode(),
        message: stripeDemoService.isDemoMode() 
          ? 'Sistem şu anda demo modunda çalışıyor. Gerçek ödeme alınmayacaktır.' 
          : 'Sistem şu anda gerçek modda çalışıyor. Gerçek ödeme alınacaktır.'
      });
    } catch (error) {
      console.error('Stripe demo durumu kontrol edilirken hata:', error);
      res.status(500).json({ error: 'Stripe durumu kontrol edilirken bir hata oluştu' });
    }
  });

  /**
   * Stripe yapılandırma bilgilerini getir
   */
  router.get('/stripe/config', (req: Request, res: Response) => {
    try {
      // Test public key döndür (değiştirilmiş test anahtarı)
      const publicKey = 'pk_test_51OofdPJlzrTrOb0wCQHOECu35wjQM2CtJubUNE8YXwWj06m1XRAc3ayYD9NnERAzkv5YjPp1gZ2STJKlnxysMaIC00X6MbM3Ut';
      res.json({ 
        publicKey,
        isDemoMode: stripeDemoService.isDemoMode()
      });
    } catch (error) {
      console.error('Stripe yapılandırma bilgileri alınırken hata:', error);
      res.status(500).json({ error: 'Stripe yapılandırma bilgileri alınırken bir hata oluştu' });
    }
  });

  /**
   * Ödeme niyeti oluştur
   */
  router.post('/stripe/create-payment-intent', async (req: Request, res: Response) => {
    try {
      const { amount, currency = 'try', metadata = {} } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: 'Tutar belirtilmelidir' });
      }
      
      // Demo servisi ile ödeme niyeti oluştur
      const paymentIntent = await stripeDemoService.createPaymentIntent(
        amount,
        currency,
        metadata
      );
      
      // Client secret ve payment ID döndür
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        isDemoMode: stripeDemoService.isDemoMode()
      });
    } catch (error) {
      console.error('Ödeme niyeti oluşturulurken hata:', error);
      res.status(500).json({ error: 'Ödeme niyeti oluşturulurken bir hata oluştu' });
    }
  });

  /**
   * Ödeme durumunu kontrol et
   */
  router.get('/stripe/payment-status/:paymentId', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({ error: 'Ödeme ID belirtilmelidir' });
      }
      
      // Demo servisi ile ödeme durumunu kontrol et
      const paymentIntent = await stripeDemoService.confirmPaymentIntent(paymentId);
      
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        isDemoMode: stripeDemoService.isDemoMode()
      });
    } catch (error) {
      console.error('Ödeme durumu kontrol edilirken hata:', error);
      res.status(500).json({ error: 'Ödeme durumu kontrol edilirken bir hata oluştu' });
    }
  });

  /**
   * Ödeme sonrası rezervasyon onayla
   */
  router.post('/stripe/confirm-booking', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: 'Ödeme ID belirtilmelidir' });
      }
      
      // Demo servisi ile ödeme durumunu kontrol et
      const paymentIntent = await stripeDemoService.confirmPaymentIntent(paymentIntentId);
      
      // Burada normalde booking işlemleri yapılacak
      // Demo için sadece başarılı cevap döndürüyoruz
      
      res.json({
        success: true,
        bookingId: paymentIntent.metadata.bookingId || 'DEMO-' + Date.now(),
        paymentStatus: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Cent'ten gerçek tutara çevir
        currency: paymentIntent.currency.toUpperCase()
      });
    } catch (error) {
      console.error('Rezervasyon onaylanırken hata:', error);
      res.status(500).json({ error: 'Rezervasyon onaylanırken bir hata oluştu' });
    }
  });

  /**
   * İade işlemi
   */
  router.post('/stripe/refund', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, amount, reason } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: 'Ödeme ID belirtilmelidir' });
      }
      
      // Demo servisi ile iade işlemi yap
      const refund = await stripeDemoService.createRefund(
        paymentIntentId,
        amount,
        reason
      );
      
      res.json({
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Cent'ten gerçek tutara çevir
        currency: refund.currency.toUpperCase()
      });
    } catch (error) {
      console.error('İade işlemi yapılırken hata:', error);
      res.status(500).json({ error: 'İade işlemi yapılırken bir hata oluştu' });
    }
  });
  
  return router;
}