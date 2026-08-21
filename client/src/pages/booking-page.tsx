import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { 
  Route, 
  Schedule, 
  PassengerType, 
  VehicleType,
  insertBookingSchema
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDuration, generateBookingReference } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Ship, Clock, Calendar, Users, ArrowRight } from "lucide-react";
import PassengerForm from "@/components/booking/passenger-form";

const BookingPage = () => {
  const params = useParams<{ routeId: string }>();
  const routeId = parseInt(params.routeId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(window.location.search);
  const departureDate = searchParams.get("departureDate") 
    ? new Date(searchParams.get("departureDate") as string)
    : new Date();
  const returnDate = searchParams.get("returnDate")
    ? new Date(searchParams.get("returnDate") as string)
    : undefined;
  const tripType = searchParams.get("tripType") || "one-way";
  const passengerCount = parseInt(searchParams.get("passengers") || "1");
  const vehicleTypeId = parseInt(searchParams.get("vehicleType") || "1");
  
  // Seçilen seferin ID'sini al
  const preSelectedScheduleId = searchParams.get("scheduleId") 
    ? parseInt(searchParams.get("scheduleId") as string) 
    : null;
  
  const [selectedTab, setSelectedTab] = useState("outbound");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(preSelectedScheduleId);
  const [returnScheduleId, setReturnScheduleId] = useState<number | null>(null);
  const [passengers, setPassengers] = useState<any[]>([]);

  // Fetch route details
  const { data: route, isLoading: isLoadingRoute } = useQuery<Route>({
    queryKey: [`/api/routes/${routeId}`],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${routeId}`);
      if (!res.ok) throw new Error("Failed to fetch route");
      return res.json();
    },
  });

  // Fetch schedules for the route
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['/api/schedules', routeId],
    queryFn: async () => {
      const res = await fetch(`/api/schedules?routeId=${routeId}`);
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    },
    enabled: !!routeId,
  });

  // Fetch passenger types
  const { data: passengerTypes } = useQuery<PassengerType[]>({
    queryKey: ['/api/passenger-types'],
  });

  // Fetch vehicle types
  const { data: vehicleType } = useQuery<VehicleType>({
    queryKey: ['/api/vehicle-types', vehicleTypeId],
    queryFn: async () => {
      const res = await fetch(`/api/vehicle-types/${vehicleTypeId}`);
      if (!res.ok) throw new Error("Failed to fetch vehicle type");
      return res.json();
    },
    enabled: !!vehicleTypeId,
  });

  // Initialize passenger forms when passenger types are loaded
  useEffect(() => {
    if (passengerTypes && passengerTypes.length > 0) {
      // Create passenger forms based on passenger count
      const defaultPassengers = Array(passengerCount).fill(null).map((_, index) => ({
        passengerTypeId: passengerTypes[0].id, // Default to first passenger type (Adult)
        firstName: "",
        lastName: "",
        documentNumber: "",
        birthDate: "",
        contact: "",
      }));
      setPassengers(defaultPassengers);
    }
  }, [passengerTypes, passengerCount]);

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!route || !vehicleType) return 0;
    
    const basePrice = parseFloat(route.basePrice.toString());
    const vehiclePrice = parseFloat(vehicleType.additionalPrice.toString());
    
    // Calculate passenger price (if we have passenger types)
    let passengerPrice = 0;
    if (passengerTypes) {
      passengers.forEach(passenger => {
        const passengerType = passengerTypes.find(pt => pt.id === passenger.passengerTypeId);
        if (passengerType) {
          passengerPrice += basePrice * parseFloat(passengerType.priceMultiplier.toString());
        }
      });
    } else {
      // Fallback if passenger types not loaded yet
      passengerPrice = basePrice * passengerCount;
    }
    
    return passengerPrice + vehiclePrice;
  };

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Booking created",
        description: "Your booking has been created successfully.",
      });
      
      // Navigate to payment page
      navigate(`/payment/${data.id}?total=${calculateTotalPrice()}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (!selectedScheduleId) {
      toast({
        title: "Schedule required",
        description: "Please select a departure schedule.",
        variant: "destructive",
      });
      return;
    }

    if (tripType === "round-trip" && !returnScheduleId) {
      toast({
        title: "Return schedule required",
        description: "Please select a return schedule.",
        variant: "destructive",
      });
      return;
    }

    // Validate passengers
    const anyIncompletePassenger = passengers.some(
      p => !p.firstName || !p.lastName
    );
    
    if (anyIncompletePassenger) {
      toast({
        title: "Incomplete passenger details",
        description: "Please complete all passenger information.",
        variant: "destructive",
      });
      return;
    }
    
    // We need to construct the query string to pass passenger details
    const passengerParams = new URLSearchParams();
    
    // Add basic search params
    passengerParams.append("departureDate", format(departureDate, "yyyy-MM-dd"));
    if (returnDate) {
      passengerParams.append("returnDate", format(returnDate, "yyyy-MM-dd"));
    }
    passengerParams.append("tripType", tripType);
    passengerParams.append("vehicleType", vehicleTypeId.toString());
    passengerParams.append("scheduleId", selectedScheduleId.toString());
    if (returnScheduleId) {
      passengerParams.append("returnScheduleId", returnScheduleId.toString());
    }
    
    // Add passenger count params
    const adultCount = passengers.filter(p => p.passengerType === "Adult").length;
    const childCount = passengers.filter(p => p.passengerType === "Child").length;
    const seniorCount = passengers.filter(p => p.passengerType === "Senior").length;
    const babyCount = passengers.filter(p => p.passengerType === "Baby").length;
    
    passengerParams.append("passenger_adult", adultCount.toString());
    passengerParams.append("passenger_child", childCount.toString());
    passengerParams.append("passenger_senior", seniorCount.toString());
    passengerParams.append("passenger_baby", babyCount.toString());
    passengerParams.append("passengers", (adultCount + childCount + seniorCount + babyCount).toString());
    
    // Redirect to order page with all parameters
    navigate(`/order/${routeId}?${passengerParams.toString()}`);
  };

  if (isLoadingRoute || isLoadingSchedules) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-red-600 mb-2">Route not found</h3>
              <p className="text-neutral-600 mb-4">
                We couldn't find the requested route.
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
        <title>Book Your Ferry - {route.departurePort} to {route.arrivalPort} | FerryBooking</title>
        <meta
          name="description"
          content={`Book your ferry journey from ${route.departurePort} to ${route.arrivalPort}. Select your schedule and complete your booking online.`}
        />
      </Helmet>

      <div className="bg-neutral-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="md:col-span-2 space-y-6">
                {/* Route Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Ship className="h-5 w-5 mr-2" />
                      Route Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row justify-between mb-4">
                      <div className="text-lg font-medium">
                        {route.departurePort} <ArrowRight className="inline h-4 w-4 mx-1" /> {route.arrivalPort}
                      </div>
                      <div className="flex items-center text-neutral-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatDuration(route.duration)}</span>
                      </div>
                    </div>
                    {route.description && (
                      <p className="text-neutral-600 mb-4">{route.description}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Schedule Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Calendar className="h-5 w-5 mr-2" />
                      Schedule Selection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                      <TabsList className="mb-4">
                        <TabsTrigger value="outbound">Outbound</TabsTrigger>
                        {tripType === "round-trip" && (
                          <TabsTrigger value="return">Return</TabsTrigger>
                        )}
                      </TabsList>

                      <TabsContent value="outbound">
                        <div className="text-sm text-neutral-600 mb-3">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {format(departureDate, "EEEE, MMMM d, yyyy")}
                        </div>

                        {schedules && schedules.length > 0 ? (
                          <div className="space-y-3">
                            {schedules.map(schedule => (
                              <div
                                key={schedule.id}
                                className={`p-4 border rounded-md cursor-pointer transition-colors ${
                                  selectedScheduleId === schedule.id 
                                    ? "border-primary bg-primary/5" 
                                    : "hover:border-primary/50"
                                }`}
                                onClick={() => setSelectedScheduleId(schedule.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">Departs: {schedule.departureTime.substring(0, 5)}</div>
                                    <div className="text-sm text-neutral-600">Arrives: {schedule.arrivalTime.substring(0, 5)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">{formatCurrency(parseFloat(route.basePrice.toString()))}</div>
                                    <div className="text-sm text-neutral-600">per person</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-neutral-600">
                            No schedules available for this date.
                          </div>
                        )}
                      </TabsContent>

                      {tripType === "round-trip" && (
                        <TabsContent value="return">
                          <div className="text-sm text-neutral-600 mb-3">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            {returnDate ? format(returnDate, "EEEE, MMMM d, yyyy") : "No return date selected"}
                          </div>

                          {schedules && schedules.length > 0 ? (
                            <div className="space-y-3">
                              {schedules.map(schedule => (
                                <div
                                  key={`return-${schedule.id}`}
                                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                                    returnScheduleId === schedule.id 
                                      ? "border-primary bg-primary/5" 
                                      : "hover:border-primary/50"
                                  }`}
                                  onClick={() => setReturnScheduleId(schedule.id)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium">Departs: {schedule.departureTime.substring(0, 5)}</div>
                                      <div className="text-sm text-neutral-600">Arrives: {schedule.arrivalTime.substring(0, 5)}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">{formatCurrency(parseFloat(route.basePrice.toString()))}</div>
                                      <div className="text-sm text-neutral-600">per person</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-neutral-600">
                              No schedules available for this date.
                            </div>
                          )}
                        </TabsContent>
                      )}
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Passenger Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Users className="h-5 w-5 mr-2" />
                      Passenger Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {passengers.map((passenger, index) => (
                      <div key={index}>
                        <h3 className="font-medium mb-3">
                          Passenger {index + 1}
                        </h3>
                        <PassengerForm
                          passenger={passenger}
                          index={index}
                          passengerTypes={passengerTypes || []}
                          onChange={(updatedPassenger) => {
                            const newPassengers = [...passengers];
                            newPassengers[index] = updatedPassenger;
                            setPassengers(newPassengers);
                          }}
                        />
                        {index < passengers.length - 1 && <Separator className="my-6" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Booking Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-neutral-600">Route</div>
                        <div className="font-medium">
                          {route.departurePort} to {route.arrivalPort}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-neutral-600">Date</div>
                        <div className="font-medium">
                          {format(departureDate, "MMM d, yyyy")}
                        </div>
                        {returnDate && (
                          <div className="font-medium">
                            Return: {format(returnDate, "MMM d, yyyy")}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-sm text-neutral-600">Passengers</div>
                        <div className="font-medium">
                          {passengerCount} {passengerCount === 1 ? "passenger" : "passengers"}
                        </div>
                      </div>

                      {vehicleType && vehicleTypeId > 1 && (
                        <div>
                          <div className="text-sm text-neutral-600">Vehicle</div>
                          <div className="font-medium">
                            {vehicleType.name} (+{formatCurrency(parseFloat(vehicleType.additionalPrice.toString()))})
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="pt-2">
                        <div className="flex justify-between mb-2">
                          <div className="text-sm font-medium">Total Price</div>
                          <div className="font-bold text-lg">
                            {formatCurrency(calculateTotalPrice())}
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500 mb-4">
                          Including all taxes and fees
                        </div>

                        <Button 
                          className="w-full"
                          onClick={handleContinue}
                          disabled={createBookingMutation.isPending}
                          isLoading={createBookingMutation.isPending}
                        >
                          Continue to Payment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingPage;
