import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  LayoutDashboard,
  Ship,
  Calendar,
  Users,
  Settings,
  BarChart2,
  Globe,
  Server,
  Database,
  CreditCard,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

type AdminLayoutProps = {
  children: React.ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [location] = useLocation();
  // Sidebar her zaman açık olacak
  const [sidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const menuItems = [
    { path: '/admin/dashboard', label: 'Genel Durum', icon: <LayoutDashboard size={18} />, active: true },
    { path: '/admin/advanced-dashboard', label: 'Gelişmiş Panel', icon: <BarChart2 size={18} />, active: true },
    { path: '/admin/routes', label: 'Rotalar', icon: <Ship size={18} />, active: true },
    { path: '/admin/bookings', label: 'Rezervasyonlar', icon: <Calendar size={18} />, active: true },
    { path: '/admin/users', label: 'Kullanıcı Yönetimi', icon: <Users size={18} />, active: true },
    { path: '/admin/settings', label: 'Sistem Ayarları', icon: <Settings size={18} />, active: true },
    { path: '/admin/marketing', label: 'Pazarlama & Kampanyalar', icon: <Globe size={18} />, active: true },
    { path: '/admin/backoffice-integration', label: 'Backoffice Entegrasyonu', icon: <Server size={18} />, active: true },
    { path: '/admin/backup-management', label: 'Yedekleme & Kurtarma', icon: <Database size={18} />, active: true },
    { path: '/admin/payment-settings', label: 'Ödeme Sistemleri', icon: <CreditCard size={18} />, active: true },
    { path: '/admin/revenue-management', label: 'Gelir Yönetimi', icon: <BarChart2 size={18} />, active: true },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <aside
        className="bg-white shadow-lg z-10 hidden md:block fixed h-full w-64 border-r border-gray-200"
      >
        <div className="flex items-center p-5 justify-between border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          <nav className="mt-2 px-2">
            <div className="mb-4 px-3 py-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                YÖNETİM PANELİ
              </h2>
            </div>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <div
                    onClick={() => window.location.href = item.path}
                    className={`flex items-center py-3 px-4 justify-start rounded-md hover:bg-primary-50 hover:text-primary transition-colors cursor-pointer ${
                      location === item.path ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex-shrink-0 mr-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-30 md:hidden">
        <button
          onClick={toggleMobileMenu}
          className="rounded-full p-2 bg-white shadow-md hover:bg-gray-100 transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden">
          <aside className="bg-white w-64 h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
              <button
                onClick={toggleMobileMenu}
                className="rounded-full p-1 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto">
              <nav className="mt-2 px-2">
                <div className="mb-4 px-3 py-2">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    YÖNETİM PANELİ
                  </h2>
                </div>
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.path}>
                      <div
                        onClick={() => {
                          toggleMobileMenu();
                          window.location.href = item.path;
                        }}
                        className={`flex items-center py-3 px-4 rounded-md hover:bg-primary-50 hover:text-primary transition-colors cursor-pointer ${
                          location === item.path ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span className="flex-shrink-0 mr-3">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto md:ml-64"
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;