import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship } from "lucide-react";
import { Booking, Route } from "@shared/schema";
import BookingTable from "@/components/admin/booking-table";
import Sidebar from "@/components/layout/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

const AdminBookings = () => {
  const [viewBookingId, setViewBookingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
  });

  // Get routes for display
  const { data: routes } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });

  // Get currently viewed booking details
  const viewedBooking = bookings?.find(b => b.id === viewBookingId);

  // Group bookings by status
  const confirmedBookings = bookings?.filter(b => b.status === "confirmed");
  const pendingBookings = bookings?.filter(b => b.status === "pending");
  const cancelledBookings = bookings?.filter(b => b.status === "cancelled");

  const handleViewBooking = (booking: Booking) => {
    setViewBookingId(booking.id);
    setDialogOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Manage Bookings - Admin Dashboard | FerryBooking</title>
        <meta name="description" content="Manage ferry bookings in the FerryBooking admin dashboard" />
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Manage Bookings</h1>

            <Tabs defaultValue="all" className="mb-8">
              <TabsList>
                <TabsTrigger value="all">
                  All Bookings ({bookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="confirmed">
                  Confirmed ({confirmedBookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingBookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                  Cancelled ({cancelledBookings?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Ship className="h-5 w-5 mr-2" />
                      All Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingTable 
                      bookings={bookings} 
                      isLoading={isLoading}
                      onViewBooking={handleViewBooking}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="confirmed" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Ship className="h-5 w-5 mr-2" />
                      Confirmed Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingTable 
                      bookings={confirmedBookings} 
                      isLoading={isLoading}
                      onViewBooking={handleViewBooking}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Ship className="h-5 w-5 mr-2" />
                      Pending Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingTable 
                      bookings={pendingBookings} 
                      isLoading={isLoading}
                      onViewBooking={handleViewBooking}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cancelled" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Ship className="h-5 w-5 mr-2" />
                      Cancelled Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingTable 
                      bookings={cancelledBookings} 
                      isLoading={isLoading}
                      onViewBooking={handleViewBooking}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {viewedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Reference</h4>
                  <p className="font-semibold">{viewedBooking.bookingReference}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Status</h4>
                  <p className="font-semibold capitalize">{viewedBooking.status}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Route</h4>
                  <p className="font-semibold">
                    {routes?.find(r => r.id === viewedBooking.routeId)?.departurePort} to {routes?.find(r => r.id === viewedBooking.routeId)?.arrivalPort}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Price</h4>
                  <p className="font-semibold">{viewedBooking.totalPrice}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Departure Date</h4>
                  <p className="font-semibold">{new Date(viewedBooking.departureDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Payment Status</h4>
                  <p className="font-semibold">{viewedBooking.isPaid ? "Paid" : "Unpaid"}</p>
                </div>
                {viewedBooking.returnDate && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500">Return Date</h4>
                    <p className="font-semibold">{new Date(viewedBooking.returnDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-neutral-500">Created At</h4>
                  <p className="font-semibold">{new Date(viewedBooking.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Passengers would be fetched separately in a real implementation */}
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Passengers</h4>
                <p className="text-neutral-600 text-sm">Passenger details would be displayed here</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBookings;
