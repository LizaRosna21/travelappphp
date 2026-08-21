import { storage } from '../../storage';
import whatsAppService from './index';
import whatsAppBusinessService from './business-api';
import { formatDate, formatCurrency } from '../utils';

/**
 * WhatsApp Notification Service
 * WhatsApp üzerinden bildirim gönderme servisi
 */
class WhatsAppNotificationService {
  /**
   * Rezervasyon onay bildirimi gönder
   * @param bookingId - Rezervasyon ID
   * @returns {Promise<boolean>} - İşlem başarılı mı?
   */
  public async sendBookingConfirmation(bookingId: number): Promise<boolean> {
    try {
      // Rezervasyon bilgilerini al
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.error(`Booking not found with ID: ${bookingId}`);
        return false;
      }
      
      // Kullanıcı bilgilerini al
      const user = await storage.getUser(booking.userId);
      
      if (!user || !user.phoneNumber) {
        console.error(`User not found or has no phone number, booking ID: ${bookingId}`);
        return false;
      }
      
      // Rota ve sefer bilgilerini al
      const route = await storage.getRoute(booking.routeId);
      const schedule = await storage.getSchedule(booking.scheduleId);
      
      if (!route || !schedule) {
        console.error(`Route or schedule not found, booking ID: ${bookingId}`);
        return false;
      }
      
      // Tarih formatlamaları
      const departureDate = formatDate(booking.departureDate, 'long', 'tr-TR');
      const departureTime = schedule.departureTime.split('T')[1].substring(0, 5);
      const arrivalTime = schedule.arrivalTime.split('T')[1].substring(0, 5);
      
      // Mesaj içeriği
      const message = `🎫 *Rezervasyon Onayı* 🎫

Sayın ${user.fullName || user.username},

${booking.bookingReference} numaralı rezervasyonunuz başarıyla oluşturulmuştur.

*Rezervasyon Detayları:*
• *Güzergah:* ${route.departurePort} ➡️ ${route.arrivalPort}
• *Tarih:* ${departureDate}
• *Saat:* ${departureTime} - ${arrivalTime}
• *Yolcu Sayısı:* ${booking.passengerCount || 1}
• *Toplam Ücret:* ${formatCurrency(booking.totalPrice, booking.currency)}
• *Ödeme Durumu:* ${booking.isPaid ? '✅ Ödendi' : '❌ Ödenmedi'}

${!booking.isPaid ? `\n⚠️ *Ödeme Yapılmadı!*\nReservasyonunuzun tamamlanması için lütfen ödemenizi en kısa sürede tamamlayınız.\nÖdeme Linki: https://ferrytickets.com/payment/${bookingId}\n` : ''}

${booking.returnDate ? `*Dönüş Bilgileri:*\n*Tarih:* ${formatDate(booking.returnDate, 'long', 'tr-TR')}\n` : ''}

Rezervasyonunuzla ilgili değişiklik veya iptal için müşteri hizmetlerimizi arayabilirsiniz.

Her türlü sorunuz için bize WhatsApp üzerinden veya 0850 123 45 67 numaralı telefondan ulaşabilirsiniz.

Ferry Tickets 🚢`;

      // WhatsApp üzerinden mesajı gönder
      const result = await whatsAppService.sendMessage(user.phoneNumber, message);
      
      console.log(`Booking confirmation sent to ${user.phoneNumber}, booking ID: ${bookingId}`);
      return true;
    } catch (error) {
      console.error(`Error sending booking confirmation, booking ID: ${bookingId}:`, error);
      return false;
    }
  }
  
  /**
   * Ödeme onay bildirimi gönder
   * @param bookingId - Rezervasyon ID
   * @returns {Promise<boolean>} - İşlem başarılı mı?
   */
  public async sendPaymentConfirmation(bookingId: number): Promise<boolean> {
    try {
      // Rezervasyon bilgilerini al
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.error(`Booking not found with ID: ${bookingId}`);
        return false;
      }
      
      // Kullanıcı bilgilerini al
      const user = await storage.getUser(booking.userId);
      
      if (!user || !user.phoneNumber) {
        console.error(`User not found or has no phone number, booking ID: ${bookingId}`);
        return false;
      }
      
      // Rota bilgilerini al
      const route = await storage.getRoute(booking.routeId);
      
      if (!route) {
        console.error(`Route not found, booking ID: ${bookingId}`);
        return false;
      }
      
      // Mesaj içeriği
      const message = `💰 *Ödeme Onayı* 💰

Sayın ${user.fullName || user.username},

${booking.bookingReference} numaralı rezervasyonunuzun ödemesi başarıyla alınmıştır.

*Ödeme Detayları:*
• *Güzergah:* ${route.departurePort} ➡️ ${route.arrivalPort}
• *Tarih:* ${formatDate(booking.departureDate, 'long', 'tr-TR')}
• *Toplam Tutar:* ${formatCurrency(booking.totalPrice, booking.currency)}

Biletiniz için teşekkür ederiz. İyi yolculuklar dileriz!

Ferry Tickets 🚢`;

      // WhatsApp üzerinden mesajı gönder
      const result = await whatsAppService.sendMessage(user.phoneNumber, message);
      
      console.log(`Payment confirmation sent to ${user.phoneNumber}, booking ID: ${bookingId}`);
      return true;
    } catch (error) {
      console.error(`Error sending payment confirmation, booking ID: ${bookingId}:`, error);
      return false;
    }
  }
  
  /**
   * Hareket hatırlatması gönder
   * @param bookingId - Rezervasyon ID
   * @returns {Promise<boolean>} - İşlem başarılı mı?
   */
  public async sendDepartureReminder(bookingId: number): Promise<boolean> {
    try {
      // Rezervasyon bilgilerini al
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.error(`Booking not found with ID: ${bookingId}`);
        return false;
      }
      
      // Kullanıcı bilgilerini al
      const user = await storage.getUser(booking.userId);
      
      if (!user || !user.phoneNumber) {
        console.error(`User not found or has no phone number, booking ID: ${bookingId}`);
        return false;
      }
      
      // Rota ve sefer bilgilerini al
      const route = await storage.getRoute(booking.routeId);
      const schedule = await storage.getSchedule(booking.scheduleId);
      
      if (!route || !schedule) {
        console.error(`Route or schedule not found, booking ID: ${bookingId}`);
        return false;
      }
      
      // Tarih formatlamaları
      const departureDate = formatDate(booking.departureDate, 'long', 'tr-TR');
      const departureTime = schedule.departureTime.split('T')[1].substring(0, 5);
      
      // Mesaj içeriği
      const message = `⏰ *Hareket Hatırlatması* ⏰

Sayın ${user.fullName || user.username},

${booking.bookingReference} numaralı rezervasyonunuz için hareket saatiniz yaklaşıyor!

*Sefer Bilgileri:*
• *Güzergah:* ${route.departurePort} ➡️ ${route.arrivalPort}
• *Tarih:* ${departureDate}
• *Saat:* ${departureTime}

Lütfen kalkış saatinden en az 30 dakika önce terminalde olunuz.

İyi yolculuklar dileriz!

Ferry Tickets 🚢`;

      // WhatsApp üzerinden mesajı gönder
      const result = await whatsAppService.sendMessage(user.phoneNumber, message);
      
      console.log(`Departure reminder sent to ${user.phoneNumber}, booking ID: ${bookingId}`);
      return true;
    } catch (error) {
      console.error(`Error sending departure reminder, booking ID: ${bookingId}:`, error);
      return false;
    }
  }
  
  /**
   * İptal bildirimi gönder
   * @param bookingId - Rezervasyon ID
   * @param reason - İptal nedeni
   * @returns {Promise<boolean>} - İşlem başarılı mı?
   */
  public async sendCancellationNotice(bookingId: number, reason: string): Promise<boolean> {
    try {
      // Rezervasyon bilgilerini al
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.error(`Booking not found with ID: ${bookingId}`);
        return false;
      }
      
      // Kullanıcı bilgilerini al
      const user = await storage.getUser(booking.userId);
      
      if (!user || !user.phoneNumber) {
        console.error(`User not found or has no phone number, booking ID: ${bookingId}`);
        return false;
      }
      
      // Mesaj içeriği
      const message = `❌ *Rezervasyon İptali* ❌

Sayın ${user.fullName || user.username},

${booking.bookingReference} numaralı rezervasyonunuz iptal edilmiştir.

${reason ? `*İptal Nedeni:* ${reason}\n\n` : ''}*Toplam Tutar:* ${formatCurrency(booking.totalPrice, booking.currency)}

${booking.isPaid ? 'İade işlemi 3-7 iş günü içerisinde tamamlanacaktır.' : ''}

Sorularınız için müşteri hizmetlerimizle iletişime geçebilirsiniz.

Ferry Tickets 🚢`;

      // WhatsApp üzerinden mesajı gönder
      const result = await whatsAppService.sendMessage(user.phoneNumber, message);
      
      console.log(`Cancellation notice sent to ${user.phoneNumber}, booking ID: ${bookingId}`);
      return true;
    } catch (error) {
      console.error(`Error sending cancellation notice, booking ID: ${bookingId}:`, error);
      return false;
    }
  }
  
  /**
   * Gecikme bildirimi gönder
   * @param bookingId - Rezervasyon ID
   * @param newDepartureTime - Yeni hareket saati
   * @param reason - Gecikme nedeni
   * @returns {Promise<boolean>} - İşlem başarılı mı?
   */
  public async sendDelayNotification(
    bookingId: number, 
    newDepartureTime: string, 
    reason: string
  ): Promise<boolean> {
    try {
      // Rezervasyon bilgilerini al
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.error(`Booking not found with ID: ${bookingId}`);
        return false;
      }
      
      // Kullanıcı bilgilerini al
      const user = await storage.getUser(booking.userId);
      
      if (!user || !user.phoneNumber) {
        console.error(`User not found or has no phone number, booking ID: ${bookingId}`);
        return false;
      }
      
      // Rota bilgilerini al
      const route = await storage.getRoute(booking.routeId);
      
      if (!route) {
        console.error(`Route not found, booking ID: ${bookingId}`);
        return false;
      }
      
      // Yeni hareket saatini formatla
      const formattedTime = newDepartureTime.split('T')[1]?.substring(0, 5) || newDepartureTime;
      
      // Mesaj içeriği
      const message = `⏰ *Sefer Gecikmesi Bildirimi* ⏰

Sayın ${user.fullName || user.username},

${booking.bookingReference} numaralı rezervasyonunuz için sefer saatinde değişiklik olmuştur.

*Güzergah:* ${route.departurePort} ➡️ ${route.arrivalPort}
*Tarih:* ${formatDate(booking.departureDate, 'long', 'tr-TR')}
*Yeni Hareket Saati:* ${formattedTime}

${reason ? `*Gecikme Nedeni:* ${reason}\n\n` : ''}Bilginize sunarız. İyi yolculuklar dileriz!

Ferry Tickets 🚢`;

      // WhatsApp üzerinden mesajı gönder
      const result = await whatsAppService.sendMessage(user.phoneNumber, message);
      
      console.log(`Delay notification sent to ${user.phoneNumber}, booking ID: ${bookingId}`);
      return true;
    } catch (error) {
      console.error(`Error sending delay notification, booking ID: ${bookingId}:`, error);
      return false;
    }
  }
  
  /**
   * Kampanya bildirimi gönder (toplu gönderim)
   * @param campaignId - Kampanya ID
   * @returns {Promise<{success: number, failed: number}>} - Başarılı ve başarısız gönderim sayıları
   */
  public async sendCampaignNotification(campaignId: number): Promise<{success: number, failed: number}> {
    const results = {
      success: 0,
      failed: 0
    };
    
    try {
      // Kampanya bilgilerini al
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        console.error(`Campaign not found with ID: ${campaignId}`);
        return results;
      }
      
      // Müşteri segmentini al
      const segment = await storage.getCustomerSegment(campaign.customerSegmentId);
      
      if (!segment) {
        console.error(`Customer segment not found for campaign ID: ${campaignId}`);
        return results;
      }
      
      // Segmentteki kullanıcıları al
      const users = await storage.getUsersBySegment(segment.id);
      
      if (!users || users.length === 0) {
        console.error(`No users found in segment for campaign ID: ${campaignId}`);
        return results;
      }
      
      // Telefon numarası olan kullanıcıları filtrele
      const usersWithPhone = users.filter(user => user.phoneNumber);
      
      if (usersWithPhone.length === 0) {
        console.error(`No users with phone numbers found for campaign ID: ${campaignId}`);
        return results;
      }
      
      // Kampanya mesajını hazırla
      const message = `🚢 *${campaign.name}* 🚢

${campaign.description}

${campaign.content}

Bu kampanya hakkında daha fazla bilgi için web sitemizi ziyaret edin:
🌐 www.ferrytickets.com/kampanyalar/${campaign.id}`;

      // Her kullanıcıya mesaj gönder
      for (const user of usersWithPhone) {
        try {
          await whatsAppService.sendMessage(user.phoneNumber!, message);
          results.success++;
        } catch (error) {
          console.error(`Error sending campaign notification to user ${user.id}:`, error);
          results.failed++;
        }
      }
      
      // Kampanya performansını güncelle
      await storage.createCampaignPerformance({
        campaignId,
        channel: 'whatsapp',
        sent: results.success,
        delivered: results.success, // Teslimat başarılı kabul ediliyor
        opened: 0, // WhatsApp'ta takip edilemiyor
        clicked: 0, // WhatsApp'ta takip edilemiyor
        converted: 0,
        failed: results.failed,
        date: new Date().toISOString()
      });
      
      console.log(`Campaign notification sent to ${results.success} users, failed: ${results.failed}, campaign ID: ${campaignId}`);
      return results;
    } catch (error) {
      console.error(`Error sending campaign notification, campaign ID: ${campaignId}:`, error);
      return results;
    }
  }
}

// Singleton instance
const whatsAppNotificationService = new WhatsAppNotificationService();

export default whatsAppNotificationService;