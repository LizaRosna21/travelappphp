import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

export interface RouteRecommendation {
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

export function usePersonalizedRoutes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/recommendations/personalized', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/recommendations/personalized/${user.id}`);
      if (!response.ok) {
        throw new Error('Kişiselleştirilmiş öneriler yüklenirken hata oluştu');
      }
      return response.json() as Promise<RouteRecommendation[]>;
    },
    enabled: !!user,
  });
}

export interface PriceRecommendation {
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

export function useDynamicPricing(
  routeId: number,
  departureDate: string,
  passengerTypes: any[]
) {
  return useQuery({
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
      return response.json() as Promise<PriceRecommendation>;
    },
    enabled: !!routeId && !!departureDate && passengerTypes.length > 0,
  });
}