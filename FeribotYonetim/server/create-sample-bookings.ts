// Örnek rezervasyon verileri oluşturmak için basit bir betik
// Bu betik belirli alanları belirterek doğrudan veri oluşturur

import { db } from './db';
import { 
  users,
  routes,
  schedules,
  bookings,
  bookingPassengers
} from '../shared/schema';

import { v4 as uuidv4 } from 'uuid';
import { sql, eq } from 'drizzle-orm';

// Benzersiz referans numarası oluşturma fonksiyonu
function generateBookingReference(prefix: string = "FB"): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
}

async function createSampleBookings() {
  try {
    console.log("Örnek rezervasyon verilerini oluşturma işlemi başlatılıyor...");
    
    // Önce demo kullanıcısını kontrol et
    const [demoUser] = await db.select().from(users).where(eq(users.username, "demo"));
    
    if (!demoUser) {
      console.log("Demo kullanıcısı bulunamadı!");
      return;
    }

    // Member kullanıcısını kontrol et  
    const [memberUser] = await db.select().from(users).where(eq(users.username, "member"));
    
    if (!memberUser) {
      console.log("Member kullanıcısı bulunamadı!");
    }
    
    // Agent kullanıcısını kontrol et
    const [agentUser] = await db.select().from(users).where(eq(users.username, "agent"));
    
    if (!agentUser) {
      console.log("Agent kullanıcısı bulunamadı!");
    }
    
    // Rotaları al
    const allRoutes = await db.select().from(routes);
    
    if (!allRoutes.length) {
      console.log("Rota verisi bulunamadı!");
      return;
    }
    
    // Programları al
    const allSchedules = await db.select().from(schedules);
    
    if (!allSchedules.length) {
      console.log("Program verisi bulunamadı!");
      return;
    }

    // Demo kullanıcısı için 3 rezervasyon oluştur
    if (demoUser) {
      for (let i = 0; i < 3; i++) {
        const selectedRoute = allRoutes[i % allRoutes.length];
        const selectedSchedule = allSchedules[i % allSchedules.length];
        
        // Rezervasyon referans numarası oluştur
        const bookingReference = generateBookingReference();
        const pnrNumber = `PNR${Date.now().toString().slice(-6)}${i}`;
        
        // Benzersiz değerler üret
        const departureDate = new Date();
        departureDate.setDate(departureDate.getDate() + 7 + i);
        
        // Rezervasyon oluştur
        const [booking] = await db.insert(bookings).values({
          userId: demoUser.id,
          routeId: selectedRoute.id,
          scheduleId: selectedSchedule.id,
          departureDate: departureDate.toISOString().split('T')[0],
          totalPrice: ((i + 1) * 1000).toString(),
          currency: "TRY",
          status: i === 0 ? "confirmed" : i === 1 ? "pending" : "completed",
          isPaid: i !== 1,
          bookingReference: bookingReference,
          pnrNumber: pnrNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          guestEmail: "demo@example.com",
          ticketNumber: i === 0 || i === 2 ? `TKT${Date.now().toString().slice(-6)}${i}` : null
        }).returning();
        
        // Yolcu ekleme
        for (let j = 0; j < i + 1; j++) {
          await db.insert(bookingPassengers).values({
            bookingId: booking.id,
            passengerTypeId: 1, // Adult
            firstName: `Demo${j+1}`,
            lastName: "User",
            documentNumber: `TC${1234567890 + j}`,
            birthDate: "1990-01-01",
            contact: "+905551234567"
          });
        }
      }
      
      console.log("Demo kullanıcısı için örnek rezervasyonlar oluşturuldu");
    }
    
    // Member kullanıcısı için 2 rezervasyon oluştur
    if (memberUser) {
      for (let i = 0; i < 2; i++) {
        const selectedRoute = allRoutes[(i + 1) % allRoutes.length];
        const selectedSchedule = allSchedules[(i + 1) % allSchedules.length];
        
        // Rezervasyon referans numarası oluştur
        const bookingReference = generateBookingReference("MB");
        const pnrNumber = `PNR${Date.now().toString().slice(-6)}M${i}`;
        
        // Benzersiz değerler üret
        const departureDate = new Date();
        departureDate.setDate(departureDate.getDate() + 14 + i*7);
        
        // Rezervasyon oluştur
        const [booking] = await db.insert(bookings).values({
          userId: memberUser.id,
          routeId: selectedRoute.id,
          scheduleId: selectedSchedule.id,
          departureDate: departureDate.toISOString().split('T')[0],
          totalPrice: ((i + 1) * 1500).toString(),
          currency: "TRY",
          status: i === 0 ? "confirmed" : "completed",
          isPaid: true,
          bookingReference: bookingReference,
          pnrNumber: pnrNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          guestEmail: "member@example.com",
          ticketNumber: `TKT${Date.now().toString().slice(-6)}M${i}`
        }).returning();
        
        // Yolcu ekleme
        for (let j = 0; j < i + 2; j++) {
          await db.insert(bookingPassengers).values({
            bookingId: booking.id,
            passengerTypeId: j === 0 ? 1 : 2, // İlk yolcu adult, diğerleri child
            firstName: `Member${j+1}`,
            lastName: "User",
            documentNumber: `TC${5678901234 + j}`,
            birthDate: j === 0 ? "1985-05-05" : "2010-10-10",
            contact: "+905559876543"
          });
        }
      }
      
      console.log("Member kullanıcısı için örnek rezervasyonlar oluşturuldu");
    }
    
    // Agent kullanıcısı için 1 rezervasyon oluştur
    if (agentUser) {
      const selectedRoute = allRoutes[0];
      const selectedSchedule = allSchedules[0];
      
      // Rezervasyon referans numarası oluştur
      const bookingReference = generateBookingReference("AG");
      const pnrNumber = `PNR${Date.now().toString().slice(-6)}A0`;
      
      // Benzersiz değerler üret
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + 21); // 3 hafta sonra
      
      // Rezervasyon oluştur
      const [booking] = await db.insert(bookings).values({
        userId: agentUser.id,
        routeId: selectedRoute.id,
        scheduleId: selectedSchedule.id,
        departureDate: departureDate.toISOString().split('T')[0],
        totalPrice: "3500",
        currency: "TRY",
        status: "confirmed",
        isPaid: true,
        bookingReference: bookingReference,
        pnrNumber: pnrNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        guestEmail: "agent@example.com",
        ticketNumber: `TKT${Date.now().toString().slice(-6)}A0`,
        agencyId: 1 // Örnek acenta ID'si
      }).returning();
      
      // Yolcu ekleme
      for (let j = 0; j < 3; j++) {
        await db.insert(bookingPassengers).values({
          bookingId: booking.id,
          passengerTypeId: j === 2 ? 2 : 1, // Son yolcu child, diğerleri adult
          firstName: `Agency${j+1}`,
          lastName: "Client",
          documentNumber: `TC${9876543210 + j}`,
          birthDate: j === 2 ? "2012-12-12" : j === 1 ? "1975-03-15" : "1978-07-22",
          contact: "+905553334444"
        });
      }
      
      console.log("Agent kullanıcısı için örnek rezervasyonlar oluşturuldu");
    }
    
    console.log("Tüm örnek rezervasyon verilerinin oluşturulması tamamlandı!");
  } catch (error) {
    console.error("Örnek veri oluşturma hatası:", error);
  }
}

// Çalıştır
createSampleBookings().then(() => {
  console.log("Örnek rezervasyon verileri başarıyla oluşturuldu");
  process.exit(0);
}).catch(err => {
  console.error("Hata:", err);
  process.exit(1);
});