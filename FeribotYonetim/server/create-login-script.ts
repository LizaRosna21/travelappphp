import bcrypt from 'bcrypt';
import { promises as fs } from 'fs';

async function createLoginScript() {
  try {
    console.log('Login script oluşturuluyor...');
    
    // Demo kullanıcının şifresi
    const userPassword = 'demo123'; 
    
    // Admin kullanıcısının şifresi
    const adminPassword = 'admin123';
    
    // bcrypt ile şifreleri hashle
    const saltRounds = 10;
    const userHash = await bcrypt.hash(userPassword, saltRounds);
    const adminHash = await bcrypt.hash(adminPassword, saltRounds);
    
    // Login script içeriği
    const scriptContent = `
// Bu script manual login işlemlerinde kullanılmak üzere oluşturulmuştur
// Doğrudan API'yi kullanmak yerine veritabanında ayarlama yapar

import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './auth';
import bcrypt from 'bcrypt';

async function manualLogin() {
  // Demo kullanıcısı için
  try {
    // Şifreleri doğrudan ayarla
    await db.update(users)
      .set({ 
        password: '${userHash}'
      })
      .where(eq(users.username, 'demo'));
    
    // Admin kullanıcısı için
    await db.update(users)
      .set({ 
        password: '${adminHash}',
        role: 'admin'
      })
      .where(eq(users.username, 'admin'));
    
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
`;
    
    // Script dosyasını oluştur
    await fs.writeFile('server/manual-login.ts', scriptContent);
    
    console.log('Login script başarıyla oluşturuldu: server/manual-login.ts');
    console.log('Çalıştırmak için: cd server && npx tsx manual-login.ts');
    
  } catch (error) {
    console.error('Script oluşturma hatası:', error);
  }
}

createLoginScript();