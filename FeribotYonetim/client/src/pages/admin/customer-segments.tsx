import { Helmet } from "react-helmet";
import UnifiedAdminLayout from "@/components/admin/unified-admin-layout";
import SegmentsList from "@/components/admin/marketing/segments-list";

export default function CustomerSegmentsPage() {
  return (
    <>
      <Helmet>
        <title>Customer Segments | Ferry Admin</title>
      </Helmet>
      <UnifiedAdminLayout>
        <div className="container py-6">
          <SegmentsList />
        </div>
      </UnifiedAdminLayout>
    </>
  );
}