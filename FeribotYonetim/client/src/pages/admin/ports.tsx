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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  AnchorIcon, 
  Loader2, 
  Plus, 
  Flag, 
  MapPin, 
  Trash, 
  Edit,
  Search
} from "lucide-react";

import { countries } from "@/lib/countries";

export default function PortsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    country: "",
    city: "",
    description: "",
    isActive: true,
  });

  // Limanları getir
  const { data: ports, isLoading } = useQuery({
    queryKey: ["/api/ports", searchQuery, filterCountry],
    queryFn: async () => {
      let url = "/api/ports";
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      if (filterCountry !== "all") {
        params.append("country", filterCountry);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  // Liman oluştur mutasyonu
  const createPortMutation = useMutation({
    mutationFn: async (portData: any) => {
      const response = await apiRequest("POST", "/api/ports", portData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Liman eklendi",
        description: "Yeni liman başarıyla oluşturuldu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Liman eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Liman güncelle mutasyonu
  const updatePortMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/ports/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Liman güncellendi",
        description: "Liman bilgileri başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      setIsAddDialogOpen(false);
      setEditingPort(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Liman güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Liman sil mutasyonu
  const deletePortMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/ports/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Liman silindi",
        description: "Liman başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Liman silinirken bir hata oluştu: ${error.message}`,
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
  const handleSwitchChange = (checked: boolean) => {
    setFormData({ ...formData, isActive: checked });
  };

  // Select değişikliği
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  // Form submit işlemi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.code || !formData.country || !formData.city) {
      toast({
        title: "Eksik bilgiler",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    if (editingPort) {
      updatePortMutation.mutate({ id: editingPort.id, data: formData });
    } else {
      createPortMutation.mutate(formData);
    }
  };

  // Form sıfırlama
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      country: "",
      city: "",
      description: "",
      isActive: true,
    });
  };

  // Liman düzenleme
  const handleEdit = (port: any) => {
    setEditingPort(port);
    setFormData({
      name: port.name || "",
      code: port.code || "",
      country: port.country || "",
      city: port.city || "",
      description: port.description || "",
      isActive: port.isActive,
    });
    setIsAddDialogOpen(true);
  };

  // Liman silme
  const handleDelete = (id: number) => {
    if (window.confirm("Bu limanı silmek istediğinizden emin misiniz?")) {
      deletePortMutation.mutate(id);
    }
  };

  // Ülkeye göre bayrak emoji getir
  const getCountryFlag = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.flag : "🏳️";
  };

  // Ülke koduna göre tam adını getir
  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  // Arama veya filtreleme yapıldıysa filtrelenmiş limanları göster
  const filteredPorts = ports || [];

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Liman Yönetimi</h1>
            <p className="text-muted-foreground">Tüm rotalar için limanları yönetin</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Yeni Liman</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPort ? "Liman Düzenle" : "Yeni Liman Ekle"}</DialogTitle>
                <DialogDescription>
                  Liman bilgilerini doldurarak {editingPort ? "güncelleyin" : "oluşturun"}.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Liman Adı
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="İstanbul Limanı"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code" className="text-right">
                      Liman Kodu
                    </Label>
                    <Input
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="IST"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="country" className="text-right">
                      Ülke
                    </Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleSelectChange("country", value)}
                    >
                      <SelectTrigger id="country" className="col-span-3">
                        <SelectValue placeholder="Ülke seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="city" className="text-right">
                      Şehir
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="İstanbul"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right pt-2">
                      Açıklama
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="Liman hakkında açıklama"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">
                      Durum
                    </Label>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={handleSwitchChange}
                      />
                      <Label htmlFor="isActive">{formData.isActive ? "Aktif" : "Pasif"}</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                      setEditingPort(null);
                    }}
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPortMutation.isPending || updatePortMutation.isPending}
                  >
                    {(createPortMutation.isPending || updatePortMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingPort ? "Güncelle" : "Ekle"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Liman adı veya kodu ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="md:w-64">
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Flag className="h-4 w-4 mr-2" />
                  <span>Ülke</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Ülkeler</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AnchorIcon className="mr-2 h-5 w-5" />
              <span>Limanlar</span>
            </CardTitle>
            <CardDescription>
              {filterCountry !== "all" 
                ? `${getCountryName(filterCountry)} ülkesindeki limanlar` 
                : "Tüm limanlar"}
              {searchQuery && ` - "${searchQuery}" araması`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPorts.length === 0 ? (
              <div className="text-center p-4 border rounded-md my-4">
                <p className="text-muted-foreground">Liman bulunamadı.</p>
              </div>
            ) : (
              <Table>
                <TableCaption>Toplam {filteredPorts.length} liman</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Liman Adı</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ülke</TableHead>
                    <TableHead>Şehir</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPorts.map((port: any) => (
                    <TableRow key={port.id}>
                      <TableCell>{port.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-primary" />
                          <span>{port.name}</span>
                        </div>
                        {port.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                            {port.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{port.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{getCountryFlag(port.country)}</span>
                          <span>{getCountryName(port.country)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{port.city}</TableCell>
                      <TableCell>
                        {port.isActive ? (
                          <Badge className="bg-green-500">Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Pasif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleEdit(port)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-red-500" 
                            onClick={() => handleDelete(port.id)}
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
      </div>
    </AdminLayout>
  );
}