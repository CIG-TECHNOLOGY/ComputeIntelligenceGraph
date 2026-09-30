import { AnalyticsDashboard } from "../../../../components/analytics/AnalyticsDashboard";

type BaseDomain = "analytics.cig.technology";

export default function PermanentAnalyticsDashboard({
  params,
  searchParams,
}: {
  params: { alias: string };
  searchParams: { base?: string };
}) {
  const baseDomain: BaseDomain = "analytics.cig.technology";
  return <AnalyticsDashboard publicAlias={{ alias: params.alias, baseDomain }} />;
}
