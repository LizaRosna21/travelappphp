import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface PaymentResultProps {
  status: "success" | "error" | "pending";
  paymentId?: string;
  bookingReference?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function PaymentResult({ 
  status, 
  paymentId, 
  bookingReference, 
  errorMessage, 
  onRetry 
}: PaymentResultProps) {
  const isSuccess = status === "success";
  const isError = status === "error";
  const isPending = status === "pending";

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <div className={`p-6 flex items-center justify-center ${isSuccess ? 'bg-green-50' : isError ? 'bg-red-50' : 'bg-yellow-50'}`}>
        {isSuccess && <CheckCircle className="w-16 h-16 text-green-500" />}
        {isError && <XCircle className="w-16 h-16 text-red-500" />}
        {isPending && <RefreshCw className="w-16 h-16 text-yellow-500 animate-spin" />}
      </div>
      
      <CardContent className="p-6 pt-4">
        <h2 className="text-2xl font-bold text-center mb-2">
          {isSuccess && "Ödeme Başarılı"}
          {isError && "Ödeme Başarısız"}
          {isPending && "Ödeme İşleniyor"}
        </h2>
        
        <p className="text-center text-muted-foreground mb-4">
          {isSuccess && "Ödeme işleminiz başarıyla tamamlandı."}
          {isError && (errorMessage || "Ödeme işlemi sırasında bir hata oluştu.")}
          {isPending && "Ödeme işleminiz hala işleniyor. Lütfen bekleyin."}
        </p>
        
        {(paymentId || bookingReference) && (
          <div className="space-y-2 border p-3 rounded-md bg-muted/50 mt-4">
            {paymentId && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ödeme No:</span>
                <span className="text-sm font-mono">{paymentId}</span>
              </div>
            )}
            {bookingReference && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rezervasyon No:</span>
                <span className="text-sm font-mono">{bookingReference}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="px-6 pb-6 pt-0 flex flex-col sm:flex-row gap-3">
        {isSuccess && (
          <>
            <Button asChild className="flex-1">
              <Link to={`/my-bookings`}>
                Rezervasyonlarım <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">
                Ana Sayfa
              </Link>
            </Button>
          </>
        )}
        
        {isError && (
          <>
            {onRetry && (
              <Button onClick={onRetry} className="flex-1">
                Tekrar Dene
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">
                Ana Sayfa
              </Link>
            </Button>
          </>
        )}
        
        {isPending && (
          <Button asChild variant="outline" className="flex-1">
            <Link to="/my-bookings">
              Rezervasyonlarım
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}