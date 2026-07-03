import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { organizations, monitors, checkResults, incidents } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

interface Props {
  params: { tenant: string };
}

export async function generateMetadata({ params }: Props) {
  const org = await getOrg(params.tenant);
  return {
    title: org?.statusPageTitle ?? `${params.tenant} Status`,
  };
}

async function getOrg(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.slug, slug), eq(organizations.statusPageEnabled, true)));
  return org ?? null;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    up: "bg-green-500",
    down: "bg-red-500",
    degraded: "bg-yellow-500",
    unknown: "bg-gray-400",
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status] ?? "bg-gray-400"}`}
    />
  );
}

export default async function StatusPage({ params }: Props) {
  const org = await getOrg(params.tenant);
  if (!org) notFound();

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

  const [allMonitors, openIncidents] = await Promise.all([
    db
      .select()
      .from(monitors)
      .where(and(eq(monitors.orgId, org.id), eq(monitors.enabled, true))),
    db
      .select()
      .from(incidents)
      .where(
        and(eq(incidents.orgId, org.id), gte(incidents.startedAt, since))
      )
      .orderBy(desc(incidents.startedAt))
      .limit(10),
  ]);

  // Fetch latest result per monitor
  const latestResults = await Promise.all(
    allMonitors.map(async (m) => {
      const [latest] = await db
        .select()
        .from(checkResults)
        .where(eq(checkResults.monitorId, m.id))
        .orderBy(desc(checkResults.checkedAt))
        .limit(1);
      return { monitorId: m.id, result: latest ?? null };
    })
  );

  const statusByMonitor = Object.fromEntries(
    latestResults.map((r) => [r.monitorId, r.result?.status ?? "unknown"])
  );

  const allUp = allMonitors.every((m) => statusByMonitor[m.id] === "up");
  const anyDown = allMonitors.some((m) => statusByMonitor[m.id] === "down");

  const overallStatus = anyDown ? "down" : allUp ? "up" : "degraded";
  const overallLabel = {
    up: "All systems operational",
    down: "Service disruption detected",
    degraded: "Partial degradation",
  }[overallStatus];

  const overallBg = {
    up: "bg-green-50 border-green-200 text-green-800",
    down: "bg-red-50 border-red-200 text-red-800",
    degraded: "bg-yellow-50 border-yellow-200 text-yellow-800",
  }[overallStatus];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className="mx-auto mb-4 h-10" />
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            {org.statusPageTitle ?? `${org.name} Status`}
          </h1>
        </div>

        {/* Overall status banner */}
        <div className={`mb-8 rounded-xl border px-6 py-4 ${overallBg}`}>
          <div className="flex items-center gap-3">
            <StatusDot status={overallStatus} />
            <span className="font-semibold">{overallLabel}</span>
          </div>
        </div>

        {/* Monitor list */}
        <div className="mb-10 overflow-hidden rounded-xl border bg-white">
          {allMonitors.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              No monitors configured yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {allMonitors.map((m) => {
                const status = statusByMonitor[m.id] ?? "unknown";
                return (
                  <li key={m.id} className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-sm capitalize text-gray-500">{status}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Incidents */}
        {openIncidents.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Recent Incidents
            </h2>
            <ul className="space-y-3">
              {openIncidents.map((inc) => (
                <li key={inc.id} className="rounded-xl border bg-white px-6 py-4">
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-gray-900">{inc.title}</span>
                    <span
                      className={`ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        inc.status === "resolved"
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {inc.startedAt.toLocaleString()}
                    {inc.resolvedAt && ` — resolved ${inc.resolvedAt.toLocaleString()}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-16 text-center text-xs text-gray-400">
          Powered by{" "}
          <a href="https://cig.technology" className="hover:underline">
            CIG Monitor
          </a>
        </p>
      </div>
    </main>
  );
}
