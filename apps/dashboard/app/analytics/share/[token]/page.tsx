import { AnalyticsDashboard } from "../../../../components/analytics/AnalyticsDashboard";

export default function PublicAnalyticsDashboard({ params }: { params: { token: string } }) {
  return <AnalyticsDashboard publicToken={params.token} />;
}
