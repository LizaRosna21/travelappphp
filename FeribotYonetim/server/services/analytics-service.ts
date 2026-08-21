import { IStorage } from '../storage';
import { db } from '../db';
import { count, sum, avg, eq, and, gte, lte, sql } from 'drizzle-orm';
import { bookings, schedules, routes, users } from '@shared/schema';

export class AnalyticsService {
  constructor(private storage: IStorage) {}

  // Get performance metrics for a specified period
  async getPerformanceMetrics(period: number): Promise<any> {
    try {
      // Calculate start date based on period (days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      
      // Format as ISO dates for query
      const endDateString = new Date().toISOString().split('T')[0];
      const startDateString = startDate.toISOString().split('T')[0];

      // Get total bookings count
      const bookingsCount = await this.getBookingsCount(startDateString, endDateString);
      
      // Get total revenue
      const totalRevenue = await this.getTotalRevenue(startDateString, endDateString);
      
      // Get average ticket value
      const avgTicketValue = await this.getAverageTicketValue(startDateString, endDateString);
      
      // Dönüşüm oranı: oluşturulan rezervasyonların kaçı ödemeyle tamamlandı.
      // (Ziyaretçi bazlı dönüşüm web analitiği gerektirir, o veri sistemde yok.)
      const paidBookingsCount = await this.getPaidBookingsCount(startDateString, endDateString);
      const conversionRate = bookingsCount > 0 ? (paidBookingsCount / bookingsCount) * 100 : 0;
      
      // Get top routes by revenue
      const topRoutes = await this.getTopRoutesByRevenue(startDateString, endDateString);
      
      // Get utilization metrics
      const utilizationMetrics = await this.getUtilizationMetrics(startDateString, endDateString);

      // Grafik panelleri için gerçek veri kaynakları
      const monthlyRevenue = await this.getMonthlyRevenue(12);
      const paymentSummary = await this.getPaymentSummary(startDateString, endDateString);
      const salesFunnel = await this.getSalesFunnel(period);
      const categoryBreakdown = await this.getCategoryBreakdown(startDateString, endDateString);
      
      // Get previous period data for trends
      const previousEndDate = startDateString;
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - period);
      const previousStartDateString = previousStartDate.toISOString().split('T')[0];
      
      const previousBookingsCount = await this.getBookingsCount(previousStartDateString, previousEndDate);
      const previousRevenue = await this.getTotalRevenue(previousStartDateString, previousEndDate);
      const previousAvgTicketValue = await this.getAverageTicketValue(previousStartDateString, previousEndDate);
      const previousConversionRate = (previousBookingsCount / 24000) * 100; // Demo value
      
      // Calculate trends
      const revenueTrend = this.calculateTrend(totalRevenue, previousRevenue);
      const bookingsTrend = this.calculateTrend(bookingsCount, previousBookingsCount);
      const ticketValueTrend = this.calculateTrend(avgTicketValue, previousAvgTicketValue);
      const conversionRateTrend = this.calculateTrend(conversionRate, previousConversionRate);
      
      return {
        totalRevenue: this.formatCurrency(totalRevenue),
        totalBookings: bookingsCount.toLocaleString('tr-TR'),
        averageTicketValue: this.formatCurrency(avgTicketValue),
        conversionRate: conversionRate.toFixed(2) + '%',
        utilizationMetrics,
        topRoutes,
        monthlyRevenue,
        paymentSummary,
        salesFunnel,
        categoryBreakdown,
        trends: {
          revenue: revenueTrend,
          bookings: bookingsTrend,
          ticketValue: ticketValueTrend,
          conversionRate: conversionRateTrend,
        }
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }
  
  // Helper method to calculate trend
  private calculateTrend(current: number, previous: number): { value: string; direction: "up" | "down" | "neutral" } {
    if (previous === 0) return { value: '0%', direction: 'neutral' };
    
    const percentChange = ((current - previous) / previous) * 100;
    const direction = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
    
    return {
      value: `${Math.abs(percentChange).toFixed(1)}%`,
      direction
    };
  }
  
  // Helper method to format currency
  private formatCurrency(value: number): string {
    return '₺' + value.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
  
  // Get total bookings count for a period
  private async getBookingsCount(startDate: string, endDate: string): Promise<number> {
    try {
      const result = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate)
          )
        );

      return Number(result[0]?.value) || 0;
    } catch (error) {
      console.error('Error getting bookings count:', error);
      return 0;
    }
  }

  // Ödemesi tamamlanmış rezervasyon sayısı
  private async getPaidBookingsCount(startDate: string, endDate: string): Promise<number> {
    try {
      const result = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate),
            eq(bookings.isPaid, true)
          )
        );

      return Number(result[0]?.value) || 0;
    } catch (error) {
      console.error('Error getting paid bookings count:', error);
      return 0;
    }
  }

  // Get total revenue for a period
  private async getTotalRevenue(startDate: string, endDate: string): Promise<number> {
    try {
      const result = await db.select({
        total: sum(sql<number>`CAST(${bookings.totalPrice} AS DECIMAL)`)
      })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate),
            eq(bookings.isPaid, true)
          )
        );

      return Number(result[0]?.total) || 0;
    } catch (error) {
      console.error('Error getting total revenue:', error);
      return 0;
    }
  }

  // Get average ticket value
  private async getAverageTicketValue(startDate: string, endDate: string): Promise<number> {
    try {
      const result = await db.select({
        average: avg(sql<number>`CAST(${bookings.totalPrice} AS DECIMAL)`)
      })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate),
            eq(bookings.isPaid, true)
          )
        );

      return Math.round(Number(result[0]?.average) || 0);
    } catch (error) {
      console.error('Error getting average ticket value:', error);
      return 0;
    }
  }

  // Get top routes by revenue
  private async getTopRoutesByRevenue(startDate: string, endDate: string): Promise<any[]> {
    try {
      const topRoutes = await db.select({
        routeId: bookings.routeId,
        departurePort: routes.departurePort,
        arrivalPort: routes.arrivalPort,
        totalRevenue: sum(sql<number>`CAST(${bookings.totalPrice} AS DECIMAL)`),
        bookingsCount: count()
      })
        .from(bookings)
        .innerJoin(routes, eq(routes.id, bookings.routeId))
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate),
            eq(bookings.isPaid, true)
          )
        )
        .groupBy(bookings.routeId, routes.departurePort, routes.arrivalPort)
        .orderBy(sql`SUM(CAST(${bookings.totalPrice} AS DECIMAL)) DESC`)
        .limit(5);

      const previousStart = this.shiftDate(startDate, startDate, endDate);

      return await Promise.all(topRoutes.map(async (route) => ({
        route: `${route.departurePort} - ${route.arrivalPort}`,
        bookings: Number(route.bookingsCount) || 0,
        revenue: this.formatCurrency(Number(route.totalRevenue) || 0),
        growth: await this.calculateGrowth(route.routeId, previousStart, startDate, Number(route.bookingsCount) || 0)
      })));
    } catch (error) {
      console.error('Error getting top routes:', error);
      return [];
    }
  }

  /** Verilen aralığın hemen öncesindeki eşit uzunluktaki dönemin başlangıcını verir. */
  private shiftDate(anchor: string, startDate: string, endDate: string): string {
    const spanMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    return new Date(new Date(anchor).getTime() - spanMs).toISOString().split('T')[0];
  }

  // Bir rotanın önceki döneme göre büyümesini hesaplar
  private async calculateGrowth(
    routeId: number,
    previousStartDate: string,
    previousEndDate: string,
    currentCount: number
  ): Promise<number> {
    try {
      const result = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.routeId, routeId),
            gte(bookings.departureDate, previousStartDate),
            lte(bookings.departureDate, previousEndDate),
            eq(bookings.isPaid, true)
          )
        );

      const previousCount = Number(result[0]?.value) || 0;
      if (previousCount === 0) return 0;

      return Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
    } catch (error) {
      console.error('Error calculating route growth:', error);
      return 0;
    }
  }

  // Get capacity utilization metrics
  private async getUtilizationMetrics(startDate: string, endDate: string): Promise<any> {
    try {
      const [capacityRow] = await db.select({
        totalCapacity: sum(schedules.capacity),
        passengerCapacity: sum(schedules.passengerCapacity),
        vehicleCapacity: sum(schedules.vehicleCapacity)
      })
        .from(schedules)
        .where(eq(schedules.isActive, true));

      const [bookedRow] = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate)
          )
        );

      const booked = Number(bookedRow?.value) || 0;
      const ratio = (capacity: unknown) => {
        const total = Number(capacity) || 0;
        if (total === 0) return 0;
        return Math.min(100, Math.round((booked / total) * 100));
      };

      return {
        ferryUtilization: ratio(capacityRow?.totalCapacity),
        seatUtilization: ratio(capacityRow?.passengerCapacity),
        vehicleUtilization: ratio(capacityRow?.vehicleCapacity),
        peakSeasonUtilization: ratio(capacityRow?.totalCapacity)
      };
    } catch (error) {
      console.error('Error getting utilization metrics:', error);
      return {
        ferryUtilization: 0,
        seatUtilization: 0,
        vehicleUtilization: 0,
        peakSeasonUtilization: 0
      };
    }
  }

  /** Son N ayın gerçek gelir ve rezervasyon dağılımı. */
  private async getMonthlyRevenue(months: number): Promise<any[]> {
    try {
      const rows = await db.select({
        month: sql<string>`TO_CHAR(${bookings.departureDate}::date, 'YYYY-MM')`,
        revenue: sum(sql<number>`CASE WHEN ${bookings.isPaid} THEN CAST(${bookings.totalPrice} AS DECIMAL) ELSE 0 END`),
        bookingsCount: count()
      })
        .from(bookings)
        .where(gte(bookings.departureDate, sql<string>`(CURRENT_DATE - INTERVAL '${sql.raw(String(months))} months')::date`))
        .groupBy(sql`1`)
        .orderBy(sql`1`);

      const labels = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
      const byMonth = new Map(rows.map((r: any) => [r.month, r]));

      // Veri olmayan aylar da 0 olarak yer alsın ki grafik sürekli olsun
      const result: any[] = [];
      const cursor = new Date();
      cursor.setDate(1);
      cursor.setMonth(cursor.getMonth() - (months - 1));

      for (let i = 0; i < months; i++) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        const row: any = byMonth.get(key);
        result.push({
          name: labels[cursor.getMonth()],
          gelir: Number(row?.revenue) || 0,
          rezervasyon: Number(row?.bookingsCount) || 0
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      return result;
    } catch (error) {
      console.error('Error getting monthly revenue:', error);
      return [];
    }
  }

  /** Rezervasyon türü dağılımı - feribot ve transfer kayıtlarından. */
  private async getCategoryBreakdown(startDate: string, endDate: string): Promise<any[]> {
    try {
      const [ferry] = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate)
          )
        );

      const ferryCount = Number(ferry?.value) || 0;
      if (ferryCount === 0) return [];

      return [{ name: 'Feribot', value: ferryCount }];
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      return [];
    }
  }

  /** Ödeme ve iade özeti - gerçek rezervasyon kayıtlarından. */
  private async getPaymentSummary(startDate: string, endDate: string): Promise<any> {
    try {
      const [row] = await db.select({
        successful: sql<number>`COUNT(*) FILTER (WHERE ${bookings.isPaid})`,
        failed: sql<number>`COUNT(*) FILTER (WHERE NOT ${bookings.isPaid})`,
        refunded: sql<number>`COUNT(*) FILTER (WHERE ${bookings.refundDate} IS NOT NULL)`
      })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDate),
            lte(bookings.departureDate, endDate)
          )
        );

      return {
        successful: Number(row?.successful) || 0,
        failed: Number(row?.failed) || 0,
        refunded: Number(row?.refunded) || 0
      };
    } catch (error) {
      console.error('Error getting payment summary:', error);
      return { successful: 0, failed: 0, refunded: 0 };
    }
  }

  // Get sales funnel data
  //
  // NOT: Huninin üst basamakları (sayfa ziyareti, arama, sepete ekleme) web
  // analitiği gerektirir ve sistemde böyle bir kaynak yok. Uydurma sayı
  // üretmek yerine ölçülebilen basamaklar veritabanından döndürülür,
  // ölçülemeyenler null bırakılır ki arayüz "veri yok" gösterebilsin.
  async getSalesFunnel(period: number): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = new Date().toISOString().split('T')[0];

      const [initiated] = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDateString),
            lte(bookings.departureDate, endDateString)
          )
        );

      const [completed] = await db.select({ value: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.departureDate, startDateString),
            lte(bookings.departureDate, endDateString),
            eq(bookings.isPaid, true)
          )
        );

      return {
        pageVisits: null,
        searches: null,
        addedToCart: null,
        initiatedPayment: Number(initiated?.value) || 0,
        completedBookings: Number(completed?.value) || 0
      };
    } catch (error) {
      console.error('Error getting sales funnel data:', error);
      return {
        pageVisits: null,
        searches: null,
        addedToCart: null,
        initiatedPayment: 0,
        completedBookings: 0
      };
    }
  }
}
