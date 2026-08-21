import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/layouts/admin-layout";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  CreditCard, 
  Users, 
  BookOpen,
  ArrowRight,
  Calendar,
  Ship,
  ShoppingCart,
  Settings,
  Bell,
  Globe,
  Database,
  BarChart2,
  MessageSquare,
  Key,
  PackageOpen
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const AdminDashboard = () => {
  // Navigation
  const [_, setLocation] = useLocation();
  
  // Fetch bookings for stats
  const { data: bookings } = useQuery({
    queryKey: ['/api/bookings'],
  });

  // Fetch routes for stats
  const { data: routes } = useQuery({
    queryKey: ['/api/routes'],
  });

  // Fetch users for stats
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Calculate stats
  const totalBookings = bookings?.length || 0;
  const totalRevenue = bookings?.reduce((acc, booking) => 
    acc + parseFloat(booking.totalPrice.toString()), 0) || 0;
  const totalUsers = users?.length || 0;
  const totalRoutes = routes?.length || 0;
  
  // Get confirmed bookings for revenue data
  const confirmedBookings = bookings?.filter(b => b.status === "confirmed") || [];

  // Generate monthly revenue data
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = Array(12).fill(0).map((_, i) => {
    const month = i + 1;
    const bookingsInMonth = confirmedBookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate.getFullYear() === currentYear && bookingDate.getMonth() + 1 === month;
    });
    
    const revenue = bookingsInMonth.reduce((acc, booking) => 
      acc + parseFloat(booking.totalPrice.toString()), 0);
    
    return {
      name: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
      revenue
    };
  });

  // Generate popular routes data
  const routeBookings = routes?.map(route => {
    const bookingsForRoute = bookings?.filter(b => b.routeId === route.id) || [];
    return {
      name: `${route.departurePort} to ${route.arrivalPort}`,
      bookings: bookingsForRoute.length,
      revenue: bookingsForRoute.reduce((acc, b) => acc + parseFloat(b.totalPrice.toString()), 0)
    };
  }).sort((a, b) => b.bookings - a.bookings).slice(0, 5) || [];

  // Generate booking status data for pie chart
  const bookingStatusData = [
    { name: 'Confirmed', value: bookings?.filter(b => b.status === "confirmed").length || 0 },
    { name: 'Pending', value: bookings?.filter(b => b.status === "pending").length || 0 },
    { name: 'Cancelled', value: bookings?.filter(b => b.status === "cancelled").length || 0 }
  ];

  const COLORS = ['#0088FE', '#FF8042', '#FF0000'];

  // Admin modules
  const adminModules = [
    { 
      title: "Rotalar", 
      description: "Rota yönetimi ve düzenleme", 
      icon: <Globe className="h-12 w-12 text-blue-600 mb-4" />,
      path: "/admin/routes"
    },
    { 
      title: "Limanlar", 
      description: "Limanları yönet", 
      icon: <Ship className="h-12 w-12 text-indigo-600 mb-4" />,
      path: "/admin/ports"
    },
    { 
      title: "Seferler", 
      description: "Sefer tarifelerini yönet", 
      icon: <Calendar className="h-12 w-12 text-purple-600 mb-4" />,
      path: "/admin/schedules"
    },
    { 
      title: "Rezervasyonlar", 
      description: "Rezervasyon işlemleri", 
      icon: <BookOpen className="h-12 w-12 text-cyan-600 mb-4" />,
      path: "/admin/bookings"
    },
    { 
      title: "Ödemeler", 
      description: "Ödeme işlemleri ve geçmişi", 
      icon: <CreditCard className="h-12 w-12 text-green-600 mb-4" />,
      path: "/admin/payments"
    },
    { 
      title: "Ürünler", 
      description: "Ürün yönetimi", 
      icon: <PackageOpen className="h-12 w-12 text-amber-600 mb-4" />,
      path: "/admin/products"
    },
    { 
      title: "Kullanıcılar", 
      description: "Kullanıcı yönetimi", 
      icon: <Users className="h-12 w-12 text-red-600 mb-4" />,
      path: "/admin/users"
    },
    { 
      title: "Pazarlama", 
      description: "Kampanya ve pazarlama", 
      icon: <Bell className="h-12 w-12 text-pink-600 mb-4" />,
      path: "/admin/marketing"
    },
    { 
      title: "WhatsApp", 
      description: "WhatsApp entegrasyonu", 
      icon: <MessageSquare className="h-12 w-12 text-emerald-600 mb-4" />,
      path: "/admin/whatsapp"
    },
    { 
      title: "API Yönetimi", 
      description: "API anahtarları ve ayarları", 
      icon: <Key className="h-12 w-12 text-yellow-600 mb-4" />,
      path: "/admin/api-management"
    },
    { 
      title: "Backoffice API", 
      description: "Backoffice entegrasyonu", 
      icon: <Database className="h-12 w-12 text-orange-600 mb-4" />,
      path: "/admin/backoffice-integration"
    },
    { 
      title: "Yedekleme", 
      description: "Yedekleme ve kurtarma", 
      icon: <Database className="h-12 w-12 text-teal-600 mb-4" />,
      path: "/admin/backup-management"
    },
    { 
      title: "Gelir Yönetimi", 
      description: "Gelir analizi ve yönetimi", 
      icon: <TrendingUp className="h-12 w-12 text-violet-600 mb-4" />,
      path: "/admin/revenue-management"
    },
    { 
      title: "Özel Rotalar", 
      description: "Özel rota yönetimi", 
      icon: <Ship className="h-12 w-12 text-sky-600 mb-4" />,
      path: "/admin/marsoldaki"
    },
    { 
      title: "Sistem Ayarları", 
      description: "Genel sistem ayarları", 
      icon: <Settings className="h-12 w-12 text-slate-600 mb-4" />,
      path: "/admin/settings"
    }
  ];

  return (
    <AdminLayout title="Gösterge Paneli">
      <Helmet>
        <title>Admin Dashboard - FerryBooking</title>
        <meta name="description" content="Admin dashboard for FerryBooking system" />
      </Helmet>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Toplam gelir</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rezervasyonlar</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">Toplam rezervasyon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kullanıcılar</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Kayıtlı kullanıcı</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rotalar</CardTitle>
            <Ship className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoutes}</div>
            <p className="text-xs text-muted-foreground">Aktif rota</p>
          </CardContent>
        </Card>
      </div>

      {/* System Modules */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sistem Modülleri</CardTitle>
          <CardDescription>Tüm sistem modüllerine buradan erişebilirsiniz</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {adminModules.map((module, index) => (
              <Card 
                key={index} 
                className="text-center p-4 transition-all hover:shadow-md cursor-pointer" 
                onClick={() => setLocation(module.path)}
              >
                <div className="flex flex-col items-center justify-center">
                  {module.icon}
                  <h3 className="font-semibold text-lg">{module.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Chart */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Gelir Özeti (Bu Yıl)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyRevenue}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `${formatCurrency(value)}`}
                  />
                  <RechartsTooltip 
                    formatter={(value) => [`${formatCurrency(value)}`, 'Gelir']}
                  />
                  <Bar dataKey="revenue" fill="#0c4b7d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Popüler Rotalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={routeBookings}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar dataKey="bookings" fill="#1a94ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Booking Status */}
        <Card>
          <CardHeader>
            <CardTitle>Rezervasyon Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Son Rezervasyonlar</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/bookings")}>Tümünü Gör</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-700 uppercase bg-neutral-50">
                <tr>
                  <th className="px-6 py-3">Referans</th>
                  <th className="px-6 py-3">Rota</th>
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Durum</th>
                  <th className="px-6 py-3">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {bookings?.slice(0, 5).map((booking) => {
                  const route = routes?.find(r => r.id === booking.routeId);
                  return (
                    <tr key={booking.id} className="bg-white border-b hover:bg-neutral-50">
                      <td className="px-6 py-4 font-medium">{booking.bookingReference}</td>
                      <td className="px-6 py-4">
                        {route ? (
                          <span>
                            {route.departurePort} <ArrowRight className="inline h-3 w-3 mx-1" /> {route.arrivalPort}
                          </span>
                        ) : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(booking.departureDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                          ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(parseFloat(booking.totalPrice.toString()))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
