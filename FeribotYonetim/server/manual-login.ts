// Bu script manual login işlemlerinde kullanılmak üzere oluşturulmuştur
// Doğrudan API'yi kullanmak yerine veritabanında ayarlama yapar

import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function manualLogin() {
  // Demo kullanıcısı için
  try {
    // İlk olarak demo kullanıcılarını bulalım
    console.log('Demo kullanıcıları aranıyor...');
    const demoUsers = await db.select().from(users).where(eq(users.username, 'demo'));
    
    console.log(`${demoUsers.length} adet demo kullanıcısı bulundu`);
    
    if (demoUsers.length > 0) {
      // İlk olarak güvenilir demo kullanıcısı oluşturalım
      // MemStorage'dan bağımsız olarak çalışması için doğrudan DB işlemleri yapıyoruz
      
      // Mevcut tüm demo kullanıcılarını silelim
      console.log('Mevcut demo kullanıcıları siliniyor...');
      await db.delete(users).where(eq(users.username, 'demo'));
      
      // Yeni bir demo kullanıcısı oluşturalım (bcrypt password)
      console.log('Yeni demo kullanıcısı oluşturuluyor...');
      await db.insert(users).values({
        username: 'demo',
        password: '$2b$10$dbnlkpyZ4fLAYouhOA7WfOEYoHC1aXJn.ZI/JLMXS.nPsOgIaYFY.', // demo123
        email: 'demo@ferryticket.com',
        fullName: 'Demo Kullanıcı',
        role: 'user',
        isActive: true,
        phoneNumber: '+905551234567',
        preferences: {
          language: 'tr',
          currency: 'TRY',
          notifications: {
            email: true,
            sms: true
          }
        }
      });
    }
    
    // Admin kullanıcısını da düzeltelim
    const adminUser = await db.select().from(users).where(eq(users.username, 'admin'));
    
    if (adminUser.length > 0) {
      console.log('Admin kullanıcısı güncelleniyor...');
      await db.update(users)
        .set({ 
          password: '$2b$10$iQnzDVBB.jWdeisgLhwGDeGVlleqJJxcTgvdQx3fhV1vx2w3XiwvG', // admin123
          role: 'admin'
        })
        .where(eq(users.username, 'admin'));
    }
    
    console.log('Kullanıcı bilgileri güncellendi!');
    console.log('Demo kullanıcı şifresi: demo123');
    console.log('Admin kullanıcı şifresi: admin123');
  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    process.exit(0);
  }
}

manualLogin();