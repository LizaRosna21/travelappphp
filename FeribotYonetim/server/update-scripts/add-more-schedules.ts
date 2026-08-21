import { storage } from "../storage";
import { db } from "../db";
import { insertScheduleSchema } from "@shared/schema";

// Tüm rotalar için ek sefer takvimi oluşturalım
async function addMoreSchedules() {
  try {
    console.log("Ek seferler ekleniyor...");
    
    // TÜM ROTALAR İÇİN SEFERLER
    
    // Rota 1: Istanbul Port - Athens Port (zaten 2 sefer var, 2 daha ekleyelim)
    const istanbulAthensSchedules = [
      {
        routeId: 1,
        departureTime: "10:30:00",
        arrivalTime: "18:30:00",
        daysOfWeek: "1,2,3,4,5",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 450,
        passengerCapacity: 400,
        vehicleCapacity: 50,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: true,
        fareType: "standard",
        hasPromotion: false,
      },
      {
        routeId: 1,
        departureTime: "23:30:00",
        arrivalTime: "07:30:00",
        daysOfWeek: "0,5,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 450,
        passengerCapacity: 400,
        vehicleCapacity: 50,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: true,
        fareType: "economy",
        hasPromotion: true,
        promotionDescription: "Gece Seferi İndirimi",
      }
    ];
    
    // Rota 2: Istanbul Port - Izmir Port (zaten 2 sefer var, 3 daha ekleyelim)
    const istanbulIzmirSchedules = [
      {
        routeId: 2,
        departureTime: "07:00:00",
        arrivalTime: "12:00:00",
        daysOfWeek: "1,2,3,4,5",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 300,
        passengerCapacity: 280,
        vehicleCapacity: 20,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: true,
        fareType: "express",
        hasPromotion: true,
        promotionDescription: "Sabah Ekspres",
      },
      {
        routeId: 2,
        departureTime: "12:30:00",
        arrivalTime: "17:30:00",
        daysOfWeek: "0,1,2,3,4,5,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 300,
        passengerCapacity: 280,
        vehicleCapacity: 20,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: false,
        fareType: "standard",
        hasPromotion: false,
      },
      {
        routeId: 2,
        departureTime: "22:00:00",
        arrivalTime: "03:00:00",
        daysOfWeek: "0,4,5,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 300,
        passengerCapacity: 280,
        vehicleCapacity: 20,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: false,
        fareType: "economy",
        hasPromotion: true,
        promotionDescription: "Gece İndirimi",
      }
    ];
    
    // Rota 3: Izmir Port - Athens Port (sadece 1 sefer var, 3 daha ekleyelim)
    const izmirAthensSchedules = [
      {
        routeId: 3,
        departureTime: "08:45:00",
        arrivalTime: "12:45:00",
        daysOfWeek: "1,3,5",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 350,
        passengerCapacity: 320,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: true,
        fareType: "express",
        hasPromotion: false,
      },
      {
        routeId: 3,
        departureTime: "14:30:00",
        arrivalTime: "18:30:00",
        daysOfWeek: "0,2,4,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 350,
        passengerCapacity: 320,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: false,
        fareType: "standard",
        hasPromotion: false,
      },
      {
        routeId: 3,
        departureTime: "19:30:00",
        arrivalTime: "23:30:00",
        daysOfWeek: "1,3,5,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 350,
        passengerCapacity: 320,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: false,
        fareType: "standard",
        hasPromotion: true,
        promotionDescription: "Akşam Seferi İndirimi",
      }
    ];
    
    // Rota 4: Athens Port - Venice Port (hiç sefer yok, 2 tane ekleyelim)
    const athensVeniceSchedules = [
      {
        routeId: 4,
        departureTime: "09:00:00",
        arrivalTime: "21:00:00",
        daysOfWeek: "1,4",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 400,
        passengerCapacity: 370,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: true,
        fareType: "premium",
        hasPromotion: false,
      },
      {
        routeId: 4,
        departureTime: "20:00:00",
        arrivalTime: "08:00:00",
        daysOfWeek: "0,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 400,
        passengerCapacity: 370,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: false,
        fareType: "economy",
        hasPromotion: true,
        promotionDescription: "Hafta Sonu Gece İndirimi",
      }
    ];
    
    // Rota 5: Venice Port - Marseille Port (hiç sefer yok, 2 tane ekleyelim)
    const veniceMarseilleShedules = [
      {
        routeId: 5,
        departureTime: "08:30:00",
        arrivalTime: "17:30:00",
        daysOfWeek: "2,5",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 380,
        passengerCapacity: 350,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: true,
        fareType: "premium",
        hasPromotion: false,
      },
      {
        routeId: 5,
        departureTime: "19:00:00",
        arrivalTime: "04:00:00",
        daysOfWeek: "0,3,6",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        capacity: 380,
        passengerCapacity: 350,
        vehicleCapacity: 30,
        isActive: true,
        isSpecialSchedule: false,
        isFull: false,
        isPopular: false,
        fareType: "economy",
        hasPromotion: true,
        promotionDescription: "Akşam Seferi İndirimi",
      }
    ];
    
    // Tüm seferleri bir araya topla
    const allNewSchedules = [
      ...istanbulAthensSchedules,
      ...istanbulIzmirSchedules,
      ...izmirAthensSchedules,
      ...athensVeniceSchedules,
      ...veniceMarseilleShedules
    ];
    
    // Her sefer için ekleme işlemini gerçekleştir
    for (const schedule of allNewSchedules) {
      try {
        const validSchedule = insertScheduleSchema.parse(schedule);
        await storage.createSchedule(validSchedule);
        console.log(`Sefer eklendi: Rota ${schedule.routeId}, Saat: ${schedule.departureTime}`);
      } catch (error) {
        console.error(`Sefer eklenirken hata oluştu: Rota ${schedule.routeId}, Saat: ${schedule.departureTime}`, error);
      }
    }
    
    console.log("Sefer takvimi başarıyla güncellendi!");
    
  } catch (error) {
    console.error("Sefer takvimi güncellenirken hata oluştu:", error);
  }
}

// Fonksiyonu çalıştır
addMoreSchedules().catch(console.error);