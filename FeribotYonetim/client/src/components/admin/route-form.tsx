import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Port, Route, insertRouteSchema } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface RouteFormProps {
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  initialData?: Route;
}

const formSchema = z.object({
  departurePort: z.string().min(2, "Departure port is required"),
  departureCode: z.string().optional(),
  arrivalPort: z.string().min(2, "Arrival port is required"),
  arrivalCode: z.string().optional(),
  distance: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  duration: z.string().min(1, "Duration is required").transform(val => parseInt(val)),
  basePrice: z.string().min(1, "Base price is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  checkInStartTime: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  checkInEndTime: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  specialInstructions: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  travelTime: z.string().optional(),
  routeCode: z.string().optional(),
  routeType: z.string().default("regular"),
  isInternational: z.boolean().default(false),
  countryDeparture: z.string().optional(),
  countryArrival: z.string().optional(),
});

const RouteForm = ({ onSubmit, isSubmitting, initialData }: RouteFormProps) => {
  // Fetch ports
  const { data: ports } = useQuery<Port[]>({
    queryKey: ['/api/ports'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departurePort: initialData?.departurePort || "",
      departureCode: initialData?.departureCode || "",
      arrivalPort: initialData?.arrivalPort || "",
      arrivalCode: initialData?.arrivalCode || "",
      distance: initialData?.distance ? initialData.distance.toString() : "",
      duration: initialData?.duration ? initialData.duration.toString() : "",
      basePrice: initialData?.basePrice ? initialData.basePrice.toString() : "",
      description: initialData?.description || "",
      isActive: initialData?.isActive ?? true,
      checkInStartTime: initialData?.checkInStartTime ? initialData.checkInStartTime.toString() : "",
      checkInEndTime: initialData?.checkInEndTime ? initialData.checkInEndTime.toString() : "",
      specialInstructions: initialData?.specialInstructions || "",
      isFeatured: initialData?.isFeatured ?? false,
      isPopular: initialData?.isPopular ?? false,
      travelTime: initialData?.travelTime || "",
      routeCode: initialData?.routeCode || "",
      routeType: initialData?.routeType || "regular",
      isInternational: initialData?.isInternational ?? false,
      countryDeparture: initialData?.countryDeparture || "",
      countryArrival: initialData?.countryArrival || "",
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        departurePort: initialData.departurePort,
        departureCode: initialData.departureCode || "",
        arrivalPort: initialData.arrivalPort,
        arrivalCode: initialData.arrivalCode || "",
        distance: initialData.distance ? initialData.distance.toString() : "",
        duration: initialData.duration.toString(),
        basePrice: initialData.basePrice.toString(),
        description: initialData.description || "",
        isActive: initialData.isActive,
        checkInStartTime: initialData.checkInStartTime ? initialData.checkInStartTime.toString() : "",
        checkInEndTime: initialData.checkInEndTime ? initialData.checkInEndTime.toString() : "",
        specialInstructions: initialData.specialInstructions || "",
        isFeatured: initialData.isFeatured ?? false,
        isPopular: initialData.isPopular ?? false,
        travelTime: initialData.travelTime || "",
        routeCode: initialData.routeCode || "",
        routeType: initialData.routeType || "regular",
        isInternational: initialData.isInternational ?? false,
        countryDeparture: initialData.countryDeparture || "",
        countryArrival: initialData.countryArrival || "",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Format basePrice to ensure it's a string with decimal places if needed
    const formattedBasePrice = parseFloat(values.basePrice).toFixed(2);
    
    onSubmit({
      ...values,
      basePrice: formattedBasePrice,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="departurePort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Port*</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select departure port" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ports ? ports.map(port => (
                      <SelectItem key={port.id} value={port.name}>
                        {port.name} ({port.city})
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-port">No ports available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Port*</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select arrival port" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ports ? ports.map(port => (
                      <SelectItem key={port.id} value={port.name}>
                        {port.name} ({port.city})
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-port">No ports available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="distance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance (km)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    placeholder="Distance in kilometers"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Optional</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)*</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    placeholder="Duration in minutes"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>E.g. 60 for 1 hour</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price (€)*</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field}
                    placeholder="Base ticket price"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Per passenger</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field}
                  placeholder="Enter a description of the route"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>Optional route description</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="checkInStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Start Time (minutes before departure)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    placeholder="e.g. 60 for 1 hour before departure"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>When passengers should start checking in</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkInEndTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in End Time (minutes before departure)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    placeholder="e.g. 15 for 15 minutes before departure"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Last time for check-in</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specialInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Instructions</FormLabel>
              <FormControl>
                <Textarea 
                  {...field}
                  placeholder="Any special instructions for this route"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>Information for passengers (e.g. luggage restrictions, check-in process)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="routeCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Route Code</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g. IST-BDR"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Short code for this route</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="routeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Route Type</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select route type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="scenic">Scenic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Type of ferry route</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Port Code Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="departureCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Port Code</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g. IST"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Short code for departure port</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="arrivalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Port Code</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g. BDR"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Short code for arrival port</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Route Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <FormDescription>
                      Toggle to enable or disable this route
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isInternational"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>International Route</FormLabel>
                    <FormDescription>
                      Crosses country borders
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countryDeparture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Country</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Turkey">Turkey</SelectItem>
                      <SelectItem value="Greece">Greece</SelectItem>
                      <SelectItem value="Italy">Italy</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>For international routes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countryArrival"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Country</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Turkey">Turkey</SelectItem>
                      <SelectItem value="Greece">Greece</SelectItem>
                      <SelectItem value="Italy">Italy</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>For international routes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Featured</FormLabel>
                    <FormDescription>
                      Show as featured route
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPopular"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Popular</FormLabel>
                    <FormDescription>
                      Mark as popular route
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="w-full"
        >
          {initialData ? "Update Route" : "Create Route"}
        </Button>
      </form>
    </Form>
  );
};

export default RouteForm;
