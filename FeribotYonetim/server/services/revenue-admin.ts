/**
 * Revenue Admin Service
 *
 * `/api/admin/revenue/*` uçları bu servisi `revenueManagementService` adıyla
 * çağırıyordu, ancak böyle bir servis hiç yazılmamıştı: her istek
 * `ReferenceError: revenueManagementService is not defined` ile düşüyor ve
 * handler'ların try/catch bloğu bunu yanıltıcı bir 500 "Failed to fetch ..."
 * mesajına çeviriyordu.
 *
 * Bu servis o uçların beklediği arayüzü, şemada zaten tanımlı olan tablolar
 * üzerinde uygular:
 *   dynamic_pricing_rules, price_history, demand_forecasts, revenue_goals,
 *   competitor_pricing, seasonal_pricing_factors, special_events,
 *   revenue_snapshots, yield_management_settings
 *
 * Not: `server/services/revenue-management.ts` içindeki RevenueManagementService
 * farklı bir tablo kümesi (pricing_rules, special_events_new, ...) üzerinde
 * çalışır ve `/api/pricing-rules` altındaki router tarafından kullanılır. İki
 * paralel veri modeli vardır; birleştirilmeleri ayrı bir iş kalemidir.
 */

import { and, asc, between, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  competitorPricing,
  demandForecasts,
  dynamicPricingRules,
  priceHistory,
  revenueGoals,
  revenueSnapshots,
  routes,
  seasonalPricingFactors,
  specialEvents,
  yieldManagementSettings,
} from '@shared/schema';
import { revenueManagement } from './revenue-management';

/**
 * Henüz uygulanmamış analiz uçları için kullanılır. routes.ts bu hatayı 501
 * Not Implemented olarak çevirir; sessizce uydurulmuş bir sonuç dönmez.
 */
export class NotImplementedError extends Error {
  readonly notImplemented = true;

  constructor(feature: string) {
    super(`${feature} henüz uygulanmadı`);
    this.name = 'NotImplementedError';
  }
}

export function isNotImplementedError(error: unknown): error is NotImplementedError {
  return error instanceof NotImplementedError;
}

export class RevenueAdminService {
  // ---------------------------------------------------------------
  // Dynamic Pricing Rules
  // ---------------------------------------------------------------

  async getDynamicPricingRules(includeInactive = false) {
    return db
      .select()
      .from(dynamicPricingRules)
      .where(includeInactive ? undefined : eq(dynamicPricingRules.isActive, true))
      .orderBy(desc(dynamicPricingRules.priority), asc(dynamicPricingRules.name));
  }

  async getDynamicPricingRule(id: number) {
    const [rule] = await db
      .select()
      .from(dynamicPricingRules)
      .where(eq(dynamicPricingRules.id, id))
      .limit(1);

    return rule;
  }

  async createDynamicPricingRule(data: typeof dynamicPricingRules.$inferInsert) {
    const [rule] = await db.insert(dynamicPricingRules).values(data).returning();
    return rule;
  }

  async updateDynamicPricingRule(
    id: number,
    data: Partial<typeof dynamicPricingRules.$inferInsert>,
  ) {
    const [rule] = await db
      .update(dynamicPricingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dynamicPricingRules.id, id))
      .returning();

    return rule;
  }

  async deleteDynamicPricingRule(id: number) {
    const [rule] = await db
      .delete(dynamicPricingRules)
      .where(eq(dynamicPricingRules.id, id))
      .returning();

    return rule;
  }

  // ---------------------------------------------------------------
  // Dynamic price calculation
  // ---------------------------------------------------------------

  /**
   * Mevcut RevenueManagementService.calculateDynamicPrice'a devreder; taban
   * fiyat rotadan okunur.
   */
  async calculateDynamicPrice(routeId: number, scheduleId: number | null, date: string) {
    const [route] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);

    if (!route) {
      throw new Error(`Route ${routeId} not found`);
    }

    return revenueManagement.calculateDynamicPrice(
      routeId,
      scheduleId ?? 0,
      new Date(date),
      Number(route.basePrice),
    );
  }

  // ---------------------------------------------------------------
  // Price history
  // ---------------------------------------------------------------

  async getPriceHistory(routeId: number, startDate: string, endDate: string) {
    return db
      .select()
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.routeId, routeId),
          between(priceHistory.date, startDate, endDate),
        ),
      )
      .orderBy(asc(priceHistory.date));
  }

  // ---------------------------------------------------------------
  // Demand forecasts
  // ---------------------------------------------------------------

  async createDemandForecast(data: typeof demandForecasts.$inferInsert) {
    const [forecast] = await db.insert(demandForecasts).values(data).returning();
    return forecast;
  }

  async getDemandForecasts(routeId: number, startDate: string, endDate: string) {
    return db
      .select()
      .from(demandForecasts)
      .where(
        and(
          eq(demandForecasts.routeId, routeId),
          between(demandForecasts.forecastDate, startDate, endDate),
        ),
      )
      .orderBy(asc(demandForecasts.forecastDate));
  }

  // ---------------------------------------------------------------
  // Revenue goals
  // ---------------------------------------------------------------

  async createRevenueGoal(data: typeof revenueGoals.$inferInsert) {
    const [goal] = await db.insert(revenueGoals).values(data).returning();
    return goal;
  }

  async getRevenueGoals(includeInactive = false) {
    return db
      .select()
      .from(revenueGoals)
      .where(includeInactive ? undefined : eq(revenueGoals.isActive, true))
      .orderBy(desc(revenueGoals.startDate));
  }

  async updateRevenueGoal(id: number, data: Partial<typeof revenueGoals.$inferInsert>) {
    const [goal] = await db
      .update(revenueGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(revenueGoals.id, id))
      .returning();

    return goal;
  }

  // ---------------------------------------------------------------
  // Competitor pricing
  // ---------------------------------------------------------------

  async addCompetitorPricing(data: typeof competitorPricing.$inferInsert) {
    const [entry] = await db.insert(competitorPricing).values(data).returning();
    return entry;
  }

  async getCompetitorPricing(routeId: number, startDate: string, endDate: string) {
    return db
      .select()
      .from(competitorPricing)
      .where(
        and(
          eq(competitorPricing.routeId, routeId),
          between(competitorPricing.date, startDate, endDate),
        ),
      )
      .orderBy(asc(competitorPricing.date));
  }

  // ---------------------------------------------------------------
  // Revenue snapshots
  // ---------------------------------------------------------------

  async createRevenueSnapshot(data: typeof revenueSnapshots.$inferInsert) {
    const [snapshot] = await db.insert(revenueSnapshots).values(data).returning();
    return snapshot;
  }

  async getRevenueSnapshots(
    routeId: number | null,
    snapshotType: string,
    startDate: string,
    endDate: string,
  ) {
    const conditions = [
      eq(revenueSnapshots.snapshotType, snapshotType),
      between(revenueSnapshots.snapshotDate, startDate, endDate),
    ];

    if (routeId !== null) {
      conditions.push(eq(revenueSnapshots.routeId, routeId));
    }

    return db
      .select()
      .from(revenueSnapshots)
      .where(and(...conditions))
      .orderBy(asc(revenueSnapshots.snapshotDate));
  }

  // ---------------------------------------------------------------
  // Yield management settings
  // ---------------------------------------------------------------

  /**
   * Aynı rota için kayıt varsa günceller, yoksa oluşturur. routeId boşsa
   * (global ayar) mevcut global kayıt güncellenir.
   */
  async saveYieldManagementSettings(data: typeof yieldManagementSettings.$inferInsert) {
    const routeId = data.routeId ?? null;

    const [existing] = await db
      .select()
      .from(yieldManagementSettings)
      .where(
        routeId === null
          ? eq(yieldManagementSettings.name, data.name)
          : eq(yieldManagementSettings.routeId, routeId),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(yieldManagementSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(yieldManagementSettings.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db.insert(yieldManagementSettings).values(data).returning();
    return created;
  }

  async getYieldManagementSettings(includeInactive = false) {
    return db
      .select()
      .from(yieldManagementSettings)
      .where(includeInactive ? undefined : eq(yieldManagementSettings.isActive, true))
      .orderBy(asc(yieldManagementSettings.name));
  }

  // ---------------------------------------------------------------
  // Seasonal pricing factors
  // ---------------------------------------------------------------

  async createSeasonalPricingFactor(data: typeof seasonalPricingFactors.$inferInsert) {
    const [factor] = await db.insert(seasonalPricingFactors).values(data).returning();
    return factor;
  }

  async getSeasonalPricingFactors(includeInactive = false) {
    return db
      .select()
      .from(seasonalPricingFactors)
      .where(includeInactive ? undefined : eq(seasonalPricingFactors.isActive, true))
      .orderBy(asc(seasonalPricingFactors.startDate));
  }

  async updateSeasonalPricingFactor(
    id: number,
    data: Partial<typeof seasonalPricingFactors.$inferInsert>,
  ) {
    const [factor] = await db
      .update(seasonalPricingFactors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(seasonalPricingFactors.id, id))
      .returning();

    return factor;
  }

  // ---------------------------------------------------------------
  // Special events
  // ---------------------------------------------------------------

  async createSpecialEvent(data: typeof specialEvents.$inferInsert) {
    const [event] = await db.insert(specialEvents).values(data).returning();
    return event;
  }

  async getSpecialEvents(includeInactive = false) {
    return db
      .select()
      .from(specialEvents)
      .where(includeInactive ? undefined : eq(specialEvents.isActive, true))
      .orderBy(asc(specialEvents.startDate));
  }

  async updateSpecialEvent(id: number, data: Partial<typeof specialEvents.$inferInsert>) {
    const [event] = await db
      .update(specialEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(specialEvents.id, id))
      .returning();

    return event;
  }

  // ---------------------------------------------------------------
  // Analiz uçları - henüz uygulanmadı
  //
  // Bu üç uç için ne bir uygulama ne de beklenen yanıt şeması vardı. Uydurma
  // bir çıktı dönmek yerine 501 döndürülüyor; gerçek kural seti tanımlandığında
  // buradan uygulanmalıdır.
  // ---------------------------------------------------------------

  async generateRevenueReport(
    _routeIds: number[] | null,
    _startDate: string,
    _endDate: string,
  ): Promise<never> {
    throw new NotImplementedError('Gelir raporu üretimi');
  }

  async analyzeRoutePerformance(_routeId: number): Promise<never> {
    throw new NotImplementedError('Rota performans analizi');
  }

  async generateOptimizedPricingPlan(
    _routeId: number,
    _daysInAdvance: number,
  ): Promise<never> {
    throw new NotImplementedError('Optimize fiyat planı üretimi');
  }
}

export const revenueAdminService = new RevenueAdminService();
export default revenueAdminService;
