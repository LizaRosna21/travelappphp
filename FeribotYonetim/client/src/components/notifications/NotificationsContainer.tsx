import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import BookingNotification from './BookingNotification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: string;
  actionUrl?: string;
  metadata?: any;
}

// Gerçek rezervasyon bildirimlerini filtrele
const filterBookingNotifications = (notifications: Notification[]) => {
  return notifications.filter(notification => 
    notification.type === 'booking' && notification.relatedType === 'booking' && notification.relatedId
  );
};

interface NotificationsContainerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllAsRead?: () => void;
}

const NotificationsContainer: React.FC<NotificationsContainerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead
}) => {
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Okunmamış bildirimlerin sayısını hesapla
  useEffect(() => {
    if (notifications) {
      const count = notifications.filter(n => !n.isRead).length;
      setUnreadCount(count);
    }
  }, [notifications]);

  // Bildirimi okundu olarak işaretle
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
      if (!res.ok) {
        throw new Error("Bildirim okundu olarak işaretlenirken bir hata oluştu.");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Bildirimleri yeniden yükle
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filtrelenmiş bildirimleri al
  const bookingNotifications = filterBookingNotifications(notifications);

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-16 z-50 w-full max-w-sm">
      <Card className="p-0 shadow-lg">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Bildirimler</span>
            {unreadCount > 0 && (
              <Badge className="bg-blue-500">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && onMarkAllAsRead && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                Tümünü Okundu İşaretle
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-3">
          {bookingNotifications.length > 0 ? (
            bookingNotifications.map(notification => (
              <BookingNotification 
                key={notification.id}
                id={notification.id}
                bookingId={notification.relatedId!}
                bookingReference={notification.metadata?.bookingReference || "N/A"}
                status={notification.metadata?.status || "pending"}
                message={notification.message}
                createdAt={notification.createdAt}
                isRead={notification.isRead}
                onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              />
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p>Henüz bildiriminiz bulunmuyor.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsContainer;