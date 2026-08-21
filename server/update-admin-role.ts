import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function updateAdminRole() {
  try {
    console.log('Admin rolü güncelleniyor...');
    
    // Admin kullanıcının rolünü güncelle
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.username, 'admin'));
    
    console.log('Admin kullanıcı rolü başarıyla güncellendi!');
    
    // Kontrol et
    const adminUser = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    if (adminUser.length > 0) {
      console.log(`Admin kullanıcı bilgileri:`);
      console.log(`ID: ${adminUser[0].id}`);
      console.log(`Kullanıcı adı: ${adminUser[0].username}`);
      console.log(`Rol: ${adminUser[0].role}`);
    }
    
  } catch (error) {
    console.error('Admin rolü güncelleme hatası:', error);
  } finally {
    process.exit(0);
  }
}

updateAdminRole();