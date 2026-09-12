// Sample Activity - Örnek etkinlik verileri oluşturan script
// Bu script, Demo ve Member kullanıcıları için örnek etkinlik verileri oluşturur:
// - Biletleme geçmişi
// - Ödeme geçmişi
// - Talep yönetimi ve geçmişi
// - Yorumlar, yorum oylamaları ve sosyal medya paylaşımları

import { db } from './db';
import { 
  users, 
  bookings, 
  routes, 
  schedules, 
  payments, 
  bookingPassengers,
  supportRequests,
  supportMessages,
  notifications,
  reviews,
  reviewVotes,
  socialShares
} from '../shared/schema-updates';
import { sql } from 'drizzle-orm';
import { hashPassword } from './auth';

// Demo ve Member kullanıcıları için örnek veri oluşturma
async function createSampleActivity() {
  try {
    console.log("Demo ve Member kullanıcıları için örnek veri oluşturuluyor...");
    
    // Kullanıcı ID'lerini al
    let demoUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "demo")
    });

    let memberUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "member")
    });

    if (!demoUser || !memberUser) {
      console.error("Demo veya Member kullanıcısı bulunamadı. Önce kullanıcıları oluşturun.");
      return;
    }

    console.log(`Demo user ID: ${demoUser.id}, Member user ID: ${memberUser.id}`);

    // RotaID'lerini al 
    const allRoutes = await db.query.routes.findMany({
      limit: 5
    });

    if (allRoutes.length === 0) {
      console.error("Hiç rota bulunamadı. Önce rota verilerini oluşturun.");
      return;
    }

    // Tarifeler (Schedule) al
    const allSchedules = await db.query.schedules.findMany({
      limit: 5
    });

    if (allSchedules.length === 0) {
      console.error("Hiç tarife bulunamadı. Önce tarife verilerini oluşturun.");
      return;
    }

    // 1. DEMO KULLANICI İÇİN ÖRNEK BİLETLEME VE REZERVASYON GEÇMİŞİ
    console.log("Demo kullanıcısı için örnek rezervasyon oluşturuluyor...");
    
    // Demo için 3 rezervasyon oluştur (1 tamamlanmış, 1 bekleyen, 1 iptal edilmiş)
    const demoBooking1 = await db.insert(bookings).values({
      userId: demoUser.id,
      routeId: allRoutes[0].id,
      scheduleId: allSchedules[0].id,
      departureDate: "2025-05-15",
      returnDate: null,
      totalPrice: "750.00",
      currency: "TRY",
      status: "completed",
      isPaid: true,
      bookingReference: "DEMO" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: "credit_card",
      passengerCount: 2,
      specialRequests: "Pencere kenarı tercih edilir",
      contactPhone: "+905551234567",
      contactEmail: "demo@ferryticket.com",
      metadata: { promo_applied: false, source: "web" },
      createdAt: new Date("2025-04-05T10:30:00"),
      notes: null,
      vehicleCount: 0,
      isRoundTrip: false,
      agencyId: null,
      guestName: null
    }).returning();
    
    const demoBooking2 = await db.insert(bookings).values({
      userId: demoUser.id,
      routeId: allRoutes[1].id,
      scheduleId: allSchedules[1].id,
      departureDate: "2025-06-20",
      returnDate: "2025-06-30",
      totalPrice: "1250.00",
      currency: "TRY",
      status: "pending",
      isPaid: false,
      bookingReference: "DEMO" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: null,
      passengerCount: 1,
      specialRequests: null,
      contactPhone: "+905551234567",
      contactEmail: "demo@ferryticket.com",
      metadata: { promo_applied: false, source: "mobile" },
      createdAt: new Date("2025-04-07T15:45:00"),
      notes: null,
      vehicleCount: 1,
      isRoundTrip: true,
      agencyId: null,
      guestName: null
    }).returning();
    
    const demoBooking3 = await db.insert(bookings).values({
      userId: demoUser.id,
      routeId: allRoutes[2].id,
      scheduleId: allSchedules[2].id,
      departureDate: "2025-05-01",
      returnDate: null,
      totalPrice: "600.00",
      currency: "TRY",
      status: "cancelled",
      isPaid: false,
      bookingReference: "DEMO" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: null,
      passengerCount: 2,
      specialRequests: "Tekerlekli sandalye erişimi gerekli",
      contactPhone: "+905551234567",
      contactEmail: "demo@ferryticket.com",
      metadata: { promo_applied: true, source: "web", promo_code: "BAHAR2025" },
      createdAt: new Date("2025-03-25T09:15:00"),
      notes: "Müşteri tarafından iptal edildi",
      vehicleCount: 0,
      isRoundTrip: false,
      agencyId: null, 
      guestName: null
    }).returning();
    
    // Demo için tamamlanan rezervasyon için yolcu bilgileri ekle
    if (demoBooking1 && demoBooking1[0]) {
      await db.insert(bookingPassengers).values([
        {
          bookingId: demoBooking1[0].id,
          passengerType: "adult",
          fullName: "Demo Kullanıcı",
          identityNumber: "T12345678",
          dateOfBirth: "1985-05-10",
          gender: "male",
          nationality: "Turkish",
          price: "400.00"
        },
        {
          bookingId: demoBooking1[0].id,
          passengerType: "child",
          fullName: "Demo Çocuk",
          identityNumber: "T98765432",
          dateOfBirth: "2015-07-15",
          gender: "female",
          nationality: "Turkish",
          price: "350.00"
        }
      ]);
    }
    
    // Demo için tamamlanan rezervasyon için ödeme bilgisi ekle
    if (demoBooking1 && demoBooking1[0]) {
      await db.insert(payments).values({
        bookingId: demoBooking1[0].id,
        amount: "750.00",
        currency: "TRY",
        status: "completed",
        paymentMethod: "credit_card",
        transactionId: "TR" + Math.floor(10000000 + Math.random() * 90000000),
        paymentDate: new Date("2025-04-05T10:35:00"),
        cardLast4: "4242",
        metadata: { 
          card_brand: "Visa", 
          payment_provider: "stripe",
          customer_ip: "192.168.1.1"
        }
      });
    }

    // 2. MEMBER KULLANICI İÇİN ÖRNEK BİLETLEME VE REZERVASYON GEÇMİŞİ
    console.log("Member kullanıcısı için örnek rezervasyon oluşturuluyor...");
    
    // Member için 4 rezervasyon oluştur (2 tamamlanmış, 1 bekleyen, 1 iptal edilmiş)
    const memberBooking1 = await db.insert(bookings).values({
      userId: memberUser.id,
      routeId: allRoutes[0].id,
      scheduleId: allSchedules[0].id,
      departureDate: "2025-04-20",
      returnDate: null,
      totalPrice: "450.00",
      currency: "TRY",
      status: "completed",
      isPaid: true,
      bookingReference: "MEM" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: "credit_card",
      passengerCount: 1,
      specialRequests: null,
      contactPhone: "+905559876543",
      contactEmail: "member@ferryticket.com",
      metadata: { promo_applied: false, source: "web" },
      createdAt: new Date("2025-03-05T11:20:00"),
      notes: null,
      vehicleCount: 0,
      isRoundTrip: false,
      agencyId: null,
      guestName: null
    }).returning();
    
    const memberBooking2 = await db.insert(bookings).values({
      userId: memberUser.id,
      routeId: allRoutes[1].id,
      scheduleId: allSchedules[1].id,
      departureDate: "2025-05-15",
      returnDate: "2025-05-22",
      totalPrice: "1600.00",
      currency: "TRY",
      status: "completed",
      isPaid: true,
      bookingReference: "MEM" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: "bank_transfer",
      passengerCount: 2,
      specialRequests: "Özel yemek: Vejetaryen",
      contactPhone: "+905559876543",
      contactEmail: "member@ferryticket.com",
      metadata: { promo_applied: true, source: "web", promo_code: "YENI2025" },
      createdAt: new Date("2025-03-10T14:30:00"),
      notes: null,
      vehicleCount: 1,
      isRoundTrip: true,
      agencyId: null,
      guestName: null
    }).returning();
    
    const memberBooking3 = await db.insert(bookings).values({
      userId: memberUser.id,
      routeId: allRoutes[2].id,
      scheduleId: allSchedules[2].id,
      departureDate: "2025-07-10",
      returnDate: null,
      totalPrice: "850.00",
      currency: "TRY",
      status: "pending",
      isPaid: false,
      bookingReference: "MEM" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: null,
      passengerCount: 1,
      specialRequests: null,
      contactPhone: "+905559876543",
      contactEmail: "member@ferryticket.com",
      metadata: { promo_applied: false, source: "mobile" },
      createdAt: new Date("2025-04-01T09:45:00"),
      notes: null,
      vehicleCount: 0,
      isRoundTrip: false,
      agencyId: null,
      guestName: null
    }).returning();
    
    const memberBooking4 = await db.insert(bookings).values({
      userId: memberUser.id,
      routeId: allRoutes[3].id,
      scheduleId: allSchedules[3].id,
      departureDate: "2025-06-05",
      returnDate: null,
      totalPrice: "550.00",
      currency: "TRY",
      status: "cancelled",
      isPaid: true,
      bookingReference: "MEM" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: "credit_card",
      passengerCount: 1,
      specialRequests: null,
      contactPhone: "+905559876543",
      contactEmail: "member@ferryticket.com",
      metadata: { promo_applied: false, source: "web" },
      createdAt: new Date("2025-03-15T16:20:00"),
      notes: "Müşteri iptali - para iadesi yapıldı",
      vehicleCount: 0,
      isRoundTrip: false,
      agencyId: null,
      guestName: null
    }).returning();
    
    // Member için tamamlanan rezervasyonlar için yolcu bilgileri ekle
    if (memberBooking1 && memberBooking1[0]) {
      await db.insert(bookingPassengers).values({
        bookingId: memberBooking1[0].id,
        passengerType: "adult",
        fullName: "Üye Kullanıcı",
        identityNumber: "T76543210",
        dateOfBirth: "1990-10-20",
        gender: "male",
        nationality: "Turkish",
        price: "450.00"
      });
    }
    
    if (memberBooking2 && memberBooking2[0]) {
      await db.insert(bookingPassengers).values([
        {
          bookingId: memberBooking2[0].id,
          passengerType: "adult",
          fullName: "Üye Kullanıcı",
          identityNumber: "T76543210",
          dateOfBirth: "1990-10-20",
          gender: "male",
          nationality: "Turkish",
          price: "600.00"
        },
        {
          bookingId: memberBooking2[0].id,
          passengerType: "adult",
          fullName: "Elif Yılmaz",
          identityNumber: "T11223344",
          dateOfBirth: "1992-04-15",
          gender: "female",
          nationality: "Turkish",
          price: "600.00"
        }
      ]);
    }
    
    // Member için ödemeler ekle
    if (memberBooking1 && memberBooking1[0]) {
      await db.insert(payments).values({
        bookingId: memberBooking1[0].id,
        amount: "450.00",
        currency: "TRY",
        status: "completed",
        paymentMethod: "credit_card",
        transactionId: "TR" + Math.floor(10000000 + Math.random() * 90000000),
        paymentDate: new Date("2025-03-05T11:25:00"),
        cardLast4: "1234",
        metadata: {
          card_brand: "Mastercard",
          payment_provider: "stripe",
          customer_ip: "192.168.2.2"
        }
      });
    }
    
    if (memberBooking2 && memberBooking2[0]) {
      await db.insert(payments).values({
        bookingId: memberBooking2[0].id,
        amount: "1600.00",
        currency: "TRY",
        status: "completed",
        paymentMethod: "bank_transfer",
        transactionId: "BT" + Math.floor(10000000 + Math.random() * 90000000),
        paymentDate: new Date("2025-03-10T16:45:00"),
        cardLast4: null,
        metadata: {
          bank_name: "Ziraat Bankası",
          account_ref: "ZR12345",
          payment_provider: "manual"
        }
      });
    }
    
    if (memberBooking4 && memberBooking4[0]) {
      await db.insert(payments).values([
        {
          bookingId: memberBooking4[0].id,
          amount: "550.00",
          currency: "TRY",
          status: "completed",
          paymentMethod: "credit_card",
          transactionId: "TR" + Math.floor(10000000 + Math.random() * 90000000),
          paymentDate: new Date("2025-03-15T16:25:00"),
          cardLast4: "9876",
          metadata: {
            card_brand: "Visa",
            payment_provider: "stripe",
            customer_ip: "192.168.2.2"
          }
        },
        {
          bookingId: memberBooking4[0].id,
          amount: "-550.00",
          currency: "TRY",
          status: "refunded",
          paymentMethod: "credit_card",
          transactionId: "RF" + Math.floor(10000000 + Math.random() * 90000000),
          paymentDate: new Date("2025-03-18T10:15:00"),
          cardLast4: "9876",
          metadata: {
            refund_reason: "customer_request",
            original_transaction_id: "TR12345678",
            payment_provider: "stripe",
            customer_ip: "192.168.2.2"
          }
        }
      ]);
    }

    // 3. DEMO VE MEMBER İÇİN DEĞERLENDİRME VE YORUMLAR OLUŞTUR
    console.log("Değerlendirme ve yorumlar oluşturuluyor...");
    
    // Demo kullanıcısı için değerlendirme
    if (demoBooking1 && demoBooking1[0]) {
      const demoReview = await db.insert(reviews).values({
        userId: demoUser.id,
        routeId: allRoutes[0].id,
        scheduleId: allSchedules[0].id,
        bookingId: demoBooking1[0].id,
        rating: 4,
        title: "Çok güzel bir seyahatti",
        content: "Feribot tam zamanında kalktı ve yolculuk boyunca personel çok yardımcıydı. Tek sorun yiyeceklerin biraz pahalı olmasıydı.",
        isPublic: true,
        status: "approved",
        isVerifiedPurchase: true,
        createdAt: new Date("2025-05-18T14:30:00"),
      }).returning();
      
      // Demo yorumuna beğeni ekle
      if (demoReview && demoReview[0]) {
        await db.insert(reviewVotes).values([
          {
            userId: memberUser.id, // Member kullanıcısı Demo'nun yorumunu beğenmiş
            reviewId: demoReview[0].id,
            voteType: "like"
          },
          {
            userId: 1, // Örnek başka bir kullanıcı (varsayılan admin)
            reviewId: demoReview[0].id,
            voteType: "like"
          }
        ]);
        
        // Demo yorumunun beğeni sayısını güncelle
        await db.update(reviews)
          .set({ likes: 2 })
          .where(sql`id = ${demoReview[0].id}`);
      }
    }
    
    // Member kullanıcısı için değerlendirmeler
    if (memberBooking1 && memberBooking1[0]) {
      const memberReview1 = await db.insert(reviews).values({
        userId: memberUser.id,
        routeId: allRoutes[0].id,
        scheduleId: allSchedules[0].id,
        bookingId: memberBooking1[0].id,
        rating: 5,
        title: "Mükemmel hizmet!",
        content: "Kesinlikle beklentilerimin üzerinde bir deneyimdi. Gemi çok temiz, personel nazik ve yardımseverdi. İstanbul-Bodrum arası yolculuğu keyifli geçti.",
        isPublic: true,
        status: "approved",
        isVerifiedPurchase: true,
        createdAt: new Date("2025-04-25T11:15:00"),
        images: ["https://example.com/ferry_images/review1.jpg", "https://example.com/ferry_images/review2.jpg"]
      }).returning();
      
      // Member yorumuna beğeniler ekle
      if (memberReview1 && memberReview1[0]) {
        await db.insert(reviewVotes).values([
          {
            userId: demoUser.id, // Demo kullanıcısı Member'ın yorumunu beğenmiş
            reviewId: memberReview1[0].id,
            voteType: "like"
          },
          {
            userId: 1, // Örnek başka bir kullanıcı (varsayılan admin)
            reviewId: memberReview1[0].id,
            voteType: "like"
          },
          {
            userId: 11, // Admin kullanıcısı
            reviewId: memberReview1[0].id,
            voteType: "like"
          }
        ]);
        
        // Member yorumunun beğeni sayısını güncelle
        await db.update(reviews)
          .set({ likes: 3 })
          .where(sql`id = ${memberReview1[0].id}`);
        
        // Member yorumunu sosyal medyada paylaşmış
        await db.insert(socialShares).values({
          userId: memberUser.id,
          reviewId: memberReview1[0].id,
          contentType: "review",
          platform: "facebook",
          status: "completed",
          shareUrl: "https://facebook.com/share/123456"
        });
        
        // Sosyal medya paylaşımı sayısını güncelle
        await db.update(reviews)
          .set({ socialShares: 1 })
          .where(sql`id = ${memberReview1[0].id}`);
      }
    }
    
    if (memberBooking2 && memberBooking2[0]) {
      const memberReview2 = await db.insert(reviews).values({
        userId: memberUser.id,
        routeId: allRoutes[1].id,
        scheduleId: allSchedules[1].id,
        bookingId: memberBooking2[0].id,
        rating: 3,
        title: "İyi ama geliştirilmesi gereken noktalar var",
        content: "Yolculuk genel olarak iyiydi ama bazı noktalarda iyileştirmeler yapılabilir. Oturma yerleri daha konforlu olabilir ve yemek çeşitliliği artırılabilir. Fiyat/performans açısından makul.",
        isPublic: true,
        status: "approved",
        isVerifiedPurchase: true,
        createdAt: new Date("2025-05-25T16:45:00")
      }).returning();
      
      // Member'ın ikinci yorumuna şirket yanıtı ekle
      if (memberReview2 && memberReview2[0]) {
        await db.update(reviews)
          .set({ 
            response: "Değerli yorumunuz için teşekkür ederiz. Konfor ve yemek hizmetlerimizi iyileştirmek için geri bildiriminizi dikkate alacağız. Bir sonraki seyahatinizde daha iyi bir deneyim sunmayı umuyoruz.",
          })
          .where(sql`id = ${memberReview2[0].id}`);
          
        // Şirketin yanıtladığı yorumu demo kullanıcısı beğenmemiş
        await db.insert(reviewVotes).values({
          userId: demoUser.id,
          reviewId: memberReview2[0].id,
          voteType: "dislike"
        });
        
        // Beğenmeme sayısını güncelle
        await db.update(reviews)
          .set({ dislikes: 1 })
          .where(sql`id = ${memberReview2[0].id}`);
      }
    }

    // 4. DEMO VE MEMBER İÇİN DESTEK TALEPLERİ OLUŞTUR
    console.log("Destek talepleri oluşturuluyor...");
    
    // Demo kullanıcısı için destek talebi
    if (demoBooking2 && demoBooking2[0]) {
      const demoSupport = await db.insert(supportRequests).values({
        userId: demoUser.id,
        bookingId: demoBooking2[0].id,
        title: "Rezervasyonumu değiştirmek istiyorum",
        description: "20 Haziran tarihli rezervasyonumu 25 Haziran'a almak istiyorum. Bu değişiklik mümkün mü ve ek ücret ne kadar olur?",
        category: "modification",
        priority: "normal",
        status: "in_progress",
        assignedTo: 11, // Admin kullanıcısı
        createdAt: new Date("2025-04-10T09:30:00")
      }).returning();
      
      // Demo destek talebine mesajlar ekle
      if (demoSupport && demoSupport[0]) {
        await db.insert(supportMessages).values([
          {
            supportRequestId: demoSupport[0].id,
            senderId: demoUser.id,
            isStaff: false,
            message: "Merhaba, rezervasyonumu 5 gün sonraki tarihe almam mümkün mü? Ek ücret çıkarsa ödemeye hazırım.",
            isRead: true,
            createdAt: new Date("2025-04-10T09:30:00")
          },
          {
            supportRequestId: demoSupport[0].id,
            senderId: 11, // Admin kullanıcısı
            isStaff: true,
            message: "Merhaba, talebinizi aldık. Rezervasyonunuzu 25 Haziran tarihine değiştirebiliriz. Tarih değişikliği için 150 TL fark ücreti oluşacaktır. Onaylıyor musunuz?",
            isRead: true,
            createdAt: new Date("2025-04-10T11:15:00")
          },
          {
            supportRequestId: demoSupport[0].id,
            senderId: demoUser.id,
            isStaff: false,
            message: "Evet, onaylıyorum. Nasıl ödeme yapabilirim?",
            isRead: true,
            createdAt: new Date("2025-04-10T14:22:00")
          },
          {
            supportRequestId: demoSupport[0].id,
            senderId: 11, // Admin kullanıcısı
            isStaff: true,
            message: "Size bir ödeme bağlantısı göndereceğiz. Ödemeyi tamamladıktan sonra rezervasyonunuz güncellenecek. Teşekkür ederiz.",
            isRead: false,
            createdAt: new Date("2025-04-10T15:40:00")
          }
        ]);
        
        // Demo kullanıcısı için bildirim oluştur
        await db.insert(notifications).values({
          userId: demoUser.id,
          title: "Destek talebinize yanıt verildi",
          message: "Rezervasyon değişikliği talebinize yanıt verildi. Lütfen kontrol edin.",
          type: "support",
          relatedId: demoSupport[0].id,
          relatedType: "support-request",
          actionUrl: "/support/requests/" + demoSupport[0].id,
          isRead: false,
          createdAt: new Date("2025-04-10T15:40:00")
        });
      }
    }
    
    // Demo kullanıcısı için başka bir destek talebi oluştur
    if (demoBooking3 && demoBooking3[0]) {
      const demoSupport2 = await db.insert(supportRequests).values({
        userId: demoUser.id,
        bookingId: demoBooking3[0].id,
        title: "İptal işlemi hakkında",
        description: "İptal ettiğim rezervasyonum için para iadesi ne zaman yapılacak?",
        category: "refund",
        priority: "high",
        status: "resolved",
        assignedTo: 11, // Admin kullanıcısı
        resolutionNote: "Müşteriye para iadesi yapıldı ve bilgilendirildi",
        createdAt: new Date("2025-03-26T10:15:00"),
        updatedAt: new Date("2025-03-28T14:30:00")
      }).returning();
      
      // Demo ikinci destek talebine mesajlar ekle
      if (demoSupport2 && demoSupport2[0]) {
        await db.insert(supportMessages).values([
          {
            supportRequestId: demoSupport2[0].id,
            senderId: demoUser.id,
            isStaff: false,
            message: "Merhaba, iptal ettiğim rezervasyonum için para iadesi ne zaman yapılacak? Ödemeyi kredi kartı ile yapmıştım.",
            isRead: true,
            createdAt: new Date("2025-03-26T10:15:00")
          },
          {
            supportRequestId: demoSupport2[0].id,
            senderId: 11, // Admin kullanıcısı
            isStaff: true,
            message: "Merhaba, iptal işleminiz onaylanmıştır. Para iadesi 3-5 iş günü içerisinde kredi kartınıza yapılacaktır.",
            isRead: true,
            createdAt: new Date("2025-03-26T11:40:00")
          },
          {
            supportRequestId: demoSupport2[0].id,
            senderId: demoUser.id,
            isStaff: false,
            message: "Teşekkür ederim, bilgi için sağolun.",
            isRead: true,
            createdAt: new Date("2025-03-26T12:05:00")
          },
          {
            supportRequestId: demoSupport2[0].id,
            senderId: 11, // Admin kullanıcısı
            isStaff: true,
            message: "Para iadeniz yapılmıştır. Kartınıza 2-3 gün içinde yansıyacaktır. İyi günler dileriz.",
            isRead: true,
            createdAt: new Date("2025-03-28T14:30:00")
          }
        ]);
      }
    }
    
    // Member kullanıcısı için destek talebi
    if (memberBooking3 && memberBooking3[0]) {
      const memberSupport = await db.insert(supportRequests).values({
        userId: memberUser.id,
        bookingId: memberBooking3[0].id,
        title: "Özel yardıma ihtiyacım var",
        description: "İstanbul-Rodos seferinde yanımda 80 yaşında bir aile büyüğü olacak. Özel yardım ve tekerlekli sandalye desteği almak istiyorum.",
        category: "information",
        priority: "normal",
        status: "open",
        createdAt: new Date("2025-04-05T14:20:00")
      }).returning();
      
      // Member destek talebine mesajlar ekle
      if (memberSupport && memberSupport[0]) {
        await db.insert(supportMessages).values([
          {
            supportRequestId: memberSupport[0].id,
            senderId: memberUser.id,
            isStaff: false,
            message: "Merhaba, İstanbul-Rodos seferinde yanımda 80 yaşında bir aile büyüğü olacak. Terminalde ve gemide kendisine yardımcı olabilecek personel ve tekerlekli sandalye hizmeti alabilir miyiz?",
            isRead: false,
            createdAt: new Date("2025-04-05T14:20:00")
          }
        ]);
        
        // Admin için bildirim oluştur (normalde burada notification service kullanılır)
        await db.insert(notifications).values({
          userId: 11, // Admin kullanıcısı
          title: "Yeni destek talebi",
          message: "Özel yardım kategorisinde yeni bir destek talebi oluşturuldu.",
          type: "support",
          relatedId: memberSupport[0].id,
          relatedType: "support-request",
          actionUrl: "/admin/support/requests/" + memberSupport[0].id,
          isRead: false,
          createdAt: new Date("2025-04-05T14:20:00")
        });
      }
    }
    
    // Member kullanıcısı için tamamlanmış bir destek talebi daha oluştur
    if (memberBooking2 && memberBooking2[0]) {
      const memberSupport2 = await db.insert(supportRequests).values({
        userId: memberUser.id,
        bookingId: memberBooking2[0].id,
        title: "Araç bilgilerimi güncellemek istiyorum",
        description: "Rezervasyonumda araç bilgisi olarak belirttiğim aracı değiştirdim. Yeni araç bilgilerimi nasıl güncelleyebilirim?",
        category: "modification",
        priority: "low",
        status: "resolved",
        assignedTo: 11, // Admin kullanıcısı
        resolutionNote: "Müşterinin araç bilgileri güncellendi",
        createdAt: new Date("2025-04-15T11:25:00"),
        updatedAt: new Date("2025-04-16T10:10:00")
      }).returning();
      
      // Member ikinci destek talebine mesajlar ekle
      if (memberSupport2 && memberSupport2[0]) {
        await db.insert(supportMessages).values([
          {
            supportRequestId: memberSupport2[0].id,
            senderId: memberUser.id,
            isStaff: false,
            message: "Merhaba, rezervasyonumda belirttiğim araç bilgilerini güncellemem gerekiyor. Ford Focus yerine BMW X3 ile geleceğim. Bu değişikliği yapabilir misiniz?",
            isRead: true,
            createdAt: new Date("2025-04-15T11:25:00")
          },
          {
            supportRequestId: memberSupport2[0].id,
            senderId: 11, // Admin kullanıcısı
            isStaff: true,
            message: "Merhaba, araç bilgilerinizi güncelleyebiliriz. Lütfen yeni aracınızın plaka numarasını, markasını ve modelini paylaşır mısınız?",
            isRead: true,
            createdAt: new Date("2025-04-15T13:40:00")
          },
          {
            supportRequestId: memberSupport2[0].id,
            senderId: memberUser.id,
            isStaff: false,
            message: "Plaka: 34ABC123, Marka: BMW, Model: X3, Renk: Siyah",
            isRead: true,
            createdAt: new Date("2025-04-15T14:15:00")
          },
          {
            supportRequestId: memberSupport2[0].id,
            senderId: 11, // Admin kullanıcısı
            isStaff: true,
            message: "Araç bilgileriniz başarıyla güncellendi. İyi yolculuklar dileriz.",
            isRead: true,
            createdAt: new Date("2025-04-16T10:10:00")
          }
        ]);
        
        // Member kullanıcısı için bildirim oluştur
        await db.insert(notifications).values({
          userId: memberUser.id,
          title: "Araç bilgileriniz güncellendi",
          message: "Rezervasyonunuzdaki araç bilgileri başarıyla güncellendi.",
          type: "booking",
          relatedId: memberBooking2[0].id,
          relatedType: "booking",
          actionUrl: "/bookings/" + memberBooking2[0].id,
          isRead: true,
          createdAt: new Date("2025-04-16T10:10:00")
        });
      }
    }

    // 5. BİLDİRİMLER OLUŞTUR (REZERVASYON VE SİSTEM)
    console.log("Bildirimler oluşturuluyor...");
    
    // Demo kullanıcısı için bildirimler
    await db.insert(notifications).values([
      {
        userId: demoUser.id,
        title: "Yaklaşan seyahat hatırlatması",
        message: "Yarın saat 10:00'da İstanbul-Bodrum seferiniz bulunmaktadır. İyi yolculuklar dileriz.",
        type: "booking",
        relatedId: demoBooking1 && demoBooking1[0] ? demoBooking1[0].id : null,
        relatedType: "booking",
        actionUrl: "/bookings/" + (demoBooking1 && demoBooking1[0] ? demoBooking1[0].id : ""),
        isRead: true,
        createdAt: new Date("2025-05-14T10:00:00")
      },
      {
        userId: demoUser.id,
        title: "Yeni kampanya: Yaz İndirimleri",
        message: "Yaz aylarında tüm Ege hatlarında %15 indirim fırsatını kaçırmayın!",
        type: "system",
        isRead: false,
        actionUrl: "/campaigns/summer2025",
        createdAt: new Date("2025-04-01T09:00:00")
      },
      {
        userId: demoUser.id,
        title: "Yorumunuz onaylandı",
        message: "İstanbul-Bodrum seferimiz için yaptığınız değerlendirme onaylandı ve yayınlandı.",
        type: "review",
        isRead: false,
        actionUrl: "/reviews/my-reviews",
        createdAt: new Date("2025-05-19T08:30:00")
      }
    ]);
    
    // Member kullanıcısı için bildirimler
    await db.insert(notifications).values([
      {
        userId: memberUser.id,
        title: "İade işleminiz tamamlandı",
        message: "İptal ettiğiniz rezervasyon için iade işleminiz tamamlandı. 550 TL kartınıza iade edilmiştir.",
        type: "payment",
        relatedId: memberBooking4 && memberBooking4[0] ? memberBooking4[0].id : null,
        relatedType: "booking",
        actionUrl: "/bookings/" + (memberBooking4 && memberBooking4[0] ? memberBooking4[0].id : ""),
        isRead: true,
        createdAt: new Date("2025-03-18T10:20:00")
      },
      {
        userId: memberUser.id,
        title: "Değerlendirmenize yanıt verildi",
        message: "İstanbul-Çeşme seferimiz için yaptığınız değerlendirmeye ekibimiz yanıt verdi.",
        type: "review",
        isRead: false,
        actionUrl: "/reviews/my-reviews",
        createdAt: new Date("2025-05-26T09:15:00")
      },
      {
        userId: memberUser.id,
        title: "Üyelik yıldönümünüz kutlu olsun!",
        message: "Bizimleki ilk yılınızı kutlarız! Bir sonraki rezervasyonunuzda kullanabileceğiniz özel indirim kodunuz: BIRTHDAY25",
        type: "system",
        isRead: true,
        actionUrl: "/promotions/BIRTHDAY25",
        createdAt: new Date("2025-03-31T12:00:00")
      },
      {
        userId: memberUser.id,
        title: "Ödeme hatırlatması",
        message: "İstanbul-Rodos seferi için rezervasyonunuzun ödemesi bekleniyor. Son ödeme tarihi: 15 Nisan 2025",
        type: "booking",
        relatedId: memberBooking3 && memberBooking3[0] ? memberBooking3[0].id : null,
        relatedType: "booking",
        actionUrl: "/bookings/" + (memberBooking3 && memberBooking3[0] ? memberBooking3[0].id : "") + "/payment",
        isRead: false,
        createdAt: new Date("2025-04-08T09:00:00")
      }
    ]);

    // 6. SOSYAL MEDYA PAYLAŞIMLARI OLUŞTUR
    console.log("Sosyal medya paylaşımları oluşturuluyor...");
    
    // Demo kullanıcısı bilet paylaşımı
    if (demoBooking1 && demoBooking1[0]) {
      await db.insert(socialShares).values({
        userId: demoUser.id,
        bookingId: demoBooking1[0].id,
        contentType: "booking",
        platform: "whatsapp",
        status: "completed",
        metadata: {
          message: "İstanbul-Bodrum feribotumuz için biletimizi aldım! Yaz tatiline hazırız!",
          shared_with: "family_group"
        },
        createdAt: new Date("2025-04-05T12:30:00")
      });
    }
    
    // Member kullanıcısı bilet paylaşımları
    if (memberBooking2 && memberBooking2[0]) {
      await db.insert(socialShares).values([
        {
          userId: memberUser.id,
          bookingId: memberBooking2[0].id,
          contentType: "booking",
          platform: "instagram",
          status: "completed",
          shareUrl: "https://instagram.com/stories/123456",
          metadata: {
            caption: "Çeşme'ye gidiyoruz! #deniztatili #çeşme #feribot",
            likes: 24,
            comments: 5
          },
          createdAt: new Date("2025-03-10T17:20:00")
        },
        {
          userId: memberUser.id,
          bookingId: memberBooking2[0].id,
          contentType: "booking",
          platform: "twitter",
          status: "completed",
          shareUrl: "https://twitter.com/status/123456789",
          metadata: {
            text: "İstanbul-Çeşme arası feribotla 3 saatte ulaşım! Arabayla gitmekten çok daha keyifli 🚢",
            likes: 12,
            retweets: 3
          },
          createdAt: new Date("2025-03-10T17:25:00")
        }
      ]);
    }

    console.log("Örnek veri oluşturma işlemi tamamlandı!");
    
  } catch (error) {
    console.error("Örnek veri oluşturma hatası:", error);
  } finally {
    process.exit(0);
  }
}

// Fonksiyonu çalıştır
createSampleActivity();