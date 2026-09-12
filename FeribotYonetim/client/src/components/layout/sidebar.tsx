import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Route, 
  Users, 
  BookOpen, 
  Settings, 
  Ship,
  ChevronLeft,
  ChevronRight,
  BarChart4,
  CreditCard,
  MessageSquare,
  Globe,
  Database,
  Key,
  Languages,
  DollarSign,
  Star,
  BadgeCheck,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return null;
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const items = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/admin/dashboard",
    },
    {
      title: "Routes",
      icon: <Route className="h-5 w-5" />,
      href: "/admin/routes",
    },
    {
      title: "Bookings",
      icon: <BookOpen className="h-5 w-5" />,
      href: "/admin/bookings",
    },
    {
      title: "Users",
      icon: <Users className="h-5 w-5" />,
      href: "/admin/users",
    },
    {
      title: "Marketing",
      icon: <BarChart4 className="h-5 w-5" />,
      href: "/admin/marketing",
    },
    {
      title: "Payment Settings",
      icon: <CreditCard className="h-5 w-5" />,
      href: "/admin/payment-settings",
    },
    {
      title: "Languages",
      icon: <Languages className="h-5 w-5" />,
      href: "/admin/languages",
    },
    {
      title: "Currencies",
      icon: <DollarSign className="h-5 w-5" />,
      href: "/admin/currencies",
    },
    {
      title: "Member Reviews",
      icon: <MessageCircle className="h-5 w-5" />,
      href: "/admin/reviews",
    },
    {
      title: "Membership Tiers",
      icon: <BadgeCheck className="h-5 w-5" />,
      href: "/admin/membership-tiers",
    },
    {
      title: "WhatsApp",
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/admin/whatsapp",
    },
    {
      title: "API Management",
      icon: <Key className="h-5 w-5" />,
      href: "/admin/api-management",
    },
    {
      title: "Ports",
      icon: <Globe className="h-5 w-5" />,
      href: "/admin/ports",
    },
    {
      title: "Backup",
      icon: <Database className="h-5 w-5" />,
      href: "/admin/backup-management",
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/admin/settings",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-white transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-[250px]",
        className
      )}
    >
      <div className="flex h-14 items-center px-4 border-b">
        {!isCollapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg text-primary"
          >
            <Ship className="h-6 w-6" />
            <span>FerryBooking</span>
          </Link>
        )}
        {isCollapsed && (
          <Ship className="h-6 w-6 text-primary mx-auto" />
        )}
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {items.map((item, index) => (
            <Link key={index} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 font-normal",
                  isCollapsed && "justify-center",
                  location === item.href && "bg-primary/10 font-medium text-primary"
                )}
              >
                {item.icon}
                {!isCollapsed && <span>{item.title}</span>}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={toggleSidebar}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
