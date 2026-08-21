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
      
      // Get conversion rate (demo value as it requires frontend analytics data)
      const conversionRate = (bookingsCount / 25000) * 100;
      
      // Get top routes by revenue
      const topRoutes = await this.getTopRoutesByRevenue(startDateString, endDateString);
      
      // Get utilization metrics
      const utilizationMetrics = await this.getUtilizationMetrics(startDateString, endDateString);
      
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
      // In demo mode, return mock data
      return 4250;
      
      /* Actual implementation would be:
      const result = await db.select({
        count: count()
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.departureDate, startDate),
          lte(bookings.departureDate, endDate)
        )
      );
      
      return result[0].count || 0;
      */
    } catch (error) {
      console.error('Error getting bookings count:', error);
      return 0;
    }
  }
  
  // Get total revenue for a period
  private async getTotalRevenue(startDate: string, endDate: string): Promise<number> {
    try {
      // In demo mode, return mock data
      return 1250000;
      
      /* Actual implementation would be:
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
      
      return result[0].total || 0;
      */
    } catch (error) {
      console.error('Error getting total revenue:', error);
      return 0;
    }
  }
  
  // Get average ticket value
  private async getAverageTicketValue(startDate: string, endDate: string): Promise<number> {
    try {
      // In demo mode, return mock data
      return 294;
      
      /* Actual implementation would be:
      const result = await db.select({
        avg: avg(sql<number>`CAST(${bookings.totalPrice} AS DECIMAL)`)
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.departureDate, startDate),
          lte(bookings.departureDate, endDate),
          eq(bookings.isPaid, true)
        )
      );
      
      return Math.round(result[0].avg || 0);
      */
    } catch (error) {
      console.error('Error getting average ticket value:', error);
      return 0;
    }
  }
  
  // Get top routes by revenue
  private async getTopRoutesByRevenue(startDate: string, endDate: string): Promise<any[]> {
    try {
      // In demo mode, return mock data
      return [
        { route: "İstanbul - Bodrum", bookings: 450, revenue: "₺135,000", growth: 12.5 },
        { route: "İstanbul - İzmir", bookings: 380, revenue: "₺114,000", growth: 8.3 },
        { route: "Çeşme - Sakız", bookings: 310, revenue: "₺93,000", growth: 15.2 },
        { route: "Bodrum - Kos", bookings: 270, revenue: "₺81,000", growth: 5.1 },
        { route: "Ayvalık - Midilli", bookings: 220, revenue: "₺66,000", growth: -2.3 },
      ];
      
      /* Actual implementation would be:
      const topRoutes = await db.select({
        routeId: bookings.routeId,
        totalRevenue: sum(sql<number>`CAST(${bookings.totalPrice} AS DECIMAL)`),
        bookingsCount: count()
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.departureDate, startDate),
          lte(bookings.departureDate, endDate),
          eq(bookings.isPaid, true)
        )
      )
      .groupBy(bookings.routeId)
      .orderBy(sql`totalRevenue DESC`)
      .limit(5);
      
      // Get route details for each top route
      const result = [];
      for (const route of topRoutes) {
        const routeDetails = await this.storage.getRoute(route.routeId);
        if (routeDetails) {
          result.push({
            route: `${routeDetails.departurePort} - ${routeDetails.arrivalPort}`,
            bookings: route.bookingsCount,
            revenue: this.formatCurrency(route.totalRevenue),
            growth: this.calculateGrowth(route.routeId, startDate, endDate)
          });
        }
      }
      
      return result;
      */
    } catch (error) {
      console.error('Error getting top routes:', error);
      return [];
    }
  }
  
  // Calculate growth for a route
  private async calculateGrowth(routeId: number, currentStartDate: string, currentEndDate: string): Promise<number> {
    // This would compare current period bookings with previous period
    // For demo, returning random values between -5 and 20
    return Math.round((Math.random() * 25 - 5) * 10) / 10;
  }
  
  // Get capacity utilization metrics
  private async getUtilizationMetrics(startDate: string, endDate: string): Promise<any> {
    try {
      // In demo mode, return mock data
      return {
        ferryUtilization: 76,
        seatUtilization: 82,
        vehicleUtilization: 65,
        peakSeasonUtilization: 92
      };
      
      /* Actual implementation would use schedule capacity and booking counts */
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
  
  // Get sales funnel data
  async getSalesFunnel(period: number): Promise<any> {
    try {
      // In demo mode, return mock data
      return {
        pageVisits: 24850,
        searches: 10320,
        addedToCart: 3450,
        initiatedPayment: 1820,
        completedBookings: 1240
      };
      
      /* Actual implementation would integrate with web analytics */
    } catch (error) {
      console.error('Error getting sales funnel data:', error);
      return {
        pageVisits: 0,
        searches: 0,
        addedToCart: 0,
        initiatedPayment: 0,
        completedBookings: 0
      };
    }
  }
}