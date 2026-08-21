import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const marsRouteSchema = z.object({
  name: z.string().min(3, "Lütfen en az 3 karakter giriniz"),
  description: z.string().min(10, "Lütfen en az 10 karakter giriniz"),
  imageUrl: z.string().url("Geçerli bir URL giriniz"),
  departureTerminal: z.string().min(3, "Lütfen kalkış terminali adını giriniz"),
  arrivalTerminal: z.string().min(3, "Lütfen varış terminali adını giriniz"),
  journeyTime: z.string().min(1, "Yolculuk süresini giriniz"),
  price: z.string().min(1, "Fiyat bilgisini giriniz"),
  capacity: z.string().min(1, "Kapasite bilgisini giriniz"),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  departureSchedules: z.array(z.object({
    time: z.string(),
    days: z.array(z.string())
  })).default([]),
  launchDate: z.date().optional(),
  returnDate: z.date().optional(),
})

type MarsRoute = z.infer<typeof marsRouteSchema>;

export default function MarsOldakiPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("routes");
  const [addRouteOpen, setAddRouteOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MarsRoute | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<number | null>(null);
  
  // Form for adding/editing routes
  const form = useForm<MarsRoute>({
    resolver: zodResolver(marsRouteSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      departureTerminal: "",
      arrivalTerminal: "",
      journeyTime: "",
      price: "",
      capacity: "",
      isActive: true,
      tags: [],
      departureSchedules: [],
      launchDate: undefined,
      returnDate: undefined,
    }
  });
  
  // Fetch Mars routes
  const { data: marsRoutes = [], isLoading } = useQuery({
    queryKey: ["/api/admin/mars-routes"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/mars-routes");
        return await res.json();
      } catch (error) {
        console.error("Mars rotaları alınamadı:", error);
        return [];
      }
    },
  });
  
  // Mutation for adding a new Mars route
  const addRouteMutation = useMutation({
    mutationFn: async (data: MarsRoute) => {
      const res = await apiRequest("POST", "/api/admin/mars-routes", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mars rotası eklendi",
        description: "Yeni Mars rotası başarıyla eklendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mars-routes"] });
      setAddRouteOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mars rotası eklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating a Mars route
  const updateRouteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MarsRoute }) => {
      const res = await apiRequest("PUT", `/api/admin/mars-routes/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mars rotası güncellendi",
        description: "Mars rotası başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mars-routes"] });
      setAddRouteOpen(false);
      setEditingRoute(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mars rotası güncellenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting a Mars route
  const deleteRouteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/mars-routes/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mars rotası silindi",
        description: "Mars rotası başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mars-routes"] });
      setDeleteDialogOpen(false);
      setRouteToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mars rotası silinirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: MarsRoute) => {
    if (editingRoute) {
      updateRouteMutation.mutate({ id: (editingRoute as any).id, data });
    } else {
      addRouteMutation.mutate(data);
    }
  };
  
  // Handle edit button click
  const handleEditRoute = (route: any) => {
    setEditingRoute(route);
    form.reset({
      name: route.name || "",
      description: route.description || "",
      imageUrl: route.imageUrl || "",
      departureTerminal: route.departureTerminal || "",
      arrivalTerminal: route.arrivalTerminal || "",
      journeyTime: route.journeyTime || "",
      price: route.price || "",
      capacity: route.capacity || "",
      isActive: route.isActive || false,
      tags: route.tags || [],
      departureSchedules: route.departureSchedules || [],
      launchDate: route.launchDate ? new Date(route.launchDate) : undefined,
      returnDate: route.returnDate ? new Date(route.returnDate) : undefined,
    });
    setAddRouteOpen(true);
  };
  
  // Handle delete button click
  const handleDeleteClick = (id: number) => {
    setRouteToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (routeToDelete !== null) {
      deleteRouteMutation.mutate(routeToDelete);
    }
  };
  
  // Tags that can be added to Mars routes
  const availableTags = [
    { id: "express", label: "Ekspres Sefer" },
    { id: "luxury", label: "Lüks Yolculuk" },
    { id: "economy", label: "Ekonomik" },
    { id: "family", label: "Aile Dostu" },
    { id: "vip", label: "VIP" },
    { id: "research", label: "Araştırma Misyonu" },
    { id: "settlement", label: "Yerleşim Programı" }
  ];
  
  // Week days for scheduling
  const weekDays = [
    { id: "mon", label: "Pazartesi" },
    { id: "tue", label: "Salı" },
    { id: "wed", label: "Çarşamba" },
    { id: "thu", label: "Perşembe" },
    { id: "fri", label: "Cuma" },
    { id: "sat", label: "Cumartesi" },
    { id: "sun", label: "Pazar" }
  ];
  
  // Close the dialog and reset form
  const handleDialogClose = () => {
    setAddRouteOpen(false);
    setEditingRoute(null);
    setTimeout(() => form.reset(), 100);
  };
  
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mars Özel Rotaları Yönetimi</h1>
          
          <Button onClick={() => setAddRouteOpen(true)} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Yeni Mars Rotası Ekle
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="routes">Rotalar</TabsTrigger>
            <TabsTrigger value="schedules">Sefer Programları</TabsTrigger>
            <TabsTrigger value="statistics">İstatistikler</TabsTrigger>
          </TabsList>
          
          <TabsContent value="routes">
            <Card>
              <CardHeader>
                <CardTitle>Mars Rotaları</CardTitle>
                <CardDescription>
                  Tüm aktif ve planlanan Mars-Dünya arası özel rotaları yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <>
                    {marsRoutes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Henüz hiç Mars rotası eklenmemiş.</p>
                        <Button variant="outline" size="sm" onClick={() => setAddRouteOpen(true)} className="mt-2">
                          İlk rotayı ekleyin
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rota Adı</TableHead>
                            <TableHead>Kalkış-Varış</TableHead>
                            <TableHead>Süre</TableHead>
                            <TableHead>Fiyat</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {marsRoutes.map((route: any) => (
                            <TableRow key={route.id}>
                              <TableCell className="font-medium">{route.name}</TableCell>
                              <TableCell>{route.departureTerminal} - {route.arrivalTerminal}</TableCell>
                              <TableCell>{route.journeyTime}</TableCell>
                              <TableCell>{route.price} TL</TableCell>
                              <TableCell>
                                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  route.isActive 
                                    ? 'bg-green-50 text-green-700' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {route.isActive ? 'Aktif' : 'Pasif'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditRoute(route)}>
                                    Düzenle
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteClick(route.id)}
                                  >
                                    Sil
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedules">
            <Card>
              <CardHeader>
                <CardTitle>Mars Sefer Programları</CardTitle>
                <CardDescription>
                  Mars rotalarına ait sefer programlarını düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marsRoutes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Henüz hiç Mars rotası eklenmemiş. Öncelikle rotaları eklemelisiniz.</p>
                      <Button variant="outline" size="sm" onClick={() => setAddRouteOpen(true)} className="mt-2">
                        Rota eklemek için tıklayın
                      </Button>
                    </div>
                  ) : (
                    marsRoutes.map((route: any) => (
                      <div key={route.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">{route.name}</h3>
                          <Button variant="outline" size="sm">Sefer Ekle</Button>
                        </div>
                        
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Kalkış Saati</TableHead>
                                <TableHead>Günler</TableHead>
                                <TableHead>Kapasite</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(route.departureSchedules && route.departureSchedules.length > 0) ? (
                                route.departureSchedules.map((schedule: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>{schedule.time}</TableCell>
                                    <TableCell>
                                      {schedule.days.map((day: string) => {
                                        const dayLabel = weekDays.find(d => d.id === day)?.label;
                                        return dayLabel?.substring(0, 3) + ". ";
                                      }).join(", ")}
                                    </TableCell>
                                    <TableCell>{route.capacity} yolcu</TableCell>
                                    <TableCell>
                                      <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-700">
                                        Aktif
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm">Düzenle</Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                          Sil
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                    Bu rota için henüz sefer programı eklenmemiş
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Mars Rotaları İstatistikleri</CardTitle>
                <CardDescription>
                  Mars rotalarına ait performans ve doluluk istatistikleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">En Popüler Mars Rotaları</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {marsRoutes.length === 0 ? (
                          <div className="text-center py-2 text-muted-foreground">
                            <p>Henüz veri yok</p>
                          </div>
                        ) : (
                          marsRoutes.slice(0, 3).map((route: any, index: number) => (
                            <div key={route.id} className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{route.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {route.departureTerminal} - {route.arrivalTerminal}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">%92</p>
                                <p className="text-sm text-muted-foreground">doluluk</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Mars Rotaları Gelir Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {marsRoutes.length === 0 ? (
                          <div className="text-center py-2 text-muted-foreground">
                            <p>Henüz veri yok</p>
                          </div>
                        ) : (
                          marsRoutes.slice(0, 3).map((route: any) => (
                            <div key={route.id} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">{route.name}</span>
                                <span className="text-sm font-medium">₺4,325,000</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full" 
                                  style={{ width: `${30 + Math.random() * 70}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add/Edit Route Dialog */}
      <Dialog open={addRouteOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Mars Rotasını Düzenle" : "Yeni Mars Rotası Ekle"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rota Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Mars Express" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Görsel URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="departureTerminal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kalkış Terminali</FormLabel>
                      <FormControl>
                        <Input placeholder="Dünya Terminal 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="arrivalTerminal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Varış Terminali</FormLabel>
                      <FormControl>
                        <Input placeholder="Mars Terminal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="journeyTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yolculuk Süresi</FormLabel>
                      <FormControl>
                        <Input placeholder="4-6 saat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiyat (TL)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kapasite</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                      <div className="space-y-1">
                        <FormLabel>Aktif</FormLabel>
                        <FormDescription>
                          Bu rota şu anda satışa açık mı?
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
                
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Mars rotası hakkında detaylı bilgi..." 
                            className="min-h-[120px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="launchDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Başlangıç Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                              ) : (
                                <span>Bir tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Bitiş Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                              ) : (
                                <span>Bir tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Etiketler</FormLabel>
                          <FormDescription>
                            Bu rota için uygun etiketleri seçin
                          </FormDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map((tag) => (
                            <FormField
                              key={tag.id}
                              control={form.control}
                              name="tags"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={tag.id}
                                    className="flex flex-row items-center space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(tag.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, tag.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== tag.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {tag.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  İptal
                </Button>
                <Button type="submit" disabled={addRouteMutation.isPending || updateRouteMutation.isPending}>
                  {(addRouteMutation.isPending || updateRouteMutation.isPending) && (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                  )}
                  {editingRoute ? "Güncelle" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu Mars rotasını silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Rotaya ait tüm veriler silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleteRouteMutation.isPending && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
              )}
              Evet, sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}