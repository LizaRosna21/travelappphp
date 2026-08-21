import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import UnifiedAdminLayout from '@/components/admin/unified-admin-layout';

// Import icons
import { 
  BarChart, 
  ArrowDownRight, 
  ArrowRight, 
  ArrowUpRight, 
  CircleDollarSign, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Download, 
  Flag, 
  HelpCircle, 
  Info, 
  MoreHorizontal, 
  Package, 
  RefreshCcw, 
  Ship, 
  ShoppingCart, 
  Target, 
  Ticket, 
  TrendingUp, 
  UserPlus, 
  Users 
} from 'lucide-react';

// Date formatter utility
const formatDate = (dateString: string) => {
  const date = parseISO(dateString);
  return isValid(date) 
    ? format(date, 'd MMMM yyyy', { locale: tr }) 
    : 'Geçersiz tarih';
};

// Number formatter utility
const formatNumber = (num: number, style: 'decimal' | 'currency' | 'percent' = 'decimal', currency = 'TRY') => {
  if (num === undefined || num === null) return '-';
  
  return new Intl.NumberFormat('tr-TR', { 
    style, 
    currency,
    maximumFractionDigits: style === 'currency' ? 2 : 0
  }).format(num);
};

// Percentage change formatter with direction indication
const formatPercentChange = (current: number, previous: number) => {
  if (!previous) return { value: 0, direction: 'neutral' };
  
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  
  return {
    value: Math.abs(change).toFixed(1),
    direction
  };
};

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  change, 
  loading = false
}: { 
  title: string; 
  value: string; 
  description?: string; 
  icon: React.ElementType; 
  change?: { value: string, direction: 'up' | 'down' | 'neutral' };
  loading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-[100px]" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {change && (
          <div className="flex items-center pt-1">
            {change.direction === 'up' ? (
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
            ) : change.direction === 'down' ? (
              <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            ) : (
              <ArrowRight className="mr-1 h-4 w-4 text-gray-500" />
            )}
            <span className={`text-xs ${
              change.direction === 'up' 
                ? 'text-emerald-500' 
                : change.direction === 'down' 
                  ? 'text-red-500' 
                  : 'text-gray-500'
            }`}>
              {change.value}% 
              {change.direction === 'up' 
                ? 'artış' 
                : change.direction === 'down' 
                  ? 'azalış' 
                  : 'değişim yok'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Recent Bookings Component
const RecentBookings = ({ bookings, isLoading }: { bookings: any[]; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[160px]" />
            </div>
            <div className="ml-auto">
              <Skeleton className="h-4 w-[60px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Henüz rezervasyon bulunmuyor</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6">
        {bookings.map((booking, index) => (
          <div key={index} className="flex items-center">
            <Avatar className="h-9 w-9 mr-3">
              <AvatarImage src={`https://avatar.vercel.sh/${booking.userId}.png`} alt={booking.userName} />
              <AvatarFallback>{booking.userName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{booking.userName || "Misafir"}</p>
              <p className="text-sm text-muted-foreground">
                {booking.departurePort} → {booking.arrivalPort}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(booking.departureDate)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-medium">{formatNumber(parseFloat(booking.totalPrice), 'currency')}</p>
              <Badge variant={booking.status === "CONFIRMED" ? "outline" : booking.status === "CANCELLED" ? "destructive" : "secondary"} className="mt-1">
                {booking.status === "CONFIRMED" ? "Onaylandı" : 
                 booking.status === "CANCELLED" ? "İptal Edildi" : 
                 booking.status === "COMPLETED" ? "Tamamlandı" : 
                 booking.status === "PENDING" ? "Beklemede" : 
                 booking.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

// Popular Routes Component
const PopularRoutes = ({ routes, bookings, isLoading }: { routes: any[]; bookings: any[]; isLoading: boolean }) => {
  const getRoutePerformance = (routeId: number) => {
    if (!bookings || !bookings.length) return { count: 0, revenue: 0 };
    
    const routeBookings = bookings.filter(b => b.routeId === routeId);
    const count = routeBookings.length;
    const revenue = routeBookings.reduce((sum, booking) => sum + parseFloat(booking.totalPrice), 0);
    
    return { count, revenue };
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-[200px] mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }
  
  if (!routes || routes.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Henüz rota bulunmuyor</p>
      </div>
    );
  }
  
  // Calculate performance for all routes and sort by booking count
  const routesWithPerformance = routes.map(route => {
    const performance = getRoutePerformance(route.id);
    return { ...route, ...performance };
  }).sort((a, b) => b.count - a.count);
  
  // Get top routes
  const topRoutes = routesWithPerformance.slice(0, 5);
  
  // Calculate total bookings for percentage calculation
  const totalBookings = bookings ? bookings.length : 0;
  
  return (
    <div className="space-y-4">
      {topRoutes.map((route, index) => {
        const percentage = totalBookings ? (route.count / totalBookings) * 100 : 0;
        
        return (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-medium">{route.departurePort} → {route.arrivalPort}</p>
                <p className="text-xs text-muted-foreground">{route.count} rezervasyon</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatNumber(route.revenue, 'currency')}</p>
                <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% kullanım</p>
              </div>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        );
      })}
    </div>
  );
};

// Main Dashboard Component
const UnifiedDashboard = () => {
  const [dateFilter, setDateFilter] = useState('30days');
  
  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '14days':
        return { start: subDays(now, 14), end: now };
      case '30days':
      default:
        return { start: subDays(now, 30), end: now };
      case '90days':
        return { start: subDays(now, 90), end: now };
    }
  };
  
  // Fetch data from API
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
  });
  
  const { data: routes, isLoading: isLoadingRoutes } = useQuery({
    queryKey: ['/api/routes'],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
  });
  
  // Calculate statistics
  const calculateStats = () => {
    if (!bookings || !routes || !users) {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        newUsers: 0,
        activeRoutes: 0,
        avgBookingValue: 0,
        conversionRate: 74.2, // Sample conversion rate
        previousStats: {
          totalBookings: 0,
          totalRevenue: 0,
          newUsers: 0,
          activeRoutes: 0
        }
      };
    }
    
    // Current period stats
    const { start } = getDateRange();
    const currentPeriodBookings = Array.isArray(bookings) 
      ? bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt || booking.departureDate);
          return bookingDate >= start;
        })
      : [];
    
    const currentTotalRevenue = currentPeriodBookings.reduce(
      (sum, booking) => sum + parseFloat(booking.totalPrice || '0'), 
      0
    );
    
    // New users in period
    const newUsersCount = Array.isArray(users)
      ? users.filter(user => {
          const createdAt = new Date(user.createdAt);
          return createdAt >= start;
        }).length
      : 0;
    
    // Active routes
    const activeRoutesCount = Array.isArray(routes)
      ? routes.filter(route => route.isActive).length
      : 0;
    
    // Average booking value
    const avgBookingValue = currentPeriodBookings.length 
      ? currentTotalRevenue / currentPeriodBookings.length 
      : 0;
    
    // Previous period stats (simplified for now)
    // In a real app, you would fetch historical data or calculate properly
    const previousTotalBookings = Math.round(currentPeriodBookings.length * 0.85);
    const previousTotalRevenue = currentTotalRevenue * 0.8;
    const previousNewUsers = Math.round(newUsersCount * 0.7);
    const previousActiveRoutes = Math.round(activeRoutesCount * 0.9);
    
    return {
      totalBookings: currentPeriodBookings.length,
      totalRevenue: currentTotalRevenue,
      newUsers: newUsersCount,
      activeRoutes: activeRoutesCount,
      avgBookingValue,
      conversionRate: 74.2, // Sample conversion rate
      previousStats: {
        totalBookings: previousTotalBookings,
        totalRevenue: previousTotalRevenue,
        newUsers: previousNewUsers,
        activeRoutes: previousActiveRoutes
      }
    };
  };
  
  const stats = calculateStats();
  
  // Calculate percentage changes
  const bookingChange = formatPercentChange(stats.totalBookings, stats.previousStats.totalBookings);
  const revenueChange = formatPercentChange(stats.totalRevenue, stats.previousStats.totalRevenue);
  const usersChange = formatPercentChange(stats.newUsers, stats.previousStats.newUsers);
  const routesChange = formatPercentChange(stats.activeRoutes, stats.previousStats.activeRoutes);
  
  const isLoading = isLoadingBookings || isLoadingRoutes || isLoadingUsers;
  
  return (
    <UnifiedAdminLayout pageTitle="Gösterge Paneli">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {dateFilter === '7days' && 'Son 7 gün'}
                {dateFilter === '14days' && 'Son 14 gün'}
                {dateFilter === '30days' && 'Son 30 gün'}
                {dateFilter === '90days' && 'Son 90 gün'}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDateFilter('7days')}>
                Son 7 gün
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('14days')}>
                Son 14 gün
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('30days')}>
                Son 30 gün
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('90days')}>
                Son 90 gün
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Rapor İndir
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard 
              title="Toplam Rezervasyon" 
              value={formatNumber(stats.totalBookings)}
              icon={Ticket}
              change={bookingChange}
              loading={isLoading}
            />
            <StatsCard 
              title="Toplam Gelir" 
              value={formatNumber(stats.totalRevenue, 'currency')}
              icon={CircleDollarSign}
              change={revenueChange}
              loading={isLoading}
            />
            <StatsCard 
              title="Yeni Kullanıcılar" 
              value={formatNumber(stats.newUsers)}
              icon={UserPlus}
              change={usersChange}
              loading={isLoading}
            />
            <StatsCard 
              title="Aktif Rotalar" 
              value={formatNumber(stats.activeRoutes)}
              icon={Ship}
              change={routesChange}
              loading={isLoading}
            />
          </div>
          
          {/* More Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Ortalama Sepet Tutarı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-[100px]" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatNumber(stats.avgBookingValue, 'currency')}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Rezervasyon başına ortalama tutar
                </p>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Dönüşüm Oranı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionRate.toFixed(1)}%
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">2.1%</span>
                  <span className="ml-1">önceki döneme göre</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Ziyaretçilerin rezervasyona dönüşüm oranı
                </p>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Site Performansı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94/100</div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">3 puan</span>
                  <span className="ml-1">önceki döneme göre</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Sayfa yüklenme hızı ve performans puanı
                </p>
              </CardFooter>
            </Card>
          </div>
          
          {/* Recent Activity and Popular Routes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Son Rezervasyonlar</CardTitle>
                <CardDescription>Son rezervasyon işlemleri</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentBookings 
                  bookings={Array.isArray(bookings) ? bookings.slice(0, 10) : []}
                  isLoading={isLoadingBookings}
                />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Tüm Rezervasyonları Görüntüle
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Popüler Rotalar</CardTitle>
                <CardDescription>En çok tercih edilen rotalar</CardDescription>
              </CardHeader>
              <CardContent>
                <PopularRoutes 
                  routes={Array.isArray(routes) ? routes : []} 
                  bookings={Array.isArray(bookings) ? bookings : []}
                  isLoading={isLoadingRoutes || isLoadingBookings}
                />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Tüm Rotaları Görüntüle
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analitik Veriler</CardTitle>
              <CardDescription>Bu sekme yapım aşamasında</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Detaylı analitik veriler burada görüntülenecek.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Raporlar</CardTitle>
              <CardDescription>Bu sekme yapım aşamasında</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Sistem raporları ve özel raporlar burada görüntülenecek.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bildirimler</CardTitle>
              <CardDescription>Bu sekme yapım aşamasında</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Sistem bildirimleri ve hatırlatıcılar burada görüntülenecek.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </UnifiedAdminLayout>
  );
};

// ChevronDownIcon component
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default UnifiedDashboard;