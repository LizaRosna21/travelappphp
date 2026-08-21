import { IStorage } from "../storage";
import { v4 as uuidv4 } from 'uuid';

/**
 * Demo ve member kullanıcıları için örnek veri oluşturan servis
 * Bu servis, demo ve üye kullanıcıları için rezervasyon, değerlendirme, destek talebi, 
 * bildirim ve sosyal paylaşım verileri oluşturur.
 */
export default class SampleMemberDataService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Demo ve member kullanıcıları için örnek veri oluşturur
   */
  async populateDemoData() {
    await this.createSampleBookingsForUsers();
    await this.createSampleReviewsForUsers();
    await this.createSampleSupportRequestsForUsers();
    await this.createSampleNotificationsForUsers();
    await this.createSampleSocialSharesForUsers();
    
    console.log("Demo ve member hesapları için örnek veriler başarıyla oluşturuldu");
  }

  /**
   * Demo ve member kullanıcıları için örnek rezervasyonlar oluşturur
   */
  private async createSampleBookingsForUsers() {
    // Demo ve member kullanıcılarını bul
    const demoUser = await this.storage.getUserByUsername("demo");
    const memberUser = await this.storage.getUserByUsername("member");

    if (!demoUser || !memberUser) {
      console.error("Demo veya member kullanıcısı bulunamadı");
      return;
    }

    // Tüm rotaları al
    const routes = await this.storage.getAllRoutes();
    const schedules = await this.storage.getAllSchedules();
    
    if (routes.length === 0 || schedules.length === 0) {
      console.error("Rota veya sefer bulunmadı");
      return;
    }

    // Demo kullanıcısı için rezervasyonlar oluştur
    await this.createUserBookings(demoUser.id, routes, schedules, 5);
    
    // Member kullanıcısı için rezervasyonlar oluştur
    await this.createUserBookings(memberUser.id, routes, schedules, 5);
  }

  /**
   * Belirli bir kullanıcı için örnek rezervasyonlar oluşturur
   */
  private async createUserBookings(userId: number, routes: any[], schedules: any[], count: number) {
    const statuses = ["confirmed", "pending", "cancelled", "completed"];
    const paymentMethods = ["credit_card", "bank_transfer", "paypal", "pending"];
    
    for (let i = 0; i < count; i++) {
      const route = routes[Math.floor(Math.random() * routes.length)];
      const schedule = schedules[Math.floor(Math.random() * schedules.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const isPaid = status === "confirmed" || status === "completed";
      
      // Rastgele tarihler oluştur (gelecek veya geçmiş)
      const today = new Date();
      let daysOffset = Math.floor(Math.random() * 60) - 20; // -20 ile +40 gün arası
      const departureDate = new Date(today);
      departureDate.setDate(today.getDate() + daysOffset);
      
      // Rezervasyon oluştur
      const bookingData = {
        userId,
        routeId: route.id,
        scheduleId: schedule.id,
        departureDate: departureDate.toISOString().split('T')[0],
        returnDate: Math.random() > 0.7 ? new Date(departureDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
        totalPrice: (Math.floor(Math.random() * 1000) + 500).toString(),
        currency: "TRY",
        status,
        isPaid,
        bookingReference: `FB${Math.floor(Math.random() * 10000)}`,
        pnrNumber: `PNR${Math.floor(Math.random() * 100000)}`,
        passengerCount: Math.floor(Math.random() * 4) + 1,
        vehicleCount: Math.random() > 0.5 ? 1 : 0,
        contactEmail: `user${Math.floor(Math.random() * 1000)}@example.com`,
        contactPhone: `+9055${Math.floor(Math.random() * 10000000)}`,
        specialRequests: Math.random() > 0.7 ? "Özel istek örneği" : null,
        paymentMethod,
        guestName: `Misafir ${Math.floor(Math.random() * 100)}`
      };
      
      await this.storage.createBooking(bookingData);
    }
  }

  /**
   * Demo ve member kullanıcıları için örnek değerlendirmeler oluşturur
   */
  private async createSampleReviewsForUsers() {
    // Demo ve member kullanıcılarını bul
    const demoUser = await this.storage.getUserByUsername("demo");
    const memberUser = await this.storage.getUserByUsername("member");

    if (!demoUser || !memberUser) {
      console.error("Demo veya member kullanıcısı bulunamadı");
      return;
    }

    // Tüm rotaları al
    const routes = await this.storage.getAllRoutes();
    
    if (routes.length === 0) {
      console.error("Rota bulunmadı");
      return;
    }

    // Demo kullanıcısı için değerlendirmeler oluştur
    await this.createUserReviews(demoUser.id, routes, 3);
    
    // Member kullanıcısı için değerlendirmeler oluştur
    await this.createUserReviews(memberUser.id, routes, 4);
  }

  /**
   * Belirli bir kullanıcı için örnek değerlendirmeler oluşturur
   * Veritabanı şemasına uygun şekilde güncellenmiştir
   */
  private async createUserReviews(userId: number, routes: any[], count: number) {
    const reviewContents = [
      "Harika bir yolculuktu, kesinlikle tekrar tercih edeceğim!",
      "Personel çok yardımsever ve nazikti. Feribot temiz ve konforluydu.",
      "Seyahat sırasında sunulan hizmetler beklentilerimi aştı.",
      "Feribot zamanında kalktı ve vardı, hiçbir gecikme yaşanmadı.",
      "Bilet fiyatları makul ve hizmet kalitesi iyi.",
      "Yolculuk sırasında bazı aksaklıklar olsa da genel olarak memnun kaldım.",
      "Feribot biraz eskiydi ama personel çok ilgiliydi.",
      "Fiyat-performans açısından gayet iyi bir tercih."
    ];
    
    const reviewTitles = [
      "Harika deneyim",
      "Mükemmel hizmet",
      "İyi bir yolculuk",
      "Tavsiye ediyorum",
      "Güzel seyahat",
      "Başarılı organizasyon"
    ];
    
    for (let i = 0; i < count; i++) {
      const route = routes[Math.floor(Math.random() * routes.length)];
      const content = reviewContents[Math.floor(Math.random() * reviewContents.length)];
      const title = reviewTitles[Math.floor(Math.random() * reviewTitles.length)];
      const rating = Math.floor(Math.random() * 3) + 3; // 3-5 arası puan
      
      // Değerlendirme oluştur - veritabanı şemasına uygun olarak
      const reviewData = {
        userId,
        routeId: route.id,
        rating,
        content,
        title,
        isVerified: true,
        isPublished: true,
        helpfulnessScore: Math.floor(Math.random() * 5),
        reportedCount: 0,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        metadata: {}
      };
      
      try {
        const review = await this.storage.createReview(reviewData);
        
        // Bazı değerlendirmelere yanıt ekle
        if (Math.random() > 0.5 && review && review.id) {
          // Admin kullanıcısını bul (ID=16 olarak admin)
          const adminId = 16; 
          
          await this.storage.createReviewReply({
            reviewId: review.id,
            userId: adminId,
            content: "Değerlendirmeniz için teşekkür ederiz. Yolculuğunuzdan memnun kaldığınıza sevindik.",
            isStaffReply: true,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Yorum oluşturma hatası:', error);
      }
    }
  }

  /**
   * Demo ve member kullanıcıları için örnek destek talepleri oluşturur
   */
  private async createSampleSupportRequestsForUsers() {
    // Demo ve member kullanıcılarını bul
    const demoUser = await this.storage.getUserByUsername("demo");
    const memberUser = await this.storage.getUserByUsername("member");

    if (!demoUser || !memberUser) {
      console.error("Demo veya member kullanıcısı bulunamadı");
      return;
    }

    // Demo kullanıcısı için destek talepleri
    await this.createUserSupportRequests(demoUser.id, 2);
    
    // Member kullanıcısı için destek talepleri
    await this.createUserSupportRequests(memberUser.id, 3);
  }

  /**
   * Belirli bir kullanıcı için örnek destek talepleri oluşturur
   */
  private async createUserSupportRequests(userId: number, count: number) {
    const supportSubjects = [
      "Rezervasyon değişikliği",
      "İptal ve iade talebi",
      "Bilet bilgileri hakkında soru",
      "Ödeme sorunu",
      "Bagaj kuralları hakkında bilgi",
      "Özel ihtiyaçlar hakkında yardım"
    ];
    
    const statuses = ["open", "in_progress", "resolved", "closed"];
    
    for (let i = 0; i < count; i++) {
      const subject = supportSubjects[Math.floor(Math.random() * supportSubjects.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      
      // Destek talebi oluştur
      if (!this.storage.supportRequests) {
        this.storage.supportRequests = new Map();
      }
      
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const supportRequest = {
        id,
        userId,
        subject,
        status,
        priority: Math.random() > 0.7 ? "high" : "normal",
        createdAt,
        updatedAt: new Date(),
        closedAt: status === "closed" || status === "resolved" ? new Date() : null
      };
      
      this.storage.supportRequests.set(id, supportRequest);
      
      // Destek talebi için mesajlar oluştur
      if (!this.storage.supportMessages) {
        this.storage.supportMessages = new Map();
      }
      
      // Kullanıcı mesajı
      const messageId1 = Date.now() + Math.floor(Math.random() * 1000) + 1;
      const userMessage = {
        id: messageId1,
        supportRequestId: id,
        userId,
        isStaff: false,
        message: `Merhaba, ${subject.toLowerCase()} konusunda yardıma ihtiyacım var. Daha detaylı bilgi alabilir miyim?`,
        createdAt: new Date(createdAt.getTime() + 5 * 60 * 1000),
        attachments: null
      };
      
      this.storage.supportMessages.set(messageId1, userMessage);
      
      // Personel yanıtı
      if (status !== "open") {
        const messageId2 = Date.now() + Math.floor(Math.random() * 1000) + 2;
        const staffMessage = {
          id: messageId2,
          supportRequestId: id,
          userId: 1, // Admin kullanıcısı
          isStaff: true,
          message: "Merhaba, talebinizi aldık. Size en kısa sürede yardımcı olacağız. Detayları paylaşabilir misiniz?",
          createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
          attachments: null
        };
        
        this.storage.supportMessages.set(messageId2, staffMessage);
        
        // İkinci kullanıcı mesajı
        const messageId3 = Date.now() + Math.floor(Math.random() * 1000) + 3;
        const userFollowUpMessage = {
          id: messageId3,
          supportRequestId: id,
          userId,
          isStaff: false,
          message: "Teşekkür ederim. Rezervasyon numaram FB12345, yardımınızı bekliyorum.",
          createdAt: new Date(createdAt.getTime() + 3 * 60 * 60 * 1000),
          attachments: null
        };
        
        this.storage.supportMessages.set(messageId3, userFollowUpMessage);
      }
      
      if (status === "resolved" || status === "closed") {
        const messageId4 = Date.now() + Math.floor(Math.random() * 1000) + 4;
        const resolutionMessage = {
          id: messageId4,
          supportRequestId: id,
          userId: 1, // Admin kullanıcısı
          isStaff: true,
          message: "Talebiniz çözüme kavuşturulmuştur. Başka bir sorunuz olursa yeniden yazabilirsiniz. İyi günler dileriz.",
          createdAt: new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000),
          attachments: null
        };
        
        this.storage.supportMessages.set(messageId4, resolutionMessage);
      }
    }
  }

  /**
   * Demo ve member kullanıcıları için örnek bildirimler oluşturur
   */
  private async createSampleNotificationsForUsers() {
    // Demo ve member kullanıcılarını bul
    const demoUser = await this.storage.getUserByUsername("demo");
    const memberUser = await this.storage.getUserByUsername("member");

    if (!demoUser || !memberUser) {
      console.error("Demo veya member kullanıcısı bulunamadı");
      return;
    }

    // Demo kullanıcısı için bildirimler
    await this.createUserNotifications(demoUser.id, 8);
    
    // Member kullanıcısı için bildirimler
    await this.createUserNotifications(memberUser.id, 10);
  }

  /**
   * Belirli bir kullanıcı için örnek bildirimler oluşturur
   */
  private async createUserNotifications(userId: number, count: number) {
    const notificationTypes = [
      "booking_confirmation",
      "booking_reminder",
      "payment_received",
      "booking_changed",
      "price_alert",
      "review_approved",
      "support_reply",
      "promo_offer"
    ];
    
    const notificationTitles = {
      booking_confirmation: "Rezervasyon Onaylandı",
      booking_reminder: "Yaklaşan Seyahat Hatırlatması",
      payment_received: "Ödemeniz Alındı",
      booking_changed: "Rezervasyon Bilgileriniz Güncellendi",
      price_alert: "Fiyat Uyarısı",
      review_approved: "Değerlendirmeniz Yayınlandı",
      support_reply: "Destek Talebinize Yanıt Verildi",
      promo_offer: "Size Özel Kampanya"
    };
    
    const notificationContents = {
      booking_confirmation: "Rezervasyonunuz başarıyla onaylanmıştır. Seyahat detaylarınızı kontrol edebilirsiniz.",
      booking_reminder: "Seyahatinize 3 gün kaldı. Feribot saatini kontrol etmeyi unutmayın.",
      payment_received: "Ödemeniz başarıyla alınmıştır. Biletiniz için teşekkür ederiz.",
      booking_changed: "Rezervasyon bilgilerinizde güncelleme yapılmıştır. Detayları kontrol edin.",
      price_alert: "Takip ettiğiniz rota için indirimli fiyat mevcut!",
      review_approved: "Paylaştığınız değerlendirme onaylanmış ve yayınlanmıştır.",
      support_reply: "Destek talebinize yanıt verilmiştir. Mesajı görüntüleyebilirsiniz.",
      promo_offer: "Size özel indirim kuponu oluşturuldu. Bir sonraki alışverişinizde kullanabilirsiniz."
    };
    
    if (!this.storage.notifications) {
      this.storage.notifications = new Map();
    }
    
    for (let i = 0; i < count; i++) {
      const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const isRead = Math.random() > 0.4; // %60 okunmuş, %40 okunmamış
      
      const id = Date.now() + Math.floor(Math.random() * 1000) + i;
      const notification = {
        id,
        userId,
        type,
        title: notificationTitles[type as keyof typeof notificationTitles],
        content: notificationContents[type as keyof typeof notificationContents],
        isRead,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        readAt: isRead ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000) : null,
        link: type === "booking_confirmation" ? "/bookings" : type === "support_reply" ? "/support" : "/"
      };
      
      this.storage.notifications.set(id, notification);
    }
  }

  /**
   * Demo ve member kullanıcıları için örnek sosyal paylaşımlar oluşturur
   */
  private async createSampleSocialSharesForUsers() {
    // Demo ve member kullanıcılarını bul
    const demoUser = await this.storage.getUserByUsername("demo");
    const memberUser = await this.storage.getUserByUsername("member");

    if (!demoUser || !memberUser) {
      console.error("Demo veya member kullanıcısı bulunamadı");
      return;
    }

    // Demo kullanıcısı için sosyal paylaşımlar
    await this.createUserSocialShares(demoUser.id, 3);
    
    // Member kullanıcısı için sosyal paylaşımlar
    await this.createUserSocialShares(memberUser.id, 4);
  }

  /**
   * Belirli bir kullanıcı için örnek sosyal paylaşımlar oluşturur
   */
  private async createUserSocialShares(userId: number, count: number) {
    const platforms = ["facebook", "twitter", "instagram", "whatsapp"];
    const contentTypes = ["booking", "review", "route"];
    
    // Kullanıcının rezervasyonlarını ve değerlendirmelerini al
    const bookings = await this.storage.getBookingsByUser(userId);
    const reviews = await this.storage.getReviewsByUserId(userId);
    
    if (!this.storage.socialShares) {
      this.storage.socialShares = new Map();
    }
    
    for (let i = 0; i < count; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      
      let bookingId = null;
      let reviewId = null;
      
      if (contentType === "booking" && bookings.length > 0) {
        bookingId = bookings[Math.floor(Math.random() * bookings.length)].id;
      } else if (contentType === "review" && reviews.length > 0) {
        reviewId = reviews[Math.floor(Math.random() * reviews.length)].id;
      }
      
      const id = Date.now() + Math.floor(Math.random() * 1000) + i;
      const share = {
        id,
        userId,
        platform,
        contentType,
        bookingId,
        reviewId,
        shareUrl: `https://example.com/share/${uuidv4().substring(0, 8)}`,
        status: "completed",
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({
          sharedText: "Yolculuğuma göz atın!",
          engagement: {
            likes: Math.floor(Math.random() * 50),
            shares: Math.floor(Math.random() * 10),
            comments: Math.floor(Math.random() * 15)
          }
        })
      };
      
      this.storage.socialShares.set(id, share);
    }
  }
}