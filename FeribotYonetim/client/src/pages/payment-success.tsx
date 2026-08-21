import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccessPage = () => {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const paymentIntentId = searchParams.get('payment_intent');
  const bookingRef = searchParams.get('booking_ref');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Eğer booking_ref parametresi varsa, rezervasyon detaylarını al
    const getBookingDetails = async () => {
      if (!bookingRef) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/bookings/reference/${bookingRef}`);
        
        if (!response.ok) {
          throw new Error('Rezervasyon detayları alınamadı');
        }
        
        const data = await response.json();
        setBookingDetails(data);
      } catch (error) {
        console.error('Rezervasyon bilgisi alınamadı:', error);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Rezervasyon bilgileri alınamadı."
        });
      } finally {
        setLoading(false);
      }
    };
    
    getBookingDetails();
  }, [bookingRef, toast]);

  // Bilet indirme fonksiyonu
  const handleDownloadTicket = async () => {
    if (!bookingRef) return;
    
    try {
      // API isteği ile bilet indirme
      const response = await fetch(`/api/tickets/download/${bookingRef}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Bilet indirilemedi');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bilet-${bookingRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Bilet indirme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bilet indirilemedi. Lütfen daha sonra tekrar deneyin."
      });
    }
  };

  return (
    <div className="container max-w-3xl py-12">
      <Card className="border-green-100 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl text-green-700">
            Ödeme Başarılı
          </CardTitle>
          <CardDescription className="text-center text-green-600">
            Ödemeniz başarıyla gerçekleştirildi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookingDetails ? (
            <div className="space-y-3 text-sm rounded-lg bg-white p-4 border border-green-100">
              <div className="grid grid-cols-2">
                <span className="font-medium">Rezervasyon No:</span>
                <span>{bookingDetails.bookingReference}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="font-medium">Toplam Tutar:</span>
                <span>{bookingDetails.totalPrice} {bookingDetails.currency}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="font-medium">Kalkış Limanı:</span>
                <span>{bookingDetails.departurePort}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="font-medium">Varış Limanı:</span>
                <span>{bookingDetails.arrivalPort}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="font-medium">Tarih:</span>
                <span>{new Date(bookingDetails.departureDate).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="font-medium">Yolcu Sayısı:</span>
                <span>{bookingDetails.passengerCount || '1'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              {loading ? (
                <p>Rezervasyon bilgileri yükleniyor...</p>
              ) : (
                <p>
                  {paymentIntentId ? (
                    <>Ödeme No: {paymentIntentId}</>
                  ) : (
                    <>Ödemeniz başarıyla tamamlandı.</>
                  )}
                </p>
              )}
            </div>
          )}
          
          <div className="bg-green-100 p-4 rounded-lg text-green-800 text-sm">
            <p className="font-medium">Önemli Bilgiler:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Biletinizin bir kopyası e-posta adresinize gönderildi.</li>
              <li>Yolculuk günü biletinizi basılı halde veya dijital olarak yanınızda bulundurunuz.</li>
              <li>Rezervasyonunuzla ilgili değişiklik veya iptal için müşteri hizmetlerimizle iletişime geçebilirsiniz.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-3">
          {bookingRef && (
            <Button onClick={handleDownloadTicket} className="w-full sm:w-auto">
              Bileti İndir
            </Button>
          )}
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => navigate('/')}
          >
            Ana Sayfaya Dön
          </Button>
          <Link href="/my-bookings" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">
              Rezervasyonlarım
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;