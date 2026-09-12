/**
 * Transfer modülü doğrulama betiği.
 *
 * Şema yüklenmiş bir veritabanına karşı transfer servisinin iş kurallarını
 * uçtan uca çalıştırır. Depoda test altyapısı olmadığı için diğer kontrol
 * betikleriyle (check-users.ts, reset-users.ts) aynı kalıpta yazıldı.
 *
 * Çalıştırma:
 *   DATABASE_URL=postgresql://... npx tsx server/check-transfer-module.ts
 *
 * Betik kendi oluşturduğu kayıtları sonunda siler.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  transferBookings,
  transferPrices,
  transferRoutes,
  transferVehicleTypes,
} from '@shared/schema';
import { isTransferValidationError, transferService } from './services/transfer-service';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Verilen çağrının TransferValidationError ile reddedilmesini bekler. */
async function expectRejection(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(label, false, 'hata bekleniyordu ama işlem başarılı oldu');
  } catch (error) {
    check(label, isTransferValidationError(error), `beklenmeyen hata: ${String(error)}`);
  }
}

function isoDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function main() {
  console.log('Transfer modülü doğrulaması\n');

  const createdRouteIds: number[] = [];
  const createdVehicleIds: number[] = [];
  const createdBookingIds: number[] = [];

  try {
    // ---------------------------------------------------------------
    console.log('Araç tipleri ve rota');
    // ---------------------------------------------------------------

    const sedan = await transferService.createVehicleType({
      name: 'DOĞRULAMA Sedan',
      description: 'Betik tarafından oluşturuldu',
      maxPassengers: 3,
      maxLuggage: 2,
      isActive: true,
    });
    createdVehicleIds.push(sedan.id);
    check('araç tipi oluşturuldu', sedan.id > 0);

    const minibus = await transferService.createVehicleType({
      name: 'DOĞRULAMA Minibüs',
      maxPassengers: 8,
      maxLuggage: 8,
      isActive: true,
    });
    createdVehicleIds.push(minibus.id);

    const route = await transferService.createRoute({
      originName: 'DOĞRULAMA İstanbul Havalimanı',
      originType: 'airport',
      destinationName: 'DOĞRULAMA Taksim',
      destinationType: 'hotel',
      distance: '42',
      estimatedDuration: 55,
      isPopular: true,
      isActive: true,
    });
    createdRouteIds.push(route.id);
    check('rota oluşturuldu', route.id > 0);

    // ---------------------------------------------------------------
    console.log('\nFiyatlandırma');
    // ---------------------------------------------------------------

    await expectRejection('fiyatı olmayan rota teklif vermiyor', () =>
      transferService.quote({
        routeId: route.id,
        vehicleTypeId: sedan.id,
        isOneWay: true,
        passengerCount: 2,
      }),
    );

    const sedanPrice = await transferService.upsertPrice({
      routeId: route.id,
      vehicleTypeId: sedan.id,
      price: '1200.00',
      currencyCode: 'TRY',
      isOneWay: true,
      isActive: true,
    });
    check('tek yön fiyatı tanımlandı', Number(sedanPrice.price) === 1200);

    const sedanPriceAgain = await transferService.upsertPrice({
      routeId: route.id,
      vehicleTypeId: sedan.id,
      price: '1350.00',
      currencyCode: 'TRY',
      isOneWay: true,
      isActive: true,
    });
    check(
      'aynı rota+araç+yön için ikinci fiyat satırı açılmıyor (upsert)',
      sedanPriceAgain.id === sedanPrice.id && Number(sedanPriceAgain.price) === 1350,
      `id ${sedanPrice.id} -> ${sedanPriceAgain.id}`,
    );

    const oneWayQuote = await transferService.quote({
      routeId: route.id,
      vehicleTypeId: sedan.id,
      isOneWay: true,
      passengerCount: 2,
      luggageCount: 2,
    });
    check('tek yön teklifi doğru', oneWayQuote.totalPrice === 1350, String(oneWayQuote.totalPrice));

    const roundTripQuote = await transferService.quote({
      routeId: route.id,
      vehicleTypeId: sedan.id,
      isOneWay: false,
      passengerCount: 2,
    });
    check(
      'gidiş-dönüş fiyatı yoksa tek yönün iki katı uygulanıyor',
      roundTripQuote.totalPrice === 2700 && roundTripQuote.derivedFromOneWay,
      String(roundTripQuote.totalPrice),
    );

    await transferService.upsertPrice({
      routeId: route.id,
      vehicleTypeId: sedan.id,
      price: '2400.00',
      currencyCode: 'TRY',
      isOneWay: false,
      isActive: true,
    });

    const explicitRoundTrip = await transferService.quote({
      routeId: route.id,
      vehicleTypeId: sedan.id,
      isOneWay: false,
      passengerCount: 2,
    });
    check(
      'tanımlı gidiş-dönüş fiyatı iki kat kuralını eziyor',
      explicitRoundTrip.totalPrice === 2400 && !explicitRoundTrip.derivedFromOneWay,
      String(explicitRoundTrip.totalPrice),
    );

    // ---------------------------------------------------------------
    console.log('\nKapasite kuralları');
    // ---------------------------------------------------------------

    await expectRejection('araç kapasitesini aşan yolcu sayısı reddediliyor', () =>
      transferService.quote({
        routeId: route.id,
        vehicleTypeId: sedan.id,
        isOneWay: true,
        passengerCount: 4,
      }),
    );

    await expectRejection('bagaj kapasitesini aşan talep reddediliyor', () =>
      transferService.quote({
        routeId: route.id,
        vehicleTypeId: sedan.id,
        isOneWay: true,
        passengerCount: 2,
        luggageCount: 9,
      }),
    );

    await expectRejection('sıfır yolcu reddediliyor', () =>
      transferService.quote({
        routeId: route.id,
        vehicleTypeId: sedan.id,
        isOneWay: true,
        passengerCount: 0,
      }),
    );

    await expectRejection('pasif araç tipiyle teklif alınamıyor', async () => {
      await transferService.deactivateVehicleType(minibus.id);
      return transferService.quote({
        routeId: route.id,
        vehicleTypeId: minibus.id,
        isOneWay: true,
        passengerCount: 5,
      });
    });
    await transferService.updateVehicleType(minibus.id, { isActive: true });

    // ---------------------------------------------------------------
    console.log('\nRezervasyon');
    // ---------------------------------------------------------------

    const bookingInput = {
      routeId: route.id,
      vehicleTypeId: sedan.id,
      isOneWay: true,
      passengerCount: 2,
      luggageCount: 2,
      pickupDate: isoDateInDays(7),
      pickupTime: '09:30',
      flightNumber: 'TK1985',
      contactName: 'Ayşe Yılmaz',
      contactPhone: '+90 532 000 11 22',
      contactEmail: 'ayse@example.com',
    };

    // İstemci uydurma bir tutar göndermiş gibi davran
    const booking = await transferService.createBooking({
      ...bookingInput,
      ...({ totalPrice: '1.00', currencyCode: 'EUR' } as Record<string, unknown>),
    } as typeof bookingInput);
    createdBookingIds.push(booking.id);

    check(
      'fiyat sunucuda hesaplanıyor, istemciden gelen tutar yok sayılıyor',
      Number(booking.totalPrice) === 1350 && booking.currencyCode === 'TRY',
      `${booking.totalPrice} ${booking.currencyCode}`,
    );
    check(
      'rezervasyon referansı TRF önekiyle üretiliyor',
      /^TRF-\d{6}-[0-9A-Z]{5}$/.test(booking.bookingReference),
      booking.bookingReference,
    );
    check(
      'PNR sabit biçimde (2 harf + 6 rakam) üretiliyor',
      /^[A-Z]{2}\d{6}$/.test(booking.pnrNumber),
      booking.pnrNumber,
    );
    check('yeni rezervasyon beklemede başlıyor', booking.status === 'pending');
    check('ödeme durumu beklemede başlıyor', booking.paymentStatus === 'pending');

    await expectRejection('geçmiş tarihli alış reddediliyor', () =>
      transferService.createBooking({ ...bookingInput, pickupDate: isoDateInDays(-1) }),
    );

    await expectRejection('dönüş bilgisi olmayan gidiş-dönüş reddediliyor', () =>
      transferService.createBooking({ ...bookingInput, isOneWay: false }),
    );

    await expectRejection('dönüş zamanı alıştan önce olamaz', () =>
      transferService.createBooking({
        ...bookingInput,
        isOneWay: false,
        returnDate: isoDateInDays(6),
        returnTime: '09:30',
      }),
    );

    // ---------------------------------------------------------------
    console.log('\nPNR sorgusu');
    // ---------------------------------------------------------------

    const foundBySurname = await transferService.findBookingByPnr(
      booking.pnrNumber.toLowerCase(),
      'Yılmaz',
    );
    check('doğru soyadla PNR sorgusu rezervasyonu buluyor', foundBySurname?.id === booking.id);

    const foundByPhone = await transferService.findBookingByPnr(booking.pnrNumber, '1122');
    check('telefonun son haneleriyle de bulunuyor', foundByPhone?.id === booking.id);

    const notFound = await transferService.findBookingByPnr(booking.pnrNumber, 'Kaya');
    check('yanlış doğrulama bilgisiyle rezervasyon dönmüyor', notFound === undefined);

    // ---------------------------------------------------------------
    console.log('\nListeleme ve durum');
    // ---------------------------------------------------------------

    const listed = await transferService.listBookings({ search: booking.bookingReference });
    check(
      'referansla arama tek kaydı buluyor',
      listed.bookings.length === 1 && listed.pagination.total === 1,
      `bulunan: ${listed.bookings.length}`,
    );
    check('liste rota ve araç bilgisini birleştiriyor', listed.bookings[0]?.route?.id === route.id);

    const filteredOut = await transferService.listBookings({
      search: booking.bookingReference,
      status: 'completed',
    });
    check(
      'durum filtresi arama filtresini ezmiyor',
      filteredOut.bookings.length === 0 && filteredOut.pagination.total === 0,
      `bulunan: ${filteredOut.bookings.length}`,
    );

    await expectRejection('geçersiz durum değeri reddediliyor', () =>
      transferService.updateBookingStatus(booking.id, 'teleported'),
    );

    const assigned = await transferService.assignDriver(booking.id, {
      name: 'Mehmet Demir',
      phone: '+90 555 111 22 33',
      vehiclePlate: '34 TRF 001',
    });
    check('sürücü ataması durumu assigned yapıyor', assigned?.status === 'assigned');

    const cancelled = await transferService.cancelBooking(booking.id);
    check('rezervasyon iptal edilebiliyor', cancelled?.status === 'cancelled');

    await transferService.updateBookingStatus(booking.id, 'completed');
    await expectRejection('tamamlanmış transfer iptal edilemiyor', () =>
      transferService.cancelBooking(booking.id),
    );
  } finally {
    // ---------------------------------------------------------------
    // Temizlik
    // ---------------------------------------------------------------
    if (createdBookingIds.length > 0) {
      await db.delete(transferBookings).where(inArray(transferBookings.id, createdBookingIds));
    }
    if (createdRouteIds.length > 0) {
      await db.delete(transferPrices).where(inArray(transferPrices.routeId, createdRouteIds));
      await db.delete(transferRoutes).where(inArray(transferRoutes.id, createdRouteIds));
    }
    if (createdVehicleIds.length > 0) {
      await db
        .delete(transferVehicleTypes)
        .where(inArray(transferVehicleTypes.id, createdVehicleIds));
    }
  }

  console.log(`\nSonuç: ${passed} başarılı, ${failed} başarısız`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Doğrulama betiği hata verdi:', error);
  process.exit(1);
});
