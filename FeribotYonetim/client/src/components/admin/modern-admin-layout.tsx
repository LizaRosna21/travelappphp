import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart2, 
  LayoutDashboard, 
  CircleDollarSign, 
  Ship, 
  Calendar, 
  Ticket, 
  CreditCard, 
  ShoppingBag, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Menu, 
  X, 
  LogOut, 
  UserCog, 
  FileText,
  Database,
  Globe,
  Shield,
  ExternalLink,
  Anchor,
  MessageSquare,
  PanelLeft,
  Key,
  Languages,
  Home,
  HelpCircle,
  Mail,
  BarChart3,
  Gauge,
  Layers,
  PackageOpen,
  Building,
  BellRing,
  TrendingUp,
  Euro,
  Rocket,
  ChevronRight,
  Star,
  ShieldCheck,
  Inbox,
  PictureInPicture,
  BookOpen,
  PlanetIcon
} from 'lucide-react';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive?: boolean;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ 
  icon: Icon, 
  label, 
  href, 
  isActive = false,
  badge,
  badgeVariant = 'default',
  onClick 
}) => {
  return (
    <li>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className="w-full justify-start h-10"
        asChild
        onClick={onClick}
      >
        <a href={href} className="flex items-center">
          <Icon className="mr-2 h-4 w-4" />
          <span>{label}</span>
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

interface NavGroupProps {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ 
  label, 
  icon: Icon, 
  children, 
  defaultOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-2">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <Icon className="mr-2 h-4 w-4" />
          <span>{label}</span>
        </div>
        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <ul className="mt-1 space-y-1 pl-7">
          {children}
        </ul>
      )}
    </div>
  );
};

interface ModernAdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

const ModernAdminLayout: React.FC<ModernAdminLayoutProps> = ({ 
  children, 
  pageTitle 
}) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/auth";
  };
  
  // Navigation groups and items - Completely redesigned and reorganized
  const mainNavItems = [
    {
      group: "Gösterge Panelleri",
      items: [
        { 
          icon: LayoutDashboard, 
          label: "Genel Dashboard", 
          href: "/admin" 
        },
        { 
          icon: BarChart3, 
          label: "Satış Analitikleri", 
          href: "/admin/analytics/sales" 
        },
        { 
          icon: Users, 
          label: "Müşteri Analitikleri", 
          href: "/admin/analytics/customers" 
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
          label: "Tüm Rezervasyonlar", 
          href: "/admin/bookings", 
          badge: "Yeni", 
          badgeVariant: "destructive" 
        },
        { 
          icon: Calendar, 
          label: "Günlük Program", 
          href: "/admin/bookings/daily" 
        },
        { 
          icon: CreditCard, 
          label: "Ödemeler", 
          href: "/admin/payments" 
        },
        { 
          icon: FileText, 
          label: "Biletler & Makbuzlar", 
          href: "/admin/tickets" 
        }
      ]
    },
  ];
  
  const marketingNavItems = [
    {
      group: "Müşteri Yönetimi",
      items: [
        { 
          icon: Users, 
          label: "Kullanıcı Listesi", 
          href: "/admin/users"
        },
        { 
          icon: ShieldCheck, 
          label: "Üyelik Programları", 
          href: "/admin/membership-programs" 
        },
        { 
          icon: Star, 
          label: "Yorumlar & Değerlendirmeler", 
          href: "/admin/reviews" 
        },
        { 
          icon: MessageSquare, 
          label: "Destek Talepleri", 
          href: "/admin/support-requests" 
        }
      ]
    },
    {
      group: "Pazarlama & Kampanyalar",
      items: [
        { 
          icon: BellRing, 
          label: "Kampanya Yönetimi", 
          href: "/admin/campaigns" 
        },
        { 
          icon: Mail, 
          label: "E-posta Pazarlama", 
          href: "/admin/email-marketing"
        },
        { 
          icon: TrendingUp, 
          label: "İndirim & Promosyonlar", 
          href: "/admin/promotions" 
        },
        { 
          icon: MessageSquare, 
          label: "WhatsApp Pazarlama", 
          href: "/admin/whatsapp", 
          badge: "Aktif", 
          badgeVariant: "outline" 
        }
      ]
    },
    {
      group: "Satış Kanalları",
      items: [
        { 
          icon: Globe, 
          label: "Online Satış", 
          href: "/admin/sales-channels/online" 
        },
        { 
          icon: Building, 
          label: "Acenteler & Bayiler", 
          href: "/admin/sales-channels/agencies" 
        },
        { 
          icon: Users, 
          label: "Kurumsal Müşteriler", 
          href: "/admin/sales-channels/corporate" 
        }
      ]
    },
    {
      group: "Fiyatlandırma & Gelir",
      items: [
        { 
          icon: TrendingUp, 
          label: "Dinamik Fiyatlandırma", 
          href: "/admin/dynamic-pricing" 
        },
        { 
          icon: CircleDollarSign, 
          label: "Gelir Yönetimi", 
          href: "/admin/revenue-management" 
        },
        { 
          icon: Euro, 
          label: "Para Birimleri & Kurlar", 
          href: "/admin/currencies" 
        }
      ]
    }
  ];
  
  const contentNavItems = [
    {
      group: "Ürün Yönetimi",
      items: [
        { 
          icon: Ship, 
          label: "Feribot Rotaları", 
          href: "/admin/routes" 
        },
        { 
          icon: Anchor, 
          label: "Limanlar", 
          href: "/admin/ports" 
        },
        { 
          icon: Calendar, 
          label: "Sefer Programları", 
          href: "/admin/schedules" 
        },
        { 
          icon: PackageOpen, 
          label: "Ekstra Hizmetler & Paketler", 
          href: "/admin/services" 
        }
      ]
    },
    {
      group: "İçerik & Yerelleştirme",
      items: [
        { 
          icon: FileText, 
          label: "Web Sayfaları", 
          href: "/admin/pages" 
        },
        { 
          icon: PictureInPicture, 
          label: "Medya & Görseller", 
          href: "/admin/media" 
        },
        { 
          icon: Languages, 
          label: "Dil & Çeviriler", 
          href: "/admin/languages" 
        },
        { 
          icon: Globe, 
          label: "Bölgesel Ayarlar", 
          href: "/admin/regional-settings" 
        }
      ]
    },
    {
      group: "Sistem & Entegrasyonlar",
      items: [
        { 
          icon: Settings, 
          label: "Site Ayarları", 
          href: "/admin/settings" 
        },
        { 
          icon: Shield, 
          label: "Güvenlik & Yetkiler", 
          href: "/admin/security" 
        },
        { 
          icon: Key, 
          label: "API & Entegrasyonlar", 
          href: "/admin/integrations" 
        },
        { 
          icon: Database, 
          label: "Veritabanı & Yedekleme", 
          href: "/admin/database" 
        }
      ]
    }
  ];
  
  // Function to filter navigation items based on search query
  const filterNavItems = (items: any[], query: string) => {
    if (!query) return items;
    
    return items.map(group => {
      const filteredItems = group.items.filter(item => 
        item.label.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        ...group,
        items: filteredItems
      };
    }).filter(group => group.items.length > 0);
  };
  
  const filteredMainNavItems = filterNavItems(mainNavItems, searchQuery);
  const filteredMarketingNavItems = filterNavItems(marketingNavItems, searchQuery);
  const filteredContentNavItems = filterNavItems(contentNavItems, searchQuery);
  
  // Combine all nav items based on active tab
  const getActiveNavItems = () => {
    switch (activeTab) {
      case "all":
        return [...filteredMainNavItems, ...filteredMarketingNavItems, ...filteredContentNavItems];
      case "main":
        return filteredMainNavItems;
      case "marketing":
        return filteredMarketingNavItems;
      case "content":
        return filteredContentNavItems;
      default:
        return [...filteredMainNavItems, ...filteredMarketingNavItems, ...filteredContentNavItems];
    }
  };
  
  const activeNavItems = getActiveNavItems();
  
  // Check if the current location matches a nav item
  const isNavItemActive = (href: string) => {
    return location === href;
  };
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-4">
          <a href="/admin" className="flex items-center gap-2 font-bold text-lg">
            <Ship className="h-6 w-6 text-primary" />
            <span>Ferry Admin</span>
          </a>
        </div>
        
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
              <TabsTrigger value="main">Panel</TabsTrigger>
              <TabsTrigger value="marketing">Satış</TabsTrigger>
              <TabsTrigger value="content">Sistem</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <ScrollArea className="h-[calc(100vh-theme(spacing.16)-theme(spacing.16)-3px)]">
          <div className="px-3 py-2">
            {activeNavItems.map((group, groupIndex) => (
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
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetHeader className="h-16 px-4 border-b">
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
                <TabsTrigger value="main">Panel</TabsTrigger>
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
      <main className="flex-1 lg:pl-64">
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
                      <span className="sr-only">Siteye Git</span>
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
                  <Button variant="outline" size="icon" asChild>
                    <a href="/admin/notifications">
                      <Bell className="h-4 w-4" />
                      <span className="sr-only">Bildirimler</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bildirimler</p>
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

export default ModernAdminLayout;