// Helper functions for database operations

import { db } from './db';
import { 
  users,
  routes,
  schedules,
  bookings,
  bookingPassengers,
  ferryCompanies,
  vehicleTypes
} from '../shared/schema';

import { userPreferences } from './db-models';
import { sql } from 'drizzle-orm';

// Get user ID by username
export async function getUserIdByUsername(username: string): Promise<number | null> {
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username)
    });
    
    return user ? user.id : null;
  } catch (error) {
    console.error(`Error getting user ID for ${username}:`, error);
    return null;
  }
}

// Get route ID by ports
export async function getRouteIdByPorts(departurePort: string, arrivalPort: string): Promise<number | null> {
  try {
    const route = await db.query.routes.findFirst({
      where: (routes, { and, eq }) => 
        and(
          eq(routes.departurePort, departurePort),
          eq(routes.arrivalPort, arrivalPort)
        )
    });
    
    return route ? route.id : null;
  } catch (error) {
    console.error(`Error getting route ID for ${departurePort} to ${arrivalPort}:`, error);
    return null;
  }
}

// Get schedule ID by departure time
export async function getScheduleByRouteAndTime(routeId: number, departureTime: string): Promise<number | null> {
  try {
    const schedule = await db.query.schedules.findFirst({
      where: (schedules, { and, eq }) => 
        and(
          eq(schedules.routeId, routeId),
          eq(schedules.departureTime, departureTime)
        )
    });
    
    return schedule ? schedule.id : null;
  } catch (error) {
    console.error(`Error getting schedule ID for route ${routeId} at ${departureTime}:`, error);
    return null;
  }
}

// Check if booking exists by reference number
export async function bookingExistsByReference(bookingReference: string): Promise<boolean> {
  try {
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { eq }) => eq(bookings.bookingReference, bookingReference)
    });
    
    return !!booking;
  } catch (error) {
    console.error(`Error checking booking reference ${bookingReference}:`, error);
    return false;
  }
}

// Generate unique booking reference
export async function generateUniqueBookingReference(prefix: string = "FB"): Promise<string> {
  const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
  const bookingReference = `${prefix}${randomPart}`;
  
  const exists = await bookingExistsByReference(bookingReference);
  if (exists) {
    // Recursively try again if reference already exists
    return generateUniqueBookingReference(prefix);
  }
  
  return bookingReference;
}

// Get ferry company ID by name
export async function getFerryCompanyIdByName(companyName: string): Promise<number | null> {
  try {
    const company = await db.query.ferryCompanies.findFirst({
      where: (ferryCompanies, { eq }) => eq(ferryCompanies.name, companyName)
    });
    
    return company ? company.id : null;
  } catch (error) {
    console.error(`Error getting ferry company ID for ${companyName}:`, error);
    return null;
  }
}

// Get vehicle type ID by name
export async function getVehicleTypeIdByName(typeName: string): Promise<number | null> {
  try {
    const vehicleType = await db.query.vehicleTypes.findFirst({
      where: (vehicleTypes, { eq }) => eq(vehicleTypes.name, typeName)
    });
    
    return vehicleType ? vehicleType.id : null;
  } catch (error) {
    console.error(`Error getting vehicle type ID for ${typeName}:`, error);
    return null;
  }
}

// Create a booking with passengers
export async function createBookingWithPassengers(
  bookingData: any,
  passengersData: any[]
): Promise<{ booking: any, passengers: any[] }> {
  try {
    // Insert booking
    const [booking] = await db.insert(bookings).values(bookingData).returning();
    
    // Insert passengers
    const passengers = [];
    for (const passengerData of passengersData) {
      const passenger = await db.insert(bookingPassengers).values({
        ...passengerData,
        bookingId: booking.id
      }).returning();
      
      if (passenger && passenger[0]) {
        passengers.push(passenger[0]);
      }
    }
    
    return { booking, passengers };
  } catch (error) {
    console.error("Error creating booking with passengers:", error);
    throw error;
  }
}

// Get all bookings for a specific user
export async function getUserBookings(userId: number): Promise<any[]> {
  try {
    const userBookings = await db.query.bookings.findMany({
      where: (bookings, { eq }) => eq(bookings.userId, userId),
      with: {
        route: true,
        schedule: true,
        passengers: true
      }
    });
    
    return userBookings;
  } catch (error) {
    console.error(`Error getting bookings for user ${userId}:`, error);
    return [];
  }
}

// Getting bookings count for stats
export async function getBookingsCount(): Promise<number> {
  try {
    const result = await db.select({ count: sql`count(*)` }).from(bookings);
    return Number(result[0].count) || 0;
  } catch (error) {
    console.error("Error getting bookings count:", error);
    return 0;
  }
}

// Testing direct SQL query for bookings
export async function getBookingsDirectSql(): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT b.*, u.username, r.departurePort, r.arrivalPort
      FROM bookings b
      JOIN users u ON b.userId = u.id
      JOIN routes r ON b.routeId = r.id
      LIMIT 10
    `);
    return result.rows;
  } catch (error) {
    console.error("Error executing direct SQL query:", error);
    return [];
  }
}