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
  Eye,
  Send,
  Clock,
  BarChart3,
  Mail,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the email schema for form validation
const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  fromName: z.string().min(1, "Sender name is required"),
  fromEmail: z.string().email("Invalid email format"),
  campaignId: z.number().optional(),
  segmentId: z.number().optional(),
  htmlContent: z.string().min(1, "HTML content is required"),
  textContent: z.string().optional(),
  scheduledSendTime: z.date().optional(),
  isTest: z.boolean().default(false),
  testRecipients: z.string().optional(),
  status: z.enum(["draft", "scheduled", "sent", "sending"]).default("draft"),
});

// Main Marketing Emails List Component
const EmailsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentEmail, setCurrentEmail] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Fetch marketing emails
  const { data: emails, isLoading } = useQuery({
    queryKey: ['/api/marketing-emails'],
  });

  // Fetch campaigns for the select dropdown
  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Fetch customer segments for the select dropdown
  const { data: segments } = useQuery({
    queryKey: ['/api/customer-segments'],
  });

  // Form setup
  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: "",
      fromName: "Ferry Booking",
      fromEmail: "no-reply@ferrybooking.com",
      htmlContent: "",
      textContent: "",
      isTest: false,
      testRecipients: "",
      status: "draft" as const,
    },
  });

  // Create marketing email mutation
  const createEmailMutation = useMutation({
    mutationFn: async (newEmail: any) => {
      const res = await apiRequest("POST", "/api/marketing-emails", {
        ...newEmail,
        scheduledSendTime: newEmail.scheduledSendTime ? format(newEmail.scheduledSendTime, 'yyyy-MM-dd HH:mm:ss') : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email created",
        description: "The marketing email was created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-emails'] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update marketing email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (email: any) => {
      const res = await apiRequest("PATCH", `/api/marketing-emails/${currentEmail.id}`, {
        ...email,
        scheduledSendTime: email.scheduledSendTime ? format(email.scheduledSendTime, 'yyyy-MM-dd HH:mm:ss') : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email updated",
        description: "The marketing email was updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-emails'] });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete marketing email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/marketing-emails/${currentEmail.id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email deleted",
        description: "The marketing email was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-emails'] });
      setIsDeleteDialogOpen(false);
      setCurrentEmail(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send marketing email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const res = await apiRequest("POST", `/api/marketing-emails/${emailId}/send`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email queued for sending",
        description: "The email has been queued for sending to recipients.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-emails'] });
      setIsSendDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ emailId, recipients }: { emailId: number, recipients: string }) => {
      const res = await apiRequest("POST", `/api/marketing-emails/${emailId}/test`, {
        recipients: recipients.split(',').map(email => email.trim()),
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "The test email has been sent to the specified recipients.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: any) => {
    if (currentEmail) {
      updateEmailMutation.mutate(data);
    } else {
      createEmailMutation.mutate(data);
    }
  };

  // Handle edit button click
  const handleEditClick = (email: any) => {
    setCurrentEmail(email);
    form.reset({
      subject: email.subject,
      fromName: email.fromName,
      fromEmail: email.fromEmail,
      campaignId: email.campaignId,
      segmentId: email.segmentId,
      htmlContent: email.htmlContent,
      textContent: email.textContent || "",
      scheduledSendTime: email.scheduledSendTime ? new Date(email.scheduledSendTime) : undefined,
      isTest: email.isTest || false,
      testRecipients: email.testRecipients || "",
      status: email.status,
    });
    setIsFormOpen(true);
    setActiveTab("content");
  };

  // Handle view button click
  const handleViewClick = (email: any) => {
    setCurrentEmail(email);
    setIsViewOpen(true);
  };

  // Handle preview button click
  const handlePreviewClick = (email: any) => {
    setCurrentEmail(email);
    setIsPreviewOpen(true);
  };

  // Handle send button click
  const handleSendClick = (email: any) => {
    setCurrentEmail(email);
    setIsSendDialogOpen(true);
  };

  // Handle send test email
  const handleSendTest = () => {
    if (!form.getValues("testRecipients")) {
      toast({
        title: "Test recipients required",
        description: "Please enter at least one email address for test recipients.",
        variant: "destructive",
      });
      return;
    }

    if (currentEmail) {
      sendTestEmailMutation.mutate({
        emailId: currentEmail.id,
        recipients: form.getValues("testRecipients"),
      });
    } else {
      toast({
        title: "Save email first",
        description: "Please save the email before sending a test.",
        variant: "destructive",
      });
    }
  };

  // Handle add new button click
  const handleAddNew = () => {
    setCurrentEmail(null);
    form.reset({
      subject: "",
      fromName: "Ferry Booking",
      fromEmail: "no-reply@ferrybooking.com",
      htmlContent: "",
      textContent: "",
      isTest: false,
      testRecipients: "",
      status: "draft",
    });
    setIsFormOpen(true);
    setActiveTab("content");
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "sending":
        return <Badge>Sending</Badge>;
      case "sent":
        return <Badge variant="success">Sent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Email templates
  const emailTemplates = [
    {
      name: "Welcome Email",
      subject: "Welcome to Ferry Booking",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1a73e8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Welcome to Ferry Booking</h1>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #e0e0e0; border-top: none;">
            <p>Hello [Customer Name],</p>
            <p>Thank you for creating an account with Ferry Booking. We're excited to have you on board!</p>
            <p>With your new account, you can:</p>
            <ul>
              <li>Book ferry tickets to your favorite destinations</li>
              <li>Manage your bookings in one place</li>
              <li>Save your favorite routes for future reference</li>
              <li>Get exclusive access to special offers and promotions</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Exploring Routes</a>
            </div>
            <p>If you have any questions or need assistance, don't hesitate to contact our customer support team.</p>
            <p>Happy travels!</p>
            <p>The Ferry Booking Team</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 Ferry Booking. All rights reserved.</p>
            <p>You're receiving this email because you recently created an account with Ferry Booking.</p>
            <p><a href="#" style="color: #1a73e8;">Unsubscribe</a> | <a href="#" style="color: #1a73e8;">View in browser</a></p>
          </div>
        </div>
      `,
    },
    {
      name: "Special Offer",
      subject: "Limited Time Offer: 15% Off Your Next Ferry Booking",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ff6b6b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Special Offer</h1>
            <h2 style="margin-top: 10px;">15% OFF YOUR NEXT BOOKING</h2>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #e0e0e0; border-top: none;">
            <p>Hello [Customer Name],</p>
            <p>Summer is here and it's the perfect time to plan your next island getaway!</p>
            <p>For a limited time, we're offering <strong>15% off</strong> all ferry bookings to any destination.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="font-size: 20px; font-weight: bold; margin: 0;">Use promo code:</p>
              <p style="font-size: 24px; letter-spacing: 2px; font-weight: bold; margin: 10px 0; color: #ff6b6b;">SUMMER15</p>
              <p style="margin: 0; font-size: 14px;">Valid until [Expiry Date]</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Book Now</a>
            </div>
            
            <p>Don't miss this opportunity to save on your summer travels!</p>
            <p>Happy sailing!</p>
            <p>The Ferry Booking Team</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 Ferry Booking. All rights reserved.</p>
            <p>Terms and conditions apply. Offer cannot be combined with other promotions.</p>
            <p><a href="#" style="color: #ff6b6b;">Unsubscribe</a> | <a href="#" style="color: #ff6b6b;">View in browser</a></p>
          </div>
        </div>
      `,
    },
    {
      name: "Booking Confirmation",
      subject: "Your Ferry Booking Confirmation",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Booking Confirmed</h1>
            <p style="margin-top: 10px; margin-bottom: 0;">Reference: [Booking Reference]</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #e0e0e0; border-top: none;">
            <p>Hello [Customer Name],</p>
            <p>Your ferry booking has been confirmed. Here are your travel details:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Route</th>
                <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">[Departure Port] to [Arrival Port]</td>
              </tr>
              <tr>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
                <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">[Departure Date]</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time</th>
                <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">[Departure Time]</td>
              </tr>
              <tr>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Passengers</th>
                <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">[Number of Passengers]</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Total</th>
                <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">[Total Amount]</td>
              </tr>
            </table>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Booking</a>
            </div>
            
            <h3>Important Information:</h3>
            <ul>
              <li>Please arrive at the port at least 45 minutes before departure.</li>
              <li>Don't forget to bring a valid ID for all passengers.</li>
              <li>Check our baggage policy for allowed items and weight limits.</li>
            </ul>
            
            <p>We wish you a pleasant journey!</p>
            <p>The Ferry Booking Team</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 Ferry Booking. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
            <p><a href="#" style="color: #4CAF50;">View in browser</a></p>
          </div>
        </div>
      `,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Marketing Emails</h2>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Email
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading marketing emails...</p>
        </div>
      ) : emails?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No marketing emails found. Create your first email campaign.</p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Email
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails?.map((email: any) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">{email.subject}</TableCell>
                    <TableCell>
                      {email.campaignId 
                        ? campaigns?.find((c: any) => c.id === email.campaignId)?.name || "Unknown" 
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {email.segmentId
                        ? segments?.find((s: any) => s.id === email.segmentId)?.name || "Unknown"
                        : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell>{format(new Date(email.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {email.scheduledSendTime 
                        ? format(new Date(email.scheduledSendTime), 'MMM d, yyyy HH:mm')
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewClick(email)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditClick(email)}
                          disabled={email.status === "sent" || email.status === "sending"}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSendClick(email)}
                          disabled={email.status !== "draft" || !email.htmlContent}
                        >
                          <Send className="h-4 w-4" />
                          <span className="sr-only">Send</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentEmail(email);
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={email.status === "sent" || email.status === "sending"}
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

      {/* Create/Edit Email Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentEmail ? "Edit Marketing Email" : "Create New Marketing Email"}</DialogTitle>
            <DialogDescription>
              {currentEmail
                ? "Update the details and content of your marketing email."
                : "Create a new marketing email to send to your customers."}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="content" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">Email Content</TabsTrigger>
              <TabsTrigger value="settings">Settings & Delivery</TabsTrigger>
            </TabsList>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <TabsContent value="content" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Summer Discount: 20% Off All Routes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Ferry Booking" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Email</FormLabel>
                            <FormControl>
                              <Input placeholder="no-reply@ferrybooking.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Email Templates</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {emailTemplates.map((template, index) => (
                          <Card 
                            key={index} 
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => {
                              form.setValue("subject", template.subject);
                              form.setValue("htmlContent", template.content);
                            }}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="h-32 overflow-hidden">
                              <div className="text-xs opacity-70 line-clamp-3">
                                {template.subject}
                              </div>
                              <div className="mt-2 h-16 bg-muted/50 rounded text-center flex items-center justify-center text-xs text-muted-foreground">
                                Preview content
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className="w-full text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  form.setValue("subject", template.subject);
                                  form.setValue("htmlContent", template.content);
                                }}
                              >
                                Use Template
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="htmlContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTML Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="<h1>Your HTML email content here</h1>"
                              className="min-h-[300px] font-mono text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the HTML content of your email
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="textContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Text Content (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Your plain text email content here"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Fallback plain text version of your email for email clients that don't support HTML
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                    >
                      Cancel
                    </Button>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("settings")}
                      >
                        Next: Delivery Settings
                      </Button>
                      <Button
                        type="submit"
                        disabled={createEmailMutation.isPending || updateEmailMutation.isPending}
                      >
                        {(createEmailMutation.isPending || updateEmailMutation.isPending) ? (
                          <>Saving...</>
                        ) : (
                          <>Save</>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="campaignId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign</FormLabel>
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
                            <FormDescription>
                              Associate this email with a marketing campaign
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="segmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Segment</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a segment (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">All Customers</SelectItem>
                                {segments?.map((segment: any) => (
                                  <SelectItem key={segment.id} value={segment.id.toString()}>
                                    {segment.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose which customer segment should receive this email
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Delivery Options</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={currentEmail?.status === "sent" || currentEmail?.status === "sending"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("status") === "scheduled" && (
                          <FormField
                            control={form.control}
                            name="scheduledSendTime"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Scheduled Send Time</FormLabel>
                                <DatePicker
                                  date={field.value}
                                  setDate={field.onChange}
                                  showTimePicker={true}
                                />
                                <FormDescription>
                                  When this email should be sent
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="isTest"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Send Test Email</FormLabel>
                              <FormDescription>
                                Send a test version of this email to specified recipients
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("isTest") && (
                        <FormField
                          control={form.control}
                          name="testRecipients"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Recipients</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="email1@example.com, email2@example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Enter email addresses separated by commas
                              </FormDescription>
                              <FormMessage />
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleSendTest}
                                  disabled={sendTestEmailMutation.isPending || !currentEmail}
                                >
                                  {sendTestEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                                </Button>
                              </div>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("content")}
                    >
                      Back to Content
                    </Button>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsFormOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createEmailMutation.isPending || updateEmailMutation.isPending}
                      >
                        {(createEmailMutation.isPending || updateEmailMutation.isPending) ? (
                          <>Saving...</>
                        ) : currentEmail ? (
                          <>Save Changes</>
                        ) : (
                          <>Create Email</>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          
          {currentEmail && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{currentEmail.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    From: {currentEmail.fromName} &lt;{currentEmail.fromEmail}&gt;
                  </p>
                </div>
                {getStatusBadge(currentEmail.status)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Campaign</h4>
                  <p>
                    {currentEmail.campaignId
                      ? campaigns?.find((c: any) => c.id === currentEmail.campaignId)?.name || "Unknown"
                      : "None"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Segment</h4>
                  <p>
                    {currentEmail.segmentId
                      ? segments?.find((s: any) => s.id === currentEmail.segmentId)?.name || "Unknown"
                      : "All Customers"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                  <p>{format(new Date(currentEmail.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Scheduled Send Time</h4>
                  <p>
                    {currentEmail.scheduledSendTime
                      ? format(new Date(currentEmail.scheduledSendTime), 'PPpp')
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Email Performance</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <Mail className="h-5 w-5 mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{currentEmail.sentCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <Eye className="h-5 w-5 mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{currentEmail.opens || 0}</p>
                      <p className="text-xs text-muted-foreground">Opens</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <BarChart3 className="h-5 w-5 mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{currentEmail.clicks || 0}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <Clock className="h-5 w-5 mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {currentEmail.sentCount && currentEmail.opens
                          ? `${Math.round((currentEmail.opens / currentEmail.sentCount) * 100)}%`
                          : "0%"}
                      </p>
                      <p className="text-xs text-muted-foreground">Open Rate</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-muted-foreground">Email Content Preview</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsViewOpen(false);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Full Preview
                  </Button>
                </div>
                <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto bg-white">
                  <div dangerouslySetInnerHTML={{ __html: currentEmail.htmlContent }} />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewOpen(false)}
                >
                  Close
                </Button>
                {currentEmail.status === "draft" && (
                  <>
                    <Button
                      onClick={() => handleEditClick(currentEmail)}
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Email
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewOpen(false);
                        setIsSendDialogOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              {currentEmail?.subject}
            </DialogDescription>
          </DialogHeader>
          
          {currentEmail && (
            <div className="border rounded-md p-4 max-h-[70vh] overflow-y-auto bg-white">
              <div dangerouslySetInnerHTML={{ __html: currentEmail.htmlContent }} />
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Marketing Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this marketing email? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentEmail && (
              <p className="font-medium">"{currentEmail.subject}"</p>
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
              onClick={() => deleteEmailMutation.mutate()}
              disabled={deleteEmailMutation.isPending}
            >
              {deleteEmailMutation.isPending ? "Deleting..." : "Delete Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Marketing Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this email to all recipients? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {currentEmail && (
              <>
                <p className="font-medium">"{currentEmail.subject}"</p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Recipients:</p>
                  <p className="font-medium">
                    {currentEmail.segmentId
                      ? segments?.find((s: any) => s.id === currentEmail.segmentId)?.name || "Unknown Segment"
                      : "All Customers"}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendEmailMutation.mutate(currentEmail.id)}
              disabled={sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailsList;