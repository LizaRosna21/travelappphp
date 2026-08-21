/**
 * Ticket Service Module
 * 
 * Core service for ticket generation, management, and retrieval
 */

import { storage } from '../../storage';
import { generatePDFTicket } from './pdf-ticket-generator';
import { generateQRCode } from './qr-generator';

/**
 * Ticket format types
 */
export enum TicketFormat {
  PDF = 'pdf',
  HTML = 'html',
  EMAIL = 'email',
  PRINT = 'print'
}

/**
 * Ticket data structure
 */
export interface TicketData {
  // Core data
  ticketId: number;
  booking: any; // Booking record
  user: any; // User record
  route: any; // Route record
  schedule: any; // Schedule record
  
  // Passenger and vehicle information
  passengerList: any[]; // List of passengers
  passengerTypes: Record<number, any>; // Map of passenger type id to passenger type
  vehicles?: any[]; // List of vehicles if any
  vehicleTypes?: Record<number, any>; // Map of vehicle type id to vehicle type
  
  // Additional data
  ferryCompanyName?: string; // Name of the ferry company
  qrCodeData?: string; // Base64 encoded QR code data
}

/**
 * Ticket generation result
 */
export interface TicketResult {
  success: boolean;
  ticketId?: number;
  pnrNumber?: string;
  bookingReference?: string;
  filePath?: string; // File path for stored tickets (PDF)
  content?: string | Buffer; // HTML content or PDF buffer
  error?: string;
}

/**
 * Ticket Service 
 * Handles ticket generation, retrieval, and management
 */
class TicketService {
  /**
   * Generate a ticket for a booking
   * 
   * @param bookingId Booking ID
   * @param format Ticket format (PDF, HTML, EMAIL, PRINT)
   * @returns Ticket generation result
   */
  async generateTicket(bookingId: number, format: TicketFormat = TicketFormat.PDF): Promise<TicketResult> {
    try {
      // Check if ticket already exists
      const existingTicket = await this.getTicketByBookingId(bookingId);
      if (existingTicket) {
        // If ticket exists, return it
        return await this.getTicket(bookingId, format);
      }

      // Prepare ticket data
      const ticketData = await this.prepareTicketData(bookingId);
      
      if (!ticketData) {
        return {
          success: false,
          error: `Failed to prepare ticket data for booking ID ${bookingId}`
        };
      }

      // Generate QR code data
      if (ticketData.booking && ticketData.user) {
        ticketData.qrCodeData = await generateQRCode(
          `TICKET:${ticketData.booking.bookingReference}:${ticketData.booking.pnrNumber}`
        );
      }

      // Generate ticket based on requested format
      let result: TicketResult;
      switch (format) {
        case TicketFormat.PDF:
          result = await this.generatePDFTicket(ticketData);
          break;
        case TicketFormat.HTML:
          result = await this.generateHTMLTicket(ticketData, false);
          break;
        case TicketFormat.PRINT:
          result = await this.generateHTMLTicket(ticketData, true);
          break;
        case TicketFormat.EMAIL:
          result = await this.generateEmailTicket(ticketData);
          break;
        default:
          result = await this.generatePDFTicket(ticketData);
      }

      // If ticket generation was successful, save ticket record to database
      if (result.success) {
        const ticket = {
          bookingId,
          format,
          filePath: result.filePath,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          metadata: {}
        };

        // Create ticket in database
        const newTicket = await this.createTicket(ticket);
        result.ticketId = newTicket.id;
      }

      return result;
    } catch (error) {
      console.error('Error generating ticket:', error);
      return {
        success: false,
        error: `Failed to generate ticket: ${error.message}`
      };
    }
  }

  /**
   * Get an existing ticket for a booking
   * 
   * @param bookingId Booking ID
   * @param format Ticket format
   * @returns Ticket result
   */
  async getTicket(bookingId: number, format: TicketFormat = TicketFormat.PDF): Promise<TicketResult> {
    try {
      // Check if ticket exists in database
      const existingTicket = await this.getTicketByBookingId(bookingId);
      
      if (!existingTicket) {
        // If ticket doesn't exist, generate a new one
        return await this.generateTicket(bookingId, format);
      }

      // Get associated booking to include booking data in response
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return {
          success: false,
          error: `Booking with ID ${bookingId} not found`
        };
      }

      // For PDF format, we can return the existing file
      if (format === TicketFormat.PDF && existingTicket.format === TicketFormat.PDF) {
        return {
          success: true,
          ticketId: existingTicket.id,
          pnrNumber: booking.pnrNumber,
          bookingReference: booking.bookingReference,
          filePath: existingTicket.filePath
        };
      }

      // For other formats, or if the requested format is different from the stored one,
      // generate a new ticket in the requested format
      return await this.generateTicket(bookingId, format);
    } catch (error) {
      console.error('Error getting ticket:', error);
      return {
        success: false,
        error: `Failed to get ticket: ${error.message}`
      };
    }
  }

  /**
   * Delete a ticket
   * 
   * @param bookingId Booking ID
   * @returns Deletion result
   */
  async deleteTicket(bookingId: number): Promise<TicketResult> {
    try {
      const result = await storage.deleteTicket(bookingId);
      
      return {
        success: true,
        ticketId: result.id
      };
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return {
        success: false,
        error: `Failed to delete ticket: ${error.message}`
      };
    }
  }

  /**
   * Prepare ticket data from booking information
   * 
   * @param bookingId Booking ID
   * @returns Ticket data
   */
  private async prepareTicketData(bookingId: number): Promise<TicketData | null> {
    try {
      // Get booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        throw new Error(`Booking with ID ${bookingId} not found`);
      }

      // Get route and schedule
      const route = await storage.getRoute(booking.routeId);
      const schedule = await storage.getSchedule(booking.scheduleId);
      
      if (!route || !schedule) {
        throw new Error(`Route or schedule not found for booking ID ${bookingId}`);
      }

      // Get user
      const user = await storage.getUser(booking.userId);
      if (!user) {
        throw new Error(`User not found for booking ID ${bookingId}`);
      }

      // Get passengers
      // In a real implementation, use getBookingPassengers instead of getBookingPassenger
      const passengers = [];
      const passengerIds = await storage.getBookingPassengerIds(bookingId);
      for (const id of passengerIds) {
        const passenger = await storage.getBookingPassenger(id);
        if (passenger) {
          passengers.push(passenger);
        }
      }

      // Get passenger types
      const passengerTypes: Record<number, any> = {};
      for (const passenger of passengers) {
        if (!passengerTypes[passenger.passengerTypeId]) {
          const passengerType = await storage.getPassengerType(passenger.passengerTypeId);
          if (passengerType) {
            passengerTypes[passenger.passengerTypeId] = passengerType;
          }
        }
      }

      // Get vehicles if any
      // In a real implementation, use getBookingVehicles instead of getBookingVehicle
      const vehicles = [];
      const vehicleIds = await storage.getBookingVehicleIds(bookingId);
      for (const id of vehicleIds) {
        const vehicle = await storage.getBookingVehicle(id);
        if (vehicle) {
          vehicles.push(vehicle);
        }
      }

      // Get vehicle types if any
      const vehicleTypes: Record<number, any> = {};
      for (const vehicle of vehicles) {
        if (!vehicleTypes[vehicle.vehicleTypeId]) {
          const vehicleType = await storage.getVehicleType(vehicle.vehicleTypeId);
          if (vehicleType) {
            vehicleTypes[vehicle.vehicleTypeId] = vehicleType;
          }
        }
      }

      // Get ferry company name if available
      let ferryCompanyName = 'Ferry Service';
      // In a real implementation, route would have a ferryCompanyId field
      if (route.ferryCompanyId) {
        const ferryCompany = await storage.getFerryCompany(route.ferryCompanyId);
        if (ferryCompany) {
          ferryCompanyName = ferryCompany.name;
        }
      }

      // Create ticket ID (in a real implementation, this would be a database ID)
      const existingTicket = await this.getTicketByBookingId(bookingId);
      const ticketId = existingTicket ? existingTicket.id : Date.now();

      return {
        ticketId,
        booking,
        user,
        route,
        schedule,
        passengerList: passengers,
        passengerTypes,
        vehicles,
        vehicleTypes,
        ferryCompanyName
      };
    } catch (error) {
      console.error('Error preparing ticket data:', error);
      return null;
    }
  }

  /**
   * Get ticket by booking ID
   * 
   * @param bookingId Booking ID
   * @returns Ticket or null if not found
   */
  private async getTicketByBookingId(bookingId: number): Promise<any | null> {
    try {
      // In a real implementation, this would query the database
      // For now, it's a placeholder
      return null;
    } catch (error) {
      console.error('Error getting ticket by booking ID:', error);
      return null;
    }
  }

  /**
   * Create a ticket record
   * 
   * @param ticket Ticket data
   * @returns Created ticket
   */
  private async createTicket(ticket: any): Promise<any> {
    try {
      // In a real implementation, this would create a record in the database
      // For now, it's a placeholder that returns a mock ticket with an ID
      return {
        ...ticket,
        id: Date.now()
      };
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Generate PDF ticket
   * 
   * @param ticketData Ticket data
   * @returns PDF ticket result
   */
  private async generatePDFTicket(ticketData: TicketData): Promise<TicketResult> {
    try {
      // Generate PDF buffer using the imported function
      const result = await generatePDFTicket(ticketData);
      
      // Add file path (in a real implementation this would be a saved file path)
      const filePath = `/tickets/${ticketData.booking.bookingReference}.pdf`;
      
      return {
        ...result,
        filePath
      };
    } catch (error) {
      console.error('Error generating PDF ticket:', error);
      return {
        success: false,
        error: `Failed to generate PDF ticket: ${error.message}`
      };
    }
  }

  /**
   * Generate HTML ticket
   * 
   * @param ticketData Ticket data
   * @param forPrinting Whether to optimize for printing
   * @returns HTML ticket result
   */
  private async generateHTMLTicket(ticketData: TicketData, forPrinting: boolean): Promise<TicketResult> {
    try {
      // In a real implementation, this would use a template engine
      // For now, it's a placeholder that returns a simple HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ferry Ticket - ${ticketData.booking.bookingReference}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .ticket { border: 1px solid #ccc; padding: 20px; max-width: 800px; margin: 20px auto; }
            .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .ticket-info { display: flex; justify-content: space-between; margin: 20px 0; }
            .passenger-list { margin: 20px 0; }
            .footer { text-align: center; font-size: 0.8em; margin-top: 20px; }
            ${forPrinting ? `
              @media print {
                body { margin: 0; padding: 0; }
                .ticket { border: none; }
                @page { size: A4; margin: 1cm; }
              }
            ` : ''}
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>Ferry Ticket</h1>
              <h3>${ticketData.ferryCompanyName || 'Ferry Service'}</h3>
            </div>
            
            <div class="ticket-info">
              <div>
                <p><strong>Booking Reference:</strong> ${ticketData.booking.bookingReference}</p>
                <p><strong>PNR Number:</strong> ${ticketData.booking.pnrNumber}</p>
              </div>
              <div>
                <p><strong>Route:</strong> ${ticketData.route.departurePort} → ${ticketData.route.arrivalPort}</p>
                <p><strong>Departure Date:</strong> ${new Date(ticketData.booking.departureDate).toLocaleDateString()}</p>
                <p><strong>Departure Time:</strong> ${ticketData.schedule.departureTime}</p>
                <p><strong>Arrival Time:</strong> ${ticketData.schedule.arrivalTime}</p>
              </div>
            </div>
            
            <div class="passenger-list">
              <h3>Passengers</h3>
              <ul>
                ${ticketData.passengerList.map((passenger, index) => {
                  const passengerType = ticketData.passengerTypes[passenger.passengerTypeId];
                  return `<li>${passenger.firstName} ${passenger.lastName} - ${passengerType ? passengerType.name : 'Unknown'}</li>`;
                }).join('')}
              </ul>
            </div>
            
            ${ticketData.vehicles && ticketData.vehicles.length > 0 ? `
              <div class="vehicle-list">
                <h3>Vehicles</h3>
                <ul>
                  ${ticketData.vehicles.map((vehicle, index) => {
                    return `<li>${vehicle.vehicleType || 'Vehicle'} - ${vehicle.licensePlate || 'No plate'}</li>`;
                  }).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${ticketData.qrCodeData ? `
              <div style="text-align: center; margin: 20px 0;">
                <img src="${ticketData.qrCodeData}" alt="QR Code" style="width: 150px; height: 150px;">
                <p>Scan for check-in</p>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>This ticket is valid only with an official ID document.</p>
              <p>Please arrive at the port at least 60 minutes before departure.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return {
        success: true,
        pnrNumber: ticketData.booking.pnrNumber,
        bookingReference: ticketData.booking.bookingReference,
        content: htmlContent
      };
    } catch (error) {
      console.error('Error generating HTML ticket:', error);
      return {
        success: false,
        error: `Failed to generate HTML ticket: ${error.message}`
      };
    }
  }

  /**
   * Generate email ticket
   * 
   * @param ticketData Ticket data
   * @returns Email ticket result
   */
  private async generateEmailTicket(ticketData: TicketData): Promise<TicketResult> {
    try {
      // For email, we'll use a slightly simplified HTML format
      const result = await this.generateHTMLTicket(ticketData, false);
      
      // In a real implementation, this would send an email with the HTML content
      // For now, it's a placeholder that returns the HTML content
      
      return result;
    } catch (error) {
      console.error('Error generating email ticket:', error);
      return {
        success: false,
        error: `Failed to generate email ticket: ${error.message}`
      };
    }
  }
  
  /**
   * Generate boarding passes for a booking
   * 
   * @param bookingId Booking ID
   * @returns Boarding passes generation result
   */
  async generateBoardingPasses(bookingId: number): Promise<TicketResult> {
    try {
      // Prepare ticket data (reuse existing method)
      const ticketData = await this.prepareTicketData(bookingId);
      
      if (!ticketData) {
        return {
          success: false,
          error: 'Failed to prepare boarding pass data'
        };
      }
      
      // Generate PDF boarding passes (similar to ticket but with a different template)
      const result = await generatePDFTicket(ticketData, true); // true indicates boarding pass mode
      
      if (!result.success) {
        return result;
      }
      
      return {
        success: true,
        bookingReference: ticketData.booking.bookingReference,
        pnrNumber: ticketData.booking.pnrNumber,
        content: result.content,
        filePath: result.filePath
      };
    } catch (error) {
      console.error('Error generating boarding passes:', error);
      return {
        success: false,
        error: error.message || 'Error generating boarding passes'
      };
    }
  }
}

// Export a singleton instance
export const ticketService = new TicketService();