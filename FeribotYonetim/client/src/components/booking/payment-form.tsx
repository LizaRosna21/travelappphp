import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { CreditCard, Calendar, Lock } from "lucide-react";

interface PaymentFormProps {
  paymentMethod: "card" | "paypal";
  onSubmit: (data: any) => void;
  isProcessing: boolean;
}

const cardPaymentSchema = z.object({
  cardNumber: z.string()
    .min(15, "Card number must be at least 15 digits")
    .max(19, "Card number must not exceed 19 digits")
    .regex(/^[0-9\s]+$/, "Card number must contain only digits"),
  cardHolder: z.string().min(3, "Cardholder name is required"),
  expiryDate: z.string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, "Expiry date must be in MM/YY format"),
  cvv: z.string()
    .min(3, "CVV must be at least 3 digits")
    .max(4, "CVV must not exceed 4 digits")
    .regex(/^[0-9]+$/, "CVV must contain only digits"),
});

const paypalSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const PaymentForm = ({ paymentMethod, onSubmit, isProcessing }: PaymentFormProps) => {
  // Card payment form
  const cardForm = useForm<z.infer<typeof cardPaymentSchema>>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: {
      cardNumber: "",
      cardHolder: "",
      expiryDate: "",
      cvv: "",
    },
  });

  // PayPal form
  const paypalForm = useForm<z.infer<typeof paypalSchema>>({
    resolver: zodResolver(paypalSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleCardSubmit = (values: z.infer<typeof cardPaymentSchema>) => {
    onSubmit({ method: "card", ...values });
  };

  const handlePaypalSubmit = (values: z.infer<typeof paypalSchema>) => {
    onSubmit({ method: "paypal", ...values });
  };

  // Handle card number formatting
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    let formatted = "";
    
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += " ";
      }
      formatted += digits[i];
    }
    
    return formatted.substring(0, 19);
  };

  // Handle expiry date formatting
  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, "");
    
    if (digits.length > 2) {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
    
    return digits;
  };

  return (
    <div>
      {paymentMethod === "card" && (
        <Form {...cardForm}>
          <form onSubmit={cardForm.handleSubmit(handleCardSubmit)} className="space-y-6">
            <FormField
              control={cardForm.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                      <Input
                        {...field}
                        value={formatCardNumber(field.value)}
                        placeholder="1234 5678 9012 3456"
                        className="pl-10"
                        autoComplete="cc-number"
                        disabled={isProcessing}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={cardForm.control}
              name="cardHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cardholder Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John Smith"
                      autoComplete="cc-name"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={cardForm.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                        <Input
                          {...field}
                          placeholder="MM/YY"
                          className="pl-9"
                          autoComplete="cc-exp"
                          disabled={isProcessing}
                          onChange={(e) => {
                            const formatted = formatExpiryDate(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={cardForm.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="123"
                          className="pl-9"
                          autoComplete="cc-csc"
                          maxLength={4}
                          disabled={isProcessing}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              Pay Now
            </Button>
          </form>
        </Form>
      )}

      {paymentMethod === "paypal" && (
        <Form {...paypalForm}>
          <form onSubmit={paypalForm.handleSubmit(handlePaypalSubmit)} className="space-y-6">
            <FormField
              control={paypalForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PayPal Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="email@example.com"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-[#0070ba] hover:bg-[#005ea6]" 
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              Pay with PayPal
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};

export default PaymentForm;
