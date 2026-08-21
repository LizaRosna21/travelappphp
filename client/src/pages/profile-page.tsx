import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, User, Ticket, MessageSquare, Bell, Edit, Save, Plus, Minus, Star, ThumbsUp, Send, Share2, Facebook, Twitter, Linkedin, Link, Instagram } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

// Helper function to format date and time
const formatDateTime = (dateString: string) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    return format(date, 'd MMMM yyyy, HH:mm', { locale: tr });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Geçersiz tarih";
  }
};

// User profile schema
const userProfileSchema = z.object({
  bio: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  preferredLanguage: z.string().default("tr"),
  preferredCurrency: z.string().default("TRY"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  identityNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  newsletterSubscribed: z.boolean().default(true),
  avatarUrl: z.string().optional(),
});

// Review form schema
const reviewFormSchema = z.object({
  title: z.string().min(5, { message: "Başlık en az 5 karakter olmalıdır" }),
  content: z.string().min(10, { message: "İçerik en az 10 karakter olmalıdır" }),
  rating: z.string().min(1, { message: "Lütfen bir puan seçin" }),
  routeId: z.string({ required_error: "Lütfen bir rota seçin" }),
  isAnonymous: z.boolean().default(false),
});

// Support request schema
const supportRequestSchema = z.object({
  title: z.string().min(5, { message: "Başlık en az 5 karakter olmalıdır" }),
  description: z.string().min(10, { message: "Açıklama en az 10 karakter olmalıdır" }),
  category: z.string({ required_error: "Lütfen bir kategori seçin" }),
  priority: z.string().default("normal"),
  bookingId: z.string().optional(),
});

// Profile component
const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Redirect if not logged in
  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Üye Profili</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={user.profileImage || ""} alt={user.username} />
                <AvatarFallback className="text-xl">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{user.username}</CardTitle>
              <CardDescription className="text-center">
                {user.email || "E-posta eklenmemiş"}
              </CardDescription>
              <div className="mt-2">
                <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                  {user.role === "admin" ? "Admin" : user.role === "agent" ? "Acente" : "Üye"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("bookings")}>
                  <Ticket className="mr-2 h-4 w-4" />
                  Rezervasyonlar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("reviews")}>
                  <Star className="mr-2 h-4 w-4" />
                  Yorumlar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("support")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Destek Talepleri
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("notifications")}>
                  <Bell className="mr-2 h-4 w-4" />
                  Bildirimler
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("social-shares")}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Sosyal Paylaşımlar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            {activeTab === "profile" && <ProfileTab userId={user.id} />}
            {activeTab === "bookings" && <BookingsTab userId={user.id} />}
            {activeTab === "reviews" && <ReviewsTab userId={user.id} />}
            {activeTab === "support" && <SupportTab userId={user.id} />}
            {activeTab === "notifications" && <NotificationsTab userId={user.id} />}
            {activeTab === "social-shares" && <SocialSharesTab userId={user.id} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Profile Tab
const ProfileTab = ({ userId }: { userId: number }) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch profile data
  const profileQuery = useQuery({
    queryKey: ['/api/user/profile', userId],
    retry: false
  });

  const form = useForm<z.infer<typeof userProfileSchema>>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      bio: "",
      preferredLanguage: "tr",
      preferredCurrency: "TRY",
      newsletterSubscribed: true,
    }
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (profileQuery.data && !profileQuery.isLoading) {
      // Reset form with fetched data
      form.reset(profileQuery.data);
    }
  }, [profileQuery.data, profileQuery.isLoading, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userProfileSchema>) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      if (!res.ok) {
        throw new Error("Profil güncellenirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile', userId] });
      toast({
        title: "Profil güncellendi",
        description: "Profil bilgileriniz başarıyla güncellendi.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof userProfileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Profile data not found, show creating form
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Profil Bilgileri</h2>
          <Button 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "default" : "outline"}
          >
            {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
            {isEditing ? "Kaydet" : "Düzenle"}
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hakkımda</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Kendinizi tanıtın..." 
                        {...field} 
                        disabled={!isEditing}
                        className="min-h-24"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doğum Tarihi</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cinsiyet</FormLabel>
                      <Select 
                        disabled={!isEditing} 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Cinsiyet seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Erkek</SelectItem>
                          <SelectItem value="female">Kadın</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tercih Edilen Dil</FormLabel>
                    <Select 
                      disabled={!isEditing} 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Dil seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="en">İngilizce</SelectItem>
                        <SelectItem value="fr">Fransızca</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tercih Edilen Para Birimi</FormLabel>
                    <Select 
                      disabled={!isEditing} 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Para birimi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                        <SelectItem value="USD">Dolar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adresinizi girin..." 
                        {...field} 
                        disabled={!isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şehir</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled={!isEditing}
                          placeholder="Şehir"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ülke</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled={!isEditing}
                          placeholder="Ülke"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="identityNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kimlik/Pasaport Numarası</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isEditing}
                        placeholder="TC Kimlik No veya Pasaport No"
                      />
                    </FormControl>
                    <FormDescription>
                      Bu bilgi rezervasyonlarda kullanılacaktır
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passportNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasaport Numarası (Uluslararası Seyahatler İçin)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isEditing}
                        placeholder="Pasaport Numarası"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acil Durumda İletişim Kurulacak Kişi</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isEditing}
                        placeholder="Ad Soyad"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acil Durum Telefonu</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isEditing}
                        placeholder="+90 555 123 4567"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="newsletterSubscribed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={!isEditing}
                      className="h-4 w-4 mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>E-Bülten</FormLabel>
                    <FormDescription>
                      Fırsatlar, promosyonlar ve özel teklifler hakkında e-posta almak istiyorum.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {isEditing && (
              <Button 
                type="submit" 
                className="w-full"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Profil Bilgilerini Kaydet
              </Button>
            )}
          </form>
        </Form>
      </div>
    );
  }

  // Display and edit existing profile data
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Profil Bilgileri</h2>
        <Button 
          size="sm" 
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "default" : "outline"}
        >
          {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
          {isEditing ? "Kaydet" : "Düzenle"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hakkımda</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Kendinizi tanıtın..." 
                      {...field} 
                      disabled={!isEditing}
                      className="min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doğum Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        disabled={!isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cinsiyet</FormLabel>
                    <Select 
                      disabled={!isEditing} 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Cinsiyet seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Erkek</SelectItem>
                        <SelectItem value="female">Kadın</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="preferredLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tercih Edilen Dil</FormLabel>
                  <Select 
                    disabled={!isEditing} 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Dil seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tr">Türkçe</SelectItem>
                      <SelectItem value="en">İngilizce</SelectItem>
                      <SelectItem value="fr">Fransızca</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tercih Edilen Para Birimi</FormLabel>
                  <Select 
                    disabled={!isEditing} 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Para birimi seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                      <SelectItem value="USD">Dolar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Adresinizi girin..." 
                      {...field} 
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şehir</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isEditing}
                        placeholder="Şehir"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ülke</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isEditing}
                        placeholder="Ülke"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="identityNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kimlik/Pasaport Numarası</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      placeholder="TC Kimlik No veya Pasaport No"
                    />
                  </FormControl>
                  <FormDescription>
                    Bu bilgi rezervasyonlarda kullanılacaktır
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passportNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pasaport Numarası (Uluslararası Seyahatler İçin)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      placeholder="Pasaport Numarası"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acil Durumda İletişim Kurulacak Kişi</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      placeholder="Ad Soyad"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acil Durum Telefonu</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      placeholder="+90 555 123 4567"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <FormField
            control={form.control}
            name="newsletterSubscribed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={!isEditing}
                    className="h-4 w-4 mt-1"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>E-Bülten</FormLabel>
                  <FormDescription>
                    Fırsatlar, promosyonlar ve özel teklifler hakkında e-posta almak istiyorum.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {isEditing && (
            <Button 
              type="submit" 
              className="w-full"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Profil Bilgilerini Kaydet
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
};

// Bookings Tab
const BookingsTab = ({ userId }: { userId: number }) => {
  // Fetch user bookings
  const bookingsQuery = useQuery<any[]>({
    queryKey: ['/api/user/bookings', userId],
    retry: false,
    initialData: []
  });

  if (bookingsQuery.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookingsQuery.isError) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold mb-2">Veri Alınamadı</h2>
        <p className="text-muted-foreground">Rezervasyonlarınızı yüklerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
      </div>
    );
  }

  const bookings = bookingsQuery.data || [];

  if (bookings.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold mb-2">Henüz Rezervasyonunuz Yok</h2>
        <p className="text-muted-foreground mb-4">Feribot rezervasyonu yapmak için ana sayfaya gidebilirsiniz.</p>
        <Button asChild>
          <a href="/">Feribot Bileti Ara</a>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Rezervasyonlarım</h2>
      </div>

      <div className="space-y-4">
        {bookings.map((booking: any) => (
          <Card key={booking.id} className="overflow-hidden">
            <CardHeader className="bg-muted p-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {booking.departurePort} - {booking.arrivalPort}
                  </CardTitle>
                  <CardDescription>
                    PNR: {booking.pnrNumber} | Referans: {booking.bookingReference}
                  </CardDescription>
                </div>
                <Badge 
                  variant={
                    booking.status === 'confirmed' ? 'default' : 
                    booking.status === 'pending' ? 'secondary' : 
                    booking.status === 'cancelled' ? 'destructive' : 
                    'outline'
                  }
                >
                  {booking.status === 'confirmed' ? 'Onaylandı' : 
                   booking.status === 'pending' ? 'Beklemede' : 
                   booking.status === 'cancelled' ? 'İptal Edildi' : 
                   booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Yolculuk Tarihi</h4>
                  <p className="font-medium">{format(new Date(booking.departureDate), 'dd MMMM yyyy', { locale: tr })}</p>
                  {booking.departureTime && (
                    <p className="text-sm">{booking.departureTime}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Yolcu/Araç</h4>
                  <p className="font-medium">{booking.passengerCount} Yolcu</p>
                  {booking.vehicleCount > 0 && (
                    <p className="text-sm">{booking.vehicleCount} Araç</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Toplam Tutar</h4>
                  <p className="font-medium">{booking.totalPrice} {booking.currency}</p>
                  <p className="text-sm">
                    {booking.isPaid ? "Ödendi" : "Ödenmedi"} | {booking.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 
                                            booking.paymentMethod === 'bank_transfer' ? 'Banka Transferi' :
                                            booking.paymentMethod === 'cash' ? 'Nakit' : 'Beklemede'}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 flex justify-between">
              <div className="text-sm text-muted-foreground">
                Rezervasyon tarihi: {format(new Date(booking.createdAt), 'dd.MM.yyyy')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={booking.status === 'cancelled'}
                  asChild
                >
                  <a href={`/bookings/${booking.id}`}>Detaylar</a>
                </Button>
                {booking.status === 'confirmed' && (
                  <Button 
                    size="sm"
                    asChild
                  >
                    <a href={`/tickets/${booking.id}`}>Bilet Görüntüle</a>
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Reviews Tab
const ReviewsTab = ({ userId }: { userId: number }) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  
  // Get routes for review form
  const routesQuery = useQuery<any[]>({
    queryKey: ['/api/routes'],
    retry: false,
    initialData: []
  });

  // Fetch user reviews
  const reviewsQuery = useQuery<any[]>({
    queryKey: ['/api/user/reviews', userId],
    retry: false,
    initialData: []
  });

  const form = useForm<z.infer<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      title: "",
      content: "",
      rating: "",
      routeId: "",
      isAnonymous: false
    }
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reviewFormSchema>) => {
      const reviewData = {
        ...data,
        rating: parseInt(data.rating),
        routeId: parseInt(data.routeId),
        userId
      };
      
      const res = await apiRequest("POST", "/api/reviews", reviewData);
      if (!res.ok) {
        throw new Error("Yorum gönderilirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/reviews', userId] });
      toast({
        title: "Yorum gönderildi",
        description: "Yorumunuz başarıyla gönderildi ve incelenmek üzere moderatörlere iletildi.",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof reviewFormSchema>) => {
    submitReviewMutation.mutate(data);
  };

  // Loading state
  if (reviewsQuery.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Create review form
  const renderReviewForm = () => {
    if (!showForm) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Yeni Yorum Ekle</CardTitle>
          <CardDescription>
            Feribot seyahatiniz hakkında deneyimlerinizi paylaşın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="routeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rota</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Yorum yapmak istediğiniz rotayı seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {routesQuery.data?.map((route: any) => (
                          <SelectItem key={route.id} value={route.id.toString()}>
                            {route.departurePort} - {route.arrivalPort}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Puanınızı seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ (5) Mükemmel</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ (4) Çok iyi</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ (3) İyi</SelectItem>
                        <SelectItem value="2">⭐⭐ (2) Orta</SelectItem>
                        <SelectItem value="1">⭐ (1) Kötü</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input placeholder="Yorumunuzun başlığını girin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yorum</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Deneyiminizi paylaşın..." 
                        {...field} 
                        className="min-h-32"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Anonim Olarak Gönder</FormLabel>
                      <FormDescription>
                        İşaretlerseniz, yorumunuz diğer kullanıcılara anonim olarak görünecektir.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
                <Button 
                  type="submit"
                  disabled={submitReviewMutation.isPending}
                >
                  {submitReviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Yorumu Gönder
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  };
  
  // No reviews yet
  if (!reviewsQuery.data || reviewsQuery.data.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Yorumlarım</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Yorum Ekle
          </Button>
        </div>
        
        {renderReviewForm()}
        
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Henüz Bir Yorum Yapmadınız</h3>
          <p className="text-muted-foreground mb-4">
            Feribot seyahatleriniz hakkında düşüncelerinizi paylaşarak diğer yolculara yardımcı olabilirsiniz.
          </p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              İlk Yorumunuzu Ekleyin
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Display existing reviews
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Yorumlarım</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Yorum Ekle
        </Button>
      </div>
      
      {renderReviewForm()}
      
      <div className="space-y-4">
        {reviewsQuery.data.map((review: any) => (
          <Card key={review.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    {Array.from({ length: 5 - review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-gray-300" />
                    ))}
                  </div>
                  <CardTitle className="text-lg">{review.title}</CardTitle>
                </div>
                <Badge variant={
                  review.status === 'approved' ? 'default' : 
                  review.status === 'pending' ? 'secondary' : 
                  'outline'
                }>
                  {review.status === 'approved' ? 'Onaylandı' : 
                   review.status === 'pending' ? 'İncelemede' : 
                   review.status === 'rejected' ? 'Reddedildi' : 
                   review.status}
                </Badge>
              </div>
              <CardDescription>
                {review.routeName || 'Bilinmeyen Rota'} | {format(new Date(review.createdAt), 'dd.MM.yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <p>{review.content}</p>
              
              {review.moderatorNote && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  <p className="font-semibold">Moderatör Notu:</p>
                  <p>{review.moderatorNote}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 pt-3 text-sm text-muted-foreground">
              <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" /> {review.helpfulCount || 0} kişi faydalı buldu
                </div>
                <div className="flex gap-2">
                  {review.status === 'approved' && (
                    <Button variant="ghost" size="sm">
                      Paylaş
                    </Button>
                  )}
                  {review.status === 'rejected' && (
                    <Button variant="ghost" size="sm">
                      Düzenle
                    </Button>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Support Tab
const SupportTab = ({ userId }: { userId: number }) => {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [messageText, setMessageText] = useState("");

  // Fetch support requests
  const supportRequestsQuery = useQuery<any[]>({
    queryKey: ['/api/user/support-requests', userId],
    retry: false,
    initialData: []
  });

  // Fetch user bookings for the form
  const bookingsQuery = useQuery<any[]>({
    queryKey: ['/api/user/bookings', userId],
    retry: false,
    initialData: []
  });

  // Create form for new support request
  const newRequestForm = useForm<z.infer<typeof supportRequestSchema>>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "normal",
      bookingId: undefined
    }
  });

  // Submit new support request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supportRequestSchema>) => {
      const requestData = {
        ...data,
        userId,
        bookingId: data.bookingId ? parseInt(data.bookingId) : undefined
      };
      
      const res = await apiRequest("POST", "/api/support-requests", requestData);
      if (!res.ok) {
        throw new Error("Destek talebi oluşturulurken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/support-requests', userId] });
      toast({
        title: "Destek talebi oluşturuldu",
        description: "Talebiniz başarıyla oluşturuldu. En kısa sürede size dönüş yapacağız.",
      });
      newRequestForm.reset();
      setShowNewForm(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { supportRequestId: number, message: string }) => {
      const messageData = {
        supportRequestId: data.supportRequestId,
        senderId: userId,
        message: data.message,
        isStaff: false
      };
      
      const res = await apiRequest("POST", "/api/support-messages", messageData);
      if (!res.ok) {
        throw new Error("Mesaj gönderilirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/support-requests', userId] });
      setMessageText("");
      toast({
        title: "Mesaj gönderildi",
        description: "Mesajınız başarıyla gönderildi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitNewRequest = (data: z.infer<typeof supportRequestSchema>) => {
    submitRequestMutation.mutate(data);
  };

  const sendMessage = () => {
    if (!selectedRequest || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      supportRequestId: selectedRequest,
      message: messageText
    });
  };

  // Loading state
  if (supportRequestsQuery.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // New request form
  const renderNewRequestForm = () => {
    if (!showNewForm) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Yeni Destek Talebi</CardTitle>
          <CardDescription>
            Sorularınız veya sorunlarınız için bizimle iletişime geçebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...newRequestForm}>
            <form onSubmit={newRequestForm.handleSubmit(onSubmitNewRequest)} className="space-y-4">
              <FormField
                control={newRequestForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konu Başlığı</FormLabel>
                    <FormControl>
                      <Input placeholder="Talebinizin konusu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={newRequestForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="refund">İade Talebi</SelectItem>
                          <SelectItem value="cancellation">İptal</SelectItem>
                          <SelectItem value="modification">Değişiklik</SelectItem>
                          <SelectItem value="complaint">Şikayet</SelectItem>
                          <SelectItem value="information">Bilgi Talebi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newRequestForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Öncelik</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Öncelik seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Düşük</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Yüksek</SelectItem>
                          <SelectItem value="urgent">Acil</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={newRequestForm.control}
                name="bookingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İlgili Rezervasyon (İsteğe Bağlı)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Rezervasyon seçin (isteğe bağlı)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bookingsQuery.data?.map((booking: any) => (
                          <SelectItem key={booking.id} value={booking.id.toString()}>
                            PNR: {booking.pnrNumber} | {booking.departurePort} - {booking.arrivalPort}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Eğer talebiniz belirli bir rezervasyonla ilgiliyse, seçebilirsiniz
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newRequestForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Lütfen detaylı açıklama yazın..." 
                        {...field} 
                        className="min-h-32"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewForm(false)}
                >
                  İptal
                </Button>
                <Button 
                  type="submit"
                  disabled={submitRequestMutation.isPending}
                >
                  {submitRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Talebi Gönder
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  };

  // No support requests yet
  if (!supportRequestsQuery.data || supportRequestsQuery.data.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Destek Taleplerim</h2>
          <Button onClick={() => setShowNewForm(!showNewForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Talep
          </Button>
        </div>
        
        {renderNewRequestForm()}
        
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Henüz Bir Destek Talebiniz Yok</h3>
          <p className="text-muted-foreground mb-4">
            Herhangi bir sorunuz veya sorununuz varsa, bizimle iletişime geçebilirsiniz.
          </p>
          {!showNewForm && (
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Destek Talebi Oluştur
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Get the selected support request and its messages
  const selectedRequestData = selectedRequest 
    ? supportRequestsQuery.data.find((req: any) => req.id === selectedRequest)
    : null;
    
  // Display existing support requests
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Destek Taleplerim</h2>
        <Button onClick={() => {
          setSelectedRequest(null);
          setShowNewForm(!showNewForm);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Talep
        </Button>
      </div>
      
      {renderNewRequestForm()}
      
      {!selectedRequest ? (
        <div className="grid grid-cols-1 gap-4">
          {supportRequestsQuery.data.map((request: any) => (
            <Card 
              key={request.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedRequest(request.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">{request.title}</CardTitle>
                  <Badge variant={
                    request.status === 'resolved' ? 'default' : 
                    request.status === 'in_progress' ? 'secondary' : 
                    request.status === 'closed' ? 'outline' :
                    'destructive'
                  }>
                    {request.status === 'open' ? 'Açık' : 
                     request.status === 'in_progress' ? 'İşlemde' : 
                     request.status === 'resolved' ? 'Çözüldü' : 
                     request.status === 'closed' ? 'Kapatıldı' : 
                     request.status}
                  </Badge>
                </div>
                <CardDescription>
                  {request.category === 'refund' ? 'İade Talebi' :
                   request.category === 'cancellation' ? 'İptal' :
                   request.category === 'modification' ? 'Değişiklik' :
                   request.category === 'complaint' ? 'Şikayet' :
                   request.category === 'information' ? 'Bilgi Talebi' :
                   request.category} | {format(new Date(request.createdAt), 'dd.MM.yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="line-clamp-2">{request.description}</p>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-3 text-sm text-muted-foreground justify-between">
                <div>
                  {request.bookingReference && (
                    <span>Rezervasyon: {request.bookingReference}</span>
                  )}
                </div>
                <div>
                  {request.messageCount > 0 && (
                    <span>{request.messageCount} mesaj</span>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              className="p-0 mr-2" 
              onClick={() => setSelectedRequest(null)}
            >
              ← Geri
            </Button>
            <h3 className="text-xl font-semibold">{selectedRequestData?.title}</h3>
          </div>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>{selectedRequestData?.title}</CardTitle>
                  <CardDescription>
                    {selectedRequestData?.category === 'refund' ? 'İade Talebi' :
                     selectedRequestData?.category === 'cancellation' ? 'İptal' :
                     selectedRequestData?.category === 'modification' ? 'Değişiklik' :
                     selectedRequestData?.category === 'complaint' ? 'Şikayet' :
                     selectedRequestData?.category === 'information' ? 'Bilgi Talebi' :
                     selectedRequestData?.category} | {format(new Date(selectedRequestData?.createdAt), 'dd.MM.yyyy')}
                  </CardDescription>
                </div>
                <Badge variant={
                  selectedRequestData?.status === 'resolved' ? 'default' : 
                  selectedRequestData?.status === 'in_progress' ? 'secondary' : 
                  selectedRequestData?.status === 'closed' ? 'outline' :
                  'destructive'
                }>
                  {selectedRequestData?.status === 'open' ? 'Açık' : 
                   selectedRequestData?.status === 'in_progress' ? 'İşlemde' : 
                   selectedRequestData?.status === 'resolved' ? 'Çözüldü' : 
                   selectedRequestData?.status === 'closed' ? 'Kapatıldı' : 
                   selectedRequestData?.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-medium mb-1">Talep Detayı:</h4>
                <p className="text-sm whitespace-pre-line">{selectedRequestData?.description}</p>
              </div>
              
              {selectedRequestData?.bookingReference && (
                <div className="mb-4 p-3 bg-muted rounded-md">
                  <h4 className="font-medium mb-1">İlgili Rezervasyon:</h4>
                  <p className="text-sm">PNR: {selectedRequestData.bookingReference}</p>
                </div>
              )}
              
              {selectedRequestData?.messages && selectedRequestData.messages.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Mesajlar:</h4>
                  <div className="space-y-4">
                    {selectedRequestData.messages.map((message: any) => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.isStaff ? 'justify-start' : 'justify-end'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.isStaff 
                              ? 'bg-muted' 
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="whitespace-pre-line">{message.message}</p>
                          <div className="text-xs mt-1 opacity-70 text-right">
                            {format(new Date(message.createdAt), 'dd.MM.yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedRequestData?.status !== 'closed' && selectedRequestData?.status !== 'resolved' && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Cevap Yaz:</h4>
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Mesajınızı yazın..." 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button 
                      onClick={sendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Send className="mr-2 h-4 w-4" />
                      Gönder
                    </Button>
                  </div>
                </div>
              )}
              
              {(selectedRequestData?.status === 'closed' || selectedRequestData?.status === 'resolved') && (
                <div className="mt-6 p-4 bg-muted rounded-md">
                  <p className="text-center">
                    Bu destek talebi kapatılmıştır. Yeni bir sorunuz varsa, lütfen yeni bir talep oluşturun.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Notifications Tab
const NotificationsTab = ({ userId }: { userId: number }) => {
  // Fetch notifications
  const notificationsQuery = useQuery<any[]>({
    queryKey: ['/api/user/notifications', userId],
    retry: false,
    initialData: []
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
      if (!res.ok) {
        throw new Error("Bildirim okundu olarak işaretlenirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications', userId] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-all-read", { userId });
      if (!res.ok) {
        throw new Error("Bildirimler okundu olarak işaretlenirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications', userId] });
    },
  });

  const markAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Loading state
  if (notificationsQuery.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No notifications
  if (!notificationsQuery.data || notificationsQuery.data.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Bildirimlerim</h2>
        </div>
        
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Henüz Bildiriminiz Yok</h3>
          <p className="text-muted-foreground">
            Yeni bildirimleriniz burada görünecektir.
          </p>
        </div>
      </div>
    );
  }
  
  // Count unread notifications
  const unreadCount = notificationsQuery.data.filter((notif: any) => !notif.isRead).length;
  
  // Display notifications
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Bildirimlerim</h2>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {notificationsQuery.data.map((notification: any) => (
          <Card 
            key={notification.id} 
            className={`relative ${!notification.isRead ? 'border-primary' : ''}`}
          >
            {!notification.isRead && (
              <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-primary" />
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{notification.title}</CardTitle>
              <CardDescription>
                {format(new Date(notification.createdAt), 'dd.MM.yyyy HH:mm')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{notification.message}</p>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                {notification.notificationType === 'booking' ? 'Rezervasyon' :
                 notification.notificationType === 'payment' ? 'Ödeme' :
                 notification.notificationType === 'review' ? 'Yorum' :
                 notification.notificationType === 'support' ? 'Destek' :
                 notification.notificationType === 'system' ? 'Sistem' :
                 notification.notificationType}
              </div>
              <div className="flex gap-2">
                {notification.actionUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={notification.actionUrl}>Görüntüle</a>
                  </Button>
                )}
                {!notification.isRead && (
                  <Button 
                    size="sm" 
                    onClick={() => markAsRead(notification.id)}
                    disabled={markAsReadMutation.isPending}
                  >
                    {markAsReadMutation.isPending && 
                     markAsReadMutation.variables === notification.id && 
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Okundu
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Social Shares Tab
const SocialSharesTab = ({ userId }: { userId: number }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('route');
  const [showShareForm, setShowShareForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  // Fetch social shares for user
  const socialSharesQuery = useQuery<any[]>({
    queryKey: ['/api/user/social-shares', userId],
    retry: false,
    initialData: []
  });

  // Delete social share mutation
  const deleteSocialShareMutation = useMutation({
    mutationFn: async (shareId: number) => {
      const res = await apiRequest("DELETE", `/api/user/social-shares/${shareId}`);
      if (!res.ok) {
        throw new Error("Sosyal paylaşım silinirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/social-shares', userId] });
      toast({
        title: "Paylaşım silindi",
        description: "Sosyal medya paylaşımınız başarıyla silindi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create social share mutation
  const createSocialShareMutation = useMutation({
    mutationFn: async (data: { shareUrl: string; platform: string; contentType: string }) => {
      const res = await apiRequest("POST", "/api/user/social-shares", data);
      if (!res.ok) {
        throw new Error("Sosyal paylaşım kaydedilirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/social-shares', userId] });
      toast({
        title: "Paylaşım kaydedildi",
        description: "Sosyal medya paylaşımınız başarıyla kaydedildi.",
      });
      setShareUrl('');
      setPlatform('');
      setShowShareForm(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareUrl) {
      toast({
        title: "Hata",
        description: "Lütfen paylaşım URL'si girin.",
        variant: "destructive",
      });
      return;
    }
    if (!platform) {
      toast({
        title: "Hata",
        description: "Lütfen paylaşım platformu seçin.",
        variant: "destructive",
      });
      return;
    }

    createSocialShareMutation.mutate({
      shareUrl,
      platform,
      contentType
    });
  };
  
  const handleDelete = (id: number) => {
    if (window.confirm("Bu paylaşımı silmek istediğinizden emin misiniz?")) {
      deleteSocialShareMutation.mutate(id);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'twitter':
      case 'x':
        return <Twitter className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const getPlatformClass = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return 'bg-blue-600 text-white';
      case 'twitter':
      case 'x':
        return 'bg-sky-500 text-white';
      case 'linkedin':
        return 'bg-blue-700 text-white';
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      default:
        return 'bg-gray-700 text-white';
    }
  };
  
  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'route':
        return 'Rota paylaşımı';
      case 'review':
        return 'Değerlendirme paylaşımı';
      case 'booking':
        return 'Rezervasyon paylaşımı';
      case 'promotion':
        return 'Promosyon paylaşımı';
      case 'experience':
        return 'Deneyim paylaşımı';
      default:
        return 'Genel paylaşım';
    }
  };

  if (socialSharesQuery.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (socialSharesQuery.isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-2">Sosyal paylaşımlar yüklenirken bir hata oluştu.</p>
        <Button 
          variant="outline" 
          onClick={() => socialSharesQuery.refetch()}
        >
          Yeniden Dene
        </Button>
      </div>
    );
  }

  const allShares = socialSharesQuery.data || [];
  
  // Apply filters
  const socialShares = filter === 'all' 
    ? allShares 
    : allShares.filter((share: any) => share.platform.toLowerCase() === filter);
  
  // Get stats
  const platformCounts = allShares.reduce((acc: Record<string, number>, share: any) => {
    const platform = share.platform.toLowerCase();
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sosyal Paylaşımlarım</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShareForm(!showShareForm)}
        >
          {showShareForm ? (
            <>
              <Minus className="mr-2 h-4 w-4" />
              İptal Et
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Paylaşım Ekle
            </>
          )}
        </Button>
      </div>
      
      {/* Social share statistics */}
      {allShares.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">{allShares.length}</div>
              <div className="text-sm text-muted-foreground">Toplam Paylaşım</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-center">
              <Facebook className="h-4 w-4 text-blue-600 mr-2" />
              <div>
                <div className="text-2xl font-bold">{platformCounts.facebook || 0}</div>
                <div className="text-sm text-muted-foreground">Facebook</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-center">
              <Twitter className="h-4 w-4 text-sky-500 mr-2" />
              <div>
                <div className="text-2xl font-bold">{(platformCounts.twitter || 0) + (platformCounts.x || 0)}</div>
                <div className="text-sm text-muted-foreground">Twitter</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-center">
              <Instagram className="h-4 w-4 text-pink-500 mr-2" />
              <div>
                <div className="text-2xl font-bold">{platformCounts.instagram || 0}</div>
                <div className="text-sm text-muted-foreground">Instagram</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showShareForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shareUrl">Paylaşım URL'si</Label>
                  <Input
                    id="shareUrl"
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                    placeholder="https://example.com/paylaşımınız"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Platform seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="other">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contentType">İçerik Türü</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="İçerik türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="route">Rota Paylaşımı</SelectItem>
                    <SelectItem value="review">Değerlendirme Paylaşımı</SelectItem>
                    <SelectItem value="booking">Rezervasyon Paylaşımı</SelectItem>
                    <SelectItem value="promotion">Promosyon Paylaşımı</SelectItem>
                    <SelectItem value="experience">Deneyim Paylaşımı</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={createSocialShareMutation.isPending}
              >
                {createSocialShareMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Paylaşımı Kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      {/* Filter buttons */}
      {allShares.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant={filter === 'all' ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter('all')}
          >
            Tümü ({allShares.length})
          </Button>
          {Object.entries(platformCounts).map(([platform, count]) => (
            <Button
              key={platform}
              variant={filter === platform ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(platform)}
              className="flex items-center"
            >
              {getPlatformIcon(platform)}
              <span className="ml-1 capitalize">{platform} ({count})</span>
            </Button>
          ))}
        </div>
      )}

      {socialShares.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-muted/50">
          <Share2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">Henüz Paylaşımınız Bulunmuyor</h3>
          <p className="text-muted-foreground mt-1">
            Henüz sosyal medyada bir paylaşım yapmadınız. Yaptığınız paylaşımları kaydederek bonus puanlar kazanabilirsiniz.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowShareForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni Paylaşım Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {socialShares.map((share: any) => (
            <Card key={share.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getPlatformClass(share.platform)}`}>
                    {getPlatformIcon(share.platform)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold capitalize">{share.platform} Paylaşımı</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getContentTypeLabel(share.contentType)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(share.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    {share.shareUrl && (
                      <div className="mt-2 flex items-center justify-between">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary"
                          onClick={() => window.open(share.shareUrl, '_blank')}
                        >
                          <Link className="mr-1 h-4 w-4" />
                          Paylaşımı Görüntüle
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(share.id)}
                          disabled={deleteSocialShareMutation.isPending && deleteSocialShareMutation.variables === share.id}
                        >
                          {deleteSocialShareMutation.isPending && deleteSocialShareMutation.variables === share.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span>Sil</span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;