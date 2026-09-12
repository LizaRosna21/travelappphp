import { db } from '../db';
import { bookings, bookingPassengers, users, routes, schedules } from '@shared/schema';
import { eq, and, gte, lte, sum, count, sql, desc, asc } from 'drizzle-orm';
import { storage } from '../storage';

export interface RouteRecommendation {
  id: number;
  departurePort: string;
  arrivalPort: string;
  basePrice: string;
  duration: number;
  matchScore: number;
  reason: string;
  departurePortCountry?: string;
  arrivalPortCountry?: string;
  nextDeparture?: string;
  seatsAvailable?: number;
  discountedPrice?: string | null;
  discount?: number;
}

export interface PriceRecommendation {
  basePrice: string;
  recommendedPrice: string;
  discountedPrice: string | null;
  priceChange: number;
  confidence: number;
  factors: {
    demand: number;
    seasonal: number;
    occupancy: number;
    dayOfWeek: number;
    competition: number;
  };
  reasoning: string;
  explanations: {
    demand: string;
    seasonal: string;
    occupancy: string;
    dayOfWeek: string;
    competition: string;
  };
}

export class AIRecommendationService {
  /**
   * Kişiselleştirilmiş rota önerileri alır
   * 
   * @param userId Kullanıcı ID'si
   * @returns Rota önerileri
   */
  async getPersonalizedRouteRecommendations(userId: number): Promise<RouteRecommendation[]> {
    try {
      // Kullanıcının geçmiş rezervasyonlarını al
      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.userId, userId));

      if (!userBookings.length) {
        return this.getDefaultRecommendations();
      }

      // Favori rotaları bul
      const routeFrequencies: Record<number, number> = {};
      for (const booking of userBookings) {
        routeFrequencies[booking.routeId] = (routeFrequencies[booking.routeId] || 0) + 1;
      }

      // Kullanıcı tercihlerini analiz et
      const userPreferences = {
        favoriteRouteIds: Object.entries(routeFrequencies)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(entry => parseInt(entry[0])),
        averagePassengers: await this.getAveragePassengerCount(userId),
        preferredSeasons: this.getPreferredSeasons(userBookings),
        preferredWeekdays: this.getPreferredWeekdays(userBookings)
      };

      // Tüm rotaları al
      const allRoutes = await storage.getAllRoutes();
      
      // Kullanıcının favori rotaları
      const favoriteRoutes = allRoutes.filter(route => 
        userPreferences.favoriteRouteIds.includes(route.id)
      );

      // Kullanıcı favori destinasyonlarını tespit et
      const favoriteDeparturePorts = new Set(favoriteRoutes.map(r => r.departurePort));
      const favoriteArrivalPorts = new Set(favoriteRoutes.map(r => r.arrivalPort));

      // Benzer rotaları belirle
      const similarRoutes = allRoutes.filter(route => 
        !userPreferences.favoriteRouteIds.includes(route.id) && 
        (favoriteDeparturePorts.has(route.departurePort) || favoriteArrivalPorts.has(route.arrivalPort))
      );

      // Popüler rotalar
      const popularRoutes = await this.getPopularRoutes();
      
      // Önerileri birleştir ve puanla
      let recommendations: RouteRecommendation[] = [];
      
      // Favori rotaları ekle
      for (const route of favoriteRoutes) {
        const nextSchedule = await this.getNextAvailableSchedule(route.id);
        const matchScore = Math.floor(Math.random() * 16) + 85; // 85-100 arası
        
        recommendations.push({
          id: route.id,
          departurePort: route.departurePort,
          arrivalPort: route.arrivalPort,
          basePrice: route.basePrice,
          duration: route.duration,
          matchScore,
          reason: "Sık seyahat ettiğiniz bir rota",
          departurePortCountry: route.countryDeparture || undefined,
          arrivalPortCountry: route.countryArrival || undefined,
          nextDeparture: nextSchedule?.departureTime || undefined,
          seatsAvailable: nextSchedule ? Math.floor(Math.random() * 40) + 10 : undefined
        });
      }
      
      // Benzer rotaları ekle
      for (const route of similarRoutes.slice(0, 3)) {
        const matchScore = Math.floor(Math.random() * 16) + 70; // 70-85 arası
        const nextSchedule = await this.getNextAvailableSchedule(route.id);
        
        const reason = favoriteDeparturePorts.has(route.departurePort)
          ? `${route.departurePort}'den sık seyahat ediyorsunuz`
          : `${route.arrivalPort}'e sık seyahat ediyorsunuz`;
        
        recommendations.push({
          id: route.id,
          departurePort: route.departurePort,
          arrivalPort: route.arrivalPort,
          basePrice: route.basePrice,
          duration: route.duration,
          matchScore,
          reason,
          departurePortCountry: route.countryDeparture || undefined,
          arrivalPortCountry: route.countryArrival || undefined,
          nextDeparture: nextSchedule?.departureTime || undefined,
          seatsAvailable: nextSchedule ? Math.floor(Math.random() * 50) + 5 : undefined
        });
      }
      
      // Popüler rotaları ekle
      for (const route of popularRoutes.slice(0, 3)) {
        // Eğer zaten eklenmediyse
        if (!recommendations.some(r => r.id === route.id)) {
          const matchScore = Math.floor(Math.random() * 21) + 60; // 60-80 arası
          const nextSchedule = await this.getNextAvailableSchedule(route.id);
          
          // Bazı rotalara indirim uygula
          const hasDiscount = Math.random() > 0.7;
          const discount = hasDiscount ? Math.floor(Math.random() * 16) + 10 : undefined; // 10-25 arası
          
          const basePrice = parseFloat(route.basePrice);
          const discountedPrice = discount 
            ? (basePrice * (1 - discount / 100)).toFixed(2) 
            : null;
          
          recommendations.push({
            id: route.id,
            departurePort: route.departurePort,
            arrivalPort: route.arrivalPort,
            basePrice: route.basePrice,
            duration: route.duration,
            matchScore,
            reason: "Bu dönemde popüler bir rota",
            departurePortCountry: route.countryDeparture || undefined,
            arrivalPortCountry: route.countryArrival || undefined,
            nextDeparture: nextSchedule?.departureTime || undefined,
            seatsAvailable: nextSchedule ? Math.floor(Math.random() * 70) + 30 : undefined,
            discountedPrice,
            discount
          });
        }
      }
      
      // Puanlarına göre sırala
      recommendations = recommendations.sort((a, b) => b.matchScore - a.matchScore);
      
      // En fazla 6 öneri döndür
      return recommendations.slice(0, 6);
    } catch (error) {
      console.error("Error in AI route recommendations:", error);
      return this.getDefaultRecommendations();
    }
  }

  /**
   * Varsayılan rota önerileri
   * 
   * @returns Önerilen rotalar
   */
  private async getDefaultRecommendations(): Promise<RouteRecommendation[]> {
    try {
      const popularRoutes = await this.getPopularRoutes();
      const recommendations: RouteRecommendation[] = [];
      
      for (const route of popularRoutes.slice(0, 6)) {
        const nextSchedule = await this.getNextAvailableSchedule(route.id);
        const hasDiscount = Math.random() > 0.7;
        const discount = hasDiscount ? Math.floor(Math.random() * 16) + 10 : undefined;
        
        const basePrice = parseFloat(route.basePrice);
        const discountedPrice = discount 
          ? (basePrice * (1 - discount / 100)).toFixed(2) 
          : null;
        
        recommendations.push({
          id: route.id,
          departurePort: route.departurePort,
          arrivalPort: route.arrivalPort,
          basePrice: route.basePrice,
          duration: route.duration,
          matchScore: Math.floor(Math.random() * 21) + 60,
          reason: "Popüler bir rota",
          departurePortCountry: route.countryDeparture || undefined,
          arrivalPortCountry: route.countryArrival || undefined,
          nextDeparture: nextSchedule?.departureTime || undefined,
          seatsAvailable: nextSchedule ? Math.floor(Math.random() * 70) + 30 : undefined,
          discountedPrice,
          discount
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error("Error getting default recommendations:", error);
      return [];
    }
  }

  /**
   * Kullanıcının ortalama yolcu sayısı
   */
  private async getAveragePassengerCount(userId: number): Promise<number> {
    try {
      const userBookingIds = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.userId, userId));
      
      if (!userBookingIds.length) return 0;
      
      const passengerCounts = await Promise.all(
        userBookingIds.map(async ({ id }) => {
          const passengers = await db
            .select()
            .from(bookingPassengers)
            .where(eq(bookingPassengers.bookingId, id));
          return passengers.length;
        })
      );
      
      const totalPassengers = passengerCounts.reduce((sum, count) => sum + count, 0);
      return Math.round(totalPassengers / userBookingIds.length);
    } catch (error) {
      console.error("Error getting average passenger count:", error);
      return 2; // Varsayılan değer
    }
  }

  /**
   * Tercih edilen seyahat mevsimlerini belirle
   */
  private getPreferredSeasons(userBookings: typeof bookings.$inferSelect[]): string[] {
    const seasonCounts: Record<string, number> = {
      'winter': 0,
      'spring': 0,
      'summer': 0,
      'fall': 0
    };
    
    for (const booking of userBookings) {
      const date = new Date(booking.departureDate);
      const month = date.getMonth();
      
      // Mevsimleri belirle (Kuzey Yarımküre için)
      if (month >= 2 && month <= 4) seasonCounts.spring++;
      else if (month >= 5 && month <= 7) seasonCounts.summer++;
      else if (month >= 8 && month <= 10) seasonCounts.fall++;
      else seasonCounts.winter++;
    }
    
    // En çok tercih edilen mevsimleri bul
    return Object.entries(seasonCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0)
      .map(([season]) => season);
  }

  /**
   * Tercih edilen haftaiçi/haftasonu belirle
   */
  private getPreferredWeekdays(userBookings: typeof bookings.$inferSelect[]): string[] {
    const weekdayCounts: Record<string, number> = {
      'weekday': 0,
      'weekend': 0
    };
    
    for (const booking of userBookings) {
      const date = new Date(booking.departureDate);
      const day = date.getDay();
      
      // 0: Pazar, 6: Cumartesi
      if (day === 0 || day === 6) weekdayCounts.weekend++;
      else weekdayCounts.weekday++;
    }
    
    // En çok tercih edilenden başlayarak sırala
    return Object.entries(weekdayCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0)
      .map(([type]) => type);
  }

  /**
   * En popüler rotaları al
   */
  private async getPopularRoutes() {
    try {
      // Tüm rotaları al ve `isPopular` özelliğine göre filtrele
      const allRoutes = await storage.getAllRoutes();
      
      // Filtreleme ve sıralama
      // Önce isPopular=true olan rotaları bul, yoksa rastgele 10 tanesini göster
      // Not: Schema değişikliklerinden sonra kontrol edilmeli
      const popularRoutes = allRoutes.filter(route => route.isPopular === true);
      
      if (popularRoutes.length > 0) {
        return popularRoutes.slice(0, 10);
      }
      
      // Popüler rota yoksa rastgele göster
      return allRoutes
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
    } catch (error) {
      console.error("Error getting popular routes:", error);
      // Hata durumunda boş dizi dön
      return [];
    }
  }

  /**
   * Belirli bir rota için bir sonraki müsait tarifenin bilgisini al
   */
  private async getNextAvailableSchedule(routeId: number) {
    try {
      const scheduleList = await storage.getSchedulesByRoute(routeId);
      if (!scheduleList.length) return null;
      
      // Rastgele bir tarife seç (gerçekte tarih ve zamana göre filtrelenir)
      return scheduleList[Math.floor(Math.random() * scheduleList.length)];
    } catch (error) {
      console.error(`Error getting next schedule for route ${routeId}:`, error);
      return null;
    }
  }

  /**
   * Dinamik fiyatlandırma önerileri al
   */
  async getDynamicPricing(
    routeId: number,
    departureDate: string,
    passengerTypes: any[]
  ): Promise<PriceRecommendation> {
    try {
      const route = await storage.getRoute(routeId);
      if (!route) {
        throw new Error("Route not found");
      }
      
      // Toplam yolcu sayısını hesapla
      const totalPassengers = passengerTypes.reduce((sum, p) => sum + p.count, 0);
      
      // Temel fiyatı hesapla
      const basePrice = parseFloat(route.basePrice);
      
      // AI modelinden alınacak faktörler (simüle ediliyor)
      const demandFactor = this.calculateDemandFactor(departureDate);
      const seasonalFactor = this.calculateSeasonalFactor(departureDate);
      const occupancyFactor = this.calculateOccupancyFactor(routeId, departureDate);
      const dayOfWeekFactor = this.calculateDayOfWeekFactor(departureDate);
      const competitionFactor = this.calculateCompetitionFactor(route);
      
      // Fiyat değişimini hesapla
      const priceChangePercentage = this.calculatePriceChangePercentage(
        demandFactor,
        seasonalFactor,
        occupancyFactor,
        dayOfWeekFactor,
        competitionFactor
      );
      
      // Önerilen fiyatı hesapla
      const recommendedPrice = (basePrice * (1 + priceChangePercentage / 100)).toFixed(2);
      
      // İndirim uygula mı?
      let discountedPrice = null;
      if (priceChangePercentage < -5 && totalPassengers >= 3) {
        discountedPrice = (basePrice * 0.9).toFixed(2); // %10 indirim
      }
      
      // Faktörlerin açıklamalarını oluştur
      const explanations = {
        demand: this.getExplanationForDemandFactor(demandFactor),
        seasonal: this.getExplanationForSeasonalFactor(seasonalFactor, departureDate),
        occupancy: this.getExplanationForOccupancyFactor(occupancyFactor),
        dayOfWeek: this.getExplanationForDayOfWeekFactor(dayOfWeekFactor, departureDate),
        competition: this.getExplanationForCompetitionFactor(competitionFactor)
      };
      
      // Genel açıklama metni oluştur
      const reasoning = this.generateReasoning(
        priceChangePercentage,
        demandFactor,
        seasonalFactor,
        occupancyFactor,
        dayOfWeekFactor,
        competitionFactor,
        departureDate
      );
      
      // Güven seviyesini hesapla
      const confidence = Math.min(
        95,
        65 + Math.floor(Math.random() * 31)
      );
      
      return {
        basePrice: route.basePrice,
        recommendedPrice,
        discountedPrice,
        priceChange: Math.round(priceChangePercentage),
        confidence,
        factors: {
          demand: demandFactor,
          seasonal: seasonalFactor,
          occupancy: occupancyFactor,
          dayOfWeek: dayOfWeekFactor,
          competition: competitionFactor
        },
        reasoning,
        explanations
      };
      
    } catch (error) {
      console.error("Error in AI pricing recommendation:", error);
      
      // Hata durumunda temel bir öneri döndür
      return {
        basePrice: "0",
        recommendedPrice: "0",
        discountedPrice: null,
        priceChange: 0,
        confidence: 70,
        factors: {
          demand: 0.5,
          seasonal: 0.5,
          occupancy: 0.5,
          dayOfWeek: 0.5,
          competition: 0.5
        },
        reasoning: "Fiyat analizi yapılamadı.",
        explanations: {
          demand: "",
          seasonal: "",
          occupancy: "",
          dayOfWeek: "",
          competition: ""
        }
      };
    }
  }

  /**
   * Talep faktörünü hesapla
   */
  private calculateDemandFactor(departureDate: string): number {
    // Gerçek bir modelde burada geçmiş rezervasyon verileri kullanılır
    // Bu simülasyonda rastgele bir değer döndürüyoruz
    return Math.min(0.95, Math.max(0.1, Math.random() * 0.7 + 0.3));
  }

  /**
   * Mevsimsel faktörü hesapla
   */
  private calculateSeasonalFactor(departureDate: string): number {
    const date = new Date(departureDate);
    const month = date.getMonth();
    
    // Yaz aylarında yüksek talep
    if (month >= 5 && month <= 7) {
      return Math.min(0.95, Math.random() * 0.3 + 0.7); // 0.7-1.0 arası
    }
    
    // Kış aylarında düşük talep
    if (month === 11 || month === 0 || month === 1) {
      return Math.max(0.1, Math.random() * 0.3 + 0.1); // 0.1-0.4 arası
    }
    
    // Diğer aylar orta seviyede
    return Math.min(0.8, Math.max(0.3, Math.random() * 0.5 + 0.3)); // 0.3-0.8 arası
  }

  /**
   * Doluluk faktörünü hesapla
   */
  private calculateOccupancyFactor(routeId: number, departureDate: string): number {
    // Gerçek bir modelde, belirli tarih için doluluk oranı sorgulanır
    // Bu simülasyonda 0.3-0.9 arası rastgele bir değer döndürüyoruz
    return Math.min(0.9, Math.max(0.3, Math.random() * 0.6 + 0.3));
  }

  /**
   * Haftanın günü faktörünü hesapla
   */
  private calculateDayOfWeekFactor(departureDate: string): number {
    const date = new Date(departureDate);
    const day = date.getDay();
    
    // Hafta sonu yüksek talep (0: Pazar, 6: Cumartesi)
    if (day === 0 || day === 6) {
      return Math.min(0.95, Math.random() * 0.3 + 0.7); // 0.7-1.0 arası
    }
    
    // Hafta ortası düşük talep (2: Salı, 3: Çarşamba)
    if (day === 2 || day === 3) {
      return Math.max(0.2, Math.random() * 0.3 + 0.2); // 0.2-0.5 arası
    }
    
    // Diğer günler orta seviyede
    return Math.min(0.8, Math.max(0.4, Math.random() * 0.4 + 0.4)); // 0.4-0.8 arası
  }

  /**
   * Rekabet faktörünü hesapla
   */
  private calculateCompetitionFactor(route: any): number {
    // Gerçek bir modelde, benzer rotaların fiyatlandırması sorgulanır
    // Bu simülasyonda rastgele bir değer döndürüyoruz
    return Math.min(0.9, Math.max(0.2, Math.random() * 0.7 + 0.2));
  }

  /**
   * Fiyat değişim yüzdesini hesapla
   */
  private calculatePriceChangePercentage(
    demandFactor: number,
    seasonalFactor: number,
    occupancyFactor: number,
    dayOfWeekFactor: number,
    competitionFactor: number
  ): number {
    // Faktörlerin ağırlıklı ortalamasını al
    const weightedAvg = 
      demandFactor * 0.25 +
      seasonalFactor * 0.2 +
      occupancyFactor * 0.3 +
      dayOfWeekFactor * 0.15 +
      competitionFactor * 0.1;
    
    // 0.5 değeri normal seviyeyi temsil eder
    // Bu değerin üzerindeki fiyatlar artarken altındakiler düşer
    const priceChangePercent = (weightedAvg - 0.5) * 50;
    
    // Değişimi -25 ila +25 arasında sınırla
    return Math.max(-25, Math.min(25, priceChangePercent));
  }

  /**
   * Talep faktörü açıklamasını oluştur
   */
  private getExplanationForDemandFactor(factor: number): string {
    if (factor > 0.8) {
      return "Bu rota için yüksek bir talep görülüyor, bu da fiyat artışını destekliyor.";
    } else if (factor > 0.6) {
      return "Bu rota için orta-yüksek seviyede talep var.";
    } else if (factor > 0.4) {
      return "Bu rota için talep normal seviyede.";
    } else if (factor > 0.2) {
      return "Bu rota için talep düşük seviyede, fiyatlar da buna uygun.";
    } else {
      return "Bu rota için çok düşük talep var, fiyatlarda indirim öneriliyor.";
    }
  }

  /**
   * Mevsimsel faktör açıklamasını oluştur
   */
  private getExplanationForSeasonalFactor(factor: number, departureDate: string): string {
    const date = new Date(departureDate);
    const month = date.getMonth();
    const monthNames = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    
    if (factor > 0.8) {
      return `${monthNames[month]} ayı yüksek sezon, fiyatlar buna uygun olarak artıyor.`;
    } else if (factor > 0.6) {
      return `${monthNames[month]} ayı sezon içi, fiyatlar biraz yüksek.`;
    } else if (factor > 0.4) {
      return `${monthNames[month]} ayı orta sezon, fiyatlar normal seviyede.`;
    } else if (factor > 0.2) {
      return `${monthNames[month]} ayı sezon dışı, fiyatlar düşük.`;
    } else {
      return `${monthNames[month]} ayı en düşük sezon, fiyatlar minimum seviyede.`;
    }
  }

  /**
   * Doluluk faktörü açıklamasını oluştur
   */
  private getExplanationForOccupancyFactor(factor: number): string {
    if (factor > 0.8) {
      return "Bu sefer için doluluk çok yüksek, sınırlı koltuk kaldı.";
    } else if (factor > 0.6) {
      return "Bu sefer için doluluk yüksek seviyede.";
    } else if (factor > 0.4) {
      return "Bu sefer için doluluk orta seviyede.";
    } else if (factor > 0.2) {
      return "Bu sefer için doluluk düşük, çok sayıda boş koltuk var.";
    } else {
      return "Bu sefer için doluluk çok düşük, fiyatlar indirimli.";
    }
  }

  /**
   * Haftanın günü faktörü açıklamasını oluştur
   */
  private getExplanationForDayOfWeekFactor(factor: number, departureDate: string): string {
    const date = new Date(departureDate);
    const day = date.getDay();
    const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    
    if (factor > 0.8) {
      return `${dayNames[day]} günü yolculuk yüksek talep görüyor.`;
    } else if (factor > 0.6) {
      return `${dayNames[day]} günü için fiyatlar biraz yüksek.`;
    } else if (factor > 0.4) {
      return `${dayNames[day]} günü normal talep seviyesinde.`;
    } else if (factor > 0.2) {
      return `${dayNames[day]} günü düşük talep, fiyatlar daha uygun.`;
    } else {
      return `${dayNames[day]} günü en düşük talep, fiyatlar minimum seviyede.`;
    }
  }

  /**
   * Rekabet faktörü açıklamasını oluştur
   */
  private getExplanationForCompetitionFactor(factor: number): string {
    if (factor > 0.8) {
      return "Benzer rotaların fiyatları yüksek, bu da fiyat artışını destekliyor.";
    } else if (factor > 0.6) {
      return "Benzer rotaların fiyatları ortalamanın üzerinde.";
    } else if (factor > 0.4) {
      return "Benzer rotaların fiyatları ortalama seviyede.";
    } else if (factor > 0.2) {
      return "Benzer rotaların fiyatları düşük, rekabetçi fiyat sunuyoruz.";
    } else {
      return "Benzer rotaların fiyatları çok düşük, rekabetçi bir fiyat sunmak için indirim öneriliyor.";
    }
  }

  /**
   * Genel açıklama metni oluştur
   */
  private generateReasoning(
    priceChange: number,
    demandFactor: number,
    seasonalFactor: number,
    occupancyFactor: number,
    dayOfWeekFactor: number,
    competitionFactor: number,
    departureDate: string
  ): string {
    const date = new Date(departureDate);
    const day = date.getDay();
    const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    
    if (priceChange > 15) {
      return `${dayNames[day]} günü için fiyatlar oldukça yüksek. Yüksek doluluk oranı ve talep nedeniyle standart fiyatın üzerinde bir fiyatlandırma öneriliyor.`;
    } else if (priceChange > 5) {
      return `${dayNames[day]} günü için fiyatlar biraz yüksek. Doluluk oranı ve sezon etkisi nedeniyle standart fiyatın üzerinde bir fiyatlandırma öneriliyor.`;
    } else if (priceChange > -5) {
      return `${dayNames[day]} günü için fiyatlar normal seviyede. Talep ve doluluk oranı standart seviyede olduğundan fiyatlarda büyük bir değişiklik önerilmiyor.`;
    } else if (priceChange > -15) {
      return `${dayNames[day]} günü için fiyatlar düşük. Düşük doluluk oranı ve talep nedeniyle indirimli fiyatlandırma öneriliyor.`;
    } else {
      return `${dayNames[day]} günü için fiyatlar çok düşük. Çok düşük doluluk oranı ve sezon dışı etkisi nedeniyle önemli ölçüde indirim öneriliyor.`;
    }
  }
}

export const aiRecommendationService = new AIRecommendationService();