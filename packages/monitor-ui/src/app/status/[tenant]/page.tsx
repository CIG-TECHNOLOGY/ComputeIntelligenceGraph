import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { organizations, monitors, checkResults, incidents } from "@/lib/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

interface Props {
  params: { tenant: string };
}

export async function generateMetadata({ params }: Props) {
  const org = await getOrg(params.tenant);
  return { title: org?.statusPageTitle ?? `${params.tenant} Status` };
}

async function getOrg(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.slug, slug), eq(organizations.statusPageEnabled, true)));
  return org ?? null;
}

async function getDailyUptime(monitorId: string, days = 30) {
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
  const result: { date: Date; upRatio: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const data = byDay.get(key) ?? null;
    result.push({ date: d, upRatio: data ? data.up / data.total : null });
  }
  return result;
}

function barColor(r: number | null) {
  if (r === null) return "bg-gray-200";
  if (r >= 0.95) return "bg-emerald-500";
  if (r >= 0.5) return "bg-amber-400";
  return "bg-red-500";
}

function UptimeBars({ days }: { days: { date: Date; upRatio: number | null }[] }) {
  return (
    <div className="flex items-end gap-px" aria-hidden>
      {days.map((d, i) => (
        <span
          key={i}
          title={
            d.upRatio === null
              ? `${d.date.toLocaleDateString()}: no data`
              : `${d.date.toLocaleDateString()}: ${Math.round(d.upRatio * 100)}% up`
          }
          className={`inline-block h-6 w-1.5 rounded-sm ${barColor(d.upRatio)}`}
        />
      ))}
    </div>
  );
}

function uptimePct(days: { upRatio: number | null }[]) {
  const w = days.filter((d) => d.upRatio !== null);
  if (!w.length) return null;
  return Math.round((w.reduce((s, d) => s + d.upRatio!, 0) / w.length) * 1000) / 10;
}

function StatusDot({ status }: { status: string }) {
  const cls: Record<string, string> = {
    up: "bg-emerald-500", down: "bg-red-500", degraded: "bg-amber-400", unknown: "bg-gray-300",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls[status] ?? "bg-gray-300"}`} />;
}

export default async function StatusPage({ params }: Props) {
  const org = await getOrg(params.tenant);
  if (!org) notFound();

  const since90 = new Date(Date.now() - 90 * 86_400_000);

  const [allMonitors, openIncidents] = await Promise.all([
    db.select().from(monitors).where(and(eq(monitors.orgId, org.id), eq(monitors.enabled, true))),
    db.select().from(incidents)
      .where(and(eq(incidents.orgId, org.id), gte(incidents.startedAt, since90)))
      .orderBy(desc(incidents.startedAt)).limit(5),
  ]);

  const [latestResults, dailyAll] = await Promise.all([
    Promise.all(
      allMonitors.map(async (m) => {
        const [r] = await db.select().from(checkResults)
          .where(eq(checkResults.monitorId, m.id))
          .orderBy(desc(checkResults.checkedAt)).limit(1);
        return { monitorId: m.id, result: r ?? null };
      })
    ),
    Promise.all(allMonitors.map((m) => getDailyUptime(m.id, 30).then((d) => ({ monitorId: m.id, days: d })))),
  ]);

  const statusOf = Object.fromEntries(latestResults.map((r) => [r.monitorId, r.result?.status ?? "unknown"]));
  const uptimeOf = Object.fromEntries(dailyAll.map((d) => [d.monitorId, d.days]));

  const allUp = allMonitors.every((m) => statusOf[m.id] === "up");
  const anyDown = allMonitors.some((m) => statusOf[m.id] === "down");
  const overall = anyDown ? "down" : allUp ? "up" : "degraded";

  const bannerCls = { up: "bg-emerald-50 border-emerald-200 text-emerald-800", down: "bg-red-50 border-red-200 text-red-800", degraded: "bg-amber-50 border-amber-200 text-amber-800" }[overall];
  const bannerLabel = { up: "All systems operational", down: "Service disruption detected", degraded: "Partial degradation" }[overall];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-14">
        {/* Header */}
        <div className="mb-10 text-center">
          {org.logoUrl && <img src={org.logoUrl} alt={org.name} className="mx-auto mb-4 h-10" />}
          <h1 className="text-3xl font-bold text-gray-900">{org.statusPageTitle ?? `${org.name} Status`}</h1>
          <p className="mt-1 text-sm text-gray-400">Updated every 60 s &middot; 30-day history</p>
        </div>

        {/* Overall banner */}
        <div className={`mb-8 rounded-xl border px-6 py-4 ${bannerCls}`}>
          <div className="flex items-center gap-3">
            <StatusDot status={overall} />
            <span className="font-semibold">{bannerLabel}</span>
          </div>
        </div>

        {/* Monitor list */}
        <div className="mb-10 overflow-hidden rounded-xl border bg-white shadow-sm">
          {allMonitors.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-400">No monitors configured.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {allMonitors.map((m) => {
                const status = statusOf[m.id] ?? "unknown";
                const days = uptimeOf[m.id] ?? [];
                const pct = uptimePct(days);
                const desc = (m.config as { description?: string } | null)?.description;
                return (
                  <li key={m.id}>
                    <Link href={`/status/${params.tenant}/${m.id}`}
                      className="group flex flex-col gap-2 px-6 py-4 transition hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                            {m.name}
                          </p>
                          {desc && <p className="mt-0.5 text-xs text-gray-400 truncate">{desc}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {pct !== null && (
                            <span className="text-xs tabular-nums text-gray-400">{pct}%</span>
                          )}
                          <StatusDot status={status} />
                          <span className="text-xs capitalize text-gray-500 w-14 text-right">{status}</span>
                        </div>
                      </div>
                      <UptimeBars days={days} />
                      <div className="flex justify-between text-[10px] text-gray-300 select-none">
                        <span>30 days ago</span>
                        <span>today</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Incidents */}
        {openIncidents.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Recent Incidents</h2>
            <ul className="space-y-3">
              {openIncidents.map((inc) => (
                <li key={inc.id} className="rounded-xl border bg-white px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-medium text-gray-900">{inc.title}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${inc.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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

        {/* Footer */}
        <footer className="mt-16 border-t pt-8 text-center">
          {(org.contactGithubUrl || org.contactEmail) && (
            <>
              <p className="mb-3 text-sm font-medium text-gray-700">Report an incident</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {org.contactGithubUrl && (
                  <a href={org.contactGithubUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    Open GitHub Issue
                  </a>
                )}
                {org.contactEmail && (
                  <a href={`mailto:${org.contactEmail}?subject=Incident%20Report`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50">
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
