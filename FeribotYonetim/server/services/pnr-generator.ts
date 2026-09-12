/**
 * Service for generating various reference numbers
 * Including booking references, PNRs, invoice numbers and ticket numbers
 */

/**
 * Generate random alphanumeric string
 */
const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateRandomString(length: number, onlyUppercase: boolean = false): string {
  const chars = onlyUppercase
    ? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Get date component in format YYMMDD
 */
function getDateComponent(): string {
  const date = new Date();
  const year = date.getFullYear().toString().substring(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}${month}${day}`;
}

/**
 * Generate booking reference in format PREFIX-YYMMDD-XXXXX
 * Where:
 * - PREFIX: Ürün kısaltması (FER = feribot, TRF = transfer)
 * - YYMMDD: Current date
 * - XXXXX: Random alphanumeric characters
 */
export function generateBookingReference(prefix: string = 'FER'): string {
  const dateComponent = getDateComponent();
  const randomComponent = generateRandomString(5, true);
  
  return `${prefix}-${dateComponent}-${randomComponent}`;
}

/**
 * Generate PNR (Passenger Name Record) number
 * Format: 2 letters followed by 6 numbers
 */
export function generatePNR(): string {
  // Generate 2 random uppercase letters.
  // Not: harfler daha önce rakam da içeren bir alfabeden üretilip rakamlar
  // sonradan silindiği için PNR bazen 6, bazen 7, bazen 8 karakter oluyordu;
  // bu da pnr_number benzersiz kısıtında gereksiz çakışmalara yol açıyordu.
  const letters = Array.from(
    { length: 2 },
    () => UPPERCASE_LETTERS.charAt(Math.floor(Math.random() * UPPERCASE_LETTERS.length)),
  ).join('');
  
  // Generate 6 random digits
  const numbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
  
  return `${letters}${numbers}`;
}

/**
 * Generate invoice number in format INV-YYMMDD-XXXX
 * Where:
 * - INV: Prefix for invoice
 * - YYMMDD: Current date
 * - XXXX: Random alphanumeric characters
 */
export function generateInvoiceNumber(): string {
  const dateComponent = getDateComponent();
  const randomComponent = generateRandomString(4, true);
  
  return `INV-${dateComponent}-${randomComponent}`;
}

/**
 * Generate ticket number in format TKT-YYMMDD-XXXXXX
 */
export function generateTicketNumber(): string {
  const dateComponent = getDateComponent();
  const randomComponent = generateRandomString(6, true);
  
  return `TKT-${dateComponent}-${randomComponent}`;
}

/**
 * Generate confirmation code for email verification
 * Format: 6 uppercase alphanumeric characters
 */
export function generateConfirmationCode(): string {
  return generateRandomString(6, true);
}

/**
 * Generate password reset token
 * Format: 32 character random string
 */
export function generatePasswordResetToken(): string {
  return generateRandomString(32);
}

/**
 * Generate API key for B2B integration
 * Format: FT_API_XXXXXXXXXXXXXXXXXXXXX
 * Where XXXXX is a 25 character alphanumeric string
 */
export function generateApiKey(): string {
  return `FT_API_${generateRandomString(25)}`;
}

/**
 * Generate group booking code (shorter, easier to remember)
 * Format: 4 uppercase letters
 */
export function generateGroupCode(): string {
  return generateRandomString(4, true).replace(/[0-9]/g, '');
}

/**
 * Generate a seat reference
 * Format: A combination of deck number, seat zone and seat number
 * Example: D1-A-23 (Deck 1, Zone A, Seat 23)
 */
export function generateSeatReference(deck: number, zone: string, seatNumber: number): string {
  return `D${deck}-${zone}-${seatNumber}`;
}

/**
 * Generate a UUID-like ferry booking ID for internal use
 */
export function generateInternalBookingId(): string {
  // Simple UUID-like format (not a proper UUID)
  const parts = [
    generateRandomString(8, true),
    generateRandomString(4, true),
    generateRandomString(4, true),
    generateRandomString(4, true),
    generateRandomString(12, true),
  ];
  
  return parts.join('-');
}