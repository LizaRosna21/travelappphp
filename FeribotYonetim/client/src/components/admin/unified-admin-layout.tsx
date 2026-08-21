import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Lucide Icons Import
import { 
  Search,
  Menu,
  LogOut,
  User,
  Ship,
  Home,
  Bell,
  Inbox,
  UserCog,
  HelpCircle,
  LayoutDashboard,
  PanelLeft,
  BarChart3,
  Users,
  Gauge,
  Ticket,
  Calendar,
  ClipboardList,
  CreditCard,
  LifeBuoy,
  Anchor,
  Shell,
  ShoppingCart,
  Package,
  Globe,
  Settings,
  Megaphone,
  Database,
  Percent,
  Target,
  Tags,
  Mail,
  Landmark,
  Award,
  Layers,
  MessageSquare,
  Languages,
  CircleDollarSign,
  HardDrive,
  Rocket,
  Lock,
  Key,
  Wrench,
  UserCog2,
  Headphones,
  Smartphone
} from "lucide-react";

// Props interface for NavItem component
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  onClick?: () => void;
}

// Props interface for AdminLayout component
interface UnifiedAdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

// Navigation Item Component
const NavItem: React.FC<NavItemProps> = ({ 
  icon: Icon, 
  label, 
  href, 
  isActive, 
  badge, 
  badgeVariant = "default",
  onClick 
}) => {
  return (
    <li>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className="w-full justify-start"
        asChild
        onClick={onClick}
      >
        <a href={href} className="flex items-center">
          <Icon className="mr-2 h-4 w-4" />
          <span className="flex-grow">{label}</span>
          {badge && (
            <Badge variant={badgeVariant} className="ml-auto">
              {badge}
            </Badge>
          )}
        </a>
      </Button>
    </li>
  );
};

// Main Admin Layout Component
const UnifiedAdminLayout: React.FC<UnifiedAdminLayoutProps> = ({ 
  children, 
  pageTitle 
}) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Logout handler
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/auth";
  };

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['/api/admin/notifications'],
    enabled: !!user?.id,
  });

  // Update notifications state when data is available
  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData);
      const unreadCount = notificationsData.filter((n: any) => !n.isRead).length;
      setUnreadNotificationCount(unreadCount);
    }
  }, [notificationsData]);
  
  // Function to check if a nav item is active
  const isNavItemActive = (href: string) => {
    return location === href || (href !== "/admin" && location.startsWith(href));
  };

  // All navigation items organized by category and groups
  const navigationItems = [
    // PANEL CATEGORİSİ
    {
      category: "panel",
      groups: [
        {
          group: "Gösterge Panelleri",
          items: [
            { 
              icon: LayoutDashboard, 
              label: "Ana Dashboard", 
              href: "/admin" 
            },
            { 
              icon: BarChart3, 
              label: "Analitik Dashboard", 
              href: "/admin/advanced-dashboard"
            },
            { 
              icon: Gauge, 
              label: "Performans Metrikleri", 
              href: "/admin/analytics/performance" 
            }
          ]
        },
        {
          group: "Rezervasyon Yönetimi",
          items: [
            { 
              icon: Ticket, 
              label: "Rezervasyonlar", 
              href: "/admin/bookings"
            },
            { 
              icon: Calendar, 
              label: "Sefer Takvimi", 
              href: "/admin/schedules" 
            },
            { 
              icon: CreditCard, 
              label: "Ödemeler", 
              href: "/admin/payments" 
            }
          ]
        },
        {
          group: "Kullanıcı Yönetimi",
          items: [
            { 
              icon: Users, 
              label: "Kullanıcılar", 
              href: "/admin/users" 
            },
            { 
              icon: MessageSquare, 
              label: "Mesajlar", 
              href: "/admin/inbox" 
            },
            { 
              icon: Award, 
              label: "Üyelik Seviyeleri", 
              href: "/admin/membership-tiers" 
            }
          ]
        },
      ]
    },
    
    // SATIŞ KATEGORİSİ
    {
      category: "marketing",
      groups: [
        {
          group: "Ürün Yönetimi",
          items: [
            { 
              icon: Ship, 
              label: "Rotalar", 
              href: "/admin/routes" 
            },
            { 
              icon: Anchor, 
              label: "Limanlar", 
              href: "/admin/ports" 
            },
            { 
              icon: Package, 
              label: "Ürünler", 
              href: "/admin/products" 
            }
          ]
        },
        {
          group: "Pazarlama",
          items: [
            { 
              icon: Megaphone, 
              label: "Kampanyalar", 
              href: "/admin/marketing" 
            },
            { 
              icon: Percent, 
              label: "İndirim Kodları", 
              href: "/admin/coupon-codes",
              badge: "Yeni",
              badgeVariant: "secondary"
            },
            { 
              icon: Mail, 
              label: "E-posta Pazarlama", 
              href: "/admin/email-marketing" 
            },
            { 
              icon: Target, 
              label: "Müşteri Segmentleri", 
              href: "/admin/customer-segments" 
            },
            { 
              icon: Landmark, 
              label: "Gelir Yönetimi", 
              href: "/admin/revenue-management" 
            }
          ]
        },
        {
          group: "B2B Yönetimi",
          items: [
            { 
              icon: Layers, 
              label: "Acenteler", 
              href: "/admin/b2b" 
            },
            { 
              icon: Tags, 
              label: "Fiyatlandırma", 
              href: "/admin/b2b/pricing" 
            }
          ]
        },
      ]
    },
    
    // SİSTEM KATEGORİSİ
    {
      category: "content",
      groups: [
        {
          group: "İçerik Yönetimi",
          items: [
            { 
              icon: Languages, 
              label: "Dil Ayarları", 
              href: "/admin/languages" 
            },
            { 
              icon: Globe, 
              label: "Çeviri Yönetimi", 
              href: "/admin/translation-management",
              badge: "Yeni", 
              badgeVariant: "default"
            },
            { 
              icon: CircleDollarSign, 
              label: "Para Birimleri", 
              href: "/admin/currencies" 
            },
            { 
              icon: MessageSquare, 
              label: "Yorumlar", 
              href: "/admin/reviews" 
            }
          ]
        },
        {
          group: "Sistem Yönetimi",
          items: [
            { 
              icon: Settings, 
              label: "Genel Ayarlar", 
              href: "/admin/settings" 
            },
            { 
              icon: Database, 
              label: "Yedekleme", 
              href: "/admin/backup-management" 
            },
            { 
              icon: Key, 
              label: "API Yönetimi", 
              href: "/admin/api-management" 
            },
            { 
              icon: Smartphone, 
              label: "WhatsApp", 
              href: "/admin/whatsapp" 
            }
          ]
        },
        {
          group: "Entegrasyonlar",
          items: [
            { 
              icon: Wrench, 
              label: "Entegrasyonlar", 
              href: "/admin/integrations" 
            },
            { 
              icon: HardDrive, 
              label: "Backoffice", 
              href: "/admin/backoffice-integration" 
            },
            { 
              icon: CreditCard, 
              label: "Ödeme Ayarları", 
              href: "/admin/payment-settings" 
            }
          ]
        }
      ]
    }
  ];

  // Filter navigation items based on search query and active tab
  const getFilteredNavItems = () => {
    const allItems = navigationItems.flatMap(category => 
      category.groups.flatMap(group => ({
        ...group,
        items: group.items.filter(item => 
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
    ).filter(group => group.items.length > 0);

    if (activeTab === "all") {
      return allItems;
    }
    
    const categoryItems = navigationItems
      .find(category => category.category === activeTab)?.groups
      .flatMap(group => ({
        ...group,
        items: group.items.filter(item => 
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(group => group.items.length > 0);
      
    return categoryItems || [];
  };

  const activeNavItems = getFilteredNavItems();
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo and sidebar toggle */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center">
            <Ship className="h-6 w-6 text-primary" />
            {!sidebarCollapsed && <span className="ml-2 font-semibold">Ferry Admin</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search and tab filter - only shown when sidebar is expanded */}
        {!sidebarCollapsed && (
          <div className="border-b px-4 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Ara..."
                className="w-full bg-background pl-8 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Tabs 
              defaultValue="all" 
              className="mt-3" 
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">Tümü</TabsTrigger>
                <TabsTrigger value="panel">Panel</TabsTrigger>
                <TabsTrigger value="marketing">Satış</TabsTrigger>
                <TabsTrigger value="content">Sistem</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
        
        {/* Sidebar menu items */}
        <ScrollArea className={`h-[calc(100vh-theme(spacing.16)-${sidebarCollapsed ? '0px' : 'theme(spacing.16)-3px'})]`}>
          <div className="px-3 py-2">
            {sidebarCollapsed ? (
              // Collapsed view with icons only
              <div className="space-y-6">
                {navigationItems.flatMap(category => 
                  category.groups.flatMap(group => 
                    group.items.map((item, index) => (
                      <TooltipProvider key={`${item.href}-${index}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isNavItemActive(item.href) ? "secondary" : "ghost"}
                              size="icon"
                              className="w-full h-10 mb-1"
                              asChild
                            >
                              <a href={item.href}>
                                <item.icon className="h-5 w-5" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                            {item.badge && (
                              <Badge variant={item.badgeVariant} className="ml-2">
                                {item.badge}
                              </Badge>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))
                  )
                )}
              </div>
            ) : (
              // Expanded view with full menu
              activeNavItems.map((group, groupIndex) => (
                <div key={`${group.group}-${groupIndex}`} className="mb-6">
                  <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.group}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((item, itemIndex) => (
                      <NavItem 
                        key={`${item.href}-${itemIndex}`}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={isNavItemActive(item.href)}
                        badge={item.badge}
                        badgeVariant={item.badgeVariant}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* User profile section */}
        <div className="sticky bottom-0 border-t bg-card p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
                <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-2'}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImage || ""} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <p className="text-sm font-medium">{user?.username || "Admin"}</p>
                      <p className="text-xs text-muted-foreground">{user?.role || "Admin"}</p>
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={sidebarCollapsed ? "center" : "start"} className="w-56">
              <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/admin/profile">
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>Profil Ayarları</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Yardım</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      
      {/* Mobile sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="fixed left-4 top-4 z-40 lg:hidden" 
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetHeader className="h-16 px-4 border-b flex items-center">
            <SheetTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              <span>Ferry Admin</span>
            </SheetTitle>
          </SheetHeader>
          
          <div className="border-b px-4 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Ara..."
                className="w-full bg-background pl-8 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Tabs 
              defaultValue="all" 
              className="mt-3" 
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">Tümü</TabsTrigger>
                <TabsTrigger value="panel">Panel</TabsTrigger>
                <TabsTrigger value="marketing">Satış</TabsTrigger>
                <TabsTrigger value="content">Sistem</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <ScrollArea className="h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]">
            <div className="px-3 py-2">
              {activeNavItems.map((group, groupIndex) => (
                <div key={`mobile-${group.group}-${groupIndex}`} className="mb-6">
                  <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.group}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((item, itemIndex) => (
                      <NavItem 
                        key={`mobile-${item.href}-${itemIndex}`}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={isNavItemActive(item.href)}
                        badge={item.badge}
                        badgeVariant={item.badgeVariant}
                        onClick={() => setIsMobileMenuOpen(false)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="sticky bottom-0 border-t bg-card p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImage || ""} />
                      <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{user?.username || "Admin"}</p>
                      <p className="text-xs text-muted-foreground">{user?.role || "Admin"}</p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/admin/profile">
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Profil Ayarları</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/help">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Yardım</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <Ship className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Ferry Admin</h1>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href="/" target="_blank">
                      <Home className="h-4 w-4" />
                      <span className="sr-only">Ana Site</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ana siteyi görüntüle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href="/admin/inbox">
                      <Inbox className="h-4 w-4" />
                      <span className="sr-only">Mesajlar</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mesajlar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild className="relative">
                    <a href="/admin/notifications">
                      <Bell className="h-4 w-4" />
                      {unreadNotificationCount > 0 && (
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                      )}
                      <span className="sr-only">Bildirimler</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bildirimler {unreadNotificationCount > 0 ? `(${unreadNotificationCount})` : ""}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImage || ""} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  <span>{user?.role || "Admin"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/admin/profile">
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Profil Ayarları</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/help">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Yardım</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page content */}
        <div className="p-6 lg:p-10">
          {pageTitle && (
            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">{pageTitle}</h1>
            </div>
          )}
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default UnifiedAdminLayout;