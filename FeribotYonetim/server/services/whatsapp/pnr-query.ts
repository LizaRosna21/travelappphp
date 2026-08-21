import { storage } from '../../storage';
import { formatDate, formatCurrency } from '../utils';

/**
 * WhatsApp PNR Query Service
 * PNR kodu ile rezervasyon sorgulama servisi
 */
class PNRQueryService {
  /**
   * PNR sorgulama
   * @param pnrCode - PNR kodu
   * @returns {Promise<{success: boolean, message: string, booking?: any}>}
   */
  async queryPNR(pnrCode: string): Promise<{success: boolean, message: string, booking?: any}> {
    try {
      if (!pnrCode || typeof pnrCode !== 'string') {
        return {
          success: false,
          message: 'Geçersiz PNR kodu.'
        };
      }
      
      // Demo modunda rastgele yanıt döndür
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        // TEST_ ile başlayan PNR'leri özel işle
        if (pnrCode.toUpperCase().startsWith('TEST_')) {
          return this.getTestPNRResponse(pnrCode);
        }
        
        // PNR kodu 6 karakterden küçükse hata döndür
        if (pnrCode.length < 6) {
          return {
            success: false,
            message: 'PNR kodu en az 6 karakter olmalıdır.'
          };
        }
        
        // Demo yanıtı oluştur
        return this.generateDemoPNRResponse(pnrCode);
      }
      
      // Gerçek PNR sorgulama işlemi
      const booking = await this.fetchBookingByPNR(pnrCode);
      
      if (!booking) {
        return {
          success: false,
          message: `*${pnrCode}* kodlu bir rezervasyon bulunamadı. Lütfen PNR kodunuzu kontrol edip tekrar deneyiniz.`
        };
      }
      
      // Rezervasyon yanıtını format
      return {
        success: true,
        message: this.formatBookingInfo(booking),
        booking
      };
    } catch (error) {
      console.error('Error querying PNR:', error);
      return {
        success: false,
        message: 'PNR sorgulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.'
      };
    }
  }
  
  /**
   * PNR ile rezervasyon getir
   */
  private async fetchBookingByPNR(pnrCode: string): Promise<any | null> {
    try {
      // PNR kodu ile rezervasyon ara
      // Normal kullanımda storage.getBookingByPNR veya benzeri bir metot olmalı
      // Bu bölümü projenin yapısına göre uyarlayın
      
      // Örnek implementasyon:
      const bookings = await storage.getAllBookings();
      const booking = bookings.find(b => 
        b.bookingReference === pnrCode || 
        b.pnrNumber === pnrCode
      );
      
      return booking || null;
    } catch (error) {
      console.error('Error fetching booking by PNR:', error);
      return null;
    }
  }
  
  /**
   * Rezervasyon bilgilerini formatla
   */
  private formatBookingInfo(booking: any): string {
    try {
      // Temel rezervasyon bilgilerini al
      const {
        id,
        userId,
        bookingReference,
        pnrNumber,
        departureDate,
        returnDate,
        totalPrice,
        currency,
        status,
        isPaid,
        passengerCount,
        routeId,
        scheduleId
      } = booking;
      
      // Route ve schedule bilgilerini al (projenin yapısına göre değiştirin)
      const route = storage.getRoute(routeId);
      const schedule = storage.getSchedule(scheduleId);
      
      // Formatlanmış tarih ve saatler
      const formattedDepartureDate = formatDate(departureDate, 'long', 'tr-TR');
      const formattedReturnDate = returnDate ? formatDate(returnDate, 'long', 'tr-TR') : '';
      
      // Kalkış ve varış saati
      const departureTime = schedule?.departureTime?.split('T')[1].substring(0, 5) || '00:00';
      const arrivalTime = schedule?.arrivalTime?.split('T')[1].substring(0, 5) || '00:00';
      
      // Durum metni
      const statusText = this.getStatusText(status);
      
      // Ödeme durumu
      const paymentStatus = isPaid ? '✅ Ödendi' : '❌ Ödenmedi';
      
      // Rezervasyon mesajını oluştur
      let message = `🎫 *Rezervasyon Bilgileri* 🎫

*PNR Kodu:* ${pnrNumber || bookingReference}
*Durum:* ${statusText}
*Ödeme:* ${paymentStatus}

*Güzergah:* ${route?.departurePort || 'Başlangıç'} ➡️ ${route?.arrivalPort || 'Varış'}
*Tarih:* ${formattedDepartureDate}
*Saat:* ${departureTime} - ${arrivalTime}
*Yolcu Sayısı:* ${passengerCount || 1}
*Toplam Ücret:* ${formatCurrency(totalPrice, currency || 'TRY')}

${!isPaid ? `\n⚠️ *Ödeme Yapılmadı!*\nReservasyonunuzun tamamlanması için lütfen ödemenizi en kısa sürede tamamlayınız.\nÖdeme Linki: https://ferrytickets.com/payment/${id}\n` : ''}

${returnDate ? `*Dönüş Bilgileri:*\n*Tarih:* ${formattedReturnDate}\n` : ''}

Rezervasyonunuzla ilgili değişiklik veya iptal için müşteri hizmetlerimizi arayabilirsiniz.

Her türlü sorunuz için bize WhatsApp üzerinden veya 0850 123 45 67 numaralı telefondan ulaşabilirsiniz.

Ferry Tickets 🚢`;

      return message;
    } catch (error) {
      console.error('Error formatting booking info:', error);
      return `PNR sorgusu başarılı ancak bilgiler formatlanırken bir sorun oluştu.`;
    }
  }
  
  /**
   * Rezervasyon durumu metni
   */
  private getStatusText(status: string): string {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return '✅ Onaylandı';
      case 'pending':
        return '⏳ Beklemede';
      case 'cancelled':
        return '❌ İptal Edildi';
      case 'completed':
        return '✅ Tamamlandı';
      case 'failed':
        return '❌ Başarısız';
      default:
        return status || 'Bilinmiyor';
    }
  }
  
  /**
   * Test PNR yanıtları
   */
  private getTestPNRResponse(pnrCode: string): {success: boolean, message: string, booking?: any} {
    // Özel test PNR kodları
    const testCode = pnrCode.toUpperCase().replace('TEST_', '');
    
    switch (testCode) {
      case 'FAIL':
        return {
          success: false,
          message: 'Bu bir test hata mesajıdır. PNR bulunamadı.'
        };
      
      case 'PENDING':
        return {
          success: true,
          message: this.formatBookingInfo({
            id: 9999,
            userId: 1,
            bookingReference: 'TEST_PENDING',
            pnrNumber: 'TEST_PENDING',
            departureDate: new Date().toISOString(),
            returnDate: null,
            totalPrice: '350',
            currency: 'TRY',
            status: 'pending',
            isPaid: false,
            passengerCount: 2,
            routeId: 1,
            scheduleId: 1
          }),
          booking: {
            status: 'pending',
            isPaid: false
          }
        };
      
      case 'PAID':
        return {
          success: true,
          message: this.formatBookingInfo({
            id: 9998,
            userId: 1,
            bookingReference: 'TEST_PAID',
            pnrNumber: 'TEST_PAID',
            departureDate: new Date().toISOString(),
            returnDate: null,
            totalPrice: '350',
            currency: 'TRY',
            status: 'confirmed',
            isPaid: true,
            passengerCount: 2,
            routeId: 1,
            scheduleId: 1
          }),
          booking: {
            status: 'confirmed',
            isPaid: true
          }
        };
      
      case 'ROUND':
        // Bugünden 10 gün sonrası için gidiş-dönüş
        const today = new Date();
        const departureDate = new Date(today);
        departureDate.setDate(today.getDate() + 10);
        
        const returnDate = new Date(departureDate);
        returnDate.setDate(departureDate.getDate() + 7);
        
        return {
          success: true,
          message: this.formatBookingInfo({
            id: 9997,
            userId: 1,
            bookingReference: 'TEST_ROUND',
            pnrNumber: 'TEST_ROUND',
            departureDate: departureDate.toISOString(),
            returnDate: returnDate.toISOString(),
            totalPrice: '700',
            currency: 'TRY',
            status: 'confirmed',
            isPaid: true,
            passengerCount: 2,
            routeId: 1,
            scheduleId: 1
          }),
          booking: {
            status: 'confirmed',
            isPaid: true
          }
        };
      
      case 'CANCEL':
        return {
          success: true,
          message: this.formatBookingInfo({
            id: 9996,
            userId: 1,
            bookingReference: 'TEST_CANCEL',
            pnrNumber: 'TEST_CANCEL',
            departureDate: new Date().toISOString(),
            returnDate: null,
            totalPrice: '350',
            currency: 'TRY',
            status: 'cancelled',
            isPaid: true,
            passengerCount: 2,
            routeId: 1,
            scheduleId: 1
          }),
          booking: {
            status: 'cancelled',
            isPaid: true
          }
        };
      
      default:
        return {
          success: true,
          message: this.formatBookingInfo({
            id: 9995,
            userId: 1,
            bookingReference: pnrCode,
            pnrNumber: pnrCode,
            departureDate: new Date().toISOString(),
            returnDate: null,
            totalPrice: '350',
            currency: 'TRY',
            status: 'confirmed',
            isPaid: true,
            passengerCount: 2,
            routeId: 1,
            scheduleId: 1
          }),
          booking: {
            status: 'confirmed',
            isPaid: true
          }
        };
    }
  }
  
  /**
   * Demo PNR yanıtı
   */
  private generateDemoPNRResponse(pnrCode: string): {success: boolean, message: string, booking?: any} {
    // Gerçek PNR koduna göre demo yanıtı oluştur
    // Son karaktere göre farklı durumlar
    const lastChar = pnrCode.charAt(pnrCode.length - 1);
    const lastDigit = parseInt(lastChar);
    
    // Son karakter sayı değilse veya 0-3 arasındaysa ödenmemiş
    const isPaid = isNaN(lastDigit) || lastDigit < 4 ? false : true;
    
    // Son karakter P ise beklemede
    const status = lastChar.toUpperCase() === 'P' ? 'pending' : 
                  lastChar.toUpperCase() === 'C' ? 'cancelled' : 'confirmed';
    
    // Demo rezervasyon objesi
    const demoBooking = {
      id: 9995,
      userId: 1,
      bookingReference: pnrCode,
      pnrNumber: pnrCode,
      departureDate: new Date().toISOString(),
      returnDate: null,
      totalPrice: '350',
      currency: 'TRY',
      status,
      isPaid,
      passengerCount: 2,
      routeId: 1,
      scheduleId: 1
    };
    
    return {
      success: true,
      message: this.formatBookingInfo(demoBooking),
      booking: demoBooking
    };
  }
}

// Singleton instance
const pnrQueryService = new PNRQueryService();

export default pnrQueryService;