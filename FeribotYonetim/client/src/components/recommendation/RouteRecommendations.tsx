import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Compass, Ship, CalendarDays, TrendingUp, Clock } from 'lucide-react';

interface RouteRecommendation {
  id: number;
  departurePort: string;
  arrivalPort: string;
  basePrice: string;
  duration: number;
  matchScore: number;
  reason: string;
  departurePortCountry?: string;
  arrivalPortCountry?: string;
  nextDeparture?: string;
  seatsAvailable?: number;
  discountedPrice?: string;
  discount?: number;
}

export default function RouteRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    data: recommendations,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/recommendations/personalized', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/recommendations/personalized/${user.id}`);
      if (!response.ok) {
        throw new Error('Kişiselleştirilmiş öneriler yüklenirken hata oluştu');
      }
      return response.json();
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kişiselleştirilmiş Rota Önerileri</CardTitle>
          <CardDescription>
            Kişiselleştirilmiş öneriler görmek için giriş yapın veya hesap oluşturun.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth">
            <Button>Giriş Yap</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kişiselleştirilmiş Rota Önerileri</CardTitle>
          <CardDescription>Sizin için rotalar yükleniyor...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 shadow-sm">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kişiselleştirilmiş Rota Önerileri</CardTitle>
          <CardDescription>
            Üzgünüz, öneriler yüklenirken bir hata oluştu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Tekrar Dene
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kişiselleştirilmiş Rota Önerileri</CardTitle>
          <CardDescription>
            Henüz özel önerimiz bulunmuyor. Daha fazla rezervasyon yaptıkça size özel önerilerimiz oluşacaktır.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sizin İçin Önerilen Rotalar</CardTitle>
        <CardDescription>
          Geçmiş seyahatlerinize ve tercihlerinize göre özelleştirildi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((rec: RouteRecommendation) => (
            <Card key={rec.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="font-normal">
                    <TrendingUp className="h-3 w-3 mr-1" /> 
                    {rec.matchScore}% Eşleşme
                  </Badge>
                  {rec.discount && (
                    <Badge className="bg-green-500">%{rec.discount} İndirim</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">
                  <div className="flex items-center">
                    <Compass className="h-4 w-4 mr-2" />
                    {rec.departurePort} - {rec.arrivalPort}
                  </div>
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {rec.departurePortCountry} - {rec.arrivalPortCountry}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>{rec.duration} saat</span>
                  </div>
                  <div className="flex items-center">
                    <Ship className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>{rec.seatsAvailable || '?'} koltuk</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>{rec.nextDeparture ? new Date(rec.nextDeparture).toLocaleDateString('tr-TR') : 'Mevcut değil'}</span>
                  </div>
                  <div className="flex items-center font-medium">
                    {rec.discountedPrice ? (
                      <div className="flex flex-col">
                        <span className="line-through text-xs text-muted-foreground">{rec.basePrice} ₺</span>
                        <span className="text-green-600">{rec.discountedPrice} ₺</span>
                      </div>
                    ) : (
                      <span>{rec.basePrice} ₺</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{rec.reason}</p>
              </CardContent>
              <CardFooter className="bg-muted/50 pt-2">
                <div className="w-full flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      toast({
                        title: "Detaylar görüntüleniyor",
                        description: `${rec.departurePort} - ${rec.arrivalPort} rotası için detaylar`
                      });
                      // Rota detaylarına yönlendir
                    }}
                  >
                    Detaylar
                  </Button>
                  <Link href={`/search-results?from=${encodeURIComponent(rec.departurePort)}&to=${encodeURIComponent(rec.arrivalPort)}`}>
                    <Button size="sm" className="flex-1">
                      Bileti Bul
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}