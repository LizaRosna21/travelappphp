import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Info } from "lucide-react";
import { PaymentProviderSelector } from "./PaymentProviderSelector";

// Kredi kartı bilgisi için validasyon şeması
const turkishPaymentFormSchema = z.object({
  cardNumber: z
    .string()
    .min(16, { message: "Kart numarası 16 karakter olmalıdır" })
    .max(19, { message: "Kart numarası 19 karakterden fazla olamaz" })
    .regex(/^[0-9\s-]+$/, { message: "Sadece rakam, boşluk veya - karakteri kullanılabilir" }),
  cardHolderName: z
    .string()
    .min(3, { message: "Kart sahibi adı en az 3 karakter olmalıdır" })
    .max(50, { message: "Kart sahibi adı 50 karakterden fazla olamaz" }),
  expiryMonth: z
    .string()
    .nonempty({ message: "Ay seçiniz" }),
  expiryYear: z
    .string()
    .nonempty({ message: "Yıl seçiniz" }),
  cvv: z
    .string()
    .min(3, { message: "CVV kodu en az 3 karakter olmalıdır" })
    .max(4, { message: "CVV kodu en fazla 4 karakter olabilir" })
    .regex(/^[0-9]+$/, { message: "Sadece rakam kullanılabilir" }),
  installment: z
    .string()
    .default("0"),
  saveCard: z
    .boolean()
    .default(false),
  provider: z
    .string()
    .min(1, { message: "Ödeme sağlayıcısı seçilmelidir" })
});

type TurkishPaymentFormValues = z.infer<typeof turkishPaymentFormSchema>;

interface TurkishPaymentFormProps {
  onSubmit: (values: TurkishPaymentFormValues) => Promise<void>;
  booking: {
    totalPrice: string;
    currency: string;
    bookingReference: string;
  };
  isProcessing: boolean;
  error?: string | null;
}

export function TurkishPaymentForm({
  onSubmit,
  booking,
  isProcessing,
  error
}: TurkishPaymentFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  
  const form = useForm<TurkishPaymentFormValues>({
    resolver: zodResolver(turkishPaymentFormSchema),
    defaultValues: {
      cardNumber: "",
      cardHolderName: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      installment: "0",
      saveCard: false,
      provider: ""
    }
  });

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    form.setValue("provider", provider);
  };

  const handleSubmit = async (values: TurkishPaymentFormValues) => {
    await onSubmit(values);
  };

  // Taksit seçenekleri için veri
  const installmentOptions = [
    { value: "0", label: "Tek Çekim" },
    { value: "2", label: "2 Taksit" },
    { value: "3", label: "3 Taksit" },
    { value: "6", label: "6 Taksit" },
    { value: "9", label: "9 Taksit" },
    { value: "12", label: "12 Taksit" }
  ];

  // Ay seçenekleri için veri
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      value: month.toString().padStart(2, "0"),
      label: month.toString().padStart(2, "0")
    };
  });

  // Yıl seçenekleri için veri
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear + i;
    return {
      value: year.toString().slice(-2),
      label: year.toString()
    };
  });

  return (
    <div className="space-y-6">
      <PaymentProviderSelector 
        onSelect={handleProviderSelect} 
        selectedProvider={selectedProvider}
      />
      
      {selectedProvider && (
        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Kart Bilgileri
                  </h3>
                  <Separator />
                </div>

                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="cardHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kart Sahibinin Adı Soyadı</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Kart üzerindeki ismi yazınız"
                            {...field}
                            autoComplete="cc-name"
                          />
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
                            placeholder="•••• •••• •••• ••••"
                            {...field}
                            autoComplete="cc-number"
                            onChange={(e) => {
                              // Kart numarasını format (4 hanede bir boşluk)
                              const value = e.target.value
                                .replace(/\s/g, "") // Tüm boşlukları kaldır
                                .replace(/[^0-9]/gi, "") // Sadece rakamları tut
                                .substring(0, 16); // Maksimum 16 karakter
                              
                              // 4 hanede bir boşluk ekle
                              const parts = [];
                              for (let i = 0; i < value.length; i += 4) {
                                parts.push(value.substring(i, i + 4));
                              }
                              
                              field.onChange(parts.join(" "));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="expiryMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Son Kullanma Ay</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ay" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {monthOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
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
                            <FormLabel>Son Kullanma Yıl</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Yıl" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {yearOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cvv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Güvenlik Kodu (CVV)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="•••"
                              {...field}
                              maxLength={4}
                              autoComplete="cc-csc"
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, "");
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="installment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taksit Seçenekleri</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Taksit Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {installmentOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted/50 p-4 rounded-md flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p>Bu bir demo uygulamasıdır. Ödeme işleminde gerçek kart bilgilerini girmeyiniz.</p>
                    <p className="mt-1">Test için şu kart bilgilerini kullanabilirsiniz:</p>
                    <div className="mt-1 font-mono">
                      <div>Kart No: 4111 1111 1111 1111</div>
                      <div>SKT: 12/25</div>
                      <div>CVV: 123</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="font-medium">
                    <span>Toplam Tutar: </span>
                    <span className="text-lg">
                      {parseFloat(booking.totalPrice).toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: booking.currency
                      })}
                    </span>
                  </div>
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        İşleniyor...
                      </>
                    ) : (
                      "Ödemeyi Tamamla"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}