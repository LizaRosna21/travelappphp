import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, subDays, subMonths } from 'date-fns';
import AdminLayout from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { BarChart3, CalendarDays, TrendingUp, LineChart, DollarSign, AlertCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ChartOptions } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const dynamicPricingSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  routeId: z.number().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  conditionType: z.string(),
  conditionValue: z.string(),
  priceAdjustmentType: z.string(),
  priceAdjustmentValue: z.string(),
  priority: z.number().int().positive(),
  isActive: z.boolean().default(true),
});

const seasonalFactorSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  routeId: z.number().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  factor: z.string(),
  isActive: z.boolean().default(true),
});

const specialEventSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  impactRadius: z.number().int().positive(),
  expectedImpact: z.string(),
  pricingAdjustment: z.string(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const yieldManagementSchema = z.object({
  routeId: z.number().optional().nullable(),
  minPriceThreshold: z.string(),
  maxPriceThreshold: z.string(),
  targetOccupancy: z.string(),
  sensitivityFactor: z.string(),
  demandElasticityFactor: z.string(),
  enableAutomaticPricing: z.boolean().default(false),
  pricingUpdateFrequency: z.string(),
  pricingStrategy: z.string(),
  isActive: z.boolean().default(true),
});

const RevenueManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const { toast } = useToast();

  // Load routes for selection
  const { data: routes } = useQuery({
    queryKey: ['/api/routes'],
    select: (data) => data || [],
  });

  // Dynamic Pricing Rules
  const { data: pricingRules, isLoading: loadingRules } = useQuery({
    queryKey: ['/api/admin/revenue/pricing-rules'],
    select: (data) => data || [],
    enabled: activeTab === 'dynamic-pricing' || activeTab === 'dashboard',
  });

  // Seasonal Factors
  const { data: seasonalFactors, isLoading: loadingFactors } = useQuery({
    queryKey: ['/api/admin/revenue/seasonal-factors'],
    select: (data) => data || [],
    enabled: activeTab === 'seasonal-factors' || activeTab === 'dashboard',
  });

  // Special Events
  const { data: specialEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['/api/admin/revenue/special-events'],
    select: (data) => data || [],
    enabled: activeTab === 'special-events' || activeTab === 'dashboard',
  });

  // Price History
  const { data: priceHistory, isLoading: loadingPriceHistory } = useQuery({
    queryKey: [`/api/admin/revenue/price-history?routeId=${selectedRoute}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    select: (data) => data || [],
    enabled: activeTab === 'price-history' && selectedRoute !== null,
  });

  // Yield Management Settings
  const { data: yieldSettings, isLoading: loadingYieldSettings } = useQuery({
    queryKey: ['/api/admin/revenue/yield-settings'],
    select: (data) => data || [],
    enabled: activeTab === 'yield-management' || activeTab === 'dashboard',
  });

  // Revenue Analysis
  // NOT: Sunucu tarafındaki karşılığı POST /api/admin/revenue/reports/revenue
  // olup henüz uygulanmadı (501 döner). Rapor üretimi yazıldığında bu sorgu
  // POST'a uygun özel bir queryFn ile o uca bağlanmalıdır.
  const { data: revenueAnalysis, isLoading: loadingAnalysis } = useQuery({
    queryKey: ['/api/revenue/analysis', selectedRoute ? [selectedRoute] : null, dateRange.startDate, dateRange.endDate],
    select: (data) => data || { summary: {}, details: { bookings: [] } },
    enabled: activeTab === 'dashboard' || activeTab === 'revenue-analysis',
  });

  // Revenue forecasts
  const { data: revenueForecasts, isLoading: loadingForecasts } = useQuery({
    queryKey: [`/api/admin/revenue/demand-forecasts?routeId=${selectedRoute}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    select: (data) => data || [],
    enabled: activeTab === 'forecasts' && selectedRoute !== null,
  });

  // Dynamic Pricing Rule Form
  const dynamicPricingForm = useForm<z.infer<typeof dynamicPricingSchema>>({
    resolver: zodResolver(dynamicPricingSchema),
    defaultValues: {
      name: '',
      description: '',
      routeId: null,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      conditionType: 'occupancy_based',
      conditionValue: JSON.stringify({ min_occupancy: 0.7, max_occupancy: 0.9 }),
      priceAdjustmentType: 'percentage',
      priceAdjustmentValue: '10',
      priority: 1,
      isActive: true,
    },
  });

  // Seasonal Factor Form
  const seasonalFactorForm = useForm<z.infer<typeof seasonalFactorSchema>>({
    resolver: zodResolver(seasonalFactorSchema),
    defaultValues: {
      name: '',
      description: '',
      routeId: null,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
      factor: '1.2',
      isActive: true,
    },
  });

  // Special Event Form
  const specialEventForm = useForm<z.infer<typeof specialEventSchema>>({
    resolver: zodResolver(specialEventSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
      impactRadius: 50,
      expectedImpact: 'high_demand',
      pricingAdjustment: '15',
      notes: '',
      isActive: true,
    },
  });

  // Yield Management Form
  const yieldManagementForm = useForm<z.infer<typeof yieldManagementSchema>>({
    resolver: zodResolver(yieldManagementSchema),
    defaultValues: {
      routeId: null,
      minPriceThreshold: '0.7',
      maxPriceThreshold: '1.5',
      targetOccupancy: '0.85',
      sensitivityFactor: '1.0',
      demandElasticityFactor: '0.8',
      enableAutomaticPricing: false,
      pricingUpdateFrequency: 'daily',
      pricingStrategy: 'balanced',
      isActive: true,
    },
  });

  // Mutations
  const createPricingRuleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dynamicPricingSchema>) => {
      const res = await apiRequest('POST', '/api/admin/revenue/pricing-rules', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Dynamic pricing rule created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue/pricing-rules'] });
      dynamicPricingForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const createSeasonalFactorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof seasonalFactorSchema>) => {
      const res = await apiRequest('POST', '/api/admin/revenue/seasonal-factors', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Seasonal factor created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue/seasonal-factors'] });
      seasonalFactorForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const createSpecialEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof specialEventSchema>) => {
      const res = await apiRequest('POST', '/api/admin/revenue/special-events', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Special event created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue/special-events'] });
      specialEventForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const saveYieldSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof yieldManagementSchema>) => {
      const res = await apiRequest('POST', '/api/admin/revenue/yield-settings', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Yield management settings saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue/yield-settings'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const generatePricePlanMutation = useMutation({
    mutationFn: async (routeId: number) => {
      const res = await apiRequest('GET', `/api/admin/revenue/optimized-pricing/${routeId}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Success', description: 'Price plan generated successfully.' });
      setPricePlan(data);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const analyzeRouteMutation = useMutation({
    mutationFn: async (routeId: number) => {
      const res = await apiRequest('GET', `/api/admin/revenue/route-performance/${routeId}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Success', description: 'Route analysis completed.' });
      setRouteAnalysis(data);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // State for price plan and route analysis
  const [pricePlan, setPricePlan] = useState<any>(null);
  const [routeAnalysis, setRouteAnalysis] = useState<any>(null);

  // Handle form submissions
  const handleDynamicPricingSubmit = (data: z.infer<typeof dynamicPricingSchema>) => {
    createPricingRuleMutation.mutate(data);
  };

  const handleSeasonalFactorSubmit = (data: z.infer<typeof seasonalFactorSchema>) => {
    createSeasonalFactorMutation.mutate(data);
  };

  const handleSpecialEventSubmit = (data: z.infer<typeof specialEventSchema>) => {
    createSpecialEventMutation.mutate(data);
  };

  const handleYieldSettingsSubmit = (data: z.infer<typeof yieldManagementSchema>) => {
    saveYieldSettingsMutation.mutate(data);
  };

  // Generate chart data for price history
  const getPriceHistoryChartData = () => {
    if (!priceHistory || priceHistory.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Base Price',
            data: [],
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderWidth: 2,
          },
          {
            label: 'Adjusted Price',
            data: [],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderWidth: 2,
          }
        ]
      };
    }

    const sortedHistory = [...priceHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sortedHistory.map(item => item.date),
      datasets: [
        {
          label: 'Base Price',
          data: sortedHistory.map(item => parseFloat(item.originalPrice)),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderWidth: 2,
        },
        {
          label: 'Adjusted Price',
          data: sortedHistory.map(item => parseFloat(item.adjustedPrice)),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderWidth: 2,
        }
      ]
    };
  };

  // Generate revenue analysis chart data
  const getRevenueAnalysisChartData = () => {
    if (!revenueAnalysis || !revenueAnalysis.details || !revenueAnalysis.details.bookings || revenueAnalysis.details.bookings.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Revenue',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderWidth: 2,
            type: 'line'
          },
          {
            label: 'Bookings',
            data: [],
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderWidth: 1,
            type: 'bar'
          }
        ]
      };
    }

    // Group bookings by date
    const bookingsByDate = revenueAnalysis.details.bookings.reduce((acc: any, booking: any) => {
      const date = booking.departureDate;
      if (!acc[date]) {
        acc[date] = {
          bookings: 0,
          revenue: 0
        };
      }
      acc[date].bookings += 1;
      if (booking.isPaid) {
        acc[date].revenue += parseFloat(booking.totalPrice);
      }
      return acc;
    }, {});

    const dates = Object.keys(bookingsByDate).sort();

    return {
      labels: dates,
      datasets: [
        {
          label: 'Revenue',
          data: dates.map(date => bookingsByDate[date].revenue),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderWidth: 2,
          type: 'line'
        },
        {
          label: 'Bookings',
          data: dates.map(date => bookingsByDate[date].bookings),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
          borderWidth: 1,
          type: 'bar'
        }
      ]
    };
  };

  // Format for chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Price History',
      },
    },
  };

  return (
    <AdminLayout title="Revenue Management">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="dynamic-pricing">
            <TrendingUp className="h-4 w-4 mr-2" />
            Dynamic Pricing
          </TabsTrigger>
          <TabsTrigger value="seasonal-factors">
            <CalendarDays className="h-4 w-4 mr-2" />
            Seasonal Factors
          </TabsTrigger>
          <TabsTrigger value="special-events">
            <AlertCircle className="h-4 w-4 mr-2" />
            Special Events
          </TabsTrigger>
          <TabsTrigger value="price-history">
            <LineChart className="h-4 w-4 mr-2" />
            Price History
          </TabsTrigger>
          <TabsTrigger value="yield-management">
            <DollarSign className="h-4 w-4 mr-2" />
            Yield Management
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Revenue</CardTitle>
                <CardDescription>Current period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {revenueAnalysis?.summary?.totalRevenue 
                    ? `${revenueAnalysis.summary.totalRevenue} ${revenueAnalysis.summary.currency}` 
                    : 'Loading...'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Bookings</CardTitle>
                <CardDescription>Current period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {revenueAnalysis?.summary?.totalBookings ?? 'Loading...'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Average Ticket Value</CardTitle>
                <CardDescription>Current period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {revenueAnalysis?.summary?.avgTicketValue 
                    ? `${revenueAnalysis.summary.avgTicketValue} ${revenueAnalysis.summary.currency}` 
                    : 'Loading...'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Bookings Analysis</CardTitle>
                <CardDescription>Current period analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar 
                    data={getRevenueAnalysisChartData()} 
                    options={chartOptions}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-4">
                  <Select value={selectedRoute?.toString() || ''} onValueChange={(value) => setSelectedRoute(value ? parseInt(value) : null)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Routes</SelectItem>
                      {routes?.map((route: any) => (
                        <SelectItem key={route.id} value={route.id.toString()}>
                          {route.departurePort} - {route.arrivalPort}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => analyzeRouteMutation.mutate(selectedRoute!)} disabled={!selectedRoute}>
                    Analyze Route
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Price Rules</CardTitle>
                <CardDescription>Currently active pricing rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] overflow-auto">
                  {loadingRules ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Adjustment</TableHead>
                          <TableHead>Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingRules && pricingRules.length > 0 ? (
                          pricingRules
                            .filter((rule: any) => rule.isActive)
                            .slice(0, 5)
                            .map((rule: any) => (
                              <TableRow key={rule.id}>
                                <TableCell>{rule.name}</TableCell>
                                <TableCell>{rule.conditionType}</TableCell>
                                <TableCell>
                                  {rule.priceAdjustmentType === 'percentage'
                                    ? `${rule.priceAdjustmentValue}%`
                                    : rule.priceAdjustmentValue}
                                </TableCell>
                                <TableCell>{rule.priority}</TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">No active pricing rules</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => setActiveTab('dynamic-pricing')}>
                  Manage Price Rules
                </Button>
              </CardFooter>
            </Card>
          </div>

          {routeAnalysis && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Route Analysis: {routeAnalysis.routeName}</CardTitle>
                <CardDescription>Performance metrics and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Performance Metrics</h4>
                    <ul className="space-y-2">
                      <li>Bookings: {routeAnalysis.performanceMetrics.last30DaysBookings}</li>
                      <li>Revenue: {routeAnalysis.performanceMetrics.last30DaysRevenue}</li>
                      <li>Average Ticket Value: {routeAnalysis.performanceMetrics.averageTicketValue}</li>
                      <li>Price Elasticity: {routeAnalysis.performanceMetrics.priceElasticity}</li>
                      <li>Peak Days: {routeAnalysis.performanceMetrics.peakDays.join(', ') || 'None'}</li>
                      <li>Slow Days: {routeAnalysis.performanceMetrics.slowDays.join(', ') || 'None'}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {routeAnalysis.recommendations.map((rec: any, index: number) => (
                        <li key={index} className={`p-2 rounded ${rec.severity === 'high' ? 'bg-red-100' : rec.severity === 'medium' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                          {rec.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => generatePricePlanMutation.mutate(routeAnalysis.routeId)}>
                  Generate Pricing Plan
                </Button>
              </CardFooter>
            </Card>
          )}

          {pricePlan && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Pricing Plan: {pricePlan.routeName}</CardTitle>
                <CardDescription>Generated on {new Date(pricePlan.generatedAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Base Price</TableHead>
                        <TableHead>Recommended Price</TableHead>
                        <TableHead>Adjustments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricePlan.pricingPlan.slice(0, 10).map((day: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{day.date}</TableCell>
                          <TableCell>{day.dayOfWeek}</TableCell>
                          <TableCell>{day.basePrice}</TableCell>
                          <TableCell>{day.recommendedPrice}</TableCell>
                          <TableCell>
                            {day.adjustments.map((adj: any, i: number) => (
                              <div key={i} className="text-xs">
                                {adj.type}: {adj.factor ? `x${adj.factor.toFixed(2)}` : adj.name}
                              </div>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Showing first 10 days of the pricing plan. The plan was generated based on historical data and current pricing rules.
                </p>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        {/* Dynamic Pricing Tab */}
        <TabsContent value="dynamic-pricing">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Create Dynamic Pricing Rule</CardTitle>
                  <CardDescription>Set up rules for automatic price adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...dynamicPricingForm}>
                    <form onSubmit={dynamicPricingForm.handleSubmit(handleDynamicPricingSubmit)} className="space-y-4">
                      <FormField
                        control={dynamicPricingForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rule Name</FormLabel>
                            <FormControl>
                              <Input placeholder="E.g., High Demand Pricing" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="routeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Route</FormLabel>
                            <Select
                              value={field.value?.toString() || ''}
                              onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Apply to specific route" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Routes</SelectItem>
                                {routes?.map((route: any) => (
                                  <SelectItem key={route.id} value={route.id.toString()}>
                                    {route.departurePort} - {route.arrivalPort}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Leave empty to apply to all routes
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={dynamicPricingForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={dynamicPricingForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={dynamicPricingForm.control}
                        name="conditionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="occupancy_based">Occupancy Based</SelectItem>
                                <SelectItem value="time_based">Time Based</SelectItem>
                                <SelectItem value="demand_based">Demand Based</SelectItem>
                                <SelectItem value="seasonal">Seasonal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="conditionValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition Value (JSON)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              {field.value === 'occupancy_based' && 'Example: {"min_occupancy": 0.7, "max_occupancy": 0.9}'}
                              {field.value === 'time_based' && 'Example: {"days_before_departure": 30}'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="priceAdjustmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Adjustment Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select adjustment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="priceAdjustmentValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adjustment Value</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              {dynamicPricingForm.watch('priceAdjustmentType') === 'percentage' 
                                ? 'Enter percentage value (e.g., 10 for 10% increase)' 
                                : 'Enter fixed amount'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormDescription>
                              Higher priority rules are applied first
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dynamicPricingForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Enable or disable this pricing rule
                              </FormDescription>
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

                      <Button type="submit" className="w-full" disabled={createPricingRuleMutation.isPending}>
                        {createPricingRuleMutation.isPending ? 'Saving...' : 'Create Rule'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Dynamic Pricing Rules</CardTitle>
                  <CardDescription>Manage your pricing rules</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRules ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Adjustment</TableHead>
                          <TableHead>Valid Period</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingRules && pricingRules.length > 0 ? (
                          pricingRules.map((rule: any) => (
                            <TableRow key={rule.id}>
                              <TableCell className="font-medium">{rule.name}</TableCell>
                              <TableCell>
                                {rule.routeId ? (
                                  routes?.find((r: any) => r.id === rule.routeId) 
                                    ? `${routes.find((r: any) => r.id === rule.routeId).departurePort} - ${routes.find((r: any) => r.id === rule.routeId).arrivalPort}`
                                    : `Route #${rule.routeId}`
                                ) : 'All Routes'}
                              </TableCell>
                              <TableCell>{rule.conditionType}</TableCell>
                              <TableCell>
                                {rule.priceAdjustmentType === 'percentage'
                                  ? `${rule.priceAdjustmentValue}%`
                                  : rule.priceAdjustmentValue}
                              </TableCell>
                              <TableCell>{rule.startDate} to {rule.endDate}</TableCell>
                              <TableCell>{rule.priority}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  rule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {rule.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center">No pricing rules found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Seasonal Factors Tab */}
        <TabsContent value="seasonal-factors">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Create Seasonal Pricing Factor</CardTitle>
                  <CardDescription>Set up seasonal pricing adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...seasonalFactorForm}>
                    <form onSubmit={seasonalFactorForm.handleSubmit(handleSeasonalFactorSubmit)} className="space-y-4">
                      <FormField
                        control={seasonalFactorForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Season Name</FormLabel>
                            <FormControl>
                              <Input placeholder="E.g., Summer Season" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={seasonalFactorForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={seasonalFactorForm.control}
                        name="routeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Route</FormLabel>
                            <Select
                              value={field.value?.toString() || ''}
                              onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Apply to specific route" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Routes</SelectItem>
                                {routes?.map((route: any) => (
                                  <SelectItem key={route.id} value={route.id.toString()}>
                                    {route.departurePort} - {route.arrivalPort}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Leave empty to apply to all routes
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={seasonalFactorForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={seasonalFactorForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={seasonalFactorForm.control}
                        name="factor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Multiplier</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              E.g., 1.2 for 20% increase, 0.9 for 10% decrease
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={seasonalFactorForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Enable or disable this seasonal factor
                              </FormDescription>
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

                      <Button type="submit" className="w-full" disabled={createSeasonalFactorMutation.isPending}>
                        {createSeasonalFactorMutation.isPending ? 'Saving...' : 'Create Seasonal Factor'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Pricing Factors</CardTitle>
                  <CardDescription>Manage your seasonal pricing factors</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingFactors ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Price Multiplier</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seasonalFactors && seasonalFactors.length > 0 ? (
                          seasonalFactors.map((factor: any) => (
                            <TableRow key={factor.id}>
                              <TableCell className="font-medium">{factor.name}</TableCell>
                              <TableCell>
                                {factor.routeId ? (
                                  routes?.find((r: any) => r.id === factor.routeId) 
                                    ? `${routes.find((r: any) => r.id === factor.routeId).departurePort} - ${routes.find((r: any) => r.id === factor.routeId).arrivalPort}`
                                    : `Route #${factor.routeId}`
                                ) : 'All Routes'}
                              </TableCell>
                              <TableCell>{factor.startDate} to {factor.endDate}</TableCell>
                              <TableCell>x{factor.factor}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  factor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {factor.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">No seasonal factors found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Special Events Tab */}
        <TabsContent value="special-events">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Create Special Event</CardTitle>
                  <CardDescription>Add events that affect pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...specialEventForm}>
                    <form onSubmit={specialEventForm.handleSubmit(handleSpecialEventSubmit)} className="space-y-4">
                      <FormField
                        control={specialEventForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Name</FormLabel>
                            <FormControl>
                              <Input placeholder="E.g., Summer Festival" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="E.g., Istanbul" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={specialEventForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={specialEventForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={specialEventForm.control}
                        name="impactRadius"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Impact Radius (km)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormDescription>
                              How far from the event location prices are affected
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="expectedImpact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Impact</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select impact type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="high_demand">High Demand</SelectItem>
                                <SelectItem value="low_demand">Low Demand</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              High demand events increase prices, low demand decreases them
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="pricingAdjustment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Adjustment (%)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Percentage to adjust prices (e.g., 15 for 15% adjustment)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Enable or disable this event
                              </FormDescription>
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

                      <Button type="submit" className="w-full" disabled={createSpecialEventMutation.isPending}>
                        {createSpecialEventMutation.isPending ? 'Saving...' : 'Create Event'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Special Events</CardTitle>
                  <CardDescription>Manage events that affect pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingEvents ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Impact</TableHead>
                          <TableHead>Adjustment</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {specialEvents && specialEvents.length > 0 ? (
                          specialEvents.map((event: any) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium">{event.name}</TableCell>
                              <TableCell>{event.location}</TableCell>
                              <TableCell>{event.startDate} to {event.endDate}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  event.expectedImpact === 'high_demand' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {event.expectedImpact === 'high_demand' ? 'High Demand' : 'Low Demand'}
                                </span>
                              </TableCell>
                              <TableCell>{event.pricingAdjustment}%</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  event.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {event.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center">No special events found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Price History Tab */}
        <TabsContent value="price-history">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>View historical price adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label>Select Route</Label>
                  <Select
                    value={selectedRoute?.toString() || ''}
                    onValueChange={(value) => setSelectedRoute(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes?.map((route: any) => (
                        <SelectItem key={route.id} value={route.id.toString()}>
                          {route.departurePort} - {route.arrivalPort}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {selectedRoute ? (
                loadingPriceHistory ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div>
                    <div className="h-80 mb-6">
                      <Line 
                        data={getPriceHistoryChartData()} 
                        options={chartOptions}
                      />
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Original Price</TableHead>
                          <TableHead>Adjusted Price</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Applied Rule</TableHead>
                          <TableHead>Occupancy</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceHistory && priceHistory.length > 0 ? (
                          priceHistory.map((item: any) => {
                            const originalPrice = parseFloat(item.originalPrice);
                            const adjustedPrice = parseFloat(item.adjustedPrice);
                            const percentChange = ((adjustedPrice - originalPrice) / originalPrice) * 100;
                            
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{item.date}</TableCell>
                                <TableCell>{item.originalPrice} {item.currency}</TableCell>
                                <TableCell>{item.adjustedPrice} {item.currency}</TableCell>
                                <TableCell>
                                  <span className={`${percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : ''}`}>
                                    {percentChange.toFixed(2)}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {item.ruleId ? `Rule #${item.ruleId}` : 'No rule'}
                                </TableCell>
                                <TableCell>
                                  {item.occupancyRate ? `${(parseFloat(item.occupancyRate) * 100).toFixed(1)}%` : 'N/A'}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center">No price history data found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="mb-4 text-muted-foreground">Select a route to view price history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yield Management Tab */}
        <TabsContent value="yield-management">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Yield Management Settings</CardTitle>
                <CardDescription>Configure yield management parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...yieldManagementForm}>
                  <form onSubmit={yieldManagementForm.handleSubmit(handleYieldSettingsSubmit)} className="space-y-4">
                    <FormField
                      control={yieldManagementForm.control}
                      name="routeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Route</FormLabel>
                          <Select
                            value={field.value?.toString() || ''}
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Apply to specific route" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="global">Global Settings</SelectItem>
                              {routes?.map((route: any) => (
                                <SelectItem key={route.id} value={route.id.toString()}>
                                  {route.departurePort} - {route.arrivalPort}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Leave empty for global settings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-1">
                      <Label>Min-Max Price Thresholds</Label>
                      <div className="flex items-center gap-4">
                        <FormField
                          control={yieldManagementForm.control}
                          name="minPriceThreshold"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} placeholder="Min (e.g., 0.7)" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span>to</span>
                        <FormField
                          control={yieldManagementForm.control}
                          name="maxPriceThreshold"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} placeholder="Max (e.g., 1.5)" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Min/max multipliers applied to base price (e.g., 0.7 = 70% of base price)
                      </p>
                    </div>

                    <FormField
                      control={yieldManagementForm.control}
                      name="targetOccupancy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Occupancy Rate</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="E.g., 0.85 for 85%" />
                          </FormControl>
                          <FormDescription>
                            Target occupancy rate to optimize for
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={yieldManagementForm.control}
                      name="sensitivityFactor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sensitivity Factor</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="E.g., 1.0" />
                          </FormControl>
                          <FormDescription>
                            How aggressively prices respond to demand changes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={yieldManagementForm.control}
                      name="demandElasticityFactor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Demand Elasticity Factor</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="E.g., 0.8" />
                          </FormControl>
                          <FormDescription>
                            How price changes affect demand (0.5-1.5)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={yieldManagementForm.control}
                      name="pricingUpdateFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Update Frequency</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={yieldManagementForm.control}
                      name="pricingStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pricing Strategy</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="aggressive">Aggressive</SelectItem>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="conservative">Conservative</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={yieldManagementForm.control}
                      name="enableAutomaticPricing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Enable Automatic Pricing</FormLabel>
                            <FormDescription>
                              Automatically adjust prices based on yield settings
                            </FormDescription>
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

                    <FormField
                      control={yieldManagementForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Enable or disable these yield settings
                            </FormDescription>
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

                    <Button type="submit" className="w-full" disabled={saveYieldSettingsMutation.isPending}>
                      {saveYieldSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yield Management Settings</CardTitle>
                <CardDescription>Current yield management configurations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingYieldSettings ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead>Price Limits</TableHead>
                        <TableHead>Target Occupancy</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Automatic</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yieldSettings && yieldSettings.length > 0 ? (
                        yieldSettings.map((setting: any) => (
                          <TableRow key={setting.id}>
                            <TableCell>
                              {setting.routeId ? (
                                routes?.find((r: any) => r.id === setting.routeId) 
                                  ? `${routes.find((r: any) => r.id === setting.routeId).departurePort} - ${routes.find((r: any) => r.id === setting.routeId).arrivalPort}`
                                  : `Route #${setting.routeId}`
                              ) : 'Global Settings'}
                            </TableCell>
                            <TableCell>{setting.minPriceThreshold} - {setting.maxPriceThreshold}</TableCell>
                            <TableCell>{(parseFloat(setting.targetOccupancy) * 100).toFixed(0)}%</TableCell>
                            <TableCell>
                              <span className="capitalize">{setting.pricingStrategy}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                setting.enableAutomaticPricing ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {setting.enableAutomaticPricing ? 'Enabled' : 'Disabled'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                setting.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {setting.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">No yield management settings found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default RevenueManagement;