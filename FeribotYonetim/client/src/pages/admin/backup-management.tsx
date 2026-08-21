import React from 'react';
import AdminLayout from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Check, Clock, Download, ExternalLink, HardDrive, RotateCw, Save, Search, Server, TimerReset, Trash2, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Form schemas
const backupFormSchema = z.object({
  name: z.string().min(1, "Yedek adı gereklidir"),
  description: z.string().optional(),
  backupType: z.enum(["full", "incremental", "differential"]),
  compressionType: z.enum(["gzip", "zip", "none"]),
  encryptionEnabled: z.boolean().default(false),
  retentionDays: z.number().min(1, "En az 1 gün olmalıdır"),
  includeData: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
});

const scheduleFormSchema = z.object({
  name: z.string().min(1, "Program adı gereklidir"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli bir saat formatı olmalıdır (HH:MM)"),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  backupType: z.enum(["full", "incremental", "differential"]),
  retentionDays: z.number().min(1, "En az 1 gün olmalıdır"),
  compressionType: z.enum(["gzip", "zip", "none"]),
  encryptionEnabled: z.boolean().default(false),
  includeData: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
  backupDestination: z.enum(["local", "s3", "cloud"]),
  destinationSettings: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().default(true),
});

const restoreFormSchema = z.object({
  backupId: z.number().min(1, "Bir yedek seçilmelidir"),
  name: z.string().min(1, "İşlem adı gereklidir"),
  description: z.string().optional(),
  restoreType: z.enum(["full", "partial"]),
  targetEnvironment: z.enum(["production", "staging", "test"]),
  includeData: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
  selectedTables: z.string().optional(),
  postRestoreScript: z.string().optional(),
});

const recoveryPointFormSchema = z.object({
  name: z.string().min(1, "Kurtarma noktası adı gereklidir"),
  description: z.string().optional(),
  backupId: z.number().min(1, "Bir yedek seçilmelidir"),
  recoveryPointObjective: z.number().min(1, "RPO dakika olarak en az 1 olmalıdır"),
  recoveryTimeObjective: z.number().min(1, "RTO dakika olarak en az 1 olmalıdır"),
  isActive: z.boolean().default(true),
});

// Type definitions
type BackupFormValues = z.infer<typeof backupFormSchema>;
type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;
type RestoreFormValues = z.infer<typeof restoreFormSchema>;
type RecoveryPointFormValues = z.infer<typeof recoveryPointFormSchema>;

// Utility type for backup status
type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// Utility function to get status badge
const getStatusBadge = (status: BackupStatus) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Bekliyor</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">İşlemde</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Tamamlandı</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Başarısız</Badge>;
    default:
      return <Badge variant="outline">Bilinmiyor</Badge>;
  }
};

export default function BackupManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("manual-backup");
  
  // Manual backup form
  const backupForm = useForm<BackupFormValues>({
    resolver: zodResolver(backupFormSchema),
    defaultValues: {
      name: `Manual Backup ${new Date().toISOString().split('T')[0]}`,
      backupType: "full",
      compressionType: "gzip",
      encryptionEnabled: false,
      retentionDays: 30,
      includeData: true,
      includeFiles: true,
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async (data: BackupFormValues) => {
      const response = await apiRequest('POST', '/api/backup/create', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Yedekleme başlatıldı",
        description: "Yedekleme işlemi arka planda devam ediyor",
      });
      backupForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Yedekleme başlatılamadı",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Schedule form
  const scheduleForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: "Günlük Yedekleme",
      frequency: "daily",
      timeOfDay: "02:00",
      backupType: "full",
      retentionDays: 30,
      compressionType: "gzip",
      encryptionEnabled: false,
      includeData: true,
      includeFiles: true,
      backupDestination: "local",
      isActive: true,
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      const response = await apiRequest('POST', '/api/backup/schedule/create', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/schedule/list'] });
      toast({
        title: "Yedekleme programı oluşturuldu",
        description: "Yedekleme programı başarıyla kaydedildi",
      });
      scheduleForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Yedekleme programı oluşturulamadı",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore form
  const restoreForm = useForm<RestoreFormValues>({
    resolver: zodResolver(restoreFormSchema),
    defaultValues: {
      name: `Restore Operation ${new Date().toISOString().split('T')[0]}`,
      restoreType: "full",
      targetEnvironment: "staging",
      includeData: true,
      includeFiles: true,
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (data: RestoreFormValues) => {
      const response = await apiRequest('POST', '/api/backup/restore', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/restore/list'] });
      toast({
        title: "Geri yükleme başlatıldı",
        description: "Geri yükleme işlemi arka planda devam ediyor",
      });
      restoreForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Geri yükleme başlatılamadı",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Queries
  const { data: backups, isLoading: isLoadingBackups } = useQuery({
    queryKey: ['/api/backup/list'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/backup/list');
      return await res.json();
    }
  });

  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['/api/backup/schedule/list'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/backup/schedule/list');
      return await res.json();
    }
  });

  const { data: restoreOperations, isLoading: isLoadingRestoreOps } = useQuery({
    queryKey: ['/api/backup/restore/list'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/backup/restore/list');
      return await res.json();
    }
  });

  const { data: recoveryPoints, isLoading: isLoadingRecoveryPoints } = useQuery({
    queryKey: ['/api/backup/recovery-points'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/backup/recovery-points');
      return await res.json();
    }
  });

  // Delete mutations
  const deleteBackupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/backup/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Yedek silindi",
        description: "Yedek başarıyla silindi",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/backup/schedule/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/schedule/list'] });
      toast({
        title: "Program silindi",
        description: "Yedekleme programı başarıyla silindi",
      });
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/backup/schedule/${id}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/schedule/list'] });
    },
  });

  const runNowScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/backup/schedule/${id}/run-now`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Yedekleme başlatıldı",
        description: "Programlı yedekleme manuel olarak başlatıldı",
      });
    },
  });

  // Event handlers
  const onBackupSubmit = (data: BackupFormValues) => {
    createBackupMutation.mutate(data);
  };

  const onScheduleSubmit = (data: ScheduleFormValues) => {
    createScheduleMutation.mutate(data);
  };

  const onRestoreSubmit = (data: RestoreFormValues) => {
    restoreMutation.mutate(data);
  };

  // Utility function for time input in schedule form
  const handleScheduleFrequencyChange = (value: string) => {
    if (value === 'weekly') {
      scheduleForm.setValue('dayOfWeek', 1);
    } else if (value === 'monthly') {
      scheduleForm.setValue('dayOfMonth', 1);
    }
  };

  // Utility functions for frequency display
  const getFrequencyDisplay = (schedule: any) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Her gün ${schedule.timeOfDay}`;
      case 'weekly':
        return `Her hafta ${getDayName(schedule.dayOfWeek)} ${schedule.timeOfDay}`;
      case 'monthly':
        return `Her ay ${schedule.dayOfMonth}. gün ${schedule.timeOfDay}`;
      default:
        return 'Bilinmeyen frekans';
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[dayOfWeek] || 'Bilinmeyen gün';
  };

  // Calculate backup size in appropriate units
  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes, 10);
    if (isNaN(size)) return "Bilinmeyen boyut";
    
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Yedekleme ve Kurtarma Yönetimi</h1>
            <p className="text-muted-foreground">Sistem yedeklerini oluşturun, yönetin ve geri yükleyin</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="manual-backup">Manuel Yedekleme</TabsTrigger>
            <TabsTrigger value="scheduled-backup">Otomatik Yedekleme</TabsTrigger>
            <TabsTrigger value="backups">Yedekler</TabsTrigger>
            <TabsTrigger value="recovery">Kurtarma</TabsTrigger>
          </TabsList>
          
          {/* Manuel Yedekleme Sekmesi */}
          <TabsContent value="manual-backup" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Manuel Yedekleme Oluştur</CardTitle>
                    <CardDescription>
                      Sistemin anlık bir yedeğini oluşturun. Bu işlem arka planda çalışacak ve 
                      tamamlandığında bildirim alacaksınız.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...backupForm}>
                      <form onSubmit={backupForm.handleSubmit(onBackupSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={backupForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Yedek Adı</FormLabel>
                                <FormControl>
                                  <Input placeholder="Yedek adı" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={backupForm.control}
                            name="backupType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Yedek Tipi</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Yedek tipi seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="full">Tam Yedek</SelectItem>
                                    <SelectItem value="incremental">Artırımlı Yedek</SelectItem>
                                    <SelectItem value="differential">Fark Yedeği</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Tam yedek en güvenli ancak en çok alan kaplayan seçenektir.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={backupForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Açıklama</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Bu yedeğin amacını ve içeriğini açıklayın" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={backupForm.control}
                            name="compressionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sıkıştırma Tipi</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sıkıştırma tipi seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="gzip">GZIP</SelectItem>
                                    <SelectItem value="zip">ZIP</SelectItem>
                                    <SelectItem value="none">Sıkıştırma Yok</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={backupForm.control}
                            name="retentionDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Saklama Süresi (gün)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max="365" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Bu yedeğin sistemde tutulacağı süre
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={backupForm.control}
                            name="encryptionEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Şifreleme</FormLabel>
                                  <FormDescription>
                                    Yedek içeriğini şifrele
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
                            control={backupForm.control}
                            name="includeData"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Veritabanı</FormLabel>
                                  <FormDescription>
                                    Veritabanı verilerini dahil et
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
                            control={backupForm.control}
                            name="includeFiles"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Dosyalar</FormLabel>
                                  <FormDescription>
                                    Sistem dosyalarını dahil et
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
                        </div>
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={createBackupMutation.isPending}
                            className="w-full md:w-auto"
                          >
                            {createBackupMutation.isPending ? (
                              <>
                                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                Yedekleme Başlatılıyor...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Yedekleme Başlat
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Yedekleme Bilgileri</CardTitle>
                    <CardDescription>
                      Yedekleme işlemi hakkında önemli bilgiler
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Yedek Tipleri:</h4>
                      <div className="text-sm">
                        <p><strong>Tam Yedek:</strong> Tüm sistem verilerinin tam bir kopyasını alır.</p>
                        <p><strong>Artırımlı Yedek:</strong> Son yedekten bu yana yapılan değişiklikleri kaydeder.</p>
                        <p><strong>Fark Yedeği:</strong> Son tam yedekten bu yana yapılan tüm değişiklikleri kaydeder.</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Sıkıştırma Tipleri:</h4>
                      <div className="text-sm">
                        <p><strong>GZIP:</strong> Yüksek sıkıştırma oranı, tekli dosya formatı.</p>
                        <p><strong>ZIP:</strong> Orta düzey sıkıştırma, dosyalara kolay erişim.</p>
                        <p><strong>Sıkıştırma Yok:</strong> Sıkıştırma yapılmaz, işlem hızlıdır.</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Öneriler:</h4>
                      <div className="text-sm space-y-2">
                        <p>• Kritik güncellemelerden önce tam yedek alın.</p>
                        <p>• Uzun saklama süresi olan tam yedekleri düzenli olarak planlayın.</p>
                        <p>• Kritik veriler için şifreleme kullanın.</p>
                        <p>• Mümkünse yedekleri çeşitli lokasyonlarda saklayın.</p>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Önemli</AlertTitle>
                      <AlertDescription>
                        Yedekleme işlemi sistem performansını etkileyebilir. Yoğun olmayan saatlerde yapılması önerilir.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Programlı Yedekleme Sekmesi */}
          <TabsContent value="scheduled-backup" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Otomatik Yedekleme Programı</CardTitle>
                    <CardDescription>
                      Düzenli aralıklarla otomatik yedekleme yapmak için bir program oluşturun.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...scheduleForm}>
                      <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={scheduleForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Program Adı</FormLabel>
                                <FormControl>
                                  <Input placeholder="Program adı" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={scheduleForm.control}
                            name="frequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frekans</FormLabel>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    handleScheduleFrequencyChange(value);
                                  }} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Frekans seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="daily">Günlük</SelectItem>
                                    <SelectItem value="weekly">Haftalık</SelectItem>
                                    <SelectItem value="monthly">Aylık</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={scheduleForm.control}
                            name="timeOfDay"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Saat</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Yedeğin alınacağı saat (24 saat formatında)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {scheduleForm.watch('frequency') === 'weekly' && (
                            <FormField
                              control={scheduleForm.control}
                              name="dayOfWeek"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Haftanın Günü</FormLabel>
                                  <Select 
                                    onValueChange={(value) => field.onChange(parseInt(value))} 
                                    value={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Gün seçin" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="0">Pazar</SelectItem>
                                      <SelectItem value="1">Pazartesi</SelectItem>
                                      <SelectItem value="2">Salı</SelectItem>
                                      <SelectItem value="3">Çarşamba</SelectItem>
                                      <SelectItem value="4">Perşembe</SelectItem>
                                      <SelectItem value="5">Cuma</SelectItem>
                                      <SelectItem value="6">Cumartesi</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          {scheduleForm.watch('frequency') === 'monthly' && (
                            <FormField
                              control={scheduleForm.control}
                              name="dayOfMonth"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ayın Günü</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      max="31" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          <FormField
                            control={scheduleForm.control}
                            name="backupType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Yedek Tipi</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Yedek tipi seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="full">Tam Yedek</SelectItem>
                                    <SelectItem value="incremental">Artırımlı Yedek</SelectItem>
                                    <SelectItem value="differential">Fark Yedeği</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={scheduleForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Açıklama</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Bu program hakkında not ekleyin" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={scheduleForm.control}
                            name="compressionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sıkıştırma Tipi</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sıkıştırma tipi seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="gzip">GZIP</SelectItem>
                                    <SelectItem value="zip">ZIP</SelectItem>
                                    <SelectItem value="none">Sıkıştırma Yok</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={scheduleForm.control}
                            name="retentionDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Saklama Süresi (gün)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max="365" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Bu yedeğin sistemde tutulacağı süre
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={scheduleForm.control}
                            name="backupDestination"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Yedek Hedefi</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Hedef seçin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="local">Yerel Disk</SelectItem>
                                    <SelectItem value="s3">S3 Bucket</SelectItem>
                                    <SelectItem value="cloud">Bulut Depolama</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={scheduleForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-6">
                                <div className="space-y-0.5">
                                  <FormLabel>Aktif</FormLabel>
                                  <FormDescription>
                                    Programı hemen aktif et
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
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={scheduleForm.control}
                            name="encryptionEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Şifreleme</FormLabel>
                                  <FormDescription>
                                    Yedek içeriğini şifrele
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
                            control={scheduleForm.control}
                            name="includeData"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Veritabanı</FormLabel>
                                  <FormDescription>
                                    Veritabanı verilerini dahil et
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
                            control={scheduleForm.control}
                            name="includeFiles"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Dosyalar</FormLabel>
                                  <FormDescription>
                                    Sistem dosyalarını dahil et
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
                        </div>
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={createScheduleMutation.isPending}
                            className="w-full md:w-auto"
                          >
                            {createScheduleMutation.isPending ? (
                              <>
                                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                Program Oluşturuluyor...
                              </>
                            ) : (
                              <>
                                <Clock className="mr-2 h-4 w-4" />
                                Program Oluştur
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Programlı Yedekler</CardTitle>
                    <CardDescription>
                      Aktif yedekleme programları
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      {isLoadingSchedules ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col space-y-2 p-3 border rounded-md">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                              <div className="flex justify-between pt-2">
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="h-8 w-8" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : schedules && schedules.length > 0 ? (
                        <div className="space-y-4">
                          {schedules.map((schedule: any) => (
                            <div key={schedule.id} className="p-4 border rounded-md relative">
                              <div className="absolute right-3 top-3">
                                <Switch 
                                  checked={schedule.isActive} 
                                  onCheckedChange={(checked) => 
                                    toggleScheduleMutation.mutate({ id: schedule.id, isActive: checked })
                                  }
                                />
                              </div>
                              <h4 className="font-medium truncate pr-16">{schedule.name}</h4>
                              <p className="text-sm text-muted-foreground">{getFrequencyDisplay(schedule)}</p>
                              <div className="mt-1 flex items-center text-xs text-muted-foreground">
                                <Badge variant="outline" className="mr-1">
                                  {schedule.backupType === 'full' ? 'Tam' : 
                                   schedule.backupType === 'incremental' ? 'Artırımlı' : 'Fark'}
                                </Badge>
                                <span className="mr-2">{schedule.retentionDays} gün saklama</span>
                              </div>
                              <div className="flex justify-between items-center mt-3">
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => runNowScheduleMutation.mutate(schedule.id)}
                                    disabled={runNowScheduleMutation.isPending}
                                  >
                                    {runNowScheduleMutation.isPending ? (
                                      <RotateCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <><RotateCw className="h-4 w-4 mr-1" /> Şimdi Çalıştır</>
                                    )}
                                  </Button>
                                </div>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Yedekleme Programını Sil</DialogTitle>
                                      <DialogDescription>
                                        Bu programı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">İptal</Button>
                                      </DialogClose>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                        disabled={deleteScheduleMutation.isPending}
                                      >
                                        {deleteScheduleMutation.isPending ? (
                                          <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="mr-2 h-4 w-4" />
                                        )}
                                        Sil
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Henüz bir yedekleme programı oluşturulmadı.</p>
                          <p className="text-sm">Otomatik yedeklemeler için program oluşturun.</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Yedekler Sekmesi */}
          <TabsContent value="backups" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <CardTitle>Sistem Yedekleri</CardTitle>
                    <CardDescription>
                      Tüm sistemin mevcut yedekleri
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" className="h-8" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] })}>
                      <RotateCw className="h-4 w-4 mr-1" />
                      Yenile
                    </Button>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue placeholder="Filtre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Yedekler</SelectItem>
                        <SelectItem value="manual">Manuel Yedekler</SelectItem>
                        <SelectItem value="automatic">Otomatik Yedekler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingBackups ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex space-x-2">
                          <Skeleton className="h-9 w-9 rounded-md" />
                          <Skeleton className="h-9 w-9 rounded-md" />
                          <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : backups && backups.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Yedek Adı</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead className="hidden md:table-cell">Oluşturma</TableHead>
                        <TableHead className="hidden md:table-cell">Boyut</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup: any) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <HardDrive className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{backup.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground block md:hidden">
                              {new Date(backup.createdAt).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {backup.backupType === 'full' ? 'Tam' : 
                              backup.backupType === 'incremental' ? 'Artırımlı' : 'Fark'}
                            </Badge>
                            <div className="text-xs text-muted-foreground block md:hidden">
                              {formatFileSize(backup.size)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(backup.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatFileSize(backup.size)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(backup.status as BackupStatus)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="ghost" size="icon" disabled={backup.status !== 'completed'}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Yedek Detayları</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Temel Bilgiler</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Ad:</span>
                                          <span className="font-medium">{backup.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Oluşturulma:</span>
                                          <span>{new Date(backup.createdAt).toLocaleString()}</span>
                                        </div>
                                        {backup.completedAt && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tamamlanma:</span>
                                            <span>{new Date(backup.completedAt).toLocaleString()}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Durum:</span>
                                          <span>{getStatusBadge(backup.status as BackupStatus)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Tür:</span>
                                          <span>
                                            {backup.backupType === 'full' ? 'Tam Yedek' : 
                                            backup.backupType === 'incremental' ? 'Artırımlı Yedek' : 'Fark Yedeği'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Boyut:</span>
                                          <span>{formatFileSize(backup.size)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Sıkıştırma:</span>
                                          <span>{backup.compressionType.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Şifreleme:</span>
                                          <span>{backup.encryptionEnabled ? 'Aktif' : 'Pasif'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Saklama:</span>
                                          <span>{backup.retentionDays} gün</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Kaynak:</span>
                                          <span>{backup.isAutomatic ? 'Otomatik' : 'Manuel'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">İçerik Bilgileri</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Veritabanı:</span>
                                          <span>{backup.includeData ? 'Dahil' : 'Hariç'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Dosyalar:</span>
                                          <span>{backup.includeFiles ? 'Dahil' : 'Hariç'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Dosya Yolu:</span>
                                          <span className="truncate max-w-[200px]">{backup.filePath}</span>
                                        </div>
                                      </div>
                                      
                                      <h4 className="text-sm font-medium mt-4 mb-2">Açıklama</h4>
                                      <p className="text-sm border rounded-md p-2 min-h-[80px] bg-muted">
                                        {backup.description || "Açıklama bulunmuyor."}
                                      </p>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button 
                                      variant="outline" 
                                      className="mr-auto"
                                      disabled={backup.status !== 'completed'}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      İndir
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => {
                                        deleteBackupMutation.mutate(backup.id);
                                      }}
                                      disabled={deleteBackupMutation.isPending}
                                    >
                                      {deleteBackupMutation.isPending ? (
                                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                      )}
                                      Sil
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Yedeği Sil</DialogTitle>
                                    <DialogDescription>
                                      Bu yedeği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">İptal</Button>
                                    </DialogClose>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => deleteBackupMutation.mutate(backup.id)}
                                      disabled={deleteBackupMutation.isPending}
                                    >
                                      {deleteBackupMutation.isPending ? (
                                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                      )}
                                      Sil
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <HardDrive className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-xl font-semibold">Henüz yedek bulunmuyor</h3>
                    <p className="text-muted-foreground mt-1">
                      Sistemi korumak için manuel veya programlı yedekler oluşturun.
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setActiveTab("manual-backup")}
                    >
                      Yedekleme Oluştur
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Kurtarma Sekmesi */}
          <TabsContent value="recovery" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Tabs defaultValue="restore">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="restore">Geri Yükleme</TabsTrigger>
                    <TabsTrigger value="disaster-recovery">Afet Kurtarma</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="restore" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Geri Yükleme Operasyonu</CardTitle>
                        <CardDescription>
                          Bir yedeği geri yükleyerek sistemi önceki bir duruma döndürün.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...restoreForm}>
                          <form onSubmit={restoreForm.handleSubmit(onRestoreSubmit)} className="space-y-4">
                            <FormField
                              control={restoreForm.control}
                              name="backupId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Yedek Seçin</FormLabel>
                                  <Select 
                                    onValueChange={(value) => field.onChange(parseInt(value))} 
                                    defaultValue={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Bir yedek seçin" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {isLoadingBackups ? (
                                        <div className="p-2">Yedekler yükleniyor...</div>
                                      ) : backups && backups.length > 0 ? (
                                        backups
                                          .filter((backup: any) => backup.status === 'completed')
                                          .map((backup: any) => (
                                            <SelectItem key={backup.id} value={backup.id.toString()}>
                                              {backup.name} ({new Date(backup.createdAt).toLocaleDateString()})
                                            </SelectItem>
                                          ))
                                      ) : (
                                        <div className="p-2">Kullanılabilir yedek bulunamadı</div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Sadece başarıyla tamamlanmış yedekler gösterilmektedir.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={restoreForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>İşlem Adı</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Geri yükleme işlemi adı" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={restoreForm.control}
                                name="restoreType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Geri Yükleme Tipi</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Geri yükleme tipi seçin" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="full">Tam Geri Yükleme</SelectItem>
                                        <SelectItem value="partial">Kısmi Geri Yükleme</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Kısmi geri yükleme belirli tabloları seçmenize olanak tanır.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={restoreForm.control}
                              name="targetEnvironment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Hedef Ortam</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Hedef ortam seçin" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="production">Üretim</SelectItem>
                                      <SelectItem value="staging">Hazırlık</SelectItem>
                                      <SelectItem value="test">Test</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Dikkat: Üretim ortamına geri yükleme yapmak sistemin çalışmasını etkileyebilir.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={restoreForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Açıklama</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Bu geri yükleme işleminin amacını açıklayın" 
                                      {...field} 
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {restoreForm.watch('restoreType') === 'partial' && (
                              <FormField
                                control={restoreForm.control}
                                name="selectedTables"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Seçilen Tablolar</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Virgülle ayrılmış tablo adları" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormDescription>
                                      Sadece belirli tabloları geri yüklemek için virgülle ayırarak yazın (örn: users,bookings,routes)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={restoreForm.control}
                                name="includeData"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                      <FormLabel>Veritabanı</FormLabel>
                                      <FormDescription>
                                        Veritabanı verilerini geri yükle
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
                                control={restoreForm.control}
                                name="includeFiles"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                      <FormLabel>Dosyalar</FormLabel>
                                      <FormDescription>
                                        Sistem dosyalarını geri yükle
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
                            </div>
                            
                            <FormField
                              control={restoreForm.control}
                              name="postRestoreScript"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Geri Yükleme Sonrası Betik</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Geri yükleme tamamlandıktan sonra çalıştırılacak SQL sorguları veya komutlar" 
                                      className="font-mono text-sm"
                                      rows={5}
                                      {...field} 
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    İsteğe bağlı: Geri yükleme tamamlandıktan sonra çalıştırılacak SQL sorguları veya komutlar
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Kritik İşlem Uyarısı</AlertTitle>
                              <AlertDescription>
                                Geri yükleme işlemi, mevcut verilerin üzerine yazacak ve bu işlem geri alınamayacaktır. 
                                İşlemden önce mevcut durumun yeni bir yedeğini almanız önerilir.
                              </AlertDescription>
                            </Alert>
                            
                            <div className="flex justify-end">
                              <Button 
                                type="submit" 
                                disabled={restoreMutation.isPending || !backups || backups.length === 0}
                                className="w-full md:w-auto"
                              >
                                {restoreMutation.isPending ? (
                                  <>
                                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                    İşlem Başlatılıyor...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Geri Yükleme Başlat
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="disaster-recovery" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Afet Kurtarma Noktaları</CardTitle>
                        <CardDescription>
                          Afet durumlarında sistemi belirli bir kurtarma noktasına geri döndürmek için kullanılır.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Kurtarma Noktaları</h3>
                            
                            {isLoadingRecoveryPoints ? (
                              <div className="space-y-3">
                                {[1, 2].map((i) => (
                                  <div key={i} className="flex flex-col space-y-2 p-4 border rounded-md">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <div className="flex justify-between mt-2">
                                      <Skeleton className="h-8 w-24" />
                                      <Skeleton className="h-8 w-24" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : recoveryPoints && recoveryPoints.length > 0 ? (
                              <div className="space-y-4">
                                {recoveryPoints.map((point: any) => (
                                  <div key={point.id} className="p-4 border rounded-md">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-medium">{point.name}</h4>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Oluşturulma: {new Date(point.createdAt).toLocaleString()}
                                        </div>
                                        <div className="flex items-center mt-1">
                                          <Badge variant={point.isActive ? "outline" : "secondary"} className="mr-2">
                                            {point.isActive ? "Aktif" : "Pasif"}
                                          </Badge>
                                          <span className="text-xs">
                                            RPO: {point.recoveryPointObjective} dk / RTO: {point.recoveryTimeObjective} dk
                                          </span>
                                        </div>
                                        <p className="text-sm mt-2">{point.description || "Açıklama bulunmuyor."}</p>
                                      </div>
                                      <div className="ml-4 flex space-x-2">
                                        <Button variant="outline" size="sm">
                                          <TimerReset className="h-4 w-4 mr-1" />
                                          Test Et
                                        </Button>
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                              <ExternalLink className="h-4 w-4 mr-1" />
                                              Onayla
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle>Afet Kurtarma Operasyonu Başlat</DialogTitle>
                                              <DialogDescription>
                                                Bu işlem sistemi "{point.name}" kurtarma noktasına geri döndürecektir. 
                                                Bu kritik bir operasyondur ve yalnızca afet durumlarında kullanılmalıdır.
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                              <Alert variant="destructive" className="mb-4">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>DİKKAT: Kritik İşlem</AlertTitle>
                                                <AlertDescription>
                                                  Bu işlem geri alınamaz ve sistem bütünlüğünü etkileyecektir. 
                                                  İşlem sırasında sistem kısa süreliğine devre dışı kalacaktır.
                                                </AlertDescription>
                                              </Alert>
                                              <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                  <span className="text-muted-foreground">Kurtarma Noktası:</span>
                                                  <span className="font-medium">{point.name}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                  <span className="text-muted-foreground">Bağlı Yedek:</span>
                                                  <span>
                                                    {backups?.find((b: any) => b.id === point.backupId)?.name || "Bilinmiyor"}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                  <span className="text-muted-foreground">Oluşturulma:</span>
                                                  <span>{new Date(point.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                  <span className="text-muted-foreground">Son Test:</span>
                                                  <span>
                                                    {point.lastTestedAt ? 
                                                      `${new Date(point.lastTestedAt).toLocaleString()} (${point.testResult})` : 
                                                      "Test edilmedi"}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            <DialogFooter>
                                              <Button variant="outline">İptal</Button>
                                              <Button variant="destructive">
                                                Kurtarma İşlemini Başlat
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 border rounded-md">
                                <Server className="h-10 w-10 text-muted-foreground mx-auto" />
                                <h3 className="mt-2 font-medium">Kurtarma Noktası Bulunamadı</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Afet kurtarma için özel kurtarma noktaları oluşturun
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Aktif Geri Yükleme İşlemleri</h3>
                            
                            {isLoadingRestoreOps ? (
                              <div className="space-y-3">
                                {[1, 2].map((i) => (
                                  <div key={i} className="p-4 border rounded-md space-y-3">
                                    <div className="flex justify-between">
                                      <Skeleton className="h-5 w-1/3" />
                                      <Skeleton className="h-5 w-1/4" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-2 w-full" />
                                  </div>
                                ))}
                              </div>
                            ) : restoreOperations && restoreOperations.length > 0 ? (
                              <div className="space-y-4">
                                {restoreOperations
                                  .filter((op: any) => op.status === 'pending' || op.status === 'in_progress')
                                  .map((operation: any) => (
                                    <div key={operation.id} className="p-4 border rounded-md">
                                      <div className="flex justify-between items-center">
                                        <h4 className="font-medium">{operation.name}</h4>
                                        {getStatusBadge(operation.status as BackupStatus)}
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Başlatılma: {new Date(operation.startedAt).toLocaleString()}
                                      </p>
                                      <div className="mt-3">
                                        <div className="flex justify-between mb-1 text-xs">
                                          <span>İlerleme</span>
                                          <span>%{operation.status === 'in_progress' ? '45' : '0'}</span>
                                        </div>
                                        <Progress 
                                          value={operation.status === 'in_progress' ? 45 : 0} 
                                          className="h-2"
                                        />
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 border rounded-md">
                                <p className="text-muted-foreground">Aktif geri yükleme işlemi bulunmuyor</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">İşlem Geçmişi</h3>
                            
                            {isLoadingRestoreOps ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                  <Skeleton key={i} className="h-10 w-full" />
                                ))}
                              </div>
                            ) : restoreOperations && restoreOperations.length > 0 ? (
                              <div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>İşlem</TableHead>
                                      <TableHead>Durum</TableHead>
                                      <TableHead className="hidden md:table-cell">Başlangıç</TableHead>
                                      <TableHead className="hidden md:table-cell">Bitiş</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {restoreOperations
                                      .filter((op: any) => op.status === 'completed' || op.status === 'failed')
                                      .map((operation: any) => (
                                        <TableRow key={operation.id}>
                                          <TableCell>
                                            <div className="font-medium">{operation.name}</div>
                                            <div className="text-xs text-muted-foreground md:hidden">
                                              {new Date(operation.startedAt).toLocaleString()}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {getStatusBadge(operation.status as BackupStatus)}
                                          </TableCell>
                                          <TableCell className="hidden md:table-cell">
                                            {new Date(operation.startedAt).toLocaleString()}
                                          </TableCell>
                                          <TableCell className="hidden md:table-cell">
                                            {operation.completedAt ? 
                                              new Date(operation.completedAt).toLocaleString() : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-center py-6 border rounded-md">
                                <p className="text-muted-foreground">Tamamlanmış geri yükleme işlemi bulunmuyor</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Afet Kurtarma Planı</CardTitle>
                    <CardDescription>
                      Sistem kesintilerinde hızlı kurtarma
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Kurtarma Planı Aşamaları:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mr-2 mt-px flex-shrink-0">1</div>
                          <p><strong>İlk Değerlendirme:</strong> Sistem durumu ve sorunun kapsamını belirleyin</p>
                        </div>
                        <div className="flex items-start">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mr-2 mt-px flex-shrink-0">2</div>
                          <p><strong>Kurtarma Noktası Seçimi:</strong> En uygun kurtarma noktasını belirleyin</p>
                        </div>
                        <div className="flex items-start">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mr-2 mt-px flex-shrink-0">3</div>
                          <p><strong>İşlem Başlatma:</strong> Geri yükleme işlemini onaylayıp başlatın</p>
                        </div>
                        <div className="flex items-start">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mr-2 mt-px flex-shrink-0">4</div>
                          <p><strong>Doğrulama:</strong> Geri yükleme sonrası sistem bütünlüğünü kontrol edin</p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">RPO ve RTO Hedefleri:</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>RPO (Recovery Point Objective):</strong> Veri kaybının kabul edilebilir süresi</p>
                        <p><strong>RTO (Recovery Time Objective):</strong> Sistemin tekrar çalışır duruma gelmesi için geçecek süre</p>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Afet Kurtarma Önlemleri</AlertTitle>
                      <AlertDescription>
                        Etkili bir afet kurtarma planı için düzenli aralıklarla kurtarma noktalarının testi yapılmalıdır.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="pt-2">
                      <Button className="w-full" variant="outline">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Detaylı Afet Kurtarma Planını Görüntüle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}