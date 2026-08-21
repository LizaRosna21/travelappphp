// Model definitions for database tables not defined in shared/schema.ts
import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// Payments tablosu tanımı
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull(),
  amount: text('amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionId: text('transaction_id'),
  paymentDate: timestamp('payment_date').notNull(),
  cardLast4: text('card_last4'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Vehicle tablosu tanımı
export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull(),
  vehicleTypeId: integer('vehicle_type_id').notNull(),
  licensePlate: text('license_plate'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// UserPreferences tablosu tanımı
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  language: text('language').default('tr'),
  currency: text('currency').default('TRY'),
  darkMode: boolean('dark_mode').default(false),
  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(true),
  pushNotifications: boolean('push_notifications').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Agencies tablosu tanımı
export const agencies = pgTable('agencies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  type: text('type').notNull(),
  userId: integer('user_id').notNull(),
  commissionRate: text('commission_rate').notNull(),
  isActive: boolean('is_active').default(true),
  address: text('address'),
  phoneNumber: text('phone_number'),
  email: text('email'),
  discountRate: text('discount_rate'),
  contactPerson: text('contact_person'),
  logoUrl: text('logo_url'),
  website: text('website'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});