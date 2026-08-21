/**
 * Utility functions for services
 */

/**
 * Format date string to localized format
 * @param dateString - ISO date string or any valid date string
 * @param style - Formatting style ('short', 'medium', 'long', 'full')
 * @param locale - Locale string (e.g., 'tr-TR', 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  style: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'tr-TR'
): string {
  try {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateString}`);
      return dateString;
    }
    
    // Format options
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: style === 'short' ? '2-digit' : style === 'medium' ? 'short' : 'long',
      day: 'numeric',
      weekday: style === 'short' ? undefined : style === 'medium' ? 'short' : 'long'
    };
    
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format currency amount
 * @param amount - Amount string or number
 * @param currency - Currency code (e.g., 'TRY', 'USD', 'EUR')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: string | number,
  currency: string = 'TRY'
): string {
  try {
    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Check if amount is valid
    if (isNaN(numericAmount)) {
      console.warn(`Invalid amount: ${amount}`);
      return `${amount} ${currency}`;
    }
    
    // Currency symbols
    const symbols: Record<string, string> = {
      'TRY': '₺',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    
    // Get symbol or use currency code
    const symbol = symbols[currency] || currency;
    
    // Format based on currency
    if (currency === 'TRY') {
      // Turkish Lira formatting
      return `${symbol}${numericAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      // Other currencies
      return `${symbol}${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount} ${currency}`;
  }
}

/**
 * Format phone number for WhatsApp
 * @param phoneNumber - Phone number in any format
 * @returns Formatted phone number for WhatsApp (numbers only, no + prefix)
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  try {
    if (!phoneNumber) return '';
    
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // Remove country code if it's 90 (Turkey) and total digits > 10
    if (cleaned.startsWith('90') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    }
    
    // Add country code if not present (assuming Turkish number by default)
    if (cleaned.length <= 10) {
      cleaned = '90' + cleaned;
    }
    
    return cleaned;
  } catch (error) {
    console.error('Error formatting phone for WhatsApp:', error);
    return phoneNumber;
  }
}

/**
 * Generate a random string
 * @param length - Length of the random string
 * @param type - Type of characters ('alphanumeric', 'numeric', 'alphabetic')
 * @returns Random string
 */
export function generateRandomString(
  length: number = 6,
  type: 'alphanumeric' | 'numeric' | 'alphabetic' = 'alphanumeric'
): string {
  const chars = {
    alphanumeric: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numeric: '0123456789',
    alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  };
  
  const characters = chars[type];
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @param locale - Locale string (e.g., 'tr-TR', 'en-US')
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number, locale: string = 'tr-TR'): string {
  if (isNaN(minutes) || minutes < 0) {
    return '';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (locale.startsWith('tr')) {
    if (hours === 0) {
      return `${mins} dakika`;
    } else if (mins === 0) {
      return `${hours} saat`;
    } else {
      return `${hours} saat ${mins} dakika`;
    }
  } else {
    if (hours === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    } else if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
  }
}

/**
 * Format distance in kilometers to human-readable string
 * @param kilometers - Distance in kilometers
 * @param locale - Locale string (e.g., 'tr-TR', 'en-US')
 * @returns Formatted distance string
 */
export function formatDistance(kilometers: number, locale: string = 'tr-TR'): string {
  if (isNaN(kilometers) || kilometers < 0) {
    return '';
  }
  
  if (locale.startsWith('tr')) {
    return `${kilometers.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`;
  } else {
    return `${kilometers.toLocaleString('en-US', { maximumFractionDigits: 1 })} km`;
  }
}

/**
 * Truncate text to a certain length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 100, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Sanitize HTML content
 * @param html - HTML content to sanitize
 * @returns Sanitized text
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Trim whitespace
}

/**
 * Get file extension from filename or URL
 * @param filename - Filename or URL
 * @returns File extension without dot
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';
  
  // Remove query parameters
  const cleanName = filename.split('?')[0];
  
  // Extract extension
  const parts = cleanName.split('.');
  
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Check if a date is in the past
 * @param dateString - ISO date string
 * @returns True if date is in the past
 */
export function isDateInPast(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  
  return date < now;
}

/**
 * Check if a date is in the future
 * @param dateString - ISO date string
 * @returns True if date is in the future
 */
export function isDateInFuture(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  
  return date > now;
}

/**
 * Check if date is today
 * @param dateString - ISO date string
 * @returns True if date is today
 */
export function isDateToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Calculate days difference between two dates
 * @param date1 - First date (ISO string)
 * @param date2 - Second date (ISO string, defaults to today)
 * @returns Number of days difference
 */
export function daysDifference(date1: string, date2?: string): number {
  const d1 = new Date(date1);
  const d2 = date2 ? new Date(date2) : new Date();
  
  // Reset time part to compare dates only
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Parse date string to ISO format
 * @param dateString - Date string in various formats
 * @returns ISO date string or empty if invalid
 */
export function parseDate(dateString: string): string {
  try {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: ${dateString}`);
      return '';
    }
    
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing date:', error);
    return '';
  }
}