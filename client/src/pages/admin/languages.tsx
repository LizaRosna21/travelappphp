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

const languageSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: "Dil adı en az 2 karakter olmalıdır" }),
  code: z.string().min(2, { message: "Dil kodu en az 2 karakter olmalıdır" }),
  localName: z.string().optional(),
  flagEmoji: z.string().optional(),
  rtl: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type LanguageFormValues = z.infer<typeof languageSchema>;

export default function LanguagesPage() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageFormValues | null>(null);
  
  const queryClient = useQueryClient();
  
  const form = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      name: "",
      code: "",
      localName: "",
      flagEmoji: "",
      rtl: false,
      isActive: true,
      isDefault: false,
    },
  });
  
  const editForm = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: currentLanguage || {
      name: "",
      code: "",
      localName: "",
      flagEmoji: "",
      rtl: false,
      isActive: true,
      isDefault: false,
    },
  });
  
  const { data: languages = [], isLoading, error } = useQuery({
    queryKey: ["/api/admin/languages"],
    queryFn: () => apiRequest("GET", "/api/admin/languages").then(res => res.json()),
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: LanguageFormValues) => {
      return apiRequest("POST", "/api/admin/languages", data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      toast({
        title: "Başarılı!",
        description: "Dil başarıyla eklendi.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Dil eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: LanguageFormValues) => {
      return apiRequest("PATCH", `/api/admin/languages/${data.id}`, data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      toast({
        title: "Başarılı!",
        description: "Dil başarıyla güncellendi.",
      });
      setEditOpen(false);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Dil güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/languages/${id}`).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/languages"] });
      toast({
        title: "Başarılı!",
        description: "Dil başarıyla silindi.",
      });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Dil silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: LanguageFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleEdit = (language: LanguageFormValues) => {
    setCurrentLanguage(language);
    editForm.reset(language);
    setEditOpen(true);
  };
  
  const handleDelete = (language: LanguageFormValues) => {
    setCurrentLanguage(language);
    setDeleteOpen(true);
  };
  
  const onEditSubmit = (data: LanguageFormValues) => {
    updateMutation.mutate(data);
  };
  
  const onDelete = () => {
    if (currentLanguage?.id) {
      deleteMutation.mutate(currentLanguage.id);
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <AdminHeader 
        title="Dil Yönetimi" 
        description="Sistem dillerini bu sayfadan yönetebilirsiniz."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Dil Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Dil Ekle</DialogTitle>
                <DialogDescription>
                  Sisteme yeni bir dil eklemek için aşağıdaki formu doldurun.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dil Adı (İngilizce)</FormLabel>
                        <FormControl>
                          <Input placeholder="Turkish, English, French" {...field} />
                        </FormControl>
                        <FormDescription>
                          Dilin İngilizce adı
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="localName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yerel Dil Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Türkçe, English, Français" {...field} />
                        </FormControl>
                        <FormDescription>
                          Dilin kendi dilindeki adı
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
                          <FormLabel>Dil Kodu</FormLabel>
                          <FormControl>
                            <Input placeholder="tr, en, fr" {...field} />
                          </FormControl>
                          <FormDescription>
                            ISO 639-1 standartında iki harfli dil kodu
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="flagEmoji"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bayrak Emoji</FormLabel>
                          <FormControl>
                            <Input placeholder="🇹🇷, 🇬🇧, 🇫🇷" {...field} />
                          </FormControl>
                          <FormDescription>
                            Dil için bayrak emoji (isteğe bağlı)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="rtl"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Sağdan Sola Yazım</FormLabel>
                            <FormDescription>
                              Bu dil sağdan sola mı yazılıyor? (Arapça, Farsça, İbranice gibi)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
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
                              Bu dil aktif olarak kullanılabilir mi?
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
                            <FormLabel>Varsayılan Dil</FormLabel>
                            <FormDescription>
                              Bu dil sistemin varsayılan dili olacak mı?
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
                <TableHead>Bayrak</TableHead>
                <TableHead>Dil Adı</TableHead>
                <TableHead>Yerel Ad</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Sağdan Sola</TableHead>
                <TableHead>Varsayılan</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((language: LanguageFormValues) => (
                <TableRow key={language.id}>
                  <TableCell>{language.flagEmoji}</TableCell>
                  <TableCell className="font-medium">{language.name}</TableCell>
                  <TableCell>{language.localName}</TableCell>
                  <TableCell>{language.code}</TableCell>
                  <TableCell>{language.rtl ? "Evet" : "Hayır"}</TableCell>
                  <TableCell>{language.isDefault ? "Evet" : "Hayır"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${language.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {language.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(language)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(language)}
                      disabled={language.isDefault}
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
            <DialogTitle>Dil Düzenle</DialogTitle>
            <DialogDescription>
              Dil bilgilerini düzenlemek için aşağıdaki formu kullanın.
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
                    <FormLabel>Dil Adı (İngilizce)</FormLabel>
                    <FormControl>
                      <Input placeholder="Turkish, English, French" {...field} />
                    </FormControl>
                    <FormDescription>
                      Dilin İngilizce adı
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="localName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yerel Dil Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Türkçe, English, Français" {...field} />
                    </FormControl>
                    <FormDescription>
                      Dilin kendi dilindeki adı
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
                      <FormLabel>Dil Kodu</FormLabel>
                      <FormControl>
                        <Input placeholder="tr, en, fr" {...field} />
                      </FormControl>
                      <FormDescription>
                        ISO 639-1 standartında iki harfli dil kodu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="flagEmoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bayrak Emoji</FormLabel>
                      <FormControl>
                        <Input placeholder="🇹🇷, 🇬🇧, 🇫🇷" {...field} />
                      </FormControl>
                      <FormDescription>
                        Dil için bayrak emoji (isteğe bağlı)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex space-x-4">
                <FormField
                  control={editForm.control}
                  name="rtl"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sağdan Sola Yazım</FormLabel>
                        <FormDescription>
                          Bu dil sağdan sola mı yazılıyor? (Arapça, Farsça, İbranice gibi)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
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
                          Bu dil aktif olarak kullanılabilir mi?
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
                        <FormLabel>Varsayılan Dil</FormLabel>
                        <FormDescription>
                          Bu dil sistemin varsayılan dili olacak mı?
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
              Bu işlem <strong>{currentLanguage?.name}</strong> dilini sistemden kalıcı olarak silecektir. Bu işlem geri alınamaz.
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