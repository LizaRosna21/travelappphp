import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layouts/admin-layout";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  CalendarIcon,
  Clock,
  Filter,
  Loader2,
  MoreVertical,
  Plus,
  Ship,
  Trash,
  Edit,
  Check,
  X,
  Copy,
  Calendar as CalendarIcon2
} from "lucide-react";

export default function SchedulesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [filterRoute, setFilterRoute] = useState("all");
  const [formData, setFormData] = useState({
    routeId: "",
    departureTime: "",
    arrivalTime: "",
    daysOfWeek: [] as string[],
    startDate: "",
    endDate: "",
    capacity: "450",
    passengerCapacity: "400",
    vehicleCapacity: "50",
    isActive: true,
    isSpecialSchedule: false,
    isFull: false,
    isPopular: false,
    fareType: "standard",
    hasPromotion: false,
    promotionDescription: "",
    specialInstructions: "",
    amenities: "",
  });

  // Tüm seferleri getir
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["/api/schedules", filterRoute, activeTab],
    queryFn: async () => {
      let url = "/api/schedules";
      const params = new URLSearchParams();
      
      if (filterRoute !== "all") {
        params.append("routeId", filterRoute);
      }
      
      if (activeTab !== "all") {
        params.append("status", activeTab);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  // Tüm rotaları getir
  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/routes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/routes");
      return await response.json();
    },
  });

  // Sefer oluştur mutasyonu
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      const response = await apiRequest("POST", "/api/schedules", scheduleData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sefer eklendi",
        description: "Yeni sefer başarıyla oluşturuldu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Sefer eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Sefer güncelle mutasyonu
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/schedules/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sefer güncellendi",
        description: "Sefer bilgileri başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsAddDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Sefer güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Sefer sil mutasyonu
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/schedules/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sefer silindi",
        description: "Sefer başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Sefer silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form input değişikliği
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Switch değişikliği
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked });
  };

  // Select değişikliği
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  // Checkbox değişikliği (gün seçimi için)
  const handleDayChange = (day: string) => {
    const updatedDays = formData.daysOfWeek.includes(day)
      ? formData.daysOfWeek.filter(d => d !== day)
      : [...formData.daysOfWeek, day];
    
    setFormData({ ...formData, daysOfWeek: updatedDays });
  };

  // Form submit işlemi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.routeId || !formData.departureTime || !formData.arrivalTime || 
        !formData.startDate || !formData.endDate || formData.daysOfWeek.length === 0) {
      toast({
        title: "Eksik bilgiler",
        description: "Lütfen tüm gerekli alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    const scheduleData = {
      ...formData,
      daysOfWeek: formData.daysOfWeek.join(','),
      capacity: parseInt(formData.capacity, 10),
      passengerCapacity: parseInt(formData.passengerCapacity, 10),
      vehicleCapacity: parseInt(formData.vehicleCapacity, 10),
      amenities: formData.amenities ? JSON.stringify({ items: formData.amenities.split(',') }) : null,
      routeId: parseInt(formData.routeId, 10),
    };

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleData });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  // Form sıfırlama
  const resetForm = () => {
    setFormData({
      routeId: "",
      departureTime: "",
      arrivalTime: "",
      daysOfWeek: [] as string[],
      startDate: "",
      endDate: "",
      capacity: "450",
      passengerCapacity: "400",
      vehicleCapacity: "50",
      isActive: true,
      isSpecialSchedule: false,
      isFull: false,
      isPopular: false,
      fareType: "standard",
      hasPromotion: false,
      promotionDescription: "",
      specialInstructions: "",
      amenities: "",
    });
  };

  // Sefer düzenleme
  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      routeId: schedule.routeId.toString(),
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      daysOfWeek: schedule.daysOfWeek ? schedule.daysOfWeek.split(',') : [],
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      capacity: schedule.capacity.toString(),
      passengerCapacity: schedule.passengerCapacity?.toString() || schedule.capacity.toString(),
      vehicleCapacity: schedule.vehicleCapacity?.toString() || "50",
      isActive: schedule.isActive,
      isSpecialSchedule: schedule.isSpecialSchedule || false,
      isFull: schedule.isFull || false,
      isPopular: schedule.isPopular || false,
      fareType: schedule.fareType || "standard",
      hasPromotion: schedule.hasPromotion || false,
      promotionDescription: schedule.promotionDescription || "",
      specialInstructions: schedule.specialInstructions || "",
      amenities: schedule.amenities ? 
        (typeof schedule.amenities === 'string' ? 
          schedule.amenities : 
          JSON.parse(schedule.amenities)?.items?.join(',') || ""
        ) : "",
    });
    setIsAddDialogOpen(true);
  };

  // Sefer silme
  const handleDelete = (id: number) => {
    if (window.confirm("Bu seferi silmek istediğinizden emin misiniz?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  // Kopyala
  const handleDuplicate = (schedule: any) => {
    const newSchedule = { ...schedule };
    delete newSchedule.id;
    setFormData({
      routeId: newSchedule.routeId.toString(),
      departureTime: newSchedule.departureTime,
      arrivalTime: newSchedule.arrivalTime,
      daysOfWeek: newSchedule.daysOfWeek ? newSchedule.daysOfWeek.split(',') : [],
      startDate: newSchedule.startDate,
      endDate: newSchedule.endDate,
      capacity: newSchedule.capacity.toString(),
      passengerCapacity: newSchedule.passengerCapacity?.toString() || newSchedule.capacity.toString(),
      vehicleCapacity: newSchedule.vehicleCapacity?.toString() || "50",
      isActive: newSchedule.isActive,
      isSpecialSchedule: newSchedule.isSpecialSchedule || false,
      isFull: newSchedule.isFull || false,
      isPopular: newSchedule.isPopular || false,
      fareType: newSchedule.fareType || "standard",
      hasPromotion: newSchedule.hasPromotion || false,
      promotionDescription: newSchedule.promotionDescription || "",
      specialInstructions: newSchedule.specialInstructions || "",
      amenities: newSchedule.amenities ? 
        (typeof newSchedule.amenities === 'string' ? 
          newSchedule.amenities : 
          JSON.parse(newSchedule.amenities)?.items?.join(',') || ""
        ) : "",
    });
    setIsAddDialogOpen(true);
  };

  // Günleri formatla (0,1,2 -> Pzr, Pzt, Sal)
  const formatDays = (daysString: string) => {
    const dayMap: { [key: string]: string } = {
      "0": "Pzr",
      "1": "Pzt",
      "2": "Sal",
      "3": "Çar",
      "4": "Per",
      "5": "Cum",
      "6": "Cmt"
    };
    
    if (!daysString) return "-";
    
    return daysString.split(',').map(day => dayMap[day] || day).join(', ');
  };

  // Rota bilgisini formatla
  const getRouteInfo = (routeId: number) => {
    if (!routes) return "Bilinmeyen Rota";
    
    const route = routes.find((r: any) => r.id === routeId);
    return route ? `${route.departurePort} → ${route.arrivalPort}` : "Bilinmeyen Rota";
  };

  // Sefer tablosunu oluştur
  const renderScheduleTable = () => {
    if (schedulesLoading || routesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!schedules || schedules.length === 0) {
      return (
        <div className="text-center p-4 border rounded-md my-4">
          <p className="text-muted-foreground">Sefer bulunamadı.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableCaption>Toplam {schedules.length} sefer listeleniyor</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Rota</TableHead>
            <TableHead>Kalkış/Varış</TableHead>
            <TableHead>Tarih Aralığı</TableHead>
            <TableHead>Günler</TableHead>
            <TableHead>Kapasite</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule: any) => (
            <TableRow key={schedule.id}>
              <TableCell>{schedule.id}</TableCell>
              <TableCell className="font-medium">{getRouteInfo(schedule.routeId)}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-green-600" />
                    <span>{schedule.departureTime.substring(0, 5)}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1 text-red-600" />
                    <span>{schedule.arrivalTime.substring(0, 5)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{schedule.startDate}</span>
                  <span>{schedule.endDate}</span>
                </div>
              </TableCell>
              <TableCell>{formatDays(schedule.daysOfWeek)}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>Toplam: {schedule.capacity}</span>
                  <span className="text-xs text-muted-foreground">
                    Yolcu: {schedule.passengerCapacity || "-"}, Araç: {schedule.vehicleCapacity || "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {schedule.isActive ? (
                  <Badge className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="outline">Pasif</Badge>
                )}
                {schedule.isFull && (
                  <Badge className="ml-1 bg-yellow-500">Dolu</Badge>
                )}
                {schedule.isPopular && (
                  <Badge className="ml-1 bg-blue-500">Popüler</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                      <Edit className="h-4 w-4 mr-2" />
                      <span>Düzenle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(schedule)}>
                      <Copy className="h-4 w-4 mr-2" />
                      <span>Kopyala</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600"
                    >
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
    );
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sefer Yönetimi</h1>
            <p className="text-muted-foreground">Rotalara ait seferleri planlayın ve yönetin</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Yeni Sefer</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Sefer Düzenle" : "Yeni Sefer Ekle"}</DialogTitle>
                <DialogDescription>
                  Sefer bilgilerini doldurarak {editingSchedule ? "güncelleyin" : "yeni bir sefer ekleyin"}.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="routeId">Rota Seçin</Label>
                      <Select
                        value={formData.routeId}
                        onValueChange={(value) => handleSelectChange("routeId", value)}
                      >
                        <SelectTrigger id="routeId">
                          <SelectValue placeholder="Rota seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes?.map((route: any) => (
                            <SelectItem key={route.id} value={route.id.toString()}>
                              {route.departurePort} → {route.arrivalPort}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fareType">Tarife Tipi</Label>
                      <Select
                        value={formData.fareType}
                        onValueChange={(value) => handleSelectChange("fareType", value)}
                      >
                        <SelectTrigger id="fareType">
                          <SelectValue placeholder="Tarife tipi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Ekonomi</SelectItem>
                          <SelectItem value="standard">Standart</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="departureTime">Kalkış Saati</Label>
                      <Input
                        type="time"
                        id="departureTime"
                        name="departureTime"
                        value={formData.departureTime}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arrivalTime">Varış Saati</Label>
                      <Input
                        type="time"
                        id="arrivalTime"
                        name="arrivalTime"
                        value={formData.arrivalTime}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                      <Input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Bitiş Tarihi</Label>
                      <Input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Sefer Günleri</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { id: "0", label: "Pzr" },
                        { id: "1", label: "Pzt" },
                        { id: "2", label: "Sal" },
                        { id: "3", label: "Çar" },
                        { id: "4", label: "Per" },
                        { id: "5", label: "Cum" },
                        { id: "6", label: "Cmt" }
                      ].map(day => (
                        <div key={day.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`day-${day.id}`} 
                            checked={formData.daysOfWeek.includes(day.id)}
                            onCheckedChange={() => handleDayChange(day.id)}
                          />
                          <Label htmlFor={`day-${day.id}`}>{day.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Toplam Kapasite</Label>
                      <Input
                        type="number"
                        id="capacity"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passengerCapacity">Yolcu Kapasitesi</Label>
                      <Input
                        type="number"
                        id="passengerCapacity"
                        name="passengerCapacity"
                        value={formData.passengerCapacity}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicleCapacity">Araç Kapasitesi</Label>
                      <Input
                        type="number"
                        id="vehicleCapacity"
                        name="vehicleCapacity"
                        value={formData.vehicleCapacity}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialInstructions">Özel Talimatlar</Label>
                    <Textarea
                      id="specialInstructions"
                      name="specialInstructions"
                      placeholder="Yolcular için özel talimatlar, notlar veya uyarılar..."
                      value={formData.specialInstructions}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amenities">Olanaklar</Label>
                    <Input
                      id="amenities"
                      name="amenities"
                      placeholder="Wifi, Bar, Restoran, VIP Salon (virgülle ayırın)"
                      value={formData.amenities}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
                      />
                      <Label htmlFor="isActive">Aktif</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPopular"
                        checked={formData.isPopular}
                        onCheckedChange={(checked) => handleSwitchChange("isPopular", checked)}
                      />
                      <Label htmlFor="isPopular">Popüler Sefer</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isSpecialSchedule"
                        checked={formData.isSpecialSchedule}
                        onCheckedChange={(checked) => handleSwitchChange("isSpecialSchedule", checked)}
                      />
                      <Label htmlFor="isSpecialSchedule">Özel Sefer</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasPromotion"
                        checked={formData.hasPromotion}
                        onCheckedChange={(checked) => handleSwitchChange("hasPromotion", checked)}
                      />
                      <Label htmlFor="hasPromotion">Promosyonlu</Label>
                    </div>
                  </div>

                  {formData.hasPromotion && (
                    <div className="space-y-2">
                      <Label htmlFor="promotionDescription">Promosyon Açıklaması</Label>
                      <Input
                        id="promotionDescription"
                        name="promotionDescription"
                        placeholder="Ör: %20 indirim, 2 kişi 1 fiyatına vb."
                        value={formData.promotionDescription}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                      setEditingSchedule(null);
                    }}
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  >
                    {(createScheduleMutation.isPending || updateScheduleMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingSchedule ? "Güncelle" : "Ekle"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">Tüm Seferler</TabsTrigger>
              <TabsTrigger value="active">Aktif</TabsTrigger>
              <TabsTrigger value="inactive">Pasif</TabsTrigger>
              <TabsTrigger value="popular">Popüler</TabsTrigger>
              <TabsTrigger value="special">Özel</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 md:max-w-xs">
            <Select value={filterRoute} onValueChange={setFilterRoute}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Rota Filtresi</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Rotalar</SelectItem>
                {routes?.map((route: any) => (
                  <SelectItem key={route.id} value={route.id.toString()}>
                    {route.departurePort} → {route.arrivalPort}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ship className="mr-2 h-5 w-5" />
              <span>Seferler</span>
            </CardTitle>
            <CardDescription>
              {filterRoute !== "all" 
                ? `${getRouteInfo(parseInt(filterRoute))} rotasına ait seferler` 
                : "Tüm rotalara ait seferler"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderScheduleTable()}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}