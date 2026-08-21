import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Site settings form schema
const siteSettingsSchema = z.object({
  siteName: z.string().min(2, "Site name must be at least 2 characters"),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().min(4, "Please enter a valid color code"),
  secondaryColor: z.string().min(4, "Please enter a valid color code"),
  accentColor: z.string().min(4, "Please enter a valid color code"),
  buttonPrimaryColor: z.string().min(4, "Please enter a valid color code"),
  buttonSecondaryColor: z.string().min(4, "Please enter a valid color code"),
  buttonAccentColor: z.string().min(4, "Please enter a valid color code"),
  cardTagPopularColor: z.string().min(4, "Please enter a valid color code"),
  cardTagFastestColor: z.string().min(4, "Please enter a valid color code"),
  cardTagScenicColor: z.string().min(4, "Please enter a valid color code"),
  homeBackgroundImage: z.string().optional(),
  homeBackgroundOverlayOpacity: z.string().optional(),
  homeBackgroundOverlayColor: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  contactEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

export default function SiteSettingsForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch site settings
  const {
    data: siteSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/site-settings");
      if (!response.ok) throw new Error("Failed to fetch site settings");
      return await response.json();
    },
  });

  // Create form
  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      siteName: "",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#0C4B7D",
      secondaryColor: "#1A94FF",
      accentColor: "#FF7D00",
      buttonPrimaryColor: "#0C4B7D",
      buttonSecondaryColor: "#1A94FF",
      buttonAccentColor: "#FF7D00",
      cardTagPopularColor: "#2563EB",
      cardTagFastestColor: "#059669",
      cardTagScenicColor: "#D97706",
      homeBackgroundImage: "/uploads/backgrounds/default-ferry-bg.jpg",
      homeBackgroundOverlayOpacity: "0.5",
      homeBackgroundOverlayColor: "rgba(0,0,0,0.5)",
      googleAnalyticsId: "",
      contactEmail: "",
      contactPhone: "",
    },
  });
  
  // Reset form when site settings are loaded
  useEffect(() => {
    if (siteSettings) {
      form.reset(siteSettings);
    }
  }, [siteSettings, form]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SiteSettingsFormValues) => {
      const response = await apiRequest("PATCH", "/api/admin/site-settings", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update site settings");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "The site settings have been successfully updated.",
      });
      // Invalidate the site settings query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "There was an error updating the site settings.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: SiteSettingsFormValues) {
    updateSettingsMutation.mutate(data);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">Error loading site settings</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>
          Manage your site name, branding colors, and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="buttons">Button Colors</TabsTrigger>
            <TabsTrigger value="tags">Tag Colors</TabsTrigger>
            <TabsTrigger value="background">Background Image</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="general">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of your ferry booking site.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          The URL to your site logo image.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="faviconUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Favicon URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          The URL to your site favicon.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="googleAnalyticsId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Analytics ID</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          Your Google Analytics tracking ID (e.g., UA-XXXXXXXXX-X).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="colors">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Primary Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#0C4B7D" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Secondary Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#1A94FF" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accentColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Accent Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#FF7D00" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription>
                    These colors will be used throughout the site for various UI elements.
                  </FormDescription>
                </div>
              </TabsContent>

              <TabsContent value="buttons">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="buttonPrimaryColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Primary Button Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#0C4B7D" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <div className="mt-2">
                            <Button
                              type="button"
                              style={{ backgroundColor: field.value || "#0C4B7D" }}
                              className="text-white"
                            >
                              Primary Button
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="buttonSecondaryColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Secondary Button Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#1A94FF" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="secondary"
                              style={{ backgroundColor: field.value || "#1A94FF" }}
                              className="text-white"
                            >
                              Secondary Button
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="buttonAccentColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Accent Button Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#FF7D00" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              style={{ borderColor: field.value || "#FF7D00", color: field.value || "#FF7D00" }}
                            >
                              Accent Button
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription>
                    Customize the colors of different button types on the site.
                  </FormDescription>
                </div>
              </TabsContent>

              <TabsContent value="tags">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="cardTagPopularColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Popular Tag Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#2563EB" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <div className="mt-2">
                            <span 
                              className="inline-block px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: field.value || "#2563EB" }}
                            >
                              Popular Route
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardTagFastestColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fastest Tag Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#059669" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <div className="mt-2">
                            <span 
                              className="inline-block px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: field.value || "#059669" }}
                            >
                              Fastest Route
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardTagScenicColor"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Scenic Tag Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value || "#D97706" }}
                            />
                            <FormControl>
                              <Input {...field} type="text" />
                            </FormControl>
                          </div>
                          <div className="mt-2">
                            <span 
                              className="inline-block px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: field.value || "#D97706" }}
                            >
                              Scenic Route
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription>
                    Set colors for different route type tags that appear on route cards.
                  </FormDescription>
                </div>
              </TabsContent>

              <TabsContent value="background">
                <div className="space-y-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium">Homepage Background Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure the background image and overlay settings for the homepage.
                    </p>
                  </div>
                  
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="homeBackgroundImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            URL to the image that will be used as the homepage background.
                          </FormDescription>
                          <FormMessage />
                          {field.value && (
                            <div className="mt-2">
                              <p className="text-sm mb-2">Preview:</p>
                              <div 
                                className="w-full h-32 rounded-md bg-cover bg-center"
                                style={{ backgroundImage: `url(${field.value})` }}
                              />
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="homeBackgroundOverlayColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overlay Color</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || "rgba(0,0,0,0.5)"} />
                            </FormControl>
                            <FormDescription>
                              Color for the overlay on top of the background image (rgba format recommended).
                            </FormDescription>
                            <FormMessage />
                            <div className="mt-2">
                              <div 
                                className="w-full h-12 rounded-md"
                                style={{ backgroundColor: field.value || "rgba(0,0,0,0.5)" }}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="homeBackgroundOverlayOpacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overlay Opacity</FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="0" 
                                  max="1" 
                                  step="0.1" 
                                  value={field.value || "0.5"} 
                                />
                              </FormControl>
                              <span>{(parseFloat(field.value || "0.5") * 100).toFixed(0)}%</span>
                            </div>
                            <FormDescription>
                              Opacity of the overlay (0 to 1, where 0 is transparent and 1 is opaque).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="bg-muted p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-2">Background Preview</h4>
                      <div 
                        className="w-full h-36 rounded-md bg-cover bg-center relative"
                        style={{ 
                          backgroundImage: `url(${form.watch("homeBackgroundImage") || "/uploads/backgrounds/default-ferry-bg.jpg"})` 
                        }}
                      >
                        <div 
                          className="absolute inset-0 rounded-md"
                          style={{ 
                            backgroundColor: form.watch("homeBackgroundOverlayColor") || "rgba(0,0,0,0.5)",
                            opacity: parseFloat(form.watch("homeBackgroundOverlayOpacity") || "0.5")
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white font-medium">
                          Text content with overlay
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          The primary contact email for your site.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          The customer service phone number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <div className="flex justify-end mt-6">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="min-w-[120px]"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
}