import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, CreditCard, AlertCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface PaymentProvider {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  secretKey?: string;
  merchantId?: string;
  sandboxMode: boolean;
  webhookSecret?: string;
  supportedCurrencies: string[];
  description: string;
  logoUrl: string;
}

// Form schema for payment provider
const paymentProviderSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
  merchantId: z.string().optional(),
  sandboxMode: z.boolean(),
  webhookSecret: z.string().optional(),
});

// Define mock data for providers since we don't have a real API endpoint yet
const mockProviders: PaymentProvider[] = [
  {
    id: "stripe",
    name: "Stripe",
    enabled: false,
    apiKey: "",
    secretKey: "",
    sandboxMode: true,
    webhookSecret: "",
    supportedCurrencies: ["USD", "EUR"],
    description: "Global ödeme sağlayıcısı, kredi kartı ve alternatif ödeme yöntemlerini destekler.",
    logoUrl: "https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@master/icons/stripe.svg"
  },
  {
    id: "paytr",
    name: "PayTR",
    enabled: false,
    apiKey: "",
    secretKey: "",
    merchantId: "",
    sandboxMode: true,
    webhookSecret: "",
    supportedCurrencies: ["TRY", "USD", "EUR"],
    description: "Türkiye'deki tüm bankalar için taksit imkanı ve sanal pos hizmeti sunan yerel ödeme sağlayıcısı.",
    logoUrl: "https://www.paytr.com/wp-content/uploads/logo.svg"
  },
  {
    id: "iyzico",
    name: "Iyzico",
    enabled: false,
    apiKey: "",
    secretKey: "",
    merchantId: "",
    sandboxMode: true,
    webhookSecret: "",
    supportedCurrencies: ["TRY", "USD", "EUR"],
    description: "Türkiye'de popüler ödeme çözümü, çeşitli ödeme yöntemleri ve taksit seçenekleri sunar.",
    logoUrl: "https://www.iyzico.com/assets/images/content/logo.svg"
  },
  {
    id: "payu",
    name: "PayU",
    enabled: false,
    apiKey: "",
    secretKey: "",
    merchantId: "",
    sandboxMode: true,
    webhookSecret: "",
    supportedCurrencies: ["TRY", "USD", "EUR"],
    description: "Tüm dünyada kullanılan ödeme çözümü, Türkiye'de de taksitli ödeme desteği sunar.",
    logoUrl: "https://www.payu.com.tr/sites/turkey/files/images/payu_logo_0.png"
  }
];

const PaymentSettings = () => {
  const [activeProvider, setActiveProvider] = useState<string>("stripe");

  // Fetch payment providers (mock data for now)
  const { data: providers, isLoading } = useQuery<PaymentProvider[]>({
    queryKey: ["/api/admin/payment-providers"],
    queryFn: () => Promise.resolve(mockProviders),
  });

  // Form setup
  const form = useForm<z.infer<typeof paymentProviderSchema>>({
    resolver: zodResolver(paymentProviderSchema),
    defaultValues: {
      enabled: false,
      apiKey: "",
      secretKey: "",
      merchantId: "",
      sandboxMode: true,
      webhookSecret: "",
    },
  });

  // Update form values when active provider changes
  const activeProviderData = providers?.find(provider => provider.id === activeProvider);
  
  useEffect(() => {
    if (activeProviderData) {
      form.reset({
        enabled: activeProviderData.enabled,
        apiKey: activeProviderData.apiKey || "",
        secretKey: activeProviderData.secretKey || "",
        merchantId: activeProviderData.merchantId || "",
        sandboxMode: activeProviderData.sandboxMode,
        webhookSecret: activeProviderData.webhookSecret || "",
      });
    }
  }, [activeProviderData, form]);

  // Save payment provider settings
  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentProviderSchema>) => {
      const response = await apiRequest("PUT", `/api/admin/payment-providers/${activeProvider}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Ödeme sağlayıcı ayarları kaydedildi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-providers"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof paymentProviderSchema>) => {
    saveMutation.mutate(data);
  };

  // Test payment connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/payment-providers/${activeProvider}/test`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bağlantı Başarılı",
        description: "Ödeme sağlayıcı bağlantısı başarıyla test edildi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Bağlantı Hatası",
        description: "Ödeme sağlayıcı bağlantısı test edilirken bir hata oluştu. Lütfen API anahtarlarını kontrol edin.",
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Ödeme Ayarları | Admin Panel</title>
      </Helmet>
      
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Ödeme Ayarları</h1>
        
        <Tabs defaultValue={activeProvider} onValueChange={setActiveProvider}>
          <TabsList className="mb-6">
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="paytr">PayTR</TabsTrigger>
            <TabsTrigger value="iyzico">Iyzico</TabsTrigger>
            <TabsTrigger value="payu">PayU</TabsTrigger>
          </TabsList>
          
          {providers?.map((provider) => (
            <TabsContent key={provider.id} value={provider.id}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{provider.name} Ayarları</CardTitle>
                          <CardDescription>
                            {provider.description}
                          </CardDescription>
                        </div>
                        {provider.logoUrl && (
                          <img 
                            src={provider.logoUrl} 
                            alt={`${provider.name} logo`} 
                            className="h-10 w-auto"
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <FormLabel className="text-base">Etkinleştir</FormLabel>
                                  <FormDescription>
                                    {provider.name} ödeme sağlayıcısını etkinleştirir
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

                          <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Anahtarı</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="pk_..." 
                                    {...field} 
                                    className="font-mono"
                                  />
                                </FormControl>
                                <FormDescription>
                                  {provider.id === 'stripe' ? 'Stripe için "Publishable key"' : 'API anahtarınız'}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="secretKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gizli Anahtar</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="sk_..."
                                    {...field}
                                    className="font-mono"
                                  />
                                </FormControl>
                                <FormDescription>
                                  {provider.id === 'stripe' ? 'Stripe için "Secret key"' : 'Gizli anahtarınız'}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {provider.id !== 'stripe' && (
                            <FormField
                              control={form.control}
                              name="merchantId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Üye İşyeri ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="1234567890"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Ödeme sağlayıcısı tarafından verilen üye işyeri numaranız
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="webhookSecret"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Webhook Secret</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="whsec_..."
                                    {...field}
                                    className="font-mono"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Ödeme bildirimlerini almak için webhook gizli anahtarı
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sandboxMode"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <FormLabel className="text-base">Test Modu</FormLabel>
                                  <FormDescription>
                                    Gerçek ödemeler alınmayacak, test ortamında çalışılacak
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

                          <div className="flex gap-4">
                            <Button
                              type="submit"
                              disabled={saveMutation.isPending}
                              className="w-full"
                            >
                              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {!saveMutation.isPending && <Save className="mr-2 h-4 w-4" />}
                              Ayarları Kaydet
                            </Button>
                            
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleTestConnection}
                              disabled={testConnectionMutation.isPending || !form.getValues("apiKey")}
                              className="w-full"
                            >
                              {testConnectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {!testConnectionMutation.isPending && <CreditCard className="mr-2 h-4 w-4" />}
                              Bağlantıyı Test Et
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Desteklenen Özellikler</CardTitle>
                      <CardDescription>
                        Bu ödeme sağlayıcısının desteklediği özellikler
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-full ${provider.supportedCurrencies.includes('USD') ? 'bg-green-100' : 'bg-red-100'}`}>
                            {provider.supportedCurrencies.includes('USD') ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>USD ödemeleri</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-full ${provider.supportedCurrencies.includes('EUR') ? 'bg-green-100' : 'bg-red-100'}`}>
                            {provider.supportedCurrencies.includes('EUR') ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>EUR ödemeleri</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-full ${provider.supportedCurrencies.includes('TRY') ? 'bg-green-100' : 'bg-red-100'}`}>
                            {provider.supportedCurrencies.includes('TRY') ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>TRY ödemeleri</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-full ${provider.id !== 'stripe' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {provider.id !== 'stripe' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>Türk banka kartları</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-full ${provider.id !== 'stripe' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {provider.id !== 'stripe' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>Taksitli ödeme</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-full ${provider.id === 'stripe' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {provider.id === 'stripe' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>Global kredi kartları</span>
                        </div>
                      </div>

                      {provider.id === 'stripe' && (
                        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-800">Not:</h4>
                            <p className="text-sm text-amber-700">
                              Stripe, Türk bankalarının taksit özelliğini desteklemez. Türk banka kartları için PayTR, Iyzico veya PayU kullanmanız önerilir.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default PaymentSettings;