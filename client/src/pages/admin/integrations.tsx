import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Helmet } from 'react-helmet';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

import { CheckCircle, AlertCircle, XCircle, Globe, Mail, MessageSquare, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';

// Schema for API config forms
const apiConfigSchema = z.object({
  apiKey: z.string().min(1, "API anahtarı gerekli"),
  apiSecret: z.string().min(1, "API gizli anahtarı gerekli"),
  apiUrl: z.string().url("Geçerli bir URL giriniz"),
  isActive: z.boolean().default(false),
});

type ApiConfigFormValues = z.infer<typeof apiConfigSchema>;

const integrations = [
  {
    id: 'exchange-rate',
    name: 'Döviz Kuru API',
    description: 'Döviz kuru hizmetleri için API entegrasyonu',
    icon: <Globe className="h-6 w-6" />,
    defaultTab: 'exchange-rate',
  },
  {
    id: 'email-service',
    name: 'E-posta Servisi',
    description: 'E-posta bildirimleri için SendGrid entegrasyonu',
    icon: <Mail className="h-6 w-6" />,
    defaultTab: 'email-service',
  },
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business API',
    description: 'WhatsApp mesaj ve bildirimleri için API entegrasyonu',
    icon: <MessageSquare className="h-6 w-6" />,
    defaultTab: 'whatsapp-business',
  }
];

const ApiStatusBadge = ({ status }: { status: 'active' | 'inactive' | 'error' | 'loading' }) => {
  const statusMap = {
    active: { label: 'Aktif', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> },
    inactive: { label: 'Devre Dışı', className: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3.5 w-3.5 mr-1" /> },
    error: { label: 'Hata', className: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> },
    loading: { label: 'Kontrol Ediliyor', className: 'bg-blue-100 text-blue-800', icon: <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> },
  };

  const { label, className, icon } = statusMap[status];

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </div>
  );
};

export default function IntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('exchange-rate');
  
  // Fetch API integration status
  const { 
    data: apiStatus,
    isLoading: isStatusLoading,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/integrations/status'],
    enabled: true,
  });

  // Prepare the form for the active tab
  const form = useForm<ApiConfigFormValues>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      apiKey: '',
      apiSecret: '',
      apiUrl: '',
      isActive: false,
    },
  });

  // Load form data when tab changes
  React.useEffect(() => {
    if (apiStatus) {
      const integration = apiStatus.find((api: any) => api.id === activeTab);
      if (integration) {
        form.reset({
          apiKey: integration.apiKey || '',
          apiSecret: integration.apiSecret || '',
          apiUrl: integration.apiUrl || '',
          isActive: integration.isActive || false,
        });
      }
    }
  }, [activeTab, apiStatus, form]);

  // Save integration settings
  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: ApiConfigFormValues & { id: string }) => {
      const { id, ...config } = data;
      const res = await apiRequest('POST', `/api/integrations/${id}/configure`, config);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Entegrasyon güncellendi',
        description: 'API yapılandırması başarıyla kaydedildi.',
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Entegrasyon güncellenemedi',
        description: error.message || 'Bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Test integration connection
  const testIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/integrations/${id}/test`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Bağlantı başarılı' : 'Bağlantı başarısız',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test başarısız',
        description: error.message || 'Bağlantı testi sırasında bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: ApiConfigFormValues) => {
    saveIntegrationMutation.mutate({ ...values, id: activeTab });
  };

  // Handle test connection
  const handleTestConnection = () => {
    testIntegrationMutation.mutate(activeTab);
  };

  // Get current integration status
  const getIntegrationStatus = (id: string) => {
    if (isStatusLoading) return 'loading';
    if (!apiStatus) return 'error';

    const integration = apiStatus.find((api: any) => api.id === id);
    if (!integration) return 'error';
    
    return integration.isActive ? 'active' : 'inactive';
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>API Entegrasyonları | Admin Panel</title>
      </Helmet>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Entegrasyonları</h1>
            <p className="text-muted-foreground">Dış servis API entegrasyonlarını yönetin</p>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => refetchStatus()}
            disabled={isStatusLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isStatusLoading ? 'animate-spin' : ''}`} />
            Durumu Yenile
          </Button>
        </div>

        <Tabs
          defaultValue="exchange-rate"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <TabsList className="flex flex-col w-full h-auto space-y-1">
                  {integrations.map((integration) => (
                    <TabsTrigger
                      key={integration.id}
                      value={integration.id}
                      className="justify-start h-auto py-3 px-4 w-full flex items-center"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <div className="mr-3 bg-primary/10 p-2 rounded-md">
                            {integration.icon}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{integration.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {integration.description}
                            </div>
                          </div>
                        </div>
                        <ApiStatusBadge status={getIntegrationStatus(integration.id)} />
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              <TabsContent value="exchange-rate" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Döviz Kuru API Yapılandırması</CardTitle>
                    <CardDescription>
                      Döviz kurları için harici API entegrasyonunu yapılandırın. Canlı döviz kurları, TRY, USD ve EUR para birimleri arasında dönüşüm sağlar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Anahtarı</FormLabel>
                              <FormControl>
                                <Input placeholder="Döviz kuru API anahtarını girin" {...field} />
                              </FormControl>
                              <FormDescription>
                                Servis sağlayıcınızdan aldığınız API anahtarı.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="apiSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Gizli Anahtarı</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Döviz kuru API gizli anahtarını girin" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="apiUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://api.example.com/v1" {...field} />
                              </FormControl>
                              <FormDescription>
                                API isteklerinin yapılacağı temel URL.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Etkinleştir</FormLabel>
                                <FormDescription>
                                  Döviz kuru API entegrasyonunu etkinleştir veya devre dışı bırak.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex space-x-2 pt-4">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testIntegrationMutation.isPending}
                          >
                            {testIntegrationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Bağlantıyı Test Et
                          </Button>
                          <Button 
                            type="submit"
                            disabled={saveIntegrationMutation.isPending}
                          >
                            {saveIntegrationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Ayarları Kaydet
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email-service" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>E-posta Servisi Yapılandırması (SendGrid)</CardTitle>
                    <CardDescription>
                      E-posta gönderimleri için SendGrid entegrasyonunu yapılandırın. 
                      Bilet onayları, rezervasyon bildirimleri ve pazarlama e-postaları için kullanılır.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SendGrid API Anahtarı</FormLabel>
                              <FormControl>
                                <Input placeholder="SendGrid API anahtarını girin" {...field} />
                              </FormControl>
                              <FormDescription>
                                SendGrid hesabınızdan aldığınız API anahtarı.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="apiSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Gizli Anahtarı</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Gerekli ise API gizli anahtarını girin" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="apiUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://api.sendgrid.com/v3" {...field} />
                              </FormControl>
                              <FormDescription>
                                SendGrid API URL'i.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Etkinleştir</FormLabel>
                                <FormDescription>
                                  E-posta servisi entegrasyonunu etkinleştir veya devre dışı bırak.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex space-x-2 pt-4">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testIntegrationMutation.isPending}
                          >
                            {testIntegrationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Test E-postası Gönder
                          </Button>
                          <Button 
                            type="submit"
                            disabled={saveIntegrationMutation.isPending}
                          >
                            {saveIntegrationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Ayarları Kaydet
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="whatsapp-business" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>WhatsApp Business API Yapılandırması</CardTitle>
                    <CardDescription>
                      WhatsApp bildirimleri ve mesajlaşma için WhatsApp Business API entegrasyonunu yapılandırın.
                      Bilet onayları, seyahat hatırlatıcıları ve müşteri desteği için kullanılır.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp API Anahtarı</FormLabel>
                              <FormControl>
                                <Input placeholder="WhatsApp Business API anahtarını girin" {...field} />
                              </FormControl>
                              <FormDescription>
                                WhatsApp Business API hesabınızdan aldığınız API anahtarı.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="apiSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Gizli Anahtarı</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="WhatsApp API gizli anahtarını girin" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="apiUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://api.whatsapp.com/v1" {...field} />
                              </FormControl>
                              <FormDescription>
                                WhatsApp Business API URL'i.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Etkinleştir</FormLabel>
                                <FormDescription>
                                  WhatsApp Business API entegrasyonunu etkinleştir veya devre dışı bırak.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <Alert className="mt-6">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Not</AlertTitle>
                          <AlertDescription>
                            WhatsApp Business API kullanımı için onaylı bir iş hesabı gereklidir. 
                            Şablon mesajlarınızın WhatsApp tarafından onaylanmış olduğundan emin olun.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="flex space-x-2 pt-4">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testIntegrationMutation.isPending}
                          >
                            {testIntegrationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Bağlantıyı Test Et
                          </Button>
                          <Button 
                            type="submit"
                            disabled={saveIntegrationMutation.isPending}
                          >
                            {saveIntegrationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Ayarları Kaydet
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}