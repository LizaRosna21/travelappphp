import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import { Container } from "@/components/ui/container";
import { TurkishPaymentForm } from "@/components/payment/TurkishPaymentForm";
import { PaymentIframe } from "@/components/payment/PaymentIframe";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketConnection } from "@/hooks/use-websocket-connection";

export default function TurkishPaymentPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ bookingId: string }>("/payment-turkish/:bookingId");
  const bookingId = params?.bookingId;

  const { toast } = useToast();
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    provider: string;
    paymentId: string;
  } | null>(null);
  
  // WebSocket bağlantısı kur
  const { isConnected, socket } = useWebSocketConnection({
    onMessage: (event) => {
      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;
        
        console.log('WebSocket message received:', data);
        
        // Ödeme durumu güncellemeleri için
        if (data.type === 'payment_update' && data.bookingId === parseInt(bookingId)) {
          console.log('Payment update received:', data);
          
          if (data.status === 'processing') {
            setPaymentStatus('processing');
            toast({
              title: "Ödeme İşleniyor",
              description: "Ödemeniz işleniyor, lütfen bekleyin...",
            });
          } else if (data.status === 'completed') {
            setPaymentStatus('success');
            toast({
              title: "Ödeme Başarılı",
              description: "Ödemeniz başarıyla tamamlandı.",
            });
            
            // Başarılı ödemeden sonra rezervasyon sayfasına yönlendir
            setTimeout(() => {
              setLocation(`/booking-confirmed/${bookingId}`);
            }, 2000);
          } else if (data.status === 'error') {
            setPaymentStatus('error');
            setPaymentError(data.message || 'Ödeme işleminde bir hata oluştu');
            toast({
              title: "Ödeme Hatası",
              description: data.message || 'Ödeme işleminde bir hata oluştu',
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message handling error:', error);
      }
    }
  });

  // Rezervasyon bilgisini getir
  const { 
    data: booking,
    isLoading: isBookingLoading,
    error: bookingError 
  } = useQuery({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  });

  // Türk ödeme sağlayıcısı ile ödeme başlat
  const startPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        `/api/payment/turkish/${data.provider}/initiate`,
        {
          bookingId,
          bookingReference: booking?.bookingReference,
          cardInfo: {
            cardHolderName: data.cardHolderName,
            cardNumber: data.cardNumber.replace(/\s/g, ""),
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            cvv: data.cvv,
          },
          installment: parseInt(data.installment),
          amount: booking?.totalPrice,
          currency: booking?.currency || "TRY",
          returnUrl: `${window.location.origin}/demo-payment-response?provider=${data.provider}&return_url=/booking-confirmed/${bookingId}`,
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        // iframe URL varsa, iframe modunu aktif et
        setPaymentIframeUrl(data.redirectUrl);
        setPaymentDetails({
          provider: data.provider,
          paymentId: data.paymentId,
        });
      } else if (data.success) {
        // Doğrudan başarılı sonuç döndüyse, başarılı olarak işaretle
        setPaymentStatus('success');
        setTimeout(() => {
          setLocation(`/booking-confirmed/${bookingId}`);
        }, 2000);
      }
    },
    onError: (error: Error) => {
      setPaymentStatus('error');
      setPaymentError(error.message || 'Ödeme işlemi başlatılırken bir hata oluştu');
      toast({
        title: "Ödeme Hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Ödeme kontrol mutasyonu
  const checkPaymentMutation = useMutation({
    mutationFn: async (data: {provider: string; paymentId: string}) => {
      const response = await apiRequest(
        "GET",
        `/api/payment/turkish/${data.provider}/status/${data.paymentId}`
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        setPaymentStatus('success');
        toast({
          title: "Ödeme Başarılı",
          description: "Ödemeniz başarıyla tamamlandı.",
        });
        
        // Başarılı ödemeden sonra rezervasyon sayfasına yönlendir
        setTimeout(() => {
          setLocation(`/booking-confirmed/${bookingId}`);
        }, 2000);
      } else if (data.status === 'error') {
        setPaymentStatus('error');
        setPaymentError(data.message || 'Ödeme işleminde bir hata oluştu');
        toast({
          title: "Ödeme Hatası",
          description: data.message || 'Ödeme işleminde bir hata oluştu',
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setPaymentStatus('error');
      setPaymentError(error.message || 'Ödeme durumu kontrol edilirken bir hata oluştu');
      toast({
        title: "Ödeme Durumu Kontrolü Hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Ödeme iframe'den gelen mesajları dinle
  useEffect(() => {
    const handleDemoPaymentResponse = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;

        if (data.type === 'payment_response') {
          // iframe'den gelen ödeme sonucunu işle
          setPaymentIframeUrl(null);
          
          if (data.status === 'success') {
            setPaymentStatus('success');
            toast({
              title: "Ödeme Başarılı",
              description: "Ödemeniz başarıyla tamamlandı.",
            });
            
            // Başarılı ödemeden sonra rezervasyon sayfasına yönlendir
            setTimeout(() => {
              setLocation(`/booking-confirmed/${bookingId}`);
            }, 2000);
          } else {
            setPaymentStatus('error');
            setPaymentError('Ödeme işlemi başarısız oldu.');
            toast({
              title: "Ödeme Hatası",
              description: "Ödeme işlemi başarısız oldu.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Payment response handling error:', error);
      }
    };

    window.addEventListener('message', handleDemoPaymentResponse);

    return () => {
      window.removeEventListener('message', handleDemoPaymentResponse);
    };
  }, [toast, bookingId, setLocation]);

  // Form gönderildiğinde
  const handleSubmit = async (values: any) => {
    setPaymentStatus('processing');
    setPaymentError(null);
    startPaymentMutation.mutate(values);
  };

  // Ödeme sonucunu işle
  const handlePaymentResult = (result: {
    status: string;
    paymentId: string;
    provider: string;
  }) => {
    if (result.status === 'success') {
      // Ödeme durumunu kontrol et
      checkPaymentMutation.mutate({
        provider: result.provider,
        paymentId: result.paymentId,
      });
    } else {
      setPaymentStatus('error');
      setPaymentError('Ödeme işlemi başarısız oldu.');
      toast({
        title: "Ödeme Hatası",
        description: "Ödeme işlemi başarısız oldu.",
        variant: "destructive",
      });
    }
  };

  // Geri dön butonuna tıklandığında
  const handleBack = () => {
    if (paymentIframeUrl) {
      // Eğer iframe modundaysak, ödeme formuna geri dön
      setPaymentIframeUrl(null);
      setPaymentStatus('idle');
    } else {
      // Değilse bir önceki sayfaya geri dön
      setLocation(`/payment-page/${bookingId}`);
    }
  };

  if (isBookingLoading) {
    return (
      <Container className="py-10">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Rezervasyon bilgileri yükleniyor...</span>
        </div>
      </Container>
    );
  }

  if (bookingError) {
    return (
      <Container className="py-10">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold mb-2">Rezervasyon Bilgisi Bulunamadı</h1>
            <p className="text-muted-foreground mb-4">
              Rezervasyon bilgileri yüklenirken bir hata oluştu.
            </p>
            <Button onClick={() => setLocation("/")}>
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ödeme - Turkish Payment Provider</title>
      </Helmet>
      
      <Container className="py-10">
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            {paymentIframeUrl ? "Ödeme Formuna Dön" : "Geri Dön"}
          </Button>
          
          <div className="flex items-center text-sm text-muted-foreground">
            {isConnected ? (
              <Wifi className="h-4 w-4 mr-1 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 mr-1 text-gray-400" />
            )}
            <span>{isConnected ? "Gerçek zamanlı bağlantı aktif" : "Bağlantı beklemede..."}</span>
          </div>
        </div>
        
        {paymentStatus === 'success' ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h1 className="text-xl font-semibold mb-2">Ödeme Başarılı</h1>
              <p className="text-muted-foreground mb-4">
                Ödemeniz başarıyla tamamlandı. Rezervasyon detaylarına yönlendiriliyorsunuz...
              </p>
              <Button onClick={() => setLocation(`/booking-confirmed/${bookingId}`)}>
                Rezervasyon Detaylarına Git
              </Button>
            </CardContent>
          </Card>
        ) : paymentIframeUrl ? (
          <PaymentIframe
            iframeUrl={paymentIframeUrl}
            onPaymentResult={handlePaymentResult}
            provider={paymentDetails?.provider || ""}
          />
        ) : (
          <TurkishPaymentForm
            onSubmit={handleSubmit}
            booking={{
              totalPrice: booking?.totalPrice || "0",
              currency: booking?.currency || "TRY",
              bookingReference: booking?.bookingReference || ""
            }}
            isProcessing={paymentStatus === 'processing' || startPaymentMutation.isPending}
            error={paymentError}
          />
        )}
      </Container>
    </>
  );
}