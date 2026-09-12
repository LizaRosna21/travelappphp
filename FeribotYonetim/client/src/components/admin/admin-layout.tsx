import React from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import {
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Package,
  BarChart3,
  Settings,
  Users,
  Globe,
  DatabaseBackup,
  Compass,
  AreaChart,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [location] = useLocation();

  const menuItems = [
    { 
      href: "/admin/dashboard", 
      label: "Gösterge Paneli", 
      icon: <LayoutDashboard className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/routes", 
      label: "Rota Yönetimi", 
      icon: <Compass className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/bookings", 
      label: "Rezervasyonlar", 
      icon: <Package className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/users", 
      label: "Kullanıcılar", 
      icon: <Users className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/marketing", 
      label: "Pazarlama", 
      icon: <BarChart3 className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/revenue-management", 
      label: "Gelir Yönetimi", 
      icon: <AreaChart className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/payment-settings", 
      label: "Ödeme Ayarları", 
      icon: <CreditCard className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/integrations", 
      label: "Entegrasyonlar", 
      icon: <Globe className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/backup-management", 
      label: "Yedekleme Yönetimi", 
      icon: <DatabaseBackup className="w-5 h-5 mr-3" /> 
    },
    { 
      href: "/admin/settings", 
      label: "Sistem Ayarları", 
      icon: <Settings className="w-5 h-5 mr-3" /> 
    },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Panel | Ferry Ticket Management System</title>
      </Helmet>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-64 bg-white border-r">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-primary">Admin Paneli</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center">
              <LifeBuoy className="w-5 h-5 mr-3 text-gray-500" />
              <span className="text-sm text-gray-700">Yardım</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Header */}
          <div className="md:hidden bg-white p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">Admin Paneli</h1>
            <button
              className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-0">{children}</div>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;