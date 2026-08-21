import React from 'react';
import { Bell, CheckCircle, AlertTriangle, Clock, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface BookingNotificationProps {
  id: number;
  bookingId: number;
  bookingReference: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  message: string;
  createdAt: string;
  isRead: boolean;
  onMarkAsRead?: (id: number) => void;
}

export const BookingNotification: React.FC<BookingNotificationProps> = ({
  id,
  bookingId,
  bookingReference,
  status,
  message,
  createdAt,
  isRead,
  onMarkAsRead
}) => {
  const [, navigate] = useLocation();

  // Notification için simge ve renk belirleme
  const getStatusIcon = () => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'refunded':
        return <RotateCw className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'cancelled': return 'İptal Edildi';
      case 'pending': return 'Beklemede';
      case 'completed': return 'Tamamlandı';
      case 'refunded': return 'İade Edildi';
      default: return 'Bilinmiyor';
    }
  };

  // Tarihi formatla
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: tr });
    } catch (error) {
      console.error("Tarih formatlama hatası:", error);
      return dateString;
    }
  };

  // Bildirimi görüntüleme
  const handleView = () => {
    if (onMarkAsRead && !isRead) {
      onMarkAsRead(id);
    }
    navigate(`/my-bookings/${bookingId}`);
  };

  return (
    <Card className={`mb-2 overflow-hidden transition-all ${!isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">{getStatusIcon()}</div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Rezervasyon {bookingReference}</span>
                <Badge variant="outline" className={`${getStatusColor()} border-0`}>
                  {getStatusText()}
                </Badge>
                {!isRead && <Badge className="bg-blue-500">Yeni</Badge>}
              </div>
              <span className="text-xs text-gray-500">{formatDate(createdAt)}</span>
            </div>
            
            <p className="mt-1 text-sm text-gray-600">{message}</p>
            
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={handleView}>
                Görüntüle
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingNotification;