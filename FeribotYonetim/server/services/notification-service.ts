import { IStorage } from '../storage';
import { InsertNotification, Notification } from '@shared/schema';

/**
 * Bildirim Servisi
 * 
 * Bildirim oluşturma, gönderme ve yönetme için kullanılan servis
 */
export class NotificationService {
  private storage: IStorage;
  private sendNotificationViaWebSocketFn: (notification: Notification) => void;

  constructor(
    storage: IStorage,
    sendNotificationViaWebSocketFn: (notification: Notification) => void
  ) {
    this.storage = storage;
    this.sendNotificationViaWebSocketFn = sendNotificationViaWebSocketFn;
  }

  /**
   * Bildirim oluşturur ve WebSocket üzerinden gönderir
   */
  async createAndSendNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      // Bildirimi veritabanına kaydet
      const notification = await this.storage.createNotification(notificationData);
      
      // Bildirimi WebSocket üzerinden ilgili kullanıcıya gönder
      if (notification) {
        this.sendNotificationViaWebSocketFn(notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Bildirim oluşturma ve gönderme hatası:', error);
      throw error;
    }
  }

  /**
   * Rezervasyon durum değişikliği bildirimi oluşturur
   */
  async createBookingNotification(
    userId: number,
    bookingId: number,
    bookingReference: string,
    status: string,
    title: string,
    message: string
  ): Promise<Notification> {
    const notificationData: InsertNotification = {
      userId,
      title,
      message,
      type: 'booking',
      isRead: false,
      relatedId: bookingId,
      relatedType: 'booking',
      actionUrl: `/my-bookings/${bookingId}`,
      metadata: {
        bookingReference,
        status
      }
    };

    return this.createAndSendNotification(notificationData);
  }

  /**
   * Rezervasyon oluşturma bildirimi
   */
  async notifyBookingCreated(
    userId: number,
    bookingId: number,
    bookingReference: string
  ): Promise<Notification> {
    return this.createBookingNotification(
      userId,
      bookingId,
      bookingReference,
      'pending',
      'Rezervasyon Oluşturuldu',
      `${bookingReference} referans numaralı rezervasyonunuz başarıyla oluşturuldu.`
    );
  }

  /**
   * Rezervasyon onay bildirimi
   */
  async notifyBookingConfirmed(
    userId: number,
    bookingId: number,
    bookingReference: string
  ): Promise<Notification> {
    return this.createBookingNotification(
      userId,
      bookingId,
      bookingReference,
      'confirmed',
      'Rezervasyon Onaylandı',
      `${bookingReference} referans numaralı rezervasyonunuz onaylandı.`
    );
  }

  /**
   * Rezervasyon iptal bildirimi
   */
  async notifyBookingCancelled(
    userId: number,
    bookingId: number,
    bookingReference: string,
    reason?: string
  ): Promise<Notification> {
    const message = reason
      ? `${bookingReference} referans numaralı rezervasyonunuz iptal edildi. Sebep: ${reason}`
      : `${bookingReference} referans numaralı rezervasyonunuz iptal edildi.`;
    
    return this.createBookingNotification(
      userId,
      bookingId,
      bookingReference,
      'cancelled',
      'Rezervasyon İptal Edildi',
      message
    );
  }

  /**
   * Ödeme tamamlandı bildirimi
   */
  async notifyPaymentCompleted(
    userId: number,
    bookingId: number,
    bookingReference: string,
    amount: string,
    currency: string
  ): Promise<Notification> {
    const notificationData: InsertNotification = {
      userId,
      title: 'Ödeme Tamamlandı',
      message: `${bookingReference} referans numaralı rezervasyonunuz için ${amount} ${currency} tutarındaki ödeme başarıyla tamamlandı.`,
      type: 'payment',
      isRead: false,
      relatedId: bookingId,
      relatedType: 'booking',
      actionUrl: `/my-bookings/${bookingId}`,
      metadata: {
        bookingReference,
        status: 'confirmed',
        amount,
        currency
      }
    };

    return this.createAndSendNotification(notificationData);
  }

  /**
   * İade bildirimi
   */
  async notifyRefundProcessed(
    userId: number,
    bookingId: number,
    bookingReference: string,
    amount: string,
    currency: string
  ): Promise<Notification> {
    const notificationData: InsertNotification = {
      userId,
      title: 'İade İşlemi Tamamlandı',
      message: `${bookingReference} referans numaralı rezervasyonunuz için ${amount} ${currency} tutarındaki iade işlemi tamamlandı.`,
      type: 'payment',
      isRead: false,
      relatedId: bookingId,
      relatedType: 'booking',
      actionUrl: `/my-bookings/${bookingId}`,
      metadata: {
        bookingReference,
        status: 'refunded',
        amount,
        currency
      }
    };

    return this.createAndSendNotification(notificationData);
  }

  /**
   * Seyahat bildirimi (check-in zamanı yaklaşıyor)
   */
  async notifyUpcomingTravel(
    userId: number,
    bookingId: number,
    bookingReference: string,
    departureDate: string,
    departurePort: string,
    checkInTime: string
  ): Promise<Notification> {
    const notificationData: InsertNotification = {
      userId,
      title: 'Yaklaşan Seyahatiniz',
      message: `${bookingReference} referans numaralı rezervasyonunuz için ${departureDate} tarihindeki seyahatiniz yaklaşıyor. Check-in saati: ${checkInTime} (${departurePort})`,
      type: 'travel',
      isRead: false,
      relatedId: bookingId,
      relatedType: 'booking',
      actionUrl: `/my-bookings/${bookingId}`,
      metadata: {
        bookingReference,
        status: 'confirmed',
        departureDate,
        departurePort,
        checkInTime
      }
    };

    return this.createAndSendNotification(notificationData);
  }

  /**
   * Genel sistem bildirimi
   */
  async sendSystemNotification(
    userId: number,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<Notification> {
    const notificationData: InsertNotification = {
      userId,
      title,
      message,
      type: 'system',
      isRead: false,
      actionUrl: actionUrl || null,
      metadata: {}
    };

    return this.createAndSendNotification(notificationData);
  }
}

// Service export edilecek
let notificationService: NotificationService | null = null;

// Notification service getter
export const getNotificationService = (
  storage: IStorage,
  sendNotificationViaWebSocketFn: (notification: Notification) => void
): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService(storage, sendNotificationViaWebSocketFn);
  }
  return notificationService;
};