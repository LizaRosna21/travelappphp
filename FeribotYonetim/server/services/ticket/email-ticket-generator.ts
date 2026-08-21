/**
 * Email Ticket Generator
 * 
 * Generates email-formatted tickets for ferry bookings
 */

import { TicketData, TicketResult } from './ticket-service';

/**
 * Interface for email options
 */
export interface EmailTicketOptions {
  from: string;
  replyTo?: string;
  subject?: string;
  includeAttachments?: boolean;
  customMessage?: string;
  companyLogo?: string;
  companyFooter?: string;
}

/**
 * Generate email ticket content
 * 
 * @param ticketData Ticket data
 * @param options Email formatting options
 * @returns Email content as HTML
 */
export async function generateEmailTicket(
  ticketData: TicketData,
  options: EmailTicketOptions
): Promise<TicketResult> {
  try {
    // Get ferry company name with fallback
    const ferryCompanyName = ticketData.ferryCompanyName || 'Ferry Service';
    
    // Default subject if not provided
    const subject = options.subject || `Your Ferry Ticket - ${ticketData.booking.bookingReference}`;
    
    // Create HTML email content with inline styles for email client compatibility
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f7fa; margin: 0; padding: 0;">
        <!-- Email Wrapper -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <!-- Email Container -->
              <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); margin: 0 auto;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #0066cc; padding: 30px 40px; text-align: center; color: white;">
                    ${options.companyLogo ? 
                      `<img src="${options.companyLogo}" alt="${ferryCompanyName}" style="max-width: 180px; height: auto; margin-bottom: 20px;" />` : 
                      `<h1 style="margin: 0; font-size: 28px;">${ferryCompanyName}</h1>`
                    }
                    <h2 style="margin: 10px 0 0; font-size: 20px; font-weight: 400;">Your Ferry Ticket is Confirmed</h2>
                  </td>
                </tr>
                
                <!-- Intro Message -->
                <tr>
                  <td style="padding: 40px 40px 20px;">
                    <p style="margin-top: 0; font-size: 16px;">Dear ${ticketData.user?.fullName || 'Valued Customer'},</p>
                    
                    ${options.customMessage ? 
                      `<p style="font-size: 16px;">${options.customMessage}</p>` :
                      `<p style="font-size: 16px;">Thank you for booking with ${ferryCompanyName}. Your ferry ticket is confirmed and ready. Please find your booking details below.</p>`
                    }
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">Please save or print this ticket and present it at check-in.</p>
                  </td>
                </tr>
                
                <!-- Booking Reference -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <table width="100%" style="border-radius: 6px; overflow: hidden; border: 1px dashed #0066cc; background-color: #f1f7ff;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <h3 style="margin: 0 0 10px; color: #0066cc; font-size: 18px;">Booking Reference</h3>
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0066cc; letter-spacing: 2px;">${ticketData.booking.bookingReference}</p>
                          <p style="margin: 8px 0 0; font-size: 14px;">PNR: ${ticketData.booking.pnrNumber}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Journey Info -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <h3 style="margin: 0 0 20px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Journey Details</h3>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="45%" valign="top">
                          <h4 style="margin: 0 0 5px; color: #0066cc; font-size: 16px;">FROM</h4>
                          <p style="margin: 0 0 5px; font-size: 18px; font-weight: 600;">${ticketData.route.departurePort}</p>
                          <p style="margin: 0; font-size: 14px; color: #555;">
                            Date: ${new Date(ticketData.booking.departureDate).toLocaleDateString()}<br>
                            Time: ${ticketData.schedule.departureTime}
                          </p>
                        </td>
                        
                        <td width="10%" valign="center" style="text-align: center;">
                          <span style="font-size: 24px; color: #0066cc;">→</span>
                        </td>
                        
                        <td width="45%" valign="top">
                          <h4 style="margin: 0 0 5px; color: #0066cc; font-size: 16px;">TO</h4>
                          <p style="margin: 0 0 5px; font-size: 18px; font-weight: 600;">${ticketData.route.arrivalPort}</p>
                          <p style="margin: 0; font-size: 14px; color: #555;">
                            Date: ${new Date(ticketData.booking.departureDate).toLocaleDateString()}<br>
                            Time: ${ticketData.schedule.arrivalTime}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Passenger Details -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <h3 style="margin: 0 0 20px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Passenger Details</h3>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                      <tr style="background-color: #f1f5fb;">
                        <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">#</th>
                        <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">Name</th>
                        <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">Type</th>
                        <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">Document No.</th>
                      </tr>
                      ${ticketData.passengerList.map((passenger, index) => {
                        const passengerType = ticketData.passengerTypes[passenger.passengerTypeId];
                        return `
                          <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fbff'};">
                            <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${index + 1}</td>
                            <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${passenger.firstName} ${passenger.lastName}</td>
                            <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${passengerType ? passengerType.name : 'Unknown'}</td>
                            <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${passenger.documentNumber || '-'}</td>
                          </tr>
                        `;
                      }).join('')}
                    </table>
                  </td>
                </tr>
                
                ${ticketData.vehicles && ticketData.vehicles.length > 0 ? `
                  <!-- Vehicle Details -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <h3 style="margin: 0 0 20px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Vehicle Details</h3>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                        <tr style="background-color: #f1f5fb;">
                          <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">#</th>
                          <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">Type</th>
                          <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">License Plate</th>
                        </tr>
                        ${ticketData.vehicles.map((vehicle, index) => {
                          const vehicleType = vehicle.vehicleTypeId && ticketData.vehicleTypes ? 
                            ticketData.vehicleTypes[vehicle.vehicleTypeId]?.name : 'Vehicle';
                          return `
                            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fbff'};">
                              <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${index + 1}</td>
                              <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${vehicleType}</td>
                              <td style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e0e5eb;">${vehicle.licensePlate || '-'}</td>
                            </tr>
                          `;
                        }).join('')}
                      </table>
                    </td>
                  </tr>
                ` : ''}
                
                <!-- Important Notes -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <h3 style="margin: 0 0 20px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Important Notes</h3>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffdf0; border-radius: 6px; border: 1px solid #f5eddc;">
                      <tr>
                        <td style="padding: 20px;">
                          <ul style="margin: 0; padding: 0 0 0 20px;">
                            <li style="margin-bottom: 8px; font-size: 14px;">Please arrive at the port at least 60 minutes before departure time.</li>
                            <li style="margin-bottom: 8px; font-size: 14px;">Valid identification documents are required for all passengers.</li>
                            <li style="margin-bottom: 8px; font-size: 14px;">Boarding closes 30 minutes before scheduled departure.</li>
                            <li style="margin-bottom: 8px; font-size: 14px;">This ticket must be presented at check-in and boarding.</li>
                            <li style="font-size: 14px;">Please check-in at the terminal counter with your booking reference.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- QR Code Section -->
                ${ticketData.qrCodeData ? `
                  <tr>
                    <td style="padding: 0 40px 30px; text-align: center;">
                      <h3 style="margin: 0 0 20px; font-size: 18px; color: #333; text-align: center;">Boarding Pass</h3>
                      <div style="background-color: #fff; display: inline-block; padding: 12px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;">
                        <img src="${ticketData.qrCodeData}" alt="Boarding QR Code" width="150" height="150" style="display: block;" />
                      </div>
                      <p style="margin: 0; font-size: 14px; color: #555;">Scan this QR code for boarding</p>
                    </td>
                  </tr>
                ` : ''}
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f5f7fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e5eb;">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #777;">PNR: ${ticketData.booking.pnrNumber} | Booking Reference: ${ticketData.booking.bookingReference}</p>
                    <p style="margin: 0 0 10px; font-size: 12px; color: #777;">Issued by ${ferryCompanyName} on ${new Date().toLocaleString()}</p>
                    ${options.companyFooter ? 
                      `<p style="margin: 0; font-size: 12px; color: #777;">${options.companyFooter}</p>` : 
                      `<p style="margin: 0; font-size: 12px; color: #777;">&copy; 2025 ${ferryCompanyName}. All rights reserved.</p>`
                    }
                  </td>
                </tr>
              </table>
              
              <!-- Email Footer -->
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto 0;">
                <tr>
                  <td style="padding: 0 40px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #999;">
                      This email was sent to ${ticketData.user?.email || 'you'} regarding your booking with ${ferryCompanyName}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    return {
      success: true,
      pnrNumber: ticketData.booking.pnrNumber,
      bookingReference: ticketData.booking.bookingReference,
      content: emailContent
    };
  } catch (error) {
    console.error('Error generating email ticket:', error);
    return {
      success: false,
      error: `Failed to generate email ticket: ${error.message}`
    };
  }
}