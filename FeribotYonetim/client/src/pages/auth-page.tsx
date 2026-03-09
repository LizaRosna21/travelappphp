import { useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ship, Mail, Lock, User as UserIcon } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().optional(),
});

const AuthPage = () => {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  // Get the redirectTo parameter from the URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get("redirectTo") || "/";

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  return (
    <>
      <Helmet>
        <title>Sign In or Register - FerryBooking</title>
        <meta
          name="description"
          content="Sign in to your FerryBooking account or register for a new account."
        />
      </Helmet>

      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Left column - Auth forms */}
              <div className="w-full md:w-1/2 p-8">
                <div className="flex items-center gap-2 text-primary mb-8">
                  <Ship className="h-8 w-8" />
                  <span className="text-xl font-bold">FerryBooking</span>
                </div>

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <h1 className="text-2xl font-bold mb-6">Welcome back</h1>

                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                  <Input 
                                    {...field} 
                                    placeholder="Enter your username" 
                                    className="pl-10"
                                    disabled={loginMutation.isPending}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                  <Input 
                                    {...field} 
                                    type="password" 
                                    placeholder="Enter your password" 
                                    className="pl-10"
                                    disabled={loginMutation.isPending} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-primary" 
                          disabled={loginMutation.isPending}
                          isLoading={loginMutation.isPending}
                        >
                          Sign In
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="register">
                    <h1 className="text-2xl font-bold mb-6">Create an account</h1>

                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                  <Input 
                                    {...field} 
                                    placeholder="Choose a username" 
                                    className="pl-10"
                                    disabled={registerMutation.isPending} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                  <Input 
                                    {...field} 
                                    type="email" 
                                    placeholder="Enter your email" 
                                    className="pl-10"
                                    disabled={registerMutation.isPending} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name (Optional)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                  <Input 
                                    {...field} 
                                    placeholder="Enter your full name" 
                                    className="pl-10"
                                    disabled={registerMutation.isPending} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                  <Input 
                                    {...field} 
                                    type="password" 
                                    placeholder="Create a password" 
                                    className="pl-10"
                                    disabled={registerMutation.isPending} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-primary" 
                          disabled={registerMutation.isPending}
                          isLoading={registerMutation.isPending}
                        >
                          Register
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right column - Hero section */}
              <div className="w-full md:w-1/2 bg-primary p-8 text-white flex flex-col justify-center">
                <h2 className="text-3xl font-bold mb-4">Ferry ticket booking made easy</h2>
                
                <p className="mb-6">Join thousands of travelers booking their ferry journeys with FerryBooking.</p>
                
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Best price guarantee
                  </li>
                  <li className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Secure online payment
                  </li>
                  <li className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    No booking fees
                  </li>
                  <li className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    24/7 customer support
                  </li>
                </ul>
                
                <div className="mt-8 bg-white/10 rounded-lg p-4">
                  <p className="italic text-white/80">
                    "Booking with FerryBooking was so simple and stress-free. I found great prices and the whole process was seamless."
                  </p>
                  <p className="mt-2 font-medium">— Maria T., Traveler</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
