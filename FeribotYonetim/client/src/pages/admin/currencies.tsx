import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

const currencySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: "Para birimi adı en az 2 karakter olmalıdır" }),
  code: z.string().min(3, { message: "Para birimi kodu en az 3 karakter olmalıdır" }).max(3),
  symbol: z.string().min(1, { message: "Para birimi sembolü gereklidir" }),
  exchangeRate: z.string().min(1, { message: "Döviz kuru gereklidir" }),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type CurrencyFormValues = z.infer<typeof currencySchema>;

export default function CurrenciesPage() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyFormValues | null>(null);
  
  const queryClient = useQueryClient();
  
  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      name: "",
      code: "",
      symbol: "",
      exchangeRate: "1.0",
      isActive: true,
      isDefault: false,
    },
  });
  
  const editForm = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: currentCurrency || {
      name: "",
      code: "",
      symbol: "",
      exchangeRate: "1.0",
      isActive: true,
      isDefault: false,
    },
  });
  
  const { data: currencies = [], isLoading, error } = useQuery({
    queryKey: ["/api/admin/currencies"],
    queryFn: () => apiRequest("GET", "/api/admin/currencies").then(res => res.json()),
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: CurrencyFormValues) => {
      return apiRequest("POST", "/api/admin/currencies", data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/currencies"] });
      toast({
        title: "Başarılı!",
        description: "Para birimi başarıyla eklendi.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Para birimi eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: CurrencyFormValues) => {
      return apiRequest("PUT", `/api/admin/currencies/${data.id}`, data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/currencies"] });
      toast({
        title: "Başarılı!",
        description: "Para birimi başarıyla güncellendi.",
      });
      setEditOpen(false);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Para birimi güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/currencies/${id}`).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/currencies"] });
      toast({
        title: "Başarılı!",
        description: "Para birimi başarıyla silindi.",
      });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Para birimi silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: CurrencyFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleEdit = (currency: CurrencyFormValues) => {
    setCurrentCurrency(currency);
    editForm.reset(currency);
    setEditOpen(true);
  };
  
  const handleDelete = (currency: CurrencyFormValues) => {
    setCurrentCurrency(currency);
    setDeleteOpen(true);
  };
  
  const onEditSubmit = (data: CurrencyFormValues) => {
    updateMutation.mutate(data);
  };
  
  const onDelete = () => {
    if (currentCurrency?.id) {
      deleteMutation.mutate(currentCurrency.id);
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <AdminHeader 
        title="Para Birimi Yönetimi" 
        description="Sistem para birimlerini bu sayfadan yönetebilirsiniz."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Para Birimi Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Para Birimi Ekle</DialogTitle>
                <DialogDescription>
                  Sisteme yeni bir para birimi eklemek için aşağıdaki formu doldurun.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Para Birimi Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Türk Lirası, Dolar, Euro" {...field} />
                        </FormControl>
                        <FormDescription>
                          Para biriminin tam adı
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Para Birimi Kodu</FormLabel>
                          <FormControl>
                            <Input placeholder="TRY, USD, EUR" {...field} />
                          </FormControl>
                          <FormDescription>
                            ISO 4217 standartında üç harfli para birimi kodu
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Para Birimi Sembolü</FormLabel>
                          <FormControl>
                            <Input placeholder="₺, $, €" {...field} />
                          </FormControl>
                          <FormDescription>
                            Para birimi sembolü (görsel gösterim için)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Döviz Kuru</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" placeholder="1.0" {...field} />
                        </FormControl>
                        <FormDescription>
                          Ana para birimi baz alınarak hesaplanan döviz kuru
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Aktif</FormLabel>
                            <FormDescription>
                              Bu para birimi aktif olarak kullanılabilir mi?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Varsayılan Para Birimi</FormLabel>
                            <FormDescription>
                              Bu para birimi sistemin varsayılan para birimi olacak mı?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />
      
      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <p>Yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-24">
            <p className="text-red-500">Hata: {(error as Error).message}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sembol</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Döviz Kuru</TableHead>
                <TableHead>Varsayılan</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((currency: CurrencyFormValues) => (
                <TableRow key={currency.id}>
                  <TableCell className="font-medium">{currency.symbol}</TableCell>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.code}</TableCell>
                  <TableCell>{currency.exchangeRate}</TableCell>
                  <TableCell>{currency.isDefault ? "Evet" : "Hayır"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${currency.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {currency.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(currency)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(currency)}
                      disabled={currency.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Para Birimi Düzenle</DialogTitle>
            <DialogDescription>
              Para birimi bilgilerini düzenlemek için aşağıdaki formu kullanın.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="id"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Birimi Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Türk Lirası, Dolar, Euro" {...field} />
                    </FormControl>
                    <FormDescription>
                      Para biriminin tam adı
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Para Birimi Kodu</FormLabel>
                      <FormControl>
                        <Input placeholder="TRY, USD, EUR" {...field} />
                      </FormControl>
                      <FormDescription>
                        ISO 4217 standartında üç harfli para birimi kodu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Para Birimi Sembolü</FormLabel>
                      <FormControl>
                        <Input placeholder="₺, $, €" {...field} />
                      </FormControl>
                      <FormDescription>
                        Para birimi sembolü (görsel gösterim için)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Döviz Kuru</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="1.0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ana para birimi baz alınarak hesaplanan döviz kuru
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex space-x-4">
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Aktif</FormLabel>
                        <FormDescription>
                          Bu para birimi aktif olarak kullanılabilir mi?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex space-x-4">
                <FormField
                  control={editForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Varsayılan Para Birimi</FormLabel>
                        <FormDescription>
                          Bu para birimi sistemin varsayılan para birimi olacak mı?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem <strong>{currentCurrency?.name}</strong> para birimini sistemden kalıcı olarak silecektir. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}