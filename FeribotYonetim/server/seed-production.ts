/**
 * Production Seed Script - Hostinger Veritabanı İlk Kurulum
 *
 * Bu script veritabanında gerekli başlangıç verilerini oluşturur:
 * - Admin kullanıcı
 * - Varsayılan site ayarları
 * - Temel para birimleri
 * - Temel limanlar
 * - Yolcu tipleri
 * - Araç tipleri
 *
 * Kullanım: npm run db:seed
 */

import dotenv from 'dotenv';
dotenv.config();

import { db, pool } from './db';
import {
  users, siteSettings, currencies, ports,
  passengerTypes, vehicleTypes, languages
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🚀 Veritabanı seed işlemi başlatılıyor...\n');

  try {
    // 1. Admin kullanıcı oluştur
    console.log('👤 Admin kullanıcı kontrol ediliyor...');
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin'));

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@siteniz.com',
        fullName: 'Sistem Yöneticisi',
        role: 'superadmin',
        isActive: true,
      });
      console.log('   ✅ Admin kullanıcı oluşturuldu (admin / admin123)');
      console.log('   ⚠️  ÖNEMLİ: Giriş yaptıktan sonra şifrenizi mutlaka değiştirin!');
    } else {
      console.log('   ℹ️  Admin kullanıcı zaten mevcut');
    }

    // 2. Varsayılan site ayarları
    console.log('\n⚙️  Site ayarları kontrol ediliyor...');
    const existingSettings = await db.select().from(siteSettings);

    if (existingSettings.length === 0) {
      await db.insert(siteSettings).values({
        siteName: 'Feribot Bilet Sistemi',
        primaryColor: '#0C4B7D',
        secondaryColor: '#1A94FF',
        accentColor: '#FF7D00',
        buttonPrimaryColor: '#0C4B7D',
        buttonSecondaryColor: '#1A94FF',
        buttonAccentColor: '#FF7D00',
        cardTagPopularColor: '#2563EB',
        cardTagFastestColor: '#059669',
        cardTagScenicColor: '#D97706',
        homeBackgroundOverlayOpacity: '0.6',
        homeBackgroundOverlayColor: '#0C4B7D',
        contactEmail: 'info@siteniz.com',
        contactPhone: '+90 555 000 0000',
        seo: {
          title: 'Feribot Bilet Sistemi',
          description: 'Online feribot bilet satış ve yönetim sistemi',
          keywords: 'feribot, bilet, online, deniz yolu, gemi',
        },
      });
      console.log('   ✅ Varsayılan site ayarları oluşturuldu');
    } else {
      console.log('   ℹ️  Site ayarları zaten mevcut');
    }

    // 3. Para birimleri
    console.log('\n💰 Para birimleri kontrol ediliyor...');
    const existingCurrencies = await db.select().from(currencies);

    if (existingCurrencies.length === 0) {
      await db.insert(currencies).values([
        { code: 'TRY', name: 'Türk Lirası', symbol: '₺', exchangeRate: '1', isActive: true, isDefault: true },
        { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: '0.028', isActive: true, isDefault: false },
        { code: 'USD', name: 'ABD Doları', symbol: '$', exchangeRate: '0.031', isActive: true, isDefault: false },
        { code: 'GBP', name: 'İngiliz Sterlini', symbol: '£', exchangeRate: '0.024', isActive: true, isDefault: false },
      ]);
      console.log('   ✅ Para birimleri oluşturuldu (TRY, EUR, USD, GBP)');
    } else {
      console.log('   ℹ️  Para birimleri zaten mevcut');
    }

    // 4. Diller
    console.log('\n🌍 Diller kontrol ediliyor...');
    const existingLanguages = await db.select().from(languages);

    if (existingLanguages.length === 0) {
      await db.insert(languages).values([
        { code: 'tr', name: 'Turkish', localName: 'Türkçe', flagEmoji: '🇹🇷', rtl: false, isActive: true, isDefault: true },
        { code: 'en', name: 'English', localName: 'English', flagEmoji: '🇬🇧', rtl: false, isActive: true, isDefault: false },
        { code: 'de', name: 'German', localName: 'Deutsch', flagEmoji: '🇩🇪', rtl: false, isActive: true, isDefault: false },
        { code: 'el', name: 'Greek', localName: 'Ελληνικά', flagEmoji: '🇬🇷', rtl: false, isActive: true, isDefault: false },
      ]);
      console.log('   ✅ Diller oluşturuldu (TR, EN, DE, EL)');
    } else {
      console.log('   ℹ️  Diller zaten mevcut');
    }

    // 5. Limanlar
    console.log('\n⚓ Limanlar kontrol ediliyor...');
    const existingPorts = await db.select().from(ports);

    if (existingPorts.length === 0) {
      await db.insert(ports).values([
        { name: 'Bodrum', country: 'Türkiye', city: 'Muğla', description: 'Bodrum Feribot İskelesi', isActive: true },
        { name: 'Kos', country: 'Yunanistan', city: 'Kos', description: 'Kos Limanı', isActive: true },
        { name: 'Marmaris', country: 'Türkiye', city: 'Muğla', description: 'Marmaris Feribot İskelesi', isActive: true },
        { name: 'Rodos', country: 'Yunanistan', city: 'Rodos', description: 'Rodos Limanı', isActive: true },
        { name: 'Fethiye', country: 'Türkiye', city: 'Muğla', description: 'Fethiye Feribot İskelesi', isActive: true },
        { name: 'Datça', country: 'Türkiye', city: 'Muğla', description: 'Datça Limanı', isActive: true },
        { name: 'Çeşme', country: 'Türkiye', city: 'İzmir', description: 'Çeşme Feribot İskelesi', isActive: true },
        { name: 'Chios', country: 'Yunanistan', city: 'Chios', description: 'Chios Limanı', isActive: true },
        { name: 'Kuşadası', country: 'Türkiye', city: 'Aydın', description: 'Kuşadası Feribot İskelesi', isActive: true },
        { name: 'Samos', country: 'Yunanistan', city: 'Samos', description: 'Samos Limanı', isActive: true },
        { name: 'Ayvalık', country: 'Türkiye', city: 'Balıkesir', description: 'Ayvalık Feribot İskelesi', isActive: true },
        { name: 'Lesbos', country: 'Yunanistan', city: 'Lesbos', description: 'Midilli Limanı', isActive: true },
      ]);
      console.log('   ✅ 12 liman oluşturuldu');
    } else {
      console.log('   ℹ️  Limanlar zaten mevcut');
    }

    // 6. Yolcu tipleri
    console.log('\n👥 Yolcu tipleri kontrol ediliyor...');
    const existingPassengerTypes = await db.select().from(passengerTypes);

    if (existingPassengerTypes.length === 0) {
      await db.insert(passengerTypes).values([
        { name: 'Yetişkin', priceMultiplier: '1.00', description: '12 yaş ve üzeri' },
        { name: 'Çocuk', priceMultiplier: '0.50', description: '2-12 yaş arası' },
        { name: 'Bebek', priceMultiplier: '0.00', description: '0-2 yaş arası (ücretsiz)' },
        { name: 'Öğrenci', priceMultiplier: '0.75', description: 'Öğrenci kimliği ile' },
        { name: '65+ Yaşlı', priceMultiplier: '0.60', description: '65 yaş ve üzeri' },
      ]);
      console.log('   ✅ Yolcu tipleri oluşturuldu');
    } else {
      console.log('   ℹ️  Yolcu tipleri zaten mevcut');
    }

    // 7. Araç tipleri
    console.log('\n🚗 Araç tipleri kontrol ediliyor...');
    const existingVehicleTypes = await db.select().from(vehicleTypes);

    if (existingVehicleTypes.length === 0) {
      await db.insert(vehicleTypes).values([
        { name: 'Otomobil', additionalPrice: '150.00' },
        { name: 'Motosiklet', additionalPrice: '75.00' },
        { name: 'Minibüs', additionalPrice: '300.00' },
        { name: 'Karavan', additionalPrice: '400.00' },
        { name: 'Bisiklet', additionalPrice: '25.00' },
      ]);
      console.log('   ✅ Araç tipleri oluşturuldu');
    } else {
      console.log('   ℹ️  Araç tipleri zaten mevcut');
    }

    console.log('\n✅ Seed işlemi başarıyla tamamlandı!');
    console.log('\n📋 Sonraki adımlar:');
    console.log('   1. Admin paneline giriş yapın: /admin');
    console.log('   2. Kullanıcı: admin | Şifre: admin123');
    console.log('   3. Şifrenizi hemen değiştirin!');
    console.log('   4. Site ayarlarını kendi bilgilerinizle güncelleyin');
    console.log('   5. Feribot rotalarınızı ve tarifelerinizi ekleyin\n');

  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
