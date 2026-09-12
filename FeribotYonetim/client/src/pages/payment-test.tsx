import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';

// STRIPE DEMO MODE - API anahtarı ihtiyacını ortadan kaldırır
// Bu şekilde çalışır, test amaçlıdır ve herhangi bir gerçek ödeme işlemi gerçekleştirmez
const stripePromise = loadStripe('pk_test_demo');

const CheckoutForm = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/demo-payment-response`,
        },
      });

      if (error) {
        setPaymentMessage(error.message || 'Ödeme işlemi başarısız oldu.');
        toast({
          title: 'Ödeme Hatası',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        // Başarılı olursa return_url'e yönlendirilecek
        setPaymentMessage('Ödeme işlemi başlatıldı, yönlendiriliyorsunuz...');
        toast({
          title: 'Ödeme Başarılı',
          description: 'Ödeme işleminiz başarıyla gerçekleştirildi!',
        });
      }
    } catch (error: any) {
      setPaymentMessage('Ödeme işlemi sırasında bir hata oluştu: ' + error.message);
      toast({
        title: 'Sistem Hatası',
        description: 'Ödeme işlemi sırasında bir hata oluştu: ' + error.message,
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <PaymentElement />
      {paymentMessage && (
        <div className={`mt-4 p-3 rounded-lg ${paymentMessage.includes('başarı') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {paymentMessage}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? 'İşleniyor...' : `${amount} TL Öde`}
      </Button>
    </form>
  );
};

export default function PaymentTest() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [currency, setCurrency] = useState<string>('try');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stripeStatus, setStripeStatus] = useState<{ mode: string; ready: boolean } | null>(null);
  const { toast } = useToast();

  // Stripe durumunu kontrol et
  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const response = await apiRequest('GET', '/api/stripe/status');
        const data = await response.json();
        setStripeStatus(data);
      } catch (error) {
        console.error('Stripe durum kontrolü başarısız:', error);
      }
    };

    checkStripeStatus();
  }, []);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/create-payment-intent', {
        amount,
        currency,
        metadata: {
          demo: true,
          testPayment: true,
          createdFrom: 'payment-test-page'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ödeme niyeti oluşturulamadı: ${errorText}`);
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      toast({
        title: 'Ödeme hazır',
        description: 'Kart bilgilerinizi girerek ödemeyi tamamlayabilirsiniz.',
      });
    } catch (error: any) {
      console.error('Ödeme niyeti oluşturma hatası:', error);
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Stripe Ödeme Test Sayfası</h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Stripe Durumu:</h2>
          {stripeStatus ? (
            <div className="space-y-1">
              <p>
                <span className="font-medium">Mod:</span> {stripeStatus.mode === 'demo' ? 'Demo Mod (Gerçek API anahtarı gerekli değil)' : 'Canlı Mod'}
              </p>
              <p>
                <span className="font-medium">Durum:</span>{' '}
                {stripeStatus.ready ? (
                  <span className="text-green-600">Hazır ✓</span>
                ) : (
                  <span className="text-red-600">Hazır Değil ✗</span>
                )}
              </p>
            </div>
          ) : (
            <p>Stripe durumu yükleniyor...</p>
          )}
        </div>

        <Tabs defaultValue="testpayment">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="testpayment">Ödeme Testi</TabsTrigger>
            <TabsTrigger value="testcards">Test Kartları</TabsTrigger>
          </TabsList>

          <TabsContent value="testpayment">
            <Card>
              <CardHeader>
                <CardTitle>Ödeme Test Formu</CardTitle>
                <CardDescription>
                  Aşağıdaki formu kullanarak test ödemesi gerçekleştirebilirsiniz. Demo modda gerçek bir ödeme
                  gerçekleşmez.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!clientSecret ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Ödeme Tutarı</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Para Birimi</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Para birimi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="try">Türk Lirası (TRY)</SelectItem>
                          <SelectItem value="usd">Amerikan Doları (USD)</SelectItem>
                          <SelectItem value="eur">Euro (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret, locale: 'tr' }}>
                    <CheckoutForm amount={amount} />
                  </Elements>
                )}
              </CardContent>
              <CardFooter>
                {!clientSecret ? (
                  <Button onClick={createPaymentIntent} disabled={isLoading || !stripeStatus?.ready}>
                    {isLoading ? 'Hazırlanıyor...' : 'Ödeme Formu Oluştur'}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setClientSecret(null)}>
                    Yeni Ödeme Başlat
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="testcards">
            <Card>
              <CardHeader>
                <CardTitle>Test Kartları</CardTitle>
                <CardDescription>
                  Aşağıdaki test kartlarını kullanarak farklı ödeme senaryolarını test edebilirsiniz.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Başarılı Ödeme</h3>
                    <p className="text-sm mb-1">Kart Numarası: <code className="bg-gray-100 px-1">4242 4242 4242 4242</code></p>
                    <p className="text-sm mb-1">Son Kullanma: <code className="bg-gray-100 px-1">Gelecekteki herhangi bir tarih</code></p>
                    <p className="text-sm mb-1">CVC: <code className="bg-gray-100 px-1">Herhangi 3 rakam</code></p>
                    <p className="text-sm mb-1">Posta Kodu: <code className="bg-gray-100 px-1">Herhangi 5 rakam</code></p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Yetersiz Bakiye</h3>
                    <p className="text-sm mb-1">Kart Numarası: <code className="bg-gray-100 px-1">4000 0000 0000 9995</code></p>
                    <p className="text-sm mb-1">Son Kullanma: <code className="bg-gray-100 px-1">Gelecekteki herhangi bir tarih</code></p>
                    <p className="text-sm mb-1">CVC: <code className="bg-gray-100 px-1">Herhangi 3 rakam</code></p>
                    <p className="text-sm mb-1">Posta Kodu: <code className="bg-gray-100 px-1">Herhangi 5 rakam</code></p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">3D Secure Doğrulama</h3>
                    <p className="text-sm mb-1">Kart Numarası: <code className="bg-gray-100 px-1">4000 0000 0000 3220</code></p>
                    <p className="text-sm mb-1">Son Kullanma: <code className="bg-gray-100 px-1">Gelecekteki herhangi bir tarih</code></p>
                    <p className="text-sm mb-1">CVC: <code className="bg-gray-100 px-1">Herhangi 3 rakam</code></p>
                    <p className="text-sm mb-1">Posta Kodu: <code className="bg-gray-100 px-1">Herhangi 5 rakam</code></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}