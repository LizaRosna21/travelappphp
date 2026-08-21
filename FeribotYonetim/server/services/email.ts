/**
 * Email service for sending various types of emails
 * Integrated with SendGrid for production use, with fallback to demo mode
 */

import { Booking, Route, Schedule, User } from '@shared/schema';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if possible
let sendGridInitialized = false;
try {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendGridInitialized = true;
  } else {
    console.warn('SENDGRID_API_KEY not found in environment, email service will run in demo mode');
  }
} catch (error) {
  console.error('Failed to initialize SendGrid, email service will run in demo mode:', error);
}

/**
 * Interface for email service configurations
 */
interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html: string;
  attachments?: {
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }[];
}

/**
 * Email service class
 */
class EmailService {
  /**
   * System email used as 'from' address
   */
  private readonly systemEmail: string = 'noreply@ferrytickets.com';

  /**
   * Send an email using SendGrid, or log to console in demo mode
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Validate email options
      if (!options.to || !options.subject || !options.html) {
        throw new Error('Missing required email options');
      }

      // Set default 'from' if not provided
      if (!options.from) {
        options.from = this.systemEmail;
      }

      // Always set plain text if not provided
      if (!options.text) {
        options.text = this.stripHtml(options.html);
      }

      if (sendGridInitialized) {
        // Send email with SendGrid
        await sgMail.send(options);
        console.log(`Email sent to ${options.to}`);
        return true;
      } else {
        // Demo mode - log email to console
        console.log(`
📧 DEMO MODE: Email would be sent to: ${options.to}
From: ${options.from}
Subject: ${options.subject}
Body (text): ${options.text}
Attachments: ${options.attachments ? options.attachments.length : 0}
        `);
        return true;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Generate booking confirmation email template
   */
  getBookingConfirmationTemplate(
    user: User,
    booking: Booking,
    route: Route,
    schedule: Schedule,
    pdfBuffer?: Buffer
  ): EmailOptions {
    // Format dates
    const departureDate = new Date(booking.departureDate).toLocaleDateString();
    const returnDate = booking.returnDate ? new Date(booking.returnDate).toLocaleDateString() : null;
    
    // Format currency with symbol
    const currencySymbol = booking.currency === 'eur' ? '€' : 
      booking.currency === 'try' ? '₺' : '$';
    const formattedPrice = `${currencySymbol}${booking.totalPrice}`;
    
    // Create email HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #0056b3;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
            background-color: #f9f9f9;
          }
          .booking-details {
            background-color: white;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
          }
          .booking-ref {
            font-size: 20px;
            font-weight: bold;
            color: #0056b3;
          }
          .important-info {
            background-color: #f8f9fa;
            border-left: 4px solid #0056b3;
            padding: 10px 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            padding: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th {
            background-color: #f2f2f2;
            text-align: left;
            padding: 8px;
          }
          td {
            padding: 8px;
          }
          .button {
            display: inline-block;
            background-color: #0056b3;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Ferry Booking is Confirmed!</h1>
          </div>
          
          <div class="content">
            <p>Dear ${user.fullName || user.username},</p>
            
            <p>Thank you for booking with Ferry Ticket System. Your booking has been confirmed and your ticket is attached to this email.</p>
            
            <div class="booking-details">
              <p class="booking-ref">Booking Reference: ${booking.bookingReference}</p>
              <p>PNR: ${booking.pnrNumber}</p>
              
              <h3>Route Details</h3>
              <table>
                <tr>
                  <th>From</th>
                  <td>${route.departurePort}</td>
                </tr>
                <tr>
                  <th>To</th>
                  <td>${route.arrivalPort}</td>
                </tr>
                <tr>
                  <th>Departure Date</th>
                  <td>${departureDate}</td>
                </tr>
                <tr>
                  <th>Departure Time</th>
                  <td>${schedule.departureTime}</td>
                </tr>
                <tr>
                  <th>Arrival Time</th>
                  <td>${schedule.arrivalTime}</td>
                </tr>
                ${returnDate ? `
                <tr>
                  <th>Return Date</th>
                  <td>${returnDate}</td>
                </tr>
                ` : ''}
                <tr>
                  <th>Total Price</th>
                  <td>${formattedPrice}</td>
                </tr>
                <tr>
                  <th>Payment Status</th>
                  <td>${booking.isPaid ? 'Paid' : 'Payment Pending'}</td>
                </tr>
              </table>
            </div>
            
            <div class="important-info">
              <h3>Important Information</h3>
              <ul>
                <li>Please arrive at the port at least 60 minutes before departure time.</li>
                <li>Present your booking reference or the attached ticket at the check-in counter.</li>
                <li>All passengers must have valid identification documents.</li>
                <li>Vehicles should arrive 90 minutes before departure for check-in.</li>
              </ul>
            </div>
            
            <p>You can view your booking details and manage your reservation by logging into your account.</p>
            
            <div style="text-align: center;">
              <a href="https://ferrytickets.com/my-bookings" class="button">View Your Booking</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>Ferry Ticket System &copy; 2023 | <a href="https://ferrytickets.com/terms">Terms & Conditions</a> | <a href="https://ferrytickets.com/privacy">Privacy Policy</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create email options
    const emailOptions: EmailOptions = {
      to: user.email,
      from: this.systemEmail,
      subject: `Booking Confirmation - ${booking.bookingReference}`,
      html,
    };

    // If PDF buffer is provided, attach it to the email
    if (pdfBuffer) {
      emailOptions.attachments = [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Ticket_${booking.bookingReference}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];
    }

    return emailOptions;
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    user: User,
    booking: Booking,
    route: Route,
    schedule: Schedule,
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    try {
      const emailOptions = this.getBookingConfirmationTemplate(
        user,
        booking,
        route,
        schedule,
        pdfBuffer
      );
      
      return await this.sendEmail(emailOptions);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      return false;
    }
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(
    user: User,
    booking: Booking,
    route: Route,
    paymentDate: Date,
    paymentMethod?: {
      type: string;
      last4?: string;
      brand?: string;
    }
  ): Promise<boolean> {
    try {
      // Format dates
      const formattedPaymentDate = paymentDate.toLocaleDateString();
      
      // Format currency with symbol
      const currencySymbol = booking.currency === 'eur' ? '€' : 
        booking.currency === 'try' ? '₺' : '$';
      const formattedPrice = `${currencySymbol}${booking.totalPrice}`;
      
      // Create email HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #28a745;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .payment-details {
              background-color: white;
              border-radius: 5px;
              padding: 15px;
              margin-bottom: 20px;
              border: 1px solid #ddd;
            }
            .booking-ref {
              font-size: 18px;
              font-weight: bold;
              color: #28a745;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th {
              background-color: #f2f2f2;
              text-align: left;
              padding: 8px;
            }
            td {
              padding: 8px;
            }
            .button {
              display: inline-block;
              background-color: #28a745;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
            </div>
            
            <div class="content">
              <p>Dear ${user.fullName || user.username},</p>
              
              <p>Thank you for your payment. This email serves as your official payment receipt.</p>
              
              <div class="payment-details">
                <p class="booking-ref">Booking Reference: ${booking.bookingReference}</p>
                
                <h3>Payment Details</h3>
                <table>
                  <tr>
                    <th>Payment Date</th>
                    <td>${formattedPaymentDate}</td>
                  </tr>
                  <tr>
                    <th>Amount Paid</th>
                    <td>${formattedPrice}</td>
                  </tr>
                  ${paymentMethod ? `
                  <tr>
                    <th>Payment Method</th>
                    <td>${paymentMethod.type}${paymentMethod.brand && paymentMethod.last4 ? ` (${paymentMethod.brand} ending in ${paymentMethod.last4})` : ''}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <th>Status</th>
                    <td>Completed</td>
                  </tr>
                </table>
                
                <h3>Booking Summary</h3>
                <table>
                  <tr>
                    <th>Route</th>
                    <td>${route.departurePort} → ${route.arrivalPort}</td>
                  </tr>
                  <tr>
                    <th>Service</th>
                    <td>Ferry Transportation</td>
                  </tr>
                </table>
              </div>
              
              <p>You can view your booking details and access your ticket by logging into your account.</p>
              
              <div style="text-align: center;">
                <a href="https://ferrytickets.com/my-bookings" class="button">View Your Booking</a>
              </div>
              
              <p>If you have any questions regarding your payment or booking, please contact our customer support team.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
              <p>Ferry Ticket System &copy; 2023 | <a href="https://ferrytickets.com/terms">Terms & Conditions</a> | <a href="https://ferrytickets.com/privacy">Privacy Policy</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create email options
      const emailOptions: EmailOptions = {
        to: user.email,
        from: this.systemEmail,
        subject: `Payment Receipt - ${booking.bookingReference}`,
        html,
      };
      
      return await this.sendEmail(emailOptions);
    } catch (error) {
      console.error('Error sending payment receipt email:', error);
      return false;
    }
  }

  /**
   * Send booking reminder email (24 hours before departure)
   */
  async sendBookingReminder(
    user: User,
    booking: Booking,
    route: Route,
    schedule: Schedule
  ): Promise<boolean> {
    try {
      // Format dates
      const departureDate = new Date(booking.departureDate).toLocaleDateString();
      
      // Create email HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trip Reminder</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #ff9800;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .trip-details {
              background-color: white;
              border-radius: 5px;
              padding: 15px;
              margin-bottom: 20px;
              border: 1px solid #ddd;
            }
            .booking-ref {
              font-size: 18px;
              font-weight: bold;
              color: #ff9800;
            }
            .important-info {
              background-color: #fff3e0;
              border-left: 4px solid #ff9800;
              padding: 10px 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th {
              background-color: #f2f2f2;
              text-align: left;
              padding: 8px;
            }
            td {
              padding: 8px;
            }
            .button {
              display: inline-block;
              background-color: #ff9800;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Trip Reminder - Tomorrow's Ferry Departure</h1>
            </div>
            
            <div class="content">
              <p>Dear ${user.fullName || user.username},</p>
              
              <p>This is a friendly reminder that your ferry departs <strong>tomorrow</strong>. Please find your trip details below:</p>
              
              <div class="trip-details">
                <p class="booking-ref">Booking Reference: ${booking.bookingReference}</p>
                
                <h3>Trip Details</h3>
                <table>
                  <tr>
                    <th>From</th>
                    <td>${route.departurePort}</td>
                  </tr>
                  <tr>
                    <th>To</th>
                    <td>${route.arrivalPort}</td>
                  </tr>
                  <tr>
                    <th>Departure Date</th>
                    <td>${departureDate}</td>
                  </tr>
                  <tr>
                    <th>Departure Time</th>
                    <td>${schedule.departureTime}</td>
                  </tr>
                </table>
              </div>
              
              <div class="important-info">
                <h3>Important Reminders</h3>
                <ul>
                  <li><strong>Check-in time:</strong> Please arrive at the port at least 60 minutes before departure time.</li>
                  <li><strong>Required documents:</strong> Bring your booking reference and valid identification documents for all passengers.</li>
                  <li><strong>Vehicles:</strong> If you're traveling with a vehicle, please arrive 90 minutes before departure.</li>
                  <li><strong>Weather conditions:</strong> Check the latest weather forecasts before your journey.</li>
                </ul>
              </div>
              
              <p>You can view your complete booking details by logging into your account.</p>
              
              <div style="text-align: center;">
                <a href="https://ferrytickets.com/my-bookings" class="button">View Your Booking</a>
              </div>
              
              <p>We hope you have a pleasant journey!</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
              <p>Ferry Ticket System &copy; 2023 | <a href="https://ferrytickets.com/terms">Terms & Conditions</a> | <a href="https://ferrytickets.com/privacy">Privacy Policy</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create email options
      const emailOptions: EmailOptions = {
        to: user.email,
        from: this.systemEmail,
        subject: `Reminder: Your Ferry Departs Tomorrow - ${booking.bookingReference}`,
        html,
      };
      
      return await this.sendEmail(emailOptions);
    } catch (error) {
      console.error('Error sending booking reminder email:', error);
      return false;
    }
  }

  /**
   * Send marketing newsletter
   */
  async sendNewsletter(
    recipients: string[],
    subject: string,
    content: string,
    promotionCode?: string
  ): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
  }> {
    try {
      let sentCount = 0;
      let failedCount = 0;
      
      // Basic HTML template for newsletter
      const createNewsletterHtml = (content: string) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0056b3;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .promo-code {
              background-color: #e8f4fd;
              border: 2px dashed #0056b3;
              text-align: center;
              padding: 15px;
              margin: 20px 0;
              font-size: 18px;
              font-weight: bold;
              color: #0056b3;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              padding: 20px;
            }
            .button {
              display: inline-block;
              background-color: #0056b3;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin-top: 10px;
            }
            .unsubscribe {
              font-size: 11px;
              color: #999;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ferry Ticket System</h1>
            </div>
            
            <div class="content">
              ${content}
              
              ${promotionCode ? `
              <div class="promo-code">
                Use promo code: ${promotionCode}
              </div>
              ` : ''}
              
              <div style="text-align: center;">
                <a href="https://ferrytickets.com/promotions" class="button">View All Promotions</a>
              </div>
            </div>
            
            <div class="footer">
              <p>Ferry Ticket System &copy; 2023 | <a href="https://ferrytickets.com/terms">Terms & Conditions</a> | <a href="https://ferrytickets.com/privacy">Privacy Policy</a></p>
              <p class="unsubscribe">If you prefer not to receive these emails, you can <a href="https://ferrytickets.com/unsubscribe">unsubscribe</a>.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      if (sendGridInitialized && recipients.length > 0) {
        // In production, we'd use SendGrid's bulk sending capabilities
        // For this demo, we'll send individual emails
        for (const recipient of recipients) {
          try {
            const emailOptions: EmailOptions = {
              to: recipient,
              from: this.systemEmail,
              subject,
              html: createNewsletterHtml(content),
            };
            
            await this.sendEmail(emailOptions);
            sentCount++;
          } catch (error) {
            console.error(`Error sending newsletter to ${recipient}:`, error);
            failedCount++;
          }
        }
      } else {
        // Demo mode - log newsletter details
        console.log(`
📧 DEMO MODE: Newsletter would be sent to ${recipients.length} recipients
Subject: ${subject}
Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}
Promo Code: ${promotionCode || 'None'}
        `);
        
        sentCount = recipients.length;
      }
      
      return {
        success: failedCount === 0,
        sentCount,
        failedCount,
      };
    } catch (error) {
      console.error('Error sending newsletter:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: recipients.length,
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user: User, resetToken: string, resetUrl: string): Promise<boolean> {
    try {
      // Create email HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #6c757d;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .reset-button {
              display: inline-block;
              background-color: #0056b3;
              color: white;
              text-decoration: none;
              padding: 12px 25px;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .security-note {
              background-color: #f8f9fa;
              border-left: 4px solid #6c757d;
              padding: 10px 15px;
              margin: 20px 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            
            <div class="content">
              <p>Dear ${user.fullName || user.username},</p>
              
              <p>We received a request to reset your password for your Ferry Ticket System account. Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>
              
              <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
              
              <p style="word-break: break-all; background-color: #f2f2f2; padding: 10px; font-size: 14px;">
                ${resetUrl}
              </p>
              
              <div class="security-note">
                <p><strong>Security Notice:</strong></p>
                <ul>
                  <li>This password reset link will expire in 30 minutes.</li>
                  <li>If you didn't request a password reset, you can safely ignore this email.</li>
                  <li>For security, please create a strong password that you don't use for other websites.</li>
                </ul>
              </div>
              
              <p>If you have any questions or need further assistance, please contact our customer support team.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
              <p>Ferry Ticket System &copy; 2023 | <a href="https://ferrytickets.com/terms">Terms & Conditions</a> | <a href="https://ferrytickets.com/privacy">Privacy Policy</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create email options
      const emailOptions: EmailOptions = {
        to: user.email,
        from: this.systemEmail,
        subject: 'Password Reset Request - Ferry Ticket System',
        html,
      };
      
      return await this.sendEmail(emailOptions);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Strip HTML to create plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const emailService = new EmailService();