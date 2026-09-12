import { useState, useEffect } from "react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Filter, 
  SlidersHorizontal, 
  Loader2, 
  MoreVertical, 
  Check, 
  X,
  FileDown,
  RotateCcw,
  Search
} from "lucide-react";

// Ödeme statüsüne göre badge rengi belirleme
function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500">Tamamlandı</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500">Beklemede</Badge>;
    case "failed":
      return <Badge className="bg-red-500">Başarısız</Badge>;
    case "refunded":
      return <Badge className="bg-blue-500">İade Edildi</Badge>;
    default:
      return <Badge className="bg-gray-500">{status}</Badge>;
  }
}

// Ödeme yöntemine göre ikon belirleme
function getPaymentMethodIcon(method: string) {
  switch (method) {
    case "credit_card":
      return <CreditCard className="h-4 w-4 mr-2" />;
    default:
      return <CreditCard className="h-4 w-4 mr-2" />;
  }
}

// Tarih formatı için yardımcı fonksiyon
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  // Ödemeleri getir
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/payments", filterStatus, filterDateRange, searchQuery],
    queryFn: async () => {
      let url = "/api/payments";
      const params = new URLSearchParams();
      
      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      
      if (filterDateRange !== "all") {
        params.append("dateRange", filterDateRange);
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

  // İade işlemi mutasyonu
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { paymentId: number, amount: string, reason: string }) => {
      const response = await apiRequest("POST", `/api/payments/${paymentId}/refund`, {
        amount,
        reason
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "İade işlemi başarılı",
        description: "Ödeme iade işlemi başarıyla tamamlandı.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `İade işlemi başarısız: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ödeme onaylama mutasyonu
  const approvePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("POST", `/api/payments/${paymentId}/approve`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ödeme onaylandı",
        description: "Ödeme başarıyla onaylandı.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Ödeme onaylanırken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ödeme reddetme mutasyonu
  const rejectPaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("POST", `/api/payments/${paymentId}/reject`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ödeme reddedildi",
        description: "Ödeme başarıyla reddedildi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Ödeme reddedilirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filtrelenmiş ödemeleri hesapla
  const filteredPayments = payments || [];

  // Ödeme tablosunu oluştur
  const renderPaymentTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!filteredPayments.length) {
      return (
        <div className="text-center p-6">
          <p className="text-muted-foreground">Ödeme bulunamadı.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableCaption>Toplam {filteredPayments.length} ödeme</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Rezervasyon</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Ödeme Yöntemi</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.map((payment: any) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.id}</TableCell>
              <TableCell>{formatDate(payment.createdAt)}</TableCell>
              <TableCell>
                <div>{payment.customerName || "Bilinmiyor"}</div>
                <div className="text-xs text-muted-foreground">{payment.customerEmail || "-"}</div>
              </TableCell>
              <TableCell>
                <div>#{payment.bookingReference || payment.bookingId}</div>
                <div className="text-xs text-muted-foreground">
                  {payment.routeName || "Bilinmiyor"}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{payment.amount} {payment.currency}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getPaymentMethodIcon(payment.paymentMethod)}
                  <span>{payment.paymentMethod}</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(payment.status)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {payment.status === "pending" && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => approvePaymentMutation.mutate(payment.id)}
                          className="text-green-600"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          <span>Onayla</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => rejectPaymentMutation.mutate(payment.id)}
                          className="text-red-600"
                        >
                          <X className="h-4 w-4 mr-2" />
                          <span>Reddet</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    
                    {payment.status === "completed" && (
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedPayment(payment);
                          setRefundAmount(payment.amount);
                          setIsRefundDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        <span>İade Et</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem>
                      <FileDown className="h-4 w-4 mr-2" />
                      <span>Makbuzu İndir</span>
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
            <h1 className="text-3xl font-bold tracking-tight">Ödeme Yönetimi</h1>
            <p className="text-muted-foreground">Tüm ödemeleri görüntüleyin ve yönetin</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="h-4 w-4" />
              <span>Dışa Aktar</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Tüm Ödemeler</TabsTrigger>
            <TabsTrigger value="completed">Tamamlananlar</TabsTrigger>
            <TabsTrigger value="pending">Bekleyenler</TabsTrigger>
            <TabsTrigger value="failed">Başarısızlar</TabsTrigger>
            <TabsTrigger value="refunded">İade Edilenler</TabsTrigger>
          </TabsList>

          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="PNR, Müşteri adı veya e-posta ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Durum</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="failed">Başarısız</SelectItem>
                  <SelectItem value="refunded">İade Edildi</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    <span>Tarih</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Zamanlar</SelectItem>
                  <SelectItem value="today">Bugün</SelectItem>
                  <SelectItem value="yesterday">Dün</SelectItem>
                  <SelectItem value="week">Bu Hafta</SelectItem>
                  <SelectItem value="month">Bu Ay</SelectItem>
                  <SelectItem value="year">Bu Yıl</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                <span>
                  {activeTab === "all" && "Tüm Ödemeler"}
                  {activeTab === "completed" && "Tamamlanan Ödemeler"}
                  {activeTab === "pending" && "Bekleyen Ödemeler"}
                  {activeTab === "failed" && "Başarısız Ödemeler"}
                  {activeTab === "refunded" && "İade Edilen Ödemeler"}
                </span>
              </CardTitle>
              <CardDescription>
                {filterStatus !== "all" || filterDateRange !== "all" || searchQuery
                  ? "Filtrelenmiş ödeme listesi görüntüleniyor"
                  : "Tüm ödemeler listeleniyor"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderPaymentTable()}
            </CardContent>
          </Card>
        </Tabs>

        {/* İade Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ödeme İadesi</DialogTitle>
              <DialogDescription>
                {selectedPayment ? `#${selectedPayment.id} numaralı ödeme için iade işlemini tamamlayın.` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="refundAmount" className="text-right">
                  İade Tutarı
                </Label>
                <Input
                  id="refundAmount"
                  type="text"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="refundReason" className="text-right">
                  İade Nedeni
                </Label>
                <Input
                  id="refundReason"
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={() => {
                  if (selectedPayment && refundAmount) {
                    refundMutation.mutate({
                      paymentId: selectedPayment.id,
                      amount: refundAmount,
                      reason: refundReason
                    });
                  }
                }}
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                İade Et
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}