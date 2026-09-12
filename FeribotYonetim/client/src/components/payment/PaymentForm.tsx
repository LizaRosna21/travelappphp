import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Ödeme formu validasyon şeması
const paymentFormSchema = z.object({
  cardHolderName: z.string().min(3, "Kart sahibi adı en az 3 karakter olmalıdır"),
  cardNumber: z.string().regex(/^\d{16}$/, "Kart numarası 16 haneli olmalıdır"),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Geçerli bir ay seçin (01-12)"),
  expiryYear: z.string().regex(/^(2[3-9]|3[0-9])$/, "Geçerli bir yıl seçin (23-39)"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV 3 veya 4 haneli olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  booking: {
    totalPrice: string;
    currency: string;
    bookingReference: string;
  };
  provider: string;
  isProcessing: boolean;
}

export function PaymentForm({ onSubmit, booking, provider, isProcessing }: PaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      cardHolderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      email: "",
    },
  });
  
  const handleSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Ödeme formu gönderilirken hata oluştu:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ay ve yıllar için seçenekler
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return month < 10 ? `0${month}` : `${month}`;
  });
  
  const years = Array.from({ length: 10 }, (_, i) => {
    return `${new Date().getFullYear() - 2000 + i}`;
  });
  
  const formatCardNumber = (value: string) => {
    const val = value.replace(/\D/g, "");
    return val.substring(0, 16);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {provider === "paytr" ? "PayTR" : 
           provider === "iyzico" ? "iyzico" : 
           provider === "payu" ? "PayU" : "Ödeme Bilgileri"}
        </CardTitle>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="cardHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kart Sahibinin Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Ad Soyad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kart Numarası</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="1234 5678 9012 3456"
                      {...field}
                      onChange={(e) => field.onChange(formatCardNumber(e.target.value))} 
                      maxLength={16}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="expiryMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ay</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Ay" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiryYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yıl</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Yıl" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123" 
                        {...field} 
                        maxLength={4}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta Adresi</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ornek@mail.com" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Bu form test amaçlıdır. Lütfen gerçek kart bilgilerinizi girmeyin. Ödeme testleri demo hesaplar üzerinden yapılmaktadır.
              </p>
              <div className="mt-2 border p-3 rounded-md bg-muted/30">
                <div className="font-mono text-xs">
                  <p className="mb-1"><strong>Test Kartı:</strong> 4111 1111 1111 1111</p>
                  <p className="mb-1"><strong>Ay/Yıl:</strong> Herhangi bir geçerli tarih</p>
                  <p><strong>CVV:</strong> 123</p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="border-t pt-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || isProcessing}
            >
              {(isSubmitting || isProcessing) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting || isProcessing ? "İşleniyor..." : `${booking.currency === 'TRY' ? '₺' : booking.currency === 'USD' ? '$' : booking.currency === 'EUR' ? '€' : ''} ${booking.totalPrice} Öde`}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}