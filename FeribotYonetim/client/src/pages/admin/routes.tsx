import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Route, InsertRoute } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDuration } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Sidebar from "@/components/layout/sidebar";
import RouteForm from "@/components/admin/route-form";
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Ship, ArrowRight } from "lucide-react";

const AdminRoutes = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch routes
  const { data: routes, isLoading } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (newRoute: InsertRoute) => {
      const res = await apiRequest("POST", "/api/admin/routes", newRoute);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Route created",
        description: "The route has been created successfully.",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create route",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update route mutation
  const updateRouteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertRoute> }) => {
      const res = await apiRequest("PATCH", `/api/admin/routes/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Route updated",
        description: "The route has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update route",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle route active status
  const toggleRouteStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/routes/${id}`, { isActive });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Route status updated",
        description: "The route status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update route status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle create route
  const handleCreateRoute = (data: InsertRoute) => {
    createRouteMutation.mutate(data);
  };

  // Handle edit route
  const handleEditRoute = (data: Partial<InsertRoute>) => {
    if (selectedRoute) {
      updateRouteMutation.mutate({ id: selectedRoute.id, data });
    }
  };

  // Handle toggle route status
  const handleToggleRouteStatus = (id: number, currentStatus: boolean) => {
    toggleRouteStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  // Filter routes based on search query
  const filteredRoutes = routes?.filter(route => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      route.departurePort.toLowerCase().includes(query) ||
      route.arrivalPort.toLowerCase().includes(query) ||
      route.description?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Helmet>
        <title>Manage Routes - Admin Dashboard | FerryBooking</title>
        <meta name="description" content="Manage ferry routes in the FerryBooking admin dashboard" />
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Manage Routes</h1>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Route
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Add New Route</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-6">
                    <RouteForm 
                      onSubmit={handleCreateRoute} 
                      isSubmitting={createRouteMutation.isPending}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and filters */}
            <div className="mb-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Ship className="h-5 w-5 mr-2" />
                  Ferry Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : !filteredRoutes || filteredRoutes.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    {searchQuery ? "No routes found matching your search." : "No routes available."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Base Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoutes.map((route) => (
                          <TableRow key={route.id}>
                            <TableCell className="font-medium">
                              <div>
                                {route.departurePort} <ArrowRight className="inline h-3 w-3 mx-1" /> {route.arrivalPort}
                              </div>
                              {route.description && (
                                <div className="text-sm text-neutral-500 mt-1">
                                  {route.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{formatDuration(route.duration)}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(route.basePrice.toString()))}</TableCell>
                            <TableCell>
                              <Switch
                                checked={route.isActive}
                                onCheckedChange={() => handleToggleRouteStatus(route.id, route.isActive)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedRoute(route);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Route Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-6">
            {selectedRoute && (
              <RouteForm 
                onSubmit={handleEditRoute} 
                isSubmitting={updateRouteMutation.isPending}
                initialData={selectedRoute}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminRoutes;
