/**
 * HTML Ticket Generator
 * 
 * Generates HTML tickets for ferry bookings
 */

import { TicketData, TicketResult } from './ticket-service';

/**
 * Generate HTML ticket content
 * 
 * @param ticketData Ticket data
 * @param forPrinting Whether to optimize for printing
 * @returns HTML ticket content
 */
export async function generateHTMLTicket(
  ticketData: TicketData,
  forPrinting: boolean = false
): Promise<TicketResult> {
  try {
    // Get ferry company name with fallback
    const ferryCompanyName = ticketData.ferryCompanyName || 'Ferry Service';
    
    // Create HTML content for the ticket
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ferry Ticket - ${ticketData.booking.bookingReference}</title>
        <style>
          /* Base Styles */
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: ${forPrinting ? '#ffffff' : '#f5f7fa'};
            margin: 0;
            padding: ${forPrinting ? '0' : '20px'};
          }
          
          .ticket-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #fff;
            box-shadow: ${forPrinting ? 'none' : '0 4px 15px rgba(0, 0, 0, 0.1)'};
            border-radius: 8px;
            overflow: hidden;
            ${forPrinting ? 'border: 1px solid #ddd;' : ''}
          }
          
          /* Header Styles */
          .ticket-header {
            background-color: #0066cc;
            color: white;
            padding: 20px;
            position: relative;
          }
          
          .ticket-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            display: inline-block;
          }
          
          .ticket-header .company-name {
            font-size: 16px;
            margin-top: 5px;
            opacity: 0.9;
          }
          
          .ticket-header .booking-number {
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 14px;
            background-color: rgba(255, 255, 255, 0.3);
            padding: 5px 10px;
            border-radius: 20px;
          }
          
          /* Journey Info Styles */
          .journey-info {
            display: flex;
            flex-wrap: wrap;
            background-color: #f8faff;
            padding: 25px;
            position: relative;
            border-bottom: 1px solid #e0e5eb;
          }
          
          .journey-info .departure-info,
          .journey-info .arrival-info {
            flex: 1;
            min-width: 200px;
          }
          
          .journey-info h2 {
            font-size: 24px;
            margin: 0 0 5px 0;
            color: #0066cc;
          }
          
          .journey-info .port {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .journey-info .date-time {
            font-size: 14px;
            color: #555;
          }
          
          .journey-info .arrow {
            align-self: center;
            font-size: 30px;
            margin: 0 15px;
            color: #0066cc;
          }
          
          @media (max-width: 600px) {
            .journey-info {
              flex-direction: column;
            }
            
            .journey-info .arrow {
              transform: rotate(90deg);
              margin: 15px 0;
              text-align: center;
              width: 100%;
            }
          }
          
          /* Passenger Details Styles */
          .passenger-details {
            padding: 25px;
            border-bottom: 1px solid #e0e5eb;
          }
          
          .passenger-details h3 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            color: #0066cc;
            border-bottom: 1px solid #e0e5eb;
            padding-bottom: 10px;
          }
          
          .passenger-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .passenger-table th,
          .passenger-table td {
            padding: 10px;
            text-align: left;
            font-size: 14px;
          }
          
          .passenger-table th {
            background-color: #f1f5fb;
            font-weight: 600;
          }
          
          .passenger-table tr:nth-child(even) {
            background-color: #f9fbff;
          }
          
          /* Vehicle Details Styles (if applicable) */
          .vehicle-details {
            padding: 25px;
            border-bottom: 1px solid #e0e5eb;
          }
          
          .vehicle-details h3 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            color: #0066cc;
            border-bottom: 1px solid #e0e5eb;
            padding-bottom: 10px;
          }
          
          .vehicle-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .vehicle-table th,
          .vehicle-table td {
            padding: 10px;
            text-align: left;
            font-size: 14px;
          }
          
          .vehicle-table th {
            background-color: #f1f5fb;
            font-weight: 600;
          }
          
          .vehicle-table tr:nth-child(even) {
            background-color: #f9fbff;
          }
          
          /* QR Code Styles */
          .qr-section {
            padding: 25px;
            text-align: center;
            border-bottom: 1px solid #e0e5eb;
          }
          
          .qr-code {
            width: 150px;
            height: 150px;
            margin: 0 auto;
            background-color: #fff;
            padding: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          
          .qr-section p {
            margin-top: 10px;
            font-size: 14px;
            color: #555;
          }
          
          /* Important Notes Styles */
          .important-notes {
            padding: 25px;
            background-color: #fffdf0;
            border-bottom: 1px solid #e0e5eb;
          }
          
          .important-notes h3 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            color: #e6b800;
          }
          
          .important-notes ul {
            margin: 0;
            padding-left: 20px;
          }
          
          .important-notes li {
            margin-bottom: 5px;
            font-size: 14px;
          }
          
          /* Footer Styles */
          .ticket-footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #777;
            background-color: #f5f7fa;
          }
          
          .ticket-footer p {
            margin: 5px 0;
          }
          
          /* Print-specific styles */
          @media print {
            body {
              background-color: #fff;
              padding: 0;
            }
            
            .ticket-container {
              box-shadow: none;
              border: 1px solid #ddd;
              max-width: 100%;
            }
            
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="ticket-header">
            <h1>FERRY TICKET</h1>
            <div class="company-name">${ferryCompanyName}</div>
            <div class="booking-number">Booking: ${ticketData.booking.bookingReference}</div>
          </div>
          
          <div class="journey-info">
            <div class="departure-info">
              <h2>FROM</h2>
              <div class="port">${ticketData.route.departurePort}</div>
              <div class="date-time">
                Date: ${new Date(ticketData.booking.departureDate).toLocaleDateString()}<br>
                Time: ${ticketData.schedule.departureTime}
              </div>
            </div>
            
            <div class="arrow">→</div>
            
            <div class="arrival-info">
              <h2>TO</h2>
              <div class="port">${ticketData.route.arrivalPort}</div>
              <div class="date-time">
                Date: ${new Date(ticketData.booking.departureDate).toLocaleDateString()}<br>
                Time: ${ticketData.schedule.arrivalTime}
              </div>
            </div>
          </div>
          
          <div class="passenger-details">
            <h3>Passenger Details</h3>
            <table class="passenger-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Document No.</th>
                </tr>
              </thead>
              <tbody>
                ${ticketData.passengerList.map((passenger, index) => {
                  const passengerType = ticketData.passengerTypes[passenger.passengerTypeId];
                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${passenger.firstName} ${passenger.lastName}</td>
                      <td>${passengerType ? passengerType.name : 'Unknown'}</td>
                      <td>${passenger.documentNumber || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          ${ticketData.vehicles && ticketData.vehicles.length > 0 ? `
            <div class="vehicle-details">
              <h3>Vehicle Details</h3>
              <table class="vehicle-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>License Plate</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketData.vehicles.map((vehicle, index) => {
                    const vehicleType = vehicle.vehicleTypeId && ticketData.vehicleTypes ? 
                      ticketData.vehicleTypes[vehicle.vehicleTypeId]?.name : 'Vehicle';
                    return `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${vehicleType}</td>
                        <td>${vehicle.licensePlate || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${ticketData.qrCodeData ? `
            <div class="qr-section">
              <div class="qr-code">
                <img src="${ticketData.qrCodeData}" alt="Boarding QR Code" width="150" height="150">
              </div>
              <p>Scan this QR code for boarding</p>
              <p><strong>PNR:</strong> ${ticketData.booking.pnrNumber}</p>
            </div>
          ` : ''}
          
          <div class="important-notes">
            <h3>Important Notes</h3>
            <ul>
              <li>Please arrive at the port at least 60 minutes before departure time.</li>
              <li>Valid identification documents are required for all passengers.</li>
              <li>Boarding closes 30 minutes before scheduled departure.</li>
              <li>This ticket must be presented at check-in and boarding.</li>
              <li>Please check-in at the terminal counter with your booking reference.</li>
            </ul>
          </div>
          
          <div class="ticket-footer">
            <p><strong>PNR:</strong> ${ticketData.booking.pnrNumber} | <strong>Booking Reference:</strong> ${ticketData.booking.bookingReference}</p>
            <p>Issued by ${ferryCompanyName} on ${new Date().toLocaleString()}</p>
            <p>&copy; 2025 ${ferryCompanyName}. All rights reserved.</p>
          </div>
        </div>
        
        ${!forPrinting ? `
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
              Print Ticket
            </button>
          </div>
        ` : ''}
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