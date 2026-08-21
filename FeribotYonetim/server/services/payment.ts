/**
 * Payment processing service
 * Integrated with Stripe for production use, with fallback to demo mode
 */

import { Booking } from '@shared/schema';
import Stripe from 'stripe';

// Initialize Stripe if possible
let stripeClient: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  } else {
    console.warn('STRIPE_SECRET_KEY not found in environment, payment service will run in demo mode');
  }
} catch (error) {
  console.error('Failed to initialize Stripe, payment service will run in demo mode:', error);
}

/**
 * Payment service class for handling payment operations
 */
class PaymentService {
  /**
   * Create a payment intent for booking
   * Use Stripe in production, mock in demo mode
   */
  async createBookingPayment(booking: Booking): Promise<{
    success: boolean;
    clientSecret?: string;
    paymentIntentId?: string;
    error?: string;
  }> {
    try {
      // Extract total price from booking
      const amount = parseFloat(booking.totalPrice) * 100; // Convert to cents
      
      // Determine currency code
      const currency = booking.currency?.toLowerCase() || 'usd';
      
      if (stripeClient) {
        // Create payment intent with Stripe
        const paymentIntent = await stripeClient.paymentIntents.create({
          amount: Math.round(amount),
          currency,
          metadata: {
            bookingId: booking.id.toString(),
            bookingReference: booking.bookingReference,
            userId: booking.userId.toString(),
          },
        });
        
        return {
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      } else {
        // Demo mode - create a fake client secret
        console.log(`
💰 DEMO MODE: Creating payment intent for booking: ${booking.bookingReference}
Amount: ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}
        `);
        
        // Generate a fake Stripe-like payment intent ID and client secret
        const fakePaymentIntentId = `pi_${Math.random().toString(36).substring(2, 15)}`;
        const fakeClientSecret = `${fakePaymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          success: true,
          clientSecret: fakeClientSecret,
          paymentIntentId: fakePaymentIntentId,
        };
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message || 'Error creating payment intent',
      };
    }
  }

  /**
   * Process successful payment
   */
  async processSuccessfulPayment(bookingId: number, paymentIntentId: string): Promise<{
    success: boolean;
    booking?: Booking;
    paymentDate: Date;
    paymentMethodDetails?: {
      paymentMethodType: string;
      last4?: string;
      cardBrand?: string;
    };
    error?: string;
  }> {
    try {
      const paymentDate = new Date();
      
      if (stripeClient && paymentIntentId) {
        // Get payment intent from Stripe
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId, {
          expand: ['payment_method'],
        });
        
        if (paymentIntent.status !== 'succeeded') {
          return {
            success: false,
            paymentDate,
            error: `Payment not successful. Status: ${paymentIntent.status}`,
          };
        }
        
        // Extract payment method details
        const paymentMethodDetails = {
          paymentMethodType: 'card', // Default
          last4: undefined,
          cardBrand: undefined,
        };
        
        // If payment method exists, extract details
        if (paymentIntent.payment_method && typeof paymentIntent.payment_method !== 'string') {
          const { card } = paymentIntent.payment_method as any;
          
          if (card) {
            paymentMethodDetails.last4 = card.last4;
            paymentMethodDetails.cardBrand = this.formatPaymentMethodName(card.brand);
          }
        }
        
        // In a real implementation, we would update the booking in the database
        // For now, we'll return the details for use in subsequent operations
        return {
          success: true,
          paymentDate,
          paymentMethodDetails,
        };
      } else {
        // Demo mode - simulate successful payment
        console.log(`
💰 DEMO MODE: Processing successful payment for booking ID: ${bookingId}
Payment Intent ID: ${paymentIntentId}
        `);
        
        // Create fake payment method details
        const paymentMethodDetails = {
          paymentMethodType: 'card',
          last4: '4242', // Typical Stripe test card ending
          cardBrand: 'Visa',
        };
        
        return {
          success: true,
          paymentDate,
          paymentMethodDetails,
        };
      }
    } catch (error: any) {
      console.error('Error processing successful payment:', error);
      return {
        success: false,
        paymentDate: new Date(),
        error: error.message || 'Error processing successful payment',
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    bookingId: number,
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{
    success: boolean;
    refundId?: string;
    refundDate?: Date;
    error?: string;
  }> {
    try {
      const refundDate = new Date();
      
      if (stripeClient && paymentIntentId) {
        // Process refund through Stripe
        const refundOptions: Stripe.RefundCreateParams = {
          payment_intent: paymentIntentId,
          metadata: {
            bookingId: bookingId.toString(),
            reason: reason || 'Customer requested',
          },
        };
        
        // If amount is specified, add it to the refund
        if (amount) {
          refundOptions.amount = Math.round(amount * 100); // Convert to cents
        }
        
        const refund = await stripeClient.refunds.create(refundOptions);
        
        return {
          success: true,
          refundId: refund.id,
          refundDate,
        };
      } else {
        // Demo mode - simulate refund
        console.log(`
💰 DEMO MODE: Processing refund for booking ID: ${bookingId}
Payment Intent ID: ${paymentIntentId}
Amount: ${amount ? `${amount.toFixed(2)}` : 'Full amount'}
Reason: ${reason || 'Customer requested'}
        `);
        
        // Generate a fake Stripe-like refund ID
        const fakeRefundId = `re_${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          success: true,
          refundId: fakeRefundId,
          refundDate,
        };
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error.message || 'Error processing refund',
      };
    }
  }

  /**
   * Get payment method details
   */
  async getPaymentMethodDetails(paymentMethodId: string): Promise<{
    success: boolean;
    paymentMethodType?: string;
    last4?: string;
    cardBrand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    error?: string;
  }> {
    try {
      if (stripeClient && paymentMethodId) {
        // Get payment method from Stripe
        const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId);
        
        // Extract payment method details
        if (paymentMethod.type === 'card' && paymentMethod.card) {
          return {
            success: true,
            paymentMethodType: paymentMethod.type,
            last4: paymentMethod.card.last4,
            cardBrand: this.formatPaymentMethodName(paymentMethod.card.brand),
            expiryMonth: paymentMethod.card.exp_month,
            expiryYear: paymentMethod.card.exp_year,
          };
        } else {
          return {
            success: true,
            paymentMethodType: paymentMethod.type,
          };
        }
      } else {
        // Demo mode - simulate payment method details
        console.log(`
💰 DEMO MODE: Getting payment method details for: ${paymentMethodId}
        `);
        
        return {
          success: true,
          paymentMethodType: 'card',
          last4: '4242',
          cardBrand: 'Visa',
          expiryMonth: 12,
          expiryYear: new Date().getFullYear() + 2,
        };
      }
    } catch (error: any) {
      console.error('Error getting payment method details:', error);
      return {
        success: false,
        error: error.message || 'Error getting payment method details',
      };
    }
  }

  /**
   * Format payment method name for display
   */
  private formatPaymentMethodName(method: string): string {
    // Capitalize first letter
    return this.capitalizeFirstLetter(method);
  }

  /**
   * Create subscription for recurring payments
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<{
    success: boolean;
    subscriptionId?: string;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      if (stripeClient && customerId && priceId) {
        // Create subscription with Stripe
        const subscription = await stripeClient.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: metadata || {},
        });
        
        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
        
        return {
          success: true,
          subscriptionId: subscription.id,
          clientSecret: paymentIntent.client_secret,
        };
      } else {
        // Demo mode - simulate subscription creation
        console.log(`
💰 DEMO MODE: Creating subscription for customer: ${customerId}
Price ID: ${priceId}
Metadata: ${JSON.stringify(metadata || {})}
        `);
        
        // Generate fake Stripe-like IDs
        const fakeSubscriptionId = `sub_${Math.random().toString(36).substring(2, 15)}`;
        const fakePaymentIntentId = `pi_${Math.random().toString(36).substring(2, 15)}`;
        const fakeClientSecret = `${fakePaymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          success: true,
          subscriptionId: fakeSubscriptionId,
          clientSecret: fakeClientSecret,
        };
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.message || 'Error creating subscription',
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = false
  ): Promise<{
    success: boolean;
    cancelDate?: Date;
    error?: string;
  }> {
    try {
      const cancelDate = new Date();
      
      if (stripeClient && subscriptionId) {
        if (cancelAtPeriodEnd) {
          // Cancel at period end
          await stripeClient.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });
        } else {
          // Cancel immediately
          await stripeClient.subscriptions.cancel(subscriptionId);
        }
        
        return {
          success: true,
          cancelDate,
        };
      } else {
        // Demo mode - simulate subscription cancellation
        console.log(`
💰 DEMO MODE: Cancelling subscription: ${subscriptionId}
Cancel at period end: ${cancelAtPeriodEnd}
        `);
        
        return {
          success: true,
          cancelDate,
        };
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error.message || 'Error cancelling subscription',
      };
    }
  }

  /**
   * Utility to capitalize first letter
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const paymentService = new PaymentService();