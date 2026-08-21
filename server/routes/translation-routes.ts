import { Router, Request, Response } from 'express';
import { isAdmin } from '../auth';
import { db } from '../db';
import { eq, and, like } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { z } from 'zod';
import { storage } from '../storage';

export const translationRouter = Router();

// Tüm dilleri getir
translationRouter.get('/api/admin/languages', isAdmin, async (req: Request, res: Response) => {
  try {
    const languages = await db.select().from(schema.languages).orderBy(schema.languages.name);
    res.json(languages);
  } catch (error) {
    console.error('Dil listesini getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Dil listesi alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Belirli bir dili ID ile getir
translationRouter.get('/api/admin/languages/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [language] = await db.select().from(schema.languages).where(eq(schema.languages.id, id));
    
    if (!language) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dil bulunamadı' 
      });
    }
    
    res.json(language);
  } catch (error) {
    console.error('Dil detayı getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Dil detayı alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Yeni dil ekle
translationRouter.post('/api/admin/languages', isAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = schema.insertLanguageSchema.parse(req.body);
    
    // Eğer isDefault=true ise, diğer tüm dillerin default değerini false yap
    if (validatedData.isDefault) {
      await db.update(schema.languages)
        .set({ isDefault: false })
        .where(eq(schema.languages.isDefault, true));
    }
    
    const [newLanguage] = await db.insert(schema.languages)
      .values(validatedData)
      .returning();
    
    res.status(201).json(newLanguage);
  } catch (error) {
    console.error('Dil ekleme hatası:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz dil verileri', 
        error: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Dil eklenirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Dil güncelle
translationRouter.patch('/api/admin/languages/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = schema.insertLanguageSchema.partial().parse(req.body);
    
    // Eğer isDefault=true ise, diğer tüm dillerin default değerini false yap
    if (validatedData.isDefault) {
      await db.update(schema.languages)
        .set({ isDefault: false })
        .where(eq(schema.languages.isDefault, true));
    }
    
    const [updatedLanguage] = await db.update(schema.languages)
      .set(validatedData)
      .where(eq(schema.languages.id, id))
      .returning();
    
    if (!updatedLanguage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Güncellenecek dil bulunamadı' 
      });
    }
    
    res.json(updatedLanguage);
  } catch (error) {
    console.error('Dil güncelleme hatası:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz dil verileri', 
        error: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Dil güncellenirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Dil sil (fiziksel silme yerine pasif yapma)
translationRouter.delete('/api/admin/languages/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Önce dili kontrol et
    const [language] = await db.select().from(schema.languages).where(eq(schema.languages.id, id));
    
    if (!language) {
      return res.status(404).json({ 
        success: false, 
        message: 'Silinecek dil bulunamadı' 
      });
    }
    
    // Varsayılan dili silmeye çalışıyorsa engelle
    if (language.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Varsayılan dil silinemez' 
      });
    }
    
    // Pasif yap, silme 
    const [deactivatedLanguage] = await db.update(schema.languages)
      .set({ isActive: false })
      .where(eq(schema.languages.id, id))
      .returning();
    
    res.json({ 
      success: true, 
      message: 'Dil başarıyla pasif hale getirildi',
      data: deactivatedLanguage
    });
  } catch (error) {
    console.error('Dil silme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Dil silinirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// TRANSLATION FUNCTIONS ENDPOINTS

// Tüm çeviri fonksiyonlarını getir
translationRouter.get('/api/admin/translation-functions', isAdmin, async (req: Request, res: Response) => {
  try {
    const functions = await db.select().from(schema.translationFunctions)
      .orderBy(schema.translationFunctions.category, schema.translationFunctions.name);
    res.json(functions);
  } catch (error) {
    console.error('Çeviri fonksiyonlarını getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri fonksiyonları alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Belirli bir çeviri fonksiyonunu getir
translationRouter.get('/api/admin/translation-functions/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [fn] = await db.select().from(schema.translationFunctions)
      .where(eq(schema.translationFunctions.id, id));
    
    if (!fn) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çeviri fonksiyonu bulunamadı' 
      });
    }
    
    res.json(fn);
  } catch (error) {
    console.error('Çeviri fonksiyonu getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri fonksiyonu alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Yeni çeviri fonksiyonu ekle
translationRouter.post('/api/admin/translation-functions', isAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = schema.insertTranslationFunctionSchema.parse(req.body);
    
    const [newFunction] = await db.insert(schema.translationFunctions)
      .values(validatedData)
      .returning();
    
    res.status(201).json(newFunction);
  } catch (error) {
    console.error('Çeviri fonksiyonu ekleme hatası:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz çeviri fonksiyonu verileri', 
        error: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri fonksiyonu eklenirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Çeviri fonksiyonu güncelle
translationRouter.patch('/api/admin/translation-functions/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = schema.insertTranslationFunctionSchema.partial().parse(req.body);
    
    const [updatedFunction] = await db.update(schema.translationFunctions)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(schema.translationFunctions.id, id))
      .returning();
    
    if (!updatedFunction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Güncellenecek çeviri fonksiyonu bulunamadı' 
      });
    }
    
    res.json(updatedFunction);
  } catch (error) {
    console.error('Çeviri fonksiyonu güncelleme hatası:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz çeviri fonksiyonu verileri', 
        error: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri fonksiyonu güncellenirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Çeviri fonksiyonu sil
translationRouter.delete('/api/admin/translation-functions/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // İlişkili çeviri öğelerini de sil
    await db.delete(schema.translationItems)
      .where(eq(schema.translationItems.functionId, id));
    
    // Fonksiyonun kendisini sil
    const [deletedFunction] = await db.delete(schema.translationFunctions)
      .where(eq(schema.translationFunctions.id, id))
      .returning();
    
    if (!deletedFunction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Silinecek çeviri fonksiyonu bulunamadı' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Çeviri fonksiyonu ve ilişkili öğeleri başarıyla silindi',
      data: deletedFunction
    });
  } catch (error) {
    console.error('Çeviri fonksiyonu silme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri fonksiyonu silinirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// TRANSLATION ITEMS ENDPOINTS

// Çeviri öğelerini getir (filtreli)
translationRouter.get('/api/admin/translation-items', isAdmin, async (req: Request, res: Response) => {
  try {
    const { functionId, languageId } = req.query;
    
    // SQL sorgusu builder
    let query = db.select({
      item: schema.translationItems,
      function: {
        id: schema.translationFunctions.id,
        name: schema.translationFunctions.name,
        category: schema.translationFunctions.category
      },
      language: {
        id: schema.languages.id,
        code: schema.languages.code,
        name: schema.languages.name
      }
    })
    .from(schema.translationItems)
    .innerJoin(schema.translationFunctions, 
      eq(schema.translationItems.functionId, schema.translationFunctions.id))
    .innerJoin(schema.languages, 
      eq(schema.translationItems.languageId, schema.languages.id));
    
    // Filtreleri uygula
    if (functionId) {
      query = query.where(eq(schema.translationItems.functionId, parseInt(functionId as string)));
    }
    
    if (languageId) {
      query = query.where(eq(schema.translationItems.languageId, parseInt(languageId as string)));
    }
    
    // Sorguyu çalıştır
    const results = await query;
    
    // Client tarafında daha kolay kullanılabilir bir formata dönüştür
    const items = results.map(r => ({
      id: r.item.id,
      functionId: r.item.functionId,
      languageId: r.item.languageId,
      itemKey: r.item.itemKey,
      itemValue: r.item.itemValue,
      createdAt: r.item.createdAt,
      updatedAt: r.item.updatedAt,
      functionName: r.function.name,
      functionCategory: r.function.category,
      languageCode: r.language.code,
      languageName: r.language.name
    }));
    
    res.json(items);
  } catch (error) {
    console.error('Çeviri öğelerini getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri öğeleri alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Belirli bir çeviri öğesini getir
translationRouter.get('/api/admin/translation-items/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const [result] = await db.select({
      item: schema.translationItems,
      function: {
        id: schema.translationFunctions.id,
        name: schema.translationFunctions.name,
        category: schema.translationFunctions.category
      },
      language: {
        id: schema.languages.id,
        code: schema.languages.code,
        name: schema.languages.name
      }
    })
    .from(schema.translationItems)
    .innerJoin(schema.translationFunctions, 
      eq(schema.translationItems.functionId, schema.translationFunctions.id))
    .innerJoin(schema.languages, 
      eq(schema.translationItems.languageId, schema.languages.id))
    .where(eq(schema.translationItems.id, id));
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çeviri öğesi bulunamadı' 
      });
    }
    
    const item = {
      id: result.item.id,
      functionId: result.item.functionId,
      languageId: result.item.languageId,
      itemKey: result.item.itemKey,
      itemValue: result.item.itemValue,
      createdAt: result.item.createdAt,
      updatedAt: result.item.updatedAt,
      functionName: result.function.name,
      functionCategory: result.function.category,
      languageCode: result.language.code,
      languageName: result.language.name
    };
    
    res.json(item);
  } catch (error) {
    console.error('Çeviri öğesi getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri öğesi alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Yeni çeviri öğesi ekle
translationRouter.post('/api/admin/translation-items', isAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = schema.insertTranslationItemSchema.parse(req.body);
    
    // Aynı fonksiyon, dil ve key kombinasyonu zaten var mı kontrol et
    const existing = await db.select()
      .from(schema.translationItems)
      .where(and(
        eq(schema.translationItems.functionId, validatedData.functionId),
        eq(schema.translationItems.languageId, validatedData.languageId),
        eq(schema.translationItems.itemKey, validatedData.itemKey)
      ));
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu fonksiyon, dil ve anahtar kombinasyonu için zaten bir çeviri öğesi mevcut' 
      });
    }
    
    const [newItem] = await db.insert(schema.translationItems)
      .values(validatedData)
      .returning();
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Çeviri öğesi ekleme hatası:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz çeviri öğesi verileri', 
        error: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri öğesi eklenirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Çeviri öğesi güncelle
translationRouter.patch('/api/admin/translation-items/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = schema.insertTranslationItemSchema.partial().parse(req.body);
    
    // Aynı kombinasyon var mı kontrol et, eğer değiştiriyorsa
    if (validatedData.functionId && validatedData.languageId && validatedData.itemKey) {
      const existing = await db.select()
        .from(schema.translationItems)
        .where(and(
          eq(schema.translationItems.functionId, validatedData.functionId),
          eq(schema.translationItems.languageId, validatedData.languageId),
          eq(schema.translationItems.itemKey, validatedData.itemKey),
          req.params.id ? schema.translationItems.id !== parseInt(req.params.id) : undefined
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Bu fonksiyon, dil ve anahtar kombinasyonu için zaten bir çeviri öğesi mevcut' 
        });
      }
    }
    
    const [updatedItem] = await db.update(schema.translationItems)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(schema.translationItems.id, id))
      .returning();
    
    if (!updatedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Güncellenecek çeviri öğesi bulunamadı' 
      });
    }
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Çeviri öğesi güncelleme hatası:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz çeviri öğesi verileri', 
        error: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri öğesi güncellenirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Çeviri öğesi sil
translationRouter.delete('/api/admin/translation-items/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedItem] = await db.delete(schema.translationItems)
      .where(eq(schema.translationItems.id, id))
      .returning();
    
    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Silinecek çeviri öğesi bulunamadı' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Çeviri öğesi başarıyla silindi',
      data: deletedItem
    });
  } catch (error) {
    console.error('Çeviri öğesi silme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri öğesi silinirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Diller arası çeviri senkronizasyonu
translationRouter.post('/api/admin/translation-sync', isAdmin, async (req: Request, res: Response) => {
  try {
    const { targetLanguageId, sourceLanguageId = null } = req.body;
    
    if (!targetLanguageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hedef dil ID\'si (targetLanguageId) gereklidir' 
      });
    }
    
    // Kaynak dil belirtilmemişse, varsayılan dili kullan
    let _sourceLanguageId = sourceLanguageId;
    if (!_sourceLanguageId) {
      const [defaultLanguage] = await db.select()
        .from(schema.languages)
        .where(eq(schema.languages.isDefault, true));
      
      if (!defaultLanguage) {
        return res.status(404).json({ 
          success: false, 
          message: 'Varsayılan dil bulunamadı. Lütfen bir kaynak dil belirtin.' 
        });
      }
      
      _sourceLanguageId = defaultLanguage.id;
    }
    
    // Hedef ve kaynak aynı dil olamaz
    if (_sourceLanguageId === parseInt(targetLanguageId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kaynak ve hedef dil aynı olamaz' 
      });
    }
    
    // Kaynak dildeki tüm çeviri öğelerini al
    const sourceItems = await db.select()
      .from(schema.translationItems)
      .where(eq(schema.translationItems.languageId, _sourceLanguageId));
    
    if (sourceItems.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kaynak dilde hiç çeviri öğesi bulunamadı' 
      });
    }
    
    // Hedef dildeki mevcut öğeleri al
    const targetItems = await db.select()
      .from(schema.translationItems)
      .where(eq(schema.translationItems.languageId, parseInt(targetLanguageId)));
    
    // Senkronizasyon işlemi istatistikleri
    const stats = {
      total: sourceItems.length,
      added: 0,
      skipped: 0,
      alreadyExists: 0
    };
    
    // Her kaynak öğe için hedef dilde bir kopya oluştur
    for (const sourceItem of sourceItems) {
      // Bu fonksiyon, dil ve anahtar kombinasyonu hedef dilde zaten var mı?
      const exists = targetItems.some(item => 
        item.functionId === sourceItem.functionId && 
        item.itemKey === sourceItem.itemKey);
      
      if (exists) {
        stats.alreadyExists++;
        continue;
      }
      
      try {
        // Kaynak öğenin bir kopyasını hedef dil için oluştur
        await db.insert(schema.translationItems)
          .values({
            functionId: sourceItem.functionId,
            languageId: parseInt(targetLanguageId),
            itemKey: sourceItem.itemKey,
            itemValue: sourceItem.itemValue, // Aynı değerle başlar, sonra düzenlenir
          });
        
        stats.added++;
      } catch (err) {
        console.error('Çeviri öğesi eklenirken hata:', err);
        stats.skipped++;
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Çeviri senkronizasyonu tamamlandı',
      stats
    });
  } catch (error) {
    console.error('Çeviri senkronizasyonu hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri senkronizasyonu sırasında bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Belirli bir dil için eksik çeviri öğelerini raporla
translationRouter.get('/api/admin/translation-missing', isAdmin, async (req: Request, res: Response) => {
  try {
    const { languageId } = req.query;
    
    if (!languageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dil ID\'si (languageId) gereklidir' 
      });
    }
    
    // Tüm fonksiyonları al
    const functions = await db.select().from(schema.translationFunctions);
    
    // Belirtilen dil için tüm çeviri öğelerini al
    const existingItems = await db.select()
      .from(schema.translationItems)
      .where(eq(schema.translationItems.languageId, parseInt(languageId as string)));
    
    // Varsayılan dili al
    const [defaultLanguage] = await db.select()
      .from(schema.languages)
      .where(eq(schema.languages.isDefault, true));
    
    if (!defaultLanguage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Varsayılan dil bulunamadı' 
      });
    }
    
    // Varsayılan dil için çeviri öğelerini al
    const defaultItems = await db.select()
      .from(schema.translationItems)
      .where(eq(schema.translationItems.languageId, defaultLanguage.id));
    
    // Her fonksiyon için eksik öğeleri belirle
    const missingItems = [];
    
    for (const func of functions) {
      // Bu fonksiyon için varsayılan dildeki tüm anahtarları al
      const defaultKeys = defaultItems
        .filter(item => item.functionId === func.id)
        .map(item => item.itemKey);
      
      // Bu fonksiyon için mevcut çevirili anahtarları al
      const existingKeys = existingItems
        .filter(item => item.functionId === func.id)
        .map(item => item.itemKey);
      
      // Eksik anahtarları belirle
      const missingKeys = defaultKeys.filter(key => !existingKeys.includes(key));
      
      // Eğer eksik anahtar varsa, rapor et
      if (missingKeys.length > 0) {
        missingItems.push({
          functionId: func.id,
          functionName: func.name,
          functionCategory: func.category,
          missingKeys,
          totalKeys: defaultKeys.length,
          translatedKeys: existingKeys.length,
          completionRate: Math.round((existingKeys.length / defaultKeys.length) * 100)
        });
      }
    }
    
    // Genel tamamlanma oranını hesapla
    const totalDefaultKeys = defaultItems.length;
    const totalExistingKeys = existingItems.length;
    const overallCompletion = totalDefaultKeys > 0 
      ? Math.round((totalExistingKeys / totalDefaultKeys) * 100)
      : 100;
    
    res.json({
      success: true,
      languageId: parseInt(languageId as string),
      defaultLanguageId: defaultLanguage.id,
      overallCompletion,
      totalFunctions: functions.length,
      functionsWithMissingTranslations: missingItems.length,
      missingItems
    });
  } catch (error) {
    console.error('Eksik çeviri raporlama hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eksik çeviriler raporlanırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Export olunabilir tüm çevirileri getir
translationRouter.get('/api/admin/translation-export', isAdmin, async (req: Request, res: Response) => {
  try {
    const { languageId } = req.query;
    
    if (!languageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dil ID\'si (languageId) gereklidir' 
      });
    }
    
    // Belirtilen dil için tüm çeviri öğelerini al
    const items = await db.select({
      item: schema.translationItems,
      function: {
        name: schema.translationFunctions.name,
        category: schema.translationFunctions.category
      }
    })
    .from(schema.translationItems)
    .innerJoin(schema.translationFunctions, 
      eq(schema.translationItems.functionId, schema.translationFunctions.id))
    .where(eq(schema.translationItems.languageId, parseInt(languageId as string)));
    
    // Fonksiyon adına göre grupla
    const grouped = items.reduce((acc, curr) => {
      const key = curr.function.name;
      if (!acc[key]) {
        acc[key] = {
          category: curr.function.category,
          translations: {}
        };
      }
      
      acc[key].translations[curr.item.itemKey] = curr.item.itemValue;
      return acc;
    }, {});
    
    // Dil bilgilerini al
    const [language] = await db.select()
      .from(schema.languages)
      .where(eq(schema.languages.id, parseInt(languageId as string)));
    
    res.json({
      success: true,
      language,
      translations: grouped
    });
  } catch (error) {
    console.error('Çeviri export hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviriler export edilirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Import işlemi için API
translationRouter.post('/api/admin/translation-import', isAdmin, async (req: Request, res: Response) => {
  try {
    const { languageId, translations } = req.body;
    
    if (!languageId || !translations) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dil ID\'si (languageId) ve çeviriler (translations) gereklidir' 
      });
    }
    
    // İstatistikleri toplamak için
    const stats = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    // Her fonksiyon için
    for (const [functionName, data] of Object.entries(translations)) {
      // Fonksiyonu bul
      const [func] = await db.select()
        .from(schema.translationFunctions)
        .where(eq(schema.translationFunctions.name, functionName));
      
      if (!func) {
        stats.errors.push(`"${functionName}" adlı fonksiyon bulunamadı`);
        continue;
      }
      
      // Her çeviri anahtarı için
      for (const [key, value] of Object.entries(data.translations)) {
        stats.total++;
        
        try {
          // Bu anahtar için bir çeviri zaten var mı?
          const [existingItem] = await db.select()
            .from(schema.translationItems)
            .where(and(
              eq(schema.translationItems.functionId, func.id),
              eq(schema.translationItems.languageId, languageId),
              eq(schema.translationItems.itemKey, key)
            ));
          
          if (existingItem) {
            // Update
            await db.update(schema.translationItems)
              .set({
                itemValue: value,
                updatedAt: new Date()
              })
              .where(eq(schema.translationItems.id, existingItem.id));
            
            stats.updated++;
          } else {
            // Create
            await db.insert(schema.translationItems)
              .values({
                functionId: func.id,
                languageId,
                itemKey: key,
                itemValue: value
              });
            
            stats.created++;
          }
        } catch (err) {
          console.error(`Çeviri kaydedilirken hata (${functionName}.${key}):`, err);
          stats.skipped++;
          stats.errors.push(`"${functionName}.${key}" kaydedilirken hata: ${err.message}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Çeviri import işlemi tamamlandı',
      stats
    });
  } catch (error) {
    console.error('Çeviri import hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviriler import edilirken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Bir dilde belli anahtarların eksik olup olmadığını kontrol et (toplu kontrol)
translationRouter.post('/api/admin/translation-check-missing-keys', isAdmin, async (req: Request, res: Response) => {
  try {
    const { languageId, keys } = req.body;
    
    if (!languageId || !keys || !Array.isArray(keys)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dil ID\'si (languageId) ve kontrol edilecek anahtarlar (keys) array olarak gereklidir' 
      });
    }
    
    // Mevcut anahtarları al
    const existingItems = await db.select()
      .from(schema.translationItems)
      .where(eq(schema.translationItems.languageId, languageId));
    
    // Eksik anahtarları belirle
    const existingKeys = existingItems.map(item => `${item.functionId}.${item.itemKey}`);
    const missingKeys = keys.filter(key => !existingKeys.includes(key));
    
    res.json({
      success: true,
      totalKeys: keys.length,
      existingKeys: keys.length - missingKeys.length,
      missingKeys
    });
  } catch (error) {
    console.error('Çeviri eksik anahtar kontrolü hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviri eksik anahtar kontrolü sırasında bir hata oluştu', 
      error: String(error) 
    });
  }
});

// Tüm çevirileri getiren yardımcı fonksiyon - ön yüz için
translationRouter.get('/api/translations/:lang', async (req: Request, res: Response) => {
  try {
    const langCode = req.params.lang;
    
    // Dil kodunu doğrula
    const [language] = await db.select()
      .from(schema.languages)
      .where(and(eq(schema.languages.code, langCode), eq(schema.languages.isActive, true)));
    
    if (!language) {
      return res.status(404).json({ 
        success: false, 
        message: 'Belirtilen dil bulunamadı' 
      });
    }
    
    // Tüm çeviri öğelerini al
    const items = await db.select({
      item: schema.translationItems,
      function: {
        name: schema.translationFunctions.name,
        category: schema.translationFunctions.category
      }
    })
    .from(schema.translationItems)
    .innerJoin(schema.translationFunctions, 
      eq(schema.translationItems.functionId, schema.translationFunctions.id))
    .where(eq(schema.translationItems.languageId, language.id));
    
    // Fonksiyon adına göre grupla
    const translations = {};
    
    for (const item of items) {
      const funcName = item.function.name;
      const key = item.item.itemKey;
      const value = item.item.itemValue;
      
      if (!translations[funcName]) {
        translations[funcName] = {};
      }
      
      translations[funcName][key] = value;
    }
    
    res.json({
      success: true,
      language,
      translations
    });
  } catch (error) {
    console.error('Çevirileri getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Çeviriler alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});

// API-EXPORT - Tüm dil paketlerini toplu olarak sunucu tarafında işlenmiş ve hazır bir şekilde döndürür
translationRouter.get('/api/translations', async (req: Request, res: Response) => {
  try {
    // Aktif dilleri getir
    const languages = await db.select()
      .from(schema.languages)
      .where(eq(schema.languages.isActive, true));
    
    if (languages.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aktif dil bulunamadı' 
      });
    }
    
    // Her dil için tüm çevirileri getir
    const allTranslations = {};
    
    for (const language of languages) {
      // Dil için tüm çeviri öğelerini al
      const items = await db.select({
        item: schema.translationItems,
        function: {
          name: schema.translationFunctions.name,
          category: schema.translationFunctions.category
        }
      })
      .from(schema.translationItems)
      .innerJoin(schema.translationFunctions, 
        eq(schema.translationItems.functionId, schema.translationFunctions.id))
      .where(eq(schema.translationItems.languageId, language.id));
      
      // Fonksiyon adına göre grupla
      const translations = {};
      
      for (const item of items) {
        const funcName = item.function.name;
        const key = item.item.itemKey;
        const value = item.item.itemValue;
        
        if (!translations[funcName]) {
          translations[funcName] = {};
        }
        
        translations[funcName][key] = value;
      }
      
      allTranslations[language.code] = {
        language,
        translations
      };
    }
    
    res.json({
      success: true,
      translations: allTranslations
    });
  } catch (error) {
    console.error('Tüm çevirileri getirme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Tüm çeviriler alınırken bir hata oluştu', 
      error: String(error) 
    });
  }
});