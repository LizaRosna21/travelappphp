import React, { ReactNode, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Layers,
  Settings,
  Users,
  Ticket,
  Globe,
  MapPin,
  Ship,
  Bell,
  Calendar,
  CreditCard,
  Package,
  MessageSquare,
  Database,
  TrendingUp,
  Anchor,
  Menu,
  X,
  Home,
  PanelLeft,
  Inbox,
  ChevronDown,
  ChevronRight,
  LogOut,
  Key,
  Search,
  Rocket,
  Bus,
  PlaneTakeoff,
  Bookmark,
  Euro,
  CircleDollarSign,
  BadgePercent,
  Star,
  Languages,
  BellRing,
  FileSpreadsheet,
  FileText,
  LifeBuoy,
  Mail,
  Layout,
  Cog,
  UserCog,
  BarChartHorizontal,
  Gauge,
  LineChart,
  PieChart,
  Building,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  path, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  path: string; 
  onClick?: () => void;
}) => {
  const [location] = useLocation();
  const isActive = location === path;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? "default" : "ghost"}
          size="sm"
          className="w-full justify-start"
          onClick={onClick}
          asChild
        >
          <a href={path}>
            <Icon className="mr-2 h-4 w-4" />
            <span>{label}</span>
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

const NavGroup = ({ 
  icon: Icon, 
  label, 
  children,
  defaultOpen = false
}: { 
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <Icon className="mr-2 h-4 w-4" />
            <span>{label}</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/auth");
  };

  // Ana modüller organizasyonu
  const moduleGroups = [
    {
      groupName: "Genel",
      items: [
        {
          label: "Dashboard",
          path: "/admin",
          icon: BarChart3,
          description: "Sistem genel bakış ve analytics"
        },
        {
          label: "Gelişmiş Dashboard",
          path: "/admin/advanced-dashboard",
          icon: Gauge,
          description: "Detaylı veri analizi ve raporlama"
        }
      ]
    },
    {
      groupName: "Ürün Yönetimi",
      items: [
        {
          label: "Rotalar",
          path: "/admin/routes",
          icon: Globe,
          description: "Feribot rotaları yönetimi"
        },
        {
          label: "Limanlar",
          path: "/admin/ports",
          icon: Anchor,
          description: "Liman bilgileri ve yapılandırması"
        },
        {
          label: "Tarifeler",
          path: "/admin/schedules",
          icon: Calendar,
          description: "Sefer programları ve takvim"
        },
        {
          label: "Ürünler",
          path: "/admin/products",
          icon: Package,
          description: "Ek hizmetler ve yardımcı ürünler"
        },
        {
          label: "Mars Rotası",
          path: "/admin/marsoldaki",
          icon: Rocket,
          description: "Özel Mars rotaları yönetimi"
        }
      ]
    },
    {
      groupName: "Rezervasyon ve Ödeme",
      items: [
        {
          label: "Rezervasyonlar",
          path: "/admin/bookings",
          icon: Ticket,
          description: "Rezervasyon listeleme ve yönetim"
        },
        {
          label: "Ödemeler",
          path: "/admin/payments",
          icon: CreditCard,
          description: "Tüm ödemeleri görüntüleme ve işleme"
        },
        {
          label: "Ödeme Ayarları",
          path: "/admin/payment-settings",
          icon: CircleDollarSign,
          description: "Ödeme yöntemleri ve yapılandırma"
        }
      ]
    },
    {
      groupName: "Müşteri Yönetimi",
      items: [
        {
          label: "Üyeler",
          path: "/admin/members",
          icon: Users,
          description: "Kullanıcı yönetimi ve bilgileri"
        },
        {
          label: "Üyelik Seviyeleri",
          path: "/admin/membership-tiers",
          icon: ShieldCheck,
          description: "Sadakat programı ve üyelik düzeyleri"
        },
        {
          label: "Değerlendirmeler",
          path: "/admin/reviews",
          icon: Star,
          description: "Müşteri değerlendirmeleri ve yorumları"
        }
      ]
    },
    {
      groupName: "B2B Yönetimi",
      items: [
        {
          label: "B2B Paneli",
          path: "/admin/b2b",
          icon: Building,
          description: "Acente ve iş ortağı yönetimi"
        }
      ]
    },
    {
      groupName: "Pazarlama",
      items: [
        {
          label: "Pazarlama",
          path: "/admin/marketing",
          icon: BellRing,
          description: "Pazarlama kampanyaları ve promosyonlar"
        },
        {
          label: "WhatsApp",
          path: "/admin/whatsapp",
          icon: MessageSquare,
          description: "WhatsApp entegrasyonu ve mesajlaşma"
        }
      ]
    },
    {
      groupName: "Finansal Yönetim",
      items: [
        {
          label: "Gelir Yönetimi",
          path: "/admin/revenue-management",
          icon: TrendingUp,
          description: "Gelir optimizasyonu ve fiyatlandırma stratejileri"
        },
        {
          label: "Para Birimleri",
          path: "/admin/currencies",
          icon: Euro,
          description: "Para birimi yönetimi ve kurlar"
        }
      ]
    },
    {
      groupName: "İçerik ve Uluslararasılaştırma",
      items: [
        {
          label: "İçerik Yönetimi",
          path: "/admin/content-management",
          icon: Layout,
          description: "Sayfa ve içerik düzenleme"
        },
        {
          label: "Diller",
          path: "/admin/languages",
          icon: Languages,
          description: "Çoklu dil desteği ve dil ayarları"
        },
        {
          label: "Çeviri Yönetimi",
          path: "/admin/translation-management",
          icon: FileText,
          description: "Sistem çevirilerini düzenleme ve eksik çevirileri tamamlama"
        }
      ]
    },
    {
      groupName: "Entegrasyonlar",
      items: [
        {
          label: "API Yönetimi",
          path: "/admin/api-management",
          icon: Key,
          description: "API anahtarları ve yetkilendirmeleri"
        },
        {
          label: "Backoffice API",
          path: "/admin/backoffice-integration",
          icon: Database,
          description: "Back-office sistemleri entegrasyonu"
        }
      ]
    },
    {
      groupName: "Sistem",
      items: [
        {
          label: "Sistem Ayarları",
          path: "/admin/settings",
          icon: Settings,
          description: "Genel sistem yapılandırması"
        },
        {
          label: "Yedekleme & Kurtarma",
          path: "/admin/backup-management",
          icon: Database,
          description: "Veri yedekleme ve geri yükleme"
        }
      ]
    }
  ];

  return (
    <TooltipProvider>
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar - Always visible with fixed position */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r bg-card h-screen fixed top-0 left-0 z-50 shadow-lg">
        <div className="p-4 border-b">
          <a href="/" className="flex items-center space-x-2">
            <Ship className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Ferry Admin</span>
          </a>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="mb-4">
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Modül ara..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {moduleGroups.map((group) => {
              // Arama sonuçlarını filtrele
              const filteredItems = group.items.filter(item => 
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              // Eğer hiç sonuç yoksa grubu gösterme
              if (filteredItems.length === 0) return null;
              
              return (
                <div key={group.groupName} className="mb-4">
                  <h4 className="mb-1 px-2 text-sm font-semibold text-foreground/70">{group.groupName}</h4>
                  <NavGroup icon={group.items[0].icon} label={group.groupName} defaultOpen={searchQuery !== ""}>
                    {filteredItems.map((item) => (
                      <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                      />
                    ))}
                  </NavGroup>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={user?.profileImage || ""} />
                  <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.username || "User"}</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/admin/profile">Profile Settings</a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      
      {/* Mobile Header & Sidebar */}
      <div className="flex flex-col flex-1 lg:ml-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex items-center mb-6">
                <Ship className="h-6 w-6 text-primary mr-2" />
                <span className="font-bold text-xl">Ferry Admin</span>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </div>
              
              <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="space-y-4 px-1 py-2">
                  <div className="mb-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Modül ara..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {moduleGroups.map((group) => {
                    // Arama sonuçlarını filtrele
                    const filteredItems = group.items.filter(item => 
                      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    
                    // Eğer hiç sonuç yoksa grubu gösterme
                    if (filteredItems.length === 0) return null;
                    
                    return (
                      <div key={group.groupName} className="mb-4">
                        <h4 className="mb-1 px-2 text-sm font-semibold text-foreground/70">{group.groupName}</h4>
                        <NavGroup icon={group.items[0].icon} label={group.groupName} defaultOpen={searchQuery !== ""}>
                          {filteredItems.map((item) => (
                            <NavItem
                              key={item.path}
                              icon={item.icon}
                              label={item.label}
                              path={item.path}
                            />
                          ))}
                        </NavGroup>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          <a href="/" className="flex items-center gap-2 lg:hidden">
            <Ship className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Ferry Admin</span>
          </a>
          
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImage || ""} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/admin/profile">Profile Settings</a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 p-4 sm:p-6 pb-12">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            </div>
          )}
          {children}
        </main>
        
        {/* Modern Footer */}
        <footer className="border-t bg-card/80 backdrop-blur-sm">
          <div className="container flex flex-col sm:flex-row items-center justify-between py-4 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <Ship className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Ferry Admin Panel
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/admin/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sistem Ayarları
              </a>
              <a href="/admin/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Yardım
              </a>
              <a href="/admin/documentation" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dokümantasyon
              </a>
              <span className="text-sm text-muted-foreground">
                v1.2.0
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
    </TooltipProvider>
  );
};

export { AdminLayout };
export default AdminLayout;