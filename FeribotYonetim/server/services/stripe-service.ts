import Stripe from 'stripe';

// API anahtarı yalnızca ortam değişkeninden okunur; kaynak koda gömülmez.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY tanımlı değil - Stripe servisi devre dışı.');
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : (null as unknown as Stripe);

export class StripeService {
  /**
   * Creates a payment intent for a one-time payment
   * @param amount Amount in the smallest currency unit (e.g., cents for USD)
   * @param currency Currency code (e.g., 'usd', 'eur', 'try')
   * @param metadata Additional data to attach to the payment intent
   */
  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, any> = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata,
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error.message);
      throw new Error(`Payment service error: ${error.message}`);
    }
  }

  /**
   * Creates a subscription for recurring payments
   * @param customerId Stripe customer ID
   * @param priceId Stripe price ID
   * @param metadata Additional data to attach to the subscription
   */
  async createSubscription(customerId: string, priceId: string, metadata: Record<string, any> = {}) {
    try {
      // Create a subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata,
      });

      // @ts-ignore - Type issues with expanded fields
      const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

      return {
        subscriptionId: subscription.id,
        clientSecret,
      };
    } catch (error: any) {
      console.error('Error creating subscription:', error.message);
      throw new Error(`Subscription service error: ${error.message}`);
    }
  }

  /**
   * Creates or gets a Stripe customer
   * @param email Customer email
   * @param name Customer name
   * @param metadata Additional data to attach to the customer
   */
  async createOrGetCustomer(email: string, name: string, metadata: Record<string, any> = {}) {
    try {
      // Search for existing customer
      const customers = await stripe.customers.list({ email });
      
      if (customers.data.length > 0) {
        return customers.data[0];
      }

      // Create a new customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });

      return customer;
    } catch (error: any) {
      console.error('Error creating/getting customer:', error.message);
      throw new Error(`Customer service error: ${error.message}`);
    }
  }

  /**
   * Processes a webhook event from Stripe
   * @param body Raw request body
   * @param signature Stripe signature from the request header
   */
  async handleWebhookEvent(body: any, signature: string) {
    try {
      // In a real implementation, this would use a webhook secret
      // For demo purposes, we'll just parse the event without verifying
      const event = body;

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
          // Update booking status based on metadata
          if (paymentIntent.metadata.bookingId) {
            // In a real implementation, you would update the booking in the database
            console.log(`Update booking ${paymentIntent.metadata.bookingId} to paid status`);
          }
          break;
          
        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          console.log(`PaymentIntent ${failedPaymentIntent.id} failed`);
          break;
          
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          console.log(`Invoice ${invoice.id} payment succeeded`);
          break;
          
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          console.log(`Invoice ${failedInvoice.id} payment failed`);
          break;
          
        // Add more event types as needed
          
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      console.error('Error handling webhook:', error.message);
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  /**
   * Creates a refund for a payment
   * @param paymentIntentId Payment intent ID to refund
   * @param amount Amount to refund (if not provided, full amount is refunded)
   */
  async createRefund(paymentIntentId: string, amount?: number) {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await stripe.refunds.create(refundParams);
      return refund;
    } catch (error: any) {
      console.error('Error creating refund:', error.message);
      throw new Error(`Refund service error: ${error.message}`);
    }
  }

  // For testing, confirm this service is working
  async getTestMode() {
    return {
      testMode: true,
      demoKey: TEST_SECRET_KEY ? 'Using test key' : 'No key configured', 
      message: 'Stripe payment service is configured in test mode'
    };
  }
}

// Export a singleton instance
export const stripeService = new StripeService();