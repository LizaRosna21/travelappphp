import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  Plus,
  Trash2,
  Users,
  Filter,
  ListFilter,
  Tag,
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

// Define the customer segment schema for form validation
const segmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  criteria: z.string().min(1, "Criteria is required"),
  isActive: z.boolean().default(true),
});

type SegmentFormValues = z.infer<typeof segmentSchema>;

// Main Customer Segments List Component
const SegmentsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSegment, setCurrentSegment] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("segments");

  // Fetch segments
  const { data: segments, isLoading } = useQuery({
    queryKey: ['/api/customer-segments'],
  });

  // Fetch campaigns for associations
  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Form setup
  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: "",
      description: "",
      criteria: "",
      isActive: true,
    },
  });

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: async (newSegment: SegmentFormValues) => {
      const res = await apiRequest("POST", "/api/admin/customer-segments", newSegment);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Segment created",
        description: "The customer segment was created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-segments'] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create segment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update segment mutation
  const updateSegmentMutation = useMutation({
    mutationFn: async (segment: SegmentFormValues) => {
      const res = await apiRequest("PATCH", `/api/admin/customer-segments/${currentSegment.id}`, segment);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Segment updated",
        description: "The customer segment was updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-segments'] });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update segment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete segment mutation
  const deleteSegmentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/admin/customer-segments/${currentSegment.id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Segment deleted",
        description: "The customer segment was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-segments'] });
      setIsDeleteDialogOpen(false);
      setCurrentSegment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete segment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: SegmentFormValues) => {
    if (currentSegment) {
      updateSegmentMutation.mutate(data);
    } else {
      createSegmentMutation.mutate(data);
    }
  };

  // Handle edit button click
  const handleEditClick = (segment: any) => {
    setCurrentSegment(segment);
    form.reset({
      name: segment.name,
      description: segment.description || "",
      criteria: typeof segment.criteria === 'string' ? segment.criteria : JSON.stringify(segment.criteria),
      isActive: segment.isActive,
    });
    setIsFormOpen(true);
  };

  // Handle view details click
  const handleViewDetails = (segment: any) => {
    setCurrentSegment(segment);
    setIsDetailsOpen(true);
  };

  // Handle add new button click
  const handleAddNew = () => {
    setCurrentSegment(null);
    form.reset({
      name: "",
      description: "",
      criteria: "",
      isActive: true,
    });
    setIsFormOpen(true);
  };

  // Get associated campaigns for a segment
  const getAssociatedCampaigns = (segmentId: number) => {
    if (!campaigns) return [];
    return campaigns.filter((campaign: any) => {
      // Check if campaign has this segment associated
      return campaign.customerSegments?.includes(segmentId);
    });
  };

  // Render criteria in a human-readable format
  const renderCriteria = (criteria: any) => {
    if (!criteria) return "No criteria defined";

    try {
      // If criteria is a string, try to parse it
      const parsedCriteria = typeof criteria === 'string' 
        ? JSON.parse(criteria) 
        : criteria;

      if (typeof parsedCriteria === 'object') {
        return (
          <div className="space-y-2">
            {Object.entries(parsedCriteria).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-start">
                <Tag className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: </span>
                  {Array.isArray(value) 
                    ? value.join(', ')
                    : typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)
                  }
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      return String(criteria);
    } catch (e) {
      // If parsing fails, return as is
      return String(criteria);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customer Segments</h2>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="criteria">Segment Builder</TabsTrigger>
        </TabsList>
        
        <TabsContent value="segments">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading customer segments...</p>
            </div>
          ) : segments?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-muted-foreground mb-4">No customer segments found. Create your first segment.</p>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Segment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>All Segments</CardTitle>
                  <CardDescription>
                    Manage customer segments for targeted marketing
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Campaigns</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments?.map((segment: any) => (
                        <TableRow key={segment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                              {segment.name}
                            </div>
                            {segment.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {segment.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {segment.isActive ? (
                              <Badge variant="success">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{segment.memberCount || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const associatedCampaigns = getAssociatedCampaigns(segment.id);
                              return associatedCampaigns.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {associatedCampaigns.slice(0, 2).map((campaign: any) => (
                                    <Badge key={campaign.id} variant="outline">{campaign.name}</Badge>
                                  ))}
                                  {associatedCampaigns.length > 2 && (
                                    <Badge variant="outline">+{associatedCampaigns.length - 2} more</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No campaigns</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {segment.createdAt && format(new Date(segment.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewDetails(segment)}
                              >
                                <ListFilter className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditClick(segment)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentSegment(segment);
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
        </TabsContent>
        
        <TabsContent value="criteria">
          <Card>
            <CardHeader>
              <CardTitle>Segment Builder</CardTitle>
              <CardDescription>
                Build customer segments based on custom criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">Building Customer Segments</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create segments using criteria in JSON format. Here are some examples:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-card border rounded-md p-2">
                      <div className="font-mono text-xs">
                        {"{ \"lastPurchaseDate\": { \"$gt\": \"2024-01-01\" } }"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customers who purchased after January 1, 2024
                      </p>
                    </div>
                    
                    <div className="bg-card border rounded-md p-2">
                      <div className="font-mono text-xs">
                        {"{ \"destination\": [\"Bodrum\", \"Kos\"] }"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customers who traveled to Bodrum or Kos
                      </p>
                    </div>
                    
                    <div className="bg-card border rounded-md p-2">
                      <div className="font-mono text-xs">
                        {"{ \"totalBookingValue\": { \"$gt\": 1000 }, \"bookingCount\": { \"$gte\": 3 } }"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customers who spent over 1000 and made at least 3 bookings
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleAddNew} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Segment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Segment Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{currentSegment ? "Edit Segment" : "Create New Segment"}</DialogTitle>
            <DialogDescription>
              {currentSegment
                ? "Update the customer segment details."
                : "Define a new customer segment for targeted marketing."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="High Value Customers" {...field} />
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
                        placeholder="Describe this customer segment"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for your reference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment Criteria</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"lastPurchaseDate": {"$gt": "2024-01-01"}}'
                        className="font-mono text-sm"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Define segment criteria using JSON format
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
                        Active Segment
                      </FormLabel>
                      <FormDescription>
                        When checked, this segment will be available for campaigns
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
                  disabled={createSegmentMutation.isPending || updateSegmentMutation.isPending}
                >
                  {(createSegmentMutation.isPending || updateSegmentMutation.isPending) ? (
                    <>Saving...</>
                  ) : currentSegment ? (
                    <>Save Changes</>
                  ) : (
                    <>Create Segment</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Segment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Segment Details</DialogTitle>
          </DialogHeader>
          
          {currentSegment && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{currentSegment.name}</h3>
                  {currentSegment.description && (
                    <p className="text-muted-foreground mt-1">{currentSegment.description}</p>
                  )}
                </div>
                <div>
                  {currentSegment.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center space-x-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Members</p>
                      <p className="text-sm text-muted-foreground">
                        {currentSegment.memberCount || 0} customers
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Campaigns</p>
                      <p className="text-sm text-muted-foreground">
                        {getAssociatedCampaigns(currentSegment.id).length} total
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center space-x-2">
                    <ListFilter className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {currentSegment.createdAt && format(new Date(currentSegment.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Tabs defaultValue="criteria">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="criteria">Segment Criteria</TabsTrigger>
                  <TabsTrigger value="campaigns">Associated Campaigns</TabsTrigger>
                </TabsList>
                
                <TabsContent value="criteria" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Segment Definition</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px] border rounded-md p-4 bg-muted/30">
                        <div className="space-y-2">
                          {renderCriteria(currentSegment.criteria)}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="campaigns" className="space-y-4">
                  {(() => {
                    const associatedCampaigns = getAssociatedCampaigns(currentSegment.id);
                    
                    if (associatedCampaigns.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">No campaigns are using this segment yet.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Campaigns Using This Segment</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Range</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {associatedCampaigns.map((campaign: any) => (
                                <TableRow key={campaign.id}>
                                  <TableCell>{campaign.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {campaign.type?.charAt(0).toUpperCase() + campaign.type?.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {campaign.status === "active" ? (
                                      <Badge variant="success">Active</Badge>
                                    ) : campaign.status === "completed" ? (
                                      <Badge variant="secondary">Completed</Badge>
                                    ) : campaign.status === "paused" ? (
                                      <Badge variant="warning">Paused</Badge>
                                    ) : (
                                      <Badge variant="outline">Draft</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {campaign.startDate && campaign.endDate && (
                                      <span className="text-xs">
                                        {format(new Date(campaign.startDate), 'MMM d')} - {format(new Date(campaign.endDate), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  })()}
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
                    handleEditClick(currentSegment);
                  }}
                >
                  Edit Segment
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
            <DialogTitle>Delete Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this segment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentSegment && (
              <p className="font-medium">Segment: {currentSegment.name}</p>
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
              onClick={() => deleteSegmentMutation.mutate()}
              disabled={deleteSegmentMutation.isPending}
            >
              {deleteSegmentMutation.isPending ? "Deleting..." : "Delete Segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SegmentsList;