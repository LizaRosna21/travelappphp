import { menus, menuItems, pages, type Page, type InsertPage, type Menu, type InsertMenu, type MenuItem, type InsertMenuItem } from "@shared/schema";
import { MemStorage } from "./storage";

// Demo sayfaları
export const demoPages: Page[] = [
  {
    id: 1,
    title: "Ana Sayfa",
    slug: "home",
    content: "<h1>Ferry Booking Sistemine Hoş Geldiniz</h1><p>En iyi fiyatlarla feribot biletleri rezervasyonu yapın.</p>",
    authorId: 1,
    isPublished: true,
    isHomepage: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    metaTitle: "Ferry Booking - Ana Sayfa",
    metaDescription: "Ferry Booking ile en iyi fiyatlara feribot bileti rezervasyonu yapın",
    featuredImage: "https://images.unsplash.com/photo-1566553871239-fef6638a1a25?q=80&w=1000"
  },
  {
    id: 2,
    title: "Hakkımızda",
    slug: "about",
    content: "<h1>Hakkımızda</h1><p>Biz, yolcuların en iyi seyahat deneyimini yaşaması için çalışan bir feribot biletleme platformuyuz.</p>",
    authorId: 1,
    isPublished: true,
    isHomepage: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    metaTitle: "Ferry Booking - Hakkımızda",
    metaDescription: "Ferry Booking hakkında bilgi alın",
    featuredImage: null
  },
  {
    id: 3,
    title: "İletişim",
    slug: "contact",
    content: "<h1>İletişim</h1><p>Sorularınız için bize ulaşın.</p><p>Email: info@ferryapp.com</p><p>Telefon: +90 212 123 4567</p>",
    authorId: 1,
    isPublished: true,
    isHomepage: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    metaTitle: "Ferry Booking - İletişim",
    metaDescription: "Ferry Booking ile iletişime geçin",
    featuredImage: null
  }
];

// Demo menüler
export const demoMenus: Menu[] = [
  {
    id: 1,
    name: "Üst Menü",
    location: "header",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: "Alt Menü",
    location: "footer",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Demo menü öğeleri
export const demoMenuItems: MenuItem[] = [
  {
    id: 1,
    menuId: 1,
    label: "Ana Sayfa",
    url: "/",
    order: 1,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    menuId: 1,
    label: "Rotalar",
    url: "/routes",
    order: 2,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    menuId: 1,
    label: "Hakkımızda",
    url: "/about",
    order: 3,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 4,
    menuId: 1,
    label: "İletişim",
    url: "/contact",
    order: 4,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 5,
    menuId: 2,
    label: "Ana Sayfa",
    url: "/",
    order: 1,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 6,
    menuId: 2,
    label: "Hakkımızda",
    url: "/about",
    order: 2,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 7,
    menuId: 2,
    label: "İletişim",
    url: "/contact",
    order: 3,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 8,
    menuId: 2,
    label: "Gizlilik Politikası",
    url: "/privacy",
    order: 4,
    parentId: null,
    targetBlank: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export function extendMemStorageWithContentMethods(memStorage: MemStorage) {
  // Pages collection
  if (!memStorage.collections.pages) {
    memStorage.collections.pages = [...demoPages];
  }

  // Menus collection
  if (!memStorage.collections.menus) {
    memStorage.collections.menus = [...demoMenus];
  }

  // MenuItems collection
  if (!memStorage.collections.menuItems) {
    memStorage.collections.menuItems = [...demoMenuItems];
  }

  // Sayfa API metotları
  memStorage.getAllPages = async function(): Promise<Page[]> {
    return this.collections.pages;
  };

  memStorage.getPageById = async function(id: number): Promise<Page | undefined> {
    return this.collections.pages.find(page => page.id === id);
  };

  memStorage.getPageBySlug = async function(slug: string): Promise<Page | undefined> {
    return this.collections.pages.find(page => page.slug === slug);
  };

  memStorage.getHomepage = async function(): Promise<Page[]> {
    return this.collections.pages.filter(page => page.isHomepage);
  };

  memStorage.createPage = async function(data: InsertPage): Promise<Page> {
    const id = this.collections.pages.length > 0 
      ? Math.max(...this.collections.pages.map(page => page.id)) + 1 
      : 1;
    
    const newPage: Page = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.collections.pages.push(newPage);
    return newPage;
  };

  memStorage.updatePage = async function(id: number, data: Partial<InsertPage>): Promise<Page> {
    const index = this.collections.pages.findIndex(page => page.id === id);
    if (index === -1) {
      throw new Error(`Page with id ${id} not found`);
    }
    
    const updatedPage = {
      ...this.collections.pages[index],
      ...data,
      updatedAt: new Date()
    };
    
    this.collections.pages[index] = updatedPage;
    return updatedPage;
  };

  memStorage.deletePage = async function(id: number): Promise<boolean> {
    const initialLength = this.collections.pages.length;
    this.collections.pages = this.collections.pages.filter(page => page.id !== id);
    return initialLength > this.collections.pages.length;
  };

  memStorage.resetHomepageFlag = async function(): Promise<void> {
    this.collections.pages = this.collections.pages.map(page => ({
      ...page,
      isHomepage: false
    }));
  };

  // Menü API metotları
  memStorage.getAllMenus = async function(): Promise<Menu[]> {
    return this.collections.menus;
  };

  memStorage.getMenuById = async function(id: number): Promise<Menu | undefined> {
    return this.collections.menus.find(menu => menu.id === id);
  };

  memStorage.getMenusByLocation = async function(location: string): Promise<Menu[]> {
    return this.collections.menus.filter(menu => menu.location === location);
  };

  memStorage.createMenu = async function(data: InsertMenu): Promise<Menu> {
    const id = this.collections.menus.length > 0 
      ? Math.max(...this.collections.menus.map(menu => menu.id)) + 1 
      : 1;
    
    const newMenu: Menu = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.collections.menus.push(newMenu);
    return newMenu;
  };

  memStorage.updateMenu = async function(id: number, data: Partial<InsertMenu>): Promise<Menu> {
    const index = this.collections.menus.findIndex(menu => menu.id === id);
    if (index === -1) {
      throw new Error(`Menu with id ${id} not found`);
    }
    
    const updatedMenu = {
      ...this.collections.menus[index],
      ...data,
      updatedAt: new Date()
    };
    
    this.collections.menus[index] = updatedMenu;
    return updatedMenu;
  };

  memStorage.deleteMenu = async function(id: number): Promise<boolean> {
    const initialLength = this.collections.menus.length;
    this.collections.menus = this.collections.menus.filter(menu => menu.id !== id);
    return initialLength > this.collections.menus.length;
  };

  // Menü Öğeleri API metotları
  memStorage.getAllMenuItems = async function(): Promise<MenuItem[]> {
    return this.collections.menuItems;
  };

  memStorage.getMenuItemById = async function(id: number): Promise<MenuItem | undefined> {
    return this.collections.menuItems.find(item => item.id === id);
  };

  memStorage.getMenuItemsByMenuId = async function(menuId: number): Promise<MenuItem[]> {
    return this.collections.menuItems.filter(item => item.menuId === menuId);
  };

  memStorage.getMenuItemsByParentId = async function(parentId: number): Promise<MenuItem[]> {
    return this.collections.menuItems.filter(item => item.parentId === parentId);
  };

  memStorage.createMenuItem = async function(data: InsertMenuItem): Promise<MenuItem> {
    const id = this.collections.menuItems.length > 0 
      ? Math.max(...this.collections.menuItems.map(item => item.id)) + 1 
      : 1;
    
    const newMenuItem: MenuItem = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.collections.menuItems.push(newMenuItem);
    return newMenuItem;
  };

  memStorage.updateMenuItem = async function(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem> {
    const index = this.collections.menuItems.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`MenuItem with id ${id} not found`);
    }
    
    const updatedMenuItem = {
      ...this.collections.menuItems[index],
      ...data,
      updatedAt: new Date()
    };
    
    this.collections.menuItems[index] = updatedMenuItem;
    return updatedMenuItem;
  };

  memStorage.deleteMenuItem = async function(id: number): Promise<boolean> {
    const initialLength = this.collections.menuItems.length;
    this.collections.menuItems = this.collections.menuItems.filter(item => item.id !== id);
    return initialLength > this.collections.menuItems.length;
  };

  memStorage.deleteMenuItemsByMenuId = async function(menuId: number): Promise<boolean> {
    const initialLength = this.collections.menuItems.length;
    this.collections.menuItems = this.collections.menuItems.filter(item => item.menuId !== menuId);
    return initialLength > this.collections.menuItems.length;
  };
}