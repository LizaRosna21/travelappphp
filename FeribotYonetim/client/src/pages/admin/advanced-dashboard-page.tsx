import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/admin-layout';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
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
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart as BarChartIcon,
  BellRing,
  BookOpen,
  Building,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Layers,
  LineChart as LineChartIcon,
  Loader2,
  Maximize,
  MenuIcon,
  MessageSquare,
  Package,
  PieChart as PieChartIcon,
  RefreshCcw,
  Search,
  Ship,
  ShoppingCart,
  Tag,
  Timer,
  Truck,
  User,
  Users,
  RotateCcw,
  Clock,
  Database,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// Ana dashboard bileşeni
const AdvancedDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("analytics");
  const [timeRange, setTimeRange] = useState("30");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Analitik veriler için sorgu
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['/api/admin/analytics/performance', timeRange],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/analytics/performance?period=${timeRange}`);
      return await res.json();
    }
  });

  // Raporlama verisi sorgusu
  const { data: reportsData, isLoading: isLoadingReports, refetch: refetchReports } = useQuery({
    queryKey: ['/api/admin/reports/summary', timeRange],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/admin/reports/summary?period=${timeRange}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching reports data:", error);
        return null;
      }
    }
  });

  // Bildirimler için sorgu
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['/api/admin/notifications'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/notifications');
        return await res.json();
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
    }
  });

  // Veri yenileme işlevi
  const refreshData = () => {
    setIsRefreshing(true);
    Promise.all([
      refetchAnalytics(),
      refetchReports(),
      refetchNotifications()
    ]).finally(() => {
      setTimeout(() => setIsRefreshing(false), 1000);
    });
  };

  // Veri değişikliği yüzdesini hesaplama yardımcı fonksiyonu
  const calculateChange = (current, previous) => {
    if (!previous) return { value: "0%", direction: "neutral" };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      direction: change > 0 ? "up" : change < 0 ? "down" : "neutral"
    };
  };

  // İstatistik kartı bileşeni
  const StatCard = ({ title, value, icon, trend, description, onClick, isLoading }) => {
    return (
      <Card className="relative overflow-hidden" onClick={onClick}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : null}
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="h-5 w-5 text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {trend.direction === "up" && <ArrowUp className="h-3 w-3 text-emerald-500 mr-1" />}
              {trend.direction === "down" && <ArrowDown className="h-3 w-3 text-rose-500 mr-1" />}
              <span className={
                trend.direction === "up" 
                  ? "text-emerald-500" 
                  : trend.direction === "down" 
                    ? "text-rose-500" 
                    : ""
              }>
                {trend.value}
              </span>
              <span className="ml-1">{description || "son 30 güne göre"}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Bildirim öğesi bileşeni
  const NotificationItem = ({ notification }) => {
    return (
      <div className="flex items-start space-x-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
        <div>
          {notification.type === 'booking' && <ShoppingCart className="h-5 w-5 text-blue-500" />}
          {notification.type === 'payment' && <CreditCard className="h-5 w-5 text-green-500" />}
          {notification.type === 'system' && <AlertCircle className="h-5 w-5 text-orange-500" />}
          {notification.type === 'user' && <User className="h-5 w-5 text-purple-500" />}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(notification.createdAt), 'dd MMM, HH:mm', { locale: tr })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{notification.content}</p>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Gelişmiş Gösterge Paneli">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Gelişmiş Dashboard</h2>
          <p className="text-muted-foreground">
            Detaylı sistem analizi, raporlar ve bildirimler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zaman Aralığı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Son 7 Gün</SelectItem>
              <SelectItem value="30">Son 30 Gün</SelectItem>
              <SelectItem value="90">Son 90 Gün</SelectItem>
              <SelectItem value="365">Son 1 Yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChartIcon className="h-4 w-4 mr-2" />
            <span>Analitik Veriler</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span>Raporlar</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <BellRing className="h-4 w-4 mr-2" />
            <span>Bildirimler</span>
            {notificationsData?.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {notificationsData.filter(n => !n.isRead).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Analitik Veriler Sekmesi */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Analitik Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Toplam Gelir"
              value={analyticsData?.totalRevenue || "₺0"}
              icon={<DollarSign className="h-5 w-5" />}
              trend={analyticsData?.trends.revenue}
              isLoading={isLoadingAnalytics}
            />
            <StatCard
              title="Rezervasyon Sayısı"
              value={analyticsData?.totalBookings || "0"}
              icon={<ShoppingCart className="h-5 w-5" />}
              trend={analyticsData?.trends.bookings}
              isLoading={isLoadingAnalytics}
            />
            <StatCard
              title="Ortalama Sepet Tutarı"
              value={analyticsData?.averageTicketValue || "₺0"}
              icon={<Tag className="h-5 w-5" />}
              trend={analyticsData?.trends.ticketValue}
              isLoading={isLoadingAnalytics}
            />
            <StatCard
              title="Dönüşüm Oranı"
              value={analyticsData?.conversionRate || "0%"}
              icon={<Activity className="h-5 w-5" />}
              trend={analyticsData?.trends.conversionRate}
              isLoading={isLoadingAnalytics}
            />
          </div>

          {/* Gelir Grafiği */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Gelir Analizi</CardTitle>
              <CardDescription>Aylık gelir ve rezervasyon dağılımı</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: 'Oca', gelir: 650000, rezervasyon: 580 },
                    { name: 'Şub', gelir: 730000, rezervasyon: 620 },
                    { name: 'Mar', gelir: 880000, rezervasyon: 700 },
                    { name: 'Nis', gelir: 950000, rezervasyon: 780 },
                    { name: 'May', gelir: 1150000, rezervasyon: 900 },
                    { name: 'Haz', gelir: 1350000, rezervasyon: 1100 },
                    { name: 'Tem', gelir: 1550000, rezervasyon: 1300 },
                    { name: 'Ağu', gelir: 1720000, rezervasyon: 1450 },
                    { name: 'Eyl', gelir: 1450000, rezervasyon: 1200 },
                    { name: 'Eki', gelir: 1250000, rezervasyon: 950 },
                    { name: 'Kas', gelir: 1150000, rezervasyon: 870 },
                    { name: 'Ara', gelir: 1050000, rezervasyon: 820 },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0369a1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0369a1" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorRezervasyon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" domain={[0, 'dataMax + 200000']} 
                    tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 200']} />
                  <RechartsTooltip 
                    formatter={(value, name) => {
                      if (name === 'gelir') return [`₺${value.toLocaleString('tr-TR')}`, 'Gelir'];
                      return [value, 'Rezervasyon'];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="gelir" 
                    stroke="#0369a1" 
                    fillOpacity={1} 
                    fill="url(#colorGelir)" 
                    yAxisId="left"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rezervasyon" 
                    stroke="#14b8a6" 
                    fillOpacity={1} 
                    fill="url(#colorRezervasyon)" 
                    yAxisId="right" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Alt Analitik Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Kategori Dağılımı */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Kategori Dağılımı</CardTitle>
                <CardDescription>Rezervasyon türlerine göre dağılım</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Feribot', value: 72 },
                        { name: 'Transfer', value: 15 },
                        { name: 'Paket Tur', value: 8 },
                        { name: 'Diğer', value: 5 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {
                        [
                          { name: 'Feribot', value: 72, color: '#0369a1' },
                          { name: 'Transfer', value: 15, color: '#14b8a6' },
                          { name: 'Paket Tur', value: 8, color: '#a855f7' },
                          { name: 'Diğer', value: 5, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Popüler Rotalar */}
            <Card>
              <CardHeader>
                <CardTitle>Popüler Rotalar</CardTitle>
                <CardDescription>En çok tercih edilen rotalar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.topRoutes?.slice(0, 5).map((route, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{route.route}</span>
                        <Badge
                          variant={route.growth > 0 ? "default" : "destructive"}
                          className="text-xs font-normal"
                        >
                          {route.growth > 0 ? "+" : ""}{route.growth}%
                        </Badge>
                      </div>
                      <Progress
                        value={i === 0 ? 100 : Math.round((route.bookings / analyticsData.topRoutes[0].bookings) * 100)}
                        className="h-2"
                        indicatorClassName={i === 0 ? "bg-primary" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-blue-400" : "bg-blue-300"}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{route.bookings} rezervasyon</span>
                        <span>{route.revenue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Satış Hunisi */}
            <Card>
              <CardHeader>
                <CardTitle>Satış Hunisi</CardTitle>
                <CardDescription>Dönüşüm hunisi analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Sayfa Ziyaretleri', value: 24850 },
                    { name: 'Arama Yapanlar', value: 10320 },
                    { name: 'Sepete Ekleyenler', value: 3450 },
                    { name: 'Ödeme Başlatanlar', value: 1820 },
                    { name: 'Tamamlanan Siparişler', value: 1240 },
                  ].map((step, index) => {
                    const percent = (step.value / 24850) * 100;
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{step.name}</span>
                          <span className="font-medium">
                            {step.value.toLocaleString('tr-TR')}
                            {index > 0 && 
                              <span className="text-muted-foreground text-xs ml-1">
                                ({percent.toFixed(1)}%)
                              </span>
                            }
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metriks Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ziyaretçi Metrikleri */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ziyaretçi Metrikleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Toplam Ziyaretçi</p>
                    <p className="text-lg font-semibold">24,850</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ortalama Süre</p>
                    <p className="text-lg font-semibold">4m 38s</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Hemen Çıkma Oranı</p>
                    <p className="text-lg font-semibold">34.5%</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <div className="text-xs font-medium mb-1">Trafik Kaynakları</div>
                  <div className="space-y-2">
                    {[
                      { name: 'Organik Arama', value: 38 },
                      { name: 'Direkt', value: 25 },
                      { name: 'Referans', value: 22 },
                      { name: 'Sosyal Medya', value: 15 },
                    ].map((source, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>{source.name}</span>
                          <span>{source.value}%</span>
                        </div>
                        <Progress value={source.value} className="h-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ödeme ve İadeler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ödeme ve İadeler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Başarılı Ödemeler</p>
                    <p className="text-lg font-semibold text-emerald-600">1,240</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Başarısız</p>
                    <p className="text-lg font-semibold text-rose-600">183</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">İadeler</p>
                    <p className="text-lg font-semibold text-amber-600">45</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <div className="text-xs font-medium mb-1">Ödeme Yöntemleri</div>
                  <div className="space-y-1">
                    {[
                      { name: 'Kredi Kartı', value: 65, icon: <CreditCard className="h-3 w-3" /> },
                      { name: 'Havale/EFT', value: 18, icon: <Building className="h-3 w-3" /> },
                      { name: 'Online Ödeme', value: 12, icon: <Globe className="h-3 w-3" /> },
                      { name: 'Diğer', value: 5, icon: <CircleDollarSign className="h-3 w-3" /> },
                    ].map((method, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        {method.icon}
                        <span className="text-xs">{method.name}</span>
                        <div className="flex-1">
                          <Progress value={method.value} className="h-1" />
                        </div>
                        <span className="text-xs font-medium">{method.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sistem Performansı */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sistem Performansı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Yanıt Süresi</p>
                    <p className="text-lg font-semibold">238ms</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">İşlem Süresi</p>
                    <p className="text-lg font-semibold">1.2s</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Hata Oranı</p>
                    <p className="text-lg font-semibold">0.14%</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <div className="text-xs font-medium mb-2">Sistem Durumu</div>
                  <div className="space-y-2">
                    {[
                      { name: 'API Erişimi', value: 99.98, status: 'normal' },
                      { name: 'Veritabanı', value: 99.95, status: 'normal' },
                      { name: 'Ödeme Sistemi', value: 99.90, status: 'normal' },
                      { name: 'WhatsApp API', value: 98.5, status: 'warning' },
                    ].map((service, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          {service.status === 'normal' ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : service.status === 'warning' ? (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-rose-500" />
                          )}
                          <span>{service.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={service.value} className="h-1 w-20" />
                          <span className="font-medium">{service.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Raporlar Sekmesi */}
        <TabsContent value="reports" className="space-y-4">
          {/* Rapor Filtreleri */}
          <Card>
            <CardHeader>
              <CardTitle>Rapor Filtreleri</CardTitle>
              <CardDescription>
                Rapor verilerini filtrelemek ve özelleştirmek için seçenekler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="ferry">Feribot</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="tour">Tur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Durum</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="confirmed">Onaylanmış</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="cancelled">İptal Edilmiş</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gruplandırma</label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue placeholder="Gruplandırma seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Günlük</SelectItem>
                      <SelectItem value="weekly">Haftalık</SelectItem>
                      <SelectItem value="monthly">Aylık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-2">
                <Button variant="outline" disabled={isRefreshing}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filtreleri Uygula
                </Button>
                <Button variant="outline" disabled={isRefreshing}>
                  <Download className="h-4 w-4 mr-2" />
                  Raporu İndir
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Raporlar İçeriği */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ana Rapor Tablosu */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Rezervasyon Raporu</CardTitle>
                <CardDescription>
                  Seçilen döneme ait rezervasyon verileri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Rezervasyon</TableHead>
                      <TableHead>Ciro</TableHead>
                      <TableHead>Onay Oranı</TableHead>
                      <TableHead>Ort. Değer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingReports ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.from({ length: 8 }).map((_, i) => {
                        const date = subDays(new Date(), i);
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              {format(date, 'dd MMM yyyy', { locale: tr })}
                            </TableCell>
                            <TableCell>{Math.floor(Math.random() * 50) + 30}</TableCell>
                            <TableCell>
                              {formatCurrency((Math.random() * 30000) + 15000)}
                            </TableCell>
                            <TableCell>
                              {`${(Math.random() * 20 + 80).toFixed(1)}%`}
                            </TableCell>
                            <TableCell>
                              {formatCurrency((Math.random() * 400) + 200)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant="outline" size="sm">
                  Tümünü Göster
                </Button>
              </CardFooter>
            </Card>

            {/* Özet Rapor Kartı */}
            <Card>
              <CardHeader>
                <CardTitle>Rapor Özeti</CardTitle>
                <CardDescription>
                  {`${format(subDays(new Date(), 30), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Rezervasyon Kanalları</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Web Sitesi', value: 62 },
                          { name: 'Mobil Uygulama', value: 28 },
                          { name: 'Çağrı Merkezi', value: 10 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { name: 'Web Sitesi', value: 62, color: '#0891b2' },
                          { name: 'Mobil Uygulama', value: 28, color: '#7c3aed' },
                          { name: 'Çağrı Merkezi', value: 10, color: '#f59e0b' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Özet</h4>
                  <div className="space-y-1">
                    {[
                      { label: 'Toplam Rezervasyon', value: '1,240' },
                      { label: 'Başarılı Ödemeler', value: '1,180' },
                      { label: 'İptal Oranı', value: '4.8%' },
                      { label: 'Ortalama Değer', value: formatCurrency(295) },
                      { label: 'En Yüksek Gün', value: 'Cumartesi (215)' }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Detaylı Rapor İndir
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Trend Grafikleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bölgesel Performans</CardTitle>
                <CardDescription>
                  Bölgelere göre rezervasyon dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'İstanbul', value: 380 },
                      { name: 'İzmir', value: 280 },
                      { name: 'Muğla', value: 250 },
                      { name: 'Antalya', value: 190 },
                      { name: 'Balıkesir', value: 140 },
                      { name: 'Diğer', value: 120 }
                    ]}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <RechartsTooltip formatter={(value) => [`${value} rezervasyon`, 'Rezervasyon']} />
                    <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Haftalık Trend</CardTitle>
                <CardDescription>
                  Haftalık rezervasyon ve gelir trendi
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { day: 'Pazartesi', rezervasyon: 32, gelir: 9500 },
                      { day: 'Salı', rezervasyon: 28, gelir: 8200 },
                      { day: 'Çarşamba', rezervasyon: 35, gelir: 10200 },
                      { day: 'Perşembe', rezervasyon: 42, gelir: 12500 },
                      { day: 'Cuma', rezervasyon: 58, gelir: 16800 },
                      { day: 'Cumartesi', rezervasyon: 68, gelir: 19500 },
                      { day: 'Pazar', rezervasyon: 45, gelir: 13200 }
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickFormatter={(value) => `₺${value/1000}k`}
                    />
                    <RechartsTooltip 
                      formatter={(value, name) => {
                        if (name === 'gelir') return [`₺${value.toLocaleString('tr-TR')}`, 'Gelir'];
                        return [value, 'Rezervasyon'];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rezervasyon" 
                      stroke="#7c3aed" 
                      strokeWidth={2}
                      yAxisId="left"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="gelir" 
                      stroke="#0891b2" 
                      strokeWidth={2}
                      yAxisId="right"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bildirimler Sekmesi */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Sistem Bildirimleri</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Bildirim ara..."
                    className="w-60 h-8"
                  />
                  <Select defaultValue="all">
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue placeholder="Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="unread">Okunmamış</SelectItem>
                      <SelectItem value="booking">Rezervasyon</SelectItem>
                      <SelectItem value="payment">Ödeme</SelectItem>
                      <SelectItem value="system">Sistem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {isLoadingNotifications ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : notificationsData?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BellRing className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">Bildirim Bulunmuyor</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Şu anda görüntülenecek bildirim bulunmuyor. Sistem bildirimleri burada görüntülenecektir.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    {notificationsData?.map((notification, i) => (
                      <NotificationItem key={i} notification={notification} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Yenile
              </Button>
              <Button variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                Tümünü Okundu İşaretle
              </Button>
            </CardFooter>
          </Card>
          
          {/* Bildirim Ayarları */}
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Ayarları</CardTitle>
              <CardDescription>
                Hangi bildirimleri alacağınızı ve görüntüleme tercihlerinizi özelleştirin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Bildirim Tercihleri</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Yeni Rezervasyonlar', description: 'Yeni rezervasyon oluşturulduğunda bildirim al', checked: true },
                      { name: 'Ödeme Bildirimleri', description: 'Başarılı veya başarısız ödemeler hakkında bildirim al', checked: true },
                      { name: 'İptal ve İadeler', description: 'Rezervasyon iptalleri ve iadeler hakkında bildirim al', checked: true },
                      { name: 'Sistem Uyarıları', description: 'Sistem durumu ve önemli uyarılar hakkında bildirim al', checked: false }
                    ].map((pref, i) => (
                      <div key={i} className="flex items-start space-x-2">
                        <Checkbox id={`pref-${i}`} defaultChecked={pref.checked} />
                        <div className="grid gap-1.5">
                          <label
                            htmlFor={`pref-${i}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {pref.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {pref.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Bildirim Kanalları</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Uygulama İçi Bildirimler', checked: true },
                      { name: 'E-posta Bildirimleri', checked: true },
                      { name: 'SMS Bildirimleri', checked: false },
                      { name: 'WhatsApp Bildirimleri', checked: true }
                    ].map((channel, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{channel.name}</span>
                        <Switch defaultChecked={channel.checked} />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4">
                    <h4 className="text-sm font-medium mb-2">Bildirim Saatleri</h4>
                    <Select defaultValue="always">
                      <SelectTrigger>
                        <SelectValue placeholder="Bildirim saatleri" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Her zaman</SelectItem>
                        <SelectItem value="working-hours">Çalışma saatleri (9:00 - 18:00)</SelectItem>
                        <SelectItem value="custom">Özel saat aralığı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">Ayarları Kaydet</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdvancedDashboardPage;

// Eksik UI bileşenleri için mocklar
const Switch = (props) => (
  <div 
    className={`h-5 w-10 rounded-full p-1 cursor-pointer transition-colors ${props.defaultChecked ? 'bg-primary' : 'bg-gray-200'}`}
  >
    <div 
      className={`h-3 w-3 rounded-full bg-white transform transition-transform ${props.defaultChecked ? 'translate-x-5' : ''}`} 
    />
  </div>
);

const Checkbox = (props) => (
  <div 
    className={`h-4 w-4 rounded border border-gray-300 flex items-center justify-center ${props.defaultChecked ? 'bg-primary border-primary' : 'bg-white'}`}
  >
    {props.defaultChecked && <Check className="h-3 w-3 text-white" />}
  </div>
);

const Globe = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);