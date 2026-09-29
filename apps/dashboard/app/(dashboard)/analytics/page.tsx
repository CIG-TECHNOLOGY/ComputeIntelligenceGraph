"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Check, Clipboard, ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { AnalyticsBreakdown, AnalyticsSite } from "@cig/sdk";
import {
  createAnalyticsSite,
  deleteAnalyticsSite,
  getAnalyticsSiteInsights,
  getAnalyticsSiteStats,
  listAnalyticsSites,
  provisionAnalyticsSite,
} from "../../../lib/api";
import { DASHBOARD_API_URL } from "../../../lib/cigClient";
import { formatDashboardApiError } from "../../../lib/apiErrors";

function statusClass(status: AnalyticsSite["status"]): string {
  if (status === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "failed") return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "deleted") return "bg-slate-500/10 text-slate-500";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function mergeBreakdowns(items: AnalyticsBreakdown[]): AnalyticsBreakdown[] {
  const merged = new Map<string, number>();
  for (const item of items) merged.set(item.label, (merged.get(item.label) ?? 0) + item.value);
  return [...merged.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineCheck, setPipelineCheck] = useState<{
    siteId: string;
    state: "checking" | "ready" | "error";
    message: string;
  } | null>(null);

  const sitesQuery = useQuery({ queryKey: ["analytics", "sites"], queryFn: listAnalyticsSites });
  const sites = useMemo(() => sitesQuery.data?.items ?? [], [sitesQuery.data?.items]);
  const activeSites = useMemo(() => sites.filter((site) => site.status === "active"), [sites]);
  const siteInsightsQueries = useQueries({
    queries: activeSites.map((site) => ({
      queryKey: ["analytics", "workspace-insights", site.id, 30],
      queryFn: () => getAnalyticsSiteInsights(site.id, 30),
      enabled: sitesQuery.isSuccess,
      refetchInterval: 30_000,
      staleTime: 15_000,
    })),
  });
  const siteStatsQueries = useQueries({
    queries: activeSites.map((site) => ({
      queryKey: ["analytics", "workspace-stats", site.id],
      queryFn: () => getAnalyticsSiteStats(site.id),
      enabled: sitesQuery.isSuccess,
      refetchInterval: 30_000,
      staleTime: 15_000,
    })),
  });
  const workspaceSummary = useMemo(() => {
    const rows = activeSites.flatMap((site, index) => {
      const insights = siteInsightsQueries[index]?.data?.insights;
      const stats = siteStatsQueries[index]?.data;
      return insights ? [{ site, insights, stats }] : [];
    });
    const pages = rows.flatMap(({ site, insights }) => insights.pages.map((page) => ({ ...page, site: site.domain })));
    return {
      loaded: rows.length > 0,
      loading: activeSites.length > 0 && siteInsightsQueries.some((query) => query.isLoading),
      failed: siteInsightsQueries.filter((query) => query.isError).length + siteStatsQueries.filter((query) => query.isError).length,
      pageviews: rows.reduce((sum, row) => sum + row.insights.totals.pageviews, 0),
      visitors: rows.reduce((sum, row) => sum + row.insights.totals.visitors, 0),
      visits: rows.reduce((sum, row) => sum + row.insights.totals.visits, 0),
      events: rows.reduce((sum, row) => sum + (row.stats?.totals.events ?? 0), 0),
      accepted: rows.reduce((sum, row) => sum + (row.stats?.totals.accepted ?? 0), 0),
      pagesTracked: new Set(pages.map((page) => `${page.site}:${page.label}`)).size,
      liveVisitors: rows.reduce((sum, row) => sum + row.insights.realtime.visitors, 0),
      topPages: pages.sort((a, b) => b.value - a.value).slice(0, 6),
      topCountries: mergeBreakdowns(rows.flatMap((row) => row.insights.countries)).slice(0, 6),
    };
  }, [activeSites, siteInsightsQueries, siteStatsQueries]);
  const selectedSite = sites.find((site) => site.id === selectedId) ?? sites[0] ?? null;
  const statsQuery = useQuery({
    queryKey: ["analytics", "stats", selectedSite?.id],
    queryFn: () => getAnalyticsSiteStats(selectedSite!.id),
    enabled: Boolean(selectedSite),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!selectedId && sites[0]) setSelectedId(sites[0].id);
  }, [selectedId, sites]);

  const createMutation = useMutation({
    mutationFn: () => createAnalyticsSite({ name: siteName, domain }, `dashboard-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    onSuccess: async ({ site }) => {
      setSelectedId(site.id);
      setSiteName("");
      setDomain("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["analytics", "sites"] });
    },
    onError: (mutationError) => setError(formatDashboardApiError(mutationError instanceof Error ? mutationError : {}, "analytics")),
  });

  const provisionMutation = useMutation({
    mutationFn: () => provisionAnalyticsSite(selectedSite!.id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (mutationError) => setError(formatDashboardApiError(mutationError instanceof Error ? mutationError : {}, "analytics")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAnalyticsSite(selectedSite!.id),
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (mutationError) => setError(formatDashboardApiError(mutationError instanceof Error ? mutationError : {}, "analytics")),
  });

  const trackerTag = useMemo(() => {
    if (!selectedSite) return "";
    const trackerUrl = `${DASHBOARD_API_URL.replace(/\/$/, "")}/api/v1/analytics/tracker.js?site=${encodeURIComponent(selectedSite.id)}`;
    return `<script defer src="${trackerUrl}" data-site="${selectedSite.id}"></script>`;
  }, [selectedSite]);

  async function copyTag() {
    await navigator.clipboard.writeText(trackerTag);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function verifyAnalyticsPipeline(site: AnalyticsSite, openSignalRoom = false) {
    setPipelineCheck({ siteId: site.id, state: "checking", message: "Checking the tag, latest event, and signal room…" });
    setError(null);

    try {
      const [statsResult] = await Promise.all([
        statsQuery.refetch(),
        // Cache the same query the signal room uses so opening it does not
        // repeat an expensive insights request after a successful preflight.
        queryClient.fetchQuery({
          queryKey: ["analytics", "insights", site.id, 30],
          queryFn: () => getAnalyticsSiteInsights(site.id, 30),
          staleTime: 15_000,
        }),
      ]);
      const received = Boolean(statsResult.data?.lastEventAt);
      setPipelineCheck({
        siteId: site.id,
        state: "ready",
        message: received
          ? `Tag verified: an approved event arrived ${new Date(statsResult.data!.lastEventAt!).toLocaleString()}.`
          : "Signal room is ready. Open your site once to send the first approved pageview.",
      });
      if (openSignalRoom) router.push(`/analytics/${site.id}`);
    } catch (caught) {
      const message = formatDashboardApiError(caught instanceof Error ? caught : {}, "analytics");
      setPipelineCheck({ siteId: site.id, state: "error", message });
      setError(message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(6,182,212,.18),transparent_38%),linear-gradient(135deg,#0f172a,#111827)] p-7 text-white shadow-xl sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-cyan-300">CIG Analytics</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your analytics workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Create a site, install one branded tag, and watch verified traffic arrive without exposing the analytics provider.</p>
          </div>
          <a className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10" href="https://docs.umami.is/docs/tracker-configuration" target="_blank" rel="noreferrer">
            Tracker docs <ExternalLink className="size-3.5" />
          </a>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

      {sitesQuery.isError && !error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
        <p>{formatDashboardApiError(sitesQuery.error instanceof Error ? sitesQuery.error : {}, "analytics")}</p>
        <button type="button" onClick={() => void sitesQuery.refetch()} className="mt-2 font-semibold underline underline-offset-2">Retry loading analytics</button>
      </div>}

      {activeSites.length > 0 && <section className="rounded-2xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,.10),transparent_42%),var(--cig-bg-card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-600 dark:text-cyan-300">Workspace summary</p>
            <h2 className="mt-1 text-xl font-semibold text-cig-primary">All sites, one signal</h2>
            <p className="mt-1 text-sm text-cig-secondary">Combined 30-day performance across your {activeSites.length} active {activeSites.length === 1 ? "site" : "sites"}.</p>
          </div>
          {workspaceSummary.loading && <span className="inline-flex items-center gap-2 text-xs text-cig-muted"><Loader2 className="size-3.5 animate-spin" />Refreshing summary</span>}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <Metric label="Pageviews" value={formatNumber(workspaceSummary.pageviews)} />
          <Metric label="Visitors" value={formatNumber(workspaceSummary.visitors)} />
          <Metric label="Visits" value={formatNumber(workspaceSummary.visits)} />
          <Metric label="Events" value={formatNumber(workspaceSummary.events)} />
          <Metric label="Accepted" value={formatNumber(workspaceSummary.accepted)} />
          <Metric label="Pages tracked" value={formatNumber(workspaceSummary.pagesTracked)} />
          <Metric label="Live now" value={formatNumber(workspaceSummary.liveVisitors)} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)]">
          <div className="rounded-xl border border-cig bg-cig-card p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-cig-primary">Most visited pages</h3><span className="text-[10px] uppercase tracking-[.16em] text-cig-muted">all sites</span></div>
            <div className="mt-3 space-y-2">{workspaceSummary.topPages.length ? workspaceSummary.topPages.map((page, index) => <div key={`${page.site}-${page.label}`} className="flex items-center gap-3 text-xs"><span className="w-4 text-cig-muted">{index + 1}</span><span className="min-w-0 flex-1 truncate text-cig-secondary" title={`${page.label} · ${page.site}`}>{page.label}<span className="ml-2 text-[10px] text-cig-muted">{page.site}</span></span><span className="font-semibold text-cig-primary">{formatNumber(page.value)}</span></div>) : <p className="text-xs text-cig-muted">Page rankings appear after the first verified pageview.</p>}</div>
          </div>
          <div className="rounded-xl border border-cig bg-cig-card p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-cig-primary">Audience countries</h3><span className="text-[10px] uppercase tracking-[.16em] text-cig-muted">30 days</span></div>
            <div className="mt-3 space-y-2">{workspaceSummary.topCountries.length ? workspaceSummary.topCountries.map((country) => <div key={country.label} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-cig-secondary">{country.label}</span><span className="font-semibold text-cig-primary">{formatNumber(country.value)}</span></div>) : <p className="text-xs text-cig-muted">Country data appears when geo-enriched events arrive.</p>}</div>
          </div>
        </div>
        {workspaceSummary.failed > 0 && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Some site metrics could not be refreshed; totals include the sites that responded.</p>}
      </section>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-cig-primary">Sites</h2>
              <p className="text-sm text-cig-secondary">Each site has its own approved collection domain.</p>
            </div>
            <button type="button" onClick={() => sitesQuery.refetch()} className="rounded-lg border border-cig p-2 text-cig-secondary hover:text-cig-primary" aria-label="Refresh sites"><RefreshCw className="size-4" /></button>
          </div>

          {sitesQuery.isLoading ? <div className="rounded-xl border border-cig bg-cig-card p-8 text-sm text-cig-muted">Loading your sites…</div> : sitesQuery.isError ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-8 text-sm text-red-600 dark:text-red-300">Analytics sites could not be loaded. Use the retry action above after the API deployment is available.</div>
          ) : sites.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cyan-400/40 bg-cig-card p-8">
              <h3 className="text-base font-semibold text-cig-primary">Start tracking in under a minute</h3>
              <p className="mt-2 max-w-xl text-sm text-cig-secondary">Create your first website on the right. We’ll issue an opaque site ID, provision the analytics backend, and generate a ready-to-paste tag.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => <button type="button" key={site.id} onClick={() => setSelectedId(site.id)} className={`w-full rounded-xl border bg-cig-card p-4 text-left transition ${selectedSite?.id === site.id ? "border-cyan-400/60 shadow-sm" : "border-cig hover:border-cyan-400/30"}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-cig-primary">{site.name}</p><p className="mt-1 text-xs text-cig-muted">{site.domain}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${statusClass(site.status)}`}>{site.status}</span></div>
                {site.status === "failed" && site.provisioningError && <p className="mt-3 text-xs text-red-600 dark:text-red-300">Provisioning needs a retry ({site.provisioningError}).</p>}
              </button>)}
            </div>
          )}

          {selectedSite && selectedSite.status === "active" && (
            <div className="space-y-3">
              {statsQuery.isError && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-300">{formatDashboardApiError(statsQuery.error instanceof Error ? statsQuery.error : {}, "analytics")}</div>}
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Pageviews (30d)" value={formatNumber(statsQuery.data?.totals.pageviews ?? 0)} />
                <Metric label="Events (30d)" value={formatNumber(statsQuery.data?.totals.events ?? 0)} />
                <Metric label="Accepted" value={formatNumber(statsQuery.data?.totals.accepted ?? 0)} />
              </div>
              <div className="rounded-xl border border-cig bg-cig-card px-4 py-3 text-xs text-cig-secondary">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-cig-primary">Connection check</p>
                    <p className="mt-1">{statsQuery.data?.lastEventAt ? `Last event ${new Date(statsQuery.data.lastEventAt).toLocaleString()}` : "Waiting for the first approved-origin event"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => void verifyAnalyticsPipeline(selectedSite)} disabled={pipelineCheck?.siteId === selectedSite.id && pipelineCheck.state === "checking"} className="font-semibold text-cyan-600 hover:text-cyan-500 disabled:opacity-60 dark:text-cyan-300">Verify tag</button>
                    <button type="button" onClick={() => void verifyAnalyticsPipeline(selectedSite, true)} disabled={pipelineCheck?.siteId === selectedSite.id && pipelineCheck.state === "checking"} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">{pipelineCheck?.siteId === selectedSite.id && pipelineCheck.state === "checking" && <Loader2 className="size-3.5 animate-spin" />}Open signal room</button>
                  </div>
                </div>
                <ol className="mt-3 grid gap-2 border-t border-cig pt-3 sm:grid-cols-3">
                  <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" />Tracker active</li>
                  <li className="flex items-center gap-2"><Check className={`size-3.5 ${statsQuery.data?.lastEventAt ? "text-emerald-500" : "text-cig-muted"}`} />{statsQuery.data?.lastEventAt ? "Event received" : "Awaiting event"}</li>
                  <li className="flex items-center gap-2"><Check className={`size-3.5 ${pipelineCheck?.siteId === selectedSite.id && pipelineCheck.state === "ready" ? "text-emerald-500" : pipelineCheck?.siteId === selectedSite.id && pipelineCheck.state === "error" ? "text-red-500" : "text-cig-muted"}`} />{pipelineCheck?.siteId === selectedSite.id && pipelineCheck.state === "ready" ? "Room ready" : "Room check"}</li>
                </ol>
                {pipelineCheck?.siteId === selectedSite.id && <p role="status" className={`mt-3 ${pipelineCheck.state === "error" ? "text-red-600 dark:text-red-300" : "text-cig-secondary"}`}>{pipelineCheck.message}</p>}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-cig bg-cig-card p-5">
            <h2 className="text-base font-semibold text-cig-primary">Add a website</h2>
            <p className="mt-1 text-xs text-cig-secondary">The domain is enforced at collection time.</p>
            <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
              <label className="block text-xs font-semibold text-cig-secondary">Website name<input required value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Marketing site" className="mt-1.5 w-full rounded-lg border border-cig bg-transparent px-3 py-2 text-sm text-cig-primary outline-none focus:border-cyan-400" /></label>
              <label className="block text-xs font-semibold text-cig-secondary">Approved domain<input required value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" className="mt-1.5 w-full rounded-lg border border-cig bg-transparent px-3 py-2 text-sm text-cig-primary outline-none focus:border-cyan-400" /></label>
              <button type="submit" disabled={createMutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">{createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Create site</button>
            </form>
          </div>

          {selectedSite && selectedSite.status === "active" && <div className="rounded-xl border border-cig bg-cig-card p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-cig-primary">Install the tracker</h2><p className="mt-1 text-xs text-cig-secondary">Paste this in your site’s <code>&lt;head&gt;</code>.</p></div><button type="button" onClick={copyTag} className="inline-flex items-center gap-1 rounded-lg border border-cig px-2.5 py-1.5 text-xs font-semibold text-cig-secondary hover:text-cig-primary">{copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}{copied ? "Copied" : "Copy"}</button></div>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-cyan-200">{trackerTag}</pre>
            <div className="mt-4 space-y-2 text-xs text-cig-secondary"><p><strong className="text-cig-primary">HTML:</strong> add the tag before <code>&lt;/head&gt;</code>.</p><p><strong className="text-cig-primary">Google Tag Manager:</strong> create a Custom HTML tag, paste the same snippet, and trigger it on All Pages.</p><p>Events are counted after the first approved-origin pageview. No provider identifier is placed in this tag.</p></div>
          </div>}

          {selectedSite && selectedSite.status === "failed" && <button type="button" onClick={() => provisionMutation.mutate()} disabled={provisionMutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/40 px-3 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300 disabled:opacity-60">{provisionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Retry provisioning</button>}
          {selectedSite && selectedSite.status !== "deleted" && <button type="button" onClick={() => { if (window.confirm("Remove this site and stop collection?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-60"><Trash2 className="size-3.5" />Remove selected site</button>}
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-cig bg-cig-card p-4"><p className="text-[11px] uppercase tracking-wide text-cig-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-cig-primary">{value}</p></div>;
}
