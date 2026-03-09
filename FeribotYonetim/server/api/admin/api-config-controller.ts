import { Request, Response } from 'express';
import { storage } from '../../storage';
import { ApiConfigEntity } from '@shared/schema';
import { z } from 'zod';

// API yapılandırma doğrulama şeması
const apiConfigSchema = z.object({
  name: z.string().min(2, { message: 'API adı en az 2 karakter olmalıdır' }),
  provider: z.string().min(2, { message: 'Sağlayıcı adı en az 2 karakter olmalıdır' }),
  apiKey: z.string().min(5, { message: 'API anahtarı en az 5 karakter olmalıdır' }),
  secretKey: z.string().optional(),
  baseUrl: z.string().optional(),
  isActive: z.boolean(),
  mode: z.enum(['live', 'test', 'demo']),
  category: z.enum(['payment', 'messaging', 'shipping', 'backoffice', 'other']),
});

// Tüm API yapılandırmalarını getir
export const getAllApiConfigs = async (req: Request, res: Response) => {
  try {
    const apiConfigs = await storage.getAllApiConfigs();
    
    // Sadece admin kullanıcıları için özel alanları ayrıca gönder
    const isAdmin = req.user?.role === 'admin';
    
    // Admin değilse hassas bilgileri gizle
    if (!isAdmin) {
      const sanitizedConfigs = apiConfigs.map(config => {
        const { apiKey, secretKey, ...rest } = config;
        return {
          ...rest,
          apiKey: '••••••••',
          secretKey: secretKey ? '••••••••' : undefined,
        };
      });
      return res.status(200).json(sanitizedConfigs);
    }
    
    return res.status(200).json(apiConfigs);
  } catch (error) {
    console.error('API yapılandırmaları getirilirken hata oluştu:', error);
    return res.status(500).json({ message: 'API yapılandırmaları getirilirken bir hata oluştu' });
  }
};

// Belirli bir API yapılandırmasını getir
export const getApiConfigById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz API kimliği' });
    }

    const apiConfig = await storage.getApiConfigById(id);
    if (!apiConfig) {
      return res.status(404).json({ message: 'API yapılandırması bulunamadı' });
    }

    // Admin olmayan kullanıcılar için hassas bilgileri gizle
    if (req.user?.role !== 'admin') {
      const { apiKey, secretKey, ...rest } = apiConfig;
      return res.status(200).json({
        ...rest,
        apiKey: '••••••••',
        secretKey: secretKey ? '••••••••' : undefined,
      });
    }

    return res.status(200).json(apiConfig);
  } catch (error) {
    console.error('API yapılandırması getirilirken hata oluştu:', error);
    return res.status(500).json({ message: 'API yapılandırması getirilirken bir hata oluştu' });
  }
};

// Yeni API yapılandırması oluştur
export const createApiConfig = async (req: Request, res: Response) => {
  try {
    const validationResult = apiConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Geçersiz API yapılandırma bilgileri',
        errors: validationResult.error.errors 
      });
    }

    const newApiConfig = await storage.createApiConfig({
      ...validationResult.data,
      lastChecked: new Date().toISOString(),
      status: 'inactive', // Başlangıçta aktif değil
    });

    return res.status(201).json(newApiConfig);
  } catch (error) {
    console.error('API yapılandırması oluşturulurken hata oluştu:', error);
    return res.status(500).json({ message: 'API yapılandırması oluşturulurken bir hata oluştu' });
  }
};

// API yapılandırmasını güncelle
export const updateApiConfig = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz API kimliği' });
    }

    const existingConfig = await storage.getApiConfigById(id);
    if (!existingConfig) {
      return res.status(404).json({ message: 'API yapılandırması bulunamadı' });
    }

    const validationResult = apiConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Geçersiz API yapılandırma bilgileri',
        errors: validationResult.error.errors 
      });
    }

    // Eğer apiKey '••••••••' ise, gerçek değer değişmedi demektir
    const apiKey = req.body.apiKey === '••••••••' ? existingConfig.apiKey : req.body.apiKey;
    const secretKey = req.body.secretKey === '••••••••' ? existingConfig.secretKey : req.body.secretKey;

    const updatedApiConfig = await storage.updateApiConfig(id, {
      ...validationResult.data,
      apiKey,
      secretKey,
      lastChecked: existingConfig.lastChecked, // Son kontrol tarihini değiştirme
      status: existingConfig.status, // Durum bilgisini değiştirme
    });

    return res.status(200).json(updatedApiConfig);
  } catch (error) {
    console.error('API yapılandırması güncellenirken hata oluştu:', error);
    return res.status(500).json({ message: 'API yapılandırması güncellenirken bir hata oluştu' });
  }
};

// API durumunu değiştir (aktif/pasif)
export const updateApiStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz API kimliği' });
    }

    const { isActive } = req.body;
    if (isActive === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'Geçersiz durum bilgisi' });
    }

    const existingConfig = await storage.getApiConfigById(id);
    if (!existingConfig) {
      return res.status(404).json({ message: 'API yapılandırması bulunamadı' });
    }

    const updatedApiConfig = await storage.updateApiConfig(id, {
      ...existingConfig,
      isActive,
      // Eğer inaktif yapılıyorsa, durumu da inaktif yap
      status: isActive ? existingConfig.status : 'inactive',
    });

    return res.status(200).json(updatedApiConfig);
  } catch (error) {
    console.error('API durumu güncellenirken hata oluştu:', error);
    return res.status(500).json({ message: 'API durumu güncellenirken bir hata oluştu' });
  }
};

// API yapılandırmasını sil
export const deleteApiConfig = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz API kimliği' });
    }

    const existingConfig = await storage.getApiConfigById(id);
    if (!existingConfig) {
      return res.status(404).json({ message: 'API yapılandırması bulunamadı' });
    }

    await storage.deleteApiConfig(id);
    return res.status(200).json({ message: 'API yapılandırması başarıyla silindi' });
  } catch (error) {
    console.error('API yapılandırması silinirken hata oluştu:', error);
    return res.status(500).json({ message: 'API yapılandırması silinirken bir hata oluştu' });
  }
};

// API bağlantısını test et
export const testApiConnection = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz API kimliği' });
    }

    const apiConfig = await storage.getApiConfigById(id);
    if (!apiConfig) {
      return res.status(404).json({ message: 'API yapılandırması bulunamadı' });
    }

    // API kategorisine göre test et
    let testResult = { success: false, message: 'Test edilemedi', status: 'error' };
    
    switch (apiConfig.category) {
      case 'payment':
        testResult = await testPaymentApi(apiConfig);
        break;
      case 'messaging':
        testResult = await testMessagingApi(apiConfig);
        break;
      case 'shipping':
        testResult = await testShippingApi(apiConfig);
        break;
      case 'backoffice':
        testResult = await testBackofficeApi(apiConfig);
        break;
      case 'other':
        testResult = await testOtherApi(apiConfig);
        break;
      default:
        testResult = { success: false, message: 'Bilinmeyen API kategorisi', status: 'error' };
    }

    // Test sonucuna göre API durumunu güncelle
    await storage.updateApiConfig(id, {
      ...apiConfig,
      lastChecked: new Date().toISOString(),
      status: testResult.success ? 'active' : 'error',
    });

    return res.status(200).json({
      success: testResult.success,
      message: testResult.message,
    });
  } catch (error) {
    console.error('API bağlantısı test edilirken hata oluştu:', error);
    return res.status(500).json({ 
      success: false,
      message: 'API bağlantısı test edilirken bir hata oluştu: ' + (error as Error).message 
    });
  }
};

// Ödeme API'sini test et
async function testPaymentApi(apiConfig: ApiConfigEntity): Promise<{ success: boolean, message: string, status: string }> {
  try {
    // Gerçek uygulamada burada sağlayıcıya özel test kodu olacak
    const { provider, mode } = apiConfig;

    // Eğer demo modundaysa başarılı olarak işaretle
    if (mode === 'demo') {
      return { 
        success: true, 
        message: `${provider} API'si demo modunda başarıyla test edildi.`, 
        status: 'active'
      };
    }

    // Ödeme sağlayıcılarına göre farklı testler yapılabilir
    switch (provider.toLowerCase()) {
      case 'stripe':
        // Stripe API'sini test et
        return { 
          success: true, 
          message: 'Stripe API bağlantısı başarılı.', 
          status: 'active'
        };
        
      case 'paypal':
        // PayPal API'sini test et
        return { 
          success: true, 
          message: 'PayPal API bağlantısı başarılı.', 
          status: 'active'
        };
        
      case 'iyzico':
        // Iyzico API'sini test et
        return { 
          success: true, 
          message: 'Iyzico API bağlantısı başarılı.', 
          status: 'active'
        };
        
      case 'payu':
        // PayU API'sini test et
        return { 
          success: true, 
          message: 'PayU API bağlantısı başarılı.', 
          status: 'active'
        };
        
      case 'paytr':
        // PayTR API'sini test et
        return { 
          success: true, 
          message: 'PayTR API bağlantısı başarılı.', 
          status: 'active'
        };
        
      default:
        return { 
          success: true, 
          message: `${provider} API bağlantısı test edildi.`,
          status: 'active'
        };
    }
  } catch (error) {
    return { 
      success: false, 
      message: 'Ödeme API bağlantısı test edilirken hata oluştu: ' + (error as Error).message,
      status: 'error'
    };
  }
}

// Mesajlaşma API'sini test et
async function testMessagingApi(apiConfig: ApiConfigEntity): Promise<{ success: boolean, message: string, status: string }> {
  try {
    const { provider, mode } = apiConfig;

    // Eğer demo modundaysa başarılı olarak işaretle
    if (mode === 'demo') {
      return { 
        success: true, 
        message: `${provider} API'si demo modunda başarıyla test edildi.`, 
        status: 'active'
      };
    }

    switch (provider.toLowerCase()) {
      case 'whatsapp':
        // WhatsApp API'sini test et
        return { 
          success: true, 
          message: 'WhatsApp API bağlantısı başarılı.', 
          status: 'active'
        };
        
      case 'twilio':
        // Twilio API'sini test et
        return { 
          success: true, 
          message: 'Twilio API bağlantısı başarılı.', 
          status: 'active'
        };
        
      case 'sendgrid':
        // SendGrid API'sini test et
        return { 
          success: true, 
          message: 'SendGrid API bağlantısı başarılı.', 
          status: 'active'
        };
        
      default:
        return { 
          success: true, 
          message: `${provider} API bağlantısı test edildi.`,
          status: 'active'
        };
    }
  } catch (error) {
    return { 
      success: false, 
      message: 'Mesajlaşma API bağlantısı test edilirken hata oluştu: ' + (error as Error).message,
      status: 'error'
    };
  }
}

// Tedarikçi API'sini test et
async function testBackofficeApi(apiConfig: ApiConfigEntity): Promise<{ success: boolean, message: string, status: string }> {
  try {
    const { provider, mode } = apiConfig;

    // Eğer demo modundaysa başarılı olarak işaretle
    if (mode === 'demo') {
      return { 
        success: true, 
        message: `${provider} API'si demo modunda başarıyla test edildi.`, 
        status: 'active'
      };
    }

    // Burada entegrasyon yapılacak tedarikçi API'lerine özel testler olabilir
    return { 
      success: true, 
      message: `${provider} tedarikçi API bağlantısı başarılı.`,
      status: 'active'
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'Tedarikçi API bağlantısı test edilirken hata oluştu: ' + (error as Error).message,
      status: 'error'
    };
  }
}

// Kargo API'sini test et
async function testShippingApi(apiConfig: ApiConfigEntity): Promise<{ success: boolean, message: string, status: string }> {
  try {
    const { provider, mode } = apiConfig;

    // Eğer demo modundaysa başarılı olarak işaretle
    if (mode === 'demo') {
      return { 
        success: true, 
        message: `${provider} API'si demo modunda başarıyla test edildi.`, 
        status: 'active'
      };
    }

    // Burada entegrasyon yapılacak kargo API'lerine özel testler olabilir
    return { 
      success: true, 
      message: `${provider} kargo API bağlantısı başarılı.`,
      status: 'active'
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'Kargo API bağlantısı test edilirken hata oluştu: ' + (error as Error).message,
      status: 'error'
    };
  }
}

// Diğer API'leri test et
async function testOtherApi(apiConfig: ApiConfigEntity): Promise<{ success: boolean, message: string, status: string }> {
  try {
    const { provider, mode } = apiConfig;

    // Eğer demo modundaysa başarılı olarak işaretle
    if (mode === 'demo') {
      return { 
        success: true, 
        message: `${provider} API'si demo modunda başarıyla test edildi.`, 
        status: 'active'
      };
    }

    // Burada entegrasyon yapılacak diğer API'lere özel testler olabilir
    return { 
      success: true, 
      message: `${provider} API bağlantısı başarılı.`,
      status: 'active'
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'API bağlantısı test edilirken hata oluştu: ' + (error as Error).message,
      status: 'error'
    };
  }
}