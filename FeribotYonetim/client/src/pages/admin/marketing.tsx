import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignsList from "@/components/admin/marketing/campaigns-list";
import CustomerSegmentsList from "@/components/admin/marketing/segments-list";
import CouponsList from "@/components/admin/marketing/coupons-list";
import EmailsList from "@/components/admin/marketing/emails-list";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  BarChart, 
  PieChart, 
  LineChart,
  DollarSign,
  Users,
  Tag,
  Mail,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import AdminLayout from "@/components/layouts/admin-layout";
import { Helmet } from "react-helmet";

const MarketingDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Get stats for the overview dashboard
  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const { data: segments } = useQuery({
    queryKey: ['/api/customer-segments'],
  });

  const { data: coupons } = useQuery({
    queryKey: ['/api/coupons'],
  });

  const { data: emails } = useQuery({
    queryKey: ['/api/marketing-emails'],
  });

  const { data: emailSends } = useQuery({
    queryKey: ['/api/email-sends'],
  });

  // Calculate stats
  const activeCoupons = coupons?.filter(c => c.isActive && new Date(c.endDate) > new Date())?.length || 0;
  const totalCouponRedemptions = coupons?.reduce((acc, c) => acc + c.usageCount, 0) || 0;
  
  const draftEmails = emails?.filter(e => e.status === "draft")?.length || 0;
  const sentEmails = emails?.filter(e => e.status === "sent")?.length || 0;
  
  const totalEmailSends = emailSends?.length || 0;
  const emailOpens = emailSends?.filter(s => s.status === "opened" || s.status === "clicked")?.length || 0;
  const emailClicks = emailSends?.filter(s => s.status === "clicked")?.length || 0;
  
  const openRate = totalEmailSends > 0 ? Math.round((emailOpens / totalEmailSends) * 100) : 0;
  const clickRate = emailOpens > 0 ? Math.round((emailClicks / emailOpens) * 100) : 0;

  // Get weekly email stats (simplified for demo)
  const getWeeklyEmailStats = () => {
    return [
      { name: "Mon", value: 12 },
      { name: "Tue", value: 25 },
      { name: "Wed", value: 18 },
      { name: "Thu", value: 32 },
      { name: "Fri", value: 27 },
      { name: "Sat", value: 10 },
      { name: "Sun", value: 5 },
    ];
  };

  // Get coupon usage by type (simplified for demo)
  const getCouponUsageByType = () => {
    return [
      { name: "Percentage", value: 65 },
      { name: "Fixed Amount", value: 35 },
    ];
  };

  return (
    <>
      <Helmet>
        <title>Marketing Dashboard - FerryTicket Admin</title>
      </Helmet>
      <AdminLayout>
        <div className="container mx-auto py-6 space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Marketing Dashboard</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full max-w-4xl mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="segments">Customer Segments</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
              <TabsTrigger value="emails">Email Marketing</TabsTrigger>
            </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Campaigns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Campaigns
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(campaigns?.filter(c => c.isActive)?.length || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {campaigns?.length || 0} Total Campaigns
                </p>
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Customer Segments
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {segments?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Target specific customer groups
                </p>
              </CardContent>
            </Card>

            {/* Active Coupons */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Coupons
                </CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeCoupons}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalCouponRedemptions} Total Redemptions
                </p>
              </CardContent>
            </Card>

            {/* Email Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Email Performance
                </CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sentEmails} Sent
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>Open Rate: {openRate}%</span>
                  <span>Click Rate: {clickRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Email Performance</CardTitle>
                <CardDescription>
                  Number of emails sent per day this week
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-full flex flex-col space-y-2">
                    <div className="flex justify-between px-2">
                      <span className="text-sm text-muted-foreground">35</span>
                      <span className="text-sm text-muted-foreground">Emails Sent</span>
                    </div>
                    <div className="relative h-[250px] w-full">
                      <div className="absolute inset-0 flex items-end justify-between px-2">
                        {getWeeklyEmailStats().map((day) => (
                          <div key={day.name} className="flex flex-col items-center">
                            <div 
                              className="bg-primary w-14 rounded-t-md" 
                              style={{ height: `${(day.value / 35) * 200}px` }}
                            ></div>
                            <span className="text-xs mt-2">{day.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coupon Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Coupon Usage Distribution</CardTitle>
                <CardDescription>
                  Breakdown by coupon type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-full flex flex-row space-x-4 items-center justify-center">
                    {/* Simplified pie chart */}
                    <div className="relative w-40 h-40 rounded-full overflow-hidden">
                      <div 
                        className="absolute bg-primary" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 0 100%, 0 50%, 50% 50%)' 
                        }}
                      ></div>
                      <div 
                        className="absolute bg-secondary" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 50%, 50% 50%)' 
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-28 h-28 bg-background rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {getCouponUsageByType().map((item) => (
                        <div key={item.name} className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${
                            item.name === "Percentage" ? "bg-primary" : "bg-secondary"
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.value}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marketing Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Marketing Highlights</CardTitle>
              <CardDescription>
                Recent performance and upcoming activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Email Open Rate</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-2">{openRate}%</span>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${openRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Coupon Redemption Rate</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-2">24%</span>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      </div>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: '24%' }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Campaign Conversion</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-2">18%</span>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: '18%' }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Upcoming Activities</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start space-x-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Summer Promotion Campaign</p>
                        <p className="text-xs text-muted-foreground">Launching in 3 days</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Loyalty Program Email</p>
                        <p className="text-xs text-muted-foreground">Scheduled for next week</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Early Bird Discount</p>
                        <p className="text-xs text-muted-foreground">Starts on June 15</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <CampaignsList />
        </TabsContent>

        {/* Customer Segments Tab */}
        <TabsContent value="segments">
          <CustomerSegmentsList />
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <CouponsList />
        </TabsContent>

        {/* Email Marketing Tab */}
        <TabsContent value="emails">
          <EmailsList />
        </TabsContent>
      </Tabs>
        </div>
      </AdminLayout>
    </>
  );
};

export { MarketingDashboard as default };