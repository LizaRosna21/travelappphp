import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  DownloadCloud,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Ship,
  Tag,
  Ticket,
  TrendingUp,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface SystemMetricProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface RouteAnalysis {
  id: number;
  name: string;
  bookings: number;
  revenue: string;
  utilization: number;
  trend: 'up' | 'down' | 'neutral';
}

interface RecentBooking {
  id: number;
  reference: string;
  customerName: string;
  route: string;
  date: string;
  price: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const SystemMetricCard = ({ title, value, change, trend, icon }: SystemMetricProps) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingUp className="h-4 w-4 rotate-180" />;
    return <div className="h-4 w-4"></div>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            {change} from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default function AdvancedDashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard summary data
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['/api/admin/dashboard/summary', dateRange],
    queryFn: async () => {
      // This would be an actual API call in production
      // For now, we'll simulate the data
      return {
        totalBookings: 843,
        totalRevenue: '€124,568.00',
        activeRoutes: 32,
        customerCount: 712,
        bookingChange: '+12.5%',
        revenueChange: '+8.7%',
        routeChange: '+3.2%',
        customerChange: '+15.1%',
        recentBookings: [
          { id: 1, reference: 'FBT-12485', customerName: 'John Smith', route: 'Bodrum - Kos', date: '2023-08-05', price: '€78.00', status: 'completed' },
          { id: 2, reference: 'FBT-12486', customerName: 'Maria Garcia', route: 'Cesme - Chios', date: '2023-08-05', price: '€65.50', status: 'completed' },
          { id: 3, reference: 'FBT-12487', customerName: 'Alexei Petrov', route: 'Ayvalik - Lesvos', date: '2023-08-06', price: '€92.00', status: 'pending' },
          { id: 4, reference: 'FBT-12488', customerName: 'Emma Wilson', route: 'Bodrum - Kos', date: '2023-08-06', price: '€78.00', status: 'completed' },
          { id: 5, reference: 'FBT-12489', customerName: 'Sophie Dubois', route: 'Cesme - Chios', date: '2023-08-07', price: '€65.50', status: 'cancelled' },
        ] as RecentBooking[],
        topRoutes: [
          { id: 1, name: 'Bodrum - Kos', bookings: 324, revenue: '€25,272.00', utilization: 85, trend: 'up' },
          { id: 2, name: 'Cesme - Chios', bookings: 278, revenue: '€18,212.00', utilization: 78, trend: 'up' },
          { id: 3, name: 'Ayvalik - Lesvos', bookings: 156, revenue: '€14,352.00', utilization: 65, trend: 'down' },
          { id: 4, name: 'Marmaris - Rhodes', bookings: 85, revenue: '€7,310.00', utilization: 52, trend: 'neutral' },
        ] as RouteAnalysis[],
      };
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchDashboard();
    setTimeout(() => setIsRefreshing(false), 1000); // Add a small delay for better UX
  };

  if (isDashboardLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gelişmiş Yönetim Paneli</h1>
          <p className="text-muted-foreground">
            Detaylı istatistikler, trendler ve sistem analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tarih Aralığı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Son 7 gün</SelectItem>
              <SelectItem value="30d">Son 30 gün</SelectItem>
              <SelectItem value="90d">Son 90 gün</SelectItem>
              <SelectItem value="1y">Bu yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SystemMetricCard
          title="Toplam Rezervasyon"
          value={dashboardData?.totalBookings || 0}
          change={dashboardData?.bookingChange}
          trend="up"
          icon={<Ticket className="h-4 w-4" />}
        />
        <SystemMetricCard
          title="Toplam Gelir"
          value={dashboardData?.totalRevenue || '€0.00'}
          change={dashboardData?.revenueChange}
          trend="up"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <SystemMetricCard
          title="Aktif Rotalar"
          value={dashboardData?.activeRoutes || 0}
          change={dashboardData?.routeChange}
          trend="up"
          icon={<Ship className="h-4 w-4" />}
        />
        <SystemMetricCard
          title="Müşteri Sayısı"
          value={dashboardData?.customerCount || 0}
          change={dashboardData?.customerChange}
          trend="up"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="analysis">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="analysis">Rota Analizi</TabsTrigger>
          <TabsTrigger value="bookings">Son Rezervasyonlar</TabsTrigger>
          <TabsTrigger value="system">Sistem Durumu</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analysis" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Rota Performans Analizi</CardTitle>
              <CardDescription>
                Rotaların doluluk oranları, gelir ve rezervasyon verileri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead className="text-right">Rezervasyonlar</TableHead>
                    <TableHead className="text-right">Gelir</TableHead>
                    <TableHead className="text-right">Doluluk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.topRoutes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell className="text-right">{route.bookings}</TableCell>
                      <TableCell className="text-right">{route.revenue}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2">
                          <Progress value={route.utilization} className="h-2" />
                          <span className="text-sm w-8">{route.utilization}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                <DownloadCloud className="mr-2 h-4 w-4" />
                Raporu İndir
              </Button>
              <Button variant="outline">
                <BarChart className="mr-2 h-4 w-4" />
                Detaylı Analiz
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Son Rezervasyonlar</CardTitle>
              <CardDescription>
                En son yapılan rezervasyonlar ve durumları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referans</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.reference}</TableCell>
                      <TableCell>{booking.customerName}</TableCell>
                      <TableCell>{booking.route}</TableCell>
                      <TableCell>{booking.date}</TableCell>
                      <TableCell className="text-right">{booking.price}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                          ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {booking.status === 'completed' && 'Tamamlandı'}
                          {booking.status === 'pending' && 'Beklemede'}
                          {booking.status === 'cancelled' && 'İptal Edildi'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="ml-auto">
                <FileText className="mr-2 h-4 w-4" />
                Tüm Rezervasyonları Görüntüle
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sistem Durumu</CardTitle>
                <CardDescription>
                  Güncel sistem durumu ve kaynaklar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Kullanımı</span>
                    <span className="text-sm text-muted-foreground">24%</span>
                  </div>
                  <Progress value={24} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bellek Kullanımı</span>
                    <span className="text-sm text-muted-foreground">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Depolama Alanı</span>
                    <span className="text-sm text-muted-foreground">42%</span>
                  </div>
                  <Progress value={42} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Veritabanı Bağlantıları</span>
                    <span className="text-sm text-muted-foreground">18/50</span>
                  </div>
                  <Progress value={36} className="h-2" />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <Layers className="mr-2 h-4 w-4" />
                  Sistem Monitörünü Aç
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bakım Durumu</CardTitle>
                <CardDescription>
                  Sistem bakım ve yedekleme durumu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Son Yedekleme</p>
                      <p className="text-xs text-muted-foreground">Bugün, 04:30</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <DownloadCloud className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Sistem Versiyonu</p>
                      <p className="text-xs text-muted-foreground">v2.4.1 (Güncel)</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Ödeme API Durumu</p>
                      <p className="text-xs text-muted-foreground">Aktif (3/3 Sağlayıcı)</p>
                    </div>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                </div>
                
                <Alert>
                  <AlertTitle className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Planlı Bakım
                  </AlertTitle>
                  <AlertDescription>
                    10 Ağustos, 02:00 - 04:00 arasında planlı sistem bakımı yapılacaktır.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Tüm Bakım Kayıtlarını Göster
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}