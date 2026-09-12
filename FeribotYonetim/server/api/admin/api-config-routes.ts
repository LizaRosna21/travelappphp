import express from 'express';
import { isAdmin, isAuthenticated } from '../../auth';
import {
  getAllApiConfigs,
  getApiConfigById,
  createApiConfig,
  updateApiConfig,
  updateApiStatus,
  deleteApiConfig,
  testApiConnection
} from './api-config-controller';

const router = express.Router();

// Tüm API yapılandırmalarını getir
router.get('/api/admin/api-configs', isAuthenticated, isAdmin, getAllApiConfigs);

// Belirli bir API yapılandırmasını getir
router.get('/api/admin/api-configs/:id', isAuthenticated, isAdmin, getApiConfigById);

// Yeni API yapılandırması oluştur
router.post('/api/admin/api-configs', isAuthenticated, isAdmin, createApiConfig);

// API yapılandırmasını güncelle
router.put('/api/admin/api-configs/:id', isAuthenticated, isAdmin, updateApiConfig);

// API durumunu değiştir
router.patch('/api/admin/api-configs/:id/status', isAuthenticated, isAdmin, updateApiStatus);

// API yapılandırmasını sil
router.delete('/api/admin/api-configs/:id', isAuthenticated, isAdmin, deleteApiConfig);

// API bağlantısını test et
router.post('/api/admin/api-configs/:id/test', isAuthenticated, isAdmin, testApiConnection);

export default router;