// Örnek verileri güncelleyen betik
// Sistem başlangıcında çağrılarak verilerin doğru şekilde oluşturulmasını sağlar

import { db } from './db';
import { 
  users,
  bookings,
  bookingPassengers
} from '../shared/schema';

import { sql, eq } from 'drizzle-orm';

// MemStorage'da var olan örnek verileri kullanıcıya bağlama
async function updateSampleData() {
  try {
    console.log("Örnek verileri güncelleme işlemi başlatılıyor...");
    
    // Önce demo kullanıcısını bul
    const demoUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "demo")
    });
    
    if (!demoUser) {
      console.log("Demo kullanıcısı bulunamadı. Önce reset-users.ts çalıştırın.");
      return;
    }
    
    // Kullanıcıya bağlı olmayan rezervasyonları demo kullanıcısına ata
    const unassignedBookings = await db.select().from(bookings).where(
      sql`user_id IS NULL OR user_id = 0`
    );
    
    if (unassignedBookings.length > 0) {
      console.log(`${unassignedBookings.length} atanmamış rezervasyon demo kullanıcısına atanıyor...`);
      
      for (const booking of unassignedBookings) {
        await db.update(bookings)
          .set({ userId: demoUser.id })
          .where(eq(bookings.id, booking.id));
      }
    }
    
    // Member kullanıcısına da bazı rezervasyonlar ata
    const memberUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "member")
    });
    
    if (memberUser) {
      // Tüm rezervasyonları al
      const allBookings = await db.select().from(bookings);
      
      if (allBookings.length > 0) {
        // Eğer tüm rezervasyonlar demo kullanıcısına atanmışsa, bazılarını member kullanıcısına aktar
        const demosBookings = allBookings.filter(b => b.userId === demoUser.id);
        
        if (demosBookings.length >= 3) {
          // Demo kullanıcısının rezervasyonlarının yarısını member kullanıcısına aktar
          const bookingsToTransfer = demosBookings.slice(0, Math.floor(demosBookings.length / 2));
          
          console.log(`${bookingsToTransfer.length} rezervasyon member kullanıcısına aktarılıyor...`);
          
          for (const booking of bookingsToTransfer) {
            await db.update(bookings)
              .set({ userId: memberUser.id })
              .where(eq(bookings.id, booking.id));
          }
        }
      }
    }
    
    // Agent kullanıcısına da bazı rezervasyonlar ata
    const agentUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "agent")
    });
    
    if (agentUser) {
      // Tüm rezervasyonları al
      const allBookings = await db.select().from(bookings);
      
      if (allBookings.length > 5) {
        // Son 3 rezervasyonu agent kullanıcısına aktar
        const bookingsToTransfer = allBookings.slice(-3);
        
        console.log(`${bookingsToTransfer.length} rezervasyon agent kullanıcısına aktarılıyor...`);
        
        for (const booking of bookingsToTransfer) {
          await db.update(bookings)
            .set({ 
              userId: agentUser.id,
              agencyId: 1  // Örnek bir acenta ID'si
            })
            .where(eq(bookings.id, booking.id));
        }
      }
    }
    
    console.log("Örnek veri güncelleme işlemi tamamlandı!");
  } catch (error) {
    console.error("Örnek veri güncelleme hatası:", error);
  }
}

// Çalıştır
updateSampleData().then(() => {
  console.log("Sample data update işlemi tamamlandı.");
});