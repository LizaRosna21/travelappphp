import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './auth';

async function fixDemoUser() {
  try {
    console.log('Demo kullanıcı şifresi düzeltiliyor...');
    
    // Önce mevcut demo kullanıcıyı silelim
    await db.delete(users).where(eq(users.username, 'demo'));
    console.log('Mevcut demo kullanıcısı silindi.');
    
    // Şimdi yeni bir şifre ile oluşturalım
    const userPassword = await hashPassword('demo123');
    
    // Demo normal kullanıcı oluştur
    const insertedUser = await db.insert(users).values({
      username: 'demo',
      password: userPassword,
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
    }).returning();
    
    console.log('Demo kullanıcı yeniden oluşturuldu!');
    console.log('Demo kullanıcı ID:', insertedUser[0].id);
    console.log('Demo kullanıcı rolü:', insertedUser[0].role);
    
    // Kontrol amaçlı şifrenin hash halini gösterelim
    console.log('Oluşturulan şifre hash:', userPassword);
  } catch (error) {
    console.error('Demo kullanıcı düzeltme hatası:', error);
  } finally {
    process.exit(0);
  }
}

fixDemoUser();