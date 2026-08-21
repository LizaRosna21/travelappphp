import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/admin-layout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil, Trash2, Plus, Eye } from 'lucide-react';

// Form schema for page creation/update
const pageFormSchema = z.object({
  title: z.string().min(1, { message: 'Başlık zorunludur' }),
  slug: z.string().min(1, { message: 'URL eki zorunludur' }),
  content: z.string().optional(),
  isPublished: z.boolean().default(false),
  isHomepage: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  featuredImage: z.string().optional(),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

// Form schema for menu creation/update
const menuFormSchema = z.object({
  name: z.string().min(1, { message: 'Menü adı zorunludur' }),
  location: z.string().min(1, { message: 'Menü konumu zorunludur' }),
  isActive: z.boolean().default(true),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

// Menu item form schema
const menuItemFormSchema = z.object({
  menuId: z.number(),
  label: z.string().min(1, { message: 'Menü öğesi etiketi zorunludur' }),
  url: z.string().min(1, { message: 'Menü öğesi URL zorunludur' }),
  order: z.number().int().default(0),
  parentId: z.number().optional().nullable(),
  targetBlank: z.boolean().default(false),
});

type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

const ContentManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("pages");
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<any>(null);
  const [currentMenu, setCurrentMenu] = useState<any>(null);
  const [currentMenuItem, setCurrentMenuItem] = useState<any>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [pageContent, setPageContent] = useState("");
  const [deletePageId, setDeletePageId] = useState<number | null>(null);
  const [deleteMenuId, setDeleteMenuId] = useState<number | null>(null);
  const [deleteMenuItemId, setDeleteMenuItemId] = useState<number | null>(null);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  
  // Form için
  const pageForm = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      isPublished: true,
      isHomepage: false,
      metaTitle: '',
      metaDescription: '',
      featuredImage: '',
    }
  });

  const menuForm = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      name: '',
      location: 'header',
      isActive: true,
    }
  });

  const menuItemForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      menuId: 0,
      label: '',
      url: '',
      order: 0,
      parentId: null,
      targetBlank: false,
    }
  });
  
  // Sayfa listesi sorgusu
  const { 
    data: pages,
    isLoading: isPagesLoading,
    error: pagesError,
    refetch: refetchPages
  } = useQuery({
    queryKey: ['/api/admin/pages'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/pages');
      return response.json();
    },
    enabled: activeTab === "pages"
  });
  
  // Menü listesi sorgusu
  const { 
    data: menus,
    isLoading: isMenusLoading,
    error: menusError,
    refetch: refetchMenus
  } = useQuery({
    queryKey: ['/api/admin/menus'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/menus');
      return response.json();
    },
    enabled: activeTab === "menus"
  });

  // Menü öğeleri sorgusu (seçilen menü için)
  const {
    data: menuItems,
    isLoading: isMenuItemsLoading,
    error: menuItemsError,
    refetch: refetchMenuItems
  } = useQuery({
    queryKey: ['/api/admin/menu-items', selectedMenuId],
    queryFn: async () => {
      if (!selectedMenuId) return [];
      const response = await apiRequest('GET', `/api/admin/menu-items?menuId=${selectedMenuId}`);
      return response.json();
    },
    enabled: !!selectedMenuId && activeTab === "menus"
  });

  // Sayfa oluşturma mutasyonu
  const createPageMutation = useMutation({
    mutationFn: async (data: PageFormValues) => {
      const response = await apiRequest('POST', '/api/admin/pages', {
        ...data,
        content: pageContent,
        authorId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sayfa başarıyla oluşturuldu.",
        variant: "default",
      });
      setIsPageModalOpen(false);
      pageForm.reset();
      setPageContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Sayfa oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Sayfa güncelleme mutasyonu
  const updatePageMutation = useMutation({
    mutationFn: async (data: PageFormValues & { id: number }) => {
      const { id, ...pageData } = data;
      const response = await apiRequest('PATCH', `/api/admin/pages/${id}`, {
        ...pageData,
        content: pageContent
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sayfa başarıyla güncellendi.",
        variant: "default",
      });
      setIsPageModalOpen(false);
      pageForm.reset();
      setPageContent("");
      setCurrentPage(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Sayfa güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Sayfa silme mutasyonu
  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/pages/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sayfa başarıyla silindi.",
        variant: "default",
      });
      setIsAlertDialogOpen(false);
      setDeletePageId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Sayfa silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Menü oluşturma mutasyonu
  const createMenuMutation = useMutation({
    mutationFn: async (data: MenuFormValues) => {
      const response = await apiRequest('POST', '/api/admin/menus', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Başarılı",
        description: "Menü başarıyla oluşturuldu.",
        variant: "default",
      });
      setIsMenuModalOpen(false);
      menuForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menus'] });
      // Yeni oluşturulan menüyü otomatik olarak seç
      setSelectedMenuId(data.id);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Menü oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Menü güncelleme mutasyonu
  const updateMenuMutation = useMutation({
    mutationFn: async (data: MenuFormValues & { id: number }) => {
      const { id, ...menuData } = data;
      const response = await apiRequest('PATCH', `/api/admin/menus/${id}`, menuData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Menü başarıyla güncellendi.",
        variant: "default",
      });
      setIsMenuModalOpen(false);
      menuForm.reset();
      setCurrentMenu(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menus'] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Menü güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Menü silme mutasyonu
  const deleteMenuMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/menus/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Menü başarıyla silindi.",
        variant: "default",
      });
      setIsAlertDialogOpen(false);
      setDeleteMenuId(null);
      if (selectedMenuId === deleteMenuId) {
        setSelectedMenuId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menus'] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Menü silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Menü öğesi oluşturma mutasyonu
  const createMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormValues) => {
      const response = await apiRequest('POST', '/api/admin/menu-items', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Menü öğesi başarıyla oluşturuldu.",
        variant: "default",
      });
      setIsMenuItemModalOpen(false);
      menuItemForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items', selectedMenuId] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Menü öğesi oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Menü öğesi güncelleme mutasyonu
  const updateMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormValues & { id: number }) => {
      const { id, ...menuItemData } = data;
      const response = await apiRequest('PATCH', `/api/admin/menu-items/${id}`, menuItemData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Menü öğesi başarıyla güncellendi.",
        variant: "default",
      });
      setIsMenuItemModalOpen(false);
      menuItemForm.reset();
      setCurrentMenuItem(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items', selectedMenuId] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Menü öğesi güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Menü öğesi silme mutasyonu
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/menu-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Menü öğesi başarıyla silindi.",
        variant: "default",
      });
      setIsAlertDialogOpen(false);
      setDeleteMenuItemId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items', selectedMenuId] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Menü öğesi silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  });

  // Sayfa düzenleme fonksiyonu
  const handleEditPage = (page: any) => {
    setCurrentPage(page);
    setPageContent(page.content || "");
    pageForm.reset({
      title: page.title,
      slug: page.slug,
      isPublished: page.isPublished,
      isHomepage: page.isHomepage,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
      featuredImage: page.featuredImage || ""
    });
    setIsPageModalOpen(true);
  };

  // Menü düzenleme fonksiyonu
  const handleEditMenu = (menu: any) => {
    setCurrentMenu(menu);
    menuForm.reset({
      name: menu.name,
      location: menu.location,
      isActive: menu.isActive
    });
    setIsMenuModalOpen(true);
  };

  // Menü öğesi düzenleme fonksiyonu
  const handleEditMenuItem = (menuItem: any) => {
    setCurrentMenuItem(menuItem);
    menuItemForm.reset({
      menuId: menuItem.menuId,
      label: menuItem.label,
      url: menuItem.url,
      order: menuItem.order || 0,
      parentId: menuItem.parentId,
      targetBlank: menuItem.targetBlank || false
    });
    setIsMenuItemModalOpen(true);
  };

  // Sayfa silme fonksiyonu
  const handleDeletePage = () => {
    if (deletePageId) {
      deletePageMutation.mutate(deletePageId);
    }
  };

  // Menü silme fonksiyonu
  const handleDeleteMenu = () => {
    if (deleteMenuId) {
      deleteMenuMutation.mutate(deleteMenuId);
    }
  };

  // Menü öğesi silme fonksiyonu
  const handleDeleteMenuItem = () => {
    if (deleteMenuItemId) {
      deleteMenuItemMutation.mutate(deleteMenuItemId);
    }
  };

  // Sayfa formu submit handler
  const onPageSubmit = (data: PageFormValues) => {
    if (currentPage) {
      updatePageMutation.mutate({ ...data, id: currentPage.id });
    } else {
      createPageMutation.mutate(data);
    }
  };

  // Menü formu submit handler
  const onMenuSubmit = (data: MenuFormValues) => {
    if (currentMenu) {
      updateMenuMutation.mutate({ ...data, id: currentMenu.id });
    } else {
      createMenuMutation.mutate(data);
    }
  };

  // Menü öğesi formu submit handler
  const onMenuItemSubmit = (data: MenuItemFormValues) => {
    if (currentMenuItem) {
      updateMenuItemMutation.mutate({ ...data, id: currentMenuItem.id });
    } else {
      createMenuItemMutation.mutate(data);
    }
  };

  // Menü öğesi ekleme modalını aç
  const handleAddMenuItem = () => {
    if (!selectedMenuId) {
      toast({
        title: "Uyarı",
        description: "Lütfen önce bir menü seçin.",
        variant: "default",
      });
      return;
    }
    setCurrentMenuItem(null);
    menuItemForm.reset({
      menuId: selectedMenuId,
      label: '',
      url: '',
      order: 0,
      parentId: null,
      targetBlank: false
    });
    setIsMenuItemModalOpen(true);
  };

  return (
    <AdminLayout title="İçerik Yönetimi">
      <Tabs 
        defaultValue="pages" 
        onValueChange={(value) => setActiveTab(value)}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="pages">Sayfalar</TabsTrigger>
          <TabsTrigger value="menus">Menüler</TabsTrigger>
        </TabsList>
        
        {/* Sayfalar içeriği */}
        <TabsContent value="pages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tüm Sayfalar</CardTitle>
                <CardDescription>Site içerisindeki tüm sayfaları yönetin.</CardDescription>
              </div>
              <Button onClick={() => {
                setCurrentPage(null);
                pageForm.reset({
                  title: '',
                  slug: '',
                  isPublished: true,
                  isHomepage: false,
                  metaTitle: '',
                  metaDescription: '',
                  featuredImage: ''
                });
                setPageContent("");
                setIsPageModalOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Sayfa Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {isPagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pagesError ? (
                <div className="text-center py-8 text-destructive">
                  Sayfalar yüklenirken bir hata oluştu.
                </div>
              ) : pages && pages.length > 0 ? (
                <Table>
                  <TableCaption>Toplam {pages.length} sayfa</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Başlık</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Ana Sayfa</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page: any) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell>/{page.slug}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${page.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {page.isPublished ? 'Yayında' : 'Taslak'}
                          </span>
                        </TableCell>
                        <TableCell>{page.isHomepage ? 'Evet' : 'Hayır'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditPage(page)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              setDeletePageId(page.id);
                              setIsAlertDialogOpen(true);
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz sayfa bulunmuyor. Yeni bir sayfa ekleyin.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Menüler içeriği */}
        <TabsContent value="menus">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Menüler</CardTitle>
                    <CardDescription>Site menülerini yönetin.</CardDescription>
                  </div>
                  <Button onClick={() => {
                    setCurrentMenu(null);
                    menuForm.reset({
                      name: '',
                      location: 'header',
                      isActive: true
                    });
                    setIsMenuModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Menü
                  </Button>
                </CardHeader>
                <CardContent>
                  {isMenusLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : menusError ? (
                    <div className="text-center py-8 text-destructive">
                      Menüler yüklenirken bir hata oluştu.
                    </div>
                  ) : menus && menus.length > 0 ? (
                    <div className="space-y-2">
                      {menus.map((menu: any) => (
                        <div 
                          key={menu.id} 
                          className={`p-3 border rounded-md flex justify-between items-center cursor-pointer ${selectedMenuId === menu.id ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => setSelectedMenuId(menu.id)}
                        >
                          <div>
                            <div className="font-medium">{menu.name}</div>
                            <div className="text-xs text-muted-foreground">Konum: {menu.location}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => {
                              e.stopPropagation();
                              handleEditMenu(menu);
                            }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => {
                              e.stopPropagation();
                              setDeleteMenuId(menu.id);
                              setIsAlertDialogOpen(true);
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Henüz menü bulunmuyor. Yeni bir menü ekleyin.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedMenuId && menus ? 
                        `${menus.find((m: any) => m.id === selectedMenuId)?.name} Menü Öğeleri` : 
                        'Menü Öğeleri'}
                    </CardTitle>
                    <CardDescription>Menü öğelerini yönetin.</CardDescription>
                  </div>
                  <Button 
                    onClick={handleAddMenuItem}
                    disabled={!selectedMenuId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Menü Öğesi Ekle
                  </Button>
                </CardHeader>
                <CardContent>
                  {!selectedMenuId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Lütfen menü öğelerini görüntülemek için soldaki listeden bir menü seçin.
                    </div>
                  ) : isMenuItemsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : menuItemsError ? (
                    <div className="text-center py-8 text-destructive">
                      Menü öğeleri yüklenirken bir hata oluştu.
                    </div>
                  ) : menuItems && menuItems.length > 0 ? (
                    <Table>
                      <TableCaption>Toplam {menuItems.length} menü öğesi</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Etiket</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>Sıra</TableHead>
                          <TableHead>Hedef</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {menuItems.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.label}</TableCell>
                            <TableCell>{item.url}</TableCell>
                            <TableCell>{item.order || 0}</TableCell>
                            <TableCell>{item.targetBlank ? '_blank' : '_self'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditMenuItem(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setDeleteMenuItemId(item.id);
                                  setIsAlertDialogOpen(true);
                                }}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu menüde henüz öğe bulunmuyor. Yeni bir menü öğesi ekleyin.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sayfa Ekleme/Düzenleme Modalı */}
      <Dialog open={isPageModalOpen} onOpenChange={setIsPageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentPage ? "Sayfayı Düzenle" : "Yeni Sayfa Ekle"}</DialogTitle>
            <DialogDescription>
              {currentPage ? "Mevcut sayfayı düzenle" : "Siteye yeni bir sayfa ekleyin"}
            </DialogDescription>
          </DialogHeader>
          <Form {...pageForm}>
            <form onSubmit={pageForm.handleSubmit(onPageSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={pageForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sayfa Başlığı</FormLabel>
                      <FormControl>
                        <Input placeholder="Sayfa başlığı girin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pageForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Eki</FormLabel>
                      <FormControl>
                        <Input placeholder="ornek-sayfa" {...field} />
                      </FormControl>
                      <FormDescription>
                        Adres çubuğunda görünecek URL (boşluk ve Türkçe karakter kullanmayın)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <FormLabel>Sayfa İçeriği</FormLabel>
                <ReactQuill 
                  theme="snow" 
                  value={pageContent} 
                  onChange={setPageContent} 
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                  className="h-64 mb-12"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={pageForm.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Başlık</FormLabel>
                      <FormControl>
                        <Input placeholder="SEO için meta başlık" {...field} />
                      </FormControl>
                      <FormDescription>
                        Eğer boş bırakılırsa sayfa başlığı kullanılır
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pageForm.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Öne Çıkan Görsel URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={pageForm.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="SEO için meta açıklama" {...field} rows={3} />
                    </FormControl>
                    <FormDescription>
                      Arama motorlarında görüntülenecek kısa açıklama (max 160 karakter)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={pageForm.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Yayınla</FormLabel>
                      <FormDescription className="ml-auto">
                        Sayfa yayınlansın mı?
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={pageForm.control}
                  name="isHomepage"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Ana Sayfa</FormLabel>
                      <FormDescription className="ml-auto">
                        Bu sayfayı ana sayfa yap
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsPageModalOpen(false)}
                >
                  İptal
                </Button>
                <Button 
                  type="submit"
                  disabled={createPageMutation.isPending || updatePageMutation.isPending}
                >
                  {(createPageMutation.isPending || updatePageMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {currentPage ? "Güncelle" : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Menü Ekleme/Düzenleme Modalı */}
      <Dialog open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMenu ? "Menüyü Düzenle" : "Yeni Menü Ekle"}</DialogTitle>
            <DialogDescription>
              {currentMenu ? "Mevcut menüyü düzenle" : "Siteye yeni bir menü ekleyin"}
            </DialogDescription>
          </DialogHeader>
          <Form {...menuForm}>
            <form onSubmit={menuForm.handleSubmit(onMenuSubmit)} className="space-y-4">
              <FormField
                control={menuForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menü Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Menü adı girin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={menuForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menü Konumu</FormLabel>
                    <FormControl>
                      <select 
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        {...field}
                      >
                        <option value="header">Header (Üst)</option>
                        <option value="footer">Footer (Alt)</option>
                        <option value="sidebar">Sidebar (Yan)</option>
                        <option value="mobile">Mobile (Mobil)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={menuForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Aktif</FormLabel>
                    <FormDescription className="ml-auto">
                      Menü sitede gösterilsin mi?
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsMenuModalOpen(false)}
                >
                  İptal
                </Button>
                <Button 
                  type="submit"
                  disabled={createMenuMutation.isPending || updateMenuMutation.isPending}
                >
                  {(createMenuMutation.isPending || updateMenuMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {currentMenu ? "Güncelle" : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Menü Öğesi Ekleme/Düzenleme Modalı */}
      <Dialog open={isMenuItemModalOpen} onOpenChange={setIsMenuItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMenuItem ? "Menü Öğesini Düzenle" : "Yeni Menü Öğesi Ekle"}</DialogTitle>
            <DialogDescription>
              {currentMenuItem ? "Mevcut menü öğesini düzenle" : "Menüye yeni bir öğe ekleyin"}
            </DialogDescription>
          </DialogHeader>
          <Form {...menuItemForm}>
            <form onSubmit={menuItemForm.handleSubmit(onMenuItemSubmit)} className="space-y-4">
              <FormField
                control={menuItemForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etiket</FormLabel>
                    <FormControl>
                      <Input placeholder="Menü öğesi etiketi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={menuItemForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="/hakkimizda" {...field} />
                    </FormControl>
                    <FormDescription>
                      Tam URL (/ile başlamalı) veya dış bağlantı (http://ile başlamalı)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={menuItemForm.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sıra</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Menüdeki sıralama (küçük sayılar önce gösterilir)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {menuItems && menuItems.length > 0 && (
                <FormField
                  control={menuItemForm.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Üst Menü Öğesi</FormLabel>
                      <FormControl>
                        <select 
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        >
                          <option value="">Yok (Ana seviye)</option>
                          {menuItems.map((item: any) => (
                            // Kendisini üst öğe olarak seçememeli
                            currentMenuItem && item.id === currentMenuItem.id ? null : (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            )
                          ))}
                        </select>
                      </FormControl>
                      <FormDescription>
                        Alt menü için üst öğe seçin veya ana seviye için boş bırakın
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={menuItemForm.control}
                name="targetBlank"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Yeni pencerede aç</FormLabel>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsMenuItemModalOpen(false)}
                >
                  İptal
                </Button>
                <Button 
                  type="submit"
                  disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                >
                  {(createMenuItemMutation.isPending || updateMenuItemMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {currentMenuItem ? "Güncelle" : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Silme Doğrulama Dialog */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletePageId ? 
                "Bu sayfa kalıcı olarak silinecektir. Bu işlem geri alınamaz." : 
                deleteMenuId ? 
                "Bu menü kalıcı olarak silinecektir. Menüye ait tüm öğeler de silinecektir. Bu işlem geri alınamaz." :
                "Bu menü öğesi kalıcı olarak silinecektir. Bu işlem geri alınamaz."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePageId ? handleDeletePage : (deleteMenuId ? handleDeleteMenu : handleDeleteMenuItem)}
              className="bg-destructive text-destructive-foreground"
            >
              {(deletePageMutation.isPending || deleteMenuMutation.isPending || deleteMenuItemMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default ContentManagement;