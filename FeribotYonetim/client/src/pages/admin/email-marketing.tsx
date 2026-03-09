import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import AdminLayout from "@/components/layouts/admin-layout";
import { Helmet } from "react-helmet";
import EmailsList from "@/components/admin/marketing/emails-list";
import { useQuery } from "@tanstack/react-query";

const EmailMarketingPage = () => {
  const [activeTab, setActiveTab] = useState("emails");

  // Get some basic stats
  const { data: emails, isLoading: emailsLoading } = useQuery({
    queryKey: ['/api/marketing-emails'],
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ['/api/customer-segments'],
  });

  // Calculate stats
  const draftEmails = emails?.filter(e => e.status === "draft")?.length || 0;
  const sentEmails = emails?.filter(e => e.status === "sent")?.length || 0;
  const scheduledEmails = emails?.filter(e => e.status === "scheduled")?.length || 0;

  return (
    <AdminLayout>
      <Helmet>
        <title>Email Marketing Management | Ferry Ticket Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Email Marketing Management</h1>
          <p className="text-muted-foreground">
            Create, send, and track email marketing campaigns to your customers.
          </p>
        </div>

        {segments?.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No customer segments found</AlertTitle>
            <AlertDescription>
              You'll need to create customer segments before you can send targeted emails. 
              <a href="/admin/customer-segments" className="underline ml-1">Create segments here</a>.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="emails" className="space-y-4">
          <TabsList>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="emails" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-lg font-medium mb-2">Draft Emails</h3>
                <p className="text-3xl font-bold">{draftEmails}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-lg font-medium mb-2">Scheduled</h3>
                <p className="text-3xl font-bold">{scheduledEmails}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-lg font-medium mb-2">Sent</h3>
                <p className="text-3xl font-bold">{sentEmails}</p>
              </div>
            </div>

            <EmailsList />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Email Performance Analytics</h2>
              <p className="text-muted-foreground">
                Email analytics will appear here once you have sent emails to your customers.
              </p>
              {/* Placeholder for future analytics implementation */}
              <div className="h-64 flex items-center justify-center border border-dashed rounded-md mt-4">
                <p className="text-muted-foreground">
                  Analytics data will be displayed here
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Email Templates</h2>
              <p className="text-muted-foreground">
                Create and manage reusable email templates to streamline your email marketing.
              </p>
              {/* Placeholder for future templates implementation */}
              <div className="h-64 flex items-center justify-center border border-dashed rounded-md mt-4">
                <p className="text-muted-foreground">
                  Email templates will be displayed here
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default EmailMarketingPage;