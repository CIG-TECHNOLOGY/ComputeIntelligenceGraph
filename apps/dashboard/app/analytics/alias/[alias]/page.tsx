import { AnalyticsDashboard } from "../../../../components/analytics/AnalyticsDashboard";

type BaseDomain = "analytics.cig.lat" | "analytics.cig.technology";

export default function PermanentAnalyticsDashboard({
  params,
  searchParams,
}: {
  params: { alias: string };
  searchParams: { base?: string };
}) {
  const baseDomain = searchParams.base === "analytics.cig.technology"
    ? "analytics.cig.technology"
    : "analytics.cig.lat";
  return <AnalyticsDashboard publicAlias={{ alias: params.alias, baseDomain: baseDomain as BaseDomain }} />;
}
