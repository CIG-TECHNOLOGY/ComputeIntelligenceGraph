"use client";

import { useEffect, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslation } from "@cig-technology/i18n/react";
import { StatCard } from "../../components/StatCard";
import { getResourcesPaged, getDiscoveryStatus, PagedResources, DiscoveryStatus } from "../../lib/api";
import { buildAuthenticatedWebSocketUrl } from "../../lib/browserApi";
import { getBrowserAccessToken } from "../../lib/cigClient";
import { getPermanentAnalyticsAlias } from "../../lib/analyticsAlias";
const RESOURCE_TYPES = ["compute", "storage", "network", "database"] as const;
const PROVIDERS = ["aws", "gcp", "kubernetes", "docker"] as const;
const TYPE_COLORS: Record<string, string> = { compute: "#06b6d4", storage: "#3b82f6", network: "#a855f7", database: "#10b981" };
const PROVIDER_COLORS: Record<string, string> = { aws: "#f59e0b", gcp: "#3b82f6", kubernetes: "#06b6d4", docker: "#8b5cf6" };

function fmt(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleString();
}

export default function OverviewPage() {
  const t = useTranslation();
  const router = useRouter();
  const [permanentAlias, setPermanentAlias] = useState<string | null>(null);
  const permanentHostAlias = typeof window === "undefined" ? null : getPermanentAnalyticsAlias(window.location.hostname);
  const queryClient = useQueryClient();
  const wsUrl = permanentHostAlias ? null : buildAuthenticatedWebSocketUrl();
  const { data: totalData, isLoading: totalLoading } = useQuery<PagedResources>({ queryKey: ["resources", "total"], queryFn: () => getResourcesPaged("limit=1"), enabled: !permanentHostAlias });
  const typeQueries = useQueries({
    queries: RESOURCE_TYPES.map((type) => ({
      queryKey: ["resources", "type", type],
      queryFn: () => getResourcesPaged(`limit=1&type=${type}`),
      enabled: !permanentHostAlias,
    })),
  });
  const providerQueries = useQueries({
    queries: PROVIDERS.map((provider) => ({
      queryKey: ["resources", "provider", provider],
      queryFn: () => getResourcesPaged(`limit=1&provider=${provider}`),
      enabled: !permanentHostAlias,
    })),
  });
  const { data: inactiveData, isLoading: inactiveLoading } = useQuery<PagedResources>({ queryKey: ["resources", "state", "inactive"], queryFn: () => getResourcesPaged("limit=1&state=inactive"), enabled: !permanentHostAlias });
  const { data: discoveryData, isLoading: discoveryLoading } = useQuery<DiscoveryStatus>({
    queryKey: ["discovery", "status"],
    queryFn: getDiscoveryStatus,
    retry: false,
    refetchInterval: (query) => (query.state.error ? false : 30_000),
    enabled: !permanentHostAlias && Boolean(getBrowserAccessToken()),
  });

  // Some ingress configurations terminate TLS before Next.js and lose the
  // original host before middleware runs. Keep permanent analytics hosts from
  // ever falling through to the authenticated Overview page in that case.
  useEffect(() => {
    if (!permanentHostAlias) return;
    setPermanentAlias(permanentHostAlias);
    router.replace(`/analytics/alias/${encodeURIComponent(permanentHostAlias)}`);
  }, [permanentHostAlias, router]);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const socketUrl = wsUrl;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    function connect() {
      ws = new WebSocket(socketUrl);
      ws.onmessage = (event) => { try { const msg = JSON.parse(event.data as string) as { type: string }; if (msg.type === "resource_updated" || msg.type === "discovery_complete") { queryClient.invalidateQueries({ queryKey: ["resources"] }); queryClient.invalidateQueries({ queryKey: ["discovery"] }); } } catch {} };
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5_000); };
      ws.onerror = () => { ws?.close(); };
    }
    connect();
    return () => { if (reconnectTimer) clearTimeout(reconnectTimer); ws?.close(); };
  }, [queryClient, wsUrl]);

  const { data: regionSampleData } = useQuery<PagedResources>({ queryKey: ["resources", "region-sample"], queryFn: () => getResourcesPaged("limit=200"), enabled: !permanentHostAlias });
  const regionCounts = regionSampleData?.items.reduce<Record<string, number>>((acc, r) => { const region = r.region ?? "unknown"; acc[region] = (acc[region] ?? 0) + 1; return acc; }, {});

  if (permanentAlias) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm text-cig-muted">
        Loading signal room for <span className="ml-1 font-mono">{permanentAlias}</span>…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cig-primary">{t("overview.title")}</h1>
        <p className="mt-1 text-sm text-cig-secondary">{t("overview.subtitle")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-cig-muted">{t("overview.totalResources")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t("overview.allResources")} value={totalData?.total ?? 0} loading={totalLoading} color="#06b6d4" />
          <StatCard label={t("overview.inactive")} value={inactiveData?.total ?? 0} loading={inactiveLoading} sub={t("overview.stoppedTerminated")} color="#ef4444" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-cig-muted">{t("overview.byType")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RESOURCE_TYPES.map((type, index) => (
            <StatCard key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} value={typeQueries[index]?.data?.total ?? 0} loading={typeQueries[index]?.isLoading ?? false} color={TYPE_COLORS[type]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-cig-muted">{t("overview.byProvider")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROVIDERS.map((provider, index) => (
            <StatCard key={provider} label={provider.toUpperCase()} value={providerQueries[index]?.data?.total ?? 0} loading={providerQueries[index]?.isLoading ?? false} color={PROVIDER_COLORS[provider]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-cig-muted">{t("overview.byRegion")}</h2>
        {!regionCounts || Object.keys(regionCounts).length === 0 ? (
          <p className="text-sm text-cig-muted">{t("overview.noRegionData")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
              <StatCard key={region} label={region} value={count} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-cig-muted">{t("overview.discovery")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t("overview.status")} value={discoveryLoading ? "\u2026" : discoveryData?.running ? t("overview.running") : t("overview.idle")} loading={discoveryLoading} color="#10b981" />
          <StatCard label={t("overview.lastRun")} value={fmt(discoveryData?.lastRun ?? null)} loading={discoveryLoading} />
          <StatCard label={t("overview.nextRun")} value={fmt(discoveryData?.nextRun ?? null)} loading={discoveryLoading} />
        </div>
      </section>
    </div>
  );
}
