import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Booking, Route } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Eye, MoreHorizontal, ArrowRight } from "lucide-react";

interface BookingTableProps {
  bookings?: Booking[];
  isLoading: boolean;
  onViewBooking?: (booking: Booking) => void;
}

const BookingTable = ({ bookings, isLoading, onViewBooking }: BookingTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch routes for display
  const { data: routes } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });

  // Filter bookings based on search query
  const filteredBookings = bookings?.filter(booking => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const route = routes?.find(r => r.id === booking.routeId);
    
    return (
      booking.bookingReference.toLowerCase().includes(query) ||
      route?.departurePort.toLowerCase().includes(query) ||
      route?.arrivalPort.toLowerCase().includes(query) ||
      booking.status.toLowerCase().includes(query)
    );
  });

  // Get route name for display
  const getRouteName = (routeId: number) => {
    const route = routes?.find(r => r.id === routeId);
    if (!route) return "Unknown Route";
    return `${route.departurePort} to ${route.arrivalPort}`;
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="success">Confirmed</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : !filteredBookings || filteredBookings.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          {searchQuery ? "No bookings found matching your search." : "No bookings available."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.bookingReference}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getRouteName(booking.routeId)}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(booking.departureDate)}</TableCell>
                  <TableCell>
                    {getStatusBadge(booking.status)}
                  </TableCell>
                  <TableCell>{formatCurrency(parseFloat(booking.totalPrice.toString()))}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewBooking?.(booking)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/booking-confirmed/${booking.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Ticket
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BookingTable;
