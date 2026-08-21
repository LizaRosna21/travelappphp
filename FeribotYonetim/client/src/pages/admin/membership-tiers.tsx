import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Define membership tier type
interface MembershipTier {
  id: number;
  name: string;
  description: string;
  color: string;
  monthlyFee: string;
  annualFee: string;
  discountPercentage: string;
  features: string;
  priority: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Initial empty membership tier object
const emptyTier: Omit<MembershipTier, "id" | "createdAt"> = {
  name: "",
  description: "",
  color: "#808080",
  monthlyFee: "0",
  annualFee: "0",
  discountPercentage: "0",
  features: "",
  priority: "3",
  isActive: true
};

export default function MembershipTiersPage() {
  const { toast } = useToast();
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTier, setCurrentTier] = useState<Omit<MembershipTier, "id" | "createdAt">>({ ...emptyTier });
  const [editTierId, setEditTierId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Load membership tiers
  useEffect(() => {
    const loadMembershipTiers = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/admin/membership-tiers");
        const data = await response.json();
        setMembershipTiers(data);
      } catch (error) {
        console.error("Error loading membership tiers:", error);
        toast({
          title: "Hata",
          description: "Üyelik seviyeleri yüklenirken bir hata oluştu",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMembershipTiers();
  }, [toast]);

  // Create new membership tier
  const handleCreateTier = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/membership-tiers", currentTier);
      const newTier = await response.json();
      setMembershipTiers([...membershipTiers, newTier]);
      setIsDialogOpen(false);
      setCurrentTier({ ...emptyTier });
      toast({
        title: "Başarılı",
        description: "Yeni üyelik seviyesi oluşturuldu",
        variant: "default"
      });
    } catch (error) {
      console.error("Error creating membership tier:", error);
      toast({
        title: "Hata",
        description: "Üyelik seviyesi oluşturulurken bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  // Update existing membership tier
  const handleUpdateTier = async () => {
    if (editTierId === null) return;

    try {
      const response = await apiRequest("PUT", `/api/admin/membership-tiers/${editTierId}`, currentTier);
      const updatedTier = await response.json();
      
      setMembershipTiers(membershipTiers.map(tier => 
        tier.id === editTierId ? updatedTier : tier
      ));
      
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditTierId(null);
      setCurrentTier({ ...emptyTier });
      
      toast({
        title: "Başarılı",
        description: "Üyelik seviyesi güncellendi",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating membership tier:", error);
      toast({
        title: "Hata",
        description: "Üyelik seviyesi güncellenirken bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  // Delete membership tier
  const handleDeleteTier = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/membership-tiers/${id}`);
      setMembershipTiers(membershipTiers.filter(tier => tier.id !== id));
      setDeleteConfirmId(null);
      toast({
        title: "Başarılı",
        description: "Üyelik seviyesi silindi",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting membership tier:", error);
      toast({
        title: "Hata",
        description: "Üyelik seviyesi silinirken bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  // Edit tier - load data into form
  const handleEditTier = (tier: MembershipTier) => {
    setIsEditMode(true);
    setEditTierId(tier.id);
    setCurrentTier({
      name: tier.name,
      description: tier.description,
      color: tier.color,
      monthlyFee: tier.monthlyFee,
      annualFee: tier.annualFee,
      discountPercentage: tier.discountPercentage,
      features: tier.features,
      priority: tier.priority,
      isActive: tier.isActive
    });
    setIsDialogOpen(true);
  };

  // Reset form
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditTierId(null);
    setCurrentTier({ ...emptyTier });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Üyelik Seviyeleri Yönetimi</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Üyelik Seviyesi
          </Button>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Üyelik Seviyeleri</TabsTrigger>
            <TabsTrigger value="info">Genel Bilgi</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="loader"></div>
                <p className="ml-2">Yükleniyor...</p>
              </div>
            ) : membershipTiers.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Henüz hiç üyelik seviyesi bulunmuyor.</p>
                <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" /> İlk Üyelik Seviyesini Oluştur
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {membershipTiers
                  .sort((a, b) => Number(a.priority) - Number(b.priority))
                  .map((tier) => (
                    <Card key={tier.id} className="overflow-hidden">
                      <div className="h-2" style={{ backgroundColor: tier.color }}></div>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{tier.name}</CardTitle>
                            <CardDescription>{tier.description}</CardDescription>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${tier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {tier.isActive ? 'Aktif' : 'Pasif'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Aylık Ücret</p>
                            <p className="text-lg font-bold">{tier.monthlyFee} TL</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Yıllık Ücret</p>
                            <p className="text-lg font-bold">{tier.annualFee} TL</p>
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-500">İndirim Oranı</p>
                          <p className="text-lg font-bold">%{tier.discountPercentage}</p>
                        </div>
                        <Separator className="my-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">Özellikler</p>
                          <ul className="list-disc pl-5 text-sm space-y-1">
                            {tier.features.split('\n').map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between bg-gray-50">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTier(tier)}>
                          <Edit className="h-4 w-4 mr-1" /> Düzenle
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteConfirmId(tier.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Sil
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Üyelik Seviyeleri Hakkında</CardTitle>
                <CardDescription>
                  Üyelik seviyeleri, müşterilerinize sunduğunuz farklı hizmet paketlerini tanımlar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    Üyelik seviyeleri, müşterilerinize sunduğunuz farklı avantajları ve özellikleri tanımlamanıza olanak tanır. 
                    Her seviye için aylık veya yıllık ücretlendirme yapabilir, indirim oranları belirleyebilir ve özel avantajlar sunabilirsiniz.
                  </p>
                  <h3 className="font-medium text-lg">Önemli Bilgiler:</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Her üyelik seviyesi için benzersiz bir renk kodu belirleyebilirsiniz.</li>
                    <li>Öncelik değeri, üyelik seviyelerinin görüntülenme sırasını belirler. Düşük değerler daha yüksek önceliktedir.</li>
                    <li>Özellikler alanına her satıra bir özellik olacak şekilde liste halinde girebilirsiniz.</li>
                    <li>Pasif olarak işaretlenen üyelik seviyeleri müşterilere gösterilmez ve seçilemez.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Üyelik Seviyesi Düzenle" : "Yeni Üyelik Seviyesi Oluştur"}</DialogTitle>
              <DialogDescription>
                {isEditMode 
                  ? "Üyelik seviyesi bilgilerini güncelleyin." 
                  : "Yeni bir üyelik seviyesi oluşturmak için aşağıdaki alanları doldurun."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Seviye Adı</Label>
                  <Input
                    id="name"
                    value={currentTier.name}
                    onChange={(e) => setCurrentTier({ ...currentTier, name: e.target.value })}
                    placeholder="Premium Üyelik"
                    className="mt-1"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Input
                    id="description"
                    value={currentTier.description}
                    onChange={(e) => setCurrentTier({ ...currentTier, description: e.target.value })}
                    placeholder="Premium üyelik avantajları"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyFee">Aylık Ücret (TL)</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    value={currentTier.monthlyFee}
                    onChange={(e) => setCurrentTier({ ...currentTier, monthlyFee: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="annualFee">Yıllık Ücret (TL)</Label>
                  <Input
                    id="annualFee"
                    type="number"
                    value={currentTier.annualFee}
                    onChange={(e) => setCurrentTier({ ...currentTier, annualFee: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="discountPercentage">İndirim Oranı (%)</Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    value={currentTier.discountPercentage}
                    onChange={(e) => setCurrentTier({ ...currentTier, discountPercentage: e.target.value })}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="color">Renk Kodu</Label>
                  <div className="flex mt-1">
                    <Input
                      id="color"
                      type="color"
                      value={currentTier.color}
                      onChange={(e) => setCurrentTier({ ...currentTier, color: e.target.value })}
                      className="w-12 p-1 h-10"
                    />
                    <Input
                      type="text"
                      value={currentTier.color}
                      onChange={(e) => setCurrentTier({ ...currentTier, color: e.target.value })}
                      className="ml-2 flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Öncelik (Sıralama)</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={currentTier.priority}
                    onChange={(e) => setCurrentTier({ ...currentTier, priority: e.target.value })}
                    placeholder="1"
                    min="1"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    id="isActive"
                    checked={currentTier.isActive}
                    onCheckedChange={(checked) => setCurrentTier({ ...currentTier, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Aktif</Label>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="features">Özellikler (Her satıra bir özellik)</Label>
                  <Textarea
                    id="features"
                    value={currentTier.features}
                    onChange={(e) => setCurrentTier({ ...currentTier, features: e.target.value })}
                    placeholder="Özel müşteri desteği&#10;İndirimli biletler&#10;Öncelikli rezervasyon"
                    className="mt-1"
                    rows={5}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={handleDialogClose}>İptal</Button>
              </DialogClose>
              <Button onClick={isEditMode ? handleUpdateTier : handleCreateTier}>
                {isEditMode ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Üyelik Seviyesini Sil</DialogTitle>
              <DialogDescription>
                Bu üyelik seviyesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteConfirmId && handleDeleteTier(deleteConfirmId)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}