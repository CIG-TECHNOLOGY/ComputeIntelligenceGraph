import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { organizations, monitors, checkResults, incidents } from "@/lib/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

interface Props {
  params: { tenant: string; monitorId: string };
}

export async function generateMetadata({ params }: Props) {
  const [org, monitor] = await Promise.all([getOrg(params.tenant), getMonitor(params.monitorId)]);
  return { title: monitor ? `${monitor.name} — ${org?.name ?? params.tenant} Status` : "Monitor" };
}

async function getOrg(slug: string) {
  const [org] = await db
    .select().from(organizations)
    .where(and(eq(organizations.slug, slug), eq(organizations.statusPageEnabled, true)));
  return org ?? null;
}

async function getMonitor(id: string) {
  const [m] = await db.select().from(monitors).where(eq(monitors.id, id));
  return m ?? null;
}

// Daily uptime for N days
async function getDailyUptime(monitorId: string, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = (await db.execute(sql`
    SELECT date_trunc('day', checked_at)::date AS day,
           COUNT(*)                             AS total,
           SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up_count
    FROM   check_results
    WHERE  monitor_id = ${monitorId} AND checked_at >= ${since}
    GROUP  BY 1 ORDER BY 1
  `)) as { day: string; total: string; up_count: string }[];

  const byDay = new Map(rows.map((r) => [r.day, { total: Number(r.total), up: Number(r.up_count) }]));
  const result: { date: Date; upRatio: number | null; total: number; up: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const data = byDay.get(key) ?? null;
    result.push({ date: d, upRatio: data ? data.up / data.total : null, total: data?.total ?? 0, up: data?.up ?? 0 });
  }
  return result;
}

// Hourly response-time averages for last 24h (for sparkline)
async function getResponseTimeSeries(monitorId: string) {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const rows = (await db.execute(sql`
    SELECT date_trunc('hour', checked_at) AS hour,
           AVG(response_time_ms)::int      AS avg_ms,
           COUNT(*)                        AS total,
           SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up_count
    FROM   check_results
    WHERE  monitor_id = ${monitorId} AND checked_at >= ${since}
    GROUP  BY 1 ORDER BY 1
  `)) as { hour: string; avg_ms: string; total: string; up_count: string }[];
  return rows.map((r) => ({
    hour: new Date(r.hour),
    avgMs: Number(r.avg_ms),
    upRatio: Number(r.up_count) / Number(r.total),
  }));
}

function barColor(r: number | null) {
  if (r === null) return "#e5e7eb";
  if (r >= 0.95) return "#10b981";
  if (r >= 0.5) return "#f59e0b";
  return "#ef4444";
}

function uptimePct(days: { upRatio: number | null }[]) {
  const w = days.filter((d) => d.upRatio !== null);
  if (!w.length) return null;
  return (w.reduce((s, d) => s + d.upRatio!, 0) / w.length * 100).toFixed(2);
}

// SVG sparkline for response time
function ResponseSparkline({
  series,
}: {
  series: { hour: Date; avgMs: number; upRatio: number }[];
}) {
  if (series.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400">
        Not enough data yet
      </div>
    );
  }

  const W = 560;
  const H = 64;
  const pad = 4;
  const maxMs = Math.max(...series.map((s) => s.avgMs), 1);

  const pts = series.map((s, i) => {
    const x = pad + (i / (series.length - 1)) * (W - pad * 2);
    const y = pad + (1 - s.avgMs / maxMs) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const area =
    `M ${pts[0]} ` +
    pts.slice(1).map((p) => `L ${p}`).join(" ") +
    ` L ${(W - pad).toFixed(1)},${(H - pad).toFixed(1)} L ${pad},${(H - pad).toFixed(1)} Z`;

  const line = `M ${pts[0]} ` + pts.slice(1).map((p) => `L ${p}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rtGrad)" />
      <path d={line} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default async function MonitorDetailPage({ params }: Props) {
  const [org, monitor] = await Promise.all([getOrg(params.tenant), getMonitor(params.monitorId)]);

  if (!org || !monitor || monitor.orgId !== org.id) notFound();

  const cfg = (monitor.config as { description?: string } | null) ?? {};

  const [days90, timeSeries, recentChecks, recentIncidents] = await Promise.all([
    getDailyUptime(monitor.id, 90),
    getResponseTimeSeries(monitor.id),
    db.select().from(checkResults)
      .where(eq(checkResults.monitorId, monitor.id))
      .orderBy(desc(checkResults.checkedAt)).limit(20),
    db.select().from(incidents)
      .where(and(eq(incidents.monitorId, monitor.id), gte(incidents.startedAt, new Date(Date.now() - 90 * 86_400_000))))
      .orderBy(desc(incidents.startedAt)).limit(5),
  ]);

  const days30 = days90.slice(60);
  const days7 = days90.slice(83);
  const latestCheck = recentChecks[0];
  const currentStatus = latestCheck?.status ?? "unknown";

  const avgResponseMs =
    recentChecks.filter((c) => c.responseTimeMs).reduce((s, c) => s + (c.responseTimeMs ?? 0), 0) /
      (recentChecks.filter((c) => c.responseTimeMs).length || 1);

  const statusCls: Record<string, string> = {
    up: "bg-emerald-100 text-emerald-700",
    down: "bg-red-100 text-red-700",
    degraded: "bg-amber-100 text-amber-700",
    unknown: "bg-gray-100 text-gray-500",
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-14">
        {/* Back */}
        <Link href={`/status/${params.tenant}`}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {org.statusPageTitle ?? `${org.name} Status`}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{monitor.name}</h1>
            <span className={`mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusCls[currentStatus] ?? statusCls.unknown}`}>
              {currentStatus}
            </span>
          </div>
          {cfg.description && (
            <p className="mt-2 text-sm text-gray-500">{cfg.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a href={monitor.target} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {monitor.target}
            </a>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">
              {monitor.type.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">every {monitor.intervalSeconds}s</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Uptime 24h" value={uptimePct(days90.slice(89)) !== null ? `${uptimePct(days90.slice(89))}%` : "—"} />
          <StatCard label="Uptime 7d"  value={uptimePct(days7)  !== null ? `${uptimePct(days7)}%`  : "—"} />
          <StatCard label="Uptime 30d" value={uptimePct(days30) !== null ? `${uptimePct(days30)}%` : "—"} />
          <StatCard label="Uptime 90d" value={uptimePct(days90) !== null ? `${uptimePct(days90)}%` : "—"} />
        </div>

        {/* 90-day uptime chart */}
        <div className="mb-8 rounded-xl border bg-white px-6 py-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-gray-900">Uptime — last 90 days</p>
          <div className="flex items-end gap-px overflow-x-auto pb-1" aria-hidden>
            {days90.map((d, i) => (
              <span
                key={i}
                title={
                  d.upRatio === null
                    ? `${d.date.toLocaleDateString()}: no data`
                    : `${d.date.toLocaleDateString()}: ${Math.round(d.upRatio * 100)}% (${d.up}/${d.total})`
                }
                style={{ backgroundColor: barColor(d.upRatio) }}
                className="inline-block h-10 min-w-[5px] flex-1 rounded-sm"
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-300 select-none">
            <span>90 days ago</span>
            <span>today</span>
          </div>
        </div>

        {/* Response time sparkline */}
        <div className="mb-8 rounded-xl border bg-white px-6 py-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Response time — last 24h</p>
            {recentChecks.length > 0 && (
              <span className="text-xs tabular-nums text-gray-400">
                avg {Math.round(avgResponseMs)} ms
              </span>
            )}
          </div>
          <ResponseSparkline series={timeSeries} />
          {timeSeries.length > 0 && (
            <div className="mt-1 flex justify-between text-[10px] text-gray-300 select-none">
              <span>24h ago</span>
              <span>now</span>
            </div>
          )}
        </div>

        {/* Recent incidents */}
        {recentIncidents.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Incidents</h2>
            <ul className="space-y-2">
              {recentIncidents.map((inc) => (
                <li key={inc.id} className="rounded-xl border bg-white px-5 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900">{inc.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${inc.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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
          </div>
        )}

        {/* Recent checks */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <p className="text-sm font-semibold text-gray-900">Recent checks</p>
          </div>
          {recentChecks.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No checks yet — first run in ≤60s.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentChecks.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-6 py-3">
                  <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium capitalize ${statusCls[c.status] ?? statusCls.unknown}`}>
                    {c.status}
                  </span>
                  <span className="flex-1 text-xs text-gray-500 truncate">
                    {c.errorMessage ?? (c.statusCode ? `HTTP ${c.statusCode}` : "—")}
                  </span>
                  {c.responseTimeMs != null && (
                    <span className="shrink-0 tabular-nums text-xs text-gray-400">{c.responseTimeMs} ms</span>
                  )}
                  <span className="shrink-0 text-xs text-gray-300 tabular-nums">
                    {c.checkedAt.toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t pt-8 text-center">
          {(org.contactGithubUrl || org.contactEmail) && (
            <>
              <p className="mb-3 text-sm font-medium text-gray-700">Report an incident</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {org.contactGithubUrl && (
                  <a href={org.contactGithubUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    Open GitHub Issue
                  </a>
                )}
                {org.contactEmail && (
                  <a href={`mailto:${org.contactEmail}?subject=Incident%20Report`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    {org.contactEmail}
                  </a>
                )}
              </div>
            </>
          )}
          <p className="text-xs text-gray-400">
            Powered by <a href="https://cig.technology" className="hover:underline">CIG Monitor</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
