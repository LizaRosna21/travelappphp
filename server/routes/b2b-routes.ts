import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "../auth";
import { b2bService } from "../services/b2b-service";
import { z } from "zod";
import { insertAgencySchema, insertAgencyCommissionTierSchema, insertAgencyPaymentSchema } from "@shared/schema";

const router = Router();

// Acente listesi getirme (yönetici)
router.get("/agencies", isAdmin, async (_req: Request, res: Response) => {
  try {
    const agencies = await b2bService.getAllAgencies();
    res.json(agencies);
  } catch (error) {
    console.error("Error fetching agencies:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acente detayı getirme (yönetici)
router.get("/agencies/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }

    const agency = await b2bService.getAgencyById(id);
    if (!agency) {
      return res.status(404).json({ message: "Acenta bulunamadı" });
    }

    res.json(agency);
  } catch (error) {
    console.error(`Error fetching agency with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acente oluşturma (yönetici)
router.post("/agencies", isAdmin, async (req: Request, res: Response) => {
  try {
    // Veri validasyonu
    const agencyData = insertAgencySchema.omit({ id: true, createdAt: true, updatedAt: true, currentBalance: true }).safeParse(req.body.agencyData);
    if (!agencyData.success) {
      return res.status(400).json({ message: "Geçersiz acenta bilgileri", errors: agencyData.error.format() });
    }

    const userSchema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().optional(),
      phoneNumber: z.string().optional(),
    });

    const userData = userSchema.safeParse(req.body.userData);
    if (!userData.success) {
      return res.status(400).json({ message: "Geçersiz kullanıcı bilgileri", errors: userData.error.format() });
    }

    const result = await b2bService.createAgency(agencyData.data, userData.data);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating agency:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acente güncelleme (yönetici)
router.put("/agencies/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }

    // Veri validasyonu
    const updateData = insertAgencySchema.partial().safeParse(req.body);
    if (!updateData.success) {
      return res.status(400).json({ message: "Geçersiz güncelleme bilgileri", errors: updateData.error.format() });
    }

    const agency = await b2bService.updateAgency(id, updateData.data);
    res.json(agency);
  } catch (error) {
    console.error(`Error updating agency with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acente silme (yönetici)
router.delete("/agencies/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }

    await b2bService.deleteAgency(id);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting agency with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Alt acenta listesi getirme (yönetici ve acenta yöneticileri)
router.get("/agencies/:id/sub-agencies", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== id) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const subAgencies = await b2bService.getSubAgencies(id);
    res.json(subAgencies);
  } catch (error) {
    console.error(`Error fetching sub-agencies for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Alt acenta oluşturma (yönetici ve acenta yöneticileri)
router.post("/agencies/:id/sub-agencies", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parentAgencyId = parseInt(req.params.id);
    if (isNaN(parentAgencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== parentAgencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    // Veri validasyonu
    const agencyData = insertAgencySchema.omit({ id: true, createdAt: true, updatedAt: true, currentBalance: true, parentAgencyId: true, type: true }).safeParse(req.body.agencyData);
    if (!agencyData.success) {
      return res.status(400).json({ message: "Geçersiz acenta bilgileri", errors: agencyData.error.format() });
    }

    const userSchema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().optional(),
      phoneNumber: z.string().optional(),
    });

    const userData = userSchema.safeParse(req.body.userData);
    if (!userData.success) {
      return res.status(400).json({ message: "Geçersiz kullanıcı bilgileri", errors: userData.error.format() });
    }

    const result = await b2bService.createSubAgency(parentAgencyId, agencyData.data, userData.data);
    res.status(201).json(result);
  } catch (error) {
    console.error(`Error creating sub-agency for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Komisyon kademeleri
router.get("/agencies/:id/commission-tiers", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const commissionTiers = await b2bService.getAgencyCommissionTiers(agencyId);
    res.json(commissionTiers);
  } catch (error) {
    console.error(`Error fetching commission tiers for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.post("/agencies/:id/commission-tiers", isAdmin, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }

    // Veri validasyonu
    const commissionData = insertAgencyCommissionTierSchema.omit({ id: true, createdAt: true, updatedAt: true, agencyId: true }).safeParse(req.body);
    if (!commissionData.success) {
      return res.status(400).json({ message: "Geçersiz komisyon bilgileri", errors: commissionData.error.format() });
    }

    const commissionTier = await b2bService.createAgencyCommissionTier(agencyId, commissionData.data);
    res.status(201).json(commissionTier);
  } catch (error) {
    console.error(`Error creating commission tier for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.put("/commission-tiers/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz komisyon kademesi ID'si" });
    }

    // Veri validasyonu
    const updateData = insertAgencyCommissionTierSchema.partial().safeParse(req.body);
    if (!updateData.success) {
      return res.status(400).json({ message: "Geçersiz güncelleme bilgileri", errors: updateData.error.format() });
    }

    const commissionTier = await b2bService.updateAgencyCommissionTier(id, updateData.data);
    res.json(commissionTier);
  } catch (error) {
    console.error(`Error updating commission tier with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.delete("/commission-tiers/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz komisyon kademesi ID'si" });
    }

    await b2bService.deleteAgencyCommissionTier(id);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting commission tier with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acenta rezervasyonları
router.get("/agencies/:id/bookings", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const bookings = await b2bService.getAgencyBookings(agencyId);
    res.json(bookings);
  } catch (error) {
    console.error(`Error fetching bookings for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.get("/agencies/:agencyId/bookings/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.agencyId);
    const bookingId = parseInt(req.params.id);
    if (isNaN(agencyId) || isNaN(bookingId)) {
      return res.status(400).json({ message: "Geçersiz ID" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const booking = await b2bService.getAgencyBookingById(bookingId);
    if (!booking || booking.agencyId !== agencyId) {
      return res.status(404).json({ message: "Rezervasyon bulunamadı" });
    }
    
    res.json(booking);
  } catch (error) {
    console.error(`Error fetching booking with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acenta ödemeleri
router.get("/agencies/:id/payments", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const payments = await b2bService.getAgencyPayments(agencyId);
    res.json(payments);
  } catch (error) {
    console.error(`Error fetching payments for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.get("/agencies/:agencyId/payments/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.agencyId);
    const paymentId = parseInt(req.params.id);
    if (isNaN(agencyId) || isNaN(paymentId)) {
      return res.status(400).json({ message: "Geçersiz ID" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const payment = await b2bService.getAgencyPaymentById(paymentId);
    if (!payment || payment.agencyId !== agencyId) {
      return res.status(404).json({ message: "Ödeme bulunamadı" });
    }
    
    res.json(payment);
  } catch (error) {
    console.error(`Error fetching payment with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.post("/agencies/:id/payments", isAdmin, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }

    // Veri validasyonu
    const paymentData = insertAgencyPaymentSchema.omit({ id: true, createdAt: true, updatedAt: true, agencyId: true, createdBy: true }).safeParse(req.body);
    if (!paymentData.success) {
      return res.status(400).json({ message: "Geçersiz ödeme bilgileri", errors: paymentData.error.format() });
    }

    const userId = req.user?.id || 0;
    const payment = await b2bService.createAgencyPayment(agencyId, paymentData.data, userId);
    res.status(201).json(payment);
  } catch (error) {
    console.error(`Error creating payment for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.put("/payments/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz ödeme ID'si" });
    }

    // Veri validasyonu
    const updateData = insertAgencyPaymentSchema.partial().safeParse(req.body);
    if (!updateData.success) {
      return res.status(400).json({ message: "Geçersiz güncelleme bilgileri", errors: updateData.error.format() });
    }

    const payment = await b2bService.updateAgencyPayment(id, updateData.data);
    res.json(payment);
  } catch (error) {
    console.error(`Error updating payment with ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acenta özet bilgisi
router.get("/agencies/:id/summary", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const summary = await b2bService.getAgencySummary(agencyId);
    res.json(summary);
  } catch (error) {
    console.error(`Error fetching summary for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// Acenta kullanıcıları
router.get("/agencies/:id/users", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && user?.parentAgencyId !== agencyId) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    const users = await b2bService.getUsersByAgencyId(agencyId);
    res.json(users);
  } catch (error) {
    console.error(`Error fetching users for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

router.post("/agencies/:id/users", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agencyId = parseInt(req.params.id);
    if (isNaN(agencyId)) {
      return res.status(400).json({ message: "Geçersiz acenta ID'si" });
    }
    
    // Yetki kontrolü 
    const user = req.user;
    if (user?.role !== "admin" && (user?.parentAgencyId !== agencyId || user?.role !== "agency_admin")) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }

    // Veri validasyonu
    const userSchema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().optional(),
      phoneNumber: z.string().optional(),
      role: z.string().optional(),
    });

    const userData = userSchema.safeParse(req.body);
    if (!userData.success) {
      return res.status(400).json({ message: "Geçersiz kullanıcı bilgileri", errors: userData.error.format() });
    }

    // Kullanıcı rolünü sınırla (acenta yöneticileri sadece acenta kullanıcısı oluşturabilir)
    if (user?.role !== "admin" && userData.data.role && userData.data.role !== "agency_user") {
      return res.status(403).json({ message: "Sadece 'agency_user' rolüne sahip kullanıcılar oluşturabilirsiniz" });
    }

    const newUser = await b2bService.createAgencyUser(agencyId, userData.data);
    res.status(201).json(newUser);
  } catch (error) {
    console.error(`Error creating user for agency ID ${req.params.id}:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

export default router;