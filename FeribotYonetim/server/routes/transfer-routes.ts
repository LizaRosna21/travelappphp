/**
 * Transfer modülü API uçları.
 *
 * Herkese açık uçlar /api/transfers/* altında, yönetim uçları
 * /api/admin/transfers/* altında toplanır. Yönetim uçları hem setupAuth()
 * içindeki /api/admin/* ara katmanı hem de buradaki isAdmin ile korunur.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { isAdmin, isAuthenticated, checkIsAdmin } from '../auth';
import {
  insertTransferPriceSchema,
  insertTransferRouteSchema,
  insertTransferVehicleTypeSchema,
} from '@shared/schema';
import {
  isTransferValidationError,
  transferService,
} from '../services/transfer-service';

export const transferRouter = Router();
export const transferAdminRouter = Router();

// ---------------------------------------------------------------------------
// Ortak yardımcılar
// ---------------------------------------------------------------------------

/** Servis ve doğrulama hatalarını tek bir yerde HTTP durumuna çevirir. */
function handleError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Geçersiz veri', errors: error.errors });
  }

  if (isTransferValidationError(error)) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ message: fallbackMessage });
}

/** ':id' parametresini pozitif tam sayı olarak çözer. */
function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const quoteSchema = z.object({
  routeId: z.number().int().positive(),
  vehicleTypeId: z.number().int().positive(),
  isOneWay: z.boolean().default(true),
  passengerCount: z.number().int().min(1),
  luggageCount: z.number().int().min(0).nullable().optional(),
});

const bookingSchema = quoteSchema.extend({
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD biçiminde olmalı'),
  pickupTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Saat HH:MM biçiminde olmalı'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  returnTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  flightNumber: z.string().max(20).nullable().optional(),
  pickupDetails: z.string().max(1000).nullable().optional(),
  dropoffDetails: z.string().max(1000).nullable().optional(),
  contactName: z.string().min(1).max(200),
  contactPhone: z.string().min(1).max(40),
  contactEmail: z.string().email().nullable().optional(),
  specialRequests: z.string().max(1000).nullable().optional(),
  paymentMethod: z.string().max(50).nullable().optional(),
});

const lookupSchema = z.object({
  pnr: z.string().min(1).max(20),
  // Soyad ya da telefonun son hanelerinden biri
  verification: z.string().min(2).max(100),
});

// ---------------------------------------------------------------------------
// Herkese açık uçlar
// ---------------------------------------------------------------------------

transferRouter.get('/vehicle-types', async (_req: Request, res: Response) => {
  try {
    res.json(await transferService.getVehicleTypes());
  } catch (error) {
    handleError(res, error, 'Araç tipleri getirilemedi');
  }
});

transferRouter.get('/routes', async (req: Request, res: Response) => {
  try {
    const routes = await transferService.getRoutes({
      popularOnly: req.query.popular === 'true',
      search: typeof req.query.q === 'string' && req.query.q ? req.query.q : undefined,
    });

    res.json(routes);
  } catch (error) {
    handleError(res, error, 'Transfer rotaları getirilemedi');
  }
});

transferRouter.get('/routes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rota numarası' });
    }

    const result = await transferService.getRouteWithPricing(id);
    if (!result || !result.route.isActive) {
      return res.status(404).json({ message: 'Transfer rotası bulunamadı' });
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, 'Transfer rotası getirilemedi');
  }
});

/** Fiyat teklifi. Rezervasyon öncesi gösterilen tutar buradan gelir. */
transferRouter.post('/quote', async (req: Request, res: Response) => {
  try {
    const payload = quoteSchema.parse(req.body);
    res.json(await transferService.quote(payload));
  } catch (error) {
    handleError(res, error, 'Fiyat hesaplanamadı');
  }
});

transferRouter.post('/bookings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const payload = bookingSchema.parse(req.body);

    const booking = await transferService.createBooking({
      ...payload,
      userId: req.user!.id,
    });

    res.status(201).json(booking);
  } catch (error) {
    handleError(res, error, 'Transfer rezervasyonu oluşturulamadı');
  }
});

/** Kullanıcının kendi transferleri. ':id' ucundan ÖNCE tanımlı olmalı. */
transferRouter.get('/bookings/mine', isAuthenticated, async (req: Request, res: Response) => {
  try {
    res.json(await transferService.getBookingsByUser(req.user!.id));
  } catch (error) {
    handleError(res, error, 'Transfer rezervasyonları getirilemedi');
  }
});

transferRouter.get('/bookings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rezervasyon numarası' });
    }

    const requestUserId = req.user!.id;
    const booking = await transferService.getBooking(id);

    if (!booking) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    if (booking.userId !== requestUserId && !checkIsAdmin(req)) {
      return res.status(403).json({ message: 'Bu rezervasyona erişim yetkiniz yok' });
    }

    res.json(booking);
  } catch (error) {
    handleError(res, error, 'Rezervasyon getirilemedi');
  }
});

transferRouter.post(
  '/bookings/:id/cancel',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: 'Geçersiz rezervasyon numarası' });
      }

      const requestUserId = req.user!.id;
      const booking = await transferService.getBooking(id);

      if (!booking) {
        return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
      }

      if (booking.userId !== requestUserId && !checkIsAdmin(req)) {
        return res.status(403).json({ message: 'Bu rezervasyona erişim yetkiniz yok' });
      }

      res.json(await transferService.cancelBooking(id));
    } catch (error) {
      handleError(res, error, 'Rezervasyon iptal edilemedi');
    }
  },
);

/**
 * PNR sorgusu. Üyelik gerektirmez; bu yüzden PNR tek başına yeterli değildir,
 * soyad veya telefonun son haneleriyle doğrulama istenir.
 */
transferRouter.post('/lookup', async (req: Request, res: Response) => {
  try {
    const { pnr, verification } = lookupSchema.parse(req.body);
    const booking = await transferService.findBookingByPnr(pnr, verification);

    if (!booking) {
      // Bulunamadı ve doğrulama hatası aynı yanıtı verir; aksi halde geçerli
      // PNR'lar deneme yanılmayla tespit edilebilirdi.
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    res.json(booking);
  } catch (error) {
    handleError(res, error, 'Rezervasyon sorgulanamadı');
  }
});

// ---------------------------------------------------------------------------
// Yönetim uçları
// ---------------------------------------------------------------------------

transferAdminRouter.use(isAdmin);

// --- Araç tipleri ---

transferAdminRouter.get('/vehicle-types', async (_req: Request, res: Response) => {
  try {
    res.json(await transferService.getVehicleTypes(true));
  } catch (error) {
    handleError(res, error, 'Araç tipleri getirilemedi');
  }
});

transferAdminRouter.post('/vehicle-types', async (req: Request, res: Response) => {
  try {
    const data = insertTransferVehicleTypeSchema.parse(req.body);
    res.status(201).json(await transferService.createVehicleType(data));
  } catch (error) {
    handleError(res, error, 'Araç tipi oluşturulamadı');
  }
});

transferAdminRouter.patch('/vehicle-types/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz araç tipi numarası' });
    }

    const data = insertTransferVehicleTypeSchema.partial().parse(req.body);
    const updated = await transferService.updateVehicleType(id, data);

    if (!updated) {
      return res.status(404).json({ message: 'Araç tipi bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Araç tipi güncellenemedi');
  }
});

/** Fiziksel silme yerine pasife alır; fiyatlar ve rezervasyonlar buna bağlı. */
transferAdminRouter.delete('/vehicle-types/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz araç tipi numarası' });
    }

    const updated = await transferService.deactivateVehicleType(id);
    if (!updated) {
      return res.status(404).json({ message: 'Araç tipi bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Araç tipi pasife alınamadı');
  }
});

// --- Rotalar ---

transferAdminRouter.get('/routes', async (req: Request, res: Response) => {
  try {
    res.json(
      await transferService.getRoutes({
        includeInactive: true,
        search: typeof req.query.q === 'string' && req.query.q ? req.query.q : undefined,
      }),
    );
  } catch (error) {
    handleError(res, error, 'Transfer rotaları getirilemedi');
  }
});

transferAdminRouter.post('/routes', async (req: Request, res: Response) => {
  try {
    const data = insertTransferRouteSchema.parse(req.body);
    res.status(201).json(await transferService.createRoute(data));
  } catch (error) {
    handleError(res, error, 'Transfer rotası oluşturulamadı');
  }
});

transferAdminRouter.patch('/routes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rota numarası' });
    }

    const data = insertTransferRouteSchema.partial().parse(req.body);
    const updated = await transferService.updateRoute(id, data);

    if (!updated) {
      return res.status(404).json({ message: 'Transfer rotası bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Transfer rotası güncellenemedi');
  }
});

transferAdminRouter.delete('/routes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rota numarası' });
    }

    const updated = await transferService.deactivateRoute(id);
    if (!updated) {
      return res.status(404).json({ message: 'Transfer rotası bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Transfer rotası pasife alınamadı');
  }
});

// --- Fiyatlar ---

transferAdminRouter.get('/prices', async (req: Request, res: Response) => {
  try {
    const routeId =
      typeof req.query.routeId === 'string' ? parseId(req.query.routeId) : null;

    res.json(await transferService.getPrices(routeId ?? undefined));
  } catch (error) {
    handleError(res, error, 'Fiyatlar getirilemedi');
  }
});

/** Aynı rota + araç + yön için ikinci bir fiyat oluşmaması adına upsert. */
transferAdminRouter.post('/prices', async (req: Request, res: Response) => {
  try {
    const data = insertTransferPriceSchema.parse(req.body);
    res.status(201).json(await transferService.upsertPrice(data));
  } catch (error) {
    handleError(res, error, 'Fiyat kaydedilemedi');
  }
});

transferAdminRouter.patch('/prices/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz fiyat numarası' });
    }

    const data = insertTransferPriceSchema.partial().parse(req.body);
    const updated = await transferService.updatePrice(id, data);

    if (!updated) {
      return res.status(404).json({ message: 'Fiyat bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Fiyat güncellenemedi');
  }
});

transferAdminRouter.delete('/prices/:id', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz fiyat numarası' });
    }

    const deleted = await transferService.deletePrice(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Fiyat bulunamadı' });
    }

    res.json(deleted);
  } catch (error) {
    handleError(res, error, 'Fiyat silinemedi');
  }
});

// --- Rezervasyonlar ---

transferAdminRouter.get('/bookings', async (req: Request, res: Response) => {
  try {
    const asString = (value: unknown) =>
      typeof value === 'string' && value ? value : undefined;
    const asId = (value: unknown) =>
      typeof value === 'string' && value ? parseId(value) ?? undefined : undefined;

    res.json(
      await transferService.listBookings({
        status: asString(req.query.status),
        paymentStatus: asString(req.query.paymentStatus),
        routeId: asId(req.query.routeId),
        userId: asId(req.query.userId),
        dateFrom: asString(req.query.dateFrom),
        dateTo: asString(req.query.dateTo),
        search: asString(req.query.search),
        page: asId(req.query.page) ?? 1,
        limit: asId(req.query.limit) ?? 20,
      }),
    );
  } catch (error) {
    handleError(res, error, 'Transfer rezervasyonları getirilemedi');
  }
});

transferAdminRouter.patch('/bookings/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rezervasyon numarası' });
    }

    const { status } = z.object({ status: z.string() }).parse(req.body);
    const updated = await transferService.updateBookingStatus(id, status);

    if (!updated) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Rezervasyon durumu güncellenemedi');
  }
});

transferAdminRouter.patch('/bookings/:id/payment', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rezervasyon numarası' });
    }

    const { paymentStatus, transactionId } = z
      .object({
        paymentStatus: z.string(),
        transactionId: z.string().max(200).nullable().optional(),
      })
      .parse(req.body);

    const updated = await transferService.updatePaymentStatus(id, paymentStatus, transactionId);

    if (!updated) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Ödeme durumu güncellenemedi');
  }
});

transferAdminRouter.patch('/bookings/:id/driver', async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: 'Geçersiz rezervasyon numarası' });
    }

    const driverDetails = z
      .object({
        name: z.string().min(1).max(200),
        phone: z.string().min(1).max(40),
        vehiclePlate: z.string().max(20).optional(),
        vehicleModel: z.string().max(100).optional(),
        note: z.string().max(500).optional(),
      })
      .parse(req.body);

    const updated = await transferService.assignDriver(id, driverDetails);

    if (!updated) {
      return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Sürücü ataması yapılamadı');
  }
});

export default transferRouter;
