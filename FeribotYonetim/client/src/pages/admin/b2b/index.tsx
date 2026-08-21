import React, { useState } from 'react';
import AdminLayout from '@/components/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Check, Search, AlertTriangle, Plus, Edit, Trash2, CreditCard, ChevronRight, Users, Building, BarChart4, BadgePercent } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Şema tanımlamaları
const agencyFormSchema = z.object({
  name: z.string().min(3, { message: 'Acenta adı en az 3 karakter olmalıdır' }),
  code: z.string().min(3, { message: 'Acenta kodu en az 3 karakter olmalıdır' }),
  type: z.string(),
  commissionRate: z.string(),
  discountRate: z.string(),
  isActive: z.boolean().default(true),
  address: z.string().optional(),
  contactEmail: z.string().email({ message: 'Geçerli bir e-posta adresi girin' }),
  contactPhone: z.string().optional(),
  taxId: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  creditLimit: z.string().default('0'),
  paymentDueDate: z.number().default(30),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  notes: z.string().optional(),
});

const userFormSchema = z.object({
  username: z.string().min(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi girin' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type AgencyFormValues = z.infer<typeof agencyFormSchema>;
type UserFormValues = z.infer<typeof userFormSchema>;

// Ana B2B yönetim bileşeni
export default function B2BManagement() {
  const [activeTab, setActiveTab] = useState('agencies');
  const [openNewAgencyDialog, setOpenNewAgencyDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Acentaları getir
  const { data: agencies, isLoading: isLoadingAgencies } = useQuery({
    queryKey: ['/api/b2b/agencies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/b2b/agencies');
      return await response.json();
    },
  });

  // Form tanımlamaları
  const agencyForm = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: {
      name: '',
      code: '',
      type: 'agency',
      commissionRate: '10',
      discountRate: '0',
      isActive: true,
      creditLimit: '0',
      paymentDueDate: 30,
    },
  });

  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  // Yeni acenta oluştur
  const createAgencyMutation = useMutation({
    mutationFn: async (data: { agencyData: AgencyFormValues, userData: UserFormValues }) => {
      const response = await apiRequest('POST', '/api/b2b/agencies', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Acenta oluşturuldu',
        description: 'Yeni acenta başarıyla oluşturuldu.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/agencies'] });
      setOpenNewAgencyDialog(false);
      agencyForm.reset();
      userForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: `Acenta oluşturulurken hata oluştu: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleCreateAgency = async () => {
    const agencyValid = await agencyForm.trigger();
    const userValid = await userForm.trigger();

    if (agencyValid && userValid) {
      const agencyData = agencyForm.getValues();
      const userData = userForm.getValues();

      createAgencyMutation.mutate({
        agencyData,
        userData
      });
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">B2B Yönetimi</h1>
          <Button 
            variant="default" 
            onClick={() => setOpenNewAgencyDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni Acenta Ekle
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agencies">
              <Building className="mr-2 h-4 w-4" />
              Acentalar
            </TabsTrigger>
            <TabsTrigger value="commissions">
              <BadgePercent className="mr-2 h-4 w-4" />
              Komisyon Yapısı
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <CreditCard className="mr-2 h-4 w-4" />
              Rezervasyonlar
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart4 className="mr-2 h-4 w-4" />
              Raporlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agencies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acentalar</CardTitle>
                <CardDescription>
                  Sisteme kayıtlı tüm acentaları görüntüleyin ve yönetin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Acenta ara..."
                      className="max-w-sm"
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isLoadingAgencies ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : agencies && agencies.length > 0 ? (
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
                        {agencies.map((agency: any) => (
                          <tr key={agency.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-2">{agency.id}</td>
                            <td className="px-4 py-2 font-medium">{agency.name}</td>
                            <td className="px-4 py-2">{agency.code}</td>
                            <td className="px-4 py-2">{agency.contactEmail}</td>
                            <td className="px-4 py-2">%{agency.commissionRate}</td>
                            <td className="px-4 py-2">
                              {agency.isActive ? (
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
                                onClick={() => navigate(`/admin/b2b/agencies/${agency.id}`)}
                              >
                                Detay <ChevronRight className="ml-1 h-4 w-4" />
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
                      Sistemde kayıtlı acenta bulunmamaktadır. Yeni acenta eklemek için "Yeni Acenta Ekle" butonunu kullanabilirsiniz.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Toplam Kayıt: {agencies?.length || 0}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Komisyon Yapısı</CardTitle>
                <CardDescription>
                  Acentalara tanımlanan komisyon kademelerini yönetin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Bilgi</AlertTitle>
                  <AlertDescription>
                    Komisyon yapısı yönetimi için önce bir acenta seçmelisiniz. Acentalar sekmesinden bir acenta seçerek devam edebilirsiniz.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rezervasyonlar</CardTitle>
                <CardDescription>
                  Acentalar tarafından yapılan rezervasyonları görüntüleyin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Bilgi</AlertTitle>
                  <AlertDescription>
                    Rezervasyon yönetimi için önce bir acenta seçmelisiniz. Acentalar sekmesinden bir acenta seçerek devam edebilirsiniz.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Raporlar</CardTitle>
                <CardDescription>
                  B2B satış ve komisyon raporlarını görüntüleyin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Toplam Acenta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{agencies?.length || 0}</div>
                      <p className="text-sm text-muted-foreground">Aktif: {agencies?.filter((a: any) => a.isActive).length || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Toplam Rezervasyon</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">Son 30 gün: 0</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Toplam Komisyon</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">₺0.00</div>
                      <p className="text-sm text-muted-foreground">Son 30 gün: ₺0.00</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Yeni Acenta Ekleme Dialog'u */}
      <Dialog open={openNewAgencyDialog} onOpenChange={setOpenNewAgencyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Yeni Acenta Ekle</DialogTitle>
            <DialogDescription>
              Sisteme yeni bir acenta ve acenta yöneticisi ekleyin. Tüm gerekli alanları doldurun.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <Tabs defaultValue="agency" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="agency">Acenta Bilgileri</TabsTrigger>
                <TabsTrigger value="user">Kullanıcı Bilgileri</TabsTrigger>
              </TabsList>
              
              <TabsContent value="agency">
                <Form {...agencyForm}>
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={agencyForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acenta Adı *</FormLabel>
                            <FormControl>
                              <Input placeholder="Acenta adını girin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={agencyForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acenta Kodu *</FormLabel>
                            <FormControl>
                              <Input placeholder="Örn: ABC123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={agencyForm.control}
                        name="commissionRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Komisyon Oranı (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" max="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={agencyForm.control}
                        name="discountRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>İndirim Oranı (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" max="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={agencyForm.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="acenta@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={agencyForm.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input placeholder="+90 555 123 4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={agencyForm.control}
                        name="creditLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kredi Limiti</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={agencyForm.control}
                        name="paymentDueDate"
                        render={({ field: { value, onChange, ...field } }) => (
                          <FormItem>
                            <FormLabel>Ödeme Vadesi (Gün)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="180" 
                                value={value.toString()} 
                                onChange={(e) => onChange(parseInt(e.target.value))} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={agencyForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl>
                            <Input placeholder="Acenta adresini girin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={agencyForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notlar</FormLabel>
                          <FormControl>
                            <Input placeholder="Ek bilgiler..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="user">
                <Form {...userForm}>
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ad Soyad</FormLabel>
                          <FormControl>
                            <Input placeholder="Kullanıcının adı ve soyadı" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kullanıcı Adı *</FormLabel>
                            <FormControl>
                              <Input placeholder="Benzersiz kullanıcı adı" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={userForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="ornek@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={userForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şifre *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="En az 6 karakter" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input placeholder="+90 555 123 4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNewAgencyDialog(false)}>İptal</Button>
            <Button 
              onClick={handleCreateAgency}
              disabled={createAgencyMutation.isPending}
            >
              {createAgencyMutation.isPending && (
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              )}
              Acentayı Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}