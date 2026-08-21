import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface PaymentIframeProps {
  iframeUrl: string;
  onPaymentResult: (result: {
    status: string;
    paymentId: string;
    provider: string;
  }) => void;
  provider: string;
}

export function PaymentIframe({ 
  iframeUrl, 
  onPaymentResult, 
  provider 
}: PaymentIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mesaj dinleyicisi ekleyin
    const handleMessage = (event: MessageEvent) => {
      // Güvenlik için sadece belirli kaynaklardan gelen mesajları işleyin
      // Gerçek bir uygulamada, belirli domain'den gelen mesajları kontrol etmek daha güvenli olur
      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;

        if (data.type === 'payment_response') {
          onPaymentResult({
            status: data.status,
            paymentId: data.paymentId,
            provider: data.provider || provider
          });
        }
      } catch (error) {
        console.error('Payment iframe message handling error:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onPaymentResult, provider]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Ödeme sayfası yükleniyor...</span>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          onLoad={handleLoad}
          style={{ 
            width: '100%', 
            height: '500px', 
            border: 'none',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
          allow="payment"
          title="Ödeme Sayfası"
        />
      </CardContent>
    </Card>
  );
}