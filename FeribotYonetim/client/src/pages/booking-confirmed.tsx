import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Booking, Route } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Printer, Calendar, Ship, ArrowRight, Clock, MapPin } from "lucide-react";

const BookingConfirmed = () => {
  const params = useParams<{ bookingId: string }>();
  const bookingId = parseInt(params.bookingId);

  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
  });

  // Fetch route details if we have booking
  const { data: route } = useQuery<Route>({
    queryKey: [`/api/routes/${booking?.routeId}`],
    enabled: !!booking,
  });

  // Fetch booking passengers
  const { data: passengers } = useQuery({
    queryKey: [`/api/bookings/${bookingId}/passengers`],
    enabled: !!booking,
  });

  if (isLoadingBooking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!booking || !booking.isPaid) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-red-600 mb-2">Booking not found or not paid</h3>
              <p className="text-neutral-600 mb-4">
                We couldn't find the requested booking or the payment is not completed.
              </p>
              <Button asChild>
                <Link href="/my-bookings">View My Bookings</Link>
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
        <title>Booking Confirmed - FerryBooking</title>
        <meta
          name="description"
          content="Your ferry booking has been confirmed. View your booking details and e-ticket."
        />
      </Helmet>

      <div className="bg-neutral-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
              <p className="text-neutral-600">
                Your booking has been confirmed and your e-ticket is ready.
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="text-xl">
                  E-Ticket: {booking.bookingReference}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Route information */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <Ship className="h-5 w-5 mr-2" />
                    Journey Details
                  </h3>

                  <div className="bg-neutral-50 p-4 rounded-md">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <div className="text-neutral-600 text-sm">Route</div>
                        <div className="text-lg font-medium">
                          {route?.departurePort} <ArrowRight className="inline h-4 w-4 mx-1" /> {route?.arrivalPort}
                        </div>
                      </div>
                      {route && (
                        <div className="flex items-center text-neutral-600 mt-2 md:mt-0">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Duration: {Math.floor(route.duration / 60)}h {route.duration % 60}m</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-neutral-600 text-sm">Departure Date</div>
                        <div className="font-medium">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {formatDate(booking.departureDate)}
                        </div>
                      </div>

                      {booking.returnDate && (
                        <div>
                          <div className="text-neutral-600 text-sm">Return Date</div>
                          <div className="font-medium">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            {formatDate(booking.returnDate)}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-neutral-600 text-sm">Status</div>
                        <div className="font-medium text-green-600">
                          Confirmed
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger information */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Passenger Information
                  </h3>

                  {passengers && passengers.length > 0 ? (
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="space-y-4">
                        {passengers.map((passenger, index) => (
                          <div key={index} className="flex justify-between">
                            <div>
                              <div className="font-medium">
                                {passenger.firstName} {passenger.lastName}
                              </div>
                              <div className="text-sm text-neutral-600">
                                {passenger.documentNumber && `ID: ${passenger.documentNumber}`}
                              </div>
                            </div>
                            <div className="text-sm text-neutral-600">
                              Passenger {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-neutral-600">
                      No passenger information available.
                    </div>
                  )}
                </div>

                {/* Payment information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <Ship className="h-5 w-5 mr-2" />
                    Payment Information
                  </h3>

                  <div className="bg-neutral-50 p-4 rounded-md">
                    <div className="flex justify-between mb-2">
                      <div className="text-neutral-600">Price</div>
                      <div className="font-medium">{formatCurrency(parseFloat(booking.totalPrice.toString()))}</div>
                    </div>
                    <div className="flex justify-between mb-2">
                      <div className="text-neutral-600">Payment Status</div>
                      <div className="font-medium text-green-600">Paid</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-neutral-600">Payment Date</div>
                      <div className="font-medium">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" className="flex items-center" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print E-Ticket
              </Button>
              <Button asChild>
                <Link href="/my-bookings">View My Bookings</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingConfirmed;
