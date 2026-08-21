import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminHeader } from "@/components/admin/admin-header";
import { ArrowLeft, Check, Key, Loader2, UserCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const userSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string().min(1, "Kullanıcı rolü seçilmelidir"),
  isActive: z.boolean().default(true),
  profileImage: z.string().optional(),
  parentAgencyId: z.string().optional().nullable(),
});

type UserFormValues = z.infer<typeof userSchema>;

const passwordSchema = z.object({
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const userQuery = useQuery({
    queryKey: [`/api/admin/users/${id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/users/${id}`);
      return await res.json();
    },
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["/api/admin/agencies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/agencies");
      return await res.json();
    },
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      phoneNumber: "",
      role: "user",
      isActive: true,
      profileImage: "",
      parentAgencyId: null,
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (userQuery.data) {
      const user = userQuery.data;
      form.reset({
        ...user,
        parentAgencyId: user.parentAgencyId ? String(user.parentAgencyId) : null,
      });
    }
  }, [userQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı bilgileri güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: `Kullanıcı güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const passwordUpdateMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/password`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı şifresi değiştirildi",
      });
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: `Şifre güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormValues) => {
    updateMutation.mutate(data);
  };

  const onPasswordSubmit = (data: { password: string; confirmPassword: string }) => {
    passwordUpdateMutation.mutate({ password: data.password });
  };

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userQuery.isError) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <AdminHeader
          title="Kullanıcı Bulunamadı"
          description="İstediğiniz kullanıcı bilgisi bulunamadı"
          action={
            <Button variant="outline" onClick={() => navigate("/admin/users")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kullanıcılara Dön
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AdminHeader
        title="Kullanıcı Detayları"
        description="Kullanıcı bilgilerini düzenle ve yönet"
        action={
          <Button variant="outline" onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kullanıcılara Dön
          </Button>
        }
      />

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kullanıcı Bilgileri</CardTitle>
              <div className="flex items-center gap-2">
                {form.getValues("isActive") ? (
                  <Badge variant="default" className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
                
                <Badge variant={
                  form.getValues("role") === "admin" 
                    ? "destructive" 
                    : form.getValues("role") === "agent" 
                      ? "blue" 
                      : "default"
                }>
                  {form.getValues("role") === "admin" 
                    ? "Yönetici" 
                    : form.getValues("role") === "agent" 
                      ? "Acente" 
                      : "Kullanıcı"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={form.getValues("profileImage") || ""} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(form.getValues("fullName") || form.getValues("username"))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="mt-2 text-sm text-muted-foreground">
                    ID: {id}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="grid gap-1">
                    <h3 className="font-semibold text-xl">
                      {form.getValues("fullName") || form.getValues("username")}
                    </h3>
                    <p className="text-muted-foreground">
                      {form.getValues("email")}
                    </p>
                    <p className="text-muted-foreground">
                      {form.getValues("phoneNumber") || "Telefon eklenmemiş"}
                    </p>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kullanıcı Adı</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tam Ad</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kullanıcı Rolü</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Rol seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">Kullanıcı</SelectItem>
                              <SelectItem value="agent">Acente</SelectItem>
                              <SelectItem value="admin">Yönetici</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentAgencyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bağlı Olduğu Acente</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Acente seçin (opsiyonel)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Bağlı Acente Yok</SelectItem>
                              {agencies.map((agency: any) => (
                                <SelectItem key={agency.id} value={String(agency.id)}>
                                  {agency.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="profileImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profil Resmi URL'i</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/profile.jpg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Aktif</FormLabel>
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

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Değişiklikleri Kaydet
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Güvenlik Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  <div>
                    <h4 className="font-medium">Şifre Değiştir</h4>
                    <p className="text-sm text-muted-foreground">
                      Kullanıcının şifresini yeniden ayarlayın
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                  Şifre Değiştir
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <UserCircle className="h-5 w-5 mr-2" />
                  <div>
                    <h4 className="font-medium">İki Faktörlü Doğrulama</h4>
                    <p className="text-sm text-muted-foreground">
                      Kullanıcı hesabı için ek güvenlik katmanı
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled>
                  Yakında
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifreyi Değiştir</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yeni Şifre</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifreyi Doğrula</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={passwordUpdateMutation.isPending}>
                  {passwordUpdateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Şifreyi Değiştir
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}