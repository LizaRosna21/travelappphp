import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users as UsersIcon, 
  MoreHorizontal, 
  Eye, 
  UserCog, 
  Mail, 
  Lock, 
  UserPlus, 
  ShieldAlert, 
  Shield, 
  UserX,
  AlertCircle,
  Send,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import AdminLayout from "@/components/layouts/admin-layout";
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  parentAgencyId: number | null;
  profileImage: string | null;
  phoneNumber: string | null;
}

interface Booking {
  id: number;
  userId: number;
  routeId: number;
  scheduleId: number;
  departureDate: string;
  totalPrice: string;
  status: string;
  bookingReference: string;
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
  });
  const [newPassword, setNewPassword] = useState({
    password: '',
    confirmPassword: '',
  });
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    phoneNumber: '',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 1000 * 60 * 5, // 5 dakika
  });

  // Fetch bookings to get booking stats per user
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
  });

  // User creation mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await apiRequest('POST', '/api/admin/users', userData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Unknown error occurred');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Kullanıcı oluşturuldu",
        description: "Yeni kullanıcı başarıyla oluşturuldu.",
      });
      setIsCreateUserOpen(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'user',
        phoneNumber: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Kullanıcı oluşturulamadı: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // User update mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User> & { id: number }) => {
      const { id, ...rest } = userData;
      const res = await apiRequest('PATCH', `/api/admin/users/${id}`, rest);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Kullanıcı güncellendi",
        description: "Kullanıcı bilgileri başarıyla güncellendi.",
      });
      setIsEditUserOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Kullanıcı güncellenemedi: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // User status toggle mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${id}/status`, { isActive });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: variables.isActive ? "Kullanıcı aktifleştirildi" : "Kullanıcı devre dışı bırakıldı",
        description: variables.isActive 
          ? "Kullanıcı artık oturum açabilir." 
          : "Kullanıcı artık oturum açamaz.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Kullanıcı durumu değiştirilemedi: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // User role change mutation
  const changeUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${id}/role`, { role });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Kullanıcı rolü değiştirildi",
        description: `Kullanıcı rolü ${variables.role === 'admin' ? 'yönetici' : 'kullanıcı'} olarak güncellendi.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Kullanıcı rolü değiştirilemedi: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Email sending mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { userId: number; subject: string; message: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${data.userId}/email`, {
        subject: data.subject,
        message: data.message
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "E-posta gönderildi",
        description: "E-posta başarıyla gönderildi.",
      });
      setIsEmailDialogOpen(false);
      setEmailData({ subject: '', message: '' });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `E-posta gönderilemedi: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: number; password: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${data.userId}/reset-password`, {
        password: data.password
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Şifre sıfırlandı",
        description: "Kullanıcı şifresi başarıyla sıfırlandı.",
      });
      setIsResetPasswordOpen(false);
      setNewPassword({ password: '', confirmPassword: '' });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Şifre sıfırlanamadı: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // User deletion mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Unknown error occurred');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Kullanıcı silindi",
        description: "Kullanıcı başarıyla silindi.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Kullanıcı silinemedi: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handler functions
  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsViewUserOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  const handleSendEmail = (user: User) => {
    setSelectedUser(user);
    setEmailData({
      subject: `FerryBooking: Bilgilendirme`,
      message: `Sayın ${user.fullName || user.username},\n\n`,
    });
    setIsEmailDialogOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword({ password: '', confirmPassword: '' });
    setIsResetPasswordOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && emailData.subject && emailData.message) {
      sendEmailMutation.mutate({
        userId: selectedUser.id,
        subject: emailData.subject,
        message: emailData.message
      });
    }
  };

  const handleSubmitPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && newPassword.password) {
      if (newPassword.password !== newPassword.confirmPassword) {
        toast({
          title: "Şifreler eşleşmiyor",
          description: "Girdiğiniz şifreler birbirleriyle eşleşmiyor.",
          variant: "destructive",
        });
        return;
      }
      resetPasswordMutation.mutate({
        userId: selectedUser.id,
        password: newPassword.password
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        email: selectedUser.email,
        fullName: selectedUser.fullName,
        phoneNumber: selectedUser.phoneNumber,
      });
    }
  };

  const handleToggleStatus = (user: User) => {
    toggleUserStatusMutation.mutate({
      id: user.id,
      isActive: !user.isActive
    });
  };

  const handleChangeRole = (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    changeUserRoleMutation.mutate({
      id: user.id,
      role: newRole
    });
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.fullName && user.fullName.toLowerCase().includes(query))
    );
  });

  // Get user bookings count
  const getUserBookingsCount = (userId: number) => {
    return bookings.filter(booking => booking.userId === userId).length || 0;
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Hiç';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Kullanıcı Yönetimi - Admin Paneli | FerryBooking</title>
        <meta name="description" content="FerryBooking admin panelinde kullanıcı yönetimi" />
      </Helmet>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
          <Button onClick={() => setIsCreateUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <UsersIcon className="h-5 w-5 mr-2" />
              Sistem Kullanıcıları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Kullanıcı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tüm Kullanıcılar</TabsTrigger>
                <TabsTrigger value="admin">Yöneticiler</TabsTrigger>
                <TabsTrigger value="user">Normal Kullanıcılar</TabsTrigger>
                <TabsTrigger value="inactive">Pasif Kullanıcılar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <UserTable 
                  users={filteredUsers}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  onViewDetails={handleViewDetails}
                  onSendEmail={handleSendEmail}
                  onResetPassword={handleResetPassword}
                  onDeleteUser={handleDeleteUser}
                  getUserBookingsCount={getUserBookingsCount}
                  formatDate={formatDate}
                />
              </TabsContent>
              
              <TabsContent value="admin">
                <UserTable 
                  users={filteredUsers.filter(user => user.role === 'admin')}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  onViewDetails={handleViewDetails}
                  onSendEmail={handleSendEmail}
                  onResetPassword={handleResetPassword}
                  onDeleteUser={handleDeleteUser}
                  getUserBookingsCount={getUserBookingsCount}
                  formatDate={formatDate}
                />
              </TabsContent>
              
              <TabsContent value="user">
                <UserTable 
                  users={filteredUsers.filter(user => user.role === 'user')}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  onViewDetails={handleViewDetails}
                  onSendEmail={handleSendEmail}
                  onResetPassword={handleResetPassword}
                  onDeleteUser={handleDeleteUser}
                  getUserBookingsCount={getUserBookingsCount}
                  formatDate={formatDate}
                />
              </TabsContent>
              
              <TabsContent value="inactive">
                <UserTable 
                  users={filteredUsers.filter(user => !user.isActive)}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  onViewDetails={handleViewDetails}
                  onSendEmail={handleSendEmail}
                  onResetPassword={handleResetPassword}
                  onDeleteUser={handleDeleteUser}
                  getUserBookingsCount={getUserBookingsCount}
                  formatDate={formatDate}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
              <DialogDescription>
                Sistem içinde yeni bir kullanıcı hesabı oluşturun.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Kullanıcı Adı
                  </Label>
                  <Input
                    id="username"
                    placeholder="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    required
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    E-posta
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    required
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Şifre
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fullName" className="text-right">
                    Ad Soyad
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Ad Soyad"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phoneNumber" className="text-right">
                    Telefon
                  </Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+90 (___) ___ __ __"
                    value={newUser.phoneNumber}
                    onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Rol
                  </Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({...newUser, role: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Rol seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Kullanıcı</SelectItem>
                      <SelectItem value="admin">Yönetici</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Kullanıcı Düzenle</DialogTitle>
              <DialogDescription>
                Kullanıcı bilgilerini güncelleyin.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleUpdateUser}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-bold">Kullanıcı Adı</Label>
                    <div className="col-span-3">
                      <p>{selectedUser.username}</p>
                      <p className="text-sm text-muted-foreground">Kullanıcı adı değiştirilemez</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-right">
                      E-posta
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                      required
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-fullName" className="text-right">
                      Ad Soyad
                    </Label>
                    <Input
                      id="edit-fullName"
                      value={selectedUser.fullName || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, fullName: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-phoneNumber" className="text-right">
                      Telefon
                    </Label>
                    <Input
                      id="edit-phoneNumber"
                      value={selectedUser.phoneNumber || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, phoneNumber: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Rol</Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Badge className={selectedUser.role === 'admin' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                        {selectedUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                      </Badge>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => handleChangeRole(selectedUser)}
                      >
                        {selectedUser.role === 'admin' ? 'Kullanıcı Yap' : 'Yönetici Yap'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Durum</Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Badge className={selectedUser.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {selectedUser.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleStatus(selectedUser)}
                      >
                        {selectedUser.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* View User Details Dialog */}
        <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Kullanıcı Detayları</DialogTitle>
              <DialogDescription>
                Kullanıcı bilgilerini görüntüleyin.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4">
                <div className="flex items-center mb-6">
                  <Avatar className="h-16 w-16 mr-4">
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {getInitials(selectedUser.fullName || selectedUser.username)}
                    </AvatarFallback>
                    {selectedUser.profileImage && (
                      <AvatarImage src={selectedUser.profileImage} alt={selectedUser.username} />
                    )}
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.fullName}</h3>
                    <p className="text-muted-foreground">@{selectedUser.username}</p>
                    <div className="flex mt-2 space-x-2">
                      <Badge className={selectedUser.role === 'admin' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                        {selectedUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                      </Badge>
                      <Badge className={selectedUser.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {selectedUser.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">ID</h4>
                    <p>{selectedUser.id}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Kullanıcı Adı</h4>
                    <p>{selectedUser.username}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">E-posta</h4>
                    <p>{selectedUser.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Telefon</h4>
                    <p>{selectedUser.phoneNumber || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</h4>
                    <p>{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Son Giriş</h4>
                    <p>{formatDate(selectedUser.lastLoginAt)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">İşlemler</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsViewUserOpen(false);
                      handleEditUser(selectedUser);
                    }}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Düzenle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsViewUserOpen(false);
                      handleSendEmail(selectedUser);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      E-posta Gönder
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsViewUserOpen(false);
                      handleResetPassword(selectedUser);
                    }}>
                      <Lock className="h-4 w-4 mr-2" />
                      Şifre Sıfırla
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewUserOpen(false)}>
                Kapat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>E-posta Gönder</DialogTitle>
              <DialogDescription>
                {selectedUser && `${selectedUser.fullName || selectedUser.username} (${selectedUser.email}) adresine e-posta gönder.`}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleSubmitEmail}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email-subject" className="text-right">
                      Konu
                    </Label>
                    <Input
                      id="email-subject"
                      value={emailData.subject}
                      onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                      required
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="email-message" className="text-right pt-2">
                      Mesaj
                    </Label>
                    <Textarea
                      id="email-message"
                      value={emailData.message}
                      onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                      required
                      className="col-span-3 min-h-[200px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={sendEmailMutation.isPending}>
                    {sendEmailMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Gönder
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Şifre Sıfırla</DialogTitle>
              <DialogDescription>
                {selectedUser && `${selectedUser.fullName || selectedUser.username} için yeni bir şifre belirleyin.`}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleSubmitPasswordReset}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-password" className="text-right">
                      Yeni Şifre
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword.password}
                      onChange={(e) => setNewPassword({...newPassword, password: e.target.value})}
                      required
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirm-password" className="text-right">
                      Şifre Tekrar
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={newPassword.confirmPassword}
                      onChange={(e) => setNewPassword({...newPassword, confirmPassword: e.target.value})}
                      required
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={resetPasswordMutation.isPending}>
                    {resetPasswordMutation.isPending ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kullanıcı Silme Onayı</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser && `${selectedUser.fullName || selectedUser.username} kullanıcısını silmek istediğinizden emin misiniz?`}
                <div className="mt-2 text-red-500">
                  Bu işlem geri alınamaz! Kullanıcı tüm verileriyle birlikte silinecektir.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Evet, Kullanıcıyı Sil
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onChangeRole: (user: User) => void;
  onViewDetails: (user: User) => void;
  onSendEmail: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeleteUser: (user: User) => void;
  getUserBookingsCount: (userId: number) => number;
  formatDate: (date: string | null) => string;
}

function UserTable({ 
  users, 
  isLoading, 
  onEdit, 
  onToggleStatus, 
  onChangeRole,
  onViewDetails,
  onSendEmail,
  onResetPassword,
  onDeleteUser,
  getUserBookingsCount,
  formatDate
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Bu kriterlere uygun kullanıcı bulunamadı.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kullanıcı</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Rezervasyonlar</TableHead>
            <TableHead>Kayıt Tarihi</TableHead>
            <TableHead>Son Giriş</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="mr-2">
                    <AvatarFallback className="bg-primary text-white">
                      {getInitials(user.fullName || user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    {user.fullName && (
                      <div className="text-sm text-muted-foreground">{user.fullName}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.role === "admin" ? (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Yönetici
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    Kullanıcı
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    Pasif
                  </Badge>
                )}
              </TableCell>
              <TableCell>{getUserBookingsCount(user.id)}</TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
              <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">İşlemler</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(user)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Detayları Görüntüle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <UserCog className="h-4 w-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendEmail(user)}>
                        <Mail className="h-4 w-4 mr-2" />
                        E-posta Gönder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetPassword(user)}>
                        <Lock className="h-4 w-4 mr-2" />
                        Şifre Sıfırla
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onChangeRole(user)}>
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="h-4 w-4 mr-2 text-purple-600" />
                            Kullanıcı Yap
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-4 w-4 mr-2" />
                            Yönetici Yap
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                        {user.isActive ? (
                          <>
                            <UserX className="h-4 w-4 mr-2 text-red-600" />
                            Pasif Yap
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2 text-green-600" />
                            Aktif Yap
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteUser(user)} 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Kullanıcıyı Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
