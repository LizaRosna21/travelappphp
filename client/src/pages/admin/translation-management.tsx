import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Search, Trash, Edit, RefreshCw, Check, X, Info, AlertTriangle, Download, Upload, Languages, Globe, FileWarning, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layouts/admin-layout";

// Tip tanımlamaları
interface TranslationFunction {
  id: number;
  name: string;
  description: string | null;
  category: string;
  parameters: string[] | null;
  isCore: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TranslationItem {
  id: number;
  functionId: number;
  languageId: number;
  itemKey: string;
  itemValue: string;
  createdAt: string;
  updatedAt: string;
  functionName?: string;
  languageCode?: string;
  functionCategory?: string;
  languageName?: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  localName: string;
  flagEmoji: string;
  rtl: boolean;
}

// Ana bileşen
function TranslationManagement() {
  const [activeTab, setActiveTab] = useState("languages");
  const { toast } = useToast();
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-4">
        <h1 className="text-3xl font-bold">Çeviri Yönetimi</h1>
        <p className="text-muted-foreground">Sistem genelinde kullanılan çevirileri ve dil ayarlarını yönetin</p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="languages" className="flex-1">
              <Languages className="mr-2 h-4 w-4" />
              Dil Yönetimi
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex-1">
              <Globe className="mr-2 h-4 w-4" />
              Çeviri Fonksiyonları
            </TabsTrigger>
            <TabsTrigger value="items" className="flex-1">
              <FileCheck className="mr-2 h-4 w-4" />
              Çeviri Öğeleri
            </TabsTrigger>
            <TabsTrigger value="missing" className="flex-1">
              <FileWarning className="mr-2 h-4 w-4" />
              Eksik Çeviriler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="languages" className="mt-6">
            <LanguagesTab />
          </TabsContent>

          <TabsContent value="functions" className="mt-6">
            <TranslationFunctionsTab />
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <TranslationItemsTab />
          </TabsContent>
          
          <TabsContent value="missing" className="mt-6">
            <MissingTranslationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Dil Yönetimi Sekmesi
function LanguagesTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const { toast } = useToast();
  
  // Dilleri getir
  const { data: languages, isLoading, error, refetch } = useQuery<Language[]>({
    queryKey: ['/api/admin/languages'],
    refetchOnWindowFocus: false,
  });
  
  // Dil ekleme
  const createLanguageMutation = useMutation({
    mutationFn: async (data: Omit<Language, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/admin/languages', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Dil başarıyla eklendi.",
      });
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Dil eklenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Dil ekleme hatası:", error);
    }
  });
  
  // Dil güncelleme
  const updateLanguageMutation = useMutation({
    mutationFn: async (data: Partial<Language> & { id: number }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest('PATCH', `/api/admin/languages/${id}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Dil başarıyla güncellendi.",
      });
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Dil güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Dil güncelleme hatası:", error);
    }
  });
  
  // Dil silme
  const deleteLanguageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/languages/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Dil başarıyla silindi.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Dil silinirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Dil silme hatası:", error);
    }
  });
  
  // Yükleniyor veya hata durumlarını kontrol et
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
        <span className="text-lg font-medium text-primary">Yükleniyor</span>
        <p className="text-sm text-muted-foreground mt-2">Dil bilgileri yükleniyor...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-destructive text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Dil bilgileri yüklenirken bir hata oluştu</h3>
          <p className="text-muted-foreground mb-4">Sunucu isteği işlenirken beklenmeyen bir hata meydana geldi.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Yeniden Dene
          </Button>
        </div>
      </div>
    );
  }
  
  const handleAddLanguage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      localName: formData.get('localName') as string,
      flagEmoji: formData.get('flagEmoji') as string,
      rtl: formData.get('rtl') === 'true',
      isActive: formData.get('isActive') === 'true',
      isDefault: formData.get('isDefault') === 'true',
    };
    
    createLanguageMutation.mutate(data);
  };
  
  const handleEditLanguage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedLanguage) return;
    
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: selectedLanguage.id,
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      localName: formData.get('localName') as string,
      flagEmoji: formData.get('flagEmoji') as string,
      rtl: formData.get('rtl') === 'true',
      isActive: formData.get('isActive') === 'true',
      isDefault: formData.get('isDefault') === 'true',
    };
    
    updateLanguageMutation.mutate(data);
  };
  
  const openEditDialog = (language: Language) => {
    setSelectedLanguage(language);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteLanguage = (id: number) => {
    if (confirm('Bu dili silmek istediğinize emin misiniz?')) {
      deleteLanguageMutation.mutate(id);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dil Yönetimi</CardTitle>
        <CardDescription>Sistemde desteklenen dilleri yönetin</CardDescription>
        
        <div className="flex justify-end mt-4">
          <Button onClick={() => refetch()} variant="outline" className="mr-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Yenile
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Yeni Dil Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Yeni Dil Ekle</DialogTitle>
                <DialogDescription>
                  Sisteme yeni bir dil ekleyin. Dil kodu ve ismi gereklidir.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddLanguage} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Dil Kodu *</Label>
                    <Input 
                      id="code" 
                      name="code" 
                      placeholder="tr, en, fr, de" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground">
                      ISO 639-1 dil kodu (2 karakter)
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="name">Dil Adı *</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="Turkish, English, French" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="localName">Yerel İsim</Label>
                    <Input 
                      id="localName" 
                      name="localName" 
                      placeholder="Türkçe, English, Français" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Dilin kendi dilindeki adı
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="flagEmoji">Bayrak Emoji</Label>
                    <Input 
                      id="flagEmoji" 
                      name="flagEmoji" 
                      placeholder="🇹🇷, 🇬🇧, 🇫🇷" 
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rtl" name="rtl" value="true" />
                    <Label htmlFor="rtl">Sağdan Sola Yazım (RTL)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="isActive" name="isActive" value="true" defaultChecked />
                    <Label htmlFor="isActive">Aktif</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="isDefault" name="isDefault" value="true" />
                    <Label htmlFor="isDefault">Varsayılan Dil</Label>
                    <Popover>
                      <PopoverTrigger>
                        <Info className="h-4 w-4 text-muted-foreground ml-1" />
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <p className="text-sm">
                          Eğer varsayılan olarak işaretlerseniz, diğer varsayılan dil pasif hale gelecektir. 
                          Sistemde sadece bir varsayılan dil olabilir.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createLanguageMutation.isPending}>
                    {createLanguageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {languages && languages.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Dil Kodu</TableHead>
                  <TableHead>Dil Adı</TableHead>
                  <TableHead>Yerel İsim</TableHead>
                  <TableHead className="w-[120px]">Durum</TableHead>
                  <TableHead className="w-[120px]">RTL</TableHead>
                  <TableHead className="w-[120px]">Varsayılan</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {languages.map((language) => (
                  <TableRow key={language.id}>
                    <TableCell className="font-medium text-xl">
                      {language.flagEmoji || "🌐"}
                    </TableCell>
                    <TableCell className="font-medium">{language.code}</TableCell>
                    <TableCell>{language.name}</TableCell>
                    <TableCell>{language.localName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={language.isActive ? "default" : "secondary"}>
                        {language.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {language.rtl ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-gray-300" />}
                    </TableCell>
                    <TableCell>
                      {language.isDefault ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-gray-300" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(language)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteLanguage(language.id)}
                        disabled={language.isDefault}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Henüz hiç dil eklenmemiş. "Yeni Dil Ekle" düğmesi ile dil ekleyebilirsiniz.
          </div>
        )}
        
        {/* Dil Düzenleme Diyaloğu */}
        {selectedLanguage && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Dil Düzenle: {selectedLanguage.name}</DialogTitle>
                <DialogDescription>
                  Dil bilgilerini güncelleyin.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEditLanguage} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-code">Dil Kodu *</Label>
                    <Input 
                      id="edit-code" 
                      name="code" 
                      defaultValue={selectedLanguage.code}
                      required 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Dil Adı *</Label>
                    <Input 
                      id="edit-name" 
                      name="name" 
                      defaultValue={selectedLanguage.name}
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-localName">Yerel İsim</Label>
                    <Input 
                      id="edit-localName" 
                      name="localName" 
                      defaultValue={selectedLanguage.localName} 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-flagEmoji">Bayrak Emoji</Label>
                    <Input 
                      id="edit-flagEmoji" 
                      name="flagEmoji" 
                      defaultValue={selectedLanguage.flagEmoji}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="edit-rtl" 
                      name="rtl" 
                      value="true" 
                      defaultChecked={selectedLanguage.rtl}
                    />
                    <Label htmlFor="edit-rtl">Sağdan Sola Yazım (RTL)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="edit-isActive" 
                      name="isActive" 
                      value="true" 
                      defaultChecked={selectedLanguage.isActive}
                    />
                    <Label htmlFor="edit-isActive">Aktif</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="edit-isDefault" 
                      name="isDefault" 
                      value="true" 
                      defaultChecked={selectedLanguage.isDefault}
                      disabled={selectedLanguage.isDefault}
                    />
                    <Label htmlFor="edit-isDefault">Varsayılan Dil</Label>
                    <Popover>
                      <PopoverTrigger>
                        <Info className="h-4 w-4 text-muted-foreground ml-1" />
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <p className="text-sm">
                          Eğer varsayılan olarak işaretlerseniz, diğer varsayılan dil pasif hale gelecektir. 
                          Sistemde sadece bir varsayılan dil olabilir.
                          {selectedLanguage.isDefault && " Bu dil zaten varsayılan olduğu için değiştirilemiyor."}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateLanguageMutation.isPending}>
                    {updateLanguageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// Çeviri Fonksiyonları Sekmesi
function TranslationFunctionsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<TranslationFunction | null>(null);
  const { toast } = useToast();
  
  // Fonksiyonları getir
  const { data: functions, isLoading, error, refetch } = useQuery<TranslationFunction[]>({
    queryKey: ['/api/admin/translation-functions'],
    refetchOnWindowFocus: false,
  });
  
  // Kategorileri al
  const categories = functions 
    ? [...new Set(functions.map(f => f.category))].sort() 
    : [];
  
  // Fonksiyonları filtrele
  const filteredFunctions = functions 
    ? functions.filter(f => 
        (searchTerm === "" || 
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
        ) &&
        (selectedCategory === null || selectedCategory === "all" || f.category === selectedCategory)
      )
    : [];
  
  // Fonksiyon ekleme
  const createFunctionMutation = useMutation({
    mutationFn: async (data: Omit<TranslationFunction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/admin/translation-functions', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çeviri fonksiyonu başarıyla eklendi.",
      });
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri fonksiyonu eklenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Fonksiyon ekleme hatası:", error);
    }
  });
  
  // Fonksiyon güncelleme
  const updateFunctionMutation = useMutation({
    mutationFn: async (data: Partial<TranslationFunction> & { id: number }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest('PATCH', `/api/admin/translation-functions/${id}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çeviri fonksiyonu başarıyla güncellendi.",
      });
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri fonksiyonu güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Fonksiyon güncelleme hatası:", error);
    }
  });
  
  // Fonksiyon silme
  const deleteFunctionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/translation-functions/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çeviri fonksiyonu başarıyla silindi.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri fonksiyonu silinirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Fonksiyon silme hatası:", error);
    }
  });
  
  // Yükleniyor veya hata durumlarını kontrol et
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
        <span className="text-lg font-medium text-primary">Yükleniyor</span>
        <p className="text-sm text-muted-foreground mt-2">Çeviri fonksiyonları yükleniyor...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-destructive text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Çeviri fonksiyonları yüklenirken bir hata oluştu</h3>
          <p className="text-muted-foreground mb-4">Sunucu isteği işlenirken beklenmeyen bir hata meydana geldi.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Yeniden Dene
          </Button>
        </div>
      </div>
    );
  }
  
  const handleAddFunction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      category: formData.get('category') as string,
      parameters: formData.get('parameters') ? JSON.parse(formData.get('parameters') as string) : [],
      isCore: formData.get('isCore') === 'true',
    };
    
    createFunctionMutation.mutate(data);
  };
  
  const handleEditFunction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedFunction) return;
    
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: selectedFunction.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      category: formData.get('category') as string,
      parameters: formData.get('parameters') ? JSON.parse(formData.get('parameters') as string) : [],
      isCore: formData.get('isCore') === 'true',
    };
    
    updateFunctionMutation.mutate(data);
  };
  
  const openEditDialog = (func: TranslationFunction) => {
    setSelectedFunction(func);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteFunction = (id: number) => {
    if (confirm('Bu çeviri fonksiyonunu silmek istediğinize emin misiniz? İlişkili tüm çeviri öğeleri de silinecektir.')) {
      deleteFunctionMutation.mutate(id);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Çeviri Fonksiyonları</CardTitle>
        <CardDescription>Sistem genelinde kullanılan çeviri fonksiyonlarını yönetin</CardDescription>
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mt-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Fonksiyon ara..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select 
              value={selectedCategory || "all"} 
              onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Kategori Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Yenile
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Yeni Fonksiyon Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Yeni Çeviri Fonksiyonu Ekle</DialogTitle>
                  <DialogDescription>
                    Yeni bir çeviri fonksiyonu ekleyin. Fonksiyon adı ve kategorisi gereklidir.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleAddFunction} className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Fonksiyon Adı *</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="common.buttons" 
                        required 
                      />
                      <p className="text-xs text-muted-foreground">
                        Nokta (.) ile ayrılmış, modül/kategori yapısı ile isimlendirilmeli
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Fonksiyonun ne işe yaradığını açıklayın" 
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Input 
                        id="category" 
                        name="category" 
                        placeholder="Örn: common, ui, ferry, booking vb." 
                        required 
                        list="categories"
                      />
                      <datalist id="categories">
                        {categories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="parameters">Parametreler</Label>
                      <Textarea 
                        id="parameters" 
                        name="parameters" 
                        placeholder='["name", "date", "price"]' 
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        JSON dizi formatında parametreleri belirtin. Boş bırakılabilir.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="isCore" 
                        name="isCore" 
                        value="true"
                      />
                      <Label htmlFor="isCore">Sistem Fonksiyonu</Label>
                      <Popover>
                        <PopoverTrigger>
                          <Info className="h-4 w-4 text-muted-foreground ml-1" />
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <p className="text-sm">
                            Sistem fonksiyonları uygulamanın temel işleyişi için gerekli olan çevirileri içerir 
                            ve silme işlemlerinde korunur.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button type="submit" disabled={createFunctionMutation.isPending}>
                      {createFunctionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kaydet
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredFunctions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {functions?.length === 0
              ? "Henüz hiç çeviri fonksiyonu eklenmemiş. \"Yeni Fonksiyon Ekle\" düğmesi ile fonksiyon ekleyebilirsiniz."
              : "Aramanızla eşleşen çeviri fonksiyonu bulunamadı."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonksiyon Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Parametreler</TableHead>
                  <TableHead className="w-[100px]">Tür</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFunctions.map((func) => (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium">{func.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{func.category}</Badge>
                    </TableCell>
                    <TableCell>{func.description || "-"}</TableCell>
                    <TableCell>
                      {func.parameters && func.parameters.length > 0
                        ? func.parameters.map((param, index) => (
                            <Badge key={index} variant="secondary" className="mr-1 mb-1">
                              {param}
                            </Badge>
                          ))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={func.isCore ? "default" : "secondary"}>
                        {func.isCore ? "Sistem" : "Uygulama"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(func)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteFunction(func.id)}
                        disabled={func.isCore}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Fonksiyon Düzenleme Diyaloğu */}
        {selectedFunction && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Çeviri Fonksiyonu Düzenle: {selectedFunction.name}</DialogTitle>
                <DialogDescription>
                  Fonksiyon bilgilerini güncelleyin.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEditFunction} className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Fonksiyon Adı *</Label>
                    <Input 
                      id="edit-name" 
                      name="name" 
                      defaultValue={selectedFunction.name}
                      required 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-description">Açıklama</Label>
                    <Textarea 
                      id="edit-description" 
                      name="description" 
                      defaultValue={selectedFunction.description || ""}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-category">Kategori *</Label>
                    <Input 
                      id="edit-category" 
                      name="category" 
                      defaultValue={selectedFunction.category}
                      required 
                      list="edit-categories"
                    />
                    <datalist id="edit-categories">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-parameters">Parametreler</Label>
                    <Textarea 
                      id="edit-parameters" 
                      name="parameters" 
                      defaultValue={selectedFunction.parameters ? JSON.stringify(selectedFunction.parameters) : "[]"}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="edit-isCore" 
                      name="isCore" 
                      value="true"
                      defaultChecked={selectedFunction.isCore}
                    />
                    <Label htmlFor="edit-isCore">Sistem Fonksiyonu</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateFunctionMutation.isPending}>
                    {updateFunctionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// Çeviri Öğeleri Sekmesi
function TranslationItemsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFunction, setSelectedFunction] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TranslationItem | null>(null);
  const { toast } = useToast();
  
  // Dilleri getir
  const { data: languages, isLoading: isLanguagesLoading } = useQuery<Language[]>({
    queryKey: ['/api/admin/languages'],
    refetchOnWindowFocus: false,
  });
  
  // Fonksiyonları getir
  const { data: functions, isLoading: isFunctionsLoading } = useQuery<TranslationFunction[]>({
    queryKey: ['/api/admin/translation-functions'],
    refetchOnWindowFocus: false,
  });
  
  // Çeviri öğelerini getir
  const { data: items, isLoading: isItemsLoading, error, refetch } = useQuery<TranslationItem[]>({
    queryKey: ['/api/admin/translation-items', { functionId: selectedFunction, languageId: selectedLanguage }],
    queryFn: async () => {
      const url = new URL('/api/admin/translation-items', window.location.origin);
      if (selectedFunction) url.searchParams.append('functionId', selectedFunction.toString());
      if (selectedLanguage) url.searchParams.append('languageId', selectedLanguage.toString());
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Çeviri öğeleri alınamadı');
      return response.json();
    },
    refetchOnWindowFocus: false,
  });
  
  // Çeviri öğelerini filtrele
  const filteredItems = items 
    ? items.filter(item => 
        searchTerm === "" || 
        item.itemKey.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.itemValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.functionName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];
  
  // Çeviri öğesi ekleme
  const createItemMutation = useMutation({
    mutationFn: async (data: Omit<TranslationItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/admin/translation-items', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çeviri öğesi başarıyla eklendi.",
      });
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri öğesi eklenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Öğe ekleme hatası:", error);
    }
  });
  
  // Çeviri öğesi güncelleme
  const updateItemMutation = useMutation({
    mutationFn: async (data: Partial<TranslationItem> & { id: number }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest('PATCH', `/api/admin/translation-items/${id}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çeviri öğesi başarıyla güncellendi.",
      });
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri öğesi güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Öğe güncelleme hatası:", error);
    }
  });
  
  // Çeviri öğesi silme
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/translation-items/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çeviri öğesi başarıyla silindi.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri öğesi silinirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Öğe silme hatası:", error);
    }
  });
  
  // Çeviri senkronizasyonu
  const syncMutation = useMutation({
    mutationFn: async ({ targetLanguageId, sourceLanguageId }: { targetLanguageId: number, sourceLanguageId?: number }) => {
      const response = await apiRequest('POST', '/api/admin/translation-sync', { 
        targetLanguageId, 
        sourceLanguageId 
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Senkronizasyon Tamamlandı",
        description: `Toplam ${data.stats.total} öğeden ${data.stats.added} öğe eklendi, ${data.stats.alreadyExists} öğe zaten mevcut, ${data.stats.skipped} öğe atlandi.`,
      });
      setIsSyncDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri senkronizasyonu sırasında bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Senkronizasyon hatası:", error);
    }
  });
  
  // Yükleniyor durumunu kontrol et
  const isLoading = isLanguagesLoading || isFunctionsLoading || isItemsLoading;
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
        <span className="text-lg font-medium text-primary">Yükleniyor</span>
        <p className="text-sm text-muted-foreground mt-2">Çeviri öğeleri yükleniyor...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-destructive text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Çeviri öğeleri yüklenirken bir hata oluştu</h3>
          <p className="text-muted-foreground mb-4">Sunucu isteği işlenirken beklenmeyen bir hata meydana geldi.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Yeniden Dene
          </Button>
        </div>
      </div>
    );
  }
  
  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      functionId: parseInt(formData.get('functionId') as string),
      languageId: parseInt(formData.get('languageId') as string),
      itemKey: formData.get('itemKey') as string,
      itemValue: formData.get('itemValue') as string,
    };
    
    createItemMutation.mutate(data);
  };
  
  const handleEditItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: selectedItem.id,
      itemValue: formData.get('itemValue') as string,
    };
    
    updateItemMutation.mutate(data);
  };
  
  const openEditDialog = (item: TranslationItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteItem = (id: number) => {
    if (confirm('Bu çeviri öğesini silmek istediğinize emin misiniz?')) {
      deleteItemMutation.mutate(id);
    }
  };
  
  const handleSync = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const targetLanguageId = parseInt(formData.get('targetLanguageId') as string);
    const sourceLanguageId = formData.get('sourceLanguageId') 
      ? parseInt(formData.get('sourceLanguageId') as string) 
      : undefined;
    
    syncMutation.mutate({ targetLanguageId, sourceLanguageId });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Çeviri Öğeleri</CardTitle>
        <CardDescription>Çeviri fonksiyonlarına ait çeviri öğelerini yönetin</CardDescription>
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Çeviri öğesi ara..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select 
              value={selectedFunction?.toString() || ""} 
              onValueChange={(value) => setSelectedFunction(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tüm Fonksiyonlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Fonksiyonlar</SelectItem>
                {functions?.map(func => (
                  <SelectItem key={func.id} value={func.id.toString()}>
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={selectedLanguage?.toString() || ""} 
              onValueChange={(value) => setSelectedLanguage(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tüm Diller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Diller</SelectItem>
                {languages?.map(lang => (
                  <SelectItem key={lang.id} value={lang.id.toString()}>
                    {lang.flagEmoji} {lang.name} {lang.isDefault && "(Varsayılan)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Yenile
            </Button>
            
            <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Dil Senkronizasyonu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dil Senkronizasyonu</DialogTitle>
                  <DialogDescription>
                    Bir kaynak dilden hedef dile çevirileri senkronize edin. 
                    Bu işlem, hedef dilde olmayan tüm çeviri öğelerini kaynak dilden kopyalar.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSync} className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="targetLanguageId">Hedef Dil *</Label>
                      <Select name="targetLanguageId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Senkronize edilecek hedef dili seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages?.map(lang => (
                            <SelectItem key={lang.id} value={lang.id.toString()}>
                              {lang.flagEmoji} {lang.name} {lang.isDefault && "(Varsayılan)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="sourceLanguageId">Kaynak Dil (Opsiyonel)</Label>
                      <Select name="sourceLanguageId">
                        <SelectTrigger>
                          <SelectValue placeholder="Varsayılan dil kullanılacak" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Varsayılan Dil</SelectItem>
                          {languages?.map(lang => (
                            <SelectItem key={lang.id} value={lang.id.toString()}>
                              {lang.flagEmoji} {lang.name} {lang.isDefault && "(Varsayılan)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Boş bırakırsanız, sistem varsayılan dili kullanacaktır.
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSyncDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button type="submit" disabled={syncMutation.isPending}>
                      {syncMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Senkronizasyonu Başlat
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Yeni Çeviri Öğesi
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Yeni Çeviri Öğesi Ekle</DialogTitle>
                  <DialogDescription>
                    Seçilen fonksiyon ve dil için yeni bir çeviri öğesi ekleyin.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleAddItem} className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="functionId">Fonksiyon *</Label>
                      <Select name="functionId" required defaultValue={selectedFunction?.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="Fonksiyon seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {functions?.map(func => (
                            <SelectItem key={func.id} value={func.id.toString()}>
                              {func.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="languageId">Dil *</Label>
                      <Select name="languageId" required defaultValue={selectedLanguage?.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="Dil seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages?.map(lang => (
                            <SelectItem key={lang.id} value={lang.id.toString()}>
                              {lang.flagEmoji} {lang.name} {lang.isDefault && "(Varsayılan)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="itemKey">Anahtar *</Label>
                      <Input 
                        id="itemKey" 
                        name="itemKey" 
                        placeholder="success, error, title vb." 
                        required 
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="itemValue">Değer *</Label>
                      <Textarea 
                        id="itemValue" 
                        name="itemValue" 
                        placeholder="Çeviri metni" 
                        rows={3}
                        required 
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button type="submit" disabled={createItemMutation.isPending}>
                      {createItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kaydet
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {items?.length === 0
              ? "Henüz hiç çeviri öğesi eklenmemiş. \"Yeni Çeviri Öğesi\" düğmesi ile çeviri ekleyebilirsiniz."
              : "Aramanızla eşleşen çeviri öğesi bulunamadı."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Dil</TableHead>
                  <TableHead className="w-[200px]">Fonksiyon</TableHead>
                  <TableHead className="w-[150px]">Anahtar</TableHead>
                  <TableHead>Değer</TableHead>
                  <TableHead className="text-right w-[100px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-sm font-normal capitalize">
                        {item.languageCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.functionName}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1 py-0.5 text-sm">
                        {item.itemKey}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md truncate">
                        {item.itemValue}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Çeviri Düzenleme Diyaloğu */}
        {selectedItem && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Çeviri Öğesi Düzenle</DialogTitle>
                <DialogDescription>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-24">Fonksiyon:</span> 
                      <span className="font-medium">{selectedItem.functionName}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-24">Dil:</span> 
                      <span className="font-medium">{selectedItem.languageCode}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-24">Anahtar:</span> 
                      <code className="rounded bg-muted px-1 py-0.5 text-sm">
                        {selectedItem.itemKey}
                      </code>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEditItem} className="space-y-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-itemValue">Değer *</Label>
                  <Textarea 
                    id="edit-itemValue" 
                    name="itemValue" 
                    defaultValue={selectedItem.itemValue}
                    rows={6}
                    required 
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateItemMutation.isPending}>
                    {updateItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// Eksik Çeviriler Sekmesi
function MissingTranslationsTab() {
  const [selectedLanguage, setSelectedLanguage] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Dilleri getir
  const { data: languages, isLoading: isLanguagesLoading } = useQuery<Language[]>({
    queryKey: ['/api/admin/languages'],
    refetchOnWindowFocus: false,
  });
  
  // Eksik çevirileri getir
  const { 
    data: missingData, 
    isLoading: isMissingLoading, 
    error, 
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['/api/admin/translation-missing', selectedLanguage],
    queryFn: async () => {
      if (!selectedLanguage) return null;
      
      const url = new URL('/api/admin/translation-missing', window.location.origin);
      url.searchParams.append('languageId', selectedLanguage.toString());
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Eksik çeviriler alınamadı');
      return response.json();
    },
    enabled: !!selectedLanguage,
    refetchOnWindowFocus: false,
  });
  
  // Eksik çeviriler için çeviri öğesi ekleme 
  const createMissingItemMutation = useMutation({
    mutationFn: async ({ functionId, languageId, itemKey, itemValue }: Omit<TranslationItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/admin/translation-items', {
        functionId,
        languageId,
        itemKey,
        itemValue
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Eksik çeviri öğesi başarıyla eklendi.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çeviri öğesi eklenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Öğe ekleme hatası:", error);
    }
  });
  
  // Yükleniyor durumunu kontrol et
  const isLoading = isLanguagesLoading || (isMissingLoading && !!selectedLanguage);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Eksik Çeviriler</CardTitle>
        <CardDescription>Eksik çevirileri görüntüleyin ve tamamlayın</CardDescription>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2 items-center">
            <Label htmlFor="language-select" className="mr-2">Dil:</Label>
            <Select 
              value={selectedLanguage?.toString() || ""} 
              onValueChange={(value) => setSelectedLanguage(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-64" id="language-select">
                <SelectValue placeholder="Eksik çevirileri görüntülemek için dil seçin" />
              </SelectTrigger>
              <SelectContent>
                {languages?.filter(l => !l.isDefault).map(lang => (
                  <SelectItem key={lang.id} value={lang.id.toString()}>
                    {lang.flagEmoji} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={() => refetch()} variant="outline" disabled={!selectedLanguage || isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> 
            Yenile
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!selectedLanguage ? (
          <div className="text-center py-12 text-muted-foreground">
            Eksik çevirileri görüntülemek için lütfen bir dil seçin
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <span className="text-lg font-medium text-primary">Yükleniyor</span>
            <p className="text-sm text-muted-foreground mt-2">Eksik çeviriler yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-destructive text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Eksik çeviriler yüklenirken bir hata oluştu</h3>
            <p className="text-muted-foreground mb-4">Sunucu isteği işlenirken beklenmeyen bir hata meydana geldi.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" /> Yeniden Dene
            </Button>
          </div>
        ) : !missingData?.missingItems?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Harika! Tüm çeviriler tamamlanmış</h3>
            <p className="text-muted-foreground">
              Seçili dil için eksik çeviri bulunmuyor. Çeviri oranı: %{missingData?.overallCompletion ?? 100}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 p-4 rounded-md bg-muted">
              <h3 className="text-lg font-medium mb-2">Çeviri Durumu</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Genel tamamlanma oranı:</span>
                  <span className="font-medium">%{missingData.overallCompletion}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eksik çeviri olan fonksiyon sayısı:</span>
                  <span className="font-medium">{missingData.functionsWithMissingTranslations} / {missingData.totalFunctions}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {missingData.missingItems.map((item) => (
                <div key={item.functionId} className="border rounded-md overflow-hidden">
                  <div className="bg-muted p-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{item.functionName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Kategori: <Badge variant="outline">{item.functionCategory}</Badge> • 
                        Tamamlanma: <Badge variant={item.completionRate > 80 ? "default" : "destructive"}>
                          %{item.completionRate}
                        </Badge>
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.translatedKeys} / {item.totalKeys} anahtar çevrilmiş
                    </p>
                  </div>
                  
                  <div className="p-3">
                    <table className="w-full">
                      <thead className="text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left w-1/4 pb-2">Anahtar</th>
                          <th className="text-left pb-2">Çeviri</th>
                          <th className="text-right w-24 pb-2">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {item.missingKeys.map((key) => (
                          <tr key={key} className="border-muted">
                            <td className="py-2 pr-4">
                              <code className="rounded bg-muted px-1 py-0.5 text-sm">
                                {key}
                              </code>
                            </td>
                            <td className="py-2">
                              <Input 
                                placeholder="Çeviri ekleyin" 
                                id={`translation-${item.functionId}-${key}`}
                              />
                            </td>
                            <td className="py-2 text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const inputElement = document.getElementById(`translation-${item.functionId}-${key}`) as HTMLInputElement;
                                  const value = inputElement.value.trim();
                                  
                                  if (!value) {
                                    toast({
                                      title: "Hata",
                                      description: "Lütfen bir çeviri girin",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  createMissingItemMutation.mutate({
                                    functionId: item.functionId,
                                    languageId: selectedLanguage,
                                    itemKey: key,
                                    itemValue: value
                                  });
                                }}
                                disabled={createMissingItemMutation.isPending}
                              >
                                {createMissingItemMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : "Ekle"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TranslationManagement;