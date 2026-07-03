import { requireTenantSession } from "@/lib/session";
import { db } from "@/lib/db";
import { monitors, checkResults, incidents } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  up: "text-green-600 bg-green-50",
  down: "text-red-600 bg-red-50",
  degraded: "text-yellow-600 bg-yellow-50",
  unknown: "text-gray-500 bg-gray-100",
};

const STATUS_DOT: Record<string, string> = {
  up: "bg-green-500",
  down: "bg-red-500",
  degraded: "bg-yellow-500",
  unknown: "bg-gray-400",
};

export default async function DashboardPage() {
  const { orgId, orgName, orgSlug } = await requireTenantSession();

  const allMonitors = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.orgId, orgId), eq(monitors.enabled, true)))
    .orderBy(monitors.name);

  const latestByMonitor = await Promise.all(
    allMonitors.map(async (m) => {
      const [latest] = await db
        .select()
        .from(checkResults)
        .where(eq(checkResults.monitorId, m.id))
        .orderBy(desc(checkResults.checkedAt))
        .limit(1);
      return { id: m.id, result: latest ?? null };
    })
  );
  const statusMap = Object.fromEntries(
    latestByMonitor.map((r) => [r.id, r.result?.status ?? "unknown"])
  );

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const openIncidents = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.orgId, orgId),
        gte(incidents.startedAt, since24h)
      )
    )
    .orderBy(desc(incidents.startedAt))
    .limit(5);

  const upCount = allMonitors.filter((m) => statusMap[m.id] === "up").length;
  const downCount = allMonitors.filter((m) => statusMap[m.id] === "down").length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
          <p className="text-sm text-gray-500">
            {upCount}/{allMonitors.length} monitors up ·{" "}
            <a
              href={`/status/${orgSlug}`}
              target="_blank"
              className="text-indigo-600 hover:underline"
            >
              View public status page ↗
            </a>
          </p>
        </div>
        <Link
          href="/dashboard/monitors/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Add Monitor
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Monitors</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{allMonitors.length}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-5">
          <p className="text-sm font-medium text-green-700">Operational</p>
          <p className="mt-1 text-3xl font-bold text-green-800">{upCount}</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">Down</p>
          <p className="mt-1 text-3xl font-bold text-red-800">{downCount}</p>
        </div>
      </div>

      {/* Monitor list */}
      <div className="mb-8 overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Monitors</h2>
        </div>
        {allMonitors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">No monitors yet.</p>
            <Link
              href="/dashboard/monitors/new"
              className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
            >
              Add your first monitor →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {allMonitors.map((m) => {
              const status = statusMap[m.id] ?? "unknown";
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">
                        {m.type.toUpperCase()} · {m.target} · every {m.intervalSeconds}s
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[status]}`}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Recent incidents */}
      {openIncidents.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Recent Incidents</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {openIncidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inc.title}</p>
                  <p className="text-xs text-gray-400">
                    {inc.startedAt.toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    inc.status === "resolved"
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {inc.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
