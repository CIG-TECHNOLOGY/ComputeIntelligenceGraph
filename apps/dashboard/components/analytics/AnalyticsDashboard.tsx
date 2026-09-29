"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, Globe2, Link2, Loader2, LockKeyhole, Radio, RotateCw, Share2, Users } from "lucide-react";
import type { AnalyticsBreakdown, AnalyticsInsights, AnalyticsSite } from "@cig/sdk";
import {
  getAnalyticsSiteInsights,
  getPublicAnalyticsView,
  setAnalyticsPublicAccess,
} from "../../lib/api";

type Props = { siteId?: string; publicToken?: string };

const formatNumber = (value: number) => new Intl.NumberFormat().format(Math.max(0, Math.round(value)));
const formatDuration = (seconds: number) => {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)}s`;
};

export function AnalyticsDashboard({ siteId, publicToken }: Props) {
  const [days, setDays] = useState(30);
  const [copied, setCopied] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const isPublic = Boolean(publicToken);
  const insightsQuery = useQuery({
    queryKey: ["analytics", "insights", siteId ?? publicToken, days],
    queryFn: () => publicToken ? getPublicAnalyticsView(publicToken, days) : getAnalyticsSiteInsights(siteId!, days),
    enabled: Boolean(publicToken || siteId),
    refetchInterval: 30_000,
  });
  const publicLinkStorageKey = siteId ? `cig.analytics.public-link.${siteId}` : null;
  useEffect(() => {
    if (!publicLinkStorageKey) return;
    try {
      const stored = window.localStorage.getItem(publicLinkStorageKey);
      if (stored) setPublicLink(stored);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }, [publicLinkStorageKey]);
  const shareMutation = useMutation({
    mutationFn: ({ enabled, paused, rotate }: { enabled: boolean; paused?: boolean; rotate?: boolean }) => setAnalyticsPublicAccess(siteId!, enabled, paused, rotate),
    onSuccess: async (result) => {
      if (result.publicAccess.url) {
        const nextLink = new URL(result.publicAccess.url, window.location.origin).toString();
        setPublicLink(nextLink);
        if (publicLinkStorageKey) {
          try {
            window.localStorage.setItem(publicLinkStorageKey, nextLink);
          } catch {
            // Storage can be unavailable in privacy-restricted browsers.
          }
        }
      } else if (!result.publicAccess.enabled) {
        setPublicLink(null);
        if (publicLinkStorageKey) {
          try {
            window.localStorage.removeItem(publicLinkStorageKey);
          } catch {
            // Storage can be unavailable in privacy-restricted browsers.
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["analytics", "sites"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "insights", siteId] });
    },
  });

  const payload = insightsQuery.data;
  const site = payload?.site;
  const insights = payload?.insights;

  function goBackToAnalytics() {
    if (isPublic && typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/analytics");
  }

  async function copyPublicLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (insightsQuery.isLoading) {
    return <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center text-sm text-cig-muted"><Loader2 className="mr-2 size-4 animate-spin" />Loading your signal layer…</div>;
  }

  if (insightsQuery.isError || !site || !insights) {
    const reason = insightsQuery.error instanceof Error ? insightsQuery.error.message : "The request did not return analytics data.";
    const underMaintenance = reason.toLowerCase().includes("under maintenance");
    return <div className={`mx-auto max-w-3xl rounded-2xl border p-6 text-sm ${underMaintenance ? "border-amber-400/30 bg-amber-500/10 text-amber-800 dark:text-amber-100" : "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-200"}`}><p className="font-semibold">{underMaintenance ? "This public signal room is under maintenance." : "This signal room is unavailable."}</p><p className="mt-2">{underMaintenance ? "The owner paused this read-only link. Try again after the link is resumed." : "The tracker can be active while the analytics API is still missing the signal-room route or the link has been revoked."}</p><p className="mt-2 font-mono text-xs opacity-80">{reason}</p><button type="button" onClick={() => insightsQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-current/30 px-3 py-2 text-xs font-semibold hover:bg-current/10"><RotateCw className="size-3.5" />Try again</button></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-cyan-400/20 bg-[#081522] px-6 py-7 text-white shadow-[0_24px_70px_rgba(8,47,73,.24)] sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <button type="button" onClick={goBackToAnalytics} className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[.05] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10" aria-label="Back to analytics sites"><ArrowLeft className="size-3.5" />Back to Analytics</button>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.28em] text-cyan-300"><span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]" />CIG signal room</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">{site.name}</h1>
            <p className="mt-2 text-sm text-slate-300">{site.domain} · {isPublic ? "read-only public view" : "private workspace"}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-xs text-slate-200">
            {isPublic ? <Globe2 className="size-3.5 text-cyan-300" /> : <LockKeyhole className="size-3.5 text-cyan-300" />}
            {isPublic ? "Public link" : "Authenticated"}
            <span className="mx-1 size-1 rounded-full bg-slate-500" />
            <span className="text-emerald-300">{insights.source === "umami" ? "Umami live" : "Control-plane data"}</span>
          </div>
        </div>
        <div className="relative mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2"><Radio className="size-3.5 text-emerald-300" />Updated {new Date(insights.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <button
              type="button"
              onClick={() => void insightsQuery.refetch()}
              disabled={insightsQuery.isFetching}
              aria-label="Refresh analytics"
              title="Refresh analytics"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[.05] px-2 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            >
              <RotateCw className={`size-3.5 ${insightsQuery.isFetching ? "animate-spin" : ""}`} />
              {insightsQuery.isFetching ? "Refreshing" : "Refresh"}
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[.05] p-1">
            {[7, 30, 90].map((option) => <button key={option} type="button" onClick={() => setDays(option)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${days === option ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>{option}d</button>)}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Pageviews" value={formatNumber(insights.totals.pageviews)} detail={`last ${days} days`} accent="cyan" />
        <Kpi label="Unique visitors" value={formatNumber(insights.totals.visitors)} detail={`${formatNumber(insights.totals.visits)} visits`} accent="orange" />
        <Kpi label="Live right now" value={formatNumber(insights.realtime.visitors)} detail="rolling realtime window" accent="emerald" live />
        <Kpi label="Avg. visit time" value={formatDuration(insights.totals.visits ? insights.totals.totaltime / insights.totals.visits : 0)} detail={`${formatNumber(insights.totals.bounces)} bounces`} accent="violet" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.9fr)]">
        <div className="rounded-2xl border border-cig bg-cig-card p-5 sm:p-6">
          <SectionHeading icon={<Radio className="size-4" />} eyebrow="Traffic pulse" title="A quiet view of momentum" detail="Pageviews across the selected window" />
          <TrafficChart series={insights.series} />
        </div>
        <RealtimePanel realtime={insights.realtime} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <WorldMap countries={insights.countries} realtimeCountries={insights.realtime.countries} />
        <BreakdownCard title="Most visited paths" icon={<Link2 className="size-4" />} items={insights.pages} empty="Pages appear after the first verified pageview." />
      </section>

      {!isPublic && siteId && <section className="rounded-2xl border border-cig bg-cig-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-3"><div className="mt-0.5 rounded-xl bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-300"><Share2 className="size-4" /></div><div><h2 className="font-semibold text-cig-primary">Share this signal room</h2><p className="mt-1 max-w-xl text-sm text-cig-secondary">Create a read-only link with the map, traffic pulse, pages, and realtime panel. Anyone with the link can view it; they cannot change your tracker.</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={shareMutation.isPending} onClick={() => shareMutation.mutate({ enabled: true, paused: false, rotate: true })} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">{shareMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}{site.publicAccess?.enabled ? "Rotate public link" : "Create public link"}</button>
            {site.publicAccess?.enabled && <button type="button" disabled={shareMutation.isPending} onClick={() => shareMutation.mutate({ enabled: true, paused: !site.publicAccess?.paused })} className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-3.5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-400/10 dark:text-amber-200 disabled:opacity-60">{site.publicAccess.paused ? "Resume public link" : "Put under maintenance"}</button>}
          </div>
        </div>
        {publicLink && <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3"><code className="min-w-0 flex-1 truncate text-xs text-cyan-700 dark:text-cyan-200">{publicLink}</code><button type="button" onClick={copyPublicLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cig px-2.5 py-1.5 text-xs font-semibold text-cig-secondary hover:text-cig-primary">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy link"}</button><a href={publicLink} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cig px-2.5 py-1.5 text-xs font-semibold text-cig-secondary hover:text-cig-primary">Open <ExternalLink className="size-3.5" /></a><button type="button" onClick={() => shareMutation.mutate({ enabled: false })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10">Revoke</button></div>}
      </section>}
    </div>
  );
}

function Kpi({ label, value, detail, accent, live }: { label: string; value: string; detail: string; accent: string; live?: boolean }) {
  const accentClass = ({ cyan: "bg-cyan-400/70", orange: "bg-orange-400/70", emerald: "bg-emerald-400/70", violet: "bg-violet-400/70" } as Record<string, string>)[accent] ?? "bg-cyan-400/70";
  return <div className="relative overflow-hidden rounded-2xl border border-cig bg-cig-card p-5"><div className={`absolute inset-x-0 top-0 h-px ${accentClass}`} /><div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-cig-muted">{label}</p>{live && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500"><span className="size-1.5 rounded-full bg-emerald-400" />Live</span>}</div><p className="mt-3 text-3xl font-semibold tracking-tight text-cig-primary">{value}</p><p className="mt-1 text-xs text-cig-secondary">{detail}</p></div>;
}

function SectionHeading({ icon, eyebrow, title, detail }: { icon: React.ReactNode; eyebrow: string; title: string; detail: string }) {
  return <div className="flex items-start gap-3"><div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-300">{icon}</div><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cig-muted">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-cig-primary">{title}</h2><p className="mt-1 text-xs text-cig-secondary">{detail}</p></div></div>;
}

function TrafficChart({ series }: { series: AnalyticsInsights["series"] }) {
  const points = useMemo(() => {
    const values = series.map((point) => point.pageviews);
    const max = Math.max(...values, 1);
    return series.map((point, index) => ({ ...point, x: series.length === 1 ? 50 : (index / (series.length - 1)) * 100, y: 100 - (point.pageviews / max) * 82 }));
  }, [series]);
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  return <div className="mt-7"><div className="relative h-56 overflow-hidden rounded-xl bg-[linear-gradient(180deg,rgba(6,182,212,.08),transparent)]"><div className="absolute inset-0 flex flex-col justify-between py-3"><span className="border-t border-dashed border-cig" /><span className="border-t border-dashed border-cig" /><span className="border-t border-dashed border-cig" /><span className="border-t border-dashed border-cig" /></div>{points.length ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full px-1 py-3" aria-label="Pageviews chart"><defs><linearGradient id="traffic-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".32" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs><path d={`${path} L 100 100 L 0 100 Z`} fill="url(#traffic-fill)" /><path d={path} fill="none" stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg> : <div className="flex h-full items-center justify-center text-xs text-cig-muted">Waiting for the first event</div>}</div><div className="mt-3 flex justify-between text-[10px] text-cig-muted"><span>{series[0]?.date ?? "—"}</span><span>{series.at(-1)?.date ?? "—"}</span></div></div>;
}

function RealtimePanel({ realtime }: { realtime: AnalyticsInsights["realtime"] }) {
  return <div className="rounded-2xl border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.12),transparent_42%),var(--cig-bg-card)] p-5 sm:p-6"><SectionHeading icon={<Users className="size-4" />} eyebrow="Realtime" title={`${formatNumber(realtime.visitors)} visitors right now`} detail="Refreshes automatically every 30 seconds" /><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-1"><MiniList title="Live countries" items={realtime.countries} empty="No active visitors yet." /><MiniList title="Live paths" items={realtime.pages} empty="No active paths yet." /></div></div>;
}

function MiniList({ title, items, empty }: { title: string; items: AnalyticsBreakdown[]; empty: string }) {
  return <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-cig-primary">{title}</p><span className="text-[10px] text-cig-muted">live</span></div>{items.length ? <div className="space-y-2">{items.slice(0, 4).map((item) => <div key={`${title}-${item.label}`} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-cig-secondary">{item.label}</span><span className="font-semibold text-cig-primary">{formatNumber(item.value)}</span></div>)}</div> : <p className="text-xs text-cig-muted">{empty}</p>}</div>;
}

const COUNTRY_POINTS: Record<string, [number, number]> = {
  US: [23, 35], CA: [22, 21], MX: [25, 47], GT: [28, 52], CO: [29, 57], BR: [36, 68], PE: [31, 64], CL: [32, 78], AR: [34, 82],
  GB: [49, 27], IE: [47, 27], FR: [51, 35], ES: [49, 41], PT: [47, 41], DE: [54, 30], IT: [55, 40], NL: [53, 27],
  NG: [51, 60], EG: [57, 48], KE: [58, 67], ZA: [55, 79], IN: [69, 54], PK: [66, 50], CN: [77, 42], JP: [87, 46], KR: [84, 43],
  SG: [76, 67], AU: [84, 82], NZ: [91, 88],
};

const COUNTRY_ALIASES: Record<string, string> = {
  "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", "USA": "US", "UNITED KINGDOM": "GB", "GREAT BRITAIN": "GB",
  CANADA: "CA", MEXICO: "MX", COLOMBIA: "CO", BRAZIL: "BR", ARGENTINA: "AR", CHILE: "CL", PERU: "PE", FRANCE: "FR", GERMANY: "DE",
  SPAIN: "ES", ITALY: "IT", NETHERLANDS: "NL", NIGERIA: "NG", EGYPT: "EG", KENYA: "KE", "SOUTH AFRICA": "ZA", INDIA: "IN",
  PAKISTAN: "PK", CHINA: "CN", JAPAN: "JP", "SOUTH KOREA": "KR", SINGAPORE: "SG", AUSTRALIA: "AU", "NEW ZEALAND": "NZ",
};

function countryPoint(label: string): [number, number] {
  const normalized = label.trim().toUpperCase();
  const code = normalized.length === 2 ? normalized : COUNTRY_ALIASES[normalized];
  if (code && COUNTRY_POINTS[code]) return COUNTRY_POINTS[code];
  let hash = 0;
  for (const character of normalized) hash = (hash * 31 + character.charCodeAt(0)) % 10_000;
  return [12 + (hash % 76), 20 + ((hash * 17) % 62)];
}

function WorldMap({ countries, realtimeCountries }: { countries: AnalyticsBreakdown[]; realtimeCountries: AnalyticsBreakdown[] }) {
  const total = countries.reduce((sum, item) => sum + item.value, 0);
  const liveTotal = realtimeCountries.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...countries.map((item) => item.value), 1);
  const maxLiveValue = Math.max(...realtimeCountries.map((item) => item.value), 1);
  const hasSignals = countries.length > 0 || realtimeCountries.length > 0;
  return <div className="rounded-2xl border border-cig bg-cig-card p-5 sm:p-6">
    <SectionHeading icon={<Globe2 className="size-4" />} eyebrow="Audience geography" title="Where the signal is coming from" detail={liveTotal ? `${formatNumber(liveTotal)} live country signals · ${formatNumber(total)} mapped views` : total ? `${formatNumber(total)} mapped views · live pulses appear as visitors connect` : "Waiting for geo-enriched events from the tracker"} />
    <div className="mt-5 overflow-hidden rounded-xl border border-cig bg-[#07111d] p-2">
      <svg viewBox="0 0 100 100" className="h-64 w-full" role="img" aria-label="Realtime audience map">
        <defs>
          <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#7dd3fc" strokeOpacity=".08" strokeWidth=".2" /></pattern>
          <filter id="map-glow"><feGaussianBlur stdDeviation="1.8" /></filter>
        </defs>
        <rect width="100" height="100" fill="url(#map-grid)" />
        <path d="M8 25 17 16 29 18 36 30 30 41 22 44 20 55 14 51 11 39 4 36Z" fill="#164e63" fillOpacity=".42" />
        <path d="m32 51 8 5 5 10-6 14-5 13-5-14 2-12-5-9Z" fill="#164e63" fillOpacity=".42" />
        <path d="m45 23 12-5 8 4 2 11-8 4-3 11-6-4-4-10-6-5Z" fill="#164e63" fillOpacity=".42" />
        <path d="m59 39 9-4 11 5 8 10-7 9-8-2-7 5-4-10-8-4Z" fill="#164e63" fillOpacity=".42" />
        <path d="m77 72 12 3 5 8-10 7-12-4Z" fill="#164e63" fillOpacity=".42" />
        {countries.map((country) => {
          const [x, y] = countryPoint(country.label);
          const size = 1.1 + (country.value / maxValue) * 2.7;
          return <g key={`history-${country.label}`} opacity=".62"><circle cx={x} cy={y} r={size * 2} fill="#22d3ee" fillOpacity=".08" filter="url(#map-glow)" /><circle cx={x} cy={y} r={size} fill="#38bdf8" fillOpacity=".7" /><title>{country.label}: {formatNumber(country.value)} mapped views</title></g>;
        })}
        {realtimeCountries.map((country) => {
          const [x, y] = countryPoint(country.label);
          const size = 1.8 + (country.value / maxLiveValue) * 3.2;
          return <g key={`live-${country.label}`}><circle cx={x} cy={y} r={size * 2.4} fill="#22d3ee" fillOpacity=".11" filter="url(#map-glow)" /><circle cx={x} cy={y} r={size * 1.6} fill="none" stroke="#67e8f9" strokeOpacity=".45" strokeWidth=".45"><animate attributeName="r" values={`${size * 1.2};${size * 2.4};${size * 1.2}`} dur="2.2s" repeatCount="indefinite" /></circle><circle cx={x} cy={y} r={size} fill="#a5f3fc" stroke="#22d3ee" strokeWidth=".45" /><title>{country.label}: {formatNumber(country.value)} live visitors</title></g>;
        })}
        {!hasSignals && <text x="50" y="53" textAnchor="middle" fill="#94a3b8" fontSize="3.5">Waiting for the first geo-enriched event</text>}
      </svg>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[.14em] text-cig-muted"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-200 ring-2 ring-cyan-400/30" />Live now</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-400/70" />Selected range</span><span className="ml-auto normal-case tracking-normal">Country-level location only</span></div>
    <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">{[...realtimeCountries, ...countries.filter((country) => !realtimeCountries.some((live) => live.label === country.label))].slice(0, 6).map((country) => <div key={country.label} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-cig-secondary">{country.label}</span><span className="font-semibold text-cig-primary">{formatNumber(country.value)}</span></div>)}</div>
  </div>;
}

function BreakdownCard({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: AnalyticsBreakdown[]; empty: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return <div className="rounded-2xl border border-cig bg-cig-card p-5 sm:p-6"><SectionHeading icon={icon} eyebrow="Behavior" title={title} detail="The paths people explore most" /><div className="mt-6 space-y-4">{items.length ? items.slice(0, 7).map((item) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate text-cig-secondary">{item.label}</span><span className="font-semibold text-cig-primary">{formatNumber(item.value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-cig-elevated"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} /></div></div>) : <p className="text-sm text-cig-muted">{empty}</p>}</div></div>;
}
