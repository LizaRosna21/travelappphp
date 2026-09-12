/**
 * Ticket generation service for creating PDF tickets
 * Uses PDFKit for PDF generation, with fallback to demo mode
 */

import { Booking, Route, Schedule, User } from '@shared/schema';
import PDFDocument from 'pdfkit';
import { generateTicketNumber } from './pnr-generator';

// Check if PDFKit is available
let pdfKitAvailable = true;
try {
  if (!PDFDocument) {
    pdfKitAvailable = false;
    console.warn('PDFKit not available, ticket generator will run in demo mode');
  }
} catch (error) {
  pdfKitAvailable = false;
  console.error('Error initializing PDFKit, ticket generator will run in demo mode:', error);
}

/**
 * Interface for passenger type
 */
interface PassengerType {
  id: number;
  name: string;
  description: string;
  price: string;
}

/**
 * Interface for vehicle type
 */
interface VehicleType {
  id: number;
  name: string;
  description: string;
  price: string;
}

/**
 * Ticket generator service for creating and managing ferry tickets
 */
class TicketGeneratorService {
  /**
   * Generate and save a ticket as PDF
   */
  async generateAndSaveTicket(
    booking: Booking,
    route: Route,
    schedule: Schedule,
    user: User,
    passengerType: PassengerType,
    vehicleType?: VehicleType
  ): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    error?: string;
    ticketNumber?: string;
  }> {
    try {
      // Generate unique ticket number
      const ticketNumber = booking.ticketNumber || generateTicketNumber();
      
      if (pdfKitAvailable) {
        // Use PDFKit to generate ticket
        const pdfBuffer = await this.generateTicketContent(
          booking,
          route,
          schedule,
          user,
          passengerType,
          vehicleType
        );
        
        // In a production environment, we'd save the ticket to a storage system
        // For now, we'll just return the PDF buffer
        return {
          success: true,
          pdfBuffer,
          ticketNumber,
        };
      } else {
        // Demo mode - log ticket details
        console.log(`
🎫 DEMO MODE: Generating ticket for booking: ${booking.bookingReference}
PNR: ${booking.pnrNumber}
Ticket Number: ${ticketNumber}
Route: ${route.departurePort} → ${route.arrivalPort}
Departure: ${booking.departureDate} at ${schedule.departureTime}
Passenger: ${user.fullName || user.username} (${user.email})
Passenger Type: ${passengerType.name}
${vehicleType ? `Vehicle Type: ${vehicleType.name}` : 'No vehicle'}
        `);
        
        // Return mock success response
        return {
          success: true,
          ticketNumber,
        };
      }
    } catch (error: any) {
      console.error('Error generating ticket:', error);
      return {
        success: false,
        error: error.message || 'Error generating ticket',
      };
    }
  }

  /**
   * Generate ticket content with PDFKit
   */
  private generateTicketContent(
    booking: Booking,
    route: Route,
    schedule: Schedule,
    user: User,
    passengerType: PassengerType,
    vehicleType?: VehicleType
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Ferry Ticket - ${booking.bookingReference}`,
            Author: 'Ferry Ticket System',
            Subject: 'Ferry Travel Ticket',
            Keywords: 'ferry, ticket, travel',
            Creator: 'Ferry Ticket System',
            Producer: 'PDFKit',
          },
        });
        
        // Collect PDF data chunks
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // Format dates
        const departureDate = new Date(booking.departureDate).toLocaleDateString();
        const returnDate = booking.returnDate 
          ? new Date(booking.returnDate).toLocaleDateString() 
          : null;
        
        // Format currency with symbol
        const currencySymbol = booking.currency === 'eur' ? '€' : 
          booking.currency === 'try' ? '₺' : '$';
        const formattedPrice = `${currencySymbol}${booking.totalPrice}`;
        
        // Set the document font
        doc.font('Helvetica');
        
        // Add company logo/header (using shapes for demonstration)
        doc.rect(50, 50, 495, 80)
          .fillColor('#0056b3')
          .fill();
        
        doc.fontSize(24)
          .fillColor('white')
          .text('FERRY TICKET SYSTEM', 70, 70)
          .fontSize(12)
          .text('Your Ticket to Adventure', 70, 100);
        
        // Add ticket specific info
        doc.fontSize(10)
          .fillColor('white')
          .text(`TICKET: ${booking.ticketNumber || generateTicketNumber()}`, 400, 70, { align: 'right' })
          .text(`PNR: ${booking.pnrNumber}`, 400, 85, { align: 'right' })
          .text(`Booking Ref: ${booking.bookingReference}`, 400, 100, { align: 'right' });
        
        // Add passenger information
        doc.fillColor('black')
          .fontSize(14)
          .text('Passenger Information', 50, 150)
          .moveTo(50, 170)
          .lineTo(545, 170)
          .strokeColor('#dddddd')
          .stroke();
        
        doc.fontSize(10)
          .text('Name:', 50, 180)
          .text(user.fullName || user.username, 150, 180)
          .text('Email:', 50, 200)
          .text(user.email, 150, 200)
          .text('Passenger Type:', 50, 220)
          .text(passengerType.name, 150, 220);
        
        if (vehicleType) {
          doc.text('Vehicle Type:', 50, 240)
            .text(vehicleType.name, 150, 240);
        }
        
        // Add route information
        doc.fontSize(14)
          .text('Journey Details', 50, 280)
          .moveTo(50, 300)
          .lineTo(545, 300)
          .strokeColor('#dddddd')
          .stroke();
        
        doc.fontSize(10)
          .text('Route:', 50, 310)
          .text(`${route.departurePort} → ${route.arrivalPort}`, 150, 310)
          .text('Departure Date:', 50, 330)
          .text(departureDate, 150, 330)
          .text('Departure Time:', 50, 350)
          .text(schedule.departureTime, 150, 350)
          .text('Arrival Time:', 50, 370)
          .text(schedule.arrivalTime, 150, 370);
        
        if (returnDate) {
          doc.text('Return Date:', 50, 390)
            .text(returnDate, 150, 390);
        }
        
        // Add payment information
        doc.fontSize(14)
          .text('Payment Details', 50, 420)
          .moveTo(50, 440)
          .lineTo(545, 440)
          .strokeColor('#dddddd')
          .stroke();
        
        doc.fontSize(10)
          .text('Total Price:', 50, 450)
          .text(formattedPrice, 150, 450)
          .text('Payment Status:', 50, 470)
          .text(booking.isPaid ? 'Paid' : 'Payment Pending', 150, 470);
        
        // Add boarding instructions
        doc.fontSize(14)
          .text('Boarding Instructions', 50, 500)
          .moveTo(50, 520)
          .lineTo(545, 520)
          .strokeColor('#dddddd')
          .stroke();
        
        doc.fontSize(10)
          .text('• Please arrive at least 60 minutes before the scheduled departure time.', 50, 530)
          .text('• Present this ticket or your booking reference at the check-in counter.', 50, 550)
          .text('• All passengers must carry valid identification documents.', 50, 570)
          .text('• Vehicles should arrive 90 minutes before departure for check-in.', 50, 590);
        
        // Add barcode (simulated with rectangle)
        doc.rect(50, 620, 200, 50)
          .fillColor('#000000')
          .fill();
        
        doc.rect(260, 620, 3, 50).fill();
        doc.rect(270, 620, 5, 50).fill();
        doc.rect(285, 620, 2, 50).fill();
        doc.rect(295, 620, 8, 50).fill();
        doc.rect(310, 620, 4, 50).fill();
        doc.rect(320, 620, 6, 50).fill();
        doc.rect(335, 620, 3, 50).fill();
        doc.rect(345, 620, 7, 50).fill();
        
        // Add QR code placeholder
        doc.rect(400, 620, 80, 80)
          .fillColor('#000000')
          .fillOpacity(0.8)
          .fill();
        
        // Stylized QR interior (simulation)
        doc.rect(410, 630, 60, 60)
          .fillColor('white')
          .fill();
        
        doc.rect(420, 640, 10, 10).fillColor('black').fill();
        doc.rect(440, 640, 10, 10).fillColor('black').fill();
        doc.rect(420, 660, 10, 10).fillColor('black').fill();
        doc.rect(420, 670, 40, 2).fillColor('black').fill();
        doc.rect(450, 650, 2, 20).fillColor('black').fill();
        
        // Add footer
        doc.fontSize(8)
          .fillColor('#666666')
          .text('Ferry Ticket System © 2023 - This ticket is non-refundable and non-transferable.',
            50, 730, { align: 'center' });
        
        doc.text('For assistance, contact customer support at support@ferrytickets.com or +1-555-FERRY-HELP',
          50, 745, { align: 'center' });
        
        // Finalize the PDF and end the stream
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get ticket by booking reference
   */
  async getTicketByBookingReference(bookingReference: string): Promise<{
    success: boolean;
    booking?: Booking;
    route?: Route;
    schedule?: Schedule;
    user?: User;
    pdfBuffer?: Buffer;
    error?: string;
  }> {
    try {
      // In a real implementation, we would retrieve the booking, associated data,
      // and the stored ticket from a database or file storage
      
      // For now, we'll return a mock success response for demo purposes
      console.log(`
🎫 DEMO MODE: Retrieving ticket for booking reference: ${bookingReference}
      `);
      
      return {
        success: true,
        // Other fields would be populated in a real implementation
      };
    } catch (error: any) {
      console.error('Error retrieving ticket:', error);
      return {
        success: false,
        error: error.message || 'Error retrieving ticket',
      };
    }
  }

  /**
   * Delete ticket by booking reference
   */
  async deleteTicket(bookingReference: string): Promise<boolean> {
    try {
      // In a real implementation, we would delete the ticket from storage
      
      // For now, we'll return success for demo purposes
      console.log(`
🎫 DEMO MODE: Deleting ticket for booking reference: ${bookingReference}
      `);
      
      return true;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return false;
    }
  }

  /**
   * Generate boarding passes for all passengers
   */
  async generateBoardingPasses(
    booking: Booking,
    route: Route,
    schedule: Schedule,
    user: User,
    passengerType: PassengerType
  ): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    error?: string;
  }> {
    try {
      if (pdfKitAvailable) {
        // Create boarding passes PDF
        const pdfBuffer = await this.generateBoardingPassContent(
          booking,
          route,
          schedule
        );
        
        return {
          success: true,
          pdfBuffer,
        };
      } else {
        // Demo mode - log boarding pass details
        console.log(`
🎫 DEMO MODE: Generating boarding passes for booking: ${booking.bookingReference}
Passenger: ${user.fullName || user.username}
Route: ${route.departurePort} → ${route.arrivalPort}
Departure: ${new Date(booking.departureDate).toLocaleDateString()} at ${schedule.departureTime}
        `);
        
        return {
          success: true,
        };
      }
    } catch (error: any) {
      console.error('Error generating boarding passes:', error);
      return {
        success: false,
        error: error.message || 'Error generating boarding passes',
      };
    }
  }

  /**
   * Generate boarding pass content
   */
  private generateBoardingPassContent(
    booking: Booking,
    route: Route,
    schedule: Schedule
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: [250, 350], // Small boarding pass size
        margin: 10,
      });
      
      // Collect PDF data chunks
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      // When PDF is complete, resolve with the buffer
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Format date
      const departureDate = new Date(booking.departureDate).toLocaleDateString();
      
      // Add header
      doc.rect(10, 10, 230, 40)
        .fillColor('#0056b3')
        .fill();
      
      doc.fontSize(14)
        .fillColor('white')
        .text('BOARDING PASS', 20, 20, { align: 'center' });
      
      // Add ferry logo (simulated)
      doc.rect(10, 60, 40, 40)
        .fillColor('#0056b3')
        .fill();
      
      // Add journey details
      doc.fillColor('black')
        .fontSize(12)
        .text('FERRY TICKET SYSTEM', 60, 60)
        .fontSize(10)
        .text(`${route.departurePort} → ${route.arrivalPort}`, 60, 75)
        .text(`${departureDate} • ${schedule.departureTime}`, 60, 90);
      
      // Add passenger and booking info
      doc.moveTo(10, 110)
        .lineTo(240, 110)
        .strokeColor('#dddddd')
        .stroke();
      
      doc.fontSize(10)
        .text('Passenger:', 10, 120)
        .text('PASSENGER NAME', 80, 120)
        .text('Booking Ref:', 10, 135)
        .text(booking.bookingReference, 80, 135)
        .text('PNR:', 10, 150)
        .text(booking.pnrNumber, 80, 150);
      
      // Add barcode (simulated)
      doc.rect(10, 180, 230, 30)
        .fillColor('#000000')
        .fillOpacity(0.1)
        .fill();
      
      // Add boarding instructions
      doc.fontSize(8)
        .fillColor('#666666')
        .text('Present this boarding pass at the gate', 10, 220, { align: 'center' })
        .text('Boarding closes 15 minutes before departure', 10, 235, { align: 'center' });
      
      // Add tear line
      doc.moveTo(10, 260)
        .lineTo(240, 260)
        .dash(3, { space: 4 })
        .strokeColor('#999999')
        .stroke();
      
      // Add footer
      doc.fontSize(7)
        .fillColor('#999999')
        .text('Ferry Ticket System © 2023', 10, 270, { align: 'center' })
        .text('Terms and conditions apply', 10, 280, { align: 'center' });
      
      // Finalize the PDF and end the stream
      doc.end();
    });
  }
}

export const ticketGeneratorService = new TicketGeneratorService();