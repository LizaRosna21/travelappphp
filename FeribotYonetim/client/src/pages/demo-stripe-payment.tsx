import { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

// Ödeme formu için bilgileri saklamak üzere bir tür tanımlıyoruz
interface PaymentFormData {
  name: string;
  email: string;
  amount: number;
}

// Stripe bağlantı durumu için bir tür tanımlıyoruz
type StripeConnectionStatus = "loading" | "ready" | "error";

// Ödeme formu bileşeni
const CheckoutForm = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    name: '',
    email: '',
    amount: amount || 100
  });
  
  // Form verilerini güncelleme işlevi
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? Number(value) : value }));
  };
  
  // Ödeme yapma işlevi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast({
        title: 'Ödeme Hatası',
        description: 'Stripe henüz yüklenmedi, lütfen bekleyin.',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Ödeme niyeti oluştur
      const paymentResponse = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: formData.amount,
          currency: 'try',
          bookingId: 'DEMO-' + Date.now()
        })
      });
      
      if (!paymentResponse.ok) {
        throw new Error('Ödeme başlatılamadı');
      }
      
      const { clientSecret, paymentId } = await paymentResponse.json();
      
      // Kredi kartı ödemesini onayla
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Kart bilgileri alınamadı');
      }
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.name,
            email: formData.email
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (paymentIntent?.status === 'succeeded') {
        // Ödeme başarılı olduysa rezervasyonu onayla
        const confirmResponse = await fetch('/api/stripe/confirm-booking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentIntentId: paymentId
          })
        });
        
        if (!confirmResponse.ok) {
          throw new Error('Rezervasyon onaylanamadı');
        }
        
        toast({
          title: 'Ödeme Başarılı!',
          description: 'Ödemeniz başarıyla tamamlandı.',
        });
        
        // Başarılı ödeme sonrası yönlendirme (opsiyonel)
        setLocation('/payment-success');
      }
    } catch (error) {
      console.error('Ödeme hatası:', error);
      toast({
        title: 'Ödeme Hatası',
        description: error instanceof Error ? error.message : 'Ödeme işlemi sırasında bir hata oluştu',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Ad Soyad</Label>
        <Input 
          id="name" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          placeholder="Kredi kartı sahibinin adı" 
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          value={formData.email} 
          onChange={handleChange} 
          placeholder="E-posta adresiniz" 
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="amount">Ödeme Tutarı (TL)</Label>
        <Input 
          id="amount" 
          name="amount" 
          type="number" 
          min="1" 
          step="1" 
          value={formData.amount} 
          onChange={handleChange} 
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="card">Kredi Kartı Bilgileri</Label>
        <div className="border rounded-md p-3 bg-background">
          <CardElement 
            id="card"
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            İşleniyor...
          </>
        ) : (
          `${formData.amount} TL Öde`
        )}
      </Button>
    </form>
  );
};

// Test kartı bilgileri için bileşen
const TestCardInfo = () => (
  <div className="mt-6 p-4 bg-muted rounded-md text-sm">
    <h3 className="font-semibold mb-2">Test Kartı Bilgileri</h3>
    <p>Demo modunda aşağıdaki test kartı bilgilerini kullanabilirsiniz:</p>
    <ul className="list-disc pl-5 mt-2 space-y-1">
      <li>Kart Numarası: <code className="bg-background px-1 rounded">4242 4242 4242 4242</code></li>
      <li>Son Kullanma: <code className="bg-background px-1 rounded">Gelecekteki herhangi bir tarih</code></li>
      <li>CVC: <code className="bg-background px-1 rounded">Herhangi 3 rakam</code></li>
      <li>Posta Kodu: <code className="bg-background px-1 rounded">Herhangi 5 rakam</code></li>
    </ul>
  </div>
);

// Ana sayfa bileşeni
export default function DemoStripePayment() {
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<StripeConnectionStatus>("loading");
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  
  // Stripe durumunu kontrol et
  async function checkStripeStatus() {
    try {
      const response = await fetch('/api/stripe/demo-status');
      if (!response.ok) throw new Error('Stripe durum bilgisi alınamadı');
      
      const data = await response.json();
      setIsDemoMode(data.isDemoMode);
      
      // Stripe yapılandırma bilgilerini al
      const configResponse = await fetch('/api/stripe/config');
      if (!configResponse.ok) throw new Error('Stripe yapılandırma bilgileri alınamadı');
      
      const config = await configResponse.json();
      
      if (config.publicKey) {
        // Stripe'ı yükle
        setStripePromise(loadStripe(config.publicKey));
        setConnectionStatus("ready");
      } else {
        console.error('Stripe public key bulunamadı');
        setConnectionStatus("error");
      }
    } catch (error) {
      console.error('Stripe durumu kontrol edilirken hata:', error);
      setConnectionStatus("error");
      toast({
        title: 'Stripe Bağlantı Hatası',
        description: 'Ödeme sistemi bağlantısı kurulamadı. Demo mod kullanılacak.',
        variant: 'destructive'
      });
    }
  }
  
  // Sayfa yüklendiğinde Stripe durumunu kontrol et
  useEffect(() => {
    checkStripeStatus();
  }, []);
  
  // Başlangıç ödeme tutarı
  const initialAmount = 100;
  
  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Demo Ödeme</CardTitle>
          <CardDescription>
            {isDemoMode 
              ? "Bu bir demo ödeme sayfasıdır. Gerçek ödeme alınmayacaktır." 
              : "Bu sayfada gerçek bir ödeme yapabilirsiniz."}
          </CardDescription>
          {connectionStatus === "error" && (
            <div className="text-sm text-destructive mt-2">
              Stripe bağlantısı kurulamadı. Demo mod kullanılıyor.
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {connectionStatus === "loading" ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Ödeme sistemi yükleniyor...</span>
            </div>
          ) : (
            stripePromise ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm amount={initialAmount} />
              </Elements>
            ) : (
              <div className="text-center py-4 text-destructive">
                Ödeme sistemi yüklenemedi.
              </div>
            )
          )}
          
          {isDemoMode && <TestCardInfo />}
        </CardContent>
        
        <CardFooter className="flex-col space-y-2 text-sm text-muted-foreground">
          <p>Tüm ödeme bilgileri güvenli bir şekilde işlenmektedir.</p>
          {isDemoMode && (
            <p>Demo modunda gerçek ödeme alınmaz, test amaçlı kullanılabilir.</p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}