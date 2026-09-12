import { db } from '../db';
import {
  users,
  bookings,
  routes,
  schedules,
  pages,
  menus,
  bookingPassengers,
  bookingVehicles,
  seatReservations,
} from '@shared/schema';
import { count, eq, and, sql, desc, asc, or, like, isNull, not, gte, lte } from 'drizzle-orm';
import { generateInvoiceNumber, generatePNR, generateBookingReference } from './pnr-generator';

/**
 * Admin service for handling administrative operations
 */
export class AdminService {
  /**
   * Get dashboard summary for admin
   */
  async getDashboardSummary() {
    try {
      // Total users
      const [userCountResult] = await db
        .select({ count: count() })
        .from(users);
      
      // Total bookings
      const [bookingCountResult] = await db
        .select({ count: count() })
        .from(bookings);
      
      // Total paid bookings
      const [paidBookingCountResult] = await db
        .select({ count: count() })
        .from(bookings)
        .where(eq(bookings.isPaid, true));
      
      // Total revenue
      const [revenueResult] = await db
        .select({
          total: sql<string>`SUM(CAST(${bookings.totalPrice} AS DECIMAL(10,2)))`
        })
        .from(bookings)
        .where(eq(bookings.isPaid, true));
      
      // Recent bookings
      const recentBookings = await db
        .select({
          id: bookings.id,
          bookingReference: bookings.bookingReference,
          pnrNumber: bookings.pnrNumber,
          departureDate: bookings.departureDate,
          userId: bookings.userId,
          routeId: bookings.routeId,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          isPaid: bookings.isPaid,
          createdAt: bookings.createdAt
        })
        .from(bookings)
        .orderBy(desc(bookings.createdAt))
        .limit(5);
      
      // Today's bookings count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [todayBookingCountResult] = await db
        .select({ count: count() })
        .from(bookings)
        .where(
          and(
            gte(bookings.createdAt, today),
            lte(bookings.createdAt, tomorrow)
          )
        );
      
      return {
        totalUsers: userCountResult.count,
        totalBookings: bookingCountResult.count,
        paidBookings: paidBookingCountResult.count,
        totalRevenue: revenueResult.total || '0.00',
        recentBookings,
        todayBookings: todayBookingCountResult.count
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw new Error('Failed to get dashboard summary');
    }
  }
  
  /**
   * User management - Get users with filtering, sorting and pagination
   */
  async getUsers(params: {
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    role?: string;
  }) {
    const { 
      search = '', 
      sort = 'createdAt', 
      order = 'desc',
      page = 1, 
      limit = 10,
      role
    } = params;
    
    const offset = (page - 1) * limit;
    
    try {
      // Filtreler tek bir where() içinde birleştirilir; drizzle'da where()
      // ikinci kez çağrıldığında önceki koşul ezilirdi.
      const conditions = [];
      
      // Apply search filter (users tablosunda firstName/lastName yok, fullName var)
      if (search) {
        conditions.push(
          or(
            like(users.username, `%${search}%`),
            like(users.email, `%${search}%`),
            like(users.fullName, `%${search}%`)
          )
        );
      }
      
      // Apply role filter
      if (role) {
        conditions.push(eq(users.role, role));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Apply sorting
      const sortColumn =
        sort === 'username' ? users.username
        : sort === 'email' ? users.email
        : sort === 'fullName' || sort === 'firstName' ? users.fullName
        : users.createdAt;
      
      // Execute query
      const results = await db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset);
      
      // Get total count for pagination (aynı filtrelerle)
      const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);
      
      return {
        users: results,
        pagination: {
          total: totalResult.count,
          page,
          limit,
          totalPages: Math.ceil(totalResult.count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }
  
  /**
   * Booking management - Get bookings with filtering, sorting and pagination
   */
  async getBookings(params: {
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    status?: string;
    isPaid?: boolean;
    dateFrom?: string;
    dateTo?: string;
    userId?: number;
    routeId?: number;
  }) {
    const { 
      search = '', 
      sort = 'createdAt', 
      order = 'desc',
      page = 1, 
      limit = 10,
      status,
      isPaid,
      dateFrom,
      dateTo,
      userId,
      routeId
    } = params;
    
    const offset = (page - 1) * limit;
    
    try {
      // Tüm filtreler tek where() içinde birleştirilir; ayrı ayrı where()
      // çağrıldığında drizzle yalnızca sonuncusunu uyguluyordu.
      const conditions = [];
      
      // Apply search filter
      if (search) {
        conditions.push(
          or(
            like(bookings.bookingReference, `%${search}%`),
            like(bookings.pnrNumber, `%${search}%`)
          )
        );
      }
      
      // Apply status filter
      if (status) {
        conditions.push(eq(bookings.status, status));
      }
      
      // Apply payment status filter
      if (isPaid !== undefined) {
        conditions.push(eq(bookings.isPaid, isPaid));
      }
      
      // Apply date range filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        conditions.push(gte(bookings.departureDate, fromDate.toISOString()));
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        conditions.push(lte(bookings.departureDate, toDate.toISOString()));
      }
      
      // Apply user filter
      if (userId) {
        conditions.push(eq(bookings.userId, userId));
      }
      
      // Apply route filter
      if (routeId) {
        conditions.push(eq(bookings.routeId, routeId));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Apply sorting
      const sortColumn =
        sort === 'departureDate' ? bookings.departureDate
        : sort === 'totalPrice' ? bookings.totalPrice
        : sort === 'status' ? bookings.status
        : bookings.createdAt;
      
      // Execute query
      const results = await db
        .select({
          booking: bookings,
          route: routes
        })
        .from(bookings)
        .leftJoin(routes, eq(bookings.routeId, routes.id))
        .where(whereClause)
        .orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset);
      
      // Get total count for pagination (aynı filtrelerle)
      const [totalResult] = await db
        .select({ count: count() })
        .from(bookings)
        .where(whereClause);
      
      return {
        bookings: results.map(r => ({
          ...r.booking,
          routeInfo: r.route
        })),
        pagination: {
          total: totalResult.count,
          page,
          limit,
          totalPages: Math.ceil(totalResult.count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting bookings:', error);
      throw new Error('Failed to get bookings');
    }
  }
  
  /**
   * Get detailed booking information including passengers and vehicles
   */
  async getBookingDetails(bookingId: number) {
    try {
      // Get booking
      const booking = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      
      if (!booking.length) {
        throw new Error('Booking not found');
      }
      
      // Get route
      const route = await db
        .select()
        .from(routes)
        .where(eq(routes.id, booking[0].routeId))
        .limit(1);
      
      // Get user
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, booking[0].userId))
        .limit(1);
      
      // Get booking passengers
      const passengers = await db
        .select()
        .from(bookingPassengers)
        .where(eq(bookingPassengers.bookingId, bookingId));
      
      // Get booking vehicles
      const vehicles = await db
        .select()
        .from(bookingVehicles)
        .where(eq(bookingVehicles.bookingId, bookingId));
      
      // Get seat reservations if available
      const bookingSeatReservations = await db
        .select()
        .from(seatReservations)
        .where(eq(seatReservations.bookingId, bookingId));
      
      return {
        booking: booking[0],
        route: route[0] || null,
        user: user[0] || null,
        passengers,
        vehicles,
        seatReservations: bookingSeatReservations
      };
    } catch (error) {
      console.error('Error getting booking details:', error);
      throw new Error('Failed to get booking details');
    }
  }
  
  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: number, status: string) {
    try {
      const [updatedBooking] = await db
        .update(bookings)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, bookingId))
        .returning();
      
      return updatedBooking;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw new Error('Failed to update booking status');
    }
  }
  
  /**
   * Change user role
   */
  async changeUserRole(userId: number, role: string) {
    try {
      // users tablosunda updatedAt sütunu bulunmuyor
      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('Error changing user role:', error);
      throw new Error('Failed to change user role');
    }
  }
  
  /**
   * Content management - Get all pages with filtering and pagination
   */
  async getPages(params: {
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const { 
      search = '', 
      sort = 'createdAt', 
      order = 'desc',
      page = 1, 
      limit = 10
    } = params;
    
    const offset = (page - 1) * limit;
    
    try {
      // Apply search filter
      const whereClause = search
        ? or(
            like(pages.title, `%${search}%`),
            like(pages.slug, `%${search}%`)
          )
        : undefined;
      
      // Apply sorting
      const sortColumn =
        sort === 'title' ? pages.title
        : sort === 'slug' ? pages.slug
        : pages.createdAt;
      
      // Execute query
      const results = await db
        .select()
        .from(pages)
        .where(whereClause)
        .orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset);
      
      // Get total count for pagination (aynı filtreyle)
      const [totalResult] = await db
        .select({ count: count() })
        .from(pages)
        .where(whereClause);
      
      return {
        pages: results,
        pagination: {
          total: totalResult.count,
          page,
          limit,
          totalPages: Math.ceil(totalResult.count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting pages:', error);
      throw new Error('Failed to get pages');
    }
  }
  
  /**
   * Menu management - Get all menu items
   */
  async getMenus() {
    try {
      const menuItems = await db
        .select()
        .from(menus)
        .orderBy(asc(menus.order));
      
      return menuItems;
    } catch (error) {
      console.error('Error getting menus:', error);
      throw new Error('Failed to get menus');
    }
  }
  
  /**
   * Update schedule capacity
   */
  async updateScheduleCapacity(scheduleId: number, data: {
    passengerCapacity?: number;
    vehicleCapacity?: number;
  }) {
    try {
      const [updatedSchedule] = await db
        // schedules tablosunda updatedAt sütunu bulunmuyor
        .update(schedules)
        .set({ ...data })
        .where(eq(schedules.id, scheduleId))
        .returning();
      
      return updatedSchedule;
    } catch (error) {
      console.error('Error updating schedule capacity:', error);
      throw new Error('Failed to update schedule capacity');
    }
  }
  
  /**
   * Update route price
   */
  async updateRoutePrice(routeId: number, data: {
    basePrice: string;
    isActive?: boolean;
  }) {
    try {
      const [updatedRoute] = await db
        // routes tablosunda updatedAt sütunu bulunmuyor
        .update(routes)
        .set({ ...data })
        .where(eq(routes.id, routeId))
        .returning();
      
      return updatedRoute;
    } catch (error) {
      console.error('Error updating route price:', error);
      throw new Error('Failed to update route price');
    }
  }
}

export const adminService = new AdminService();