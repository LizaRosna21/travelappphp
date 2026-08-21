import { Agency, AgencyCommissionTier, AgencyBooking, AgencyPayment, User } from "@shared/schema";
import { storage } from "../storage";
import { hashPassword } from "../auth";

class B2BService {
  // Acenta işlemleri
  async getAllAgencies(): Promise<Agency[]> {
    try {
      return await storage.getAllAgencies();
    } catch (error) {
      console.error("Error fetching agencies:", error);
      throw new Error("Acentalar getirilirken bir hata oluştu");
    }
  }

  async getAgencyById(id: number): Promise<Agency | undefined> {
    try {
      return await storage.getAgencyById(id);
    } catch (error) {
      console.error(`Error fetching agency with ID ${id}:`, error);
      throw new Error("Acenta bilgisi getirilirken bir hata oluştu");
    }
  }

  async createAgency(
    agencyData: Omit<Agency, "id" | "createdAt" | "updatedAt" | "currentBalance">,
    userData: { username: string; email: string; password: string; fullName?: string; phoneNumber?: string }
  ): Promise<{ agency: Agency; user: User }> {
    try {
      // Kullanıcı adının benzersiz olduğundan emin olun
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        throw new Error("Bu kullanıcı adı zaten kullanılıyor");
      }

      // Acenta oluştur
      const agency = await storage.createAgency({
        ...agencyData,
        currentBalance: "0",
      });

      // Acenta yöneticisi kullanıcısını oluştur
      const user = await storage.createUser({
        username: userData.username,
        email: userData.email,
        password: await hashPassword(userData.password),
        fullName: userData.fullName || null,
        phoneNumber: userData.phoneNumber || null,
        role: "agency_admin",
        isActive: true,
        parentAgencyId: agency.id,
      });

      return { agency, user };
    } catch (error) {
      console.error("Error creating agency:", error);
      if ((error as Error).message === "Bu kullanıcı adı zaten kullanılıyor") {
        throw error;
      }
      throw new Error("Acenta oluşturulurken bir hata oluştu");
    }
  }

  async updateAgency(id: number, data: Partial<Agency>): Promise<Agency> {
    try {
      return await storage.updateAgency(id, data);
    } catch (error) {
      console.error(`Error updating agency with ID ${id}:`, error);
      throw new Error("Acenta güncellenirken bir hata oluştu");
    }
  }

  async deleteAgency(id: number): Promise<void> {
    try {
      // Önce bağlı alt acentaları kontrol et
      const subAgencies = await storage.getSubAgencies(id);
      if (subAgencies.length > 0) {
        throw new Error("Bu acentaya bağlı alt acentalar var. Önce alt acentaları silmelisiniz.");
      }

      // Diğer ilişkili verileri de temizle
      const agency = await storage.getAgencyById(id);
      if (agency) {
        // İlişkili komisyon kademelerini sil
        const commissionTiers = await storage.getAgencyCommissionTiers(id);
        for (const tier of commissionTiers) {
          await storage.deleteAgencyCommissionTier(tier.id);
        }

        // İlişkili kullanıcıları pasif yap (silme!)
        const users = await storage.getUsersByAgencyId(id);
        for (const user of users) {
          await storage.updateUser(user.id, { isActive: false });
        }

        // Son olarak acentayı sil
        await storage.deleteAgency(id);
      } else {
        throw new Error("Silinecek acenta bulunamadı");
      }
    } catch (error) {
      console.error(`Error deleting agency with ID ${id}:`, error);
      if ((error as Error).message === "Bu acentaya bağlı alt acentalar var. Önce alt acentaları silmelisiniz.") {
        throw error;
      }
      throw new Error("Acenta silinirken bir hata oluştu");
    }
  }

  // Alt acenta işlemleri
  async getSubAgencies(agencyId: number): Promise<Agency[]> {
    try {
      return await storage.getSubAgencies(agencyId);
    } catch (error) {
      console.error(`Error fetching sub-agencies for agency ID ${agencyId}:`, error);
      throw new Error("Alt acentalar getirilirken bir hata oluştu");
    }
  }

  async createSubAgency(
    parentAgencyId: number,
    agencyData: Omit<Agency, "id" | "createdAt" | "updatedAt" | "currentBalance">,
    userData: { username: string; email: string; password: string; fullName?: string; phoneNumber?: string }
  ): Promise<{ agency: Agency; user: User }> {
    try {
      // Ana acentanın mevcut olduğunu kontrol et
      const parentAgency = await storage.getAgencyById(parentAgencyId);
      if (!parentAgency) {
        throw new Error("Ana acenta bulunamadı");
      }

      // Kullanıcı adının benzersiz olduğundan emin olun
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        throw new Error("Bu kullanıcı adı zaten kullanılıyor");
      }

      // Alt acenta tipini ayarla
      const subAgencyData = {
        ...agencyData,
        type: "sub_agency",
        parentAgencyId: parentAgencyId,
        currentBalance: "0",
      };

      // Alt acenta oluştur
      const agency = await storage.createAgency(subAgencyData);

      // Alt acenta yöneticisi kullanıcısını oluştur
      const user = await storage.createUser({
        username: userData.username,
        email: userData.email,
        password: await hashPassword(userData.password),
        fullName: userData.fullName || null,
        phoneNumber: userData.phoneNumber || null,
        role: "agency_user",
        isActive: true,
        parentAgencyId: agency.id,
      });

      return { agency, user };
    } catch (error) {
      console.error("Error creating sub-agency:", error);
      if (
        (error as Error).message === "Bu kullanıcı adı zaten kullanılıyor" ||
        (error as Error).message === "Ana acenta bulunamadı"
      ) {
        throw error;
      }
      throw new Error("Alt acenta oluşturulurken bir hata oluştu");
    }
  }

  // Komisyon yönetimi
  async getAgencyCommissionTiers(agencyId: number): Promise<AgencyCommissionTier[]> {
    try {
      return await storage.getAgencyCommissionTiers(agencyId);
    } catch (error) {
      console.error(`Error fetching commission tiers for agency ID ${agencyId}:`, error);
      throw new Error("Komisyon kademeleri getirilirken bir hata oluştu");
    }
  }

  async createAgencyCommissionTier(
    agencyId: number,
    data: Omit<AgencyCommissionTier, "id" | "createdAt" | "updatedAt">
  ): Promise<AgencyCommissionTier> {
    try {
      // Acenta kontrol
      const agency = await storage.getAgencyById(agencyId);
      if (!agency) {
        throw new Error("Acenta bulunamadı");
      }

      return await storage.createAgencyCommissionTier({
        ...data,
        agencyId,
      });
    } catch (error) {
      console.error(`Error creating commission tier for agency ID ${agencyId}:`, error);
      if ((error as Error).message === "Acenta bulunamadı") {
        throw error;
      }
      throw new Error("Komisyon kademesi oluşturulurken bir hata oluştu");
    }
  }

  async updateAgencyCommissionTier(id: number, data: Partial<AgencyCommissionTier>): Promise<AgencyCommissionTier> {
    try {
      return await storage.updateAgencyCommissionTier(id, data);
    } catch (error) {
      console.error(`Error updating commission tier with ID ${id}:`, error);
      throw new Error("Komisyon kademesi güncellenirken bir hata oluştu");
    }
  }

  async deleteAgencyCommissionTier(id: number): Promise<void> {
    try {
      await storage.deleteAgencyCommissionTier(id);
    } catch (error) {
      console.error(`Error deleting commission tier with ID ${id}:`, error);
      throw new Error("Komisyon kademesi silinirken bir hata oluştu");
    }
  }

  // Acenta rezervasyonları
  async getAgencyBookings(agencyId: number): Promise<AgencyBooking[]> {
    try {
      return await storage.getAgencyBookings(agencyId);
    } catch (error) {
      console.error(`Error fetching bookings for agency ID ${agencyId}:`, error);
      throw new Error("Acenta rezervasyonları getirilirken bir hata oluştu");
    }
  }

  async getAgencyBookingById(id: number): Promise<AgencyBooking | undefined> {
    try {
      return await storage.getAgencyBookingById(id);
    } catch (error) {
      console.error(`Error fetching booking with ID ${id}:`, error);
      throw new Error("Rezervasyon detayı getirilirken bir hata oluştu");
    }
  }

  // Acenta ödemeleri
  async getAgencyPayments(agencyId: number): Promise<AgencyPayment[]> {
    try {
      return await storage.getAgencyPayments(agencyId);
    } catch (error) {
      console.error(`Error fetching payments for agency ID ${agencyId}:`, error);
      throw new Error("Acenta ödemeleri getirilirken bir hata oluştu");
    }
  }

  async getAgencyPaymentById(id: number): Promise<AgencyPayment | undefined> {
    try {
      return await storage.getAgencyPaymentById(id);
    } catch (error) {
      console.error(`Error fetching payment with ID ${id}:`, error);
      throw new Error("Ödeme detayı getirilirken bir hata oluştu");
    }
  }

  async createAgencyPayment(
    agencyId: number,
    data: Omit<AgencyPayment, "id" | "createdAt" | "updatedAt">,
    createdBy: number
  ): Promise<AgencyPayment> {
    try {
      // Acenta kontrol
      const agency = await storage.getAgencyById(agencyId);
      if (!agency) {
        throw new Error("Acenta bulunamadı");
      }

      // Ödeme oluştur
      const payment = await storage.createAgencyPayment({
        ...data,
        agencyId,
        createdBy,
      });

      // Acenta bakiyesini güncelle
      let newBalance = parseFloat(agency.currentBalance || "0");
      if (data.paymentMethod === "deposit") {
        // Para yatırma işlemi
        newBalance += parseFloat(data.amount);
      } else if (data.paymentMethod === "withdrawal") {
        // Para çekme işlemi
        newBalance -= parseFloat(data.amount);
      }

      await storage.updateAgency(agencyId, {
        currentBalance: newBalance.toString(),
      });

      return payment;
    } catch (error) {
      console.error(`Error creating payment for agency ID ${agencyId}:`, error);
      if ((error as Error).message === "Acenta bulunamadı") {
        throw error;
      }
      throw new Error("Ödeme oluşturulurken bir hata oluştu");
    }
  }

  async updateAgencyPayment(id: number, data: Partial<AgencyPayment>): Promise<AgencyPayment> {
    try {
      // Eski ödemeyi al
      const oldPayment = await storage.getAgencyPaymentById(id);
      if (!oldPayment) {
        throw new Error("Ödeme bulunamadı");
      }

      // Ödemeyi güncelle
      const updatedPayment = await storage.updateAgencyPayment(id, data);

      // Eğer miktar değiştiyse acenta bakiyesini de güncelle
      if (data.amount && data.amount !== oldPayment.amount) {
        const agency = await storage.getAgencyById(oldPayment.agencyId);
        if (agency) {
          let newBalance = parseFloat(agency.currentBalance || "0");
          
          // Eski miktarı çıkar
          if (oldPayment.paymentMethod === "deposit") {
            newBalance -= parseFloat(oldPayment.amount);
          } else if (oldPayment.paymentMethod === "withdrawal") {
            newBalance += parseFloat(oldPayment.amount);
          }
          
          // Yeni miktarı ekle
          if (oldPayment.paymentMethod === "deposit") {
            newBalance += parseFloat(data.amount);
          } else if (oldPayment.paymentMethod === "withdrawal") {
            newBalance -= parseFloat(data.amount);
          }

          await storage.updateAgency(oldPayment.agencyId, {
            currentBalance: newBalance.toString(),
          });
        }
      }

      return updatedPayment;
    } catch (error) {
      console.error(`Error updating payment with ID ${id}:`, error);
      if ((error as Error).message === "Ödeme bulunamadı") {
        throw error;
      }
      throw new Error("Ödeme güncellenirken bir hata oluştu");
    }
  }

  // Acenta kullanıcıları
  async getUsersByAgencyId(agencyId: number): Promise<User[]> {
    try {
      return await storage.getUsersByAgencyId(agencyId);
    } catch (error) {
      console.error(`Error fetching users for agency ID ${agencyId}:`, error);
      throw new Error("Acenta kullanıcıları getirilirken bir hata oluştu");
    }
  }

  async createAgencyUser(
    agencyId: number,
    userData: { username: string; email: string; password: string; fullName?: string; phoneNumber?: string; role?: string }
  ): Promise<User> {
    try {
      // Acenta kontrol
      const agency = await storage.getAgencyById(agencyId);
      if (!agency) {
        throw new Error("Acenta bulunamadı");
      }

      // Kullanıcı adının benzersiz olduğundan emin olun
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        throw new Error("Bu kullanıcı adı zaten kullanılıyor");
      }

      // Kullanıcı oluştur
      return await storage.createUser({
        username: userData.username,
        email: userData.email,
        password: await hashPassword(userData.password),
        fullName: userData.fullName || null,
        phoneNumber: userData.phoneNumber || null,
        role: userData.role || "agency_user",
        isActive: true,
        parentAgencyId: agencyId,
      });
    } catch (error) {
      console.error(`Error creating user for agency ID ${agencyId}:`, error);
      if (
        (error as Error).message === "Bu kullanıcı adı zaten kullanılıyor" ||
        (error as Error).message === "Acenta bulunamadı"
      ) {
        throw error;
      }
      throw new Error("Kullanıcı oluşturulurken bir hata oluştu");
    }
  }

  // Acenta özet bilgisi
  async getAgencySummary(agencyId: number): Promise<{
    totalBookings: number;
    monthlyBookings: number;
    totalSales: string;
    totalCommission: string;
    currentBalance: string;
  }> {
    try {
      // Acenta bilgisi
      const agency = await storage.getAgencyById(agencyId);
      if (!agency) {
        throw new Error("Acenta bulunamadı");
      }

      // Rezervasyonlar
      const bookings = await storage.getAgencyBookings(agencyId);
      
      // Son 30 gün içindeki rezervasyonlar
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthlyBookings = bookings.filter(booking => 
        new Date(booking.createdAt) >= thirtyDaysAgo && 
        new Date(booking.createdAt) <= now
      );

      // Toplam satış ve komisyon hesaplama
      let totalSales = 0;
      let totalCommission = 0;
      
      bookings.forEach(booking => {
        if (booking.status !== 'cancelled') {
          totalSales += parseFloat(booking.originalAmount || '0');
          totalCommission += parseFloat(booking.commissionAmount || '0');
        }
      });

      return {
        totalBookings: bookings.length,
        monthlyBookings: monthlyBookings.length,
        totalSales: totalSales.toFixed(2),
        totalCommission: totalCommission.toFixed(2),
        currentBalance: agency.currentBalance || '0',
      };
    } catch (error) {
      console.error(`Error getting summary for agency ID ${agencyId}:`, error);
      if ((error as Error).message === "Acenta bulunamadı") {
        throw error;
      }
      throw new Error("Acenta özeti getirilirken bir hata oluştu");
    }
  }
}

export const b2bService = new B2BService();