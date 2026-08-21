import express from 'express';
import { storage } from './storage';
import { seedDemoUsers } from './seed-demo-users';

/**
 * Demo ve member kullanıcıları için örnek veri oluşturmak için API rotaları
 */
export function registerDemoDataRoutes(app: express.Express) {
  /**
   * Demo ve member hesapları için kapsamlı örnek veriler oluşturur
   */
  app.post('/api/admin/populate-demo-data', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Bu işlem için admin yetkisi gereklidir' });
      }

      await seedDemoUsers();
      
      res.status(200).json({ 
        success: true, 
        message: 'Demo ve member hesapları başarıyla oluşturuldu ve örnek verilerle dolduruldu' 
      });
    } catch (error) {
      console.error('Demo veri oluşturma hatası:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Demo veriler oluşturulurken bir hata oluştu',
        error: error.message
      });
    }
  });
}