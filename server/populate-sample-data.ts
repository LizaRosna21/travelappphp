// Örnek Veri Oluşturma Betiği
// Bu betik veritabanına örnek rezervasyon verileri ekler

import { db } from './db';
import { 
  users,
  routes,
  schedules,
  bookings,
  bookingPassengers,
  ports,
  vehicles,
  vehicleTypes,
  ferryCompanies,
  agencies
} from '../shared/schema';

// Payments tablosu ayrı bir modül
import { payments } from './db-models';

import {
  getUserIdByUsername,
  getRouteIdByPorts,
  getScheduleByRouteAndTime,
  generateUniqueBookingReference,
  getVehicleTypeIdByName
} from './db-helper';

import { sql } from 'drizzle-orm';

// Örnek verileri oluşturma fonksiyonu
async function populateSampleData() {
  try {
    console.log("Örnek veri oluşturma işlemi başlatılıyor...");

    // İlk olarak, veri varlığını kontrol et
    const bookingsCount = await db.select({ count: sql`count(*)` }).from(bookings);
    if (Number(bookingsCount[0].count) > 0) {
      console.log(`Veritabanında ${bookingsCount[0].count} rezervasyon bulundu. Tekrar oluşturma atlanıyor.`);
      return;
    }

    // Kullanıcı ID'lerini al
    const demoUserId = await getUserIdByUsername("demo");
    const memberUserId = await getUserIdByUsername("member");
    const agentUserId = await getUserIdByUsername("agent");

    if (!demoUserId || !memberUserId || !agentUserId) {
      throw new Error("Kullanıcılar bulunamadı. Önce reset-users.ts çalıştırın.");
    }

    console.log(`Kullanıcı ID'leri: Demo=${demoUserId}, Member=${memberUserId}, Agent=${agentUserId}`);

    // Örnek rotaları oluştur
    const routeData = [
      { departurePort: "Istanbul Port", arrivalPort: "Bodrum Port", basePrice: "400.00", duration: 6, distance: 550, description: "İstanbul-Bodrum feribot hattı" },
      { departurePort: "Istanbul Port", arrivalPort: "Izmir Port", basePrice: "350.00", duration: 5, distance: 480, description: "İstanbul-İzmir feribot hattı" },
      { departurePort: "Istanbul Port", arrivalPort: "Cesme Port", basePrice: "380.00", duration: 5.5, distance: 495, description: "İstanbul-Çeşme feribot hattı" },
      { departurePort: "Istanbul Port", arrivalPort: "Kusadasi Port", basePrice: "390.00", duration: 5.5, distance: 510, description: "İstanbul-Kuşadası feribot hattı" },
      { departurePort: "Istanbul Port", arrivalPort: "Antalya Port", basePrice: "450.00", duration: 8, distance: 695, description: "İstanbul-Antalya feribot hattı" },
      { departurePort: "Istanbul Port", arrivalPort: "Rhodes Port", basePrice: "550.00", duration: 10, distance: 705, description: "İstanbul-Rodos feribot hattı (Uluslararası)" },
      { departurePort: "Izmir Port", arrivalPort: "Athens Port", basePrice: "500.00", duration: 9, distance: 620, description: "İzmir-Atina feribot hattı (Uluslararası)" },
      { departurePort: "Bodrum Port", arrivalPort: "Kos Port", basePrice: "250.00", duration: 2, distance: 120, description: "Bodrum-Kos feribot hattı (Uluslararası)" },
      { departurePort: "Marmaris Port", arrivalPort: "Rhodes Port", basePrice: "280.00", duration: 2.5, distance: 145, description: "Marmaris-Rodos feribot hattı (Uluslararası)" },
      { departurePort: "Cesme Port", arrivalPort: "Chios Port", basePrice: "200.00", duration: 1.5, distance: 85, description: "Çeşme-Sakız feribot hattı (Uluslararası)" }
    ];

    // Mevcut limanları kontrol et
    const existingPorts = await db.select().from(ports);
    const portNames = new Set(existingPorts.map(port => port.name));

    // Eksik limanları ekle
    const requiredPorts = new Set([
      ...routeData.map(r => r.departurePort),
      ...routeData.map(r => r.arrivalPort)
    ]);

    for (const portName of requiredPorts) {
      if (!portNames.has(portName)) {
        // Liman ülkesini ve şehrini belirle
        let country, city;
        if (portName.includes("Port")) {
          const cityPart = portName.replace(" Port", "");
          if (["Athens", "Chios", "Kos", "Rhodes"].includes(cityPart)) {
            country = "Greece";
            city = cityPart;
          } else {
            country = "Turkey";
            city = cityPart;
          }
        }

        console.log(`Eklenen liman: ${portName}, ${city}, ${country}`);
        await db.insert(ports).values({
          name: portName,
          country: country,
          city: city,
          latitude: 0, // Gerçek değerler ile değiştirilmeli
          longitude: 0, // Gerçek değerler ile değiştirilmeli
          description: `${city} Ferry Port`,
          amenities: {
            hasRestaurant: true,
            hasWifi: true,
            hasParking: true,
            hasLuggage: true
          }
        });
      }
    }

    // Eksik rotaları ekle
    for (const route of routeData) {
      const existingRoute = await getRouteIdByPorts(route.departurePort, route.arrivalPort);
      if (!existingRoute) {
        console.log(`Eklenen rota: ${route.departurePort} - ${route.arrivalPort}`);
        await db.insert(routes).values({
          departurePort: route.departurePort,
          arrivalPort: route.arrivalPort,
          basePrice: route.basePrice,
          duration: route.duration,
          distance: route.distance,
          description: route.description,
          isActive: true,
          isPopular: Math.random() > 0.5,
          departureCode: route.departurePort.substring(0, 3).toUpperCase(),
          arrivalCode: route.arrivalPort.substring(0, 3).toUpperCase(),
          countryDeparture: route.departurePort.includes("Athens") || 
                           route.departurePort.includes("Chios") || 
                           route.departurePort.includes("Kos") || 
                           route.departurePort.includes("Rhodes") ? "Greece" : "Turkey",
          countryArrival: route.arrivalPort.includes("Athens") || 
                         route.arrivalPort.includes("Chios") || 
                         route.arrivalPort.includes("Kos") || 
                         route.arrivalPort.includes("Rhodes") ? "Greece" : "Turkey"
        });
      }
    }

    // Feribot şirketlerini oluştur
    const companies = ["Mediterranean Ferries", "Aegean Lines", "Black Sea Maritime", "Turquoise Voyages", "Blue Horizon Ferries"];
    
    for (const company of companies) {
      const existingCompany = await db.query.ferryCompanies.findFirst({
        where: (ferryCompanies, { eq }) => eq(ferryCompanies.name, company)
      });
      
      if (!existingCompany) {
        await db.insert(ferryCompanies).values({
          name: company,
          logo: `https://example.com/logos/${company.toLowerCase().replace(/ /g, '_')}.png`,
          website: `https://${company.toLowerCase().replace(/ /g, '')}.com`,
          phone: `+90${Math.floor(5000000000 + Math.random() * 9000000000)}`,
          email: `info@${company.toLowerCase().replace(/ /g, '')}.com`,
          description: `${company} is a leading ferry operator in Turkey and Greece.`,
          founded: `${1980 + Math.floor(Math.random() * 30)}`,
          fleetSize: 5 + Math.floor(Math.random() * 10),
          headquarters: Math.random() > 0.5 ? "Istanbul, Turkey" : "Izmir, Turkey",
        });
      }
    }

    // Rotalar için tarifeler oluştur
    const routeIds = await db.select().from(routes);
    
    for (const route of routeIds) {
      // Her rota için 3 farklı tarife oluştur
      const departureTimes = ["08:00", "14:00", "20:00"];
      const arrivalTimes = ["13:00", "19:00", "01:00"];
      
      for (let i = 0; i < departureTimes.length; i++) {
        const existingSchedule = await getScheduleByRouteAndTime(route.id, departureTimes[i]);
        
        if (!existingSchedule) {
          console.log(`Eklenen tarife: ${route.departurePort} - ${route.arrivalPort}, ${departureTimes[i]}`);
          
          const randomCompanyIndex = Math.floor(Math.random() * companies.length);
          const ferryCompany = await db.query.ferryCompanies.findFirst({
            where: (ferryCompanies, { eq }) => eq(ferryCompanies.name, companies[randomCompanyIndex])
          });
          
          await db.insert(schedules).values({
            routeId: route.id,
            departureTime: departureTimes[i],
            arrivalTime: arrivalTimes[i],
            daysOfWeek: "1,2,3,4,5", // Pazartesi-Cuma
            startDate: "2025-04-01",
            endDate: "2025-10-31",
            capacity: 200 + Math.floor(Math.random() * 300),
            passengerCapacity: 250 + Math.floor(Math.random() * 300),
            vehicleCapacity: 50 + Math.floor(Math.random() * 50),
            price: parseFloat(route.basePrice) * (0.9 + Math.random() * 0.3) + "", // Base price +/- %30
            currency: "TRY",
            ferryId: Math.floor(Math.random() * 5) + 1,
            ferryName: ["M/F Marmara", "M/F Aegean", "M/F Black Sea", "M/F Mediterranean", "M/F Golden Horn"][Math.floor(Math.random() * 5)],
            ferryType: ["RoPax", "FastFerry", "Catamaran", "Conventional", "Cruise Ferry"][Math.floor(Math.random() * 5)],
            ferryCompanyId: ferryCompany ? ferryCompany.id : 1,
            duration: route.duration,
            isActive: true,
            cabinOptions: {
              hasEconomyCabin: true,
              hasStandardCabin: true,
              hasDeluxeCabin: Math.random() > 0.3,
              hasSuiteCabin: Math.random() > 0.7
            },
            amenities: {
              hasWifi: true,
              hasFood: true,
              hasEntertainment: Math.random() > 0.5,
              hasShopping: Math.random() > 0.6
            }
          });
        }
      }
    }

    // Demo kullanıcısı için rezervasyonlar oluştur
    const demoRoutes = await db.query.routes.findMany({ limit: 5 });
    const demoSchedules = await db.query.schedules.findMany({ limit: 5 });
    
    if (demoRoutes.length > 0 && demoSchedules.length > 0 && demoUserId) {
      console.log("Demo kullanıcısı için rezervasyonlar oluşturuluyor...");

      // Tamamlanmış rezervasyon
      const demoCompletedRef = await generateUniqueBookingReference("DMO");
      const demoCompleted = await db.insert(bookings).values({
        userId: demoUserId,
        routeId: demoRoutes[0].id,
        scheduleId: demoSchedules[0].id,
        departureDate: "2025-05-15",
        totalPrice: "750.00",
        currency: "TRY",
        status: "completed",
        isPaid: true,
        bookingReference: demoCompletedRef,
        paymentMethod: "credit_card",
        passengerCount: 2,
        specialRequests: "Pencere kenarı tercih edilir",
        contactPhone: "+905551234567",
        contactEmail: "demo@ferryticket.com",
        metadata: { promo_applied: false, source: "web" },
        createdAt: new Date("2025-04-05T10:30:00"),
        notes: null,
        vehicleCount: 0,
        isRoundTrip: false,
        agencyId: null,
        guestName: null
      }).returning();

      // Bekleyen rezervasyon
      const demoPendingRef = await generateUniqueBookingReference("DMO");
      const demoPending = await db.insert(bookings).values({
        userId: demoUserId,
        routeId: demoRoutes[1].id,
        scheduleId: demoSchedules[1].id,
        departureDate: "2025-06-20",
        returnDate: "2025-06-30",
        totalPrice: "1250.00",
        currency: "TRY",
        status: "pending",
        isPaid: false,
        bookingReference: demoPendingRef,
        paymentMethod: null,
        passengerCount: 1,
        specialRequests: null,
        contactPhone: "+905551234567",
        contactEmail: "demo@ferryticket.com",
        metadata: { promo_applied: false, source: "mobile" },
        createdAt: new Date("2025-04-07T15:45:00"),
        notes: null,
        vehicleCount: 1,
        isRoundTrip: true,
        agencyId: null,
        guestName: null
      }).returning();

      // İptal edilmiş rezervasyon
      const demoCancelledRef = await generateUniqueBookingReference("DMO");
      const demoCancelled = await db.insert(bookings).values({
        userId: demoUserId,
        routeId: demoRoutes[2].id,
        scheduleId: demoSchedules[2].id,
        departureDate: "2025-05-01",
        totalPrice: "600.00",
        currency: "TRY",
        status: "cancelled",
        isPaid: false,
        bookingReference: demoCancelledRef,
        paymentMethod: null,
        passengerCount: 2,
        specialRequests: "Tekerlekli sandalye erişimi gerekli",
        contactPhone: "+905551234567",
        contactEmail: "demo@ferryticket.com",
        metadata: { promo_applied: true, source: "web", promo_code: "BAHAR2025" },
        createdAt: new Date("2025-03-25T09:15:00"),
        notes: "Müşteri tarafından iptal edildi",
        vehicleCount: 0,
        isRoundTrip: false,
        agencyId: null,
        guestName: null
      }).returning();

      // Yolcu eklemeleri
      if (demoCompleted && demoCompleted[0]) {
        // Araca ihtiyacı olan yolcu türünü bul
        const noVehicleType = await getVehicleTypeIdByName("No Vehicle");
        
        // Yolcuları ekle
        await db.insert(bookingPassengers).values([
          {
            bookingId: demoCompleted[0].id,
            passengerTypeId: 1, // Adult
            firstName: "Demo",
            lastName: "Kullanıcı",
            identityNumber: "T12345678",
            dateOfBirth: "1985-05-10",
            gender: "male",
            nationality: "Turkish",
            price: "400.00",
            contact: "+905551234567"
          },
          {
            bookingId: demoCompleted[0].id,
            passengerTypeId: 2, // Child
            firstName: "Demo",
            lastName: "Çocuk",
            identityNumber: "T98765432",
            dateOfBirth: "2015-07-15",
            gender: "female",
            nationality: "Turkish",
            price: "350.00",
            contact: null
          }
        ]);
        
        // Ödeme ekle
        await db.insert(payments).values({
          bookingId: demoCompleted[0].id,
          amount: "750.00",
          currency: "TRY",
          status: "completed",
          paymentMethod: "credit_card",
          transactionId: "TR" + Math.floor(10000000 + Math.random() * 90000000),
          paymentDate: new Date("2025-04-05T10:35:00"),
          cardLast4: "4242",
          metadata: { 
            card_brand: "Visa", 
            payment_provider: "stripe",
            customer_ip: "192.168.1.1"
          }
        });
      }
      
      // Bekleyen rezervasyon - araç ekle
      if (demoPending && demoPending[0]) {
        // Yolcu ekle
        await db.insert(bookingPassengers).values({
          bookingId: demoPending[0].id,
          passengerTypeId: 1, // Adult
          firstName: "Demo",
          lastName: "Kullanıcı",
          identityNumber: "T12345678",
          dateOfBirth: "1985-05-10",
          gender: "male",
          nationality: "Turkish",
          price: "650.00",
          contact: "+905551234567"
        });
        
        // Car vehicle type ID'sini al
        const carVehicleTypeId = await getVehicleTypeIdByName("Car");
        
        if (carVehicleTypeId) {
          // Araç ekle
          await db.insert(vehicles).values({
            bookingId: demoPending[0].id,
            vehicleTypeId: carVehicleTypeId,
            licensePlate: "34ABC123"
          });
        }
      }
      
      // İptal edilen rezervasyon için yolcular
      if (demoCancelled && demoCancelled[0]) {
        await db.insert(bookingPassengers).values([
          {
            bookingId: demoCancelled[0].id,
            passengerTypeId: 1, // Adult
            firstName: "Demo",
            lastName: "Kullanıcı",
            identityNumber: "T12345678",
            dateOfBirth: "1985-05-10",
            gender: "male",
            nationality: "Turkish",
            price: "300.00",
            contact: "+905551234567"
          },
          {
            bookingId: demoCancelled[0].id,
            passengerTypeId: 1, // Adult
            firstName: "Ahmet",
            lastName: "Yılmaz",
            identityNumber: "T87654321",
            dateOfBirth: "1980-03-15",
            gender: "male",
            nationality: "Turkish",
            price: "300.00",
            contact: null
          }
        ]);
      }
    }

    // Member kullanıcısı için rezervasyonlar
    const memberRoutes = await db.query.routes.findMany({ 
      offset: 2, // Farklı rotalar seçmek için offset kullan
      limit: 6 
    });
    
    const memberSchedules = await db.query.schedules.findMany({ 
      offset: 2, 
      limit: 6 
    });
    
    if (memberRoutes.length > 0 && memberSchedules.length > 0 && memberUserId) {
      console.log("Member kullanıcısı için rezervasyonlar oluşturuluyor...");

      // Tamamlanmış 2 rezervasyon, 1 bekleyen, 1 iptal
      
      // Tamamlanmış 1. rezervasyon 
      const memberCompletedRef1 = await generateUniqueBookingReference("MEM");
      const memberCompleted1 = await db.insert(bookings).values({
        userId: memberUserId,
        routeId: memberRoutes[0].id,
        scheduleId: memberSchedules[0].id,
        departureDate: "2025-04-20",
        totalPrice: "450.00",
        currency: "TRY",
        status: "completed",
        isPaid: true,
        bookingReference: memberCompletedRef1,
        paymentMethod: "credit_card",
        passengerCount: 1,
        specialRequests: null,
        contactPhone: "+905559876543",
        contactEmail: "member@ferryticket.com",
        metadata: { promo_applied: false, source: "web" },
        createdAt: new Date("2025-03-05T11:20:00"),
        notes: null,
        vehicleCount: 0,
        isRoundTrip: false,
        agencyId: null,
        guestName: null
      }).returning();
      
      // Tamamlanmış 2. rezervasyon (gidiş-dönüş)
      const memberCompletedRef2 = await generateUniqueBookingReference("MEM");
      const memberCompleted2 = await db.insert(bookings).values({
        userId: memberUserId,
        routeId: memberRoutes[1].id,
        scheduleId: memberSchedules[1].id,
        departureDate: "2025-05-15",
        returnDate: "2025-05-22",
        totalPrice: "1600.00",
        currency: "TRY",
        status: "completed",
        isPaid: true,
        bookingReference: memberCompletedRef2,
        paymentMethod: "bank_transfer",
        passengerCount: 2,
        specialRequests: "Özel yemek: Vejetaryen",
        contactPhone: "+905559876543",
        contactEmail: "member@ferryticket.com",
        metadata: { promo_applied: true, source: "web", promo_code: "YENI2025" },
        createdAt: new Date("2025-03-10T14:30:00"),
        notes: null,
        vehicleCount: 1,
        isRoundTrip: true,
        agencyId: null,
        guestName: null
      }).returning();
      
      // Bekleyen rezervasyon
      const memberPendingRef = await generateUniqueBookingReference("MEM");
      const memberPending = await db.insert(bookings).values({
        userId: memberUserId,
        routeId: memberRoutes[2].id,
        scheduleId: memberSchedules[2].id,
        departureDate: "2025-07-10",
        totalPrice: "850.00",
        currency: "TRY",
        status: "pending",
        isPaid: false,
        bookingReference: memberPendingRef,
        paymentMethod: null,
        passengerCount: 1,
        specialRequests: null,
        contactPhone: "+905559876543",
        contactEmail: "member@ferryticket.com",
        metadata: { promo_applied: false, source: "mobile" },
        createdAt: new Date("2025-04-01T09:45:00"),
        notes: null,
        vehicleCount: 0,
        isRoundTrip: false,
        agencyId: null,
        guestName: null
      }).returning();
      
      // İptal edilmiş rezervasyon
      const memberCancelledRef = await generateUniqueBookingReference("MEM");
      const memberCancelled = await db.insert(bookings).values({
        userId: memberUserId,
        routeId: memberRoutes[3].id,
        scheduleId: memberSchedules[3].id,
        departureDate: "2025-06-05",
        totalPrice: "550.00",
        currency: "TRY",
        status: "cancelled",
        isPaid: true,
        bookingReference: memberCancelledRef,
        paymentMethod: "credit_card",
        passengerCount: 1,
        specialRequests: null,
        contactPhone: "+905559876543",
        contactEmail: "member@ferryticket.com",
        metadata: { promo_applied: false, source: "web" },
        createdAt: new Date("2025-03-15T16:20:00"),
        notes: "Müşteri iptali - para iadesi yapıldı",
        vehicleCount: 0,
        isRoundTrip: false,
        agencyId: null,
        guestName: null
      }).returning();
      
      // Yolcu ve ödeme eklemeleri
      
      // İlk tamamlanmış rezervasyon için
      if (memberCompleted1 && memberCompleted1[0]) {
        // Yolcu ekle
        await db.insert(bookingPassengers).values({
          bookingId: memberCompleted1[0].id,
          passengerTypeId: 1, // Adult
          firstName: "Üye",
          lastName: "Kullanıcı",
          identityNumber: "T76543210",
          dateOfBirth: "1990-10-20",
          gender: "male",
          nationality: "Turkish",
          price: "450.00",
          contact: "+905559876543"
        });
        
        // Ödeme ekle
        await db.insert(payments).values({
          bookingId: memberCompleted1[0].id,
          amount: "450.00",
          currency: "TRY",
          status: "completed",
          paymentMethod: "credit_card",
          transactionId: "TR" + Math.floor(10000000 + Math.random() * 90000000),
          paymentDate: new Date("2025-03-05T11:25:00"),
          cardLast4: "1234",
          metadata: {
            card_brand: "Mastercard",
            payment_provider: "stripe",
            customer_ip: "192.168.2.2"
          }
        });
      }
      
      // İkinci tamamlanmış rezervasyon için
      if (memberCompleted2 && memberCompleted2[0]) {
        // Yolcuları ekle
        await db.insert(bookingPassengers).values([
          {
            bookingId: memberCompleted2[0].id,
            passengerTypeId: 1, // Adult
            firstName: "Üye",
            lastName: "Kullanıcı",
            identityNumber: "T76543210",
            dateOfBirth: "1990-10-20",
            gender: "male",
            nationality: "Turkish",
            price: "600.00",
            contact: "+905559876543"
          },
          {
            bookingId: memberCompleted2[0].id,
            passengerTypeId: 1, // Adult
            firstName: "Elif",
            lastName: "Yılmaz",
            identityNumber: "T11223344",
            dateOfBirth: "1992-04-15",
            gender: "female",
            nationality: "Turkish",
            price: "600.00",
            contact: null
          }
        ]);
        
        // Ödeme ekle
        await db.insert(payments).values({
          bookingId: memberCompleted2[0].id,
          amount: "1600.00",
          currency: "TRY",
          status: "completed",
          paymentMethod: "bank_transfer",
          transactionId: "BT" + Math.floor(10000000 + Math.random() * 90000000),
          paymentDate: new Date("2025-03-10T16:45:00"),
          cardLast4: null,
          metadata: {
            bank_name: "Ziraat Bankası",
            account_ref: "ZR12345",
            payment_provider: "manual"
          }
        });
        
        // Araç ekle (SUV)
        const suvVehicleTypeId = await getVehicleTypeIdByName("SUV");
        
        if (suvVehicleTypeId) {
          await db.insert(vehicles).values({
            bookingId: memberCompleted2[0].id,
            vehicleTypeId: suvVehicleTypeId,
            licensePlate: "34XYZ789"
          });
        }
      }
      
      // Bekleyen rezervasyon için
      if (memberPending && memberPending[0]) {
        await db.insert(bookingPassengers).values({
          bookingId: memberPending[0].id,
          passengerTypeId: 1, // Adult
          firstName: "Üye",
          lastName: "Kullanıcı",
          identityNumber: "T76543210",
          dateOfBirth: "1990-10-20",
          gender: "male",
          nationality: "Turkish",
          price: "850.00",
          contact: "+905559876543"
        });
      }
      
      // İptal edilen rezervasyon için
      if (memberCancelled && memberCancelled[0]) {
        // Yolcu ekle
        await db.insert(bookingPassengers).values({
          bookingId: memberCancelled[0].id,
          passengerTypeId: 1, // Adult
          firstName: "Üye",
          lastName: "Kullanıcı",
          identityNumber: "T76543210",
          dateOfBirth: "1990-10-20",
          gender: "male",
          nationality: "Turkish",
          price: "550.00",
          contact: "+905559876543"
        });
        
        // Ödeme ve iade ekle
        await db.insert(payments).values([
          {
            bookingId: memberCancelled[0].id,
            amount: "550.00",
            currency: "TRY",
            status: "completed",
            paymentMethod: "credit_card",
            transactionId: "TR" + Math.floor(10000000 + Math.random() * 90000000),
            paymentDate: new Date("2025-03-15T16:25:00"),
            cardLast4: "9876",
            metadata: {
              card_brand: "Visa",
              payment_provider: "stripe",
              customer_ip: "192.168.2.2"
            }
          },
          {
            bookingId: memberCancelled[0].id,
            amount: "-550.00", // Negatif değer iade olduğunu gösterir
            currency: "TRY",
            status: "refunded",
            paymentMethod: "credit_card",
            transactionId: "RF" + Math.floor(10000000 + Math.random() * 90000000),
            paymentDate: new Date("2025-03-18T10:15:00"),
            cardLast4: "9876",
            metadata: {
              refund_reason: "customer_request",
              original_transaction_id: "TR12345678",
              payment_provider: "stripe",
              customer_ip: "192.168.2.2"
            }
          }
        ]);
      }
    }

    // Agent kullanıcısı için B2B rezervasyonlar
    if (agentUserId) {
      console.log("Agent kullanıcısı için B2B rezervasyonlar oluşturuluyor...");
      
      // Agent'a bağlı bir acente hesabı oluşturun (yoksa)
      const existingAgency = await db.query.agencies.findFirst({
        where: (agencies, { eq }) => eq(agencies.userId, agentUserId)
      });
      
      let agencyId;
      
      if (!existingAgency) {
        const newAgency = await db.insert(agencies).values({
          name: "TravelTime Agency",
          code: "TTA",
          type: "agent",
          userId: agentUserId,
          commissionRate: "10.00",
          isActive: true,
          address: "Istanbul, Turkey",
          phoneNumber: "+905554433221",
          email: "agent@ferryticket.com",
          discountRate: "5.00",
          contactPerson: "Agent Kullanıcı",
          logoUrl: null,
          website: "https://traveltime.example.com",
          description: "Travel services and ferry bookings",
          metadata: { registration_date: "2024-01-15" }
        }).returning();
        
        agencyId = newAgency[0].id;
      } else {
        agencyId = existingAgency.id;
      }
      
      // Agent için 5 rezervasyon oluşturun (2 tamamlanmış, 2 bekleyen, 1 iptal)
      const agentRoutes = await db.query.routes.findMany({ limit: 5 });
      const agentSchedules = await db.query.schedules.findMany({ limit: 5 });
      
      if (agentRoutes.length > 0 && agentSchedules.length > 0) {
        // Tamamlanmış rezervasyon 1
        const agentCompleted1Ref = await generateUniqueBookingReference("AGT");
        const agentCompleted1 = await db.insert(bookings).values({
          userId: agentUserId,
          routeId: agentRoutes[0].id,
          scheduleId: agentSchedules[0].id,
          departureDate: "2025-05-10",
          totalPrice: "900.00",
          currency: "TRY",
          status: "completed",
          isPaid: true,
          bookingReference: agentCompleted1Ref,
          paymentMethod: "bank_transfer",
          passengerCount: 2,
          specialRequests: null,
          contactPhone: "+905554433221",
          contactEmail: "agent@ferryticket.com",
          metadata: { 
            promo_applied: false, 
            source: "b2b", 
            customer_company: "ABC Tours",
            customer_reference: "ABC-2025-001"
          },
          createdAt: new Date("2025-03-01T09:00:00"),
          notes: "Corporate client booking",
          vehicleCount: 0,
          isRoundTrip: false,
          agencyId: agencyId,
          guestName: "Mehmet Aydın"
        }).returning();
        
        // Tamamlanmış rezervasyon 2
        const agentCompleted2Ref = await generateUniqueBookingReference("AGT");
        const agentCompleted2 = await db.insert(bookings).values({
          userId: agentUserId,
          routeId: agentRoutes[1].id,
          scheduleId: agentSchedules[1].id,
          departureDate: "2025-05-20",
          returnDate: "2025-05-27",
          totalPrice: "1700.00",
          currency: "TRY",
          status: "completed",
          isPaid: true,
          bookingReference: agentCompleted2Ref,
          paymentMethod: "agency_credit",
          passengerCount: 2,
          specialRequests: "Özel araç park alanı ve VIP giriş",
          contactPhone: "+905554433221",
          contactEmail: "agent@ferryticket.com",
          metadata: { 
            promo_applied: false, 
            source: "b2b",
            customer_company: "XYZ Travels",
            customer_reference: "XYZ-2025-056"
          },
          createdAt: new Date("2025-03-15T14:00:00"),
          notes: "VIP client",
          vehicleCount: 1,
          isRoundTrip: true,
          agencyId: agencyId,
          guestName: "Ayşe Demir"
        }).returning();
        
        // Bekleyen rezervasyon 1
        const agentPending1Ref = await generateUniqueBookingReference("AGT");
        const agentPending1 = await db.insert(bookings).values({
          userId: agentUserId,
          routeId: agentRoutes[2].id,
          scheduleId: agentSchedules[2].id,
          departureDate: "2025-06-15",
          totalPrice: "1200.00",
          currency: "TRY",
          status: "pending",
          isPaid: false,
          bookingReference: agentPending1Ref,
          paymentMethod: null,
          passengerCount: 3,
          specialRequests: null,
          contactPhone: "+905554433221",
          contactEmail: "agent@ferryticket.com",
          metadata: { 
            promo_applied: false, 
            source: "b2b",
            customer_company: "Global Travels",
            customer_reference: "GT-2025-100"
          },
          createdAt: new Date("2025-04-05T10:15:00"),
          notes: "Beklemede, ödeme onayı bekleniyor",
          vehicleCount: 1,
          isRoundTrip: false,
          agencyId: agencyId,
          guestName: "Can Yılmaz"
        }).returning();
        
        // Bekleyen rezervasyon 2
        const agentPending2Ref = await generateUniqueBookingReference("AGT");
        const agentPending2 = await db.insert(bookings).values({
          userId: agentUserId,
          routeId: agentRoutes[3].id,
          scheduleId: agentSchedules[3].id,
          departureDate: "2025-07-01",
          returnDate: "2025-07-08",
          totalPrice: "2100.00",
          currency: "TRY",
          status: "pending",
          isPaid: false,
          bookingReference: agentPending2Ref,
          paymentMethod: null,
          passengerCount: 4,
          specialRequests: "Grup rezervasyonu, yan yana koltuklar",
          contactPhone: "+905554433221",
          contactEmail: "agent@ferryticket.com",
          metadata: { 
            promo_applied: false, 
            source: "b2b",
            customer_company: "Relax Tours",
            customer_reference: "RT-2025-212"
          },
          createdAt: new Date("2025-04-10T11:30:00"),
          notes: "Grup rezervasyonu",
          vehicleCount: 0,
          isRoundTrip: true,
          agencyId: agencyId,
          guestName: "Okan Şahin"
        }).returning();
        
        // İptal edilmiş rezervasyon
        const agentCancelledRef = await generateUniqueBookingReference("AGT");
        const agentCancelled = await db.insert(bookings).values({
          userId: agentUserId,
          routeId: agentRoutes[4].id,
          scheduleId: agentSchedules[4].id,
          departureDate: "2025-05-05",
          totalPrice: "800.00",
          currency: "TRY",
          status: "cancelled",
          isPaid: true,
          bookingReference: agentCancelledRef,
          paymentMethod: "agency_credit",
          passengerCount: 1,
          specialRequests: null,
          contactPhone: "+905554433221",
          contactEmail: "agent@ferryticket.com",
          metadata: { 
            promo_applied: false, 
            source: "b2b",
            customer_company: "Happy Holidays",
            customer_reference: "HH-2025-089"
          },
          createdAt: new Date("2025-02-20T16:00:00"),
          notes: "Müşteri isteği üzerine iptal edildi",
          vehicleCount: 0,
          isRoundTrip: false,
          agencyId: agencyId,
          guestName: "Zeynep Kaya"
        }).returning();
        
        // Yolcu ve ödeme eklemeleri
        
        // Tamamlanmış 1. rezervasyon için
        if (agentCompleted1 && agentCompleted1[0]) {
          // Yolcular
          await db.insert(bookingPassengers).values([
            {
              bookingId: agentCompleted1[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Mehmet",
              lastName: "Aydın",
              identityNumber: "T11223344",
              dateOfBirth: "1975-06-18",
              gender: "male",
              nationality: "Turkish",
              price: "450.00",
              contact: "+905551122334"
            },
            {
              bookingId: agentCompleted1[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Fatma",
              lastName: "Aydın",
              identityNumber: "T22334455",
              dateOfBirth: "1978-09-25",
              gender: "female",
              nationality: "Turkish",
              price: "450.00",
              contact: null
            }
          ]);
          
          // Ödeme
          await db.insert(payments).values({
            bookingId: agentCompleted1[0].id,
            amount: "900.00",
            currency: "TRY",
            status: "completed",
            paymentMethod: "bank_transfer",
            transactionId: "BT" + Math.floor(10000000 + Math.random() * 90000000),
            paymentDate: new Date("2025-03-02T10:00:00"),
            cardLast4: null,
            metadata: {
              bank_name: "İş Bankası",
              account_ref: "IS98765",
              payment_provider: "manual"
            }
          });
        }
        
        // Tamamlanmış 2. rezervasyon için
        if (agentCompleted2 && agentCompleted2[0]) {
          // Yolcular
          await db.insert(bookingPassengers).values([
            {
              bookingId: agentCompleted2[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Ayşe",
              lastName: "Demir",
              identityNumber: "T33445566",
              dateOfBirth: "1982-11-10",
              gender: "female",
              nationality: "Turkish",
              price: "600.00",
              contact: "+905559988776"
            },
            {
              bookingId: agentCompleted2[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Ali",
              lastName: "Demir",
              identityNumber: "T44556677",
              dateOfBirth: "1980-03-25",
              gender: "male",
              nationality: "Turkish",
              price: "600.00",
              contact: null
            }
          ]);
          
          // Ödeme
          await db.insert(payments).values({
            bookingId: agentCompleted2[0].id,
            amount: "1700.00",
            currency: "TRY",
            status: "completed",
            paymentMethod: "agency_credit",
            transactionId: "AC" + Math.floor(10000000 + Math.random() * 90000000),
            paymentDate: new Date("2025-03-16T09:00:00"),
            cardLast4: null,
            metadata: {
              agency_id: agencyId,
              payment_provider: "internal"
            }
          });
          
          // Araç
          const luxuryVehicleTypeId = await getVehicleTypeIdByName("Luxury Car");
          
          if (luxuryVehicleTypeId) {
            await db.insert(vehicles).values({
              bookingId: agentCompleted2[0].id,
              vehicleTypeId: luxuryVehicleTypeId,
              licensePlate: "34VIP999"
            });
          }
        }
        
        // Bekleyen 1. rezervasyon için
        if (agentPending1 && agentPending1[0]) {
          // Yolcular
          await db.insert(bookingPassengers).values([
            {
              bookingId: agentPending1[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Can",
              lastName: "Yılmaz",
              identityNumber: "T55667788",
              dateOfBirth: "1990-07-14",
              gender: "male",
              nationality: "Turkish",
              price: "400.00",
              contact: "+905553322110"
            },
            {
              bookingId: agentPending1[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Seda",
              lastName: "Yılmaz",
              identityNumber: "T66778899",
              dateOfBirth: "1992-12-05",
              gender: "female",
              nationality: "Turkish",
              price: "400.00",
              contact: null
            },
            {
              bookingId: agentPending1[0].id,
              passengerTypeId: 2, // Child
              firstName: "Arda",
              lastName: "Yılmaz",
              identityNumber: "T77889900",
              dateOfBirth: "2018-02-20",
              gender: "male",
              nationality: "Turkish",
              price: "200.00",
              contact: null
            }
          ]);
          
          // Araç
          const minivanVehicleTypeId = await getVehicleTypeIdByName("Minivan");
          
          if (minivanVehicleTypeId) {
            await db.insert(vehicles).values({
              bookingId: agentPending1[0].id,
              vehicleTypeId: minivanVehicleTypeId,
              licensePlate: "34ABC456"
            });
          }
        }
        
        // Bekleyen 2. rezervasyon için
        if (agentPending2 && agentPending2[0]) {
          // Yolcular (4 yetişkin grup)
          await db.insert(bookingPassengers).values([
            {
              bookingId: agentPending2[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Okan",
              lastName: "Şahin",
              identityNumber: "T88990011",
              dateOfBirth: "1985-08-30",
              gender: "male",
              nationality: "Turkish",
              price: "525.00",
              contact: "+905556677889"
            },
            {
              bookingId: agentPending2[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Deniz",
              lastName: "Şahin",
              identityNumber: "T99001122",
              dateOfBirth: "1986-03-15",
              gender: "female",
              nationality: "Turkish",
              price: "525.00",
              contact: null
            },
            {
              bookingId: agentPending2[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Hakan",
              lastName: "Yıldız",
              identityNumber: "T00112233",
              dateOfBirth: "1984-11-22",
              gender: "male",
              nationality: "Turkish",
              price: "525.00",
              contact: "+905551122334"
            },
            {
              bookingId: agentPending2[0].id,
              passengerTypeId: 1, // Adult
              firstName: "Aslı",
              lastName: "Yıldız",
              identityNumber: "T11223344",
              dateOfBirth: "1987-06-18",
              gender: "female",
              nationality: "Turkish",
              price: "525.00",
              contact: null
            }
          ]);
        }
        
        // İptal edilmiş rezervasyon için
        if (agentCancelled && agentCancelled[0]) {
          // Yolcu
          await db.insert(bookingPassengers).values({
            bookingId: agentCancelled[0].id,
            passengerTypeId: 1, // Adult
            firstName: "Zeynep",
            lastName: "Kaya",
            identityNumber: "T22334455",
            dateOfBirth: "1972-04-10",
            gender: "female",
            nationality: "Turkish",
            price: "800.00",
            contact: "+905557788990"
          });
          
          // Ödeme ve iade
          await db.insert(payments).values([
            {
              bookingId: agentCancelled[0].id,
              amount: "800.00",
              currency: "TRY",
              status: "completed",
              paymentMethod: "agency_credit",
              transactionId: "AC" + Math.floor(10000000 + Math.random() * 90000000),
              paymentDate: new Date("2025-02-21T10:00:00"),
              cardLast4: null,
              metadata: {
                agency_id: agencyId,
                payment_provider: "internal"
              }
            },
            {
              bookingId: agentCancelled[0].id,
              amount: "-800.00", // Negatif değer iade olduğunu gösterir
              currency: "TRY",
              status: "refunded",
              paymentMethod: "agency_credit",
              transactionId: "RF" + Math.floor(10000000 + Math.random() * 90000000),
              paymentDate: new Date("2025-02-28T14:00:00"),
              cardLast4: null,
              metadata: {
                refund_reason: "customer_request",
                original_transaction_id: "AC12345678",
                agency_id: agencyId,
                payment_provider: "internal"
              }
            }
          ]);
        }
      }
    }

    console.log("Örnek veri oluşturma işlemi tamamlandı!");
  } catch (error) {
    console.error("Örnek veri oluşturma hatası:", error);
  }
}

// Çalıştır
populateSampleData().then(() => {
  console.log("İşlem tamamlandı.");
  process.exit(0);
});