// reset-users.ts
// Bu script veritabanındaki tüm kullanıcıları silip sistem gereksinimlerine göre
// Superadmin, admin, agentuser, memberuser gibi profiller oluşturur

import { db } from './db';
import { users } from '@shared/schema';
import { hashPassword } from './auth';

async function resetUsers() {
  try {
    console.log('Tüm kullanıcıları silme işlemi başlatılıyor...');
    
    // Tüm kullanıcıları sil
    await db.delete(users);
    console.log('Tüm kullanıcılar silindi.');
    
    // Kullanıcı şifreleri oluştur
    const superadminPassword = await hashPassword('superadmin123');
    const adminPassword = await hashPassword('admin123');
    const agentPassword = await hashPassword('agent123');
    const memberPassword = await hashPassword('member123');
    const demoPassword = await hashPassword('demo123');
    
    // 1. Superadmin kullanıcısı oluştur (En üst düzey yönetici)
    const superadminUser = await db.insert(users).values({
      username: 'superadmin',
      password: superadminPassword,
      email: 'superadmin@ferryticket.com',
      fullName: 'Süper Admin',
      role: 'superadmin',
      isActive: true,
      phoneNumber: '+905551112233',
      preferences: {
        language: 'tr',
        currency: 'TRY',
        notifications: {
          email: true,
          sms: true
        }
      }
    }).returning();
    console.log('Superadmin oluşturuldu:', superadminUser[0].username);
    
    // 2. Admin kullanıcısı oluştur (Normal yönetici)
    const adminUser = await db.insert(users).values({
      username: 'admin',
      password: adminPassword,
      email: 'admin@ferryticket.com',
      fullName: 'Admin Kullanıcı',
      role: 'admin',
      isActive: true,
      phoneNumber: '+905552223344',
      preferences: {
        language: 'tr',
        currency: 'TRY',
        notifications: {
          email: true,
          sms: true
        }
      }
    }).returning();
    console.log('Admin oluşturuldu:', adminUser[0].username);
    
    // 3. Agent kullanıcısı oluştur (Acente temsilcisi)
    const agentUser = await db.insert(users).values({
      username: 'agent',
      password: agentPassword,
      email: 'agent@ferryticket.com',
      fullName: 'Acente Kullanıcısı',
      role: 'agent',
      isActive: true,
      phoneNumber: '+905553334455',
      preferences: {
        language: 'tr',
        currency: 'TRY',
        notifications: {
          email: true,
          sms: true
        }
      },
      parentAgencyId: 1 // İlk acente ID'si
    }).returning();
    console.log('Agent oluşturuldu:', agentUser[0].username);
    
    // 4. Member kullanıcısı oluştur (Normal üye)
    const memberUser = await db.insert(users).values({
      username: 'member',
      password: memberPassword,
      email: 'member@ferryticket.com',
      fullName: 'Üye Kullanıcı',
      role: 'user',
      isActive: true,
      phoneNumber: '+905554445566',
      preferences: {
        language: 'tr',
        currency: 'TRY',
        notifications: {
          email: true,
          sms: true
        }
      }
    }).returning();
    console.log('Member oluşturuldu:', memberUser[0].username);
    
    // 5. Demo kullanıcısı oluştur (Demo kullanıcı)
    const demoUser = await db.insert(users).values({
      username: 'demo',
      password: demoPassword,
      email: 'demo@ferryticket.com',
      fullName: 'Demo Kullanıcı',
      role: 'user',
      isActive: true,
      phoneNumber: '+905555556677',
      preferences: {
        language: 'tr',
        currency: 'TRY',
        notifications: {
          email: true,
          sms: true
        }
      }
    }).returning();
    console.log('Demo oluşturuldu:', demoUser[0].username);
    
    console.log('\n--- Kullanıcı Bilgileri ---');
    console.log('Superadmin: superadmin / superadmin123 (En üst düzey yönetici)');
    console.log('Admin: admin / admin123 (Normal yönetici)');
    console.log('Agent: agent / agent123 (Acente temsilcisi)');
    console.log('Member: member / member123 (Normal üye)');
    console.log('Demo: demo / demo123 (Demo kullanıcı)');
    
    console.log('\nKullanıcı sıfırlama işlemi tamamlandı!');
  } catch (error) {
    console.error('Kullanıcı sıfırlama hatası:', error);
  } finally {
    process.exit(0);
  }
}

resetUsers();