import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Booking, Route } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck, Lock, ArrowRight } from "lucide-react";
import PaymentForm from "@/components/booking/payment-form";

const PaymentPage = () => {
  const params = useParams<{ bookingId: string }>();
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const totalPrice = searchParams.get("total") || "0";
  
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) throw new Error("Failed to fetch booking");
      return res.json();
    },
  });
  
  // Fetch route details if we have booking
  const { data: route } = useQuery<Route>({
    queryKey: [`/api/routes/${booking?.routeId}`],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${booking?.routeId}`);
      if (!res.ok) throw new Error("Failed to fetch route");
      return res.json();
    },
    enabled: !!booking,
  });
  
  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/payment`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment successful",
        description: "Your payment has been processed successfully.",
      });
      
      // Invalidate booking queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      
      // Navigate to confirmation page
      navigate(`/booking-confirmed/${bookingId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handlePaymentSubmit = (paymentData: any) => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Process payment with API
      processPaymentMutation.mutate();
    }, 1500);
  };
  
  if (isLoadingBooking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-red-600 mb-2">Booking not found</h3>
              <p className="text-neutral-600 mb-4">
                We couldn't find the requested booking.
              </p>
              <Button onClick={() => navigate("/search")}>
                Return to Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Payment - FerryBooking</title>
        <meta
          name="description"
          content="Complete your payment for your ferry booking."
        />
      </Helmet>

      <div className="bg-neutral-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Payment Methods */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-4 mb-6">
                      <button
                        className={`flex items-center py-2 px-4 border rounded transition-colors ${
                          paymentMethod === "card" 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setPaymentMethod("card")}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        <span>Credit Card</span>
                      </button>
                      
                      <button
                        className={`flex items-center py-2 px-4 border rounded transition-colors ${
                          paymentMethod === "paypal" 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setPaymentMethod("paypal")}
                      >
                        <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M8.32 21.97a.78.78 0 0 1-.26-.77c.04-.28.22-.48.49-.55.71-.19 1.21-.57 1.5-1.15.32-.61.28-1.24-.12-1.85-.1-.14-.22-.27-.32-.42-.84-1.18-.66-2.67.5-3.5l.24-.18c.16-.13.31-.27.46-.42l.07-.08c.85-.88.91-2.27.11-3.23a.55.55 0 0 0-.16-.15l-.76-.48a4.55 4.55 0 0 0-3.16-.81c-.67.1-1.16.36-1.52.79-.42.5-.53 1.12-.32 1.76.16.5.46.87.92 1.11.23.12.25.24.15.48-.13.31-.36.57-.69.67-1.14.33-1.89.18-2.45-.44-.2-.22-.33-.5-.49-.76-.13-.25-.27-.37-.54-.37-.53 0-1.05.01-1.58 0-.39 0-.66.18-.8.56-.22.55-.07 1.03.45 1.34.21.13.22.31.11.53a2.13 2.13 0 0 1-2.12 1.31H2.11c-.55 0-.85.3-.85.75 0 .46.3.75.87.75h1.9c.44 0 .72.28.77.75.05.46-.22.8-.68.8H1.19c-.55 0-.85.3-.85.75s.3.75.85.75h1.51c.76 0 1.21.39 1.32 1.15.06.38.15.81.29 1.16.23.57.65 1.02 1.17 1.38.72.5 1.47.91 2.23 1.32.35.19.85.06 1.07-.29.42-.67.83-1.36 1.27-2.03.25-.38.74-.39 1.01-.02.26.36.54.7.81 1.05.45.59.69.61 1.22.13l.32-.29c.53-.47 1.09-.9 1.69-1.28.38-.25.43-.67.13-1.05l-.5-.65c-.18-.23-.37-.46-.57-.68-.36-.4-.31-.95.12-1.22.16-.1.32-.18.5-.27-.12 1.55.18 2.84 1.23 3.87.93.91 1.99 1.71 2.97 2.57.45.39.31.84-.28 1.02a3.97 3.97 0 0 1-3.14-.31c-.53-.27-1.02-.61-1.41-1.06-.17-.19-.36-.35-.63-.36-.47-.01-.93.01-1.4.01-1.01.01-1.65-.61-1.63-1.61 0-.29-.04-.57-.07-.86-.05-.4-.23-.57-.64-.53l-.33.04a.79.79 0 0 1-.7-.24c-.24-.28-.48-.56-.72-.84l-.21-.25a.75.75 0 0 0-.6-.29 1.1 1.1 0 0 0-.59.19c-.17.13-.34.29-.5.46l-1.41 1.5a.53.53 0 0 1-.12.09z"/>
                        </svg>
                        <span>PayPal</span>
                      </button>
                    </div>
                    
                    <PaymentForm 
                      paymentMethod={paymentMethod}
                      onSubmit={handlePaymentSubmit}
                      isProcessing={isProcessing || processPaymentMutation.isPending}
                    />
                    
                    <div className="mt-6 flex items-center justify-center text-sm text-neutral-600">
                      <Lock className="h-4 w-4 mr-2" />
                      <span>Your payment information is secure and encrypted</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-neutral-600">Booking Reference</div>
                        <div className="font-medium">{booking.bookingReference}</div>
                      </div>

                      <div>
                        <div className="text-sm text-neutral-600">Route</div>
                        <div className="font-medium">
                          {route?.departurePort} <ArrowRight className="inline h-3 w-3 mx-1" /> {route?.arrivalPort}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-neutral-600">Date</div>
                        <div className="font-medium">
                          {new Date(booking.departureDate).toLocaleDateString()}
                        </div>
                        {booking.returnDate && (
                          <div className="font-medium">
                            Return: {new Date(booking.returnDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="pt-2">
                        <div className="flex justify-between mb-2">
                          <div className="text-sm font-medium">Total</div>
                          <div className="font-bold text-lg">
                            {formatCurrency(parseFloat(totalPrice))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-neutral-50 border-t p-4">
                    <div className="w-full flex items-center justify-center text-sm text-neutral-600">
                      <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                      <span>100% secure payment</span>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
