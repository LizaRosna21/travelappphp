import express, { Request, Response } from 'express';
import { isAdmin } from '../auth';
import { storage } from '../storage';

const contentRouter = express.Router();

// ****************** Sayfa Yönetimi API Endpointleri ******************

// Tüm sayfaları getir
contentRouter.get("/api/admin/pages", isAdmin, async (req: Request, res: Response) => {
  try {
    const pages = await storage.getAllPages();
    res.status(200).json(pages);
  } catch (error) {
    console.error("Sayfaları getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sayfalar getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Belirli bir sayfayı ID ile getir
contentRouter.get("/api/admin/pages/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = await storage.getPageById(pageId);
    
    if (!page) {
      return res.status(404).json({ 
        success: false, 
        message: "Sayfa bulunamadı" 
      });
    }
    
    res.status(200).json(page);
  } catch (error) {
    console.error("Sayfa getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sayfa getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Yeni sayfa oluştur
contentRouter.post("/api/admin/pages", isAdmin, async (req: Request, res: Response) => {
  try {
    const pageData = req.body;
    
    // Her sayfa için bir yazar (author) gerekli
    if (!pageData.authorId) {
      pageData.authorId = req.user.id;
    }
    
    // Eğer yeni sayfa ana sayfa olarak ayarlandıysa, diğer ana sayfaları güncelle
    if (pageData.isHomepage) {
      await storage.resetHomepageFlag();
    }
    
    const newPage = await storage.createPage(pageData);
    res.status(201).json(newPage);
  } catch (error) {
    console.error("Sayfa oluşturma hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sayfa oluşturulurken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Sayfayı güncelle
contentRouter.patch("/api/admin/pages/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const pageData = req.body;
    
    // Sayfa mevcut mu kontrolü
    const existingPage = await storage.getPageById(pageId);
    if (!existingPage) {
      return res.status(404).json({ 
        success: false, 
        message: "Sayfa bulunamadı" 
      });
    }
    
    // Eğer sayfa ana sayfa olarak ayarlandıysa, diğer ana sayfaları güncelle
    if (pageData.isHomepage && !existingPage.isHomepage) {
      await storage.resetHomepageFlag();
    }
    
    const updatedPage = await storage.updatePage(pageId, pageData);
    res.status(200).json(updatedPage);
  } catch (error) {
    console.error("Sayfa güncelleme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sayfa güncellenirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Sayfayı sil
contentRouter.delete("/api/admin/pages/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    
    // Önce sayfanın var olup olmadığını kontrol et
    const page = await storage.getPageById(pageId);
    
    if (!page) {
      return res.status(404).json({ 
        success: false, 
        message: "Sayfa bulunamadı" 
      });
    }
    
    // Ana sayfanın silinmesini engelle
    if (page.isHomepage) {
      return res.status(400).json({
        success: false,
        message: "Ana sayfa silinemez. Önce başka bir sayfayı ana sayfa olarak ayarlayın."
      });
    }
    
    await storage.deletePage(pageId);
    res.status(200).json({ 
      success: true, 
      message: "Sayfa başarıyla silindi" 
    });
  } catch (error) {
    console.error("Sayfa silme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sayfa silinirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// ****************** Menü Yönetimi API Endpointleri ******************

// Tüm menüleri getir
contentRouter.get("/api/admin/menus", isAdmin, async (req: Request, res: Response) => {
  try {
    const menus = await storage.getAllMenus();
    res.status(200).json(menus);
  } catch (error) {
    console.error("Menüleri getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menüler getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Belirli bir menüyü ID ile getir
contentRouter.get("/api/admin/menus/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuId = parseInt(req.params.id);
    const menu = await storage.getMenuById(menuId);
    
    if (!menu) {
      return res.status(404).json({ 
        success: false, 
        message: "Menü bulunamadı" 
      });
    }
    
    res.status(200).json(menu);
  } catch (error) {
    console.error("Menü getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Yeni menü oluştur
contentRouter.post("/api/admin/menus", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuData = req.body;
    const newMenu = await storage.createMenu(menuData);
    res.status(201).json(newMenu);
  } catch (error) {
    console.error("Menü oluşturma hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü oluşturulurken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Menüyü güncelle
contentRouter.patch("/api/admin/menus/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuId = parseInt(req.params.id);
    const menuData = req.body;
    
    // Menü mevcut mu kontrolü
    const existingMenu = await storage.getMenuById(menuId);
    if (!existingMenu) {
      return res.status(404).json({ 
        success: false, 
        message: "Menü bulunamadı" 
      });
    }
    
    const updatedMenu = await storage.updateMenu(menuId, menuData);
    res.status(200).json(updatedMenu);
  } catch (error) {
    console.error("Menü güncelleme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü güncellenirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Menüyü sil
contentRouter.delete("/api/admin/menus/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuId = parseInt(req.params.id);
    
    // Önce menünün var olup olmadığını kontrol et
    const menu = await storage.getMenuById(menuId);
    
    if (!menu) {
      return res.status(404).json({ 
        success: false, 
        message: "Menü bulunamadı" 
      });
    }
    
    // Menü silindiğinde, bağlı tüm menü öğelerinin de silinmesi gerekir
    await storage.deleteMenuItemsByMenuId(menuId);
    
    // Menüyü sil
    await storage.deleteMenu(menuId);
    
    res.status(200).json({ 
      success: true, 
      message: "Menü ve bağlı öğeleri başarıyla silindi" 
    });
  } catch (error) {
    console.error("Menü silme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü silinirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// ****************** Menü Öğeleri Yönetimi API Endpointleri ******************

// Tüm menü öğelerini veya belirli bir menüye ait öğeleri getir
contentRouter.get("/api/admin/menu-items", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuId = req.query.menuId ? parseInt(req.query.menuId as string) : null;
    
    let menuItems;
    if (menuId) {
      menuItems = await storage.getMenuItemsByMenuId(menuId);
    } else {
      menuItems = await storage.getAllMenuItems();
    }
    
    res.status(200).json(menuItems);
  } catch (error) {
    console.error("Menü öğelerini getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü öğeleri getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Belirli bir menü öğesini ID ile getir
contentRouter.get("/api/admin/menu-items/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuItemId = parseInt(req.params.id);
    const menuItem = await storage.getMenuItemById(menuItemId);
    
    if (!menuItem) {
      return res.status(404).json({ 
        success: false, 
        message: "Menü öğesi bulunamadı" 
      });
    }
    
    res.status(200).json(menuItem);
  } catch (error) {
    console.error("Menü öğesi getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü öğesi getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Yeni menü öğesi oluştur
contentRouter.post("/api/admin/menu-items", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuItemData = req.body;
    
    // Menünün var olup olmadığını kontrol et
    const menu = await storage.getMenuById(menuItemData.menuId);
    if (!menu) {
      return res.status(404).json({ 
        success: false, 
        message: "Belirtilen menü bulunamadı" 
      });
    }
    
    // Eğer parentId belirtilmişse, bu ID'ye sahip menü öğesinin var olduğunu kontrol et
    if (menuItemData.parentId) {
      const parentItem = await storage.getMenuItemById(menuItemData.parentId);
      if (!parentItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Belirtilen üst menü öğesi bulunamadı" 
        });
      }
      
      // Üst öğenin aynı menüye ait olup olmadığını kontrol et
      if (parentItem.menuId !== menuItemData.menuId) {
        return res.status(400).json({ 
          success: false, 
          message: "Üst menü öğesi aynı menüye ait olmalıdır" 
        });
      }
    }
    
    const newMenuItem = await storage.createMenuItem(menuItemData);
    res.status(201).json(newMenuItem);
  } catch (error) {
    console.error("Menü öğesi oluşturma hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü öğesi oluşturulurken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Menü öğesini güncelle
contentRouter.patch("/api/admin/menu-items/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuItemId = parseInt(req.params.id);
    const menuItemData = req.body;
    
    // Menü öğesi mevcut mu kontrolü
    const existingMenuItem = await storage.getMenuItemById(menuItemId);
    if (!existingMenuItem) {
      return res.status(404).json({ 
        success: false, 
        message: "Menü öğesi bulunamadı" 
      });
    }
    
    // Menü değiştiriliyorsa, yeni menünün var olup olmadığını kontrol et
    if (menuItemData.menuId && menuItemData.menuId !== existingMenuItem.menuId) {
      const menu = await storage.getMenuById(menuItemData.menuId);
      if (!menu) {
        return res.status(404).json({ 
          success: false, 
          message: "Belirtilen menü bulunamadı" 
        });
      }
    }
    
    // Üst öğe değiştiriliyorsa kontroller yap
    if (menuItemData.parentId && menuItemData.parentId !== existingMenuItem.parentId) {
      // Kendisini üst öğe olarak seçmeyi engelle
      if (menuItemData.parentId === menuItemId) {
        return res.status(400).json({ 
          success: false, 
          message: "Bir menü öğesi kendisini üst öğe olarak seçemez" 
        });
      }
      
      const parentItem = await storage.getMenuItemById(menuItemData.parentId);
      if (!parentItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Belirtilen üst menü öğesi bulunamadı" 
        });
      }
      
      // Üst öğenin aynı menüye ait olup olmadığını kontrol et
      const menuId = menuItemData.menuId || existingMenuItem.menuId;
      if (parentItem.menuId !== menuId) {
        return res.status(400).json({ 
          success: false, 
          message: "Üst menü öğesi aynı menüye ait olmalıdır" 
        });
      }
    }
    
    const updatedMenuItem = await storage.updateMenuItem(menuItemId, menuItemData);
    res.status(200).json(updatedMenuItem);
  } catch (error) {
    console.error("Menü öğesi güncelleme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü öğesi güncellenirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Menü öğesini sil
contentRouter.delete("/api/admin/menu-items/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const menuItemId = parseInt(req.params.id);
    
    // Önce menü öğesinin var olup olmadığını kontrol et
    const menuItem = await storage.getMenuItemById(menuItemId);
    
    if (!menuItem) {
      return res.status(404).json({ 
        success: false, 
        message: "Menü öğesi bulunamadı" 
      });
    }
    
    // Alt menü öğelerini kontrol et
    const childItems = await storage.getMenuItemsByParentId(menuItemId);
    
    // Alt menü öğelerinin parentId'sini null yap veya sil
    for (const child of childItems) {
      await storage.updateMenuItem(child.id, { parentId: null });
    }
    
    await storage.deleteMenuItem(menuItemId);
    res.status(200).json({ 
      success: true, 
      message: "Menü öğesi başarıyla silindi" 
    });
  } catch (error) {
    console.error("Menü öğesi silme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü öğesi silinirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// ****************** Genel İçerik API Endpointleri ******************

// Frontend için kullanıcıya göre menüleri getir
contentRouter.get("/api/menus/:location", async (req: Request, res: Response) => {
  try {
    const location = req.params.location;
    const menus = await storage.getMenusByLocation(location);
    
    if (!menus || menus.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `${location} konumunda menü bulunamadı` 
      });
    }
    
    // Sadece aktif menüleri göster
    const activeMenus = menus.filter(menu => menu.isActive);
    
    if (activeMenus.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `${location} konumunda aktif menü bulunamadı` 
      });
    }
    
    // Genellikle her konum için tek bir menü olacağından ilk aktif menüyü seç
    const menu = activeMenus[0];
    
    // Menü öğelerini getir ve ağaç yapısında düzenle
    const menuItems = await storage.getMenuItemsByMenuId(menu.id);
    
    // Menü öğelerini sıralama numarasına göre sırala
    const sortedItems = menuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Ağaç yapısını oluştur
    const menuTree = buildMenuTree(sortedItems);
    
    res.status(200).json({
      id: menu.id,
      name: menu.name,
      location: menu.location,
      items: menuTree
    });
  } catch (error) {
    console.error("Menü getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Menü getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Frontend için URL'ye göre sayfa getir
contentRouter.get("/api/pages/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const page = await storage.getPageBySlug(slug);
    
    if (!page) {
      return res.status(404).json({ 
        success: false, 
        message: "Sayfa bulunamadı" 
      });
    }
    
    // Yayınlanmamış sayfalar sadece admin kullanıcılar tarafından görüntülenebilir
    if (!page.isPublished && (!req.isAuthenticated() || req.user?.role !== 'admin')) {
      return res.status(403).json({ 
        success: false, 
        message: "Bu sayfa henüz yayınlanmamış" 
      });
    }
    
    res.status(200).json(page);
  } catch (error) {
    console.error("Sayfa getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sayfa getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Ana sayfayı getir
contentRouter.get("/api/homepage", async (req: Request, res: Response) => {
  try {
    const homepages = await storage.getHomepage();
    
    if (!homepages || homepages.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Ana sayfa bulunamadı" 
      });
    }
    
    // İlk ana sayfayı döndür
    const homepage = homepages[0];
    
    res.status(200).json(homepage);
  } catch (error) {
    console.error("Ana sayfa getirme hatası:", error);
    res.status(500).json({ 
      success: false, 
      message: "Ana sayfa getirilirken bir hata oluştu", 
      error: error.message 
    });
  }
});

// Menü ağacı oluşturma yardımcı fonksiyonu
function buildMenuTree(items: any[], parentId: number | null = null) {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildMenuTree(items, item.id)
    }));
}

export default contentRouter;