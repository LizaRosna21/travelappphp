import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useWebSocketConnection } from './use-websocket-connection';
import { Notification } from '@/components/notifications/NotificationsContainer';
import { useToast } from './use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Kullanıcı bildirimleri sorgusunu çalıştır
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/user/notifications'],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiRequest('GET', '/api/user/notifications');
      if (!res.ok) throw new Error('Bildirimler alınamadı');
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // 30 saniyede bir yenile
  });

  // WebSocket bağlantısı kur
  const { isConnected, lastMessage } = useWebSocketConnection({
    path: '/ws',
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Bildirim türünü işle
        if (data.type === 'notification') {
          // Kullanıcı ID kontrolü yaparak gelen bildirimin bize ait olduğundan emin olalım
          if (user && data.data && data.data.userId === user.id) {
            // Yeni bildirimleri göstermek için sesli ve görsel bildirim
            if (data.data.type === 'booking') {
              // Toast bildirimi göster
              toast({
                title: data.data.title,
                description: data.data.message,
                variant: "default",
              });
              
              // Bildirimleri yenile
              queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
            }
          }
        } else if (data.type === 'unread_notifications_count') {
          // Okunmamış bildirim sayısı güncellemesi
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('WebSocket mesajı işlenirken hata:', error);
      }
    }
  });

  // Bildirimlerin görüntülenmesini aç/kapat
  const toggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Kullanıcı girişi gerekli');
      const res = await apiRequest('PATCH', '/api/notifications/mark-all-read', {});
      if (!res.ok) throw new Error('Bildirimler okundu işaretlenemedi');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
      setUnreadCount(0);
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Bildirimleri okundu olarak işaretle
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  // Bildirimlerdeki okunmamış öğe sayısını takip et
  useEffect(() => {
    if (notifications) {
      const count = notifications.filter(n => !n.isRead).length;
      setUnreadCount(count);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    showNotifications,
    toggleNotifications,
    handleMarkAllAsRead,
    setShowNotifications,
    isWebSocketConnected: isConnected
  };
};

export default useNotifications;