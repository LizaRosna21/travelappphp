import React, { useState } from 'react';
import AdminLayout from '@/components/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation, useParams } from 'wouter';
import { Check, AlertTriangle, Edit, Trash2, CreditCard, ArrowLeft, Building, FileText, Users, Tag, Clock, Plus, Percent } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function AgencyDetail() {
  const { id } = useParams();
  const agencyId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCreateTierDialog, setShowCreateTierDialog] = useState(false);

  // Acenta detaylarını getir
  const { data: agency, isLoading, error } = useQuery({
    queryKey: [`/api/b2b/agencies/${agencyId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/b2b/agencies/${agencyId}`);
      return await response.json();
    },
  });

  // Acenta komisyon kademelerini getir
  const { data: commissionTiers, isLoading: isLoadingTiers } = useQuery({
    queryKey: [`/api/b2b/agencies/${agencyId}/commission-tiers`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/b2b/agencies/${agencyId}/commission-tiers`);
      return await response.json();
    },
  });

  // Acenta rezervasyonlarını getir
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: [`/api/b2b/agencies/${agencyId}/bookings`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/b2b/agencies/${agencyId}/bookings`);
      return await response.json();
    },
  });

  // Acenta alt acentalarını getir
  const { data: subAgencies, isLoading: isLoadingSubAgencies } = useQuery({
    queryKey: [`/api/b2b/agencies/${agencyId}/sub-agencies`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/b2b/agencies/${agencyId}/sub-agencies`);
      return await response.json();
    },
  });

  // Acenta ödemelerini getir
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: [`/api/b2b/agencies/${agencyId}/payments`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/b2b/agencies/${agencyId}/payments`);
      return await response.json();
    },
  });

  // Acenta silme işlemi
  const deleteAgencyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/b2b/agencies/${agencyId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Acenta silindi',
        description: 'Acenta başarıyla silindi.',
        variant: 'default',
      });
      setShowDeleteDialog(false);
      navigate('/admin/b2b');
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: `Acenta silinirken hata oluştu: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Acenta durum güncelleme
  const updateAgencyStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await apiRequest('PUT', `/api/b2b/agencies/${agencyId}`, {
        isActive
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Durum güncellendi',
        description: 'Acenta durumu başarıyla güncellendi.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/b2b/agencies/${agencyId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: `Acenta durumu güncellenirken hata oluştu: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Komisyon kademesi oluşturma
  const createCommissionTierMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/b2b/agencies/${agencyId}/commission-tiers`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Komisyon kademesi oluşturuldu',
        description: 'Yeni komisyon kademesi başarıyla oluşturuldu.',
        variant: 'default',
      });
      setShowCreateTierDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/b2b/agencies/${agencyId}/commission-tiers`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: `Komisyon kademesi oluşturulurken hata oluştu: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-12 flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !agency) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>
              Acenta bilgileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate('/admin/b2b')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin/b2b')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{agency.name}</h1>
            <Badge variant={agency.isActive ? "default" : "secondary"}>
              {agency.isActive ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center">
              <Switch 
                checked={agency.isActive} 
                onCheckedChange={(checked) => updateAgencyStatusMutation.mutate(checked)}
                disabled={updateAgencyStatusMutation.isPending}
              />
              <Label className="ml-2">
                {updateAgencyStatusMutation.isPending ? "Güncelleniyor..." : "Acenta Durumu"}
              </Label>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </Button>
          </div>
        </div>

        {/* Acenta Ana Detay Kartı */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acenta Bilgileri</CardTitle>
            <CardDescription>
              Acenta detayları ve iletişim bilgileri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-muted-foreground mb-4">Temel Bilgiler</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acenta Kodu:</span>
                    <span className="font-medium">{agency.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acenta Tipi:</span>
                    <span className="font-medium">
                      {agency.type === 'agency' ? 'Ana Acenta' : 
                       agency.type === 'sub_agency' ? 'Alt Acenta' : agency.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Komisyon Oranı:</span>
                    <span className="font-medium">%{agency.commissionRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">İndirim Oranı:</span>
                    <span className="font-medium">%{agency.discountRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kayıt Tarihi:</span>
                    <span className="font-medium">
                      {agency.createdAt ? format(new Date(agency.createdAt), 'dd/MM/yyyy') : 'Belirtilmemiş'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-muted-foreground mb-4">İletişim Bilgileri</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">E-posta:</span>
                    <span className="font-medium">{agency.contactEmail || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefon:</span>
                    <span className="font-medium">{agency.contactPhone || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adres:</span>
                    <span className="font-medium">{agency.address || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vergi No:</span>
                    <span className="font-medium">{agency.taxId || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Şirket Kayıt No:</span>
                    <span className="font-medium">{agency.companyRegistrationNumber || 'Belirtilmemiş'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alt Sekmeleri */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="overview">
              <FileText className="mr-2 h-4 w-4" />
              Genel Bakış
            </TabsTrigger>
            <TabsTrigger value="commissions">
              <Percent className="mr-2 h-4 w-4" />
              Komisyon Kademeleri
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <CreditCard className="mr-2 h-4 w-4" />
              Rezervasyonlar
            </TabsTrigger>
            <TabsTrigger value="subagencies">
              <Building className="mr-2 h-4 w-4" />
              Alt Acentalar
            </TabsTrigger>
          </TabsList>

          {/* Genel Bakış Sekmesi */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Finansal Bilgiler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kredi Limiti:</span>
                      <span className="font-medium">₺{agency.creditLimit || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mevcut Bakiye:</span>
                      <span className="font-medium">₺{agency.currentBalance || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ödeme Vadesi:</span>
                      <span className="font-medium">{agency.paymentDueDate || '30'} gün</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sözleşme Başlangıç:</span>
                      <span className="font-medium">
                        {agency.contractStartDate 
                          ? format(new Date(agency.contractStartDate), 'dd/MM/yyyy') 
                          : 'Belirtilmemiş'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sözleşme Bitiş:</span>
                      <span className="font-medium">
                        {agency.contractEndDate 
                          ? format(new Date(agency.contractEndDate), 'dd/MM/yyyy') 
                          : 'Belirtilmemiş'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Özet Kart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    Satış Özeti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toplam Rezervasyon:</span>
                      <span className="font-medium">{bookings?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aylık Rezervasyon:</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toplam Satış Tutarı:</span>
                      <span className="font-medium">₺0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toplam Komisyon:</span>
                      <span className="font-medium">₺0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toplam İndirim:</span>
                      <span className="font-medium">₺0.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Son Aktiviteler */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Son Aktiviteler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments && payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.slice(0, 5).map((payment: any) => (
                        <div key={payment.id} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{payment.description || 'Ödeme'}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
                            </div>
                          </div>
                          <div className="font-medium">₺{payment.amount}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Henüz aktivite kaydı bulunmuyor.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Komisyon Kademeleri Sekmesi */}
          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Komisyon Kademeleri</CardTitle>
                    <CardDescription>
                      Satış miktarına bağlı olarak uygulanan komisyon oranları
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateTierDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Kademe Ekle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTiers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : commissionTiers && commissionTiers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">Min. Satış</th>
                          <th className="px-4 py-2 text-left">Max. Satış</th>
                          <th className="px-4 py-2 text-left">Komisyon Oranı</th>
                          <th className="px-4 py-2 text-left">Geçerlilik</th>
                          <th className="px-4 py-2 text-left">Durum</th>
                          <th className="px-4 py-2 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionTiers.map((tier: any) => (
                          <tr key={tier.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-2">{tier.id}</td>
                            <td className="px-4 py-2">₺{tier.minSalesAmount}</td>
                            <td className="px-4 py-2">{tier.maxSalesAmount ? `₺${tier.maxSalesAmount}` : 'Limitsiz'}</td>
                            <td className="px-4 py-2">%{tier.commissionRate}</td>
                            <td className="px-4 py-2">
                              {format(new Date(tier.startDate), 'dd/MM/yyyy')} - {format(new Date(tier.endDate), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-4 py-2">
                              {tier.isActive ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="mr-1 h-3 w-3" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertTriangle className="mr-1 h-3 w-3" /> Pasif
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Kayıt Bulunamadı</AlertTitle>
                    <AlertDescription>
                      Bu acenta için tanımlanmış komisyon kademesi bulunmamaktadır. "Yeni Kademe Ekle" butonunu kullanarak komisyon kademesi ekleyebilirsiniz.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rezervasyonlar Sekmesi */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Rezervasyonlar</CardTitle>
                <CardDescription>
                  Acenta tarafından yapılan tüm rezervasyonlar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBookings ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : bookings && bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">Rezervasyon No</th>
                          <th className="px-4 py-2 text-left">Tarih</th>
                          <th className="px-4 py-2 text-left">Ücret</th>
                          <th className="px-4 py-2 text-left">Komisyon</th>
                          <th className="px-4 py-2 text-left">İndirim</th>
                          <th className="px-4 py-2 text-left">Durum</th>
                          <th className="px-4 py-2 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking: any) => (
                          <tr key={booking.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-2">{booking.id}</td>
                            <td className="px-4 py-2 font-medium">{booking.bookingId}</td>
                            <td className="px-4 py-2">{format(new Date(booking.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                            <td className="px-4 py-2">₺{booking.originalPrice}</td>
                            <td className="px-4 py-2">₺{booking.commissionAmount}</td>
                            <td className="px-4 py-2">₺{booking.discountAmount}</td>
                            <td className="px-4 py-2">
                              <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                {booking.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button variant="ghost" size="sm">
                                Detay
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Kayıt Bulunamadı</AlertTitle>
                    <AlertDescription>
                      Bu acenta için herhangi bir rezervasyon kaydı bulunmamaktadır.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alt Acentalar Sekmesi */}
          <TabsContent value="subagencies" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Alt Acentalar</CardTitle>
                    <CardDescription>
                      Bu acentaya bağlı alt acentalar
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Alt Acenta Ekle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSubAgencies ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : subAgencies && subAgencies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">Ad</th>
                          <th className="px-4 py-2 text-left">Kod</th>
                          <th className="px-4 py-2 text-left">E-posta</th>
                          <th className="px-4 py-2 text-left">Komisyon Oranı</th>
                          <th className="px-4 py-2 text-left">Durum</th>
                          <th className="px-4 py-2 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subAgencies.map((subAgency: any) => (
                          <tr key={subAgency.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-2">{subAgency.id}</td>
                            <td className="px-4 py-2 font-medium">{subAgency.name}</td>
                            <td className="px-4 py-2">{subAgency.code}</td>
                            <td className="px-4 py-2">{subAgency.contactEmail}</td>
                            <td className="px-4 py-2">%{subAgency.commissionRate}</td>
                            <td className="px-4 py-2">
                              {subAgency.isActive ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="mr-1 h-3 w-3" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertTriangle className="mr-1 h-3 w-3" /> Pasif
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/admin/b2b/agencies/${subAgency.id}`)}
                              >
                                Detay
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Kayıt Bulunamadı</AlertTitle>
                    <AlertDescription>
                      Bu acentaya bağlı alt acenta bulunmamaktadır. "Alt Acenta Ekle" butonunu kullanarak alt acenta ekleyebilirsiniz.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Acenta Silme Dialog'u */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acenta Silinecek</DialogTitle>
            <DialogDescription>
              <p>"{agency.name}" isimli acentayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Dikkat</AlertTitle>
                <AlertDescription>
                  Bu işlem acentaya ait tüm verileri (komisyon kademeleri, alt acentalar, vb.) silecektir.
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>İptal</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteAgencyMutation.mutate()}
              disabled={deleteAgencyMutation.isPending}
            >
              {deleteAgencyMutation.isPending && (
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              )}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Komisyon Kademesi Ekleme Dialog'u */}
      <Dialog open={showCreateTierDialog} onOpenChange={setShowCreateTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Komisyon Kademesi Ekle</DialogTitle>
            <DialogDescription>
              {agency.name} için yeni bir komisyon kademesi tanımlayın.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minSalesAmount">Min. Satış Tutarı</Label>
                <Input id="minSalesAmount" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <Label htmlFor="maxSalesAmount">Max. Satış Tutarı</Label>
                <Input id="maxSalesAmount" type="number" min="0" placeholder="Limitsiz için boş bırakın" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="commissionRate">Komisyon Oranı (%)</Label>
              <Input id="commissionRate" type="number" min="0" max="100" placeholder="10" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                <Input id="startDate" type="date" />
              </div>
              <div>
                <Label htmlFor="endDate">Bitiş Tarihi</Label>
                <Input id="endDate" type="date" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Input id="description" placeholder="Bu kademe hakkında ek bilgi..." />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTierDialog(false)}>İptal</Button>
            <Button 
              onClick={() => {
                // Örnek veri toplama ve gönderme
                const data = {
                  minSalesAmount: (document.getElementById('minSalesAmount') as HTMLInputElement).value || '0',
                  maxSalesAmount: (document.getElementById('maxSalesAmount') as HTMLInputElement).value || null,
                  commissionRate: (document.getElementById('commissionRate') as HTMLInputElement).value || '10',
                  startDate: (document.getElementById('startDate') as HTMLInputElement).value || new Date().toISOString().split('T')[0],
                  endDate: (document.getElementById('endDate') as HTMLInputElement).value || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                  description: (document.getElementById('description') as HTMLInputElement).value || null,
                  isActive: true
                };
                
                createCommissionTierMutation.mutate(data);
              }}
              disabled={createCommissionTierMutation.isPending}
            >
              {createCommissionTierMutation.isPending && (
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              )}
              Kademe Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}