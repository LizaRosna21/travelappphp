import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Zap, Calendar, Users, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DynamicPricingProps {
  routeId: number;
  departureDate: string;
  passengerTypes: any[];
}

interface PriceRecommendation {
  basePrice: string;
  recommendedPrice: string;
  discountedPrice: string | null;
  priceChange: number;
  confidence: number;
  factors: {
    demand: number;
    seasonal: number;
    occupancy: number;
    dayOfWeek: number;
    competition: number;
  };
  reasoning: string;
  explanations: {
    demand: string;
    seasonal: string;
    occupancy: string;
    dayOfWeek: string;
    competition: string;
  };
}

export default function DynamicPricing({ routeId, departureDate, passengerTypes }: DynamicPricingProps) {
  const {
    data: pricingData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/pricing/dynamic', routeId, departureDate, JSON.stringify(passengerTypes)],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        departureDate,
        passengerTypes: JSON.stringify(passengerTypes)
      });
      
      const response = await fetch(`/api/pricing/dynamic/${routeId}?${queryParams}`);
      if (!response.ok) {
        throw new Error('Dinamik fiyatlandırma verisi yüklenirken hata oluştu');
      }
      return response.json();
    },
    enabled: !!routeId && !!departureDate && passengerTypes.length > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dinamik Fiyatlandırma</CardTitle>
          <CardDescription>Fiyat analizi yapılıyor...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
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
          <CardTitle>Dinamik Fiyatlandırma</CardTitle>
          <CardDescription>
            Fiyat analizi yüklenirken bir hata oluştu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-destructive gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pricingData) {
    return null;
  }

  const recommendation: PriceRecommendation = pricingData;
  
  const getPriceChangeColor = (change: number) => {
    if (change > 10) return 'text-green-600';
    if (change > 0) return 'text-green-500';
    if (change < -10) return 'text-red-600';
    if (change < 0) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getFactorColor = (value: number) => {
    if (value >= 0.8) return 'bg-green-500';
    if (value >= 0.6) return 'bg-green-300';
    if (value >= 0.4) return 'bg-yellow-400';
    if (value >= 0.2) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const FactorBar = ({ value, label, explanation }: { value: number, label: string, explanation: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center">
            <div className="h-24 w-4 bg-muted rounded-full flex flex-col-reverse">
              <div 
                className={`w-full rounded-full ${getFactorColor(value)}`} 
                style={{ height: `${Math.max(5, value * 100)}%` }}
              />
            </div>
            <span className="text-xs mt-1 font-medium">{label}</span>
            <span className="text-xs mt-0.5 text-muted-foreground">{Math.round(value * 100)}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dinamik Fiyat Analizi</CardTitle>
            <CardDescription>
              AI destekli fiyat optimizasyonu
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Zap className="h-3 w-3" />
            {recommendation.confidence}% Güven
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Standart Fiyat</div>
                <div className="text-lg font-medium">{recommendation.basePrice} ₺</div>
              </div>
              
              <div className="text-xl font-semibold">→</div>
              
              <div>
                <div className="text-sm text-muted-foreground">Önerilen Fiyat</div>
                <div className="text-2xl font-bold">{recommendation.recommendedPrice} ₺</div>
              </div>
              
              <div className={`flex items-center ml-2 text-sm font-medium ${getPriceChangeColor(recommendation.priceChange)}`}>
                {recommendation.priceChange > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +{recommendation.priceChange}%
                  </>
                ) : recommendation.priceChange < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 mr-1" />
                    {recommendation.priceChange}%
                  </>
                ) : (
                  'Değişim yok'
                )}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {recommendation.reasoning}
            </div>
            
            <div className="flex items-center text-sm gap-2 mt-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div><span className="font-medium">Tarih:</span> {new Date(departureDate).toLocaleDateString('tr-TR')}</div>
            </div>
            
            <div className="flex items-center text-sm gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div><span className="font-medium">Yolcu:</span> {passengerTypes.reduce((acc: number, curr: any) => acc + curr.count, 0)} kişi</div>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-3">Fiyatlandırma Faktörleri</div>
            <div className="flex justify-between items-end">
              <FactorBar 
                value={recommendation.factors.demand} 
                label="Talep" 
                explanation={recommendation.explanations.demand}
              />
              <FactorBar 
                value={recommendation.factors.seasonal} 
                label="Sezonsal" 
                explanation={recommendation.explanations.seasonal}
              />
              <FactorBar 
                value={recommendation.factors.occupancy} 
                label="Doluluk" 
                explanation={recommendation.explanations.occupancy}
              />
              <FactorBar 
                value={recommendation.factors.dayOfWeek} 
                label="Gün" 
                explanation={recommendation.explanations.dayOfWeek}
              />
              <FactorBar 
                value={recommendation.factors.competition} 
                label="Rekabet" 
                explanation={recommendation.explanations.competition}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}