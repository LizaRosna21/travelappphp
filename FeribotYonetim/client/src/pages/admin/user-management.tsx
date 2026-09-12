import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Shield, User, UserPlus, X, AlertCircle, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLayout } from "@/components/admin/layout";

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

export default function UserManagementPage() {
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await apiRequest('POST', '/api/admin/users', userData);
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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
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
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
          <Button onClick={() => setIsCreateUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sistem Kullanıcıları</CardTitle>
            <CardDescription>
              Sistem yöneticileri, acenteler ve müşterilerin yönetimi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tüm Kullanıcılar</TabsTrigger>
                <TabsTrigger value="admin">Yöneticiler</TabsTrigger>
                <TabsTrigger value="user">Normal Kullanıcılar</TabsTrigger>
                <TabsTrigger value="inactive">Pasif Kullanıcılar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <UserTable 
                  users={users}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  formatDate={formatDate}
                />
              </TabsContent>
              
              <TabsContent value="admin">
                <UserTable 
                  users={users.filter(user => user.role === 'admin')}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  formatDate={formatDate}
                />
              </TabsContent>
              
              <TabsContent value="user">
                <UserTable 
                  users={users.filter(user => user.role === 'user')}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
                  formatDate={formatDate}
                />
              </TabsContent>
              
              <TabsContent value="inactive">
                <UserTable 
                  users={users.filter(user => !user.isActive)}
                  isLoading={isLoading}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleStatus}
                  onChangeRole={handleChangeRole}
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
                      <Badge variant={selectedUser.role === 'admin' ? "default" : "outline"}>
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
                      <Switch 
                        checked={selectedUser.isActive}
                        onCheckedChange={() => handleToggleStatus(selectedUser)}
                      />
                      <span>{selectedUser.isActive ? 'Aktif' : 'Pasif'}</span>
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
  formatDate: (date: string | null) => string;
}

function UserTable({ users, isLoading, onEdit, onToggleStatus, onChangeRole, formatDate }: UserTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Bu kriterlere uygun kullanıcı bulunamadı.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableCaption>Toplam {users.length} kullanıcı</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Kullanıcı Adı</TableHead>
          <TableHead>E-posta</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Kayıt Tarihi</TableHead>
          <TableHead>Son Giriş</TableHead>
          <TableHead className="text-right">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.username}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant={user.role === 'admin' ? "default" : "outline"}>
                      {user.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                      {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Değiştirmek için tıklayın</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant={user.isActive ? "success" : "destructive"} 
                      className="cursor-pointer"
                      onClick={() => onToggleStatus(user)}
                    >
                      {user.isActive ? 
                        <><Check className="h-3 w-3 mr-1" /> Aktif</> : 
                        <><X className="h-3 w-3 mr-1" /> Pasif</>
                      }
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Değiştirmek için tıklayın</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell>{formatDate(user.createdAt)}</TableCell>
            <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onChangeRole(user)}>
                  {user.role === 'admin' ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onToggleStatus(user)}>
                  {user.isActive ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}