import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQueryParams } from "@/hooks/use-query-params";
import { Helmet } from "react-helmet";
import { Container } from "@/components/ui/container";
import { Loader2 } from "lucide-react";

export default function DemoPaymentResponsePage() {
  const [, setLocation] = useLocation();
  const queryParams = useQueryParams();
  const provider = queryParams.get("provider");
  const returnUrl = queryParams.get("return_url");
  const status = queryParams.get("status") || "success"; // Default to success for demo
  const paymentId = queryParams.get("payment_id") || "demo_" + Math.random().toString(36).substring(2, 15);
  
  useEffect(() => {
    // Demo yanıtı oluştur
    const responseData = {
      type: "payment_response",
      status: status,
      paymentId: paymentId,
      provider: provider,
    };

    // Ana pencereye mesaj gönder
    if (window.opener) {
      // Eğer bir açılır pencerede isek
      window.opener.postMessage(JSON.stringify(responseData), "*");
      window.close(); // Pencereyi kapat
    } else {
      // Ana sayfada isek, kendi kendimize mesaj gönder
      window.postMessage(JSON.stringify(responseData), "*");
      
      // Kullanıcı deneyimi için kısa bir gecikme sonra yönlendir
      setTimeout(() => {
        if (returnUrl) {
          setLocation(returnUrl);
        } else {
          setLocation("/");
        }
      }, 1500);
    }
  }, [provider, status, paymentId, returnUrl, setLocation]);

  return (
    <>
      <Helmet>
        <title>Ödeme İşlemi Sonucu</title>
      </Helmet>
      
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">Ödeme Sonucu İşleniyor</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Ödeme işleminiz tamamlandı, ana sayfaya yönlendiriliyorsunuz. Lütfen bekleyin...
          </p>
        </div>
      </Container>
    </>
  );
}