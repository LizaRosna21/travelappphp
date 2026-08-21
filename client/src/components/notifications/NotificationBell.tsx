import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationsContainer from './NotificationsContainer';
import useNotifications from '@/hooks/use-notifications';

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    showNotifications,
    toggleNotifications,
    handleMarkAllAsRead,
    setShowNotifications,
  } = useNotifications();

  // Bildirimi gösterme panelini kapat
  const handleClickOutside = (e: MouseEvent) => {
    if (showNotifications) {
      // Bildirim container'ı dışında bir tıklama kontrol et
      const target = e.target as HTMLElement;
      if (!target.closest('.notifications-container') && !target.closest('.notification-bell')) {
        setShowNotifications(false);
      }
    }
  };

  // Dışarı tıklanınca kapat
  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="notification-bell relative h-9 w-9 rounded-full p-0"
        onClick={toggleNotifications}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-red-500 p-0 text-center text-[10px] leading-5"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <div className="notifications-container">
        <NotificationsContainer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      </div>
    </>
  );
};

export default NotificationBell;