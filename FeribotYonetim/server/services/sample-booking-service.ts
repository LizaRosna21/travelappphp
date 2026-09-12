import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format, subDays } from 'date-fns';

// Kullanıcı başına örnek rezervasyon oluşturma
export async function createSampleBookingsForUser(userId: number, username: string) {
  console.log(`${username} için örnek rezervasyon verileri oluşturuluyor...`);
  
  try {
    // Mevcut rezervasyonları kontrol et
    const existingBookings = await storage.getBookingsByUser(userId);
    if (existingBookings && existingBookings.length > 0) {
      console.log(`${username} için zaten ${existingBookings.length} rezervasyon mevcut, yeni oluşturulmuyor.`);
      return existingBookings;
    }
    
    // Rotaları ve liman bilgilerini al
    const routes = await storage.getAllRoutes();
    const ports = await storage.getAllPorts();
    const vehicleTypes = await storage.getAllVehicleTypes();
    const passengerTypes = await storage.getAllPassengerTypes();
    
    if (!routes || routes.length === 0) {
      console.log("Örnek veri oluşturulamadı: Rota bulunamadı");
      return null;
    }
    
    // Örnek rezervasyon sayısı (kullanıcı tipine göre değişir)
    let bookingCount = 2; // varsayılan
    if (username === 'demo') bookingCount = 5;
    if (username === 'agent') bookingCount = 8;
    
    const createdBookings = [];
    const today = new Date();
    
    // Kullanıcı için rezervasyonlar oluştur
    for (let i = 0; i < bookingCount; i++) {
      // Her rezervasyon için rastgele rota seç
      const randomRouteIndex = Math.floor(Math.random() * routes.length);
      const selectedRoute = routes[randomRouteIndex];
      
      // Rezervasyon tarihleri oluştur
      // Bazıları geçmiş, bazıları gelecek tarihli
      let departureDate;
      let status;
      let isPaid;
      
      if (i % 3 === 0) {
        // Geçmiş tarihli rezervasyon
        departureDate = format(subDays(today, 15 + i * 3), 'yyyy-MM-dd');
        status = "completed";
        isPaid = true;
      } else if (i % 3 === 1) {
        // Yakın gelecek tarihli rezervasyon
        departureDate = format(addDays(today, 2 + i), 'yyyy-MM-dd');
        status = "confirmed";
        isPaid = true;
      } else {
        // Uzak gelecek tarihli rezervasyon
        departureDate = format(addDays(today, 25 + i * 2), 'yyyy-MM-dd');
        status = "pending";
        isPaid = false;
      }
      
      // Rastgele bilet fiyatı oluştur
      const basePrice = parseFloat(selectedRoute.basePrice);
      const passengerCount = Math.floor(Math.random() * 4) + 1;
      const totalPrice = (basePrice * passengerCount + Math.floor(Math.random() * 100)).toFixed(2);
      
      // Benzersiz PNR ve bilet numarası oluştur
      const pnrLetter = username.substring(0, 1).toUpperCase();
      const bookingReference = `FB${pnrLetter}${Math.floor(10000 + Math.random() * 90000)}`;
      const ticketNumber = `TKT${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Rezervasyon oluştur
      const bookingData = {
        userId: userId,
        routeId: selectedRoute.id,
        scheduleId: 1, // Varsayılan schedule ID
        departureDate: departureDate,
        returnDate: null, // Tek yön bilet
        totalPrice: totalPrice,
        currency: "TRY",
        status: status,
        isPaid: isPaid,
        bookingReference: bookingReference,
        ticketNumber: ticketNumber,
        paymentMethod: isPaid ? "credit_card" : null,
        paymentId: isPaid ? `PAY${uuidv4().substring(0, 8)}` : null,
        bookingDate: format(subDays(today, i), 'yyyy-MM-dd'),
        passengerCount: passengerCount,
        specialRequests: null,
        contactPhone: "+90555" + Math.floor(1000000 + Math.random() * 9000000),
        contactEmail: `${username}@example.com`,
        isRoundTrip: false,
        guestName: null
      };
      
      // Veritabanına kaydet
      try {
        const newBooking = await storage.createBooking(bookingData);
        
        // Yolcu bilgileri ekle
        if (newBooking) {
          // Yolcu sayısı kadar yolcu bilgisi ekle
          for (let p = 0; p < passengerCount; p++) {
            const isMainPassenger = p === 0;
            const passengerTypeId = isMainPassenger ? 1 : Math.floor(Math.random() * passengerTypes.length) + 1;
            
            const passengerData = {
              bookingId: newBooking.id,
              passengerTypeId: passengerTypeId,
              firstName: isMainPassenger ? username : `Passenger${p}`,
              lastName: isMainPassenger ? "User" : `Family${p}`,
              identityNumber: Math.floor(10000000000 + Math.random() * 90000000000).toString(),
              dateOfBirth: format(subDays(today, 3650 + p * 1000), 'yyyy-MM-dd'),
              gender: Math.random() > 0.5 ? "male" : "female",
              nationality: "Turkey",
              price: (basePrice * (passengerTypeId === 2 ? 0.5 : 1)).toFixed(2),
              contact: isMainPassenger ? bookingData.contactPhone : null
            };
            
            await storage.createBookingPassenger(passengerData);
          }
          
          // Rastgele araç bilgisi ekle (%30 ihtimalle)
          if (Math.random() < 0.3) {
            const vehicleTypeId = Math.floor(Math.random() * vehicleTypes.length) + 1;
            
            const vehicleData = {
              bookingId: newBooking.id,
              vehicleTypeId: vehicleTypeId,
              licensePlate: `${Math.floor(10 + Math.random() * 89)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(10 + Math.random() * 89)}`
            };
            
            await storage.createBookingVehicle(vehicleData);
          }
          
          createdBookings.push(newBooking);
        }
      } catch (error) {
        console.error(`Rezervasyon oluşturma hatası: ${error}`);
      }
    }
    
    console.log(`${username} için toplam ${createdBookings.length} örnek rezervasyon oluşturuldu.`);
    return createdBookings;
    
  } catch (error) {
    console.error(`Örnek rezervasyon oluşturma hatası: ${error}`);
    return null;
  }
}