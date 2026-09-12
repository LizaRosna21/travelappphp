import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { formatCurrency } from '@/lib/utils';
import ModernAdminLayout from '@/components/admin/modern-admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend 
} from 'recharts';

import { 
  ArrowRight,
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3, 
  Users, 
  Ship, 
  Ticket,
  CreditCard,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  X as XIcon,
  Clock3,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
  Star,
  Anchor,
  BookOpen,
  PackageOpen,
  MessageSquare,
  BellRing,
  MapPin,
  List,
  CalendarClock,
  Globe,
  CircleDollarSign
} from 'lucide-react';

// Renkler
const COLORS = {
  primary: '#0c4b7d',
  secondary: '#18b6f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  confirmed: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  pink: '#ec4899',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  cyan: '#06b6d4',
};

const STATUS_COLORS = {
  confirmed: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-500' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-500' },
  refunded: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-500' },
};

// Ana sayfa grafikleri için veri formatı ayarları
const formatChartValue = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-md shadow-md">
        <p className="text-sm text-gray-600">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={`tooltip-${index}`}
            className="text-sm font-medium"
            style={{ color: entry.color }}
          >
            {entry.name}: {valuePrefix}{entry.value}{valueSuffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ModernDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // API'den verileri çek
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
  });
  
  const { data: routes, isLoading: isLoadingRoutes } = useQuery({
    queryKey: ['/api/routes'],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
  });
  
  const { data: ports, isLoading: isLoadingPorts } = useQuery({
    queryKey: ['/api/ports'],
  });

  // İstatistikleri hesapla
  const totalBookings = bookings?.length || 0;
  const totalRevenue = bookings?.reduce((acc, booking) => 
    acc + parseFloat(booking.totalPrice.toString()), 0) || 0;
  const totalUsers = users?.length || 0;
  const totalRoutes = routes?.length || 0;
  
  // Son 7 gün içinde oluşturulan rezervasyonlar
  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();
  
  const bookingsLast7Days = last7Days.map(date => {
    if (!bookings) return { date, count: 0, revenue: 0 };
    
    const bookingsOnDate = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt).toISOString().split('T')[0];
      return bookingDate === date;
    });
    
    const count = bookingsOnDate.length;
    const revenue = bookingsOnDate.reduce((acc, b) => acc + parseFloat(b.totalPrice.toString()), 0);
    
    return {
      date: new Date(date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
      count,
      revenue
    };
  });

  // Aylık gelir verileri
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = Array(12).fill(0).map((_, i) => {
    const month = i + 1;
    
    const bookingsInMonth = (bookings || []).filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate.getFullYear() === currentYear && bookingDate.getMonth() + 1 === month;
    });
    
    const revenue = bookingsInMonth.reduce((acc, booking) => 
      acc + parseFloat(booking.totalPrice.toString()), 0);
    
    return {
      name: new Date(currentYear, i).toLocaleString('tr-TR', { month: 'short' }),
      revenue
    };
  });

  // Popüler rotalar
  const popularRoutes = routes?.map(route => {
    const bookingsForRoute = bookings?.filter(b => b.routeId === route.id) || [];
    
    return {
      name: `${route.departurePort} - ${route.arrivalPort}`,
      bookings: bookingsForRoute.length,
      revenue: bookingsForRoute.reduce((acc, b) => acc + parseFloat(b.totalPrice.toString()), 0)
    };
  }).sort((a, b) => b.bookings - a.bookings).slice(0, 5) || [];

  // Rezervasyon durumlarına göre dağılım
  const bookingStatusData = [
    { name: 'Onaylanmış', value: bookings?.filter(b => b.status === "confirmed").length || 0 },
    { name: 'Beklemede', value: bookings?.filter(b => b.status === "pending").length || 0 },
    { name: 'İptal', value: bookings?.filter(b => b.status === "cancelled").length || 0 }
  ];
  
  // Bugünkü ve önceki haftanın ciroları
  const bookingsTrend = {
    previousWeek: bookings?.filter(b => {
      const date = new Date(b.createdAt);
      const now = new Date();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(now.getDate() - 14);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    }).reduce((acc, b) => acc + parseFloat(b.totalPrice.toString()), 0) || 0,
    
    currentWeek: bookings?.filter(b => {
      const date = new Date(b.createdAt);
      const now = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo;
    }).reduce((acc, b) => acc + parseFloat(b.totalPrice.toString()), 0) || 0
  };
  
  const percentChange = (() => {
    if (bookingsTrend.previousWeek === 0) return 100;
    return ((bookingsTrend.currentWeek - bookingsTrend.previousWeek) / bookingsTrend.previousWeek) * 100;
  })();

  // Kullanıcıların giriş yaptığı cihaz türleri
  const deviceData = [
    { name: 'Mobil', value: 65 },
    { name: 'Masaüstü', value: 30 },
    { name: 'Tablet', value: 5 }
  ];
  
  // Hızlı erişim modülleri
  const quickAccessModules = [
    { 
      title: "Rezervasyonlar", 
      description: "Tüm rezervasyonları yönet", 
      icon: <Ticket className="h-8 w-8 mb-2 text-cyan-600" />,
      path: "/admin/bookings",
      count: totalBookings
    },
    { 
      title: "Rotalar", 
      description: "Feribot rotaları yönet", 
      icon: <Ship className="h-8 w-8 mb-2 text-blue-600" />,
      path: "/admin/routes",
      count: totalRoutes
    },
    { 
      title: "Limanlar", 
      description: "Limanları yapılandır", 
      icon: <Anchor className="h-8 w-8 mb-2 text-indigo-600" />,
      path: "/admin/ports",
      count: ports?.length || 0
    },
    { 
      title: "Tarifeler", 
      description: "Sefer programı ve fiyatlar", 
      icon: <Calendar className="h-8 w-8 mb-2 text-purple-600" />,
      path: "/admin/schedules"
    },
    { 
      title: "Kullanıcılar", 
      description: "Üyeleri ve profilleri yönet", 
      icon: <Users className="h-8 w-8 mb-2 text-red-600" />,
      path: "/admin/users",
      count: totalUsers
    },
    { 
      title: "Ödemeler", 
      description: "Tüm ödeme hareketleri", 
      icon: <CreditCard className="h-8 w-8 mb-2 text-green-600" />,
      path: "/admin/payments"
    },
    { 
      title: "Ürünler", 
      description: "Ürün kataloğu ve hizmetler", 
      icon: <PackageOpen className="h-8 w-8 mb-2 text-amber-600" />,
      path: "/admin/products"
    },
    { 
      title: "Pazarlama", 
      description: "Kampanyalar ve promosyonlar", 
      icon: <BellRing className="h-8 w-8 mb-2 text-pink-600" />,
      path: "/admin/marketing"
    }
  ];
  
  const recentBookings = bookings?.slice(0, 6) || [];
  
  return (
    <ModernAdminLayout pageTitle="Gösterge Paneli">
      <Helmet>
        <title>Gösterge Paneli | Ferry Yönetim Sistemi</title>
      </Helmet>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="sales">Satışlar</TabsTrigger>
            <TabsTrigger value="performance">Performans</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Rapor Oluştur
            </Button>
            <Button size="sm">
              Gelişmiş Dashboard
            </Button>
          </div>
        </div>
        
        <TabsContent value="overview" className="mt-6">
          {/* KPI Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Gelir
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                  {percentChange >= 0 ? (
                    <>
                      <span className="flex items-center text-emerald-500">
                        <ArrowUpRight className="mr-1 h-4 w-4" />
                        {percentChange.toFixed(1)}%
                      </span>
                      <span>Önceki haftaya göre</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center text-red-500">
                        <ArrowDownRight className="mr-1 h-4 w-4" />
                        {Math.abs(percentChange).toFixed(1)}%
                      </span>
                      <span>Önceki haftaya göre</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Rezervasyonlar
                </CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalBookings)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Son 24 saatte +{formatNumber(
                    bookings?.filter(b => 
                      new Date(b.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                    ).length || 0
                  )} yeni rezervasyon
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Üyeler
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalUsers)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Son 7 günde +{formatNumber(
                    users?.filter(u => 
                      new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length || 0
                  )} yeni üye
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Aktif Rotalar
                </CardTitle>
                <Ship className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalRoutes)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatNumber(ports?.length || 0)} limandan kalkış
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Charts Section */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
            {/* Revenue Trend Chart - Takes 4 columns */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Gelir Trendi</CardTitle>
                <CardDescription>
                  Son 12 aydaki gelir değişimine genel bakış
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyRevenue}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatChartValue(value)}
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: '12px' }}
                      />
                      <RechartsTooltip content={<CustomTooltip valuePrefix="₺" />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Gelir"
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Booking Status Distribution - Takes 3 columns */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Rezervasyon Durumları</CardTitle>
                <CardDescription>
                  Mevcut rezervasyonların durum dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {bookingStatusData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              index === 0 ? COLORS.success : 
                              index === 1 ? COLORS.warning : 
                              COLORS.danger
                            } 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [formatNumber(value), name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Bookings and Popular Routes */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            {/* Recent Bookings */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle>Son Rezervasyonlar</CardTitle>
                  <CardDescription>En son alınan 6 rezervasyon</CardDescription>
                </div>
                
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin/bookings">
                    Tümünü Gör
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {recentBookings.map((booking) => {
                      const route = routes?.find(r => r.id === booking.routeId);
                      const statusColors = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || 
                                          STATUS_COLORS.pending;
                      
                      return (
                        <div key={booking.id} className="flex items-center border p-3 rounded-lg">
                          <div className="mr-4">
                            <div className={`${statusColors.badge} h-12 w-12 rounded-full flex items-center justify-center text-white`}>
                              {booking.status === 'confirmed' ? (
                                <Check className="h-6 w-6" />
                              ) : booking.status === 'cancelled' ? (
                                <XIcon className="h-6 w-6" />
                              ) : (
                                <Clock3 className="h-6 w-6" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-medium">{booking.bookingReference}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Ship className="h-3 w-3 mr-1" />
                              {route ? `${route.departurePort} → ${route.arrivalPort}` : 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center mt-1">
                              <CalendarClock className="h-3 w-3 mr-1" />
                              {new Date(booking.departureDate).toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(parseFloat(booking.totalPrice.toString()))}
                            </div>
                            <span className={`text-xs ${statusColors.bg} ${statusColors.text} px-2 py-1 rounded-full inline-block mt-1`}>
                              {booking.status === 'confirmed' ? 'Onaylandı' : 
                               booking.status === 'cancelled' ? 'İptal' : 'Beklemede'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Popular Routes */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle>Popüler Rotalar</CardTitle>
                  <CardDescription>En çok rezerve edilen rotalar</CardDescription>
                </div>
                
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin/routes">
                    Tüm Rotaları Gör
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      layout="vertical"
                      data={popularRoutes}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => formatNumber(value)} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={150} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => [formatNumber(value), name === 'bookings' ? 'Rezervasyon' : 'Gelir']} 
                      />
                      <Bar 
                        dataKey="bookings" 
                        name="Rezervasyon" 
                        fill={COLORS.primary} 
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4">
                  <Button size="sm" className="w-full">
                    Raporları İncele
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quick Access Modules */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Hızlı Erişim</CardTitle>
              <CardDescription>
                Sık kullanılan modüllere hızlı erişim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {quickAccessModules.map((module, index) => (
                  <a
                    key={index}
                    href={module.path}
                    className="flex flex-col items-center justify-center text-center p-4 rounded-xl hover:bg-accent transition-colors border border-border"
                  >
                    {module.icon}
                    <h3 className="font-medium text-sm">{module.title}</h3>
                    {module.count !== undefined && (
                      <Badge variant="secondary" className="mt-2">
                        {formatNumber(module.count)}
                      </Badge>
                    )}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sales" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Satış İstatistikleri</CardTitle>
              <CardDescription>Bu sekme yapım aşamasında</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Satış istatistikleri ve analitik veriler burada görüntülenecek.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sistem Performansı</CardTitle>
              <CardDescription>Bu sekme yapım aşamasında</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Sistem performans metrikleri ve sunucu durumu burada görüntülenecek.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ModernAdminLayout>
  );
};

export default ModernDashboard;