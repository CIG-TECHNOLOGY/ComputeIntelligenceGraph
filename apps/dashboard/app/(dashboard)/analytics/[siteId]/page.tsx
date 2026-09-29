import { AnalyticsDashboard } from "../../../../components/analytics/AnalyticsDashboard";

export default function AnalyticsSiteDashboard({ params }: { params: { siteId: string } }) {
  return <AnalyticsDashboard siteId={params.siteId} />;
}
