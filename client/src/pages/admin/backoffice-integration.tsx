import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Edit, Key, MoreHorizontal, Pencil, Plus, RefreshCcw, Trash, Bus, Download, Upload, Link, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import type { BusWagnerSupplier, InsertBusWagnerSupplier } from "@shared/schema";

const BackofficeIntegrationPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [selectedSupplier, setSelectedSupplier] = useState<BusWagnerSupplier | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [newSupplier, setNewSupplier] = useState<Partial<InsertBusWagnerSupplier>>({
    name: "",
    code: "",
    country: "TR",
    apiEndpoint: "",
    apiKey: "",
    secretKey: "",
    isActive: true,
    status: "active",
    connectionParams: {},
  });

  // Fetch suppliers
  const { 
    data: suppliers = [], 
    isLoading: suppliersLoading,
    error: suppliersError 
  } = useQuery<BusWagnerSupplier[]>({
    queryKey: ["/api/backoffice/suppliers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/backoffice/suppliers");
        return response.json();
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    }
  });

  // Fetch routes for a supplier
  const {
    data: routes = [],
    isLoading: routesLoading,
    error: routesError
  } = useQuery({
    queryKey: ["/api/backoffice/routes", selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      try {
        const response = await apiRequest("GET", `/api/backoffice/routes?supplierId=${selectedSupplier.id}`);
        return response.json();
      } catch (error) {
        console.error("Error fetching routes:", error);
        return [];
      }
    },
    enabled: !!selectedSupplier
  });
  
  // Fetch sync logs for a supplier
  const {
    data: syncLogs = [],
    isLoading: syncLogsLoading,
    error: syncLogsError
  } = useQuery({
    queryKey: ["/api/backoffice/sync-logs", selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      try {
        const response = await apiRequest("GET", `/api/backoffice/sync-logs?supplierId=${selectedSupplier.id}`);
        return response.json();
      } catch (error) {
        console.error("Error fetching sync logs:", error);
        return [];
      }
    },
    enabled: !!selectedSupplier
  });

  // Create a new supplier
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: Partial<InsertBusWagnerSupplier>) => {
      const response = await apiRequest("POST", "/api/backoffice/suppliers", supplierData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tedarikçi Eklendi",
        description: "Yeni tedarikçi başarıyla eklendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/suppliers"] });
      setIsAddDialogOpen(false);
      resetNewSupplierForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Tedarikçi eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update a supplier
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<BusWagnerSupplier> }) => {
      const response = await apiRequest("PUT", `/api/backoffice/suppliers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tedarikçi Güncellendi",
        description: "Tedarikçi bilgileri başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/suppliers"] });
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Tedarikçi güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete a supplier
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/backoffice/suppliers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tedarikçi Silindi",
        description: "Tedarikçi başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/suppliers"] });
      setSelectedSupplier(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Tedarikçi silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Test a supplier connection
  const testSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/backoffice/suppliers/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Test Başarılı" : "Test Başarısız",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/suppliers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Hatası",
        description: `Bağlantı testi sırasında bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Sync routes for a supplier
  const syncRoutesMutation = useMutation({
    mutationFn: async (id: number) => {
      simulateSyncProgress();
      const response = await apiRequest("POST", `/api/backoffice/suppliers/${id}/sync-routes`);
      return response.json();
    },
    onSuccess: (data) => {
      setTimeout(() => setSyncInProgress(false), 500);
      toast({
        title: data.success ? "Senkronizasyon Başarılı" : "Senkronizasyon Başarısız",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/routes", selectedSupplier?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/backoffice/sync-logs", selectedSupplier?.id] });
      setIsSyncDialogOpen(false);
    },
    onError: (error: any) => {
      setSyncInProgress(false);
      toast({
        title: "Senkronizasyon Hatası",
        description: `Rota senkronizasyonu sırasında bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // For demo purposes - simulates sync progress
  const simulateSyncProgress = () => {
    setSyncInProgress(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplier: BusWagnerSupplier) => {
    setSelectedSupplier(supplier);
    setActiveTab("routes");
  };

  // Form handlers
  const resetNewSupplierForm = () => {
    setNewSupplier({
      name: "",
      code: "",
      country: "TR",
      apiEndpoint: "",
      apiKey: "",
      secretKey: "",
      isActive: true,
      status: "active",
      connectionParams: {},
    });
  };

  // Handle create supplier form submission
  const handleCreateSupplier = () => {
    if (!newSupplier.name || !newSupplier.code) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }
    
    createSupplierMutation.mutate(newSupplier);
  };

  // Handle update supplier form submission
  const handleUpdateSupplier = () => {
    if (!selectedSupplier) return;
    updateSupplierMutation.mutate({
      id: selectedSupplier.id,
      data: selectedSupplier
    });
  };

  // Handle supplier delete
  const handleDeleteSupplier = (id: number) => {
    if (window.confirm("Bu tedarikçiyi silmek istediğinizden emin misiniz? Tüm rotalar, seferler ve rezervasyonlar da silinecektir.")) {
      deleteSupplierMutation.mutate(id);
    }
  };

  // Handle supplier edit
  const handleEditSupplier = (supplier: BusWagnerSupplier) => {
    setSelectedSupplier(supplier);
    setIsEditDialogOpen(true);
  };

  // Handle supplier test
  const handleTestSupplier = (id: number) => {
    testSupplierMutation.mutate(id);
  };

  // Handle route sync
  const handleSyncRoutes = () => {
    if (!selectedSupplier) return;
    syncRoutesMutation.mutate(selectedSupplier.id);
  };

  // Format date helper
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd.MM.yyyy HH:mm", { locale: tr });
  };

  // Get status badge variant based on status
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Bilinmiyor</Badge>;
    
    switch (status.toLowerCase()) {
      case "active":
      case "ok":
      case "success":
        return <Badge className="bg-green-500">Aktif</Badge>;
      case "error":
      case "failed":
      case "failure":
        return <Badge variant="destructive">Hata</Badge>;
      case "pending":
      case "testing":
        return <Badge variant="secondary">Beklemede</Badge>;
      case "inactive":
      case "suspended":
        return <Badge variant="outline" className="bg-gray-200">Devre Dışı</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Backoffice Entegrasyonu">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bus Wagner Entegrasyonu</h1>
            <p className="text-muted-foreground">Bus Wagner üzerindeki farklı otobüs tedarikçileriyle entegrasyon yönetimi</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Yeni Tedarikçi Ekle</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
                <DialogDescription>
                  Sisteme yeni bir otobüs tedarikçisi ekleyin. API bilgileri güvenle saklanır.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tedarikçi Adı*</Label>
                    <Input
                      id="name"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      placeholder="Metro Turizm, Pamukkale, vb."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Kod*</Label>
                    <Input
                      id="code"
                      value={newSupplier.code}
                      onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
                      placeholder="Benzersiz kod (örn: METRO)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Ülke*</Label>
                  <Select
                    value={newSupplier.country}
                    onValueChange={(value) => setNewSupplier({ ...newSupplier, country: value })}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Ülke Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TR">Türkiye</SelectItem>
                      <SelectItem value="DE">Almanya</SelectItem>
                      <SelectItem value="FR">Fransa</SelectItem>
                      <SelectItem value="NL">Hollanda</SelectItem>
                      <SelectItem value="UK">İngiltere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint URL</Label>
                  <Input
                    id="apiEndpoint"
                    value={newSupplier.apiEndpoint || ""}
                    onChange={(e) => setNewSupplier({ ...newSupplier, apiEndpoint: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Anahtarı</Label>
                    <Input
                      id="apiKey"
                      value={newSupplier.apiKey || ""}
                      onChange={(e) => setNewSupplier({ ...newSupplier, apiKey: e.target.value })}
                      placeholder="API Anahtarı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Gizli Anahtar</Label>
                    <Input
                      id="secretKey"
                      value={newSupplier.secretKey || ""}
                      onChange={(e) => setNewSupplier({ ...newSupplier, secretKey: e.target.value })}
                      placeholder="Gizli Anahtar"
                      type="password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={newSupplier.description || ""}
                    onChange={(e) => setNewSupplier({ ...newSupplier, description: e.target.value })}
                    placeholder="Tedarikçi ile ilgili notlar..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={newSupplier.isActive}
                    onCheckedChange={(checked) => setNewSupplier({ ...newSupplier, isActive: checked as boolean })}
                  />
                  <Label htmlFor="isActive">Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  resetNewSupplierForm();
                  setIsAddDialogOpen(false);
                }}>
                  İptal
                </Button>
                <Button onClick={handleCreateSupplier} disabled={createSupplierMutation.isPending}>
                  {createSupplierMutation.isPending ? "Ekleniyor..." : "Ekle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {selectedSupplier && (
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{selectedSupplier.name}</CardTitle>
                <CardDescription>{selectedSupplier.description || "Açıklama bulunmuyor"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium">Ülke:</p>
                    <p className="text-sm">{selectedSupplier.country}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Kod:</p>
                    <p className="text-sm">{selectedSupplier.code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Durum:</p>
                    <div>{getStatusBadge(selectedSupplier.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Son kontrol:</p>
                    <p className="text-sm">{formatDateTime(selectedSupplier.lastChecked)}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditSupplier(selectedSupplier)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    <span>Düzenle</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTestSupplier(selectedSupplier.id)}>
                    <Link className="h-4 w-4 mr-2" />
                    <span>Bağlantıyı Test Et</span>
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        <span>Rotaları Senkronize Et</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px]">
                      <DialogHeader>
                        <DialogTitle>Rota Senkronizasyonu</DialogTitle>
                        <DialogDescription>
                          {selectedSupplier.name} tedarikçisinden tüm rotaları ve seferleri senkronize etmek üzeresiniz. Bu işlem biraz zaman alabilir.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {syncInProgress ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Senkronizasyon İlerlemesi</span>
                              <span className="text-sm font-medium">{syncProgress}%</span>
                            </div>
                            <Progress value={syncProgress} />
                            <p className="text-sm text-muted-foreground mt-4">Lütfen bu pencereyi kapatmayın, senkronizasyon devam ediyor...</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Dikkat</AlertTitle>
                              <AlertDescription>
                                Bu işlem, tedarikçiden mevcut tüm rota ve sefer bilgilerini çekecek ve veritabanını güncelleyecektir. Bu süreçte yeni rotalar eklenebilir veya mevcut rotalar değiştirilebilir.
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)} disabled={syncInProgress}>
                          İptal
                        </Button>
                        <Button onClick={handleSyncRoutes} disabled={syncInProgress || syncRoutesMutation.isPending}>
                          {syncInProgress ? "Senkronize Ediliyor..." : "Senkronize Et"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteSupplier(selectedSupplier.id)}>
                    <Trash className="h-4 w-4 mr-2" />
                    <span>Tedarikçiyi Sil</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suppliers">
              <Bus className="h-4 w-4 mr-2" />
              <span>Tedarikçiler</span>
            </TabsTrigger>
            <TabsTrigger value="routes" disabled={!selectedSupplier}>
              <Upload className="h-4 w-4 mr-2" />
              <span>Rotalar</span>
            </TabsTrigger>
            <TabsTrigger value="sync-logs" disabled={!selectedSupplier}>
              <Download className="h-4 w-4 mr-2" />
              <span>Senkronizasyon Logları</span>
            </TabsTrigger>
          </TabsList>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers">
            {suppliersLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : suppliersError ? (
              <Card className="bg-destructive/10">
                <CardHeader>
                  <CardTitle className="text-destructive">Hata Oluştu</CardTitle>
                  <CardDescription>Tedarikçiler yüklenirken bir hata oluştu.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Lütfen daha sonra tekrar deneyin veya sistem yöneticisiyle iletişime geçin.</p>
                </CardContent>
              </Card>
            ) : suppliers.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tedarikçi Bulunamadı</CardTitle>
                  <CardDescription>Sistemde kayıtlı tedarikçi bulunmamaktadır.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Yeni tedarikçi eklemek için sağ üst köşedeki "Yeni Tedarikçi Ekle" butonunu kullanabilirsiniz.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tedarikçi Adı</TableHead>
                        <TableHead>Kod</TableHead>
                        <TableHead>Ülke</TableHead>
                        <TableHead className="text-center">Durum</TableHead>
                        <TableHead className="text-center">Aktif</TableHead>
                        <TableHead className="text-center">Son Kontrol</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSupplierSelect(supplier)}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>{supplier.code}</TableCell>
                          <TableCell>{supplier.country}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(supplier.status)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              {supplier.isActive ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {formatDateTime(supplier.lastChecked)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Menüyü aç</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSupplier(supplier);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  <span>Düzenle</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestSupplier(supplier.id);
                                }}>
                                  <Link className="h-4 w-4 mr-2" />
                                  <span>Bağlantıyı Test Et</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSupplier(supplier);
                                  setIsSyncDialogOpen(true);
                                }}>
                                  <RefreshCcw className="h-4 w-4 mr-2" />
                                  <span>Senkronize Et</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSupplier(supplier.id);
                                }} className="text-destructive">
                                  <Trash className="h-4 w-4 mr-2" />
                                  <span>Sil</span>
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
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes">
            {!selectedSupplier ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tedarikçi Seçilmedi</CardTitle>
                  <CardDescription>Lütfen rotaları görüntülemek için bir tedarikçi seçin.</CardDescription>
                </CardHeader>
              </Card>
            ) : routesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : routesError ? (
              <Card className="bg-destructive/10">
                <CardHeader>
                  <CardTitle className="text-destructive">Hata Oluştu</CardTitle>
                  <CardDescription>Rotalar yüklenirken bir hata oluştu.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Lütfen daha sonra tekrar deneyin veya sistem yöneticisiyle iletişime geçin.</p>
                </CardContent>
              </Card>
            ) : routes.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Rota Bulunamadı</CardTitle>
                  <CardDescription>Seçili tedarikçi için kayıtlı rota bulunmamaktadır.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Rotaları senkronize etmek için "Rotaları Senkronize Et" butonunu kullanabilirsiniz.</p>
                  <Button className="mt-4" onClick={() => setIsSyncDialogOpen(true)}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    <span>Rotaları Senkronize Et</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Rotalar</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsSyncDialogOpen(true)}>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      <span>Senkronize Et</span>
                    </Button>
                  </div>
                  <CardDescription>
                    {selectedSupplier.name} tedarikçisinin sistemde kayıtlı rotaları
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kalkış Noktası</TableHead>
                        <TableHead>Varış Noktası</TableHead>
                        <TableHead className="text-center">Süre</TableHead>
                        <TableHead className="text-center">Mesafe</TableHead>
                        <TableHead className="text-center">Uluslararası</TableHead>
                        <TableHead className="text-center">Tip</TableHead>
                        <TableHead className="text-center">Son Güncelleme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{route.departureCity}</p>
                              <p className="text-xs text-muted-foreground">{route.departureStation}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{route.arrivalCity}</p>
                              <p className="text-xs text-muted-foreground">{route.arrivalStation}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {Math.floor(route.duration / 60)}s {route.duration % 60}d
                          </TableCell>
                          <TableCell className="text-center">
                            {route.distance ? `${route.distance} km` : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {route.isInternational ? (
                              <Badge className="bg-blue-500">Uluslararası</Badge>
                            ) : (
                              <Badge variant="outline">Yurtiçi</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {route.routeType === "express" ? "Ekspres" : 
                               route.routeType === "luxury" ? "Lüks" : "Standart"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {formatDateTime(route.lastSyncedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sync Logs Tab */}
          <TabsContent value="sync-logs">
            {!selectedSupplier ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tedarikçi Seçilmedi</CardTitle>
                  <CardDescription>Lütfen senkronizasyon loglarını görüntülemek için bir tedarikçi seçin.</CardDescription>
                </CardHeader>
              </Card>
            ) : syncLogsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : syncLogsError ? (
              <Card className="bg-destructive/10">
                <CardHeader>
                  <CardTitle className="text-destructive">Hata Oluştu</CardTitle>
                  <CardDescription>Senkronizasyon logları yüklenirken bir hata oluştu.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Lütfen daha sonra tekrar deneyin veya sistem yöneticisiyle iletişime geçin.</p>
                </CardContent>
              </Card>
            ) : syncLogs.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Log Bulunamadı</CardTitle>
                  <CardDescription>Seçili tedarikçi için senkronizasyon kaydı bulunmamaktadır.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Rotaları senkronize ederek log oluşturabilirsiniz.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full">
                <CardHeader className="pb-2">
                  <CardTitle>Senkronizasyon Logları</CardTitle>
                  <CardDescription>
                    {selectedSupplier.name} tedarikçisi için senkronizasyon geçmişi
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>İşlem</TableHead>
                        <TableHead className="text-center">Durum</TableHead>
                        <TableHead className="text-center">İşlenen Öğe</TableHead>
                        <TableHead>Mesaj</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {log.entityType === "routes" ? "Rotalar" :
                               log.entityType === "schedules" ? "Seferler" :
                               log.entityType === "bookings" ? "Rezervasyonlar" :
                               log.entityType === "seats" ? "Koltuklar" : log.entityType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.operationType === "fetch" ? "Çekme" :
                             log.operationType === "create" ? "Oluşturma" :
                             log.operationType === "update" ? "Güncelleme" :
                             log.operationType === "cancel" ? "İptal" : log.operationType}
                          </TableCell>
                          <TableCell className="text-center">
                            {log.status === "success" ? (
                              <Badge className="bg-green-500">Başarılı</Badge>
                            ) : (
                              <Badge variant="destructive">Başarısız</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{log.itemsProcessed || 0}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={log.message}>
                            {log.message || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Tedarikçi Düzenle</DialogTitle>
              <DialogDescription>
                {selectedSupplier?.name} tedarikçisinin bilgilerini düzenleyin.
              </DialogDescription>
            </DialogHeader>
            {selectedSupplier && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Tedarikçi Adı*</Label>
                    <Input
                      id="edit-name"
                      value={selectedSupplier.name}
                      onChange={(e) => setSelectedSupplier({ ...selectedSupplier, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Kod*</Label>
                    <Input
                      id="edit-code"
                      value={selectedSupplier.code}
                      onChange={(e) => setSelectedSupplier({ ...selectedSupplier, code: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-country">Ülke*</Label>
                  <Select
                    value={selectedSupplier.country}
                    onValueChange={(value) => setSelectedSupplier({ ...selectedSupplier, country: value })}
                  >
                    <SelectTrigger id="edit-country">
                      <SelectValue placeholder="Ülke Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TR">Türkiye</SelectItem>
                      <SelectItem value="DE">Almanya</SelectItem>
                      <SelectItem value="FR">Fransa</SelectItem>
                      <SelectItem value="NL">Hollanda</SelectItem>
                      <SelectItem value="UK">İngiltere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-apiEndpoint">API Endpoint URL</Label>
                  <Input
                    id="edit-apiEndpoint"
                    value={selectedSupplier.apiEndpoint || ""}
                    onChange={(e) => setSelectedSupplier({ ...selectedSupplier, apiEndpoint: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-apiKey">API Anahtarı</Label>
                    <Input
                      id="edit-apiKey"
                      value={selectedSupplier.apiKey || ""}
                      onChange={(e) => setSelectedSupplier({ ...selectedSupplier, apiKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-secretKey">Gizli Anahtar</Label>
                    <Input
                      id="edit-secretKey"
                      value={selectedSupplier.secretKey || ""}
                      onChange={(e) => setSelectedSupplier({ ...selectedSupplier, secretKey: e.target.value })}
                      type="password"
                      placeholder="************"
                    />
                    <p className="text-xs text-muted-foreground">Değiştirmek istemiyorsanız boş bırakın</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Açıklama</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedSupplier.description || ""}
                    onChange={(e) => setSelectedSupplier({ ...selectedSupplier, description: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Durum</Label>
                  <Select
                    value={selectedSupplier.status || "active"}
                    onValueChange={(value) => setSelectedSupplier({ ...selectedSupplier, status: value })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Durum Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Devre Dışı</SelectItem>
                      <SelectItem value="testing">Test</SelectItem>
                      <SelectItem value="suspended">Askıya Alınmış</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={selectedSupplier.isActive}
                    onCheckedChange={(checked) => setSelectedSupplier({ ...selectedSupplier, isActive: checked })}
                  />
                  <Label htmlFor="edit-isActive">Aktif</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateSupplier} disabled={updateSupplierMutation.isPending}>
                {updateSupplierMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default BackofficeIntegrationPage;