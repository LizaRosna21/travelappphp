import { pgTable, text, serial, integer, boolean, date, time, timestamp, numeric, jsonb, primaryKey, point, uuid, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql, InferSelectModel, InferInsertModel } from "drizzle-orm";

// Revenue Management Tables
export const revenueDashboards = pgTable("revenue_dashboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  metrics: jsonb("metrics").default({}).notNull(),
  charts: jsonb("charts").default([]).notNull(),
  filters: jsonb("filters").default({}).notNull(),
  createdBy: integer("created_by").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  layoutConfig: jsonb("layout_config").default({}).notNull(),
});

export const insertRevenueDashboardSchema = createInsertSchema(revenueDashboards).pick({
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  metrics: true,
  charts: true,
  filters: true,
  createdBy: true,
  isDefault: true,
  isPublic: true,
  layoutConfig: true,
});

export const dynamicPricingRules = pgTable("dynamic_pricing_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  routeId: integer("route_id"),
  conditionType: text("condition_type").notNull(), // occupancy_based, time_based, demand_based, seasonal
  conditionValue: jsonb("condition_value").notNull(), // JSON configuration for condition
  priceAdjustmentType: text("price_adjustment_type").notNull(), // percentage, fixed_amount
  priceAdjustmentValue: numeric("price_adjustment_value").notNull(),
  priority: integer("priority").default(0).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  lastApplied: timestamp("last_applied"),
  applicationCount: integer("application_count").default(0).notNull(),
});

export const insertDynamicPricingRuleSchema = createInsertSchema(dynamicPricingRules).pick({
  name: true,
  description: true,
  routeId: true,
  conditionType: true,
  conditionValue: true,
  priceAdjustmentType: true,
  priceAdjustmentValue: true,
  priority: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdBy: true,
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  scheduleId: integer("schedule_id"),
  date: date("date").notNull(),
  originalPrice: numeric("original_price").notNull(),
  adjustedPrice: numeric("adjusted_price").notNull(),
  currency: text("currency").default("try").notNull(),
  adjustmentReason: jsonb("adjustment_reason").default({}).notNull(),
  ruleId: integer("rule_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  occupancyRate: numeric("occupancy_rate"),
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).pick({
  routeId: true,
  scheduleId: true,
  date: true,
  originalPrice: true,
  adjustedPrice: true,
  currency: true,
  adjustmentReason: true,
  ruleId: true,
  occupancyRate: true,
});

export const demandForecasts = pgTable("demand_forecasts", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  forecastDate: date("forecast_date").notNull(),
  forecastQuantity: integer("forecast_quantity").notNull(),
  forecastOccupancy: numeric("forecast_occupancy").notNull(),
  forecastRevenue: numeric("forecast_revenue").notNull(),
  confidence: numeric("confidence").default("0.8").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  actualDemand: integer("actual_demand"),
  forecastAccuracy: numeric("forecast_accuracy"),
  forecastModel: text("forecast_model").default("historical").notNull(),
  externalFactors: jsonb("external_factors").default({}).notNull(),
});

export const insertDemandForecastSchema = createInsertSchema(demandForecasts).pick({
  routeId: true,
  forecastDate: true,
  forecastQuantity: true,
  forecastOccupancy: true,
  forecastRevenue: true,
  confidence: true,
  actualDemand: true,
  forecastAccuracy: true,
  forecastModel: true,
  externalFactors: true,
});

export const revenueGoals = pgTable("revenue_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  routeId: integer("route_id"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetRevenue: numeric("target_revenue").notNull(),
  targetOccupancy: numeric("target_occupancy"),
  targetPassengers: integer("target_passengers"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").notNull(),
  notes: text("notes"),
  goalType: text("goal_type").default("revenue").notNull(), // revenue, occupancy, passenger_count
  actualRevenue: numeric("actual_revenue"),
  actualOccupancy: numeric("actual_occupancy"),
  actualPassengers: integer("actual_passengers"),
  status: text("status").default("in_progress").notNull(), // in_progress, achieved, missed
});

export const insertRevenueGoalSchema = createInsertSchema(revenueGoals).pick({
  name: true,
  routeId: true,
  startDate: true,
  endDate: true,
  targetRevenue: true,
  targetOccupancy: true,
  targetPassengers: true,
  isActive: true,
  createdBy: true,
  notes: true,
  goalType: true,
});

export const competitorPricing = pgTable("competitor_pricing", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  competitorName: text("competitor_name").notNull(),
  date: date("date").notNull(),
  price: numeric("price").notNull(),
  currency: text("currency").default("try").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  source: text("source"),
  scheduleDetails: jsonb("schedule_details").default({}).notNull(),
  priceType: text("price_type").default("standard").notNull(), // standard, economy, business, premium
  url: text("url"), // Source URL if available
});

export const insertCompetitorPricingSchema = createInsertSchema(competitorPricing).pick({
  routeId: true,
  competitorName: true,
  date: true,
  price: true,
  currency: true,
  notes: true,
  source: true,
  scheduleDetails: true,
  priceType: true,
  url: true,
});

export const seasonalPricingFactors = pgTable("seasonal_pricing_factors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  routeId: integer("route_id"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  factor: numeric("factor").notNull(), // Multiplier for price (1.2 = +20%, 0.8 = -20%)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  season: text("season").notNull(), // high_season, low_season, shoulder_season, holiday
  yearlyRecurrence: boolean("yearly_recurrence").default(false).notNull(), // Whether this should recur yearly
});

export const insertSeasonalPricingFactorSchema = createInsertSchema(seasonalPricingFactors).pick({
  name: true,
  description: true,
  routeId: true,
  startDate: true,
  endDate: true,
  factor: true,
  isActive: true,
  createdBy: true,
  season: true,
  yearlyRecurrence: true,
});

export const specialEvents = pgTable("special_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: text("location"),
  expectedImpact: text("expected_impact").default("high_demand").notNull(), // high_demand, low_demand, neutral
  pricingAdjustment: numeric("pricing_adjustment"), // Percentage adjustment for the event
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  eventType: text("event_type").default("festival").notNull(), // festival, holiday, conference, sports, weather, other
  yearlyRecurrence: boolean("yearly_recurrence").default(false).notNull(),
  affectedRoutes: jsonb("affected_routes").default([]).notNull(), // Array of route IDs
});

// B2B Module - Agency Management
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull().default("agency"), // agency, sub_agency
  parentAgencyId: integer("parent_agency_id"),
  commissionRate: numeric("commission_rate").notNull(),
  discountRate: numeric("discount_rate"),
  isActive: boolean("is_active").default(true).notNull(),
  currentBalance: numeric("current_balance").default("0").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  vatNumber: text("vat_number"),
  contactPerson: text("contact_person"),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").notNull(),
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
export const insertAgencySchema = createInsertSchema(agencies);

// B2B Module - Agency Commission Tier
export const agencyCommissionTiers = pgTable("agency_commission_tiers", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  commissionRate: numeric("commission_rate").notNull(),
  minSalesAmount: numeric("min_sales_amount").notNull(),
  maxSalesAmount: numeric("max_sales_amount"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AgencyCommissionTier = typeof agencyCommissionTiers.$inferSelect;
export type InsertAgencyCommissionTier = typeof agencyCommissionTiers.$inferInsert;
export const insertAgencyCommissionTierSchema = createInsertSchema(agencyCommissionTiers);

// B2B Module - Agency Booking
export const agencyBookings = pgTable("agency_bookings", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  bookingId: integer("booking_id").notNull(),
  commissionAmount: numeric("commission_amount").notNull(),
  commissionRate: numeric("commission_rate").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, paid
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AgencyBooking = typeof agencyBookings.$inferSelect;
export type InsertAgencyBooking = typeof agencyBookings.$inferInsert;
export const insertAgencyBookingSchema = createInsertSchema(agencyBookings);

// B2B Module - Agency Payment
export const agencyPayments = pgTable("agency_payments", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  amount: numeric("amount").notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  status: text("status").notNull().default("completed"), // pending, completed, failed, refunded
  description: text("description"),
  attachmentUrl: text("attachment_url"),
  createdBy: integer("created_by").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AgencyPayment = typeof agencyPayments.$inferSelect;
export type InsertAgencyPayment = typeof agencyPayments.$inferInsert;
export const insertAgencyPaymentSchema = createInsertSchema(agencyPayments);

export const insertSpecialEventSchema = createInsertSchema(specialEvents).pick({
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  location: true,
  expectedImpact: true,
  pricingAdjustment: true,
  isActive: true,
  createdBy: true,
  eventType: true,
  yearlyRecurrence: true,
  affectedRoutes: true,
});

export const revenueSnapshots = pgTable("revenue_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull(),
  routeId: integer("route_id"),
  snapshotType: text("snapshot_type").notNull(), // daily, weekly, monthly, quarterly, yearly
  totalRevenue: numeric("total_revenue").notNull(),
  totalBookings: integer("total_bookings").notNull(),
  averagePrice: numeric("average_price"),
  occupancyRate: numeric("occupancy_rate"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  currency: text("currency").default("try").notNull(),
  costOfOperation: numeric("cost_of_operation"),
  profitMargin: numeric("profit_margin"),
  revenuePerSeat: numeric("revenue_per_seat"),
});

export const insertRevenueSnapshotSchema = createInsertSchema(revenueSnapshots).pick({
  snapshotDate: true,
  routeId: true,
  snapshotType: true,
  totalRevenue: true,
  totalBookings: true,
  averagePrice: true,
  occupancyRate: true,
  metadata: true,
  currency: true,
  costOfOperation: true,
  profitMargin: true,
  revenuePerSeat: true,
});

export const yieldManagementSettings = pgTable("yield_management_settings", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id"),
  name: text("name").notNull(),
  description: text("description"),
  minPriceThreshold: numeric("min_price_threshold").notNull(), // Minimum price as percentage of base price (e.g., 0.8 = 80%)
  maxPriceThreshold: numeric("max_price_threshold").notNull(), // Maximum price as percentage of base price (e.g., 1.5 = 150%)
  timeBasedFactors: jsonb("time_based_factors").default({}).notNull(), // JSON config for time-based adjustments
  occupancyThresholds: jsonb("occupancy_thresholds").default({}).notNull(), // JSON config for occupancy thresholds
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  optimizationGoal: text("optimization_goal").default("maximize_revenue").notNull(), // maximize_revenue, maximize_occupancy, balance
  reviewPeriod: integer("review_period").default(7).notNull(), // Days between reviews
  lastReviewDate: date("last_review_date"),
});

export const insertYieldManagementSettingSchema = createInsertSchema(yieldManagementSettings).pick({
  routeId: true,
  name: true,
  description: true,
  minPriceThreshold: true,
  maxPriceThreshold: true,
  timeBasedFactors: true,
  occupancyThresholds: true,
  isActive: true,
  createdBy: true,
  optimizationGoal: true,
  reviewPeriod: true,
  lastReviewDate: true,
});

// Define relations
export const revenueDashboardsRelations = relations(revenueDashboards, ({ one }) => ({
  createdByUser: one(users, {
    fields: [revenueDashboards.createdBy],
    references: [users.id],
  }),
}));

export const dynamicPricingRulesRelations = relations(dynamicPricingRules, ({ one }) => ({
  route: one(routes, {
    fields: [dynamicPricingRules.routeId],
    references: [routes.id],
  }),
  createdByUser: one(users, {
    fields: [dynamicPricingRules.createdBy],
    references: [users.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  route: one(routes, {
    fields: [priceHistory.routeId],
    references: [routes.id],
  }),
  schedule: one(schedules, {
    fields: [priceHistory.scheduleId],
    references: [schedules.id],
  }),
  rule: one(dynamicPricingRules, {
    fields: [priceHistory.ruleId],
    references: [dynamicPricingRules.id],
  }),
}));

export const demandForecastsRelations = relations(demandForecasts, ({ one }) => ({
  route: one(routes, {
    fields: [demandForecasts.routeId],
    references: [routes.id],
  }),
}));

// B2B Module Relations
export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  parentAgency: one(agencies, {
    fields: [agencies.parentAgencyId],
    references: [agencies.id],
  }),
  user: one(users, {
    fields: [agencies.userId],
    references: [users.id],
  }),
  subAgencies: many(agencies),
  commissionTiers: many(agencyCommissionTiers),
  bookings: many(agencyBookings),
  payments: many(agencyPayments),
}));

export const agencyCommissionTiersRelations = relations(agencyCommissionTiers, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyCommissionTiers.agencyId],
    references: [agencies.id],
  }),
}));

export const agencyBookingsRelations = relations(agencyBookings, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyBookings.agencyId],
    references: [agencies.id],
  }),
  booking: one(bookings, {
    fields: [agencyBookings.bookingId],
    references: [bookings.id],
  }),
}));

export const agencyPaymentsRelations = relations(agencyPayments, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyPayments.agencyId],
    references: [agencies.id],
  }),
  createdByUser: one(users, {
    fields: [agencyPayments.createdBy],
    references: [users.id],
  }),
}));

export const revenueGoalsRelations = relations(revenueGoals, ({ one }) => ({
  route: one(routes, {
    fields: [revenueGoals.routeId],
    references: [routes.id],
  }),
  createdByUser: one(users, {
    fields: [revenueGoals.createdBy],
    references: [users.id],
  }),
}));

export const competitorPricingRelations = relations(competitorPricing, ({ one }) => ({
  route: one(routes, {
    fields: [competitorPricing.routeId],
    references: [routes.id],
  }),
}));

export const seasonalPricingFactorsRelations = relations(seasonalPricingFactors, ({ one }) => ({
  route: one(routes, {
    fields: [seasonalPricingFactors.routeId],
    references: [routes.id],
  }),
  createdByUser: one(users, {
    fields: [seasonalPricingFactors.createdBy],
    references: [users.id],
  }),
}));

export const specialEventsRelations = relations(specialEvents, ({ one }) => ({
  createdByUser: one(users, {
    fields: [specialEvents.createdBy],
    references: [users.id],
  }),
}));

export const revenueSnapshotsRelations = relations(revenueSnapshots, ({ one }) => ({
  route: one(routes, {
    fields: [revenueSnapshots.routeId],
    references: [routes.id],
  }),
}));

export const yieldManagementSettingsRelations = relations(yieldManagementSettings, ({ one }) => ({
  route: one(routes, {
    fields: [yieldManagementSettings.routeId],
    references: [routes.id],
  }),
  createdByUser: one(users, {
    fields: [yieldManagementSettings.createdBy],
    references: [users.id],
  }),
}));

// API configurations table
export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  apiKey: text("api_key").notNull(),
  secretKey: text("secret_key"),
  baseUrl: text("base_url"),
  category: text("category").notNull(), // payment, notification, integration, analytics, supplier
  mode: text("mode").default("test").notNull(), // test, live, demo
  isActive: boolean("is_active").default(true).notNull(),
  status: text("status"), // active, error, pending
  lastChecked: timestamp("last_checked"),
});

export const insertApiConfigSchema = createInsertSchema(apiConfigurations).pick({
  name: true,
  provider: true,
  apiKey: true,
  secretKey: true,
  baseUrl: true,
  category: true,
  mode: true,
  isActive: true,
  status: true,
});

export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = z.infer<typeof insertApiConfigSchema>;

// Countries table
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // ISO iki harfli ülke kodu (TR, FR, US gibi)
  name: text("name").notNull(),
  flag: text("flag").notNull(), // Emoji bayrak
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertCountrySchema = createInsertSchema(countries).pick({
  code: true,
  name: true, 
  flag: true,
  isActive: true,
});

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: text("role").default("user").notNull(), // user, admin, superadmin, agency, agency_staff
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  phoneNumber: text("phone_number"),
  lastLoginAt: timestamp("last_login_at"),
  profileImage: text("profile_image"),
  preferences: jsonb("preferences").default({}).notNull(), // User preferences like language, notifications settings etc.
  parentAgencyId: integer("parent_agency_id"), // Reference to parent agency for sub-agency staff
  // membershipTierId: integer("membership_tier_id"), // User's loyalty tier level - Commented out to match database schema
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  phoneNumber: true,
  profileImage: true,
  preferences: true,
  parentAgencyId: true,
  // membershipTierId: true, // Commented out to match database schema
});

// Routes model
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  departurePort: text("departure_port").notNull(),
  arrivalPort: text("arrival_port").notNull(),
  distance: integer("distance"),
  duration: integer("duration").notNull(), // in minutes
  basePrice: numeric("base_price").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  checkInStartTime: integer("check_in_start_time"), // minutes before departure
  checkInEndTime: integer("check_in_end_time"), // minutes before departure
  boardingStartTime: integer("boarding_start_time"), // minutes before departure
  boardingEndTime: integer("boarding_end_time"), // minutes before departure
  specialInstructions: text("special_instructions"), // Special instructions for this route
  // Coğrafi konum bilgileri
  latitudeDeparture: text("latitude_departure"), // Kalkış limanının enlem bilgisi
  longitudeDeparture: text("longitude_departure"), // Kalkış limanının boylam bilgisi
  latitudeArrival: text("latitude_arrival"), // Varış limanının enlem bilgisi
  longitudeArrival: text("longitude_arrival"), // Varış limanının boylam bilgisi
  isFeatured: boolean("is_featured").default(false), // Featured routes on homepage
  isPopular: boolean("is_popular").default(false), // Popular routes 
  travelTime: text("travel_time"), // Human-readable travel time (e.g., "3 hours 30 minutes")
  routeCode: text("route_code"), // Unique code for this route
  routeType: text("route_type").default("regular"), // regular, seasonal, special, etc.
  isInternational: boolean("is_international").default(false), // Is this an international route?
  countryDeparture: text("country_departure"), // Departure country
  countryArrival: text("country_arrival"), // Arrival country
  // Virtual fields for compatibility
});

export const insertRouteSchema = createInsertSchema(routes).pick({
  departurePort: true,
  arrivalPort: true,
  distance: true,
  duration: true,
  basePrice: true,
  description: true,
  isActive: true,
  checkInStartTime: true,
  checkInEndTime: true,
  boardingStartTime: true,
  boardingEndTime: true,
  specialInstructions: true,
  latitudeDeparture: true,
  longitudeDeparture: true,
  latitudeArrival: true,
  longitudeArrival: true,
  isFeatured: true,
  isPopular: true,
  travelTime: true,
  routeCode: true,
  routeType: true,
  isInternational: true,
  countryDeparture: true,
  countryArrival: true,
});

// Schedules model
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  departureTime: time("departure_time").notNull(),
  arrivalTime: time("arrival_time").notNull(),
  daysOfWeek: text("days_of_week").notNull(), // "0,1,2,3,4,5,6" - Sunday to Saturday
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  capacity: integer("capacity").notNull(),
  passengerCapacity: integer("passenger_capacity").default(0).notNull(),
  vehicleCapacity: integer("vehicle_capacity").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isSpecialSchedule: boolean("is_special_schedule").default(false), // Special one-time schedule
  specialDates: jsonb("special_dates"), // JSON array of special dates for one-time schedules
  specialInstructions: text("special_instructions"), // Special instructions for this schedule
  isFull: boolean("is_full").default(false), // Is this schedule fully booked
  isPopular: boolean("is_popular").default(false), // Popular schedules
  fareType: text("fare_type").default("standard"), // standard, economy, business, premium
  discountedPrice: numeric("discounted_price"), // Discounted price if applicable
  hasPromotion: boolean("has_promotion").default(false), // Has promotion
  promotionDescription: text("promotion_description"), // Promotion description
  isCancelled: boolean("is_cancelled").default(false), // Is this schedule cancelled
  cancellationReason: text("cancellation_reason"), // Reason for cancellation
  ferryId: integer("ferry_id"), // Reference to the specific ferry vessel
  crewDetails: jsonb("crew_details"), // Crew details for this schedule
  weatherCondition: text("weather_condition"), // Expected weather condition
  checkinLocation: text("checkin_location"), // Where to check in
  boardingLocation: text("boarding_location"), // Where to board
  bagAllowance: jsonb("bag_allowance"), // Baggage allowance details
  amenities: jsonb("amenities"), // Available amenities on this ferry
});

export const insertScheduleSchema = createInsertSchema(schedules).pick({
  routeId: true,
  departureTime: true,
  arrivalTime: true,
  daysOfWeek: true,
  startDate: true,
  endDate: true,
  capacity: true,
  passengerCapacity: true,
  vehicleCapacity: true,
  isActive: true,
  isSpecialSchedule: true,
  specialDates: true,
  specialInstructions: true,
  isFull: true,
  isPopular: true,
  fareType: true,
  discountedPrice: true,
  hasPromotion: true,
  promotionDescription: true,
  isCancelled: true,
  cancellationReason: true,
  ferryId: true,
  crewDetails: true,
  weatherCondition: true,
  checkinLocation: true,
  boardingLocation: true,
  bagAllowance: true,
  amenities: true,
});

// FerryCompanies model
export const ferryCompanies = pgTable("ferry_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertFerryCompanySchema = createInsertSchema(ferryCompanies).pick({
  name: true,
  logo: true,
  description: true,
  isActive: true,
});

// VehicleTypes model
export const vehicleTypes = pgTable("vehicle_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  additionalPrice: numeric("additional_price").notNull(),
});

export const insertVehicleTypeSchema = createInsertSchema(vehicleTypes).pick({
  name: true,
  additionalPrice: true,
});

// PassengerTypes model
export const passengerTypes = pgTable("passenger_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  priceMultiplier: numeric("price_multiplier").notNull(),
  description: text("description"),
});

export const insertPassengerTypeSchema = createInsertSchema(passengerTypes).pick({
  name: true,
  priceMultiplier: true,
  description: true,
});

// Bookings model
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  routeId: integer("route_id").notNull(),
  scheduleId: integer("schedule_id").notNull(),
  departureDate: date("departure_date").notNull(),
  returnDate: date("return_date"), // Null for one-way
  totalPrice: numeric("total_price").notNull(),
  currency: text("currency").default("try").notNull(), // TRY, USD, EUR
  status: text("status").default("pending").notNull(), // pending, confirmed, cancelled
  isPaid: boolean("is_paid").default(false).notNull(),
  bookingReference: text("booking_reference").notNull(),
  pnrNumber: text("pnr_number").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paymentIntentId: text("payment_intent_id"),
  paymentMethod: text("payment_method"),
  refundReason: text("refund_reason"),
  refundAmount: numeric("refund_amount"),
  refundDate: timestamp("refund_date"),
  ticketNumber: text("ticket_number"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  guestEmail: text("guest_email"), // For guest bookings without user account
  guestName: text("guest_name"), // For guest bookings
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  userId: true,
  routeId: true,
  scheduleId: true,
  departureDate: true,
  returnDate: true,
  totalPrice: true,
  currency: true,
  status: true,
  isPaid: true,
  bookingReference: true,
  pnrNumber: true,
  paymentIntentId: true,
  paymentMethod: true,
  refundReason: true,
  refundAmount: true,
  refundDate: true,
  ticketNumber: true,
  notes: true,
  guestEmail: true,
  guestName: true,
});

// BookingPassengers model
export const bookingPassengers = pgTable("booking_passengers", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  passengerTypeId: integer("passenger_type_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  documentNumber: text("document_number"),
  birthDate: date("birth_date"),
  contact: text("contact"),
});

export const insertBookingPassengerSchema = createInsertSchema(bookingPassengers).pick({
  bookingId: true,
  passengerTypeId: true,
  firstName: true,
  lastName: true,
  documentNumber: true,
  birthDate: true,
  contact: true,
});

// BookingVehicles model
export const bookingVehicles = pgTable("booking_vehicles", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  vehicleTypeId: integer("vehicle_type_id").notNull(),
  licensePlate: text("license_plate"),
});

export const insertBookingVehicleSchema = createInsertSchema(bookingVehicles).pick({
  bookingId: true,
  vehicleTypeId: true,
  licensePlate: true,
});

// SiteSettings model
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").default("FerryBooking").notNull(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").default("#0C4B7D").notNull(),
  secondaryColor: text("secondary_color").default("#1A94FF").notNull(),
  accentColor: text("accent_color").default("#FF7D00").notNull(),
  buttonPrimaryColor: text("button_primary_color").default("#0C4B7D").notNull(),
  buttonSecondaryColor: text("button_secondary_color").default("#1A94FF").notNull(),
  buttonAccentColor: text("button_accent_color").default("#FF7D00").notNull(),
  cardTagPopularColor: text("card_tag_popular_color").default("#2563EB").notNull(),
  cardTagFastestColor: text("card_tag_fastest_color").default("#059669").notNull(),
  cardTagScenicColor: text("card_tag_scenic_color").default("#D97706").notNull(),
  homeBackgroundImage: text("home_background_image").default("/backgrounds/default-ferry-bg.jpg"),
  homeBackgroundOverlayOpacity: text("home_background_overlay_opacity").default("0.6").notNull(),
  homeBackgroundOverlayColor: text("home_background_overlay_color").default("#0C4B7D").notNull(),
  googleAnalyticsId: text("google_analytics_id"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  seo: jsonb("seo").default({}).notNull(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).pick({
  siteName: true,
  logoUrl: true,
  faviconUrl: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  buttonPrimaryColor: true,
  buttonSecondaryColor: true,
  buttonAccentColor: true,
  cardTagPopularColor: true,
  cardTagFastestColor: true,
  cardTagScenicColor: true,
  homeBackgroundImage: true,
  homeBackgroundOverlayOpacity: true,
  homeBackgroundOverlayColor: true,
  googleAnalyticsId: true,
  contactEmail: true,
  contactPhone: true,
  seo: true,
});

// Ports model
export const ports = pgTable("ports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertPortSchema = createInsertSchema(ports).pick({
  name: true,
  country: true,
  city: true,
  description: true,
  isActive: true,
});

// Languages model
export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // tr, en, fr
  name: text("name").notNull(),
  localName: text("local_name"), // Türkçe, English, Français
  flagEmoji: text("flag_emoji"), // 🇹🇷, 🇬🇧, 🇫🇷
  rtl: boolean("rtl").default(false).notNull(), // Sağdan sola yazım dillerini destekler
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const insertLanguageSchema = createInsertSchema(languages).pick({
  code: true,
  name: true,
  localName: true,
  flagEmoji: true,
  rtl: true,
  isActive: true,
  isDefault: true,
});

// Currencies model
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // TRY, USD, EUR
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  exchangeRate: numeric("exchange_rate").notNull().default("1"),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const insertCurrencySchema = createInsertSchema(currencies).pick({
  code: true,
  name: true,
  symbol: true,
  exchangeRate: true, 
  isActive: true,
  isDefault: true,
});

// Translations model
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  context: text("context").default("general").notNull(), // general, route, ferry, etc.
});

export const insertTranslationSchema = createInsertSchema(translations).pick({
  languageId: true,
  key: true,
  value: true,
  context: true,
});

// Translation Functions - Sistem içindeki fonksiyonların çeviri tanımlamaları
export const translationFunctions = pgTable("translation_functions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),  // Benzersiz function adı
  description: text("description"),       // Fonksiyon açıklaması
  category: text("category").notNull(),   // Kategori: booking, payment, user, etc.
  parameters: jsonb("parameters").default([]).notNull(), // Fonksiyon parametreleri
  isCore: boolean("is_core").default(false).notNull(), // Temel sistem fonksiyonu mu?
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTranslationFunctionSchema = createInsertSchema(translationFunctions).pick({
  name: true,
  description: true,
  category: true,
  parameters: true,
  isCore: true,
});

// Translation Items - Her fonksiyon için dil bazlı çeviri öğeleri
export const translationItems = pgTable("translation_items", {
  id: serial("id").primaryKey(),
  functionId: integer("function_id").notNull(),
  languageId: integer("language_id").notNull(),
  itemKey: text("item_key").notNull(),  // Success, error, confirmation, etc.
  itemValue: text("item_value").notNull(),  // Çevrilmiş metin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTranslationItemSchema = createInsertSchema(translationItems).pick({
  functionId: true,
  languageId: true,
  itemKey: true,
  itemValue: true,
});

// Seat mapping model
export const seatMaps = pgTable("seat_maps", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  mapData: jsonb("map_data").notNull(), // JSON structure for seat layout
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertSeatMapSchema = createInsertSchema(seatMaps).pick({
  routeId: true,
  mapData: true,
  isActive: true,
});

// Seat reservations model
export const seatReservations = pgTable("seat_reservations", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  seatMapId: integer("seat_map_id").notNull(),
  seatNumber: text("seat_number").notNull(),
  passengerName: text("passenger_name").notNull(),
  status: text("status").default("reserved").notNull(), // reserved, confirmed, cancelled
});

export const insertSeatReservationSchema = createInsertSchema(seatReservations).pick({
  bookingId: true,
  seatMapId: true,
  seatNumber: true,
  passengerName: true,
  status: true,
});

// Not: B2B modülü veri modelleri zaten bu dosyanın başında (238. satır civarında) tanımlanmış durumda.
// Çift tanımlamayı önlemek için buradaki ek tanımlamalar kaldırıldı.
// İlişkisel tanımlamalar da başka yerde eklenmiştir.

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [bookings.routeId],
    references: [routes.id],
  }),
  schedule: one(schedules, {
    fields: [bookings.scheduleId],
    references: [schedules.id],
  }),
  passengers: many(bookingPassengers),
  vehicles: many(bookingVehicles),
  seatReservations: many(seatReservations),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  schedules: many(schedules),
  seatMaps: many(seatMaps),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  route: one(routes, {
    fields: [schedules.routeId],
    references: [routes.id],
  }),
  bookings: many(bookings),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type FerryCompany = typeof ferryCompanies.$inferSelect;
export type InsertFerryCompany = z.infer<typeof insertFerryCompanySchema>;

export type VehicleType = typeof vehicleTypes.$inferSelect;
export type InsertVehicleType = z.infer<typeof insertVehicleTypeSchema>;

export type PassengerType = typeof passengerTypes.$inferSelect;
export type InsertPassengerType = z.infer<typeof insertPassengerTypeSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type BookingPassenger = typeof bookingPassengers.$inferSelect;
export type InsertBookingPassenger = z.infer<typeof insertBookingPassengerSchema>;

export type BookingVehicle = typeof bookingVehicles.$inferSelect;
export type InsertBookingVehicle = z.infer<typeof insertBookingVehicleSchema>;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingsSchema>;

export type Port = typeof ports.$inferSelect;
export type InsertPort = z.infer<typeof insertPortSchema>;

export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

export type TranslationFunction = typeof translationFunctions.$inferSelect;
export type InsertTranslationFunction = z.infer<typeof insertTranslationFunctionSchema>;

export type TranslationItem = typeof translationItems.$inferSelect;
export type InsertTranslationItem = z.infer<typeof insertTranslationItemSchema>;

export type SeatMap = typeof seatMaps.$inferSelect;
export type InsertSeatMap = z.infer<typeof insertSeatMapSchema>;

export type SeatReservation = typeof seatReservations.$inferSelect;
export type InsertSeatReservation = z.infer<typeof insertSeatReservationSchema>;

// B2B module types already defined at lines ~268-327

// Marketing Campaign related models
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull(), // percentage, fixed_amount, free_item, etc.
  discountAmount: text("discount_amount").notNull(), // Can be percentage or fixed amount
  startDate: text("start_date").notNull(), // Using text format for dates in this model
  endDate: text("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  targetSegmentId: integer("target_segment_id"),
  minimumPurchaseAmount: text("minimum_purchase_amount").default("0"),
  maximumDiscountAmount: text("maximum_discount_amount"),
  usageLimitPerCustomer: integer("usage_limit_per_customer"),
  totalUsageLimit: integer("total_usage_limit"),
  currentUsage: integer("current_usage").default(0),
  appliesTo: text("applies_to").default("all_routes"), // all_routes, select_routes
  applicableRouteIds: text("applicable_route_ids"), // Comma-separated route IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  code: true,
  description: true,
  discountType: true,
  discountAmount: true,
  startDate: true,
  endDate: true,
  isActive: true,
  targetSegmentId: true,
  minimumPurchaseAmount: true,
  maximumDiscountAmount: true,
  usageLimitPerCustomer: true,
  totalUsageLimit: true,
  appliesTo: true,
  applicableRouteIds: true,
});

// Customer segments for targeting campaigns 
export const customerSegments = pgTable("customer_segments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").default([]).notNull(), // Array of segment conditions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  estimatedSize: integer("estimated_size").default(0).notNull(),
  lastCalculated: timestamp("last_calculated"),
});

export const insertCustomerSegmentSchema = createInsertSchema(customerSegments).pick({
  name: true,
  description: true,
  criteria: true,
  createdBy: true,
  isActive: true,
});

// Track campaign performance and analytics
export const campaignPerformance = pgTable("campaign_performance", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  date: date("date").notNull(),
  views: integer("views").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  revenue: numeric("revenue").default("0").notNull(),
  cost: numeric("cost").default("0").notNull(),
  bookingCount: integer("booking_count").default(0).notNull(),
  customerCount: integer("customer_count").default(0).notNull(),
  avgTicketValue: numeric("avg_ticket_value").default("0").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
});

export const insertCampaignPerformanceSchema = createInsertSchema(campaignPerformance).pick({
  campaignId: true,
  date: true,
  views: true,
  clicks: true,
  conversions: true,
  revenue: true,
  cost: true,
  bookingCount: true,
  customerCount: true,
  avgTicketValue: true,
  metadata: true,
});

// Track coupon codes and their usage
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // percentage, fixed_amount, free_item
  discountValue: numeric("discount_value").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  minimumPurchaseAmount: numeric("minimum_purchase_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
});

export const insertCouponSchema = createInsertSchema(coupons).pick({
  campaignId: true,
  code: true,
  discountType: true,
  discountValue: true,
  startDate: true,
  endDate: true,
  usageLimit: true,
  isActive: true,
  minimumPurchaseAmount: true,
  metadata: true,
});

// Track email campaigns and messages
export const marketingEmails = pgTable("marketing_emails", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  subject: text("subject").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  status: text("status").default("draft").notNull(), // draft, queued, sent, failed
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0).notNull(),
  openCount: integer("open_count").default(0).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  bounceCount: integer("bounce_count").default(0).notNull(),
  unsubscribeCount: integer("unsubscribe_count").default(0).notNull(),
  templateId: text("template_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
});

export const insertMarketingEmailSchema = createInsertSchema(marketingEmails).pick({
  campaignId: true,
  subject: true,
  fromName: true,
  fromEmail: true,
  htmlContent: true,
  textContent: true,
  status: true,
  scheduledAt: true,
  templateId: true,
  metadata: true,
});

// Track email sends and recipient performance
export const emailSends = pgTable("email_sends", {
  id: serial("id").primaryKey(),
  marketingEmailId: integer("marketing_email_id").notNull(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull(), // sent, delivered, opened, clicked, bounced, unsubscribed
  sentAt: timestamp("sent_at").notNull(),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").default({}).notNull(),
});

export const insertEmailSendSchema = createInsertSchema(emailSends).pick({
  marketingEmailId: true,
  userId: true,
  email: true,
  status: true,
  sentAt: true,
  openedAt: true,
  clickedAt: true,
  bouncedAt: true,
  unsubscribedAt: true,
  ipAddress: true,
  userAgent: true,
  metadata: true,
});

// Track coupon redemptions
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull(),
  bookingId: integer("booking_id").notNull(),
  userId: integer("user_id").notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
  discountAmount: numeric("discount_amount").notNull(),
  originalAmount: numeric("original_amount").notNull(),
  finalAmount: numeric("final_amount").notNull(),
  currency: text("currency").default("TRY").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
});

export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptions).pick({
  couponId: true,
  bookingId: true,
  userId: true,
  discountAmount: true,
  originalAmount: true,
  finalAmount: true,
  currency: true,
  metadata: true,
});

// Pages model for CMS
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  isActive: boolean("is_active").default(true).notNull(),
  isHomepage: boolean("is_homepage").default(false).notNull(),
  layout: text("layout").default("default").notNull(), // default, wide, boxed, etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  authorId: integer("author_id").notNull(),
  featuredImage: text("featured_image"),
  languageCode: text("language_code").default("tr").notNull(),
  order: integer("order").default(0).notNull(),
  hasSearchModule: boolean("has_search_module").default(false).notNull()
});

export const insertPageSchema = createInsertSchema(pages).pick({
  slug: true,
  title: true,
  content: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  isActive: true,
  isHomepage: true,
  layout: true,
  authorId: true,
  featuredImage: true,
  languageCode: true,
  order: true,
  hasSearchModule: true
});

// Destinations model
export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  content: text("content"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  featuredImage: text("featured_image"),
  gallery: jsonb("gallery").default([]).notNull(),
  country: text("country").notNull(),
  region: text("region"),
  city: text("city"),
  isPopular: boolean("is_popular").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  languageCode: text("language_code").default("tr").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDestinationSchema = createInsertSchema(destinations).pick({
  name: true,
  slug: true,
  description: true,
  content: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  featuredImage: true,
  gallery: true,
  country: true,
  region: true,
  city: true,
  isPopular: true,
  isActive: true,
  order: true,
  languageCode: true,
});

// Routes to Destinations mapping
export const routeDestinations = pgTable("route_destinations", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  destinationId: integer("destination_id").notNull(),
  type: text("type").default("departure").notNull(), // departure, arrival, connection
});

export const insertRouteDestinationSchema = createInsertSchema(routeDestinations).pick({
  routeId: true,
  destinationId: true,
  type: true,
});

// Tours model
export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  content: text("content"),
  duration: text("duration").notNull(), // e.g., "3 days", "1 week"
  basePrice: numeric("base_price").notNull(),
  discountedPrice: numeric("discounted_price"),
  featuredImage: text("featured_image"),
  gallery: jsonb("gallery").default([]).notNull(),
  itinerary: jsonb("itinerary").default([]).notNull(), // Day by day itinerary
  includedServices: jsonb("included_services").default([]).notNull(),
  excludedServices: jsonb("excluded_services").default([]).notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  startDates: jsonb("start_dates").default([]).notNull(), // Array of available departure dates
  isPopular: boolean("is_popular").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  languageCode: text("language_code").default("tr").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  maxGroupSize: integer("max_group_size"),
  difficultyLevel: text("difficulty_level").default("regular").notNull(), // easy, regular, challenging
  minAge: integer("min_age"),
  tourType: text("tour_type").default("group").notNull(), // group, private, self-guided
});

export const insertTourSchema = createInsertSchema(tours).pick({
  name: true,
  slug: true,
  description: true,
  content: true,
  duration: true,
  basePrice: true,
  discountedPrice: true,
  featuredImage: true,
  gallery: true,
  itinerary: true,
  includedServices: true,
  excludedServices: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  startDates: true,
  isPopular: true,
  isActive: true,
  languageCode: true,
  maxGroupSize: true,
  difficultyLevel: true,
  minAge: true,
  tourType: true,
});

// Tour to Destinations mapping
export const tourDestinations = pgTable("tour_destinations", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").notNull(),
  destinationId: integer("destination_id").notNull(),
  order: integer("order").default(0).notNull(),
});

export const insertTourDestinationSchema = createInsertSchema(tourDestinations).pick({
  tourId: true,
  destinationId: true,
  order: true,
});

// Packages model (Bundle products)
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  content: text("content"),
  basePrice: numeric("base_price").notNull(),
  discountedPrice: numeric("discounted_price"),
  discountPercentage: integer("discount_percentage"),
  featuredImage: text("featured_image"),
  gallery: jsonb("gallery").default([]).notNull(),
  validFromDate: date("valid_from_date"),
  validToDate: date("valid_to_date"),
  packageItems: jsonb("package_items").default([]).notNull(), // Array of included items (tours, ferries, etc)
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  isPopular: boolean("is_popular").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  languageCode: text("language_code").default("tr").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  maximumTravelers: integer("maximum_travelers"),
  minimumDuration: integer("minimum_duration"), // In days
  packageType: text("package_type").default("standard").notNull(), // standard, premium, luxury
});

export const insertPackageSchema = createInsertSchema(packages).pick({
  name: true,
  slug: true,
  description: true,
  content: true,
  basePrice: true,
  discountedPrice: true,
  discountPercentage: true,
  featuredImage: true,
  gallery: true,
  validFromDate: true,
  validToDate: true,
  packageItems: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  isPopular: true,
  isActive: true,
  languageCode: true,
  maximumTravelers: true,
  minimumDuration: true,
  packageType: true,
});

// Menus for navigation
export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  location: text("location").notNull(), // header, footer, sidebar
  items: jsonb("items").default([]).notNull(), // Menu items with nested structure
  languageCode: text("language_code").default("tr").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
});

export const insertMenuSchema = createInsertSchema(menus).pick({
  name: true,
  description: true,
  location: true,
  items: true,
  languageCode: true,
  isActive: true,
  order: true,
});

// MenuItem model for tracking page assignments to menus
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  menuId: integer("menu_id").notNull(),
  pageId: integer("page_id").notNull(),
  parentId: integer("parent_id"), // For nested menus, null if top level
  title: text("title").notNull(), // Custom title, can be different from page title
  url: text("url"), // Optional custom URL, if null use page slug
  order: integer("order").default(0).notNull(),
  isExternal: boolean("is_external").default(false).notNull(), // If true, url is external link
  icon: text("icon"), // Optional icon name
  cssClass: text("css_class"), // Optional CSS class
  openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  menuId: true,
  pageId: true,
  parentId: true,
  title: true,
  url: true,
  order: true,
  isExternal: true,
  icon: true,
  cssClass: true,
  openInNewTab: true,
  isActive: true,
});

// Define additional relations
export const pagesRelations = relations(pages, ({ one, many }) => ({
  author: one(users, {
    fields: [pages.authorId],
    references: [users.id],
  }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  menu: one(menus, {
    fields: [menuItems.menuId],
    references: [menus.id],
  }),
  page: one(pages, {
    fields: [menuItems.pageId],
    references: [pages.id],
  }),
  parent: one(menuItems, {
    fields: [menuItems.parentId],
    references: [menuItems.id],
  }),
  children: many(menuItems, { relationName: "parent" }),
}));

export const menusRelations = relations(menus, ({ many }) => ({
  items: many(menuItems),
}));

export const destinationsRelations = relations(destinations, ({ many }) => ({
  routeDestinations: many(routeDestinations),
  tourDestinations: many(tourDestinations),
}));

export const routesRelations2 = relations(routes, ({ many }) => ({
  routeDestinations: many(routeDestinations),
}));

export const toursRelations = relations(tours, ({ many }) => ({
  tourDestinations: many(tourDestinations),
}));

// Define marketing campaign relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  segment: one(customerSegments, {
    fields: [campaigns.targetSegmentId],
    references: [customerSegments.id],
  }),
  coupons: many(coupons),
  performance: many(campaignPerformance),
  marketingEmails: many(marketingEmails),
}));

export const customerSegmentsRelations = relations(customerSegments, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [customerSegments.createdBy],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignPerformanceRelations = relations(campaignPerformance, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignPerformance.campaignId],
    references: [campaigns.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [coupons.campaignId],
    references: [campaigns.id],
  }),
  redemptions: many(couponRedemptions),
}));

export const marketingEmailsRelations = relations(marketingEmails, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [marketingEmails.campaignId],
    references: [campaigns.id],
  }),
  sends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({ one }) => ({
  marketingEmail: one(marketingEmails, {
    fields: [emailSends.marketingEmailId],
    references: [marketingEmails.id],
  }),
  user: one(users, {
    fields: [emailSends.userId],
    references: [users.id],
  }),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  booking: one(bookings, {
    fields: [couponRedemptions.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [couponRedemptions.userId],
    references: [users.id],
  }),
}));

// Type exports for new models
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

export type RouteDestination = typeof routeDestinations.$inferSelect;
export type InsertRouteDestination = z.infer<typeof insertRouteDestinationSchema>;

export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;

export type TourDestination = typeof tourDestinations.$inferSelect;
export type InsertTourDestination = z.infer<typeof insertTourDestinationSchema>;

export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

export type Menu = typeof menus.$inferSelect;
export type InsertMenu = z.infer<typeof insertMenuSchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

// Marketing related type exports
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CustomerSegment = typeof customerSegments.$inferSelect;
export type InsertCustomerSegment = z.infer<typeof insertCustomerSegmentSchema>;

export type CampaignPerformance = typeof campaignPerformance.$inferSelect;
export type InsertCampaignPerformance = z.infer<typeof insertCampaignPerformanceSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type MarketingEmail = typeof marketingEmails.$inferSelect;
export type InsertMarketingEmail = z.infer<typeof insertMarketingEmailSchema>;

export type EmailSend = typeof emailSends.$inferSelect;
export type InsertEmailSend = z.infer<typeof insertEmailSendSchema>;

export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;

// Gelir Yönetimi tip tanımlamaları
export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;

export type SpecialEvent = typeof specialEvents.$inferSelect;
export type InsertSpecialEvent = z.infer<typeof insertSpecialEventSchema>;

export type DemandForecast = typeof demandForecasts.$inferSelect;
export type InsertDemandForecast = z.infer<typeof insertDemandForecastSchema>;

export type PriceRecommendation = typeof priceRecommendations.$inferSelect;
export type InsertPriceRecommendation = z.infer<typeof insertPriceRecommendationSchema>;

export type CompetitorPrice = typeof competitorPrices.$inferSelect;
export type InsertCompetitorPrice = z.infer<typeof insertCompetitorPriceSchema>;

export type RevenueAnalytic = typeof revenueAnalytics.$inferSelect;
export type InsertRevenueAnalytic = z.infer<typeof insertRevenueAnalyticSchema>;

export type YeildManagementSetting = typeof yeildManagementSettings.$inferSelect;
export type InsertYeildManagementSetting = z.infer<typeof insertYeildManagementSettingSchema>;

// Gelir Yönetimi Modelleri
export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  routeId: integer("route_id").references(() => routes.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  specialEventId: integer("special_event_id").references(() => specialEvents.id),
  minDiscountPercent: text("min_discount_percent").notNull(),
  maxMarkupPercent: text("max_markup_percent").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
});

// Tanımlar kaldırıldı çünkü aşağıda tekrar tanımlanmış

// Gelir Yönetim Sistemi İlişkileri
export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  route: one(routes, {
    fields: [pricingRules.routeId],
    references: [routes.id],
  }),
  specialEvent: one(specialEvents, {
    fields: [pricingRules.specialEventId],
    references: [specialEvents.id],
  }),
  createdByUser: one(users, {
    fields: [pricingRules.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [pricingRules.lastUpdatedBy],
    references: [users.id],
  }),
}));

// Relations already defined previously - removed duplicate declarations

// Düzeltildi: Tablo tanımlamalarının ikinci kopyası kaldırıldı

// Add correct relation definitions after their respective table definitions

// Gelir Yönetim Sistemi Modelleri - Using existing pricingRules definition

export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// SpecialEvents ve DemandForecasts tabloları daha önce tanımlandı
// Bu kısımda yinelenen tanımlamalar kaldırıldı

export const specialEvents2 = pgTable("special_events_new", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  impactLevel: text("impact_level").default("medium").notNull(), // low, medium, high
  priceModifier: numeric("price_modifier").notNull().default("1.0"),
  locations: jsonb("locations").default([]), // Etkilenen konumlar
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  eventType: text("event_type").notNull(), // festival, holiday, sports, etc.
  expectedDemandIncrease: numeric("expected_demand_increase"), // Beklenen talep artışı (yüzde)
});

export const insertSpecialEventSchema2 = createInsertSchema(specialEvents2).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const demandForecasts2 = pgTable("demand_forecasts_new", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  forecastDate: timestamp("forecast_date").notNull(),
  predictedDemand: numeric("predicted_demand").notNull(),
  confidenceLevel: numeric("confidence_level").default("0.85"), // 0.0-1.0 arasında güven düzeyi
  factors: jsonb("factors").default({}), // Tahmini etkileyen faktörler
  actualDemand: numeric("actual_demand"), // Gerçekleşen talep (sonradan doldurulur)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  forecastModel: text("forecast_model").default("arima").notNull(), // Kullanılan tahmin modeli
  forecastHorizon: integer("forecast_horizon").notNull(), // Kaç gün ilerisi için tahmin
  seasonalityPattern: text("seasonality_pattern"), // Mevsimsellik deseni: weekly, monthly, yearly
  modelAccuracy: numeric("model_accuracy"), // Model doğruluğu (sonradan doldurulur)
});

export const insertDemandForecastSchema2 = createInsertSchema(demandForecasts2).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  actualDemand: true,
  modelAccuracy: true
});

export const priceRecommendations = pgTable("price_recommendations", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  scheduleId: integer("schedule_id").references(() => schedules.id),
  departureDate: timestamp("departure_date").notNull(),
  currentPrice: numeric("current_price").notNull(), // Mevcut fiyat
  recommendedPrice: numeric("recommended_price").notNull(), // Önerilen fiyat
  recommendationReason: text("recommendation_reason").notNull(), // Öneri nedeni
  confidenceScore: numeric("confidence_score").default("0.8"), // 0.0-1.0 arasında güven puanı
  appliedAt: timestamp("applied_at"), // Öneri ne zaman uygulandı
  appliedBy: integer("applied_by").references(() => users.id), // Kim tarafından uygulandı
  status: text("status").default("pending").notNull(), // pending, approved, rejected, applied
  createdAt: timestamp("created_at").defaultNow().notNull(),
  priceIncreasePercentage: numeric("price_increase_percentage"), // Mevcut fiyata göre artış yüzdesi
  expectedRevenueLift: numeric("expected_revenue_lift"), // Beklenen gelir artışı
  competitivePriceFactor: numeric("competitive_price_factor"), // Rekabetçi fiyat faktörü
});

export const insertPriceRecommendationSchema = createInsertSchema(priceRecommendations).omit({ 
  id: true, 
  createdAt: true,
  appliedAt: true
});

export const competitorPrices = pgTable("competitor_prices", {
  id: serial("id").primaryKey(),
  competitorName: text("competitor_name").notNull(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  departureDate: timestamp("departure_date").notNull(),
  price: numeric("price").notNull(),
  currency: text("currency").default("TRY").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  availableSeats: integer("available_seats"),
  sourceUrl: text("source_url"), // Fiyatın alındığı URL
  vehicleType: text("vehicle_type"), // Rakibin araç tipi
  cabinType: text("cabin_type"), // Rakibin kabin tipi
  addedBy: integer("added_by").references(() => users.id),
  isManualEntry: boolean("is_manual_entry").default(false).notNull(), // Manuel giriş mi otomatik mi
  notes: text("notes"),
});

export const insertCompetitorPriceSchema = createInsertSchema(competitorPrices).omit({ 
  id: true, 
  capturedAt: true
});

export const revenueAnalytics = pgTable("revenue_analytics", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  date: timestamp("date").notNull(),
  totalRevenue: numeric("total_revenue").notNull(),
  targetRevenue: numeric("target_revenue"),
  passengerCount: integer("passenger_count").notNull(),
  vehicleCount: integer("vehicle_count"),
  averageFare: numeric("average_fare"),
  revenuePerAvailableSeat: numeric("revenue_per_available_seat"), // REVPAS
  occupancyRate: numeric("occupancy_rate"), // Doluluk oranı
  cancellationRate: numeric("cancellation_rate"), // İptal oranı
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dataSource: text("data_source").default("system").notNull(), // Veri kaynağı: system, manual, imported
  periodType: text("period_type").default("daily").notNull(), // daily, weekly, monthly
  revenueChangePercent: numeric("revenue_change_percent"), // Önceki döneme göre değişim
});

export const insertRevenueAnalyticSchema = createInsertSchema(revenueAnalytics).omit({ 
  id: true, 
  createdAt: true
});

export const yeildManagementSettings = pgTable("yeild_management_settings", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id), // Belirli bir rota için ayarlar, null ise global
  minDiscountPercent: numeric("min_discount_percent").default("0").notNull(), // Min indirim yüzdesi
  maxMarkupPercent: numeric("max_markup_percent").default("50").notNull(), // Maks fiyat artış yüzdesi
  pricingSensitivity: numeric("pricing_sensitivity").default("1.0").notNull(), // Fiyat duyarlılığı: 0.1-3.0
  demandSensitivity: numeric("demand_sensitivity").default("1.0").notNull(), // Talep duyarlılığı: 0.1-3.0
  optimizationTarget: text("optimization_target").default("revenue").notNull(), // revenue, occupancy, profit
  reoptimizationFrequency: text("reoptimization_frequency").default("daily").notNull(), // hourly, daily, weekly
  advancedPurchaseDiscounts: jsonb("advanced_purchase_discounts").default({}), // Erken satın alma indirimleri
  lastMinuteMarkups: jsonb("last_minute_markups").default({}), // Son dakika fiyat artışları
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  autoApplyRecommendations: boolean("auto_apply_recommendations").default(false).notNull(), // Önerileri otomatik uygula
});

export const insertYeildManagementSettingSchema = createInsertSchema(yeildManagementSettings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});

// Yedekleme ve Felaket Kurtarma Modelleri
// Sistem Yedeklemeleri
export const systemBackups = pgTable("system_backups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(),
  size: numeric("size").notNull(), // Bayt cinsinden
  createdBy: integer("created_by").notNull(), // Kullanıcı ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  backupType: text("backup_type").notNull(), // full, incremental, differential
  status: text("status").default("completed").notNull(), // pending, completed, failed
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").default({}).notNull(), // Ek bilgiler
  retentionDays: integer("retention_days").default(30).notNull(), // Kaç gün saklanacak
  isAutomatic: boolean("is_automatic").default(false).notNull(), // Otomatik mi, manuel mi
  compressionType: text("compression_type").default("gzip").notNull(), // gzip, zip, none
  encryptionEnabled: boolean("encryption_enabled").default(false).notNull(),
  scheduleId: integer("schedule_id"), // Otomatik yedekleme planı ID'si (varsa)
});

export const insertSystemBackupSchema = createInsertSchema(systemBackups).pick({
  name: true,
  description: true,
  filePath: true,
  size: true,
  createdBy: true,
  backupType: true,
  status: true,
  completedAt: true,
  metadata: true,
  retentionDays: true,
  isAutomatic: true,
  compressionType: true,
  encryptionEnabled: true,
  scheduleId: true,
});

// Yedekleme Planlama
export const backupSchedules = pgTable("backup_schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // daily, weekly, monthly
  timeOfDay: text("time_of_day").notNull(), // HH:MM format
  dayOfWeek: integer("day_of_week"), // 0-6 (Pazar-Cumartesi) - weekly için
  dayOfMonth: integer("day_of_month"), // 1-31 - monthly için
  backupType: text("backup_type").notNull(), // full, incremental, differential
  retentionDays: integer("retention_days").default(30).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  compressionType: text("compression_type").default("gzip").notNull(),
  encryptionEnabled: boolean("encryption_enabled").default(false).notNull(),
  includeData: boolean("include_data").default(true).notNull(), // Veri içersin mi
  includeFiles: boolean("include_files").default(true).notNull(), // Dosyaları içersin mi
  backupDestination: text("backup_destination").default("local").notNull(), // local, s3, etc.
  destinationSettings: jsonb("destination_settings").default({}).notNull(), // Hedef ayarları
});

export const insertBackupScheduleSchema = createInsertSchema(backupSchedules).pick({
  name: true,
  description: true,
  frequency: true,
  timeOfDay: true,
  dayOfWeek: true,
  dayOfMonth: true,
  backupType: true,
  retentionDays: true,
  isActive: true,
  createdBy: true,
  lastRunAt: true,
  nextScheduledAt: true,
  compressionType: true,
  encryptionEnabled: true,
  includeData: true,
  includeFiles: true,
  backupDestination: true,
  destinationSettings: true,
});

// Geri Yükleme İşlemleri
export const restoreOperations = pgTable("restore_operations", {
  id: serial("id").primaryKey(),
  backupId: integer("backup_id").notNull(), // Geri yüklenecek yedeklemenin ID'si
  name: text("name").notNull(),
  description: text("description"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("pending").notNull(), // pending, in_progress, completed, failed
  initiatedBy: integer("initiated_by").notNull(), // Kullanıcı ID
  userId: integer("user_id").notNull(), // Kullanıcı ID
  restoreType: text("restore_type").notNull(), // full, partial
  targetEnvironment: text("target_environment").default("production").notNull(), // production, staging, test
  metadata: jsonb("metadata").default({}).notNull(), // Ek bilgiler (hata mesajları, uyarılar)
  includeData: boolean("include_data").default(true).notNull(), // Veri içersin mi
  includeFiles: boolean("include_files").default(true).notNull(), // Dosyaları içersin mi
  selectedTables: text("selected_tables"), // Seçili tablolar (partial restore için)
  postRestoreScript: text("post_restore_script"), // Geri yüklemeden sonra çalıştırılacak script
});

export const insertRestoreOperationSchema = createInsertSchema(restoreOperations).pick({
  backupId: true,
  name: true,
  description: true,
  status: true,
  initiatedBy: true,
  userId: true,
  restoreType: true,
  targetEnvironment: true,
  metadata: true,
  includeData: true,
  includeFiles: true,
  selectedTables: true,
  postRestoreScript: true,
  completedAt: true,
});

// Felaket Kurtarma Noktaları
export const disasterRecoveryPoints = pgTable("disaster_recovery_points", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  backupId: integer("backup_id").notNull(), // İlgili yedekleme ID'si
  isActive: boolean("is_active").default(true).notNull(),
  recoveryPointObjective: integer("recovery_point_objective").notNull(), // Dakika cinsinden RPO
  recoveryTimeObjective: integer("recovery_time_objective").notNull(), // Dakika cinsinden RTO
  lastTestedAt: timestamp("last_tested_at"),
  testResult: text("test_result"), // passed, failed, untested
  metadata: jsonb("metadata").default({}).notNull(), // Ek bilgiler
});

export const insertDisasterRecoveryPointSchema = createInsertSchema(disasterRecoveryPoints).pick({
  name: true,
  description: true,
  backupId: true,
  isActive: true,
  recoveryPointObjective: true,
  recoveryTimeObjective: true,
  lastTestedAt: true,
  testResult: true,
  metadata: true,
});

// Yedekleme Ve Geri Yükleme İlişkileri
export const systemBackupsRelations = relations(systemBackups, ({ one }) => ({
  schedule: one(backupSchedules, {
    fields: [systemBackups.scheduleId],
    references: [backupSchedules.id],
  }),
  createdByUser: one(users, {
    fields: [systemBackups.createdBy],
    references: [users.id],
  }),
}));

export const backupSchedulesRelations = relations(backupSchedules, ({ many, one }) => ({
  backups: many(systemBackups),
  createdByUser: one(users, {
    fields: [backupSchedules.createdBy],
    references: [users.id],
  }),
}));

export const restoreOperationsRelations = relations(restoreOperations, ({ one }) => ({
  backup: one(systemBackups, {
    fields: [restoreOperations.backupId],
    references: [systemBackups.id],
  }),
  initiatedByUser: one(users, {
    fields: [restoreOperations.initiatedBy],
    references: [users.id],
  }),
  user: one(users, {
    fields: [restoreOperations.userId],
    references: [users.id],
  }),
}));

export const disasterRecoveryPointsRelations = relations(disasterRecoveryPoints, ({ one }) => ({
  backup: one(systemBackups, {
    fields: [disasterRecoveryPoints.backupId],
    references: [systemBackups.id],
  }),
}));



// Transfer Vehicle Types model
export const transferVehicleTypes = pgTable("transfer_vehicle_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  maxPassengers: integer("max_passengers").notNull(),
  maxLuggage: integer("max_luggage"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransferVehicleTypeSchema = createInsertSchema(transferVehicleTypes).pick({
  name: true,
  description: true,
  maxPassengers: true,
  maxLuggage: true,
  imageUrl: true,
  isActive: true,
});

// Transfer Routes model
export const transferRoutes = pgTable("transfer_routes", {
  id: serial("id").primaryKey(),
  originName: text("origin_name").notNull(),
  originType: text("origin_type").notNull(),
  destinationName: text("destination_name").notNull(),
  destinationType: text("destination_type").notNull(),
  distance: numeric("distance"),
  estimatedDuration: integer("estimated_duration"),
  isPopular: boolean("is_popular").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransferRouteSchema = createInsertSchema(transferRoutes).pick({
  originName: true,
  originType: true,
  destinationName: true,
  destinationType: true,
  distance: true,
  estimatedDuration: true,
  isPopular: true,
  isActive: true,
});

// Transfer Prices model
export const transferPrices = pgTable("transfer_prices", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => transferRoutes.id).notNull(),
  vehicleTypeId: integer("vehicle_type_id").references(() => transferVehicleTypes.id).notNull(),
  price: numeric("price").notNull(),
  currencyCode: text("currency_code").default("TRY").notNull(),
  isOneWay: boolean("is_one_way").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransferPriceSchema = createInsertSchema(transferPrices).pick({
  routeId: true,
  vehicleTypeId: true,
  price: true,
  currencyCode: true,
  isOneWay: true,
  isActive: true,
});

// Transfer Bookings model
export const transferBookings = pgTable("transfer_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  agencyId: integer("agency_id").references(() => agencies.id),
  routeId: integer("route_id").references(() => transferRoutes.id).notNull(),
  vehicleTypeId: integer("vehicle_type_id").references(() => transferVehicleTypes.id).notNull(),
  bookingReference: text("booking_reference").notNull().unique(),
  pnrNumber: text("pnr_number").notNull().unique(),
  isOneWay: boolean("is_one_way").default(true).notNull(),
  pickupDate: date("pickup_date").notNull(),
  pickupTime: time("pickup_time").notNull(),
  returnDate: date("return_date"),
  returnTime: time("return_time"),
  passengerCount: integer("passenger_count").notNull(),
  luggageCount: integer("luggage_count"),
  flightNumber: text("flight_number"),
  pickupDetails: text("pickup_details"),
  dropoffDetails: text("dropoff_details"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email"),
  totalPrice: numeric("total_price").notNull(),
  currencyCode: text("currency_code").default("TRY").notNull(),
  paymentStatus: text("payment_status").default("pending").notNull(),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  status: text("status").default("pending").notNull(),
  driverDetails: jsonb("driver_details"),
  specialRequests: text("special_requests"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransferBookingSchema = createInsertSchema(transferBookings).pick({
  userId: true,
  agencyId: true,
  routeId: true,
  vehicleTypeId: true,
  bookingReference: true,
  pnrNumber: true,
  isOneWay: true,
  pickupDate: true,
  pickupTime: true,
  returnDate: true,
  returnTime: true,
  passengerCount: true,
  luggageCount: true,
  flightNumber: true,
  pickupDetails: true,
  dropoffDetails: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  totalPrice: true,
  currencyCode: true,
  paymentStatus: true,
  paymentMethod: true,
  transactionId: true,
  status: true,
  driverDetails: true,
  specialRequests: true,
});

// Tour and Transfer module relations are defined elsewhere in the file

export const transferVehicleTypesRelations = relations(transferVehicleTypes, ({ many }) => ({
  prices: many(transferPrices),
  bookings: many(transferBookings),
}));

export const transferRoutesRelations = relations(transferRoutes, ({ many }) => ({
  prices: many(transferPrices),
  bookings: many(transferBookings),
}));

export const transferPricesRelations = relations(transferPrices, ({ one }) => ({
  route: one(transferRoutes, {
    fields: [transferPrices.routeId],
    references: [transferRoutes.id],
  }),
  vehicleType: one(transferVehicleTypes, {
    fields: [transferPrices.vehicleTypeId],
    references: [transferVehicleTypes.id],
  }),
}));

export const transferBookingsRelations = relations(transferBookings, ({ one }) => ({
  user: one(users, {
    fields: [transferBookings.userId],
    references: [users.id],
  }),
  agency: one(agencies, {
    fields: [transferBookings.agencyId],
    references: [agencies.id],
  }),
  route: one(transferRoutes, {
    fields: [transferBookings.routeId],
    references: [transferRoutes.id],
  }),
  vehicleType: one(transferVehicleTypes, {
    fields: [transferBookings.vehicleTypeId],
    references: [transferVehicleTypes.id],
  }),
}));

// Yorum sistemi
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  routeId: integer("route_id").references(() => routes.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  rating: integer("rating").notNull(), // 1-5 yıldız
  title: text("title"),
  content: text("content"),
  isVerified: boolean("is_verified").default(false), // Gerçek yolculuk yapan kişi mi?
  isPublished: boolean("is_published").default(true), // Yayında mı?
  helpfulnessScore: integer("helpfulness_score").default(0), // Faydalılık puanı
  reportedCount: integer("reported_count").default(0), // Şikayet edilme sayısı
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// Yorum oylamaları
export const reviewVotes = pgTable("review_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => reviews.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isHelpful: boolean("is_helpful").notNull(), // true = faydalı, false = faydasız
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Yorumlara cevaplar (hem şirket hem kullanıcılar cevaplayabilir)
export const reviewReplies = pgTable("review_replies", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => reviews.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isStaffReply: boolean("is_staff_reply").default(false), // Firma personeli tarafından mı cevaplanmış?
  isPublished: boolean("is_published").default(true), // Yayında mı?
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Kullanıcı Profili Ayarları
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  bio: text("bio"),
  birthDate: date("birth_date"),
  gender: text("gender"),
  nationality: text("nationality"),
  preferredLanguage: text("preferred_language").default("tr"),
  preferredCurrency: text("preferred_currency").default("TRY"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  postalCode: text("postal_code"),
  identityNumber: text("identity_number"), // Pasaport/TC Kimlik
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  passportNumber: text("passport_number"),
  passportExpiry: date("passport_expiry"),
  newsletterSubscribed: boolean("newsletter_subscribed").default(true),
  travelPreferences: jsonb("travel_preferences"), // Yolculuk tercihleri (kabin, araç, vb.)
  avatarUrl: text("avatar_url"),
  socialFacebook: text("social_facebook"),
  socialTwitter: text("social_twitter"),
  socialInstagram: text("social_instagram"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Üyelik Seviyeleri
export const membershipTiers = pgTable("membership_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  color: text("color").default("#808080").notNull(),
  monthlyFee: text("monthly_fee").default("0").notNull(),
  annualFee: text("annual_fee").default("0").notNull(),
  discountPercentage: text("discount_percentage").default("0").notNull(),
  features: text("features").default(""),
  priority: text("priority").default("3").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Üyelik seviyesi zod şeması
export const insertMembershipTierSchema = createInsertSchema(membershipTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for MembershipTier
export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = z.infer<typeof insertMembershipTierSchema>;

// Gelen Kutusu (Inbox) tablosu
export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  senderUserId: integer("sender_user_id").notNull().references(() => users.id),
  receiverUserId: integer("receiver_user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  parentId: integer("parent_id").references(() => inboxMessages.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inbox message zod şeması
export const insertInboxMessageSchema = createInsertSchema(inboxMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for InboxMessage
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type InsertInboxMessage = z.infer<typeof insertInboxMessageSchema>;

// Gelen Kutusu İlişkileri
export const inboxMessagesToUsers = relations(inboxMessages, ({ one }) => ({
  sender: one(users, {
    fields: [inboxMessages.senderUserId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [inboxMessages.receiverUserId],
    references: [users.id],
  }),
  parentMessage: one(inboxMessages, {
    fields: [inboxMessages.parentId],
    references: [inboxMessages.id],
  }),
}));

// User ve MembershipTier ilişkisi - Devre dışı bırakıldı çünkü users tablosunda membershipTierId alanı yok
// export const usersToMembershipTiers = relations(users, ({ one }) => ({
//   membershipTier: one(membershipTiers, {
//     fields: [users.membershipTierId],
//     references: [membershipTiers.id],
//   }),
// }));

// B2B Fiyatlandırma Katmanları
export const pricingTiers = pgTable("pricing_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percentage"), // percentage veya fixed
  discountValue: text("discount_value").notNull().default("0"),
  minBookingCount: integer("min_booking_count").default(0).notNull(),
  minTotalAmount: text("min_total_amount").default("0").notNull(),
  requiresApproval: boolean("requires_approval").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  agencyCategory: text("agency_category").default("regular").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Acente Fiyatlandırma
export const agencyPricing = pgTable("agency_pricing", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agencies.id),
  pricingTierId: integer("pricing_tier_id").references(() => pricingTiers.id),
  customDiscountType: text("custom_discount_type"), // percentage veya fixed
  customDiscountValue: text("custom_discount_value"),
  routeSpecificPricing: boolean("route_specific_pricing").default(false).notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rota Bazlı Fiyatlandırma
export const routePricing = pgTable("route_pricing", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agencies.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  discountType: text("discount_type").notNull(), // percentage veya fixed
  discountValue: text("discount_value").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// İlişkiler
export const pricingTiersRelations = relations(pricingTiers, ({ many }) => ({
  agencyPricing: many(agencyPricing),
}));

export const agencyPricingRelations = relations(agencyPricing, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [agencyPricing.agencyId],
    references: [agencies.id],
  }),
  pricingTier: one(pricingTiers, {
    fields: [agencyPricing.pricingTierId],
    references: [pricingTiers.id],
  }),
  routePricing: many(routePricing),
}));

export const routePricingRelations = relations(routePricing, ({ one }) => ({
  agency: one(agencies, {
    fields: [routePricing.agencyId],
    references: [agencies.id],
  }),
  route: one(routes, {
    fields: [routePricing.routeId],
    references: [routes.id],
  }),
}));

// Zod şemaları
export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgencyPricingSchema = createInsertSchema(agencyPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoutePricingSchema = createInsertSchema(routePricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;

export type AgencyPricing = typeof agencyPricing.$inferSelect;
export type InsertAgencyPricing = z.infer<typeof insertAgencyPricingSchema>;

export type RoutePricing = typeof routePricing.$inferSelect;
export type InsertRoutePricing = z.infer<typeof insertRoutePricingSchema>;

// Yorumlara ilişkin zod şemaları
export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  helpfulnessScore: true,
  reportedCount: true,
});

export const insertReviewVoteSchema = createInsertSchema(reviewVotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewReplySchema = createInsertSchema(reviewReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tip tanımlamaları
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export type ReviewVote = typeof reviewVotes.$inferSelect;
export type InsertReviewVote = typeof reviewVotes.$inferInsert;

export type ReviewReply = typeof reviewReplies.$inferSelect;
export type InsertReviewReply = typeof reviewReplies.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Review ilişkilerini tanımla
export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id]
  }),
  route: one(routes, {
    fields: [reviews.routeId],
    references: [routes.id]
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id]
  }),
  votes: many(reviewVotes),
  replies: many(reviewReplies),
  shares: many(socialShares, {
    relationName: "reviewShares"
  })
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id]
  }),
  user: one(users, {
    fields: [reviewVotes.userId],
    references: [users.id]
  })
}));

export const reviewRepliesRelations = relations(reviewReplies, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewReplies.reviewId],
    references: [reviews.id]
  }),
  user: one(users, {
    fields: [reviewReplies.userId],
    references: [users.id]
  })
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id]
  })
}));

// Add Transfer types to existing relations
export const usersRelationsUpdate = relations(users, ({ many }) => ({
  transferBookings: many(transferBookings),
}));

export const agenciesRelationsUpdate = relations(agencies, ({ many }) => ({
  transferBookings: many(transferBookings),
}));

// Yedekleme ve Felaket Kurtarma Tip İhracatları
export type SystemBackup = typeof systemBackups.$inferSelect;
export type InsertSystemBackup = z.infer<typeof insertSystemBackupSchema>;

export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = z.infer<typeof insertBackupScheduleSchema>;

export type RestoreOperation = typeof restoreOperations.$inferSelect;
export type InsertRestoreOperation = z.infer<typeof insertRestoreOperationSchema>;

export type DisasterRecoveryPoint = typeof disasterRecoveryPoints.$inferSelect;
export type InsertDisasterRecoveryPoint = z.infer<typeof insertDisasterRecoveryPointSchema>;

export type TransferVehicleType = typeof transferVehicleTypes.$inferSelect;
export type InsertTransferVehicleType = z.infer<typeof insertTransferVehicleTypeSchema>;

export type TransferRoute = typeof transferRoutes.$inferSelect;
export type InsertTransferRoute = z.infer<typeof insertTransferRouteSchema>;

export type TransferPrice = typeof transferPrices.$inferSelect;
export type InsertTransferPrice = z.infer<typeof insertTransferPriceSchema>;

export type TransferBooking = typeof transferBookings.$inferSelect;
export type InsertTransferBooking = z.infer<typeof insertTransferBookingSchema>;

// API yapılandırma modeli
export const apiConfigs = pgTable("api_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  apiKey: text("api_key").notNull(),
  secretKey: text("secret_key"),
  baseUrl: text("base_url"),
  isActive: boolean("is_active").default(true).notNull(),
  mode: text("mode").default("test").notNull(), // live, test, demo
  category: text("category").notNull(), // payment, messaging, shipping, backoffice, other
  lastChecked: text("last_checked"), // Son kontrol tarihi (ISO string)
  status: text("status").default("inactive"), // active, inactive, error
});

export const insertApiConfigsSchema = createInsertSchema(apiConfigs).pick({
  name: true,
  provider: true,
  apiKey: true,
  secretKey: true,
  baseUrl: true,
  isActive: true,
  mode: true,
  category: true,
  lastChecked: true,
  status: true,
});

export type ApiConfigEntity = typeof apiConfigs.$inferSelect;
export type InsertApiConfigEntity = z.infer<typeof insertApiConfigsSchema>;

// Country type definition
export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;

// Search Options Type
export type SearchOptions = {
  departurePort?: string;
  arrivalPort?: string;
  departureDate?: string;
  returnDate?: string | null;
  passengerCount?: number;
  vehicleType?: string | null;
  roundTrip?: boolean;
  sortBy?: 'price' | 'duration' | 'departure' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  priceMin?: number;
  priceMax?: number;
  ferryCompany?: string;
  filters?: {
    [key: string]: any;
  };
};

// Bus Wagner Integration Models
export const busWagnerSuppliers = pgTable("bus_wagner_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  country: text("country").notNull(),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  isActive: boolean("is_active").default(true).notNull(),
  logo: text("logo"),
  description: text("description"),
  status: text("status").default("active"), // active, inactive, testing, suspended
  lastChecked: timestamp("last_checked"),
  connectionParams: jsonb("connection_params"), // Extra connection parameters in JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusWagnerSupplierSchema = createInsertSchema(busWagnerSuppliers).pick({
  name: true,
  code: true,
  country: true,
  apiEndpoint: true,
  apiKey: true,
  secretKey: true,
  isActive: true,
  logo: true,
  description: true,
  status: true,
  connectionParams: true,
});

export const busWagnerRoutes = pgTable("bus_wagner_routes", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  externalRouteId: text("external_route_id").notNull(),
  departureCity: text("departure_city").notNull(),
  departureCityCode: text("departure_city_code"),
  departureStation: text("departure_station").notNull(),
  departureStationCode: text("departure_station_code"),
  arrivalCity: text("arrival_city").notNull(),
  arrivalCityCode: text("arrival_city_code"),
  arrivalStation: text("arrival_station").notNull(),
  arrivalStationCode: text("arrival_station_code"),
  distance: integer("distance"), // in kilometers
  duration: integer("duration").notNull(), // in minutes
  basePrice: numeric("base_price"),
  currency: text("currency").default("try"),
  isActive: boolean("is_active").default(true).notNull(),
  routeType: text("route_type").default("regular"), // regular, express, luxury
  amenities: jsonb("amenities"), // WiFi, TV, etc.
  isInternational: boolean("is_international").default(false),
  countryDeparture: text("country_departure"),
  countryArrival: text("country_arrival"),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const insertBusWagnerRouteSchema = createInsertSchema(busWagnerRoutes).pick({
  supplierId: true,
  externalRouteId: true,
  departureCity: true,
  departureCityCode: true,
  departureStation: true,
  departureStationCode: true,
  arrivalCity: true,
  arrivalCityCode: true,
  arrivalStation: true,
  arrivalStationCode: true,
  distance: true,
  duration: true,
  basePrice: true,
  currency: true,
  isActive: true,
  routeType: true,
  amenities: true,
  isInternational: true,
  countryDeparture: true,
  countryArrival: true,
});

export const busWagnerSchedules = pgTable("bus_wagner_schedules", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  externalScheduleId: text("external_schedule_id").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  price: numeric("price").notNull(),
  currency: text("currency").default("try"),
  isActive: boolean("is_active").default(true).notNull(),
  vehicleType: text("vehicle_type"), // standard, vip, double-decker
  vehicleModel: text("vehicle_model"),
  vehiclePlate: text("vehicle_plate"),
  hasWifi: boolean("has_wifi").default(false),
  hasUsb: boolean("has_usb").default(false),
  hasToilet: boolean("has_toilet").default(false),
  hasEntertainment: boolean("has_entertainment").default(false),
  hasMealService: boolean("has_meal_service").default(false),
  additionalFeatures: jsonb("additional_features"),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const insertBusWagnerScheduleSchema = createInsertSchema(busWagnerSchedules).pick({
  routeId: true,
  supplierId: true,
  externalScheduleId: true,
  departureTime: true,
  arrivalTime: true,
  totalSeats: true,
  availableSeats: true,
  price: true,
  currency: true,
  isActive: true,
  vehicleType: true,
  vehicleModel: true,
  vehiclePlate: true,
  hasWifi: true,
  hasUsb: true,
  hasToilet: true,
  hasEntertainment: true,
  hasMealService: true,
  additionalFeatures: true,
});

export const busWagnerBookings = pgTable("bus_wagner_bookings", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  scheduleId: integer("schedule_id").notNull(),
  externalBookingId: text("external_booking_id"),
  bookingReference: text("booking_reference").notNull().unique(),
  status: text("status").default("pending").notNull(), // pending, confirmed, cancelled
  totalPrice: numeric("total_price").notNull(),
  currency: text("currency").default("try"),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, refunded
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  passengerCount: integer("passenger_count").notNull(),
  passengers: jsonb("passengers").notNull(), // Array of passenger details
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  ticketNumber: text("ticket_number"),
  ticketPdfUrl: text("ticket_pdf_url"),
  notes: text("notes"),
  localBookingId: integer("local_booking_id"), // Reference to our internal booking system
});

export const insertBusWagnerBookingSchema = createInsertSchema(busWagnerBookings).pick({
  supplierId: true,
  scheduleId: true,
  externalBookingId: true,
  bookingReference: true,
  status: true,
  totalPrice: true,
  currency: true,
  paymentStatus: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  passengerCount: true,
  passengers: true,
  confirmedAt: true,
  cancelledAt: true,
  cancellationReason: true,
  ticketNumber: true,
  ticketPdfUrl: true,
  notes: true,
  localBookingId: true,
});

export const busWagnerSeats = pgTable("bus_wagner_seats", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(),
  externalSeatId: text("external_seat_id"),
  seatNumber: text("seat_number").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  seatType: text("seat_type").default("standard"), // standard, window, aisle, premium
  price: numeric("price"),
  bookingId: integer("booking_id"), // Reference to booking if seat is reserved
  position: jsonb("position"), // Position coordinate on seat map (x, y)
  deckNumber: integer("deck_number").default(1), // For double decker buses
  lastSyncedAt: timestamp("last_synced_at"),
});

export const insertBusWagnerSeatSchema = createInsertSchema(busWagnerSeats).pick({
  scheduleId: true,
  externalSeatId: true,
  seatNumber: true,
  isAvailable: true,
  seatType: true,
  price: true,
  bookingId: true,
  position: true,
  deckNumber: true,
});

export const busWagnerSyncLogs = pgTable("bus_wagner_sync_logs", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  entityType: text("entity_type").notNull(), // routes, schedules, bookings, seats
  operationType: text("operation_type").notNull(), // fetch, create, update, cancel
  status: text("status").notNull(), // success, failure
  message: text("message"),
  details: jsonb("details"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  itemsProcessed: integer("items_processed").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBusWagnerSyncLogSchema = createInsertSchema(busWagnerSyncLogs).pick({
  supplierId: true,
  entityType: true,
  operationType: true,
  status: true,
  message: true,
  details: true,
  startedAt: true,
  completedAt: true,
  itemsProcessed: true,
});

// Relation setup for Bus Wagner
export const busWagnerSuppliersRelations = relations(busWagnerSuppliers, ({ many }) => ({
  routes: many(busWagnerRoutes),
  schedules: many(busWagnerSchedules),
  bookings: many(busWagnerBookings),
  syncLogs: many(busWagnerSyncLogs),
}));

export const busWagnerRoutesRelations = relations(busWagnerRoutes, ({ one, many }) => ({
  supplier: one(busWagnerSuppliers, { fields: [busWagnerRoutes.supplierId], references: [busWagnerSuppliers.id] }),
  schedules: many(busWagnerSchedules),
}));

export const busWagnerSchedulesRelations = relations(busWagnerSchedules, ({ one, many }) => ({
  route: one(busWagnerRoutes, { fields: [busWagnerSchedules.routeId], references: [busWagnerRoutes.id] }),
  supplier: one(busWagnerSuppliers, { fields: [busWagnerSchedules.supplierId], references: [busWagnerSuppliers.id] }),
  bookings: many(busWagnerBookings),
  seats: many(busWagnerSeats),
}));

export const busWagnerBookingsRelations = relations(busWagnerBookings, ({ one, many }) => ({
  supplier: one(busWagnerSuppliers, { fields: [busWagnerBookings.supplierId], references: [busWagnerSuppliers.id] }),
  schedule: one(busWagnerSchedules, { fields: [busWagnerBookings.scheduleId], references: [busWagnerSchedules.id] }),
  seats: many(busWagnerSeats),
}));

export const busWagnerSeatsRelations = relations(busWagnerSeats, ({ one }) => ({
  schedule: one(busWagnerSchedules, { fields: [busWagnerSeats.scheduleId], references: [busWagnerSchedules.id] }),
  booking: one(busWagnerBookings, { fields: [busWagnerSeats.bookingId], references: [busWagnerBookings.id] }),
}));

export const busWagnerSyncLogsRelations = relations(busWagnerSyncLogs, ({ one }) => ({
  supplier: one(busWagnerSuppliers, { fields: [busWagnerSyncLogs.supplierId], references: [busWagnerSuppliers.id] }),
}));

// Bus Wagner Types
export type BusWagnerSupplier = typeof busWagnerSuppliers.$inferSelect;
export type InsertBusWagnerSupplier = z.infer<typeof insertBusWagnerSupplierSchema>;

export type BusWagnerRoute = typeof busWagnerRoutes.$inferSelect;
export type InsertBusWagnerRoute = z.infer<typeof insertBusWagnerRouteSchema>;

export type BusWagnerSchedule = typeof busWagnerSchedules.$inferSelect;
export type InsertBusWagnerSchedule = z.infer<typeof insertBusWagnerScheduleSchema>;

export type BusWagnerBooking = typeof busWagnerBookings.$inferSelect;
export type InsertBusWagnerBooking = z.infer<typeof insertBusWagnerBookingSchema>;

export type BusWagnerSeat = typeof busWagnerSeats.$inferSelect;
export type InsertBusWagnerSeat = z.infer<typeof insertBusWagnerSeatSchema>;

export type BusWagnerSyncLog = typeof busWagnerSyncLogs.$inferSelect;
export type InsertBusWagnerSyncLog = z.infer<typeof insertBusWagnerSyncLogSchema>;


// Schema güncellemeleri - schema-updates.ts dosyasından entegre edilecekler aşağıda yer almaktadır

// Yorum ve değerlendirme sistemi (üst kısımda zaten tanımlanmış, bu kısımla değiştirilebilir)

// SOSYAL MEDYA PAYLAŞIMLARI
export const socialShares = pgTable("social_shares", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
  bookingId: integer("booking_id").references(() => bookings.id), 
  reviewId: integer("review_id").references(() => reviews.id), 
  contentType: text("content_type").notNull(), // booking, review
  platform: text("platform").notNull(), // facebook, twitter, instagram, whatsapp
  shareUrl: text("share_url"),
  status: text("status").default("completed").notNull(), // pending, completed, failed
  metadata: jsonb("metadata").default({}).notNull(),
});

export type SocialShare = typeof socialShares.$inferSelect;
export type InsertSocialShare = typeof socialShares.$inferInsert;
export const insertSocialShareSchema = createInsertSchema(socialShares).omit({ id: true, createdAt: true });

// KULLANICI DESTEĞİ VE TALEPLERİ
export const supportRequests = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
  bookingId: integer("booking_id").references(() => bookings.id), // İlgili rezervasyon varsa
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // refund, cancellation, modification, complaint, information
  priority: text("priority").default("normal").notNull(), // low, normal, high, urgent
  status: text("status").default("open").notNull(), // open, in_progress, resolved, closed
  assignedTo: integer("assigned_to").references(() => users.id), // Hangi personele atandığı
  resolutionNote: text("resolution_note"),
  isPublic: boolean("is_public").default(false), // Başkalarının görmesi gerekiyor mu
  attachments: jsonb("attachments").default([]).notNull(), // Dosya eklerinin URL'leri
  metadata: jsonb("metadata").default({}).notNull(),
});

export type SupportRequest = typeof supportRequests.$inferSelect;
export type InsertSupportRequest = typeof supportRequests.$inferInsert;
export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({ id: true, createdAt: true, updatedAt: true });

// DESTEK TALEBİ MESAJLARI
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  supportRequestId: integer("support_request_id").notNull().references(() => supportRequests.id),
  senderId: integer("sender_id").notNull().references(() => users.id), // Kullanıcı ID veya personel ID
  isStaff: boolean("is_staff").default(false).notNull(), // Personel mi yoksa kullanıcı mı
  message: text("message").notNull(),
  attachments: jsonb("attachments").default([]).notNull(), // Dosya eklerinin URL'leri
  isRead: boolean("is_read").default(false).notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true });

// KULLANICI BİLDİRİMLERİ
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // booking, payment, review, support, system
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"), // İlgili işlemin ID'si (bookingId, reviewId vs)
  relatedType: text("related_type"), // İlgili işlemin tipi (booking, review, support-request)
  actionUrl: text("action_url"), // Tıklandığında yönlendirilecek URL
  metadata: jsonb("metadata").default({}).notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// İLİŞKİLERİ TANIMLA
export const socialSharesRelations = relations(socialShares, ({ one }) => ({
  user: one(users, {
    fields: [socialShares.userId],
    references: [users.id],
  }),
  review: one(reviews, {
    fields: [socialShares.reviewId],
    references: [reviews.id],
    relationName: "reviewShares"
  }),
  booking: one(bookings, {
    fields: [socialShares.bookingId],
    references: [bookings.id],
  }),
}));

export const supportRequestsRelations = relations(supportRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [supportRequests.userId],
    references: [users.id],
    relationName: "supportRequestUser"
  }),
  booking: one(bookings, {
    fields: [supportRequests.bookingId],
    references: [bookings.id],
    relationName: "supportRequestBooking"
  }),
  assignedUser: one(users, {
    fields: [supportRequests.assignedTo],
    references: [users.id],
    relationName: "supportRequestAssignee"
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  supportRequest: one(supportRequests, {
    fields: [supportMessages.supportRequestId],
    references: [supportRequests.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderId],
    references: [users.id],
    relationName: "supportMessageSender"
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "notificationUser"
  }),
}));

// CMS modelleri - Content Management System
export const pages2 = pgTable('pages_new', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content'),
  authorId: integer('author_id').references(() => users.id).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  isHomepage: boolean('is_homepage').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  featuredImage: text('featured_image')
});

export const menus2 = pgTable('menus_new', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const menuItems2 = pgTable('menu_items_new', {
  id: serial('id').primaryKey(),
  menuId: integer('menu_id').notNull().references(() => menus2.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  order: integer('order').default(0),
  parentId: integer('parent_id'), // Self-reference fixed
  targetBlank: boolean('target_blank').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations for the CMS models
export const pagesRelations2 = relations(pages2, ({ one }) => ({
  author: one(users, {
    fields: [pages2.authorId],
    references: [users.id]
  })
}));

export const menusRelations2 = relations(menus2, ({ many }) => ({
  items: many(menuItems2)
}));

export const menuItemsRelations2 = relations(menuItems2, ({ one, many }) => ({
  menu: one(menus2, {
    fields: [menuItems2.menuId],
    references: [menus2.id]
  }),
  parent: one(menuItems2, {
    fields: [menuItems2.parentId],
    references: [menuItems2.id]
  }),
  children: many(menuItems2, { relationName: "parent" })
}));

// Schema validation for content management
export const insertPageSchema2 = createInsertSchema(pages2).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuSchema2 = createInsertSchema(menus2).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuItemSchema2 = createInsertSchema(menuItems2).omit({ id: true, createdAt: true, updatedAt: true });

export type Page2 = typeof pages2.$inferSelect;
export type InsertPage2 = z.infer<typeof insertPageSchema2>;
export type Menu2 = typeof menus2.$inferSelect;
export type InsertMenu2 = z.infer<typeof insertMenuSchema2>;
export type MenuItem2 = typeof menuItems2.$inferSelect;
export type InsertMenuItem2 = z.infer<typeof insertMenuItemSchema2>;

// Döngüsel import yok - bu dosya zaten users, routes, schedules, bookings tanımlarını içeriyor