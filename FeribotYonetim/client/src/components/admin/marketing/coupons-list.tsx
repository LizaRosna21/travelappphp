import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Edit,
  Plus,
  Trash2,
  Copy,
  Tag,
  BarChart4,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format, isAfter } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the coupon schema for form validation
const couponSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters"),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.string().min(1, "Discount value is required"),
  startDate: z.date(),
  endDate: z.date(),
  campaignId: z.number().optional(),
  minimumPurchaseAmount: z.string().optional(),
  usageLimit: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Main Coupons List Component
const CouponsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentCoupon, setCurrentCoupon] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['/api/coupons'],
  });

  // Fetch campaigns for the select dropdown
  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Form setup
  const form = useForm({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discountType: "percentage" as const,
      discountValue: "",
      minimumPurchaseAmount: "",
      usageLimit: "",
      isActive: true,
    },
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: async (newCoupon: any) => {
      const res = await apiRequest("POST", "/api/coupons", {
        ...newCoupon,
        startDate: format(newCoupon.startDate, 'yyyy-MM-dd'),
        endDate: format(newCoupon.endDate, 'yyyy-MM-dd'),
        // Convert string to number for these fields
        usageLimit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : undefined,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Coupon created",
        description: "The coupon was created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update coupon mutation
  const updateCouponMutation = useMutation({
    mutationFn: async (coupon: any) => {
      const res = await apiRequest("PATCH", `/api/coupons/${currentCoupon.id}`, {
        ...coupon,
        startDate: format(coupon.startDate, 'yyyy-MM-dd'),
        endDate: format(coupon.endDate, 'yyyy-MM-dd'),
        // Convert string to number for these fields
        usageLimit: coupon.usageLimit ? parseInt(coupon.usageLimit) : undefined,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Coupon updated",
        description: "The coupon was updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/coupons/${currentCoupon.id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Coupon deleted",
        description: "The coupon was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      setIsDeleteDialogOpen(false);
      setCurrentCoupon(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate a random coupon code
  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue('code', code);
  };

  // Copy coupon code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied to clipboard",
      description: `Coupon code ${code} copied to clipboard.`,
    });
  };

  // Handle form submission
  const onSubmit = (data: any) => {
    if (currentCoupon) {
      updateCouponMutation.mutate(data);
    } else {
      createCouponMutation.mutate(data);
    }
  };

  // Handle edit button click
  const handleEditClick = (coupon: any) => {
    setCurrentCoupon(coupon);
    form.reset({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      startDate: new Date(coupon.startDate),
      endDate: new Date(coupon.endDate),
      campaignId: coupon.campaignId,
      minimumPurchaseAmount: coupon.minimumPurchaseAmount || "",
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : "",
      isActive: coupon.isActive,
    });
    setIsFormOpen(true);
  };

  // Format discount value for display
  const formatDiscountValue = (coupon: any) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`;
    } else {
      return `$${parseFloat(coupon.discountValue).toFixed(2)}`;
    }
  };

  // Calculate usage percentage
  const calculateUsagePercentage = (coupon: any) => {
    if (!coupon.usageLimit || coupon.usageLimit === 0) return 0;
    const usageCount = coupon.usageCount || 0;
    return Math.min(Math.round((usageCount / coupon.usageLimit) * 100), 100);
  };

  // Check if coupon is expired
  const isExpired = (endDate: Date) => {
    return !isAfter(new Date(endDate), new Date());
  };

  // Handle add new button click
  const handleAddNew = () => {
    setCurrentCoupon(null);
    form.reset({
      code: "",
      discountType: "percentage",
      discountValue: "",
      minimumPurchaseAmount: "",
      usageLimit: "",
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Discount Coupons</h2>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading coupons...</p>
        </div>
      ) : coupons?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No coupons found. Create your first discount coupon.</p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Coupon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((coupon: any) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{coupon.code}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5" 
                                onClick={() => copyToClipboard(coupon.code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy to clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>{formatDiscountValue(coupon)}</TableCell>
                    <TableCell>
                      {coupon.campaignId 
                        ? campaigns?.find((c: any) => c.id === coupon.campaignId)?.name || "Unknown" 
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(coupon.startDate), 'MMM d, yyyy')}</span>
                        <span className="text-xs text-muted-foreground">to {format(new Date(coupon.endDate), 'MMM d, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.usageLimit ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{coupon.usageCount || 0} used</span>
                            <span>{coupon.usageLimit} limit</span>
                          </div>
                          <Progress value={calculateUsagePercentage(coupon)} className="h-2" />
                        </div>
                      ) : (
                        <span>{coupon.usageCount || 0} used</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired(coupon.endDate) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Expired
                        </span>
                      ) : !coupon.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(coupon)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentCoupon(coupon);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Coupon Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{currentCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
            <DialogDescription>
              {currentCoupon
                ? "Update the details of your discount coupon."
                : "Add a new discount coupon to your platform."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex space-x-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Coupon Code</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Input placeholder="SUMMER2023" {...field} className="flex-1" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateCouponCode}
                            className="whitespace-nowrap"
                          >
                            Generate
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        A unique code customers will use to redeem this discount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={form.watch('discountType') === 'percentage' ? "10" : "20.00"}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch('discountType') === 'percentage' 
                          ? "Enter percentage without the % symbol" 
                          : "Enter amount in dollars"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Campaign</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a campaign (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {campaigns?.map((campaign: any) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
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
                  control={form.control}
                  name="minimumPurchaseAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Purchase</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="50.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum order amount (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="100"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Max number of redemptions (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Coupon</FormLabel>
                      <FormDescription>
                        When checked, this coupon can be redeemed by customers
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createCouponMutation.isPending || updateCouponMutation.isPending}>
                  {(createCouponMutation.isPending || updateCouponMutation.isPending) ? (
                    <>Saving...</>
                  ) : currentCoupon ? (
                    <>Save Changes</>
                  ) : (
                    <>Create Coupon</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this coupon? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentCoupon && (
              <p className="font-medium">Coupon code: <span className="font-mono">{currentCoupon.code}</span></p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCouponMutation.mutate()}
              disabled={deleteCouponMutation.isPending}
            >
              {deleteCouponMutation.isPending ? "Deleting..." : "Delete Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponsList;