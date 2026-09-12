import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Ship, ArrowRight, Clock, Globe } from "lucide-react";
import { Route as RouteType, Schedule } from "@shared/schema";
import { formatCurrency, formatDuration, formatTime } from "@/lib/utils";

interface SuggestedRoutesProps {
  className?: string;
  title?: string;
  subtitle?: string;
  limit?: number;
  onRouteSelect?: (route: RouteType) => void;
}

const SuggestedRoutes: React.FC<SuggestedRoutesProps> = ({
  className,
  title = "Suggested Routes",
  subtitle = "Popular routes you might be interested in",
  limit = 6,
  onRouteSelect
}) => {
  const [, setLocation] = useLocation();
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  
  // Get routes based on search or all routes if no search params
  const { data: routes, isLoading } = useQuery<RouteType[]>({
    queryKey: ['/api/routes'],
  });

  // Fetch schedules for selected route
  const { data: schedules, isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['/api/schedules', selectedRouteId],
    queryFn: async () => {
      if (!selectedRouteId) return [];
      const res = await fetch(`/api/schedules?routeId=${selectedRouteId}`);
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    },
    enabled: !!selectedRouteId,
  });

  // Filter active routes and limit them
  const suggestedRoutes = routes
    ?.filter(route => route.isActive)
    .slice(0, limit);

  const handleRouteSelect = (route: RouteType) => {
    if (onRouteSelect) {
      onRouteSelect(route);
    } else {
      // Var olan arama parametrelerini koru (araç tipi, yolcu sayıları)
      const existingParams = new URLSearchParams(window.location.search);
      const searchParams = new URLSearchParams();
      
      // Temel rota bilgilerini ekle
      searchParams.append('from', route.departurePort);
      searchParams.append('to', route.arrivalPort);
      
      // Set today as default departure date
      const today = new Date();
      searchParams.append('departureDate', today.toISOString());
      
      // Önceki yolcu parametrelerini koru veya varsayılan değerler kullan
      const passengerAdult = existingParams.get('passenger_adult') || '2';
      const passengerChild = existingParams.get('passenger_child') || '0';
      const passengerSenior = existingParams.get('passenger_senior') || '0';
      const passengerBaby = existingParams.get('passenger_baby') || '0';
      const vehicleType = existingParams.get('vehicleType') || '1';
      const tripType = existingParams.get('tripType') || 'one-way';
      
      // Toplam yolcu sayısını hesapla
      const totalPassengers = (
        parseInt(passengerAdult) + 
        parseInt(passengerChild) + 
        parseInt(passengerSenior) + 
        parseInt(passengerBaby)
      ).toString();
      
      // Tüm parametreleri ekle
      searchParams.append('passenger_adult', passengerAdult);
      searchParams.append('passenger_child', passengerChild);
      searchParams.append('passenger_senior', passengerSenior);
      searchParams.append('passenger_baby', passengerBaby);
      searchParams.append('totalPassengers', totalPassengers);
      searchParams.append('passengers', totalPassengers);
      searchParams.append('vehicleType', vehicleType);
      searchParams.append('tripType', tripType);
      
      // Navigate to search results
      setLocation(`/search-results?${searchParams.toString()}`);
    }
  };

  return (
    <div className={className}>
      <div className="mb-6">
        {title && <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>}
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(limit).fill(0).map((_, i) => (
            <Card key={i} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="flex justify-between mt-2">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : suggestedRoutes && suggestedRoutes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestedRoutes.map((route) => (
            <Card 
              key={route.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Ship className="h-4 w-4 text-primary mr-1" />
                    <span className="text-sm font-medium text-gray-600">Ferry Route</span>
                  </div>
                  
                  {/* Uluslararası rota ise bayrak göster */}
                  {route.isInternational && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-xs font-medium text-blue-500">International</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center mb-1 cursor-pointer" onClick={() => handleRouteSelect(route)}>
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="ml-2 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{route.departurePort}</span>
                        {route.countryDeparture && (
                          <span className="text-xs text-gray-500 ml-1">({route.countryDeparture})</span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                      <div>
                        <span className="font-medium">{route.arrivalPort}</span>
                        {route.countryArrival && (
                          <span className="text-xs text-gray-500 ml-1">({route.countryArrival})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatDuration(route.duration)}</span>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <div className="text-xs text-gray-500">Starting from</div>
                    <div className="text-xl font-bold text-primary">{formatCurrency(parseFloat(route.basePrice))}</div>
                  </div>
                  <Button 
                    size="sm" 
                    className="text-sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRouteId(route.id);
                    }}
                  >
                    Sefer Saatleri
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No routes available at the moment.</p>
        </div>
      )}
      
      {/* Seçilen rota için sefer saatleri */}
      {selectedRouteId && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Available Schedules</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedRouteId(null)}
              className="text-neutral-500"
            >
              Close
            </Button>
          </div>
          
          {loadingSchedules ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded-md">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : schedules && schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.filter(s => s.isActive).map((schedule) => {
                // Get the selected route
                const route = routes?.find(r => r.id === selectedRouteId);
                if (!route) return null;
                
                // Var olan arama parametrelerini koru (araç tipi, yolcu sayıları)
                const existingParams = new URLSearchParams(window.location.search);
                const today = new Date();
                const params = new URLSearchParams();
                
                // Temel rota bilgilerini ekle
                params.append('from', route.departurePort);
                params.append('to', route.arrivalPort);
                params.append('departureDate', today.toISOString());
                
                // Önceki yolcu parametrelerini koru veya varsayılan değerler kullan
                const passengerAdult = existingParams.get('passenger_adult') || '2';
                const passengerChild = existingParams.get('passenger_child') || '0';
                const passengerSenior = existingParams.get('passenger_senior') || '0';
                const passengerBaby = existingParams.get('passenger_baby') || '0';
                const vehicleType = existingParams.get('vehicleType') || '1';
                const tripType = existingParams.get('tripType') || 'one-way';
                
                // Toplam yolcu sayısını hesapla
                const totalPassengers = (
                  parseInt(passengerAdult) + 
                  parseInt(passengerChild) + 
                  parseInt(passengerSenior) + 
                  parseInt(passengerBaby)
                ).toString();
                
                // Tüm parametreleri ekle
                params.append('passenger_adult', passengerAdult);
                params.append('passenger_child', passengerChild);
                params.append('passenger_senior', passengerSenior);
                params.append('passenger_baby', passengerBaby);
                params.append('totalPassengers', totalPassengers);
                params.append('passengers', totalPassengers);
                params.append('vehicleType', vehicleType);
                params.append('tripType', tripType);
                
                return (
                  <div key={schedule.id} className="flex justify-between items-center p-3 border rounded-md hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <div>
                      <div className="font-medium">{formatTime(schedule.departureTime)}</div>
                      <div className="text-xs text-neutral-500">
                        Arrives at {formatTime(schedule.arrivalTime)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => {
                        const url = `/order/${route.id}?${params.toString()}&scheduleId=${schedule.id}`;
                        console.log("Navigating to:", url);
                        window.location.href = url;
                      }}
                    >
                      Sefer Seç
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-neutral-600 py-2">
              No schedules available for this route.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestedRoutes;