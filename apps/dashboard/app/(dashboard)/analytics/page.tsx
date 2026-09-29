"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clipboard, ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { AnalyticsSite } from "@cig/sdk";
import {
  createAnalyticsSite,
  deleteAnalyticsSite,
  getAnalyticsSiteStats,
  listAnalyticsSites,
  provisionAnalyticsSite,
} from "../../../lib/api";
import { DASHBOARD_API_URL } from "../../../lib/cigClient";

function statusClass(status: AnalyticsSite["status"]): string {
  if (status === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "failed") return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "deleted") return "bg-slate-500/10 text-slate-500";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ["analytics", "sites"], queryFn: listAnalyticsSites });
  const sites = useMemo(() => sitesQuery.data?.items ?? [], [sitesQuery.data?.items]);
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
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to create site"),
  });

  const provisionMutation = useMutation({
    mutationFn: () => provisionAnalyticsSite(selectedSite!.id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to provision site"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAnalyticsSite(selectedSite!.id),
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to delete site"),
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-cig-primary">Sites</h2>
              <p className="text-sm text-cig-secondary">Each site has its own approved collection domain.</p>
            </div>
            <button type="button" onClick={() => sitesQuery.refetch()} className="rounded-lg border border-cig p-2 text-cig-secondary hover:text-cig-primary" aria-label="Refresh sites"><RefreshCw className="size-4" /></button>
          </div>

          {sitesQuery.isLoading ? <div className="rounded-xl border border-cig bg-cig-card p-8 text-sm text-cig-muted">Loading your sites…</div> : sites.length === 0 ? (
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
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Pageviews (30d)" value={formatNumber(statsQuery.data?.totals.pageviews ?? 0)} />
                <Metric label="Events (30d)" value={formatNumber(statsQuery.data?.totals.events ?? 0)} />
                <Metric label="Accepted" value={formatNumber(statsQuery.data?.totals.accepted ?? 0)} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cig bg-cig-card px-4 py-3 text-xs text-cig-secondary">
                <span>{statsQuery.data?.lastEventAt ? `Last event ${new Date(statsQuery.data.lastEventAt).toLocaleString()}` : "Waiting for the first approved-origin event"}</span>
                <button type="button" onClick={() => statsQuery.refetch()} className="font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300">Verify latest event</button>
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
