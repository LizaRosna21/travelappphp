import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { WhatsAppProvider } from "@/hooks/use-whatsapp";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { WebSocketErrorSuppressor } from "@/components/util/websocket-error-suppressor";
import WhatsAppChat from "@/components/chat/WhatsAppChat";
import SchemaOrgProvider from "@/components/SchemaOrgProvider";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import BiletStyleHomePage from "@/pages/bilet-style-home";
import AuthPage from "@/pages/auth-page";
import AdminLoginPage from "@/pages/admin-login";
import SearchResults from "@/pages/search-results";
import BookingPage from "@/pages/booking-page";
import OrderPage from "@/pages/order-page";
import PaymentPage from "@/pages/payment-page";
import PaymentTurkish from "@/pages/payment-turkish";
import PaymentTest from "@/pages/payment-test";
import DemoPaymentResponse from "@/pages/demo-payment-response";
import BookingConfirmed from "@/pages/booking-confirmed";
import MyBookings from "@/pages/my-bookings";
import ProfilePage from "@/pages/profile-page";
import StripePayment from "@/pages/stripe-payment";
import DemoStripePayment from "@/pages/demo-stripe-payment";
import PaymentSuccess from "@/pages/payment-success";
import PerformanceAnalytics from "@/pages/admin/analytics/performance";
import B2BPricing from "@/pages/admin/b2b/pricing";
import CustomerSegments from "@/pages/admin/customer-segments";
import EmailMarketingPage from "@/pages/admin/email-marketing";

// Rotaya özel sayfalar
import BodrumKosPage from "@/pages/routes/bodrum-kos";
import MarsOldakiPage from "@/pages/routes/mars-oldaki";

// Admin pages
import MarsOldakiAdminPage from "@/pages/admin/marsoldaki";
import AdminDashboard from "@/pages/admin/dashboard";
import ModernDashboard from "@/pages/admin/modern-dashboard";
import UnifiedDashboard from "@/pages/admin/unified-dashboard"; // Yeni birleştirilmiş dashboard
import AdminRoutes from "@/pages/admin/routes";
import AdminBookings from "@/pages/admin/bookings";
import AdminUsers from "@/pages/admin/users";
import AdminSettings from "@/pages/admin/settings";
import AdminMarketing from "@/pages/admin/marketing";
import BackofficeIntegration from "@/pages/admin/backoffice-integration";
import IntegrationsPage from "@/pages/admin/integrations";
import BackupManagement from "@/pages/admin/backup-management";
import RevenueManagement from "@/pages/admin/revenue-management";
import AdvancedDashboardPage from "@/pages/admin/advanced-dashboard-page";
import ApiManagementPage from "@/pages/admin/api-management";
import PaymentSettings from "@/pages/admin/payment-settings";
import ProductsPage from "@/pages/admin/products";
import PaymentsPage from "@/pages/admin/payments";
import SchedulesPage from "@/pages/admin/schedules";
import AdminInbox from "@/pages/admin/inbox";
import PortsPage from "@/pages/admin/ports";
import WhatsAppPage from "@/pages/admin/whatsapp";
import LanguagesPage from "@/pages/admin/languages";
import TranslationManagement from "@/pages/admin/translation-management";
import CurrenciesPage from "@/pages/admin/currencies";
import MembershipTiersPage from "@/pages/admin/membership-tiers";
import ReviewsPage from "@/pages/admin/reviews";
import UserDetailPage from "@/pages/admin/user-detail";
// B2B Module
import B2BManagement from "@/pages/admin/b2b";
import AgencyDetail from "@/pages/admin/b2b/agencies/[id]";
// Fix type issue by using proper FC import
import type { FC } from "react";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={BiletStyleHomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/admin-login" component={AdminLoginPage} />
          <Route path="/search" component={SearchResults} />
          <Route path="/search-results" component={SearchResults} />
          <Route path="/booking/:routeId" component={BookingPage} />
          <Route path="/order/:routeId" component={OrderPage} />
          <Route path="/payment/:bookingId" component={PaymentPage} />
          <Route path="/payment-turkish/:bookingId" component={PaymentTurkish} />
          <Route path="/payment-test" component={PaymentTest} />
          <Route path="/demo-payment-response" component={DemoPaymentResponse} />
          <Route path="/booking-confirmed/:bookingId" component={BookingConfirmed} />
          <Route path="/stripe-payment" component={StripePayment} />
          <Route path="/demo-stripe-payment" component={DemoStripePayment} />
          <Route path="/payment-success" component={PaymentSuccess} />
          <ProtectedRoute path="/my-bookings" component={MyBookings} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          
          {/* Route pages */}
          <Route path="/routes/bodrum-kos" component={BodrumKosPage} />
          <Route path="/routes/mars-oldaki" component={MarsOldakiPage} />
          
          {/* Admin routes */}
          <AdminRoute path="/admin" component={UnifiedDashboard} />
          <AdminRoute path="/admin/dashboard" component={UnifiedDashboard} />
          <AdminRoute path="/admin/advanced-dashboard" component={AdvancedDashboardPage} />
          <AdminRoute path="/admin/routes" component={AdminRoutes} />
          <AdminRoute path="/admin/ports" component={PortsPage} />
          <AdminRoute path="/admin/schedules" component={SchedulesPage} />
          <AdminRoute path="/admin/bookings" component={AdminBookings} />
          <AdminRoute path="/admin/payments" component={PaymentsPage} />
          <AdminRoute path="/admin/products" component={ProductsPage} />
          <AdminRoute path="/admin/users" component={AdminUsers} />
          <AdminRoute path="/admin/settings" component={AdminSettings} />
          <AdminRoute path="/admin/marketing" component={AdminMarketing} />
          <AdminRoute path="/admin/whatsapp" component={WhatsAppPage} />
          <AdminRoute path="/admin/api-management" component={ApiManagementPage} />
          <AdminRoute path="/admin/backoffice-integration" component={BackofficeIntegration} />
          <AdminRoute path="/admin/backup-management" component={BackupManagement} />
          <AdminRoute path="/admin/revenue-management" component={RevenueManagement} />
          <AdminRoute path="/admin/payment-settings" component={PaymentSettings} />
          <AdminRoute path="/admin/inbox" component={AdminInbox} />
          <AdminRoute path="/admin/members" component={AdminUsers} />
          <AdminRoute path="/admin/languages" component={LanguagesPage} />
          <AdminRoute path="/admin/translation-management" component={TranslationManagement} />
          <AdminRoute path="/admin/currencies" component={CurrenciesPage} />
          <AdminRoute path="/admin/membership-tiers" component={MembershipTiersPage} />
          <AdminRoute path="/admin/reviews" component={ReviewsPage} />
          <AdminRoute path="/admin/user/:id" component={UserDetailPage} />
          <AdminRoute path="/admin/marsoldaki" component={MarsOldakiAdminPage} />
          <AdminRoute path="/admin/integrations" component={IntegrationsPage} />
          <AdminRoute path="/admin/analytics/performance" component={PerformanceAnalytics} />
          <AdminRoute path="/admin/customer-segments" component={CustomerSegments} />
          <AdminRoute path="/admin/email-marketing" component={EmailMarketingPage} />
          
          {/* B2B Module Routes */}
          <AdminRoute path="/admin/b2b" component={B2BManagement} />
          <AdminRoute path="/admin/b2b/agencies/:id" component={AgencyDetail} />
          <AdminRoute path="/admin/b2b/pricing" component={B2BPricing} />
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      
      {/* WhatsApp Chat Uygulaması */}
      <WhatsAppChat />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WhatsAppProvider>
          <SchemaOrgProvider 
            siteName="Ferry Ticket"
            siteUrl={window.location.origin}
            logoUrl="/logo.png"
          >
            <WebSocketErrorSuppressor />
            <Router />
            <Toaster />
          </SchemaOrgProvider>
        </WhatsAppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
