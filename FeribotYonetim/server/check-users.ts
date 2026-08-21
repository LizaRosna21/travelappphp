import { db } from './db';
import { users } from '@shared/schema';

async function checkAllUsers() {
  try {
    console.log('Tüm kullanıcılar listeleniyor...');
    
    // Tüm kullanıcıları çekelim
    const allUsers = await db.select().from(users);
    
    console.log('Sistemde toplam', allUsers.length, 'kullanıcı var:');
    console.log('-----------------------------------------');
    
    // Her bir kullanıcıyı listeleyelim
    allUsers.forEach((user, index) => {
      console.log(`#${index + 1} ID: ${user.id}`);
      console.log(`   Kullanıcı adı: ${user.username}`);
      console.log(`   E-posta: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Aktif: ${user.isActive}`);
      console.log(`   Şifre: ${user.password.substring(0, 20)}...`);
      console.log('-----------------------------------------');
    });
    
  } catch (error) {
    console.error('Kullanıcı listeleme hatası:', error);
  } finally {
    process.exit(0);
  }
}

checkAllUsers();