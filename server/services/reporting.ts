/**
 * Reporting service for generating various reports and analytics
 */

import { db } from '../db';
import { schedules, routes, bookings, users } from '@shared/schema';
import { desc, avg, sum, count, sql, eq, and, between, gte, lte } from 'drizzle-orm';

/**
 * Format currency value
 */
function formatCurrency(value: number | string, currencyCode: string = 'USD'): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue);
}

/**
 * Reporting service for generating business analytics and reports
 */
class ReportingService {
  /**
   * Generate sales report with various metrics
   */
  async generateSalesReport(params: {
    startDate?: Date;
    endDate?: Date;
    routeId?: number;
    groupBy?: 'day' | 'week' | 'month';
    currencyCode?: string;
  }): Promise<{
    totalSales: string;
    salesCount: number;
    averageSale: string;
    salesByPeriod: {
      period: string;
      sales: string;
      count: number;
    }[];
    salesByRoute: {
      routeId: number;
      routeName: string;
      sales: string;
      count: number;
    }[];
    topPerformingRoutes: {
      routeId: number;
      routeName: string;
      sales: string;
      count: number;
    }[];
  }> {
    const { startDate, endDate, routeId, groupBy = 'day', currencyCode = 'USD' } = params;
    
    try {
      // Create filter conditions
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(bookings.createdAt, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(bookings.createdAt, endDate));
      }
      
      if (routeId) {
        conditions.push(eq(bookings.routeId, routeId));
      }
      
      // Ensure only paid bookings are counted
      conditions.push(eq(bookings.isPaid, true));
      
      // Filter condition for SQL query
      const whereClause = conditions.length > 0 
        ? and(...conditions) 
        : undefined;
      
      // Get total sales, count, and average sale
      const totalResult = await db
        .select({
          totalSales: sum(sql`CAST(${bookings.totalPrice} AS decimal)`),
          count: count(bookings.id)
        })
        .from(bookings)
        .where(whereClause);
      
      const totalSales = totalResult[0].totalSales?.toString() || '0';
      const salesCount = Number(totalResult[0].count || 0);
      const averageSale = salesCount > 0 
        ? (parseFloat(totalSales) / salesCount).toString() 
        : '0';
      
      // Format sales by period based on groupBy parameter
      let periodFormat: string;
      switch (groupBy) {
        case 'week':
          periodFormat = 'YYYY-WW'; // ISO year and week
          break;
        case 'month':
          periodFormat = 'YYYY-MM'; // Year and month
          break;
        case 'day':
        default:
          periodFormat = 'YYYY-MM-DD'; // Year, month, and day
          break;
      }
      
      // Get sales by period
      // Note: Actual implementation would use SQL functions to format dates
      // For PostgreSQL: to_char(created_at, 'YYYY-MM-DD')
      const salesByPeriodResult = await db
        .select({
          period: sql`to_char(${bookings.createdAt}, ${periodFormat})`,
          sales: sum(sql`CAST(${bookings.totalPrice} AS decimal)`),
          count: count(bookings.id)
        })
        .from(bookings)
        .where(whereClause)
        .groupBy(sql`to_char(${bookings.createdAt}, ${periodFormat})`)
        .orderBy(sql`to_char(${bookings.createdAt}, ${periodFormat})`);
      
      // Get sales by route
      const salesByRouteResult = await db
        .select({
          routeId: bookings.routeId,
          routeName: sql`${routes.departurePort} || ' → ' || ${routes.arrivalPort}`,
          sales: sum(sql`CAST(${bookings.totalPrice} AS decimal)`),
          count: count(bookings.id)
        })
        .from(bookings)
        .innerJoin(routes, eq(bookings.routeId, routes.id))
        .where(whereClause)
        .groupBy(bookings.routeId, sql`${routes.departurePort} || ' → ' || ${routes.arrivalPort}`)
        .orderBy(bookings.routeId);
      
      // Get top performing routes
      const topRoutesResult = await db
        .select({
          routeId: bookings.routeId,
          routeName: sql`${routes.departurePort} || ' → ' || ${routes.arrivalPort}`,
          sales: sum(sql`CAST(${bookings.totalPrice} AS decimal)`),
          count: count(bookings.id)
        })
        .from(bookings)
        .innerJoin(routes, eq(bookings.routeId, routes.id))
        .where(whereClause)
        .groupBy(bookings.routeId, sql`${routes.departurePort} || ' → ' || ${routes.arrivalPort}`)
        .orderBy(desc(sum(sql`CAST(${bookings.totalPrice} AS decimal)`)))
        .limit(5);
      
      // Format all currency values
      return {
        totalSales: formatCurrency(totalSales, currencyCode),
        salesCount,
        averageSale: formatCurrency(averageSale, currencyCode),
        salesByPeriod: salesByPeriodResult.map(item => ({
          period: item.period || '',
          sales: formatCurrency(item.sales?.toString() || '0', currencyCode),
          count: Number(item.count || 0)
        })),
        salesByRoute: salesByRouteResult.map(item => ({
          routeId: item.routeId,
          routeName: item.routeName || '',
          sales: formatCurrency(item.sales?.toString() || '0', currencyCode),
          count: Number(item.count || 0)
        })),
        topPerformingRoutes: topRoutesResult.map(item => ({
          routeId: item.routeId,
          routeName: item.routeName || '',
          sales: formatCurrency(item.sales?.toString() || '0', currencyCode),
          count: Number(item.count || 0)
        }))
      };
    } catch (error) {
      console.error('Error generating sales report:', error);
      return {
        totalSales: formatCurrency(0, currencyCode),
        salesCount: 0,
        averageSale: formatCurrency(0, currencyCode),
        salesByPeriod: [],
        salesByRoute: [],
        topPerformingRoutes: []
      };
    }
  }
  
  /**
   * Generate occupancy report for routes and schedules
   */
  async generateOccupancyReport(params: {
    startDate?: Date;
    endDate?: Date;
    routeId?: number;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    overallOccupancy: number;
    passengerOccupancy: number;
    vehicleOccupancy: number;
    occupancyByRoute: {
      routeId: number;
      routeName: string;
      passengerOccupancy: number;
      vehicleOccupancy: number;
      totalBookings: number;
    }[];
    occupancyByPeriod: {
      period: string;
      passengerOccupancy: number;
      vehicleOccupancy: number;
      totalBookings: number;
    }[];
    occupancyBySchedule: {
      scheduleId: number;
      departureTime: string;
      arrivalTime: string;
      passengerOccupancy: number;
      vehicleOccupancy: number;
      totalBookings: number;
    }[];
  }> {
    const { startDate, endDate, routeId, groupBy = 'day' } = params;
    
    try {
      // Create filter conditions
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(bookings.departureDate, startDate.toISOString()));
      }
      
      if (endDate) {
        conditions.push(lte(bookings.departureDate, endDate.toISOString()));
      }
      
      if (routeId) {
        conditions.push(eq(bookings.routeId, routeId));
      }
      
      // Filter condition for SQL query
      const whereClause = conditions.length > 0 
        ? and(...conditions) 
        : undefined;
      
      // Get overall booking counts (would include passenger and vehicle counts in a real scenario)
      const bookingCounts = await db
        .select({
          totalBookings: count(bookings.id),
          scheduleCount: count(sql`DISTINCT ${bookings.scheduleId}`)
        })
        .from(bookings)
        .where(whereClause);
      
      // Calculate overall occupancy (in a real scenario, would join with passengerCount and vehicleCount)
      // And compare with schedule capacity
      const schedulesCapacity = await db
        .select({
          totalCapacity: sum(schedules.capacity),
          totalPassengerCapacity: sum(schedules.passengerCapacity),
          totalVehicleCapacity: sum(schedules.vehicleCapacity)
        })
        .from(schedules)
        .innerJoin(bookings, eq(bookings.scheduleId, schedules.id))
        .where(whereClause);
      
      // Calculate occupancy percentages
      const totalBookings = Number(bookingCounts[0]?.totalBookings || 0);
      const totalCapacity = Number(schedulesCapacity[0]?.totalCapacity || 0);
      const totalPassengerCapacity = Number(schedulesCapacity[0]?.totalPassengerCapacity || 0);
      const totalVehicleCapacity = Number(schedulesCapacity[0]?.totalVehicleCapacity || 0);
      
      const overallOccupancy = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;
      const passengerOccupancy = totalPassengerCapacity > 0 ? (totalBookings / totalPassengerCapacity) * 100 : 0;
      const vehicleOccupancy = totalVehicleCapacity > 0 ? (totalBookings / totalVehicleCapacity) * 100 : 0;
      
      // Format period based on groupBy parameter
      let periodFormat: string;
      switch (groupBy) {
        case 'week':
          periodFormat = 'YYYY-WW'; // ISO year and week
          break;
        case 'month':
          periodFormat = 'YYYY-MM'; // Year and month
          break;
        case 'day':
        default:
          periodFormat = 'YYYY-MM-DD'; // Year, month, and day
          break;
      }
      
      // Get occupancy by period
      const occupancyByPeriodResult = await db
        .select({
          period: sql`to_char(${bookings.departureDate}::date, ${periodFormat})`,
          totalBookings: count(bookings.id),
          scheduleCount: count(sql`DISTINCT ${bookings.scheduleId}`)
        })
        .from(bookings)
        .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .where(whereClause)
        .groupBy(sql`to_char(${bookings.departureDate}::date, ${periodFormat})`)
        .orderBy(sql`to_char(${bookings.departureDate}::date, ${periodFormat})`);
      
      // Get total capacity by period to calculate occupancy
      const capacityByPeriodResult = await db
        .select({
          period: sql`to_char(${bookings.departureDate}::date, ${periodFormat})`,
          totalCapacity: sum(schedules.capacity),
          totalPassengerCapacity: sum(schedules.passengerCapacity),
          totalVehicleCapacity: sum(schedules.vehicleCapacity)
        })
        .from(bookings)
        .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .where(whereClause)
        .groupBy(sql`to_char(${bookings.departureDate}::date, ${periodFormat})`)
        .orderBy(sql`to_char(${bookings.departureDate}::date, ${periodFormat})`);
      
      // Get occupancy by route
      const occupancyByRouteResult = await db
        .select({
          routeId: bookings.routeId,
          routeName: sql`${routes.departurePort} || ' → ' || ${routes.arrivalPort}`,
          totalBookings: count(bookings.id),
          scheduleCount: count(sql`DISTINCT ${bookings.scheduleId}`)
        })
        .from(bookings)
        .innerJoin(routes, eq(bookings.routeId, routes.id))
        .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .where(whereClause)
        .groupBy(bookings.routeId, sql`${routes.departurePort} || ' → ' || ${routes.arrivalPort}`)
        .orderBy(bookings.routeId);
      
      // Get total capacity by route to calculate occupancy
      const capacityByRouteResult = await db
        .select({
          routeId: bookings.routeId,
          totalCapacity: sum(schedules.capacity),
          totalPassengerCapacity: sum(schedules.passengerCapacity),
          totalVehicleCapacity: sum(schedules.vehicleCapacity)
        })
        .from(bookings)
        .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .where(whereClause)
        .groupBy(bookings.routeId)
        .orderBy(bookings.routeId);
      
      // Get occupancy by schedule
      const occupancyByScheduleResult = await db
        .select({
          scheduleId: bookings.scheduleId,
          departureTime: schedules.departureTime,
          arrivalTime: schedules.arrivalTime,
          totalBookings: count(bookings.id),
          capacity: schedules.capacity,
          passengerCapacity: schedules.passengerCapacity,
          vehicleCapacity: schedules.vehicleCapacity
        })
        .from(bookings)
        .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .where(whereClause)
        .groupBy(bookings.scheduleId, schedules.departureTime, schedules.arrivalTime, 
                schedules.capacity, schedules.passengerCapacity, schedules.vehicleCapacity)
        .orderBy(bookings.scheduleId);
      
      // Combine the results
      const occupancyByPeriod = occupancyByPeriodResult.map((item, index) => {
        const capacity = capacityByPeriodResult[index] || { 
          totalPassengerCapacity: 0, 
          totalVehicleCapacity: 0 
        };
        
        const passengerCapacity = Number(capacity.totalPassengerCapacity || 0);
        const vehicleCapacity = Number(capacity.totalVehicleCapacity || 0);
        const bookings = Number(item.totalBookings || 0);
        
        return {
          period: item.period || '',
          passengerOccupancy: passengerCapacity > 0 ? (bookings / passengerCapacity) * 100 : 0,
          vehicleOccupancy: vehicleCapacity > 0 ? (bookings / vehicleCapacity) * 100 : 0,
          totalBookings: bookings
        };
      });
      
      const occupancyByRoute = occupancyByRouteResult.map((item, index) => {
        const capacity = capacityByRouteResult.find(c => c.routeId === item.routeId) || { 
          totalPassengerCapacity: 0, 
          totalVehicleCapacity: 0 
        };
        
        const passengerCapacity = Number(capacity.totalPassengerCapacity || 0);
        const vehicleCapacity = Number(capacity.totalVehicleCapacity || 0);
        const bookings = Number(item.totalBookings || 0);
        
        return {
          routeId: item.routeId,
          routeName: item.routeName || '',
          passengerOccupancy: passengerCapacity > 0 ? (bookings / passengerCapacity) * 100 : 0,
          vehicleOccupancy: vehicleCapacity > 0 ? (bookings / vehicleCapacity) * 100 : 0,
          totalBookings: bookings
        };
      });
      
      const occupancyBySchedule = occupancyByScheduleResult.map(item => {
        const passengerCapacity = Number(item.passengerCapacity || 0);
        const vehicleCapacity = Number(item.vehicleCapacity || 0);
        const bookings = Number(item.totalBookings || 0);
        
        return {
          scheduleId: item.scheduleId,
          departureTime: item.departureTime,
          arrivalTime: item.arrivalTime,
          passengerOccupancy: passengerCapacity > 0 ? (bookings / passengerCapacity) * 100 : 0,
          vehicleOccupancy: vehicleCapacity > 0 ? (bookings / vehicleCapacity) * 100 : 0,
          totalBookings: bookings
        };
      });
      
      return {
        overallOccupancy,
        passengerOccupancy,
        vehicleOccupancy,
        occupancyByPeriod,
        occupancyByRoute,
        occupancyBySchedule
      };
    } catch (error) {
      console.error('Error generating occupancy report:', error);
      return {
        overallOccupancy: 0,
        passengerOccupancy: 0,
        vehicleOccupancy: 0,
        occupancyByPeriod: [],
        occupancyByRoute: [],
        occupancyBySchedule: []
      };
    }
  }
  
  /**
   * Generate customer report
   */
  async generateCustomerReport(params: {
    startDate?: Date;
    endDate?: Date;
    topCustomersLimit?: number;
  }): Promise<{
    totalCustomers: number;
    newCustomers: number;
    repeatCustomerRate: number;
    averageBookingsPerCustomer: number;
    averageSpendPerCustomer: string;
    topCustomers: {
      userId: number;
      username: string;
      totalBookings: number;
      totalSpend: string;
      lastBookingDate: string;
    }[];
    customersByPeriod: {
      period: string;
      newCustomers: number;
      totalBookings: number;
    }[];
  }> {
    const { startDate, endDate, topCustomersLimit = 10 } = params;
    const currencyCode = 'USD';
    
    try {
      // Create filter conditions
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(bookings.createdAt, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(bookings.createdAt, endDate));
      }
      
      // Filter condition for SQL query
      const whereClause = conditions.length > 0 
        ? and(...conditions) 
        : undefined;
      
      // Get total number of customers with bookings
      const totalCustomersResult = await db
        .select({
          totalCustomers: count(sql`DISTINCT ${bookings.userId}`)
        })
        .from(bookings)
        .where(whereClause);
      
      const totalCustomers = Number(totalCustomersResult[0]?.totalCustomers || 0);
      
      // Get number of new customers (customers with their first booking in the period)
      // This would be more complex in a real implementation
      // For simplicity, assume all users are 'new' if their first booking is in this period
      const newCustomersResult = await db
        .select({
          newCustomers: count(sql`DISTINCT ${bookings.userId}`)
        })
        .from(bookings)
        .where(whereClause);
      
      const newCustomers = Number(newCustomersResult[0]?.newCustomers || 0);
      
      // Get total bookings and calculate average per customer
      const totalBookingsResult = await db
        .select({
          totalBookings: count(bookings.id)
        })
        .from(bookings)
        .where(whereClause);
      
      const totalBookings = Number(totalBookingsResult[0]?.totalBookings || 0);
      const averageBookingsPerCustomer = totalCustomers > 0 ? totalBookings / totalCustomers : 0;
      
      // Calculate total spend and average per customer
      const totalSpendResult = await db
        .select({
          totalSpend: sum(sql`CAST(${bookings.totalPrice} AS decimal)`)
        })
        .from(bookings)
        .where(whereClause);
      
      const totalSpend = Number(totalSpendResult[0]?.totalSpend || 0);
      const averageSpendPerCustomer = totalCustomers > 0 ? totalSpend / totalCustomers : 0;
      
      // Calculate repeat customer rate
      // For simplicity, assume customers with more than 1 booking in the period are repeat customers
      const repeatCustomersResult = await db
        .select({
          userId: bookings.userId,
          bookingCount: count(bookings.id)
        })
        .from(bookings)
        .where(whereClause)
        .groupBy(bookings.userId)
        .having(count(bookings.id), '>', 1);
      
      const repeatCustomers = repeatCustomersResult.length;
      const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
      
      // Get top customers by spend
      const topCustomersResult = await db
        .select({
          userId: bookings.userId,
          username: users.username,
          totalBookings: count(bookings.id),
          totalSpend: sum(sql`CAST(${bookings.totalPrice} AS decimal)`),
          lastBookingDate: sql`MAX(${bookings.createdAt})`
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .where(whereClause)
        .groupBy(bookings.userId, users.username)
        .orderBy(desc(sum(sql`CAST(${bookings.totalPrice} AS decimal)`)))
        .limit(topCustomersLimit);
      
      // Get customers by period (monthly)
      const customersByPeriodResult = await db
        .select({
          period: sql`to_char(${bookings.createdAt}, 'YYYY-MM')`,
          newCustomers: count(sql`DISTINCT ${bookings.userId}`),
          totalBookings: count(bookings.id)
        })
        .from(bookings)
        .where(whereClause)
        .groupBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM')`);
      
      return {
        totalCustomers,
        newCustomers,
        repeatCustomerRate,
        averageBookingsPerCustomer,
        averageSpendPerCustomer: formatCurrency(averageSpendPerCustomer, currencyCode),
        topCustomers: topCustomersResult.map(customer => ({
          userId: customer.userId,
          username: customer.username,
          totalBookings: Number(customer.totalBookings || 0),
          totalSpend: formatCurrency(customer.totalSpend?.toString() || '0', currencyCode),
          lastBookingDate: customer.lastBookingDate?.toString() || ''
        })),
        customersByPeriod: customersByPeriodResult.map(period => ({
          period: period.period || '',
          newCustomers: Number(period.newCustomers || 0),
          totalBookings: Number(period.totalBookings || 0)
        }))
      };
    } catch (error) {
      console.error('Error generating customer report:', error);
      return {
        totalCustomers: 0,
        newCustomers: 0,
        repeatCustomerRate: 0,
        averageBookingsPerCustomer: 0,
        averageSpendPerCustomer: formatCurrency(0, currencyCode),
        topCustomers: [],
        customersByPeriod: []
      };
    }
  }
  
  /**
   * Predict future occupancy based on historical data
   */
  async predictOccupancy(params: {
    routeId: number;
    startDate: Date;
    endDate: Date;
    seasonalAdjustment?: boolean;
  }): Promise<{
    dailyPredictions: {
      date: string;
      predictedOccupancy: number;
      predictedPassengers: number;
      confidence: number;
    }[];
    weeklyPredictions: {
      weekStarting: string;
      predictedOccupancy: number;
      predictedPassengers: number;
      confidence: number;
    }[];
    routeDetails: {
      routeId: number;
      routeName: string;
      averageHistoricalOccupancy: number;
      peakOccupancy: number;
      capacityConstraints: number;
    };
  }> {
    const { routeId, startDate, endDate, seasonalAdjustment = true } = params;
    
    try {
      // Get historical occupancy data for this route
      const historicalData = await db
        .select({
          departureDate: bookings.departureDate,
          totalBookings: count(bookings.id),
          passengerCapacity: schedules.passengerCapacity,
          vehicleCapacity: schedules.vehicleCapacity
        })
        .from(bookings)
        .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
        .where(
          and(
            eq(bookings.routeId, routeId),
            lte(bookings.departureDate, startDate.toISOString())
          )
        )
        .groupBy(bookings.departureDate, schedules.passengerCapacity, schedules.vehicleCapacity)
        .orderBy(bookings.departureDate);
      
      // Get route details
      const routeDetails = await db
        .select({
          routeId: routes.id,
          departurePort: routes.departurePort,
          arrivalPort: routes.arrivalPort
        })
        .from(routes)
        .where(eq(routes.id, routeId));
      
      // Calculate average historical occupancy
      let totalOccupancy = 0;
      let peakOccupancy = 0;
      let countRecords = 0;
      
      historicalData.forEach(record => {
        const occupancy = record.passengerCapacity ? 
          (Number(record.totalBookings) / Number(record.passengerCapacity)) * 100 : 0;
        
        totalOccupancy += occupancy;
        peakOccupancy = Math.max(peakOccupancy, occupancy);
        countRecords++;
      });
      
      const averageHistoricalOccupancy = countRecords > 0 ? totalOccupancy / countRecords : 0;
      
      // Generate dates between start and end dates
      const dailyPredictions = [];
      const weeklyPredictions = [];
      
      // Get number of days between dates
      const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      const currentDate = new Date(startDate);
      
      // Current week data
      let weekStarting = new Date(currentDate);
      let weekTotalOccupancy = 0;
      let weekDayCount = 0;
      let weekPassengers = 0;
      
      // Default schedule capacity from most recent historical data
      const defaultCapacity = historicalData.length > 0 ? 
        Number(historicalData[historicalData.length - 1].passengerCapacity || 100) : 100;
      
      // Generate daily predictions
      for (let i = 0; i < dayDiff; i++) {
        // Get day of week (0 = Sunday, 6 = Saturday)
        const dayOfWeek = currentDate.getDay();
        
        // Apply day of week adjustment (weekend vs weekday)
        let dayAdjustment = 1.0;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend adjustment
          dayAdjustment = 1.2; // 20% more on weekends
        } else if (dayOfWeek === 5) {
          // Friday adjustment
          dayAdjustment = 1.15; // 15% more on Fridays
        }
        
        // Apply seasonal adjustment if enabled
        let seasonalFactor = 1.0;
        if (seasonalAdjustment) {
          const month = currentDate.getMonth();
          seasonalFactor = await this.getSeasonalFactor(month);
        }
        
        // Calculate predicted occupancy for this day
        const predictedOccupancy = averageHistoricalOccupancy * dayAdjustment * seasonalFactor;
        
        // Calculate predicted passengers
        const predictedPassengers = Math.round((predictedOccupancy / 100) * defaultCapacity);
        
        // Calculate confidence level (higher for near-term, lower for far-future)
        const daysFromStart = i;
        const confidence = Math.max(0.5, 1 - (daysFromStart / (dayDiff * 2)));
        
        // Format date as string
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Add to daily predictions
        dailyPredictions.push({
          date: dateString,
          predictedOccupancy: Math.min(100, predictedOccupancy), // Cap at 100%
          predictedPassengers,
          confidence
        });
        
        // Add to weekly totals
        weekTotalOccupancy += predictedOccupancy;
        weekPassengers += predictedPassengers;
        weekDayCount++;
        
        // If it's the end of a week (Saturday) or the last day, add the weekly prediction
        if (dayOfWeek === 6 || i === dayDiff - 1) {
          const weekOccupancy = weekDayCount > 0 ? weekTotalOccupancy / weekDayCount : 0;
          
          weeklyPredictions.push({
            weekStarting: weekStarting.toISOString().split('T')[0],
            predictedOccupancy: Math.min(100, weekOccupancy), // Cap at 100%
            predictedPassengers: weekPassengers,
            confidence: Math.max(0.5, 1 - (i / (dayDiff * 2)))
          });
          
          // Reset weekly tracking
          if (i < dayDiff - 1) { // Only if not the last day
            currentDate.setDate(currentDate.getDate() + 1); // Move to next day
            weekStarting = new Date(currentDate);
            weekTotalOccupancy = 0;
            weekDayCount = 0;
            weekPassengers = 0;
            continue; // Skip the date increment below
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return {
        dailyPredictions,
        weeklyPredictions,
        routeDetails: {
          routeId,
          routeName: `${routeDetails[0]?.departurePort || ''} → ${routeDetails[0]?.arrivalPort || ''}`,
          averageHistoricalOccupancy,
          peakOccupancy,
          capacityConstraints: defaultCapacity
        }
      };
    } catch (error) {
      console.error('Error generating occupancy prediction:', error);
      return {
        dailyPredictions: [],
        weeklyPredictions: [],
        routeDetails: {
          routeId,
          routeName: '',
          averageHistoricalOccupancy: 0,
          peakOccupancy: 0,
          capacityConstraints: 0
        }
      };
    }
  }
  
  /**
   * Get seasonal factor based on month
   * Returns a multiplier to adjust predictions
   */
  private async getSeasonalFactor(month: number): Promise<number> {
    // Example seasonal factors (1.0 = average, >1.0 = busier, <1.0 = quieter)
    const seasonalFactors = [
      0.7,  // January   - Off-peak
      0.75, // February  - Off-peak
      0.9,  // March     - Shoulder season
      1.0,  // April     - Shoulder season
      1.1,  // May       - Early peak
      1.25, // June      - Peak
      1.5,  // July      - Peak
      1.5,  // August    - Peak
      1.2,  // September - Late peak
      1.0,  // October   - Shoulder season
      0.8,  // November  - Off-peak
      0.9   // December  - Holiday season
    ];
    
    return seasonalFactors[month];
  }
}

export const reportingService = new ReportingService();