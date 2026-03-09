import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Ship, User, LogOut, Menu, ChevronDown, TicketCheck, Settings, ShieldAlert } from "lucide-react";

const Header = () => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActiveLink = (path: string) => {
    return location === path;
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <Ship className="h-8 w-8" />
            <span className="text-xl font-bold">FerryBooking</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link 
            href="/" 
            className={isActiveLink("/") 
              ? "text-primary font-medium" 
              : "text-neutral-600 hover:text-primary font-medium"
            }
          >
            Home
          </Link>
          <Link 
            href="/search" 
            className={isActiveLink("/search") 
              ? "text-primary font-medium" 
              : "text-neutral-600 hover:text-primary font-medium"
            }
          >
            Routes
          </Link>
          {user && (
            <Link 
              href="/my-bookings" 
              className={isActiveLink("/my-bookings") 
                ? "text-primary font-medium" 
                : "text-neutral-600 hover:text-primary font-medium"
              }
            >
              My Bookings
            </Link>
          )}
          {user && user.role === "admin" && (
            <Link 
              href="/admin/dashboard" 
              className={location.startsWith("/admin") 
                ? "text-primary font-medium" 
                : "text-neutral-600 hover:text-primary font-medium"
              }
            >
              Admin
            </Link>
          )}
        </nav>
        
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-neutral-700 hover:text-primary">
                  <span className="mr-1 font-medium">EUR</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>EUR (€)</DropdownMenuItem>
                <DropdownMenuItem>USD ($)</DropdownMenuItem>
                <DropdownMenuItem>GBP (£)</DropdownMenuItem>
                <DropdownMenuItem>TRY (₺)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {getInitials(user.fullName || user.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.fullName || user.username}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my-bookings" className="cursor-pointer flex w-full">
                    <TicketCheck className="mr-2 h-4 w-4" />
                    <span>My Bookings</span>
                  </Link>
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard" className="cursor-pointer flex w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/admin-login" className="hidden md:flex items-center text-neutral-600 hover:text-primary">
                <ShieldAlert className="h-4 w-4 mr-1" />
                <span className="text-sm">Admin</span>
              </Link>
              <Link href="/auth">
                <Button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
          
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6 text-neutral-700 hover:text-primary" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col space-y-4 mt-6">
                <Link 
                  href="/" 
                  onClick={() => setIsMenuOpen(false)}
                  className={isActiveLink("/") 
                    ? "text-primary font-medium" 
                    : "text-neutral-600 hover:text-primary font-medium"
                  }
                >
                  Home
                </Link>
                <Link 
                  href="/search" 
                  onClick={() => setIsMenuOpen(false)}
                  className={isActiveLink("/search") 
                    ? "text-primary font-medium" 
                    : "text-neutral-600 hover:text-primary font-medium"
                  }
                >
                  Routes
                </Link>
                {user && (
                  <Link 
                    href="/my-bookings" 
                    onClick={() => setIsMenuOpen(false)}
                    className={isActiveLink("/my-bookings") 
                      ? "text-primary font-medium" 
                      : "text-neutral-600 hover:text-primary font-medium"
                    }
                  >
                    My Bookings
                  </Link>
                )}
                {user && user.role === "admin" && (
                  <Link 
                    href="/admin/dashboard" 
                    onClick={() => setIsMenuOpen(false)}
                    className={location.startsWith("/admin") 
                      ? "text-primary font-medium" 
                      : "text-neutral-600 hover:text-primary font-medium"
                    }
                  >
                    Admin Dashboard
                  </Link>
                )}
                {!user && (
                  <>
                    <Link 
                      href="/admin-login" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center text-neutral-600 hover:text-primary font-medium"
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      <span>Admin Login</span>
                    </Link>
                    <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 w-full">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
                {user && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
