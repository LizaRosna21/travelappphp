import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Edit,
  Plus,
  Trash2,
  Activity,
  BarChart4,
  CalendarClock,
  Users,
  Link,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the campaign schema for form validation
const campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  type: z.enum(["discount", "seasonal", "promotion", "launch", "other"]),
  budget: z.string().optional(),
  goal: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "paused"]).default("draft"),
  targetUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

// Main Campaigns List Component
const CampaignsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Fetch associated data for campaign details
  const { data: customerSegments } = useQuery({
    queryKey: ['/api/customer-segments'],
  });

  const { data: coupons } = useQuery({
    queryKey: ['/api/coupons'],
  });

  const { data: marketingEmails } = useQuery({
    queryKey: ['/api/marketing-emails'],
  });

  // Form setup
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "promotion",
      budget: "",
      goal: "",
      status: "draft",
      targetUrl: "",
      isActive: true,
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (newCampaign: CampaignFormValues) => {
      const res = await apiRequest("POST", "/api/campaigns", {
        ...newCampaign,
        startDate: format(newCampaign.startDate, 'yyyy-MM-dd'),
        endDate: format(newCampaign.endDate, 'yyyy-MM-dd'),
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign created",
        description: "The campaign was created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: async (campaign: CampaignFormValues) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${currentCampaign.id}`, {
        ...campaign,
        startDate: format(campaign.startDate, 'yyyy-MM-dd'),
        endDate: format(campaign.endDate, 'yyyy-MM-dd'),
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign updated",
        description: "The campaign was updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/campaigns/${currentCampaign.id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "The campaign was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setIsDeleteDialogOpen(false);
      setCurrentCampaign(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CampaignFormValues) => {
    if (currentCampaign) {
      updateCampaignMutation.mutate(data);
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  // Handle edit button click
  const handleEditClick = (campaign: any) => {
    setCurrentCampaign(campaign);
    form.reset({
      name: campaign.name,
      description: campaign.description || "",
      startDate: new Date(campaign.startDate),
      endDate: new Date(campaign.endDate),
      type: campaign.type,
      budget: campaign.budget || "",
      goal: campaign.goal || "",
      status: campaign.status,
      targetUrl: campaign.targetUrl || "",
      isActive: campaign.isActive,
    });
    setIsFormOpen(true);
  };

  // Handle view details click
  const handleViewDetails = (campaign: any) => {
    setCurrentCampaign(campaign);
    setIsDetailsOpen(true);
  };

  // Handle add new button click
  const handleAddNew = () => {
    setCurrentCampaign(null);
    form.reset({
      name: "",
      description: "",
      type: "promotion",
      budget: "",
      goal: "",
      status: "draft",
      targetUrl: "",
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });
    setIsFormOpen(true);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "paused":
        return <Badge variant="warning">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get campaign type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "discount":
        return <Badge variant="default">Discount</Badge>;
      case "seasonal":
        return <Badge variant="success">Seasonal</Badge>;
      case "promotion":
        return <Badge variant="info">Promotion</Badge>;
      case "launch":
        return <Badge variant="destructive">Launch</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate days remaining
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    // If the campaign is already over
    if (end < now) {
      return <span className="text-muted-foreground">Ended</span>;
    }
    
    const diffTime = Math.abs(end.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return (
      <span>
        {diffDays} day{diffDays !== 1 ? "s" : ""} left
      </span>
    );
  };

  // Calculate campaign progress
  const getCampaignProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();

    // If campaign hasn't started yet
    if (now < start) {
      return 0;
    }
    
    // If campaign has ended
    if (now > end) {
      return 100;
    }
    
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / totalDuration) * 100);
  };

  // Get associated resources for a campaign
  const getAssociatedResources = (campaignId: number) => {
    const associatedCoupons = coupons?.filter((coupon: any) => coupon.campaignId === campaignId) || [];
    const associatedEmails = marketingEmails?.filter((email: any) => email.campaignId === campaignId) || [];
    const associatedSegments = customerSegments?.filter((segment: any) => 
      segment.campaigns?.includes(campaignId)
    ) || [];

    return {
      coupons: associatedCoupons,
      emails: associatedEmails,
      segments: associatedSegments,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Marketing Campaigns</h2>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading campaigns...</p>
        </div>
      ) : campaigns?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No campaigns found. Create your first marketing campaign.</p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Active Campaigns</CardTitle>
              <CardDescription>
                Monitor and manage your ongoing marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns?.map((campaign: any) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <div>
                          {campaign.name}
                          {campaign.targetUrl && (
                            <a 
                              href={campaign.targetUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center ml-2 text-xs text-muted-foreground hover:text-primary"
                            >
                              <Link className="h-3 w-3 mr-1" />
                              Landing page
                            </a>
                          )}
                        </div>
                        {campaign.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {campaign.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(campaign.type)}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 w-[100px]">
                          <Progress 
                            value={getCampaignProgress(campaign.startDate, campaign.endDate)} 
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            {getCampaignProgress(campaign.startDate, campaign.endDate)}% complete
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(campaign.startDate), 'MMM d')} - {format(new Date(campaign.endDate), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs font-medium">
                            {getDaysRemaining(campaign.endDate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewDetails(campaign)}
                          >
                            <Activity className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(campaign)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentCampaign(campaign);
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
        </div>
      )}

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{currentCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
            <DialogDescription>
              {currentCampaign
                ? "Update the details of your marketing campaign."
                : "Add a new marketing campaign to track your promotion activities."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Sale 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Briefly describe the purpose of this campaign"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for your internal reference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select campaign type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="launch">Product Launch</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="1000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Campaign budget in USD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Increase sales by 20%" {...field} />
                      </FormControl>
                      <FormDescription>
                        Objective of this campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="targetUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/summer-sale"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Landing page URL for this campaign
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                      <FormLabel>
                        Active Campaign
                      </FormLabel>
                      <FormDescription>
                        When checked, this campaign will be visible throughout the system
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
                <Button 
                  type="submit" 
                  disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                >
                  {(createCampaignMutation.isPending || updateCampaignMutation.isPending) ? (
                    <>Saving...</>
                  ) : currentCampaign ? (
                    <>Save Changes</>
                  ) : (
                    <>Create Campaign</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Campaign Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Campaign Details</DialogTitle>
          </DialogHeader>
          
          {currentCampaign && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{currentCampaign.name}</h3>
                  {currentCampaign.description && (
                    <p className="text-muted-foreground mt-1">{currentCampaign.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {getTypeBadge(currentCampaign.type)}
                  {getStatusBadge(currentCampaign.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center space-x-2">
                    <CalendarClock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(currentCampaign.startDate), 'MMM d')} - {format(new Date(currentCampaign.endDate), 'MMM d')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Progress</p>
                      <p className="text-sm text-muted-foreground">
                        {getCampaignProgress(currentCampaign.startDate, currentCampaign.endDate)}% complete
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {currentCampaign.budget && (
                  <Card>
                    <CardContent className="p-4 flex items-center space-x-2">
                      <BarChart4 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Budget</p>
                        <p className="text-sm text-muted-foreground">${currentCampaign.budget}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {currentCampaign.goal && (
                  <Card>
                    <CardContent className="p-4 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Goal</p>
                        <p className="text-sm text-muted-foreground">{currentCampaign.goal}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="text-md font-medium">Campaign Progress</h4>
                <div className="space-y-1">
                  <Progress 
                    value={getCampaignProgress(currentCampaign.startDate, currentCampaign.endDate)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(currentCampaign.startDate), 'MMM d, yyyy')}</span>
                    <span>
                      {getDaysRemaining(currentCampaign.endDate)}
                    </span>
                    <span>{format(new Date(currentCampaign.endDate), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue="resources">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="resources">Associated Resources</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                
                <TabsContent value="resources" className="space-y-4">
                  {(() => {
                    const resources = getAssociatedResources(currentCampaign.id);
                    const hasCoupons = resources.coupons.length > 0;
                    const hasEmails = resources.emails.length > 0;
                    const hasSegments = resources.segments.length > 0;
                    
                    if (!hasCoupons && !hasEmails && !hasSegments) {
                      return (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">No resources associated with this campaign yet.</p>
                          <p className="text-sm text-muted-foreground mt-1">Create coupons, emails, or customer segments for this campaign.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {hasCoupons && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Discount Coupons</h5>
                            <Card>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Validity</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {resources.coupons.map((coupon: any) => (
                                    <TableRow key={coupon.id}>
                                      <TableCell className="font-mono">{coupon.code}</TableCell>
                                      <TableCell>
                                        {coupon.discountType === 'percentage' 
                                          ? `${coupon.discountValue}%` 
                                          : `$${parseFloat(coupon.discountValue).toFixed(2)}`}
                                      </TableCell>
                                      <TableCell>
                                        {format(new Date(coupon.startDate), 'MMM d')} - {format(new Date(coupon.endDate), 'MMM d')}
                                      </TableCell>
                                      <TableCell>
                                        {coupon.isActive ? (
                                          <Badge variant="success">Active</Badge>
                                        ) : (
                                          <Badge variant="outline">Inactive</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Card>
                          </div>
                        )}
                        
                        {hasEmails && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Marketing Emails</h5>
                            <Card>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {resources.emails.map((email: any) => (
                                    <TableRow key={email.id}>
                                      <TableCell>{email.subject}</TableCell>
                                      <TableCell>
                                        {email.status === "sent" ? (
                                          <Badge variant="success">Sent</Badge>
                                        ) : email.status === "sending" ? (
                                          <Badge>Sending</Badge>
                                        ) : email.status === "scheduled" ? (
                                          <Badge variant="secondary">Scheduled</Badge>
                                        ) : (
                                          <Badge variant="outline">Draft</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {format(new Date(email.createdAt), 'MMM d, yyyy')}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Card>
                          </div>
                        )}
                        
                        {hasSegments && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Customer Segments</h5>
                            <Card>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {resources.segments.map((segment: any) => (
                                    <TableRow key={segment.id}>
                                      <TableCell>{segment.name}</TableCell>
                                      <TableCell>
                                        {segment.description || "No description"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Card>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>
                
                <TabsContent value="performance" className="space-y-4">
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">Performance metrics will appear here once the campaign is active.</p>
                    <p className="text-sm text-muted-foreground mt-1">Track metrics like click-through rates, conversions, and revenue attribution.</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="space-y-4">
                  <div className="space-y-4">
                    <div className="border-l-2 border-muted-foreground/20 pl-4 ml-4 space-y-4">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-primary"></div>
                        <div>
                          <p className="font-medium">Campaign Created</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(currentCampaign.createdAt), 'PPpp')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-muted"></div>
                        <div>
                          <p className="font-medium">Campaign Started</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(currentCampaign.startDate), 'PPpp')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-muted"></div>
                        <div>
                          <p className="font-medium">Campaign Ends</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(currentCampaign.endDate), 'PPpp')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleEditClick(currentCampaign);
                  }}
                >
                  Edit Campaign
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentCampaign && (
              <p className="font-medium">Campaign: {currentCampaign.name}</p>
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
              onClick={() => deleteCampaignMutation.mutate()}
              disabled={deleteCampaignMutation.isPending}
            >
              {deleteCampaignMutation.isPending ? "Deleting..." : "Delete Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsList;