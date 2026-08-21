import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWhatsApp } from "@/hooks/use-whatsapp";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layouts/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  MessageSquare,
  Settings,
  Users,
  BarChart,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Smartphone,
  ListChecks,
  PlusCircle,
  Trash,
  Edit,
  Copy,
  RefreshCw,
  DownloadCloud,
  Link2,
  QrCode,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const setupFormSchema = z.object({
  mode: z.enum(["demo", "production"]),
  apiKey: z.string().optional(),
  phoneNumber: z.string().optional(),
  autoReply: z.boolean().default(true),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  sessionTimeout: z.number().min(1).default(60),
});

export default function WhatsAppPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { status, refreshStatus, isLoading: statusLoading } = useWhatsApp();
  
  const setupForm = useForm<z.infer<typeof setupFormSchema>>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      mode: "demo",
      autoReply: true,
      sessionTimeout: 60,
    },
  });

  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    content: "",
    description: "",
    isActive: true,
    type: "general",
    variables: "",
  });

  // WhatsApp yapılandırmasını getir
  const { data: whatsAppConfig, isLoading } = useQuery({
    queryKey: ["/api/whatsapp/config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/whatsapp/config");
      return await response.json();
    },
  });

  // Mesaj şablonlarını getir
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/whatsapp/templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/whatsapp/templates");
      return await response.json();
    },
  });

  // Mesaj geçmişini getir
  const { data: messageHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/whatsapp/messages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/whatsapp/messages");
      return await response.json();
    },
  });

  // İstatistikleri getir
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/whatsapp/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/whatsapp/stats");
      return await response.json();
    },
  });

  // WhatsApp yapılandırmasını kaydet mutasyonu
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await apiRequest("POST", "/api/whatsapp/config", configData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Yapılandırma kaydedildi",
        description: "WhatsApp yapılandırması başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Yapılandırma kaydedilirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // WhatsApp bağlan/bağlantıyı kes mutasyonu
  const toggleConnectionMutation = useMutation({
    mutationFn: async (connect: boolean) => {
      const response = await apiRequest("POST", `/api/whatsapp/${connect ? "connect" : "disconnect"}`);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      if (variables) { // Bağlantı isteği
        if (data.qrCode) {
          setQrCode(data.qrCode);
        } else {
          toast({
            title: "Bağlantı başlatıldı",
            description: "WhatsApp bağlantısı başlatılıyor. Lütfen bekleyin...",
          });
          setConnectionStatus("connecting");
        }
      } else { // Bağlantıyı kesme isteği
        toast({
          title: "Bağlantı kesildi",
          description: "WhatsApp bağlantısı başarıyla kesildi.",
        });
        setIsConnected(false);
        setConnectionStatus("disconnected");
        setQrCode(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
    },
    onError: (error: any, variables) => {
      toast({
        title: variables ? "Bağlantı hatası" : "Bağlantı kesme hatası",
        description: `İşlem gerçekleştirilirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Yeni şablon oluştur mutasyonu
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await apiRequest("POST", "/api/whatsapp/templates", templateData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Şablon eklendi",
        description: "Yeni mesaj şablonu başarıyla oluşturuldu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      setIsEditTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Şablon eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Şablon güncelle mutasyonu
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/whatsapp/templates/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Şablon güncellendi",
        description: "Mesaj şablonu başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      setIsEditTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Şablon güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Şablon sil mutasyonu
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/whatsapp/templates/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Şablon silindi",
        description: "Mesaj şablonu başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Şablon silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // WhatsApp durumunu kontrol et
  useEffect(() => {
    if (status) {
      setIsConnected(status.connected);
      setConnectionStatus(status.status);
    }
  }, [status]);

  // Yapılandırma yüklendiğinde formu doldur
  useEffect(() => {
    if (whatsAppConfig) {
      setupForm.reset({
        mode: whatsAppConfig.mode || "demo",
        apiKey: whatsAppConfig.apiKey || "",
        phoneNumber: whatsAppConfig.phoneNumber || "",
        autoReply: whatsAppConfig.autoReply !== undefined ? whatsAppConfig.autoReply : true,
        notificationEmail: whatsAppConfig.notificationEmail || "",
        sessionTimeout: whatsAppConfig.sessionTimeout || 60,
      });
    }
  }, [whatsAppConfig, setupForm]);

  // Form submit işlemi
  const onSubmit = (data: z.infer<typeof setupFormSchema>) => {
    saveConfigMutation.mutate(data);
  };

  // Şablon formu sıfırlama
  const resetTemplateForm = () => {
    setTemplateFormData({
      name: "",
      content: "",
      description: "",
      isActive: true,
      type: "general",
      variables: "",
    });
  };

  // Şablon düzenleme
  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name || "",
      content: template.content || "",
      description: template.description || "",
      isActive: template.isActive,
      type: template.type || "general",
      variables: template.variables || "",
    });
    setIsEditTemplateDialogOpen(true);
  };

  // Şablon silme
  const handleDeleteTemplate = (id: number) => {
    if (window.confirm("Bu şablonu silmek istediğinizden emin misiniz?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  // Şablon formu değişikliği
  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateFormData({ ...templateFormData, [name]: value });
  };

  // Şablon switch değişikliği
  const handleTemplateSwitchChange = (checked: boolean) => {
    setTemplateFormData({ ...templateFormData, isActive: checked });
  };

  // Şablon select değişikliği
  const handleTemplateSelectChange = (value: string) => {
    setTemplateFormData({ ...templateFormData, type: value });
  };

  // Şablon formu gönderme
  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!templateFormData.name || !templateFormData.content) {
      toast({
        title: "Eksik bilgiler",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  // Tarih formatı
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Business API</h1>
            <p className="text-muted-foreground">WhatsApp entegrasyonunu yönetin ve müşteri iletişimini sağlayın</p>
          </div>
          <div className="flex items-center space-x-2">
            {connectionStatus === "connected" ? (
              <Badge className="px-3 py-1 text-sm bg-green-500">Bağlı</Badge>
            ) : connectionStatus === "connecting" ? (
              <Badge className="px-3 py-1 text-sm bg-yellow-500">Bağlanıyor...</Badge>
            ) : (
              <Badge className="px-3 py-1 text-sm bg-red-500">Bağlı Değil</Badge>
            )}
            <Button 
              variant={isConnected ? "destructive" : "default"} 
              onClick={() => toggleConnectionMutation.mutate(!isConnected)}
              disabled={toggleConnectionMutation.isPending}
            >
              {toggleConnectionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isConnected ? "Bağlantıyı Kes" : "Bağlan"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <BarChart className="h-4 w-4 mr-2" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              <span>Mesajlar</span>
            </TabsTrigger>
            <TabsTrigger value="templates">
              <ListChecks className="h-4 w-4 mr-2" />
              <span>Şablonlar</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              <span>Ayarlar</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Sekmesi */}
          <TabsContent value="dashboard">
            {statusLoading || statsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Bağlantı Durumu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      {connectionStatus === "connected" ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : connectionStatus === "connecting" ? (
                        <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      )}
                      <div>
                        <div className="text-2xl font-bold">
                          {connectionStatus === "connected" ? "Aktif" : 
                           connectionStatus === "connecting" ? "Bağlanıyor" : "Bağlı Değil"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {status?.phoneNumber || "Telefon bağlı değil"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => refreshStatus()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>Durumu Yenile</span>
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Mesaj İstatistikleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                    <p className="text-xs text-muted-foreground">Toplam mesaj</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-sm font-medium">{stats?.sentMessages || 0}</div>
                        <p className="text-xs text-muted-foreground">Gönderilen</p>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{stats?.receivedMessages || 0}</div>
                        <p className="text-xs text-muted-foreground">Alınan</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <div className="w-full space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">İletim Oranı</span>
                        <span className="text-xs font-bold">
                          {stats?.deliveryRate ? `${stats.deliveryRate}%` : "N/A"}
                        </span>
                      </div>
                      <Progress value={stats?.deliveryRate || 0} />
                    </div>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Aktif Müşteriler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeCustomers || 0}</div>
                    <p className="text-xs text-muted-foreground">Son 24 saat içinde</p>
                    <div className="mt-4">
                      <div className="text-sm font-medium">{stats?.totalCustomers || 0}</div>
                      <p className="text-xs text-muted-foreground">Toplam müşteri</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      <span>Tüm Müşterileri Gör</span>
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="md:col-span-3">
                  <CardHeader>
                    <CardTitle>Son Mesajlar</CardTitle>
                    <CardDescription>
                      Son 10 mesaj gösteriliyor
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!messageHistory || messageHistory.length === 0 ? (
                      <div className="text-center p-4 border rounded-md">
                        <p className="text-muted-foreground">Henüz mesaj yok.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Yön</TableHead>
                            <TableHead>Numara</TableHead>
                            <TableHead>İçerik</TableHead>
                            <TableHead>Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {messageHistory.slice(0, 10).map((message: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{formatDate(message.timestamp)}</TableCell>
                              <TableCell>
                                {message.direction === "outbound" ? (
                                  <Badge className="bg-blue-500">Giden</Badge>
                                ) : (
                                  <Badge className="bg-green-500">Gelen</Badge>
                                )}
                              </TableCell>
                              <TableCell>{message.phoneNumber}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {message.content}
                              </TableCell>
                              <TableCell>
                                {message.status === "delivered" ? (
                                  <Badge className="bg-green-500">İletildi</Badge>
                                ) : message.status === "read" ? (
                                  <Badge className="bg-blue-500">Okundu</Badge>
                                ) : message.status === "sent" ? (
                                  <Badge variant="outline">Gönderildi</Badge>
                                ) : (
                                  <Badge variant="outline">{message.status}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Mesajlar Sekmesi */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Mesaj Geçmişi</CardTitle>
                <CardDescription>
                  Gönderilen ve alınan tüm WhatsApp mesajları
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !messageHistory || messageHistory.length === 0 ? (
                  <div className="text-center p-4 border rounded-md">
                    <p className="text-muted-foreground">Henüz mesaj yok.</p>
                  </div>
                ) : (
                  <Table>
                    <TableCaption>Toplam {messageHistory.length} mesaj</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Yön</TableHead>
                        <TableHead>Numara</TableHead>
                        <TableHead>İçerik</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messageHistory.map((message: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{message.id || index + 1}</TableCell>
                          <TableCell>{formatDate(message.timestamp)}</TableCell>
                          <TableCell>
                            {message.direction === "outbound" ? (
                              <Badge className="bg-blue-500">Giden</Badge>
                            ) : (
                              <Badge className="bg-green-500">Gelen</Badge>
                            )}
                          </TableCell>
                          <TableCell>{message.phoneNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {message.content}
                          </TableCell>
                          <TableCell>
                            {message.status === "delivered" ? (
                              <Badge className="bg-green-500">İletildi</Badge>
                            ) : message.status === "read" ? (
                              <Badge className="bg-blue-500">Okundu</Badge>
                            ) : message.status === "sent" ? (
                              <Badge variant="outline">Gönderildi</Badge>
                            ) : (
                              <Badge variant="outline">{message.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Şablonlar Sekmesi */}
          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Mesaj Şablonları</h3>
              <Dialog open={isEditTemplateDialogOpen} onOpenChange={setIsEditTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    <span>Yeni Şablon</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Şablon Düzenle" : "Yeni Şablon Ekle"}</DialogTitle>
                    <DialogDescription>
                      WhatsApp mesajları için hazır şablonları {editingTemplate ? "düzenleyin" : "oluşturun"}.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleTemplateSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Şablon Adı
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={templateFormData.name}
                          onChange={handleTemplateInputChange}
                          className="col-span-3"
                          placeholder="Karşılama mesajı"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                          Şablon Tipi
                        </Label>
                        <Select
                          value={templateFormData.type}
                          onValueChange={handleTemplateSelectChange}
                        >
                          <SelectTrigger id="type" className="col-span-3">
                            <SelectValue placeholder="Tip seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">Genel</SelectItem>
                            <SelectItem value="booking">Rezervasyon</SelectItem>
                            <SelectItem value="payment">Ödeme</SelectItem>
                            <SelectItem value="notification">Bildirim</SelectItem>
                            <SelectItem value="support">Destek</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="description" className="text-right pt-2">
                          Açıklama
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={templateFormData.description}
                          onChange={handleTemplateInputChange}
                          className="col-span-3"
                          placeholder="Şablon açıklaması"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="content" className="text-right pt-2">
                          İçerik
                        </Label>
                        <Textarea
                          id="content"
                          name="content"
                          value={templateFormData.content}
                          onChange={handleTemplateInputChange}
                          className="col-span-3"
                          placeholder="Merhaba {{1}}, rezervasyonunuz onaylandı."
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="variables" className="text-right">
                          Değişkenler
                        </Label>
                        <Input
                          id="variables"
                          name="variables"
                          value={templateFormData.variables}
                          onChange={handleTemplateInputChange}
                          className="col-span-3"
                          placeholder="name,bookingId,date (virgülle ayırın)"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isActive" className="text-right">
                          Durum
                        </Label>
                        <div className="flex items-center space-x-2 col-span-3">
                          <Switch
                            id="isActive"
                            checked={templateFormData.isActive}
                            onCheckedChange={handleTemplateSwitchChange}
                          />
                          <Label htmlFor="isActive">{templateFormData.isActive ? "Aktif" : "Pasif"}</Label>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditTemplateDialogOpen(false);
                          resetTemplateForm();
                          setEditingTemplate(null);
                        }}
                      >
                        İptal
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      >
                        {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingTemplate ? "Güncelle" : "Ekle"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {templatesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !templates || templates.length === 0 ? (
                  <div className="text-center p-6 border rounded-md">
                    <div className="mb-4">
                      <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Henüz şablon yok</h3>
                    <p className="text-muted-foreground mb-4">
                      WhatsApp mesajları için hızlı yanıtlar oluşturun
                    </p>
                    <Button 
                      onClick={() => {
                        resetTemplateForm();
                        setIsEditTemplateDialogOpen(true);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      <span>İlk Şablonu Oluştur</span>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableCaption>Toplam {templates.length} şablon</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Ad</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>İçerik</TableHead>
                        <TableHead>Değişkenler</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template: any) => (
                        <TableRow key={template.id}>
                          <TableCell>{template.id}</TableCell>
                          <TableCell className="font-medium">
                            <div>{template.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {template.description || ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {template.type === "booking" ? "Rezervasyon" :
                               template.type === "payment" ? "Ödeme" :
                               template.type === "notification" ? "Bildirim" :
                               template.type === "support" ? "Destek" : "Genel"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{template.content}</TableCell>
                          <TableCell>{template.variables || "-"}</TableCell>
                          <TableCell>
                            {template.isActive ? (
                              <Badge className="bg-green-500">Aktif</Badge>
                            ) : (
                              <Badge variant="outline">Pasif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  navigator.clipboard.writeText(template.content);
                                  toast({
                                    title: "Kopyalandı",
                                    description: "Şablon içeriği panoya kopyalandı.",
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-500" 
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ayarlar Sekmesi */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp API Yapılandırması</CardTitle>
                <CardDescription>
                  WhatsApp Business API bağlantı ayarlarını yapılandırın
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Form {...setupForm}>
                    <form onSubmit={setupForm.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={setupForm.control}
                          name="mode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Çalışma Modu</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Mod seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="demo">Demo Mod</SelectItem>
                                  <SelectItem value="production">Üretim Modu</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Demo mod, API anahtarı olmadan simülasyon yapmanızı sağlar
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={setupForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefon Numarası</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+90 5XX XXX XX XX" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                WhatsApp Business API'ye bağlı telefon numarası
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {setupForm.watch("mode") === "production" && (
                        <FormField
                          control={setupForm.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Anahtarı</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="WhatsApp Business API anahtarı" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                WhatsApp Business API ile iletişim için gerekli API anahtarı
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={setupForm.control}
                          name="autoReply"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Otomatik Yanıt
                                </FormLabel>
                                <FormDescription>
                                  Gelen mesajlara otomatik yanıt verilsin mi?
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
                          control={setupForm.control}
                          name="sessionTimeout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Oturum Zaman Aşımı (dakika)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Kullanıcı oturumlarının ne kadar süre aktif kalacağı
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={setupForm.control}
                        name="notificationEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bildirim E-postası</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="notifications@example.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              WhatsApp bağlantı durumu değişiklikleri hakkında bildirim alınacak e-posta
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="submit"
                          disabled={saveConfigMutation.isPending}
                        >
                          {saveConfigMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Kaydet
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            {qrCode && (
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>QR Kodu Tarayın</CardTitle>
                    <CardDescription>
                      WhatsApp hesabınıza bağlanmak için QR kodunu telefonunuzdan tarayın
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div className="w-64 h-64 p-2 border rounded-md">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-full h-full" 
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => setQrCode(null)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span>İptal</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => refreshStatus()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>Durumu Kontrol Et</span>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}