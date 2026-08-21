import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { Booking, Route } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Ship,
  Loader2,
} from "lucide-react";

const MyBookings = () => {
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
  });

  // Get all unique route IDs from bookings
  const routeIds = bookings ? [...new Set(bookings.map(booking => booking.routeId))] : [];

  // Fetch all routes at once
  const { data: routes } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
    enabled: routeIds.length > 0,
  });

  // Group bookings by status
  const upcomingBookings = bookings?.filter(booking => 
    booking.status === "confirmed" && 
    new Date(booking.departureDate) >= new Date()
  );
  
  const pastBookings = bookings?.filter(booking => 
    new Date(booking.departureDate) < new Date()
  );
  
  const pendingBookings = bookings?.filter(booking => 
    booking.status === "pending"
  );

  // Helper to get route info
  const getRouteInfo = (routeId: number) => {
    return routes?.find(route => route.id === routeId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Ship className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-700 mb-2">No bookings found</h3>
              <p className="text-neutral-600 mb-6">
                You don't have any ferry bookings yet.
              </p>
              <Button asChild>
                <Link href="/">Book a Ferry Now</Link>
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
        <title>My Bookings - FerryBooking</title>
        <meta
          name="description"
          content="View and manage your ferry bookings with FerryBooking."
        />
      </Helmet>

      <div className="bg-neutral-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

            <Tabs defaultValue="upcoming" className="mb-8">
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingBookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingBookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past Trips ({pastBookings?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcomingBookings && upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.map(booking => {
                      const route = getRouteInfo(booking.routeId);
                      return (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                              <div>
                                <div className="flex items-center mb-2">
                                  <div className="text-lg font-semibold">
                                    {route?.departurePort} <ArrowRight className="inline h-4 w-4 mx-1" /> {route?.arrivalPort}
                                  </div>
                                  <div className="ml-2 text-green-600 flex items-center text-sm font-medium">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Confirmed
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {formatDate(booking.departureDate)}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Duration: {route ? Math.floor(route.duration / 60) + 'h ' + (route.duration % 60) + 'm' : 'N/A'}
                                  </div>
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Ref: {booking.bookingReference}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 md:mt-0 flex flex-col items-end">
                                <div className="font-bold text-lg">
                                  {formatCurrency(parseFloat(booking.totalPrice.toString()))}
                                </div>
                                <Link href={`/booking-confirmed/${booking.id}`}>
                                  <Button className="mt-2" size="sm">View Ticket</Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-6">
                        <h3 className="text-neutral-700 mb-2">No upcoming bookings</h3>
                        <p className="text-neutral-600 mb-4">
                          You don't have any upcoming ferry trips.
                        </p>
                        <Button asChild>
                          <Link href="/">Book a Ferry Now</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="pending">
                {pendingBookings && pendingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pendingBookings.map(booking => {
                      const route = getRouteInfo(booking.routeId);
                      return (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow border-amber-200">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                              <div>
                                <div className="flex items-center mb-2">
                                  <div className="text-lg font-semibold">
                                    {route?.departurePort} <ArrowRight className="inline h-4 w-4 mx-1" /> {route?.arrivalPort}
                                  </div>
                                  <div className="ml-2 text-amber-600 flex items-center text-sm font-medium">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Payment Pending
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {formatDate(booking.departureDate)}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Duration: {route ? Math.floor(route.duration / 60) + 'h ' + (route.duration % 60) + 'm' : 'N/A'}
                                  </div>
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Ref: {booking.bookingReference}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 md:mt-0 flex flex-col items-end">
                                <div className="font-bold text-lg">
                                  {formatCurrency(parseFloat(booking.totalPrice.toString()))}
                                </div>
                                <Link href={`/payment/${booking.id}?total=${booking.totalPrice}`}>
                                  <Button className="mt-2" size="sm" variant="destructive">Complete Payment</Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-6">
                        <h3 className="text-neutral-700 mb-2">No pending bookings</h3>
                        <p className="text-neutral-600">
                          You don't have any bookings awaiting payment.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="past">
                {pastBookings && pastBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pastBookings.map(booking => {
                      const route = getRouteInfo(booking.routeId);
                      return (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow opacity-80">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                              <div>
                                <div className="flex items-center mb-2">
                                  <div className="text-lg font-semibold">
                                    {route?.departurePort} <ArrowRight className="inline h-4 w-4 mx-1" /> {route?.arrivalPort}
                                  </div>
                                  <div className="ml-2 text-neutral-600 flex items-center text-sm font-medium">
                                    Completed
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {formatDate(booking.departureDate)}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Duration: {route ? Math.floor(route.duration / 60) + 'h ' + (route.duration % 60) + 'm' : 'N/A'}
                                  </div>
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Ref: {booking.bookingReference}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 md:mt-0 flex flex-col items-end">
                                <div className="font-bold text-lg">
                                  {formatCurrency(parseFloat(booking.totalPrice.toString()))}
                                </div>
                                <Button 
                                  className="mt-2" 
                                  size="sm" 
                                  variant="outline"
                                  asChild
                                >
                                  <Link href={`/booking-confirmed/${booking.id}`}>View Receipt</Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-6">
                        <h3 className="text-neutral-700 mb-2">No past bookings</h3>
                        <p className="text-neutral-600">
                          You don't have any past ferry trips.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default MyBookings;
