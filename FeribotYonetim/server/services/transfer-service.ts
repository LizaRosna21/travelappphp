/**
 * Transfer Servisi (Havaalanı / şehir içi transfer modülü)
 *
 * Şemada transfer_vehicle_types, transfer_routes, transfer_prices ve
 * transfer_bookings tabloları tanımlıydı, ancak modülün ne servis katmanı ne de
 * API uçları yazılmıştı. Bu dosya modülün tüm veri erişimini ve iş kurallarını
 * içerir.
 *
 * Fiyatlandırma kuralı: fiyat HER ZAMAN sunucuda hesaplanır. İstemciden gelen
 * tutar hiçbir koşulda kullanılmaz.
 */

import { and, asc, count, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import { db } from '../db';
import {
  transferBookings,
  transferPrices,
  transferRoutes,
  transferVehicleTypes,
  type InsertTransferPrice,
  type InsertTransferRoute,
  type InsertTransferVehicleType,
  type TransferBooking,
  type TransferPrice,
  type TransferRoute,
  type TransferVehicleType,
} from '@shared/schema';
import { generateBookingReference, generatePNR } from './pnr-generator';

/** Kullanıcı hatasını (400) sunucu hatasından (500) ayırmak için. */
export class TransferValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'TransferValidationError';
  }
}

export function isTransferValidationError(error: unknown): error is TransferValidationError {
  return error instanceof TransferValidationError;
}

export interface QuoteRequest {
  routeId: number;
  vehicleTypeId: number;
  isOneWay: boolean;
  passengerCount: number;
  luggageCount?: number | null;
}

export interface Quote {
  route: TransferRoute;
  vehicleType: TransferVehicleType;
  isOneWay: boolean;
  passengerCount: number;
  luggageCount: number | null;
  /** Tek yön birim fiyatı */
  unitPrice: number;
  totalPrice: number;
  currencyCode: string;
  /** Gidiş-dönüş fiyatı ayrı tanımlı değilse tek yönün iki katı alındı mı */
  derivedFromOneWay: boolean;
}

export interface CreateBookingInput extends QuoteRequest {
  userId?: number | null;
  agencyId?: number | null;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  flightNumber?: string | null;
  pickupDetails?: string | null;
  dropoffDetails?: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  specialRequests?: string | null;
  paymentMethod?: string | null;
}

export interface BookingListFilters {
  status?: string;
  paymentStatus?: string;
  routeId?: number;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const BOOKING_STATUSES = ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'failed'] as const;

export type TransferBookingStatus = (typeof BOOKING_STATUSES)[number];

/** PNR/referans çakışması durumunda kaç kez yeniden denenecek. */
const UNIQUE_RETRY_LIMIT = 5;

export class TransferService {
  // =================================================================
  // Araç tipleri
  // =================================================================

  async getVehicleTypes(includeInactive = false): Promise<TransferVehicleType[]> {
    return db
      .select()
      .from(transferVehicleTypes)
      .where(includeInactive ? undefined : eq(transferVehicleTypes.isActive, true))
      .orderBy(asc(transferVehicleTypes.maxPassengers), asc(transferVehicleTypes.name));
  }

  async getVehicleType(id: number): Promise<TransferVehicleType | undefined> {
    const [vehicleType] = await db
      .select()
      .from(transferVehicleTypes)
      .where(eq(transferVehicleTypes.id, id))
      .limit(1);

    return vehicleType;
  }

  async createVehicleType(data: InsertTransferVehicleType): Promise<TransferVehicleType> {
    const [created] = await db.insert(transferVehicleTypes).values(data).returning();
    return created;
  }

  async updateVehicleType(
    id: number,
    data: Partial<InsertTransferVehicleType>,
  ): Promise<TransferVehicleType | undefined> {
    const [updated] = await db
      .update(transferVehicleTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transferVehicleTypes.id, id))
      .returning();

    return updated;
  }

  /**
   * Araç tipini pasife alır. Fiyat satırları ve geçmiş rezervasyonlar ona
   * referans verdiği için fiziksel silme yapılmaz.
   */
  async deactivateVehicleType(id: number): Promise<TransferVehicleType | undefined> {
    return this.updateVehicleType(id, { isActive: false });
  }

  // =================================================================
  // Rotalar
  // =================================================================

  async getRoutes(options: {
    includeInactive?: boolean;
    popularOnly?: boolean;
    search?: string;
  } = {}): Promise<TransferRoute[]> {
    const { includeInactive = false, popularOnly = false, search } = options;
    const conditions: SQL[] = [];

    if (!includeInactive) {
      conditions.push(eq(transferRoutes.isActive, true));
    }

    if (popularOnly) {
      conditions.push(eq(transferRoutes.isPopular, true));
    }

    if (search) {
      const term = `%${search}%`;
      const match = or(
        ilike(transferRoutes.originName, term),
        ilike(transferRoutes.destinationName, term),
      );
      if (match) {
        conditions.push(match);
      }
    }

    return db
      .select()
      .from(transferRoutes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transferRoutes.isPopular), asc(transferRoutes.originName));
  }

  async getRoute(id: number): Promise<TransferRoute | undefined> {
    const [route] = await db
      .select()
      .from(transferRoutes)
      .where(eq(transferRoutes.id, id))
      .limit(1);

    return route;
  }

  /** Rota ve o rota için tanımlı aktif fiyatları birlikte döner. */
  async getRouteWithPricing(id: number): Promise<
    | {
        route: TransferRoute;
        options: Array<{ vehicleType: TransferVehicleType; oneWay: number | null; roundTrip: number | null; currencyCode: string }>;
      }
    | undefined
  > {
    const route = await this.getRoute(id);
    if (!route) {
      return undefined;
    }

    const rows = await db
      .select({ price: transferPrices, vehicleType: transferVehicleTypes })
      .from(transferPrices)
      .innerJoin(
        transferVehicleTypes,
        eq(transferPrices.vehicleTypeId, transferVehicleTypes.id),
      )
      .where(
        and(
          eq(transferPrices.routeId, id),
          eq(transferPrices.isActive, true),
          eq(transferVehicleTypes.isActive, true),
        ),
      )
      .orderBy(asc(transferVehicleTypes.maxPassengers));

    const byVehicle = new Map<
      number,
      { vehicleType: TransferVehicleType; oneWay: number | null; roundTrip: number | null; currencyCode: string }
    >();

    for (const row of rows) {
      const entry = byVehicle.get(row.vehicleType.id) ?? {
        vehicleType: row.vehicleType,
        oneWay: null,
        roundTrip: null,
        currencyCode: row.price.currencyCode,
      };

      if (row.price.isOneWay) {
        entry.oneWay = Number(row.price.price);
      } else {
        entry.roundTrip = Number(row.price.price);
      }

      byVehicle.set(row.vehicleType.id, entry);
    }

    // Gidiş-dönüş fiyatı tanımlı değilse tek yönün iki katı gösterilir
    const options = Array.from(byVehicle.values()).map((entry) => ({
      ...entry,
      roundTrip: entry.roundTrip ?? (entry.oneWay !== null ? entry.oneWay * 2 : null),
    }));

    return { route, options };
  }

  async createRoute(data: InsertTransferRoute): Promise<TransferRoute> {
    const [created] = await db.insert(transferRoutes).values(data).returning();
    return created;
  }

  async updateRoute(
    id: number,
    data: Partial<InsertTransferRoute>,
  ): Promise<TransferRoute | undefined> {
    const [updated] = await db
      .update(transferRoutes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transferRoutes.id, id))
      .returning();

    return updated;
  }

  /** Rotayı pasife alır; fiyatlar ve rezervasyonlar ona bağlı olduğu için silinmez. */
  async deactivateRoute(id: number): Promise<TransferRoute | undefined> {
    return this.updateRoute(id, { isActive: false });
  }

  // =================================================================
  // Fiyatlar
  // =================================================================

  async getPrices(routeId?: number): Promise<TransferPrice[]> {
    return db
      .select()
      .from(transferPrices)
      .where(routeId !== undefined ? eq(transferPrices.routeId, routeId) : undefined)
      .orderBy(asc(transferPrices.routeId), asc(transferPrices.vehicleTypeId));
  }

  async getPrice(id: number): Promise<TransferPrice | undefined> {
    const [price] = await db
      .select()
      .from(transferPrices)
      .where(eq(transferPrices.id, id))
      .limit(1);

    return price;
  }

  /**
   * Fiyat satırı oluşturur. Aynı rota + araç tipi + yön üçlüsü için zaten bir
   * satır varsa onu günceller; böylece aynı transfer için iki farklı geçerli
   * fiyat oluşamaz.
   */
  async upsertPrice(data: InsertTransferPrice): Promise<TransferPrice> {
    const [existing] = await db
      .select()
      .from(transferPrices)
      .where(
        and(
          eq(transferPrices.routeId, data.routeId),
          eq(transferPrices.vehicleTypeId, data.vehicleTypeId),
          eq(transferPrices.isOneWay, data.isOneWay ?? true),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(transferPrices)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(transferPrices.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db.insert(transferPrices).values(data).returning();
    return created;
  }

  async updatePrice(
    id: number,
    data: Partial<InsertTransferPrice>,
  ): Promise<TransferPrice | undefined> {
    const [updated] = await db
      .update(transferPrices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transferPrices.id, id))
      .returning();

    return updated;
  }

  async deletePrice(id: number): Promise<TransferPrice | undefined> {
    const [deleted] = await db
      .delete(transferPrices)
      .where(eq(transferPrices.id, id))
      .returning();

    return deleted;
  }

  // =================================================================
  // Fiyat teklifi (tek doğruluk kaynağı)
  // =================================================================

  /**
   * Bir transferin fiyatını hesaplar ve kapasite kurallarını doğrular.
   * Rezervasyon oluşturma da bu metodu kullanır; istemciden gelen tutar
   * hiçbir yerde dikkate alınmaz.
   */
  async quote(request: QuoteRequest): Promise<Quote> {
    const { routeId, vehicleTypeId, isOneWay, passengerCount } = request;
    const luggageCount = request.luggageCount ?? null;

    if (!Number.isInteger(passengerCount) || passengerCount < 1) {
      throw new TransferValidationError('Yolcu sayısı en az 1 olmalıdır');
    }

    if (luggageCount !== null && (!Number.isInteger(luggageCount) || luggageCount < 0)) {
      throw new TransferValidationError('Bagaj sayısı negatif olamaz');
    }

    const route = await this.getRoute(routeId);
    if (!route || !route.isActive) {
      throw new TransferValidationError('Transfer rotası bulunamadı veya aktif değil');
    }

    const vehicleType = await this.getVehicleType(vehicleTypeId);
    if (!vehicleType || !vehicleType.isActive) {
      throw new TransferValidationError('Araç tipi bulunamadı veya aktif değil');
    }

    if (passengerCount > vehicleType.maxPassengers) {
      throw new TransferValidationError(
        `${vehicleType.name} en fazla ${vehicleType.maxPassengers} yolcu taşır; ${passengerCount} yolcu için daha büyük bir araç seçin`,
      );
    }

    if (
      luggageCount !== null &&
      vehicleType.maxLuggage !== null &&
      luggageCount > vehicleType.maxLuggage
    ) {
      throw new TransferValidationError(
        `${vehicleType.name} en fazla ${vehicleType.maxLuggage} parça bagaj alır`,
      );
    }

    // Önce istenen yön için tanımlı fiyatı ara
    const [directPrice] = await db
      .select()
      .from(transferPrices)
      .where(
        and(
          eq(transferPrices.routeId, routeId),
          eq(transferPrices.vehicleTypeId, vehicleTypeId),
          eq(transferPrices.isOneWay, isOneWay),
          eq(transferPrices.isActive, true),
        ),
      )
      .limit(1);

    if (directPrice) {
      const amount = Number(directPrice.price);
      return {
        route,
        vehicleType,
        isOneWay,
        passengerCount,
        luggageCount,
        unitPrice: isOneWay ? amount : amount / 2,
        totalPrice: amount,
        currencyCode: directPrice.currencyCode,
        derivedFromOneWay: false,
      };
    }

    // Gidiş-dönüş fiyatı tanımlı değilse tek yönün iki katı uygulanır
    if (!isOneWay) {
      const [oneWayPrice] = await db
        .select()
        .from(transferPrices)
        .where(
          and(
            eq(transferPrices.routeId, routeId),
            eq(transferPrices.vehicleTypeId, vehicleTypeId),
            eq(transferPrices.isOneWay, true),
            eq(transferPrices.isActive, true),
          ),
        )
        .limit(1);

      if (oneWayPrice) {
        const unitPrice = Number(oneWayPrice.price);
        return {
          route,
          vehicleType,
          isOneWay,
          passengerCount,
          luggageCount,
          unitPrice,
          totalPrice: unitPrice * 2,
          currencyCode: oneWayPrice.currencyCode,
          derivedFromOneWay: true,
        };
      }
    }

    throw new TransferValidationError(
      'Bu rota ve araç tipi için tanımlı bir fiyat yok',
    );
  }

  // =================================================================
  // Rezervasyonlar
  // =================================================================

  /**
   * Rezervasyon oluşturur. Fiyat quote() ile sunucuda hesaplanır; PNR ve
   * rezervasyon referansı benzersizlik çakışmasına karşı yeniden denenir.
   */
  async createBooking(input: CreateBookingInput): Promise<TransferBooking> {
    const quote = await this.quote(input);

    const pickupAt = this.parseDateTime(input.pickupDate, input.pickupTime);
    if (!pickupAt) {
      throw new TransferValidationError('Geçersiz alış tarihi veya saati');
    }

    if (pickupAt.getTime() < Date.now()) {
      throw new TransferValidationError('Alış zamanı geçmişte olamaz');
    }

    if (!input.isOneWay) {
      if (!input.returnDate || !input.returnTime) {
        throw new TransferValidationError(
          'Gidiş-dönüş transferlerinde dönüş tarihi ve saati zorunludur',
        );
      }

      const returnAt = this.parseDateTime(input.returnDate, input.returnTime);
      if (!returnAt) {
        throw new TransferValidationError('Geçersiz dönüş tarihi veya saati');
      }

      if (returnAt.getTime() <= pickupAt.getTime()) {
        throw new TransferValidationError('Dönüş zamanı alış zamanından sonra olmalıdır');
      }
    }

    if (!input.contactName?.trim()) {
      throw new TransferValidationError('İletişim adı zorunludur');
    }

    if (!input.contactPhone?.trim()) {
      throw new TransferValidationError('İletişim telefonu zorunludur');
    }

    let lastError: unknown;

    for (let attempt = 0; attempt < UNIQUE_RETRY_LIMIT; attempt++) {
      try {
        const [created] = await db
          .insert(transferBookings)
          .values({
            userId: input.userId ?? null,
            agencyId: input.agencyId ?? null,
            routeId: input.routeId,
            vehicleTypeId: input.vehicleTypeId,
            bookingReference: generateBookingReference('TRF'),
            pnrNumber: generatePNR(),
            isOneWay: input.isOneWay,
            pickupDate: input.pickupDate,
            pickupTime: input.pickupTime,
            returnDate: input.isOneWay ? null : input.returnDate ?? null,
            returnTime: input.isOneWay ? null : input.returnTime ?? null,
            passengerCount: quote.passengerCount,
            luggageCount: quote.luggageCount,
            flightNumber: input.flightNumber ?? null,
            pickupDetails: input.pickupDetails ?? null,
            dropoffDetails: input.dropoffDetails ?? null,
            contactName: input.contactName.trim(),
            contactPhone: input.contactPhone.trim(),
            contactEmail: input.contactEmail ?? null,
            // Fiyat yalnızca sunucuda hesaplanır
            totalPrice: quote.totalPrice.toFixed(2),
            currencyCode: quote.currencyCode,
            paymentStatus: 'pending',
            paymentMethod: input.paymentMethod ?? null,
            status: 'pending',
            specialRequests: input.specialRequests ?? null,
          })
          .returning();

        return created;
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    console.error('Transfer rezervasyonu için benzersiz referans üretilemedi:', lastError);
    throw new Error('Rezervasyon referansı üretilemedi, lütfen tekrar deneyin');
  }

  async getBooking(id: number): Promise<TransferBooking | undefined> {
    const [booking] = await db
      .select()
      .from(transferBookings)
      .where(eq(transferBookings.id, id))
      .limit(1);

    return booking;
  }

  /**
   * PNR sorgusu. PNR tek başına yeterli değildir; iletişim soyadı/telefonun son
   * dört hanesi gibi ikinci bir doğrulama istenir, aksi halde PNR denemesiyle
   * başkasının rezervasyonu okunabilirdi.
   */
  async findBookingByPnr(pnr: string, verification: string): Promise<TransferBooking | undefined> {
    const normalizedPnr = pnr.trim().toUpperCase();
    const normalizedVerification = verification.trim().toLowerCase();

    if (!normalizedPnr || !normalizedVerification) {
      throw new TransferValidationError('PNR ve doğrulama bilgisi zorunludur');
    }

    const [booking] = await db
      .select()
      .from(transferBookings)
      .where(eq(transferBookings.pnrNumber, normalizedPnr))
      .limit(1);

    if (!booking) {
      return undefined;
    }

    const surnameMatches = booking.contactName
      .toLowerCase()
      .split(/\s+/)
      .includes(normalizedVerification);

    // Rakam dışı karakterler atıldıktan sonra elde kalan hane dizisi. Bu kontrol
    // ayrı yapılmazsa harflerden oluşan bir doğrulama değeri boş dizeye iner ve
    // endsWith('') her zaman true döndüğü için her PNR eşleşirdi.
    const verificationDigits = normalizedVerification.replace(/\D/g, '');
    const phoneMatches =
      verificationDigits.length >= 4 &&
      booking.contactPhone.replace(/\D/g, '').endsWith(verificationDigits);

    return surnameMatches || phoneMatches ? booking : undefined;
  }

  async getBookingsByUser(userId: number): Promise<TransferBooking[]> {
    return db
      .select()
      .from(transferBookings)
      .where(eq(transferBookings.userId, userId))
      .orderBy(desc(transferBookings.pickupDate), desc(transferBookings.id));
  }

  /** Yönetim listesi: filtreler tek where() içinde birleşir, toplam da aynı filtrelerle sayılır. */
  async listBookings(filters: BookingListFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(transferBookings.status, filters.status));
    }
    if (filters.paymentStatus) {
      conditions.push(eq(transferBookings.paymentStatus, filters.paymentStatus));
    }
    if (filters.routeId !== undefined) {
      conditions.push(eq(transferBookings.routeId, filters.routeId));
    }
    if (filters.userId !== undefined) {
      conditions.push(eq(transferBookings.userId, filters.userId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(transferBookings.pickupDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(transferBookings.pickupDate, filters.dateTo));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      const match = or(
        ilike(transferBookings.bookingReference, term),
        ilike(transferBookings.pnrNumber, term),
        ilike(transferBookings.contactName, term),
        ilike(transferBookings.contactPhone, term),
      );
      if (match) {
        conditions.push(match);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({ booking: transferBookings, route: transferRoutes, vehicleType: transferVehicleTypes })
      .from(transferBookings)
      .leftJoin(transferRoutes, eq(transferBookings.routeId, transferRoutes.id))
      .leftJoin(
        transferVehicleTypes,
        eq(transferBookings.vehicleTypeId, transferVehicleTypes.id),
      )
      .where(whereClause)
      .orderBy(desc(transferBookings.pickupDate), desc(transferBookings.id))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(transferBookings)
      .where(whereClause);

    const total = totalResult?.count ?? 0;

    return {
      bookings: rows.map((row) => ({
        ...row.booking,
        route: row.route,
        vehicleType: row.vehicleType,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateBookingStatus(
    id: number,
    status: string,
  ): Promise<TransferBooking | undefined> {
    if (!BOOKING_STATUSES.includes(status as TransferBookingStatus)) {
      throw new TransferValidationError(
        `Geçersiz durum. Beklenen değerler: ${BOOKING_STATUSES.join(', ')}`,
      );
    }

    const [updated] = await db
      .update(transferBookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(transferBookings.id, id))
      .returning();

    return updated;
  }

  async updatePaymentStatus(
    id: number,
    paymentStatus: string,
    transactionId?: string | null,
  ): Promise<TransferBooking | undefined> {
    if (!PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])) {
      throw new TransferValidationError(
        `Geçersiz ödeme durumu. Beklenen değerler: ${PAYMENT_STATUSES.join(', ')}`,
      );
    }

    const [updated] = await db
      .update(transferBookings)
      .set({
        paymentStatus,
        ...(transactionId !== undefined ? { transactionId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(transferBookings.id, id))
      .returning();

    return updated;
  }

  /** Sürücü/araç ataması. Rezervasyon 'assigned' durumuna geçer. */
  async assignDriver(
    id: number,
    driverDetails: Record<string, unknown>,
  ): Promise<TransferBooking | undefined> {
    const [updated] = await db
      .update(transferBookings)
      .set({ driverDetails, status: 'assigned', updatedAt: new Date() })
      .where(eq(transferBookings.id, id))
      .returning();

    return updated;
  }

  async cancelBooking(id: number): Promise<TransferBooking | undefined> {
    const booking = await this.getBooking(id);

    if (!booking) {
      return undefined;
    }

    if (booking.status === 'cancelled') {
      return booking;
    }

    if (booking.status === 'completed') {
      throw new TransferValidationError('Tamamlanmış bir transfer iptal edilemez');
    }

    const [updated] = await db
      .update(transferBookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(transferBookings.id, id))
      .returning();

    return updated;
  }

  // =================================================================
  // Yardımcılar
  // =================================================================

  /** 'YYYY-MM-DD' + 'HH:MM[:SS]' -> Date; geçersizse null. */
  private parseDateTime(date: string, time: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      return null;
    }

    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    const parsed = new Date(`${date}T${normalizedTime}`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /** PostgreSQL benzersizlik ihlali (23505). */
  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}

export const transferService = new TransferService();
export default transferService;
