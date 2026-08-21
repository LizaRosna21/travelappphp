import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { SiteSetting } from "@shared/schema";
import { Settings as SettingsIcon, Globe, Palette, Image, RefreshCw, PaintBucket } from "lucide-react";
import SiteSettingsForm from "@/components/admin/site-settings-form";

const formSchema = z.object({
  siteName: z.string().min(2, "Site name is required"),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().min(3, "Primary color is required"),
  secondaryColor: z.string().min(3, "Secondary color is required"),
  accentColor: z.string().min(3, "Accent color is required"),
  googleAnalyticsId: z.string().optional(),
  contactEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

const seoSchema = z.object({
  metaTitle: z.string().min(5, "Meta title is required"),
  metaDescription: z.string().min(10, "Meta description is required"),
  keywords: z.string().optional(),
});

const AdminSettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch site settings
  const { data: settings, isLoading } = useQuery<SiteSetting>({
    queryKey: ['/api/site-settings'],
  });

  // General settings form
  const generalForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteName: "",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#0C4B7D",
      secondaryColor: "#1A94FF",
      accentColor: "#FF7D00",
      googleAnalyticsId: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  // SEO settings form
  const seoForm = useForm<z.infer<typeof seoSchema>>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      metaTitle: "",
      metaDescription: "",
      keywords: "",
    },
  });

  // Set form values when settings are fetched
  useEffect(() => {
    if (settings) {
      generalForm.reset({
        siteName: settings.siteName,
        logoUrl: settings.logoUrl || "",
        faviconUrl: settings.faviconUrl || "",
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        googleAnalyticsId: settings.googleAnalyticsId || "",
        contactEmail: settings.contactEmail || "",
        contactPhone: settings.contactPhone || "",
      });

      if (settings.seo) {
        const seo = settings.seo as any;
        seoForm.reset({
          metaTitle: seo.metaTitle || "",
          metaDescription: seo.metaDescription || "",
          keywords: seo.keywords || "",
        });
      }
    }
  }, [settings, generalForm, seoForm]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/admin/site-settings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "The site settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitGeneral = (values: z.infer<typeof formSchema>) => {
    updateSettingsMutation.mutate(values);
  };

  const onSubmitSeo = (values: z.infer<typeof seoSchema>) => {
    updateSettingsMutation.mutate({
      seo: values
    });
  };

  return (
    <>
      <Helmet>
        <title>Site Settings - Admin Dashboard | FerryBooking</title>
        <meta name="description" content="Manage site settings in the FerryBooking admin dashboard" />
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <SettingsIcon className="h-5 w-5 mr-2" />
                      General Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <Form {...generalForm}>
                        <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)} className="space-y-6">
                          <FormField
                            control={generalForm.control}
                            name="siteName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Site Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  The name of your website.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={generalForm.control}
                              name="contactEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" />
                                  </FormControl>
                                  <FormDescription>
                                    Public contact email address.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={generalForm.control}
                              name="contactPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Public contact phone number.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={generalForm.control}
                            name="googleAnalyticsId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Google Analytics ID</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Your Google Analytics tracking ID (e.g., G-XXXXXXXX or UA-XXXXXXXX-X)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={updateSettingsMutation.isPending}
                          >
                            Save Changes
                          </Button>
                        </form>
                      </Form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Globe className="h-5 w-5 mr-2" />
                      SEO Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <Form {...seoForm}>
                        <form onSubmit={seoForm.handleSubmit(onSubmitSeo)} className="space-y-6">
                          <FormField
                            control={seoForm.control}
                            name="metaTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meta Title</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  The title that appears in search engine results (50-60 characters recommended).
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={seoForm.control}
                            name="metaDescription"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meta Description</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  A brief description of your site for search results (150-160 characters recommended).
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={seoForm.control}
                            name="keywords"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Keywords</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Comma-separated keywords related to your business (e.g., ferry, tickets, travel, Mediterranean).
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={updateSettingsMutation.isPending}
                          >
                            Save SEO Settings
                          </Button>
                        </form>
                      </Form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Palette className="h-5 w-5 mr-2" />
                      Appearance Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <SiteSettingsForm />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSettings;