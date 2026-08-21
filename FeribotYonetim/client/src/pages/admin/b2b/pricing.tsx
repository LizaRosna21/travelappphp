import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import UnifiedAdminLayout from "@/components/admin/unified-admin-layout";
import {
  PlusCircle,
  FileEdit,
  Trash2,
  DollarSign,
  Percent,
  Building,
  Users,
  ChevronsUpDown,
  ArrowDownUp,
  ShieldCheck,
  LifeBuoy,
  Car,
  Map,
  Settings,
  RefreshCcw,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// Define B2B pricing models
const pricingTierSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Tier name is required"),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string().min(1, "Discount value is required"),
  minBookingCount: z.number().min(0),
  minTotalAmount: z.string(),
  requiresApproval: z.boolean().default(false),
  isActive: z.boolean().default(true),
  agencyCategory: z.string().min(1, "Agency category is required"),
});

const agencyPricingSchema = z.object({
  id: z.number().optional(),
  agencyId: z.number(),
  agencyName: z.string().optional(),
  pricingTierId: z.number().optional(),
  customDiscountType: z.enum(["percentage", "fixed"]).optional(),
  customDiscountValue: z.string().optional(),
  routeSpecificPricing: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

const routePricingSchema = z.object({
  id: z.number().optional(),
  agencyId: z.number(),
  routeId: z.number(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string().min(1, "Discount value is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

type PricingTier = z.infer<typeof pricingTierSchema>;
type AgencyPricing = z.infer<typeof agencyPricingSchema>;
type RoutePricing = z.infer<typeof routePricingSchema>;

const B2BPricing: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pricing-tiers");
  const [addTierDialogOpen, setAddTierDialogOpen] = useState(false);
  const [editTierDialogOpen, setEditTierDialogOpen] = useState(false);
  const [addAgencyPricingDialogOpen, setAddAgencyPricingDialogOpen] = useState(false);
  const [editAgencyPricingDialogOpen, setEditAgencyPricingDialogOpen] = useState(false);
  const [addRoutePricingDialogOpen, setAddRoutePricingDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedAgencyPricing, setSelectedAgencyPricing] = useState<AgencyPricing | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  
  // Fetch data
  const { data: pricingTiers, isLoading: tiersLoading } = useQuery({
    queryKey: ["/api/admin/pricing-tiers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/admin/pricing-tiers`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching pricing tiers:", error);
        toast({
          title: "Error",
          description: "Failed to load pricing tiers",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  const { data: agencyPricingList, isLoading: agencyPricingLoading } = useQuery({
    queryKey: ["/api/admin/agency-pricing"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/agency-pricing");
        return await response.json();
      } catch (error) {
        console.error("Error fetching agency pricing:", error);
        toast({
          title: "Error",
          description: "Failed to load agency pricing",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  const { data: routePricing, isLoading: routePricingLoading } = useQuery({
    queryKey: ["/api/admin/route-pricing"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/route-pricing");
        return await response.json();
      } catch (error) {
        console.error("Error fetching route pricing:", error);
        toast({
          title: "Error",
          description: "Failed to load route pricing",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  const { data: agencies } = useQuery({
    queryKey: ["/api/admin/agencies"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/agencies");
        return await response.json();
      } catch (error) {
        console.error("Error fetching agencies:", error);
        return [];
      }
    }
  });

  const { data: routes } = useQuery({
    queryKey: ["/api/routes"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/routes");
        return await response.json();
      } catch (error) {
        console.error("Error fetching routes:", error);
        return [];
      }
    }
  });

  // Create pricing tier mutation
  const createTierMutation = useMutation({
    mutationFn: async (data: PricingTier) => {
      const response = await apiRequest("POST", "/api/admin/pricing-tiers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pricing tier created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-tiers"] });
      setAddTierDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create pricing tier",
        variant: "destructive",
      });
    },
  });

  // Update pricing tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (data: PricingTier) => {
      const response = await apiRequest("PUT", `/api/admin/pricing-tiers/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pricing tier updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-tiers"] });
      setEditTierDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update pricing tier",
        variant: "destructive",
      });
    },
  });

  // Delete pricing tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/pricing-tiers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pricing tier deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-tiers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete pricing tier",
        variant: "destructive",
      });
    },
  });

  // Create agency pricing mutation
  const createAgencyPricingMutation = useMutation({
    mutationFn: async (data: AgencyPricing) => {
      const response = await apiRequest("POST", "/api/admin/agency-pricing", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agency pricing created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agency-pricing"] });
      setAddAgencyPricingDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create agency pricing",
        variant: "destructive",
      });
    },
  });

  // Update agency pricing mutation
  const updateAgencyPricingMutation = useMutation({
    mutationFn: async (data: AgencyPricing) => {
      const response = await apiRequest("PUT", `/api/admin/agency-pricing/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agency pricing updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agency-pricing"] });
      setEditAgencyPricingDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update agency pricing",
        variant: "destructive",
      });
    },
  });

  // Delete agency pricing mutation
  const deleteAgencyPricingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/agency-pricing/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agency pricing deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agency-pricing"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete agency pricing",
        variant: "destructive",
      });
    },
  });

  // Create route pricing mutation
  const createRoutePricingMutation = useMutation({
    mutationFn: async (data: RoutePricing) => {
      const response = await apiRequest("POST", "/api/admin/route-pricing", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Route pricing created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/route-pricing"] });
      setAddRoutePricingDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create route pricing",
        variant: "destructive",
      });
    },
  });

  // Forms
  const tierForm = useForm<PricingTier>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minBookingCount: 0,
      minTotalAmount: "0",
      requiresApproval: false,
      isActive: true,
      agencyCategory: "regular",
    },
  });

  const agencyPricingForm = useForm<AgencyPricing>({
    resolver: zodResolver(agencyPricingSchema),
    defaultValues: {
      agencyId: 0,
      pricingTierId: undefined,
      customDiscountType: undefined,
      customDiscountValue: undefined,
      routeSpecificPricing: false,
      startDate: undefined,
      endDate: undefined,
      isActive: true,
    },
  });

  const routePricingForm = useForm<RoutePricing>({
    resolver: zodResolver(routePricingSchema),
    defaultValues: {
      agencyId: 0,
      routeId: 0,
      discountType: "percentage",
      discountValue: "",
      startDate: undefined,
      endDate: undefined,
      isActive: true,
    },
  });

  // Handler for opening edit dialog with selected tier data
  const handleEditTier = (tier: PricingTier) => {
    setSelectedTier(tier);
    tierForm.reset({
      id: tier.id,
      name: tier.name,
      description: tier.description || "",
      discountType: tier.discountType,
      discountValue: tier.discountValue,
      minBookingCount: tier.minBookingCount,
      minTotalAmount: tier.minTotalAmount,
      requiresApproval: tier.requiresApproval,
      isActive: tier.isActive,
      agencyCategory: tier.agencyCategory,
    });
    setEditTierDialogOpen(true);
  };

  // Handler for opening edit agency pricing dialog
  const handleEditAgencyPricing = (pricing: AgencyPricing) => {
    setSelectedAgencyPricing(pricing);
    agencyPricingForm.reset({
      id: pricing.id,
      agencyId: pricing.agencyId,
      pricingTierId: pricing.pricingTierId,
      customDiscountType: pricing.customDiscountType,
      customDiscountValue: pricing.customDiscountValue,
      routeSpecificPricing: pricing.routeSpecificPricing,
      startDate: pricing.startDate,
      endDate: pricing.endDate,
      isActive: pricing.isActive,
    });
    setEditAgencyPricingDialogOpen(true);
  };

  // Format discount for display
  const formatDiscount = (type: string, value: string) => {
    return type === "percentage" ? `${value}%` : `₺${value}`;
  };

  // Get agency name by ID
  const getAgencyName = (agencyId: number) => {
    if (!agencies) return "Unknown";
    const agency = agencies.find((a: any) => a.id === agencyId);
    return agency ? agency.name : "Unknown";
  };

  // Get route name by ID
  const getRouteName = (routeId: number) => {
    if (!routes) return "Unknown";
    const route = routes.find((r: any) => r.id === routeId);
    return route ? `${route.departurePort} - ${route.arrivalPort}` : "Unknown";
  };

  // Get tier name by ID
  const getTierName = (tierId?: number) => {
    if (!tierId || !pricingTiers) return "Custom Pricing";
    const tier = pricingTiers.find((t: PricingTier) => t.id === tierId);
    return tier ? tier.name : "Unknown Tier";
  };

  return (
    <UnifiedAdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">B2B Pricing Management</h1>
            <p className="text-muted-foreground">Define pricing tiers, agency discounts, and route-specific pricing</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing-tiers">
              <Building className="mr-2 h-4 w-4" />
              Pricing Tiers
            </TabsTrigger>
            <TabsTrigger value="agency-pricing">
              <Users className="mr-2 h-4 w-4" />
              Agency Pricing
            </TabsTrigger>
            <TabsTrigger value="route-pricing">
              <Map className="mr-2 h-4 w-4" />
              Route-specific Pricing
            </TabsTrigger>
          </TabsList>

          {/* Pricing Tiers Tab */}
          <TabsContent value="pricing-tiers" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-sm">
                <Input 
                  placeholder="Search tiers..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={addTierDialogOpen} onOpenChange={setAddTierDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    tierForm.reset({
                      name: "",
                      description: "",
                      discountType: "percentage",
                      discountValue: "",
                      minBookingCount: 0,
                      minTotalAmount: "0",
                      requiresApproval: false,
                      isActive: true,
                      agencyCategory: "regular",
                    });
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Pricing Tier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add Pricing Tier</DialogTitle>
                    <DialogDescription>
                      Create a new pricing tier for B2B partners.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...tierForm}>
                    <form onSubmit={tierForm.handleSubmit((data) => createTierMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={tierForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tier Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Gold Partner" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tierForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Premium partners with high volume" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tierForm.control}
                          name="discountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Type</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount (₺)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tierForm.control}
                          name="discountValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Value</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder={tierForm.watch("discountType") === "percentage" ? "10" : "100"} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tierForm.control}
                          name="minBookingCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min. Booking Count</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="10" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum monthly bookings
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tierForm.control}
                          name="minTotalAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min. Total Amount</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="10000" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum monthly revenue (₺)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={tierForm.control}
                        name="agencyCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agency Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                                <SelectItem value="strategic">Strategic Partner</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tierForm.control}
                        name="requiresApproval"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Requires Approval</FormLabel>
                              <FormDescription>
                                Bookings require admin approval
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tierForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Tier is available for selection
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createTierMutation.isPending}>
                          {createTierMutation.isPending ? "Creating..." : "Create Tier"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Edit Tier Dialog */}
              <Dialog open={editTierDialogOpen} onOpenChange={setEditTierDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Edit Pricing Tier</DialogTitle>
                    <DialogDescription>
                      Update the pricing tier details.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...tierForm}>
                    <form onSubmit={tierForm.handleSubmit((data) => updateTierMutation.mutate(data))} className="space-y-4">
                      {/* Same form fields as in the add dialog */}
                      <FormField
                        control={tierForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tier Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Gold Partner" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tierForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Premium partners with high volume" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tierForm.control}
                          name="discountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Type</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount (₺)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tierForm.control}
                          name="discountValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Value</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder={tierForm.watch("discountType") === "percentage" ? "10" : "100"} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tierForm.control}
                          name="minBookingCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min. Booking Count</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="10" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum monthly bookings
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tierForm.control}
                          name="minTotalAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min. Total Amount</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="10000" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum monthly revenue (₺)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={tierForm.control}
                        name="agencyCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agency Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                                <SelectItem value="strategic">Strategic Partner</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tierForm.control}
                        name="requiresApproval"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Requires Approval</FormLabel>
                              <FormDescription>
                                Bookings require admin approval
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tierForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Tier is available for selection
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={updateTierMutation.isPending}>
                          {updateTierMutation.isPending ? "Updating..." : "Update Tier"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Requirements</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Loading pricing tiers...
                        </TableCell>
                      </TableRow>
                    ) : pricingTiers && pricingTiers.length > 0 ? (
                      pricingTiers
                        .filter((tier: PricingTier) => 
                          tier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tier.description?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((tier: PricingTier) => (
                          <TableRow key={tier.id}>
                            <TableCell>
                              <div className="font-medium">{tier.name}</div>
                              <div className="text-sm text-muted-foreground">{tier.description}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tier.agencyCategory.charAt(0).toUpperCase() + tier.agencyCategory.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDiscount(tier.discountType, tier.discountValue)}
                            </TableCell>
                            <TableCell>
                              Min. {tier.minBookingCount} bookings<br />
                              Min. ₺{tier.minTotalAmount}
                            </TableCell>
                            <TableCell>
                              {tier.requiresApproval ? (
                                <Badge variant="secondary">Required</Badge>
                              ) : (
                                <Badge variant="outline">Not Required</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {tier.isActive ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditTier(tier)}
                                >
                                  <FileEdit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this pricing tier?")) {
                                      deleteTierMutation.mutate(tier.id as number);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No pricing tiers found. Click "Add Pricing Tier" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agency Pricing Tab */}
          <TabsContent value="agency-pricing" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-sm">
                <Input 
                  placeholder="Search agency pricing..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={addAgencyPricingDialogOpen} onOpenChange={setAddAgencyPricingDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    agencyPricingForm.reset({
                      agencyId: 0,
                      pricingTierId: undefined,
                      customDiscountType: undefined,
                      customDiscountValue: undefined,
                      routeSpecificPricing: false,
                      startDate: undefined,
                      endDate: undefined,
                      isActive: true,
                    });
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Agency Pricing
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add Agency Pricing</DialogTitle>
                    <DialogDescription>
                      Assign pricing tier or custom pricing to an agency.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...agencyPricingForm}>
                    <form onSubmit={agencyPricingForm.handleSubmit((data) => createAgencyPricingMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={agencyPricingForm.control}
                        name="agencyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agency</FormLabel>
                            <Select
                              value={field.value.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select agency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {agencies && agencies.map((agency: any) => (
                                  <SelectItem key={agency.id} value={agency.id.toString()}>
                                    {agency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={agencyPricingForm.control}
                        name="pricingTierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pricing Tier</FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                if (value === "custom") {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(parseInt(value));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select pricing tier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="custom">Custom Pricing</SelectItem>
                                {pricingTiers && pricingTiers.map((tier: PricingTier) => (
                                  <SelectItem key={tier.id} value={tier.id?.toString() || ""}>
                                    {tier.name} ({formatDiscount(tier.discountType, tier.discountValue)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {!agencyPricingForm.watch("pricingTierId") && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={agencyPricingForm.control}
                            name="customDiscountType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Discount Type</FormLabel>
                                <Select
                                  value={field.value || "percentage"}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (₺)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={agencyPricingForm.control}
                            name="customDiscountValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Discount Value</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="text" 
                                    placeholder={agencyPricingForm.watch("customDiscountType") === "percentage" ? "10" : "100"} 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      <FormField
                        control={agencyPricingForm.control}
                        name="routeSpecificPricing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Route-specific Pricing</FormLabel>
                              <FormDescription>
                                Enable different pricing for specific routes
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={agencyPricingForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agencyPricingForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={agencyPricingForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Pricing is currently applied
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createAgencyPricingMutation.isPending}>
                          {createAgencyPricingMutation.isPending ? "Creating..." : "Create Pricing"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Edit Agency Pricing Dialog */}
              <Dialog open={editAgencyPricingDialogOpen} onOpenChange={setEditAgencyPricingDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Edit Agency Pricing</DialogTitle>
                    <DialogDescription>
                      Update pricing settings for this agency.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...agencyPricingForm}>
                    <form onSubmit={agencyPricingForm.handleSubmit((data) => updateAgencyPricingMutation.mutate(data))} className="space-y-4">
                      {/* Same form fields as in the add dialog */}
                      <FormField
                        control={agencyPricingForm.control}
                        name="agencyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agency</FormLabel>
                            <Select
                              value={field.value.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={true} // Cannot change agency in edit mode
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select agency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {agencies && agencies.map((agency: any) => (
                                  <SelectItem key={agency.id} value={agency.id.toString()}>
                                    {agency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={agencyPricingForm.control}
                        name="pricingTierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pricing Tier</FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                if (value === "custom") {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(parseInt(value));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select pricing tier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="custom">Custom Pricing</SelectItem>
                                {pricingTiers && pricingTiers.map((tier: PricingTier) => (
                                  <SelectItem key={tier.id} value={tier.id?.toString() || ""}>
                                    {tier.name} ({formatDiscount(tier.discountType, tier.discountValue)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {!agencyPricingForm.watch("pricingTierId") && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={agencyPricingForm.control}
                            name="customDiscountType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Discount Type</FormLabel>
                                <Select
                                  value={field.value || "percentage"}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (₺)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={agencyPricingForm.control}
                            name="customDiscountValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Discount Value</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="text" 
                                    placeholder={agencyPricingForm.watch("customDiscountType") === "percentage" ? "10" : "100"} 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      <FormField
                        control={agencyPricingForm.control}
                        name="routeSpecificPricing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Route-specific Pricing</FormLabel>
                              <FormDescription>
                                Enable different pricing for specific routes
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={agencyPricingForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agencyPricingForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={agencyPricingForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Pricing is currently applied
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={updateAgencyPricingMutation.isPending}>
                          {updateAgencyPricingMutation.isPending ? "Updating..." : "Update Pricing"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agency</TableHead>
                      <TableHead>Pricing Model</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Route-Specific</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyPricingLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Loading agency pricing...
                        </TableCell>
                      </TableRow>
                    ) : agencyPricingList && agencyPricingList.length > 0 ? (
                      agencyPricingList
                        .filter((pricing: AgencyPricing) => {
                          const agencyName = getAgencyName(pricing.agencyId).toLowerCase();
                          return agencyName.includes(searchQuery.toLowerCase());
                        })
                        .map((pricing: AgencyPricing) => (
                          <TableRow key={pricing.id}>
                            <TableCell>
                              <div className="font-medium">{getAgencyName(pricing.agencyId)}</div>
                              <div className="text-xs text-muted-foreground">ID: {pricing.agencyId}</div>
                            </TableCell>
                            <TableCell>
                              {pricing.pricingTierId ? (
                                <Badge variant="outline">{getTierName(pricing.pricingTierId)}</Badge>
                              ) : (
                                <Badge>Custom</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {pricing.pricingTierId ? (
                                <span className="text-muted-foreground">As per tier</span>
                              ) : (
                                pricing.customDiscountType && pricing.customDiscountValue ? 
                                formatDiscount(pricing.customDiscountType, pricing.customDiscountValue) : 
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell>
                              {pricing.routeSpecificPricing ? (
                                <Badge variant="outline">Enabled</Badge>
                              ) : (
                                <Badge variant="secondary">Disabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {pricing.startDate ? (
                                <>
                                {new Date(pricing.startDate).toLocaleDateString("tr-TR")}
                                {pricing.endDate && ` - ${new Date(pricing.endDate).toLocaleDateString("tr-TR")}`}
                                </>
                              ) : "Indefinite"}
                            </TableCell>
                            <TableCell>
                              {pricing.isActive ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditAgencyPricing(pricing)}
                                >
                                  <FileEdit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this agency pricing?")) {
                                      deleteAgencyPricingMutation.mutate(pricing.id as number);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No agency pricing found. Click "Add Agency Pricing" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Route-specific Pricing Tab */}
          <TabsContent value="route-pricing" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-sm">
                <Input 
                  placeholder="Search route pricing..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={addRoutePricingDialogOpen} onOpenChange={setAddRoutePricingDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    routePricingForm.reset({
                      agencyId: 0,
                      routeId: 0,
                      discountType: "percentage",
                      discountValue: "",
                      startDate: undefined,
                      endDate: undefined,
                      isActive: true,
                    });
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Route Pricing
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add Route Pricing</DialogTitle>
                    <DialogDescription>
                      Define specific pricing for a route and agency.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...routePricingForm}>
                    <form onSubmit={routePricingForm.handleSubmit((data) => createRoutePricingMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={routePricingForm.control}
                        name="agencyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agency</FormLabel>
                            <Select
                              value={field.value.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select agency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {agencies && agencies.map((agency: any) => (
                                  <SelectItem key={agency.id} value={agency.id.toString()}>
                                    {agency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={routePricingForm.control}
                        name="routeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Route</FormLabel>
                            <Select
                              value={field.value.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select route" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {routes && routes.map((route: any) => (
                                  <SelectItem key={route.id} value={route.id.toString()}>
                                    {route.departurePort} - {route.arrivalPort}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={routePricingForm.control}
                          name="discountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Type</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount (₺)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routePricingForm.control}
                          name="discountValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Value</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder={routePricingForm.watch("discountType") === "percentage" ? "10" : "100"} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={routePricingForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routePricingForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={routePricingForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Pricing is currently applied
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createRoutePricingMutation.isPending}>
                          {createRoutePricingMutation.isPending ? "Creating..." : "Create Pricing"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agency</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routePricingLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Loading route pricing...
                        </TableCell>
                      </TableRow>
                    ) : routePricing && routePricing.length > 0 ? (
                      routePricing
                        .filter((pricing: RoutePricing) => {
                          const agencyName = getAgencyName(pricing.agencyId).toLowerCase();
                          const routeName = getRouteName(pricing.routeId).toLowerCase();
                          return agencyName.includes(searchQuery.toLowerCase()) || 
                                 routeName.includes(searchQuery.toLowerCase());
                        })
                        .map((pricing: RoutePricing) => (
                          <TableRow key={pricing.id}>
                            <TableCell>
                              {getAgencyName(pricing.agencyId)}
                            </TableCell>
                            <TableCell>
                              {getRouteName(pricing.routeId)}
                            </TableCell>
                            <TableCell>
                              {formatDiscount(pricing.discountType, pricing.discountValue)}
                            </TableCell>
                            <TableCell>
                              {pricing.startDate ? (
                                <>
                                {new Date(pricing.startDate).toLocaleDateString("tr-TR")}
                                {pricing.endDate && ` - ${new Date(pricing.endDate).toLocaleDateString("tr-TR")}`}
                                </>
                              ) : "Indefinite"}
                            </TableCell>
                            <TableCell>
                              {pricing.isActive ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this route pricing?")) {
                                    // Delete functionality would go here
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No route pricing found. Click "Add Route Pricing" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UnifiedAdminLayout>
  );
};

export default B2BPricing;