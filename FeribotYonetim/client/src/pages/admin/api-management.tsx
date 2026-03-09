import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Edit, Key, MoreHorizontal, Plus, RefreshCcw, Trash, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ApiConfig = {
  id: number;
  name: string;
  provider: string;
  apiKey: string;
  secretKey: string | null;
  baseUrl: string | null;
  category: string;
  mode: string;
  isActive: boolean;
  status: string | null;
  lastChecked: string | null;
};

type NewApiConfig = Omit<ApiConfig, "id" | "status" | "lastChecked">;

const ApiManagementPage = () => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<ApiConfig | null>(null);
  const [newApiConfig, setNewApiConfig] = useState<Partial<NewApiConfig>>({
    name: "",
    provider: "",
    apiKey: "",
    secretKey: "",
    baseUrl: "",
    category: "payment",
    mode: "test",
    isActive: true
  });

  // Query to fetch all API configurations
  const { data: apiConfigs = [], isLoading, isError } = useQuery<ApiConfig[]>({
    queryKey: ["/api/admin/api-config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/api-config");
      return response.json();
    }
  });

  // Create new API configuration mutation
  const createApiConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<NewApiConfig>) => {
      const response = await apiRequest("POST", "/api/admin/api-config", newConfig);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Konfigürasyonu Eklendi",
        description: "Yeni API konfigürasyonu başarıyla eklendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-config"] });
      setIsAddDialogOpen(false);
      resetNewApiConfig();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `API konfigürasyonu eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update an API configuration mutation
  const updateApiConfigMutation = useMutation({
    mutationFn: async (updatedConfig: Partial<ApiConfig>) => {
      const response = await apiRequest("PUT", `/api/admin/api-config/${updatedConfig.id}`, updatedConfig);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Konfigürasyonu Güncellendi",
        description: "API konfigürasyonu başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-config"] });
      setIsEditDialogOpen(false);
      setSelectedApi(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `API konfigürasyonu güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete an API configuration mutation
  const deleteApiConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/api-config/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Konfigürasyonu Silindi",
        description: "API konfigürasyonu başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-config"] });
      setIsDeleteDialogOpen(false);
      setSelectedApi(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `API konfigürasyonu silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Test an API configuration mutation
  const testApiConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/api-config/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Test Başarılı" : "Test Başarısız",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-config"] });
      setIsTestDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Test Hatası",
        description: `API testi sırasında bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Reset new API config form
  const resetNewApiConfig = () => {
    setNewApiConfig({
      name: "",
      provider: "",
      apiKey: "",
      secretKey: "",
      baseUrl: "",
      category: "payment",
      mode: "test",
      isActive: true
    });
  };

  // Handle create API config form submission
  const handleCreateApiConfig = () => {
    if (!newApiConfig.name || !newApiConfig.provider || !newApiConfig.apiKey) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    createApiConfigMutation.mutate(newApiConfig);
  };

  // Handle update API config form submission
  const handleUpdateApiConfig = () => {
    if (!selectedApi) return;
    updateApiConfigMutation.mutate(selectedApi);
  };

  // Handle API config edit click
  const handleEditClick = (api: ApiConfig) => {
    setSelectedApi(api);
    setIsEditDialogOpen(true);
  };

  // Handle API config delete click
  const handleDeleteClick = (api: ApiConfig) => {
    setSelectedApi(api);
    setIsDeleteDialogOpen(true);
  };

  // Handle API config test click
  const handleTestClick = (api: ApiConfig) => {
    setSelectedApi(api);
    setIsTestDialogOpen(true);
  };

  // Get unique categories from API configs
  const categories = Array.from(new Set(apiConfigs.map(api => api.category)));

  // Filter API configs by category and search term
  const filteredApiConfigs = apiConfigs.filter(api => {
    const matchesCategory = selectedCategory === "all" || api.category === selectedCategory;
    const matchesSearch = api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          api.provider.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get status badge variant based on status
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Henüz Test Edilmedi</Badge>;
    
    switch (status.toLowerCase()) {
      case "active":
      case "ok":
      case "connected":
        return <Badge className="bg-green-500">Aktif</Badge>;
      case "error":
      case "failed":
        return <Badge variant="destructive">Hata</Badge>;
      case "pending":
        return <Badge variant="secondary">Beklemede</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get category display name
  const getCategoryDisplayName = (category: string) => {
    switch (category.toLowerCase()) {
      case "payment":
        return "Ödeme";
      case "notification":
        return "Bildirim";
      case "integration":
        return "Entegrasyon";
      case "analytics":
        return "Analitik";
      case "supplier":
        return "Tedarikçi";
      default:
        return category;
    }
  };

  return (
    <AdminLayout title="API Yönetimi">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="API adı veya sağlayıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[300px]"
            />
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Yeni API Ekle</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Yeni API Konfigürasyonu</DialogTitle>
                <DialogDescription>
                  Sisteme yeni bir API konfigürasyonu ekleyin. API anahtarları güvenle saklanır.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">API Adı*</Label>
                    <Input
                      id="name"
                      value={newApiConfig.name}
                      onChange={(e) => setNewApiConfig({ ...newApiConfig, name: e.target.value })}
                      placeholder="Stripe, PayTR, Sendgrid vb."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Sağlayıcı*</Label>
                    <Input
                      id="provider"
                      value={newApiConfig.provider}
                      onChange={(e) => setNewApiConfig({ ...newApiConfig, provider: e.target.value })}
                      placeholder="Sağlayıcı firma adı"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori*</Label>
                    <Select
                      value={newApiConfig.category}
                      onValueChange={(value) => setNewApiConfig({ ...newApiConfig, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Kategori Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Ödeme</SelectItem>
                        <SelectItem value="notification">Bildirim</SelectItem>
                        <SelectItem value="integration">Entegrasyon</SelectItem>
                        <SelectItem value="analytics">Analitik</SelectItem>
                        <SelectItem value="supplier">Tedarikçi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mode">Mod*</Label>
                    <Select
                      value={newApiConfig.mode}
                      onValueChange={(value) => setNewApiConfig({ ...newApiConfig, mode: value })}
                    >
                      <SelectTrigger id="mode">
                        <SelectValue placeholder="Mod Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="live">Canlı</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Anahtarı*</Label>
                  <Input
                    id="apiKey"
                    value={newApiConfig.apiKey}
                    onChange={(e) => setNewApiConfig({ ...newApiConfig, apiKey: e.target.value })}
                    placeholder="API Anahtarı"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Gizli Anahtar</Label>
                  <Input
                    id="secretKey"
                    value={newApiConfig.secretKey || ""}
                    onChange={(e) => setNewApiConfig({ ...newApiConfig, secretKey: e.target.value })}
                    placeholder="Gizli Anahtar (opsiyonel)"
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">API URL</Label>
                  <Input
                    id="baseUrl"
                    value={newApiConfig.baseUrl || ""}
                    onChange={(e) => setNewApiConfig({ ...newApiConfig, baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1 (opsiyonel)"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={newApiConfig.isActive}
                    onCheckedChange={(checked) => setNewApiConfig({ ...newApiConfig, isActive: checked as boolean })}
                  />
                  <Label htmlFor="isActive">Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  resetNewApiConfig();
                  setIsAddDialogOpen(false);
                }}>
                  İptal
                </Button>
                <Button onClick={handleCreateApiConfig} disabled={createApiConfigMutation.isPending}>
                  {createApiConfigMutation.isPending ? "Ekleniyor..." : "Ekle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : isError ? (
          <Card className="bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p>API konfigürasyonları yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredApiConfigs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Hiçbir API konfigürasyonu bulunamadı. Yeni bir API eklemek için "Yeni API Ekle" butonunu kullanın.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Adı</TableHead>
                    <TableHead>Sağlayıcı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Mod</TableHead>
                    <TableHead className="text-center">Durum</TableHead>
                    <TableHead className="text-center">Aktif</TableHead>
                    <TableHead className="text-center">Son Kontrol</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApiConfigs.map((api) => (
                    <TableRow key={api.id}>
                      <TableCell className="font-medium">{api.name}</TableCell>
                      <TableCell>{api.provider}</TableCell>
                      <TableCell>{getCategoryDisplayName(api.category)}</TableCell>
                      <TableCell>
                        <Badge variant={api.mode === "live" ? "default" : api.mode === "test" ? "secondary" : "outline"}>
                          {api.mode === "live" ? "Canlı" : api.mode === "test" ? "Test" : "Demo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(api.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {api.isActive ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {api.lastChecked ? new Date(api.lastChecked).toLocaleString("tr-TR", {
                          year: "numeric",
                          month: "2-digit", 
                          day: "2-digit",
                          hour: "2-digit", 
                          minute: "2-digit"
                        }) : "Henüz kontrol edilmedi"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditClick(api)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTestClick(api)}>
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Test Et
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(api)} className="text-red-600">
                              <Trash className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* API Demo Usage Examples */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Örnek API Kullanım Senaryoları</CardTitle>
            <CardDescription>
              Aşağıdaki örnekler, API entegrasyonlarının nasıl kullanılacağını göstermektedir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="payment">
              <TabsList className="mb-4">
                <TabsTrigger value="payment">Ödeme API</TabsTrigger>
                <TabsTrigger value="notification">Bildirim API</TabsTrigger>
                <TabsTrigger value="integration">Entegrasyon API</TabsTrigger>
                <TabsTrigger value="analytics">Analitik API</TabsTrigger>
              </TabsList>
              
              <TabsContent value="payment" className="space-y-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-medium mb-2">Stripe Ödeme İşlemi Örneği</h3>
                  <pre className="bg-slate-900 text-white p-4 rounded-md overflow-auto text-sm">
                    {`// Örnek Stripe ödeme işlemi (Node.js)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency = 'eur') => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Cent cinsinden
      currency: currency,
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    };
  } catch (error) {
    console.error('Ödeme hatası:', error);
    throw new Error('Ödeme işlemi başlatılamadı');
  }
};
`}
                  </pre>
                </div>
                
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-medium mb-2">PayTR Ödeme İşlemi Örneği</h3>
                  <pre className="bg-slate-900 text-white p-4 rounded-md overflow-auto text-sm">
                    {`// Örnek PayTR ödeme işlemi (Node.js)
const axios = require('axios');
const crypto = require('crypto');

const createPayTRPayment = async (orderData) => {
  const { amount, userEmail, userIp, merchantOid } = orderData;
  
  // PayTR için gerekli parametreler
  const params = {
    merchant_id: process.env.PAYTR_MERCHANT_ID,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email: userEmail,
    payment_amount: amount * 100, // Kuruş cinsinden
    currency: 'TL',
    test_mode: process.env.NODE_ENV === 'production' ? '0' : '1',
    // Diğer zorunlu parametreler...
  };
  
  // Hash oluşturma
  const hashStr = \`\${params.merchant_id}\${userIp}\${merchantOid}\${userEmail}\${params.payment_amount}\${process.env.PAYTR_MERCHANT_SALT}\`;
  const hash = crypto.createHmac('sha256', process.env.PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');
  
  params.merchant_key = process.env.PAYTR_MERCHANT_KEY;
  params.paytr_token = hash;
  
  // İsteği gönder
  const response = await axios.post('https://www.paytr.com/odeme/api/get-token', params);
  
  return {
    token: response.data.token,
    url: \`https://www.paytr.com/odeme/guvenli/\${response.data.token}\`,
  };
};
`}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="notification" className="space-y-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-medium mb-2">SendGrid E-posta Gönderimi Örneği</h3>
                  <pre className="bg-slate-900 text-white p-4 rounded-md overflow-auto text-sm">
                    {`// Örnek SendGrid e-posta gönderimi (Node.js)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendBookingConfirmation = async (bookingData) => {
  const { email, name, bookingReference, departurePort, arrivalPort, departureDate } = bookingData;
  
  const msg = {
    to: email,
    from: 'rezervasyon@feribot.com',
    subject: 'Rezervasyon Onayı - ' + bookingReference,
    templateId: 'd-f3a1b2c3d4e5f6g7h8i9j0',
    dynamicTemplateData: {
      name: name,
      booking_reference: bookingReference,
      departure_port: departurePort,
      arrival_port: arrivalPort,
      departure_date: departureDate,
      // Diğer şablon verileri...
    },
  };
  
  try {
    await sgMail.send(msg);
    return { success: true, message: 'E-posta başarıyla gönderildi' };
  } catch (error) {
    console.error('E-posta gönderim hatası:', error);
    throw new Error('E-posta gönderilemedi');
  }
};
`}
                  </pre>
                </div>
                
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-medium mb-2">WhatsApp Mesaj Gönderimi Örneği</h3>
                  <pre className="bg-slate-900 text-white p-4 rounded-md overflow-auto text-sm">
                    {`// Örnek WhatsApp mesaj gönderimi (Node.js)
const axios = require('axios');

const sendWhatsAppMessage = async (messageData) => {
  const { phoneNumber, templateName, parameters } = messageData;
  
  // WhatsApp Business API konfigürasyonu
  const config = {
    headers: {
      'Authorization': \`Bearer \${process.env.WHATSAPP_API_TOKEN}\`,
      'Content-Type': 'application/json',
    },
  };
  
  // WhatsApp API'sine gönderilecek veri
  const data = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'tr',
      },
      components: [
        {
          type: 'body',
          parameters: parameters.map(param => ({
            type: 'text',
            text: param,
          })),
        },
      ],
    },
  };
  
  try {
    const response = await axios.post(
      \`https://graph.facebook.com/v13.0/\${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages\`,
      data,
      config
    );
    
    return {
      success: true,
      messageId: response.data.messages[0].id,
    };
  } catch (error) {
    console.error('WhatsApp mesaj hatası:', error);
    throw new Error('WhatsApp mesajı gönderilemedi');
  }
};
`}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="integration" className="space-y-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-medium mb-2">Backoffice Entegrasyonu Örneği</h3>
                  <pre className="bg-slate-900 text-white p-4 rounded-md overflow-auto text-sm">
                    {`// Örnek Backoffice entegrasyonu (Node.js)
const axios = require('axios');

const syncBookings = async (startDate, endDate) => {
  try {
    // API konfigürasyonu
    const config = {
      headers: {
        'Authorization': \`Bearer \${process.env.BACKOFFICE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
    };
    
    // Rezervasyonları getir
    const bookingsResponse = await axios.get(
      \`\${process.env.BACKOFFICE_API_URL}/bookings\`,
      {
        ...config,
        params: {
          startDate,
          endDate,
          status: 'confirmed',
        },
      }
    );
    
    const bookings = bookingsResponse.data.bookings;
    
    // Rezervasyonları sistem veritabanına kaydet
    for (const booking of bookings) {
      // Burada rezervasyonları sisteme kaydeden kodlar olacak
      await saveBookingToDatabase(booking);
    }
    
    return {
      success: true,
      syncedCount: bookings.length,
      message: \`\${bookings.length} rezervasyon başarıyla senkronize edildi\`,
    };
  } catch (error) {
    console.error('Senkronizasyon hatası:', error);
    throw new Error('Rezervasyonlar senkronize edilemedi');
  }
};

// Rezervasyonu veritabanına kaydet (örnek fonksiyon)
const saveBookingToDatabase = async (booking) => {
  // Veritabanı işlemleri burada olacak
};
`}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-medium mb-2">Google Analytics Entegrasyonu Örneği</h3>
                  <pre className="bg-slate-900 text-white p-4 rounded-md overflow-auto text-sm">
                    {`// Örnek Google Analytics etkinlik gönderimi (JavaScript)
const sendAnalyticsEvent = (eventCategory, eventAction, eventLabel, eventValue) => {
  if (typeof gtag !== 'function') {
    console.error('Google Analytics yüklenmemiş');
    return;
  }
  
  gtag('event', eventAction, {
    'event_category': eventCategory,
    'event_label': eventLabel,
    'value': eventValue
  });
};

// Kullanım örneği
const trackCompletedBooking = (bookingData) => {
  const { bookingReference, totalPrice, currency, route } = bookingData;
  
  sendAnalyticsEvent(
    'Bookings',
    'purchase',
    \`\${route.departurePort} to \${route.arrivalPort}\`,
    totalPrice
  );
  
  // Enhanced e-commerce için
  gtag('event', 'purchase', {
    transaction_id: bookingReference,
    value: totalPrice,
    currency: currency,
    items: [
      {
        id: route.id,
        name: \`\${route.departurePort} - \${route.arrivalPort}\`,
        category: 'Ferry Tickets',
        quantity: 1,
        price: totalPrice
      }
    ]
  });
};
`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>API Konfigürasyonu Düzenle</DialogTitle>
            <DialogDescription>
              {selectedApi?.name} API konfigürasyonunu düzenleyin.
            </DialogDescription>
          </DialogHeader>
          {selectedApi && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">API Adı*</Label>
                  <Input
                    id="edit-name"
                    value={selectedApi.name}
                    onChange={(e) => setSelectedApi({ ...selectedApi, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-provider">Sağlayıcı*</Label>
                  <Input
                    id="edit-provider"
                    value={selectedApi.provider}
                    onChange={(e) => setSelectedApi({ ...selectedApi, provider: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Kategori*</Label>
                  <Select
                    value={selectedApi.category}
                    onValueChange={(value) => setSelectedApi({ ...selectedApi, category: value })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Kategori Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Ödeme</SelectItem>
                      <SelectItem value="notification">Bildirim</SelectItem>
                      <SelectItem value="integration">Entegrasyon</SelectItem>
                      <SelectItem value="analytics">Analitik</SelectItem>
                      <SelectItem value="supplier">Tedarikçi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mode">Mod*</Label>
                  <Select
                    value={selectedApi.mode}
                    onValueChange={(value) => setSelectedApi({ ...selectedApi, mode: value })}
                  >
                    <SelectTrigger id="edit-mode">
                      <SelectValue placeholder="Mod Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Canlı</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apiKey">API Anahtarı*</Label>
                <Input
                  id="edit-apiKey"
                  value={selectedApi.apiKey}
                  onChange={(e) => setSelectedApi({ ...selectedApi, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secretKey">Gizli Anahtar</Label>
                <Input
                  id="edit-secretKey"
                  value={selectedApi.secretKey || ""}
                  onChange={(e) => setSelectedApi({ ...selectedApi, secretKey: e.target.value })}
                  type="password"
                  placeholder="**********"
                />
                <p className="text-sm text-muted-foreground">
                  Değiştirmek istemiyorsanız boş bırakın, mevcut değer korunacaktır.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-baseUrl">API URL</Label>
                <Input
                  id="edit-baseUrl"
                  value={selectedApi.baseUrl || ""}
                  onChange={(e) => setSelectedApi({ ...selectedApi, baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={selectedApi.isActive}
                  onCheckedChange={(checked) => setSelectedApi({ ...selectedApi, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Aktif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateApiConfig} disabled={updateApiConfigMutation.isPending}>
              {updateApiConfigMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>API Konfigürasyonunu Sil</DialogTitle>
            <DialogDescription>
              Bu işlem {selectedApi?.name} API konfigürasyonunu kalıcı olarak silecektir. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-destructive">
              Bu API'yi kullanan sistemler etkilenecektir. Devam etmek istediğinizden emin misiniz?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedApi && deleteApiConfigMutation.mutate(selectedApi.id)}
              disabled={deleteApiConfigMutation.isPending}
            >
              {deleteApiConfigMutation.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>API Bağlantısını Test Et</DialogTitle>
            <DialogDescription>
              {selectedApi?.name} API bağlantısını test etmek üzeresiniz. Bu işlem gerçek bir API çağrısı yapacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Test sırasında {selectedApi?.mode === "live" ? "canlı" : "test"} mod kullanılacaktır. Devam etmek istiyor musunuz?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={() => selectedApi && testApiConfigMutation.mutate(selectedApi.id)}
              disabled={testApiConfigMutation.isPending}
            >
              {testApiConfigMutation.isPending ? "Test Ediliyor..." : "Test Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ApiManagementPage;