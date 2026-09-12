import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminLoginPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        // Use setTimeout to make sure redirect happens after render
        setTimeout(() => {
          setLocation("/admin/dashboard");
        }, 100);
      } else {
        setLocation("/");
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
      }
    }
  }, [user, setLocation, toast]);

  const onSubmit = async (data: FormValues) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        if (user.role === "admin") {
          // Ensure we redirect to admin dashboard
          setTimeout(() => {
            setLocation("/admin/dashboard");
          }, 100);
          
          toast({
            title: "Welcome back, Admin",
            description: "Successfully logged in to the administration panel.",
          });
        } else {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges.",
            variant: "destructive",
          });
        }
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-neutral-500 mt-2">Access the ferry booking system administration panel</p>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your admin credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter admin username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-neutral-100 p-4">
            <p className="text-sm text-neutral-500">
              This area is restricted to authorized administrators only.
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <div className="hidden lg:flex items-center justify-center bg-primary w-1/2 p-8">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-4">Ferry Booking Administration</h2>
          <p className="text-lg opacity-90 mb-8">
            Manage routes, bookings, customers, and settings for your ferry operations.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Route Management</h3>
              <p className="text-sm opacity-80">Configure ferry routes, schedules, and pricing</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Booking Operations</h3>
              <p className="text-sm opacity-80">Manage reservations, ticketing, and passenger information</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Revenue Analytics</h3>
              <p className="text-sm opacity-80">Track sales, analyze performance, and generate reports</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Marketing Tools</h3>
              <p className="text-sm opacity-80">Create promotions, discounts, and communication campaigns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}