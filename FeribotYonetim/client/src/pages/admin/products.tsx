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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Loader2,
  Plus,
  Filter,
  Ship,
  Bus,
  Trash,
  Edit,
  Eye,
  Copy,
  MoreVertical,
  Truck,
  Image,
  Sparkles,
  Star,
  ShoppingCart,
  DollarSign,
  Briefcase,
  CircleDollarSign,
  FileUp
} from "lucide-react";

export default function ProductsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    type: "ferry", // ferry, tour, transfer, package
    category: "",
    imageUrl: "",
    isActive: true,
    isPopular: false,
    isFeatured: false,
    inventory: "0",
    sku: "",
    discountedPrice: "",
    weight: "",
    dimensions: "",
    metadata: "",
  });

  // Ürünleri getir
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products", filterCategory, activeTab, searchQuery],
    queryFn: async () => {
      let url = "/api/products";
      const params = new URLSearchParams();
      
      if (filterCategory !== "all") {
        params.append("category", filterCategory);
      }
      
      if (activeTab !== "all") {
        params.append("status", activeTab);
      }
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  // Kategorileri getir
  const { data: categories } = useQuery({
    queryKey: ["/api/product-categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/product-categories");
      return await response.json();
    },
  });

  // Ürün oluştur mutasyonu
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiRequest("POST", "/api/products", productData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ürün eklendi",
        description: "Yeni ürün başarıyla oluşturuldu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Ürün eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ürün güncelle mutasyonu
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ürün güncellendi",
        description: "Ürün bilgileri başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Ürün güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ürün sil mutasyonu
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/products/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ürün silindi",
        description: "Ürün başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Ürün silinirken bir hata oluştu: ${error.message}`,
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

  // Form submit işlemi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.price || !formData.type) {
      toast({
        title: "Eksik bilgiler",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      inventory: parseInt(formData.inventory, 10),
      discountedPrice: formData.discountedPrice ? parseFloat(formData.discountedPrice) : null,
      metadata: formData.metadata ? JSON.parse(formData.metadata) : {}
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  // Form sıfırlama
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      type: "ferry",
      category: "",
      imageUrl: "",
      isActive: true,
      isPopular: false,
      isFeatured: false,
      inventory: "0",
      sku: "",
      discountedPrice: "",
      weight: "",
      dimensions: "",
      metadata: "",
    });
  };

  // Ürün düzenleme
  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      type: product.type || "ferry",
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      isActive: product.isActive,
      isPopular: product.isPopular || false,
      isFeatured: product.isFeatured || false,
      inventory: product.inventory?.toString() || "0",
      sku: product.sku || "",
      discountedPrice: product.discountedPrice?.toString() || "",
      weight: product.weight || "",
      dimensions: product.dimensions || "",
      metadata: product.metadata ? JSON.stringify(product.metadata, null, 2) : "",
    });
    setIsAddDialogOpen(true);
  };

  // Ürün silme
  const handleDelete = (id: number) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      deleteProductMutation.mutate(id);
    }
  };

  // Ürün kopyalama
  const handleDuplicate = (product: any) => {
    setFormData({
      name: `${product.name} (Kopya)`,
      description: product.description || "",
      price: product.price?.toString() || "",
      type: product.type || "ferry",
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      isActive: product.isActive,
      isPopular: product.isPopular || false,
      isFeatured: product.isFeatured || false,
      inventory: product.inventory?.toString() || "0",
      sku: `${product.sku || ""}-copy`,
      discountedPrice: product.discountedPrice?.toString() || "",
      weight: product.weight || "",
      dimensions: product.dimensions || "",
      metadata: product.metadata ? JSON.stringify(product.metadata, null, 2) : "",
    });
    setIsAddDialogOpen(true);
  };

  // Ürün tipine göre ikon getir
  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case "ferry":
        return <Ship className="h-4 w-4 text-blue-500" />;
      case "tour":
        return <Briefcase className="h-4 w-4 text-green-500" />;
      case "transfer":
        return <Bus className="h-4 w-4 text-amber-500" />;
      case "package":
        return <Package className="h-4 w-4 text-purple-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Ürün tablosunu oluştur
  const renderProductTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!products || products.length === 0) {
      return (
        <div className="text-center p-6 border rounded-md">
          <div className="mb-4">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Henüz ürün yok</h3>
          <p className="text-muted-foreground mb-4">
            Satışa sunulacak ürünleri ve hizmetleri ekleyin
          </p>
          <Button 
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>İlk Ürünü Ekle</span>
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableCaption>Toplam {products.length} ürün</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Ürün</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Fiyat</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product: any) => (
            <TableRow key={product.id}>
              <TableCell>{product.id}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-8 h-8 object-cover rounded-md mr-2" 
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center mr-2">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <div>{product.name}</div>
                    {product.sku && (
                      <div className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.category || "-"}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getProductTypeIcon(product.type)}
                  <span className="ml-1 capitalize">
                    {product.type === "ferry" ? "Feribot" : 
                    product.type === "tour" ? "Tur" : 
                    product.type === "transfer" ? "Transfer" : 
                    product.type === "package" ? "Paket" : 
                    product.type}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{product.price} ₺</span>
                  {product.discountedPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {product.discountedPrice} ₺
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{product.inventory || "∞"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.isActive ? (
                    <Badge className="bg-green-500">Aktif</Badge>
                  ) : (
                    <Badge variant="outline">Pasif</Badge>
                  )}
                  {product.isPopular && (
                    <Badge className="bg-amber-500">
                      <Star className="h-3 w-3 mr-1" />
                      <span>Popüler</span>
                    </Badge>
                  )}
                  {product.isFeatured && (
                    <Badge className="bg-blue-500">
                      <Sparkles className="h-3 w-3 mr-1" />
                      <span>Öne Çıkan</span>
                    </Badge>
                  )}
                </div>
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
                    <DropdownMenuItem onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      <span>Düzenle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                      <Copy className="h-4 w-4 mr-2" />
                      <span>Kopyala</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      asChild
                    >
                      <a 
                        href={`/product/${product.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        <span>Görüntüle</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(product.id)}
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
            <h1 className="text-3xl font-bold tracking-tight">Ürün Yönetimi</h1>
            <p className="text-muted-foreground">Ürünleri ve hizmetleri yönetin</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Yeni Ürün</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
                <DialogDescription>
                  Ürün bilgilerini doldurarak {editingProduct ? "güncelleyin" : "yeni bir ürün ekleyin"}.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ürün Adı</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Bodrum - Kos Feribot Bileti"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        placeholder="BDR-KOS-FRY"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Ürün açıklaması..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="type">Ürün Tipi</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleSelectChange("type", value)}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Tip seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ferry">
                            <div className="flex items-center">
                              <Ship className="h-4 w-4 mr-2 text-blue-500" />
                              <span>Feribot</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="tour">
                            <div className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2 text-green-500" />
                              <span>Tur</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <div className="flex items-center">
                              <Bus className="h-4 w-4 mr-2 text-amber-500" />
                              <span>Transfer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="package">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 mr-2 text-purple-500" />
                              <span>Paket</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleSelectChange("category", value)}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inventory">Stok</Label>
                      <Input
                        id="inventory"
                        name="inventory"
                        type="number"
                        value={formData.inventory}
                        onChange={handleInputChange}
                        placeholder="0 = Sınırsız"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="price">Fiyat (₺)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountedPrice">İndirimli Fiyat (₺)</Label>
                      <Input
                        id="discountedPrice"
                        name="discountedPrice"
                        type="number"
                        step="0.01"
                        value={formData.discountedPrice}
                        onChange={handleInputChange}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Ürün Görseli URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="imageUrl"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleInputChange}
                        placeholder="https://example.com/image.jpg"
                      />
                      <Button variant="outline" type="button">
                        <FileUp className="h-4 w-4 mr-2" />
                        <span>Yükle</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Ağırlık</Label>
                      <Input
                        id="weight"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        placeholder="1kg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dimensions">Boyutlar</Label>
                      <Input
                        id="dimensions"
                        name="dimensions"
                        value={formData.dimensions}
                        onChange={handleInputChange}
                        placeholder="10x10x10 cm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metadata">Ek Bilgiler (JSON)</Label>
                    <Textarea
                      id="metadata"
                      name="metadata"
                      value={formData.metadata}
                      onChange={handleInputChange}
                      placeholder='{
  "maxPassengers": 100,
  "routes": ["Bodrum-Kos", "Kos-Bodrum"],
  "specifications": ["WiFi", "Cafe", "Klima"]
}'
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <Label htmlFor="isPopular">Popüler</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isFeatured"
                        checked={formData.isFeatured}
                        onCheckedChange={(checked) => handleSwitchChange("isFeatured", checked)}
                      />
                      <Label htmlFor="isFeatured">Öne Çıkan</Label>
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
                      setEditingProduct(null);
                    }}
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {(createProductMutation.isPending || updateProductMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingProduct ? "Güncelle" : "Ekle"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">Tüm Ürünler</TabsTrigger>
              <TabsTrigger value="active">Aktif</TabsTrigger>
              <TabsTrigger value="popular">Popüler</TabsTrigger>
              <TabsTrigger value="featured">Öne Çıkan</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı veya SKU ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Kategori</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              <span>Ürünler</span>
            </CardTitle>
            <CardDescription>
              {filterCategory !== "all" 
                ? `${filterCategory} kategorisindeki ürünler` 
                : "Tüm ürünler"}
              {searchQuery && ` - "${searchQuery}" araması`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderProductTable()}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}