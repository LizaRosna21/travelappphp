import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, CardElementProps } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Test anahtarları - gerçek anahtarlar environment'tan yüklenecek
const TEST_STRIPE_PUBLIC_KEY = 'pk_test_51O4TFRFZnC8KcXMbrbAHhrzVAeJcfvlK6MixkHSFPRZOcYW9dlKjdmDflQqJWocHNGp6lqmvg3jyPzHPbIGG7kg400xvlJOZwg';

// Stripe instance oluştur
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || TEST_STRIPE_PUBLIC_KEY);

// CardElement stilleri
const CARD_ELEMENT_OPTIONS: CardElementProps['options'] = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Inter", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: true,
};

// Ödeme formu bileşeni
const CheckoutForm = ({ amount, currency = 'try', bookingId, onSuccess }: { 
  amount: number;
  currency?: string;
  bookingId?: number;
  onSuccess?: (paymentIntentId: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Ödeme niyeti oluştur
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency: currency.toLowerCase(),
          }),
        });

        if (!response.ok) {
          throw new Error('Ödeme niyeti oluşturulurken bir hata oluştu');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Ödeme niyeti oluşturma hatası:', err);
        setError('Ödeme işlemi başlatılamadı. Lütfen daha sonra tekrar deneyin.');
      }
    };

    createPaymentIntent();
  }, [amount, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js henüz yüklenmedi
      return;
    }

    if (!cardComplete) {
      // Kart bilgileri eksik
      setError('Lütfen kart bilgilerinizi kontrol edin');
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Kart bilgileri alınamadı');
      }

      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (paymentError) {
        setError(paymentError.message || 'Ödeme işlemi başarısız oldu');
      } else if (paymentIntent.status === 'succeeded') {
        // Ödeme başarılı
        toast({
          title: 'Ödeme başarılı',
          description: 'Ödeme işleminiz başarıyla tamamlandı.',
        });

        // Rezervasyon varsa, güncelle
        if (bookingId && onSuccess) {
          onSuccess(paymentIntent.id);
        } else {
          // Rezervasyon yoksa, başarılı ödeme sayfasına yönlendir
          setLocation('/payment-success');
        }
      }
    } catch (err: any) {
      console.error('Ödeme işlemi hatası:', err);
      setError(err.message || 'Ödeme işlemi sırasında bir hata oluştu');
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6">
        <Label htmlFor="card-element" className="block mb-2 text-sm font-medium">
          Kart Bilgileri
        </Label>
        <div className="p-3 border rounded-md">
          <CardElement 
            id="card-element"
            options={CARD_ELEMENT_OPTIONS} 
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing || !cardComplete}
        className="w-full"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            İşleniyor...
          </>
        ) : (
          `${amount} ${currency.toUpperCase()} Öde`
        )}
      </Button>
    </form>
  );
};

// Ana bileşen
const StripePaymentPage = () => {
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('try');
  const [isTestMode, setIsTestMode] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Başarılı ödeme sonrası işlem
  const handlePaymentSuccess = (paymentIntentId: string) => {
    toast({
      title: 'Ödeme başarılı',
      description: 'Rezervasyonunuz onaylandı.',
    });
    
    // Başarılı ödeme sayfasına yönlendir
    setLocation('/payment-success');
  };

  return (
    <div className="container max-w-4xl py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Güvenli Ödeme</CardTitle>
          <CardDescription>
            Stripe güvenli ödeme sistemi ile ödemenizi tamamlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-6">
              <div>
                <Label htmlFor="amount" className="block mb-2">
                  Ödeme Tutarı
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  placeholder="Ödeme tutarını girin"
                  className="mb-2"
                />
              </div>
              
              <div>
                <Label htmlFor="currency" className="block mb-2">
                  Para Birimi
                </Label>
                <Select 
                  value={currency} 
                  onValueChange={(val) => setCurrency(val)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Para birimi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="try">TRY - Türk Lirası</SelectItem>
                    <SelectItem value="usd">USD - Amerikan Doları</SelectItem>
                    <SelectItem value="eur">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="test-mode"
                  checked={isTestMode}
                  onChange={(e) => setIsTestMode(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="test-mode" className="text-sm text-muted-foreground">
                  Test modu (Gerçek ödeme işlemi yapılmayacak)
                </Label>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4">
              {amount > 0 ? (
                <Elements stripe={stripePromise}>
                  <CheckoutForm 
                    amount={amount} 
                    currency={currency}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              ) : (
                <div className="p-4 border border-dashed rounded-md bg-muted/50 flex items-center justify-center h-40">
                  <p className="text-center text-muted-foreground">
                    Ödeme yapmak için lütfen bir tutar girin
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="text-sm text-muted-foreground">
            <p>Test kartı: <code>4242 4242 4242 4242</code></p>
            <p>Son kullanma: gelecekteki herhangi bir tarih</p>
            <p>CVC: herhangi 3 rakam</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default StripePaymentPage;