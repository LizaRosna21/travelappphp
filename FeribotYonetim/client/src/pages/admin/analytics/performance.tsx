import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Calendar, 
  LineChart, 
  BarChart, 
  ArrowUp, 
  ArrowDown, 
  Activity, 
  Users, 
  ShoppingCart, 
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target
} from "lucide-react";
import UnifiedAdminLayout from "@/components/admin/unified-admin-layout";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Stats card component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, description }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend.direction === "up" && <ArrowUp className="h-3 w-3 text-emerald-500 mr-1" />}
            {trend.direction === "down" && <ArrowDown className="h-3 w-3 text-rose-500 mr-1" />}
            <span className={trend.direction === "up" ? "text-emerald-500" : trend.direction === "down" ? "text-rose-500" : ""}>
              {trend.value}
            </span>
            <span className="ml-1">{description || "since last month"}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Revenue chart component
const RevenueChart = () => {
  // Sample data for the chart
  const chartData = {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    revenue: [12500, 15000, 18000, 14000, 21000, 19000, 23000, 27000, 25000, 30000, 32000, 35000],
    bookings: [125, 150, 180, 140, 210, 190, 230, 270, 250, 300, 320, 350]
  };

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Gelir Analizi</CardTitle>
        <CardDescription>Aylık gelir ve rezervasyon sayısı</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          {/* For simplicity, using a simple bar representation instead of an actual chart library */}
          <div className="flex h-[250px] items-end gap-2">
            {chartData.months.map((month, index) => (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-primary/80 hover:bg-primary transition-colors"
                  style={{ height: `${chartData.revenue[index] / 350}px` }}
                ></div>
                <span className="text-xs mt-2">{month}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Top routes component
const TopRoutesCard = () => {
  // Sample data for top routes
  const topRoutes = [
    { route: "İstanbul - Bodrum", bookings: 450, revenue: "₺135,000", growth: 12.5 },
    { route: "İstanbul - İzmir", bookings: 380, revenue: "₺114,000", growth: 8.3 },
    { route: "Çeşme - Sakız", bookings: 310, revenue: "₺93,000", growth: 15.2 },
    { route: "Bodrum - Kos", bookings: 270, revenue: "₺81,000", growth: 5.1 },
    { route: "Ayvalık - Midilli", bookings: 220, revenue: "₺66,000", growth: -2.3 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>En Çok Satan Rotalar</CardTitle>
        <CardDescription>Son 30 gündeki en popüler rotalar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topRoutes.map((route) => (
            <div key={route.route} className="flex items-center">
              <div className="w-1/2">
                <p className="text-sm font-medium">{route.route}</p>
                <p className="text-xs text-muted-foreground">{route.bookings} rezervasyon</p>
              </div>
              <div className="w-1/3">
                <p className="text-sm font-medium">{route.revenue}</p>
              </div>
              <div className="w-1/6 flex justify-end">
                <Badge variant={route.growth > 0 ? "default" : "destructive"} className="text-xs">
                  {route.growth > 0 ? "+" : ""}{route.growth}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Utilization Metrics component
const UtilizationMetricsCard = () => {
  // Sample data for the metrics
  const metrics = [
    { label: "Feribot Doluluk Oranı", value: 76 },
    { label: "Koltuk Doluluk Oranı", value: 82 },
    { label: "Araç Kapasitesi Kullanımı", value: 65 },
    { label: "Yüksek Sezon Doluluk", value: 92 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kapasite Kullanımı</CardTitle>
        <CardDescription>Ortalama doluluk metrikleri</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{metric.label}</span>
                <span className="font-medium">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Sales Funnel component
const SalesFunnelCard = () => {
  // Sample data for the metrics
  const steps = [
    { label: "Sayfa Ziyaretleri", value: 24850 },
    { label: "Arama Yapanlar", value: 10320 },
    { label: "Sepete Ekleyenler", value: 3450 },
    { label: "Ödeme Başlatanlar", value: 1820 },
    { label: "Tamamlanan Rezervasyonlar", value: 1240 },
  ];

  // Calculate funnel percentage relative to the first step
  const calculatePercentage = (value: number) => {
    return Math.round((value / steps[0].value) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Satış Hunisi</CardTitle>
        <CardDescription>Rezervasyon dönüşüm hunisi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{step.label}</span>
                <span className="font-medium">{step.value.toLocaleString('tr-TR')} {index > 0 && `(${calculatePercentage(step.value)}%)`}</span>
              </div>
              <Progress value={calculatePercentage(step.value)} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Performance Analytics Page
const PerformanceAnalytics: React.FC = () => {
  const [period, setPeriod] = useState("30");

  // Fetch system performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["/api/admin/analytics/performance", period],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/admin/analytics/performance?period=${period}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching performance data:", error);
        // Return mock data if API fails
        return getMockPerformanceData();
      }
    },
  });

  function getMockPerformanceData() {
    // Return mock data for demonstration purposes
    return {
      totalRevenue: "₺1,250,000",
      totalBookings: "4,250",
      averageTicketValue: "₺294",
      conversionRate: "4.98%",
      topRoutes: [
        { route: "İstanbul - Bodrum", bookings: 450, revenue: "₺135,000", growth: 12.5 },
        { route: "İstanbul - İzmir", bookings: 380, revenue: "₺114,000", growth: 8.3 },
        { route: "Çeşme - Sakız", bookings: 310, revenue: "₺93,000", growth: 15.2 },
        { route: "Bodrum - Kos", bookings: 270, revenue: "₺81,000", growth: 5.1 },
        { route: "Ayvalık - Midilli", bookings: 220, revenue: "₺66,000", growth: -2.3 },
      ],
      trends: {
        revenue: { value: "+15.3%", direction: "up" },
        bookings: { value: "+10.2%", direction: "up" },
        ticketValue: { value: "+5.1%", direction: "up" },
        conversionRate: { value: "-1.2%", direction: "down" },
      }
    };
  }

  const data = performanceData || getMockPerformanceData();

  return (
    <UnifiedAdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Performans Analizi</h1>
            <p className="text-muted-foreground">Sistem performansı ve iş metrikleri</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Dönem Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Son 7 Gün</SelectItem>
                <SelectItem value="30">Son 30 Gün</SelectItem>
                <SelectItem value="90">Son 3 Ay</SelectItem>
                <SelectItem value="365">Son 1 Yıl</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" /> Özel Tarih
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <StatCard 
            title="Toplam Gelir" 
            value={data.totalRevenue} 
            icon={<DollarSign className="h-4 w-4" />} 
            trend={data.trends.revenue}
          />
          <StatCard 
            title="Toplam Rezervasyon" 
            value={data.totalBookings} 
            icon={<ShoppingCart className="h-4 w-4" />} 
            trend={data.trends.bookings}
          />
          <StatCard 
            title="Ortalama Sepet Tutarı" 
            value={data.averageTicketValue} 
            icon={<Activity className="h-4 w-4" />} 
            trend={data.trends.ticketValue}
          />
          <StatCard 
            title="Dönüşüm Oranı" 
            value={data.conversionRate} 
            icon={<Target className="h-4 w-4" />} 
            trend={data.trends.conversionRate}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4 mb-4">
          <RevenueChart />
          <div className="space-y-4">
            <TopRoutesCard />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-4">
          <UtilizationMetricsCard />
          <SalesFunnelCard />
        </div>
      </div>
    </UnifiedAdminLayout>
  );
};

export default PerformanceAnalytics;