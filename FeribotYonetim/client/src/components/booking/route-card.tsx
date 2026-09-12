import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Schedule, Route } from "@shared/schema";
import { formatCurrency, formatDuration, formatTime } from "@/lib/utils";
import { Clock, Calendar, Ship, ArrowRight } from "lucide-react";

interface RouteCardProps {
  route: Route;
  departureDate: Date | undefined;
  returnDate?: Date | undefined;
  passengers: number;
  vehicleTypeId: number;
  tripType: string;
}

const RouteCard = ({ 
  route, 
  departureDate, 
  returnDate,
  passengers,
  vehicleTypeId,
  tripType
}: RouteCardProps) => {
  const [expanded, setExpanded] = useState(false);

  // Fetch schedules for this route
  const { data: schedules, isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['/api/schedules', route.id],
    queryFn: async () => {
      const res = await fetch(`/api/schedules?routeId=${route.id}`);
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    },
  });

  // Filter active schedules
  const activeSchedules = schedules?.filter(schedule => schedule.isActive).slice(0, 4) || [];

  // Create search params for booking
  const createBookingParams = (scheduleId: number) => {
    const params = new URLSearchParams();
    params.append('departureDate', departureDate?.toISOString() || new Date().toISOString());
    params.append('passengers', passengers.toString());
    params.append('vehicleType', vehicleTypeId.toString());
    params.append('tripType', tripType);
    params.append('scheduleId', scheduleId.toString());
    
    // Yolcu sayılarını ekle - search-box'tan gelen bilgilere dayanarak
    const searchParams = new URLSearchParams(window.location.search);
    const adultCount = searchParams.get('passenger_adult');
    const childCount = searchParams.get('passenger_child');
    const babyCount = searchParams.get('passenger_baby');
    const seniorCount = searchParams.get('passenger_senior');
    
    if (adultCount) params.append('passenger_adult', adultCount);
    if (childCount) params.append('passenger_child', childCount);
    if (babyCount) params.append('passenger_baby', babyCount);
    if (seniorCount) params.append('passenger_senior', seniorCount);
    
    if (tripType === 'round-trip' && returnDate) {
      params.append('returnDate', returnDate.toISOString());
    }
    
    return params.toString();
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="p-6">
          {/* Route header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
            <div className="mb-2 md:mb-0">
              <h3 className="text-xl font-semibold flex items-center">
                <Ship className="h-5 w-5 mr-2 text-primary" />
                {route.departurePort} <ArrowRight className="mx-2 h-4 w-4" /> {route.arrivalPort}
              </h3>
              {route.description && (
                <p className="text-neutral-600 text-sm mt-1">{route.description}</p>
              )}
            </div>
            <div className="flex items-center">
              <div className="flex items-center text-neutral-700 mr-4">
                <Clock className="h-4 w-4 mr-1 text-neutral-500" />
                <span>{formatDuration(route.duration)}</span>
              </div>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(parseFloat(route.basePrice.toString()))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-neutral-600 mb-4">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {departureDate?.toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="w-full justify-center mt-2"
          >
            {expanded ? "Hide departure times" : "View departure times"}
          </Button>
        </div>

        {/* Schedule details */}
        {expanded && (
          <div className="border-t border-neutral-200">
            <div className="p-4">
              <h4 className="font-medium mb-3">Available Departures</h4>
              
              {loadingSchedules ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-neutral-500 mt-2">Loading schedules...</p>
                </div>
              ) : activeSchedules.length > 0 ? (
                <div className="space-y-3">
                  {activeSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex justify-between items-center p-3 border rounded-md hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
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
                          window.location.href = `/order/${route.id}?${createBookingParams(schedule.id)}&scheduleId=${schedule.id}`;
                        }}
                      >
                        Sefer Seç
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-neutral-600 py-2">
                  No schedules available for this date.
                </p>
              )}
              
              {activeSchedules.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-200 text-center text-sm text-neutral-600">
                  {activeSchedules.length > 3 ? (
                    <p>Showing {activeSchedules.length} schedules. More may be available.</p>
                  ) : (
                    <p>Showing all {activeSchedules.length} available schedules.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RouteCard;
