"use client";

import { getSupabaseClient } from "@cig/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { useEffect, useState, type ReactNode } from "react";
import { I18nProvider, useLocale } from "@cig-technology/i18n/react";
import { LOCALE_META, type SupportedLocale } from "@cig-technology/i18n";
import { initI18n } from "./i18n";
import { dataProvider } from "../lib/dataProvider";
import { authProvider } from "../lib/authProvider";
import { syncSupabaseSessionToBrowserStorage } from "../lib/cigClient";
import { NotificationProvider } from "../components/NotificationBell";

const resources = [
  { name: "overview",  list: "/" },
  { name: "resources", list: "/resources", show: "/resources/:id" },
  { name: "graph",     list: "/graph" },
  { name: "costs",     list: "/costs" },
  { name: "security",  list: "/security" },
  { name: "analytics", list: "/analytics" },
  { name: "settings",  list: "/settings" },
  { name: "profile",   list: "/profile" },
  // GPU Compute resources
  { name: "gpu-sessions", list: "/gpu", show: "/gpu/sessions/:id" },
  { name: "gpu-health",   list: "/gpu/health" },
  { name: "gpu-logs",     list: "/gpu/logs" },
  { name: "gpu-config",   list: "/gpu/config" },
  { name: "gpu-activity", list: "/gpu/activity" },
];

function LocaleSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }, [locale]);

  return null;
}

function DashboardSessionSync() {
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        syncSupabaseSessionToBrowserStorage(session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSupabaseSessionToBrowserStorage(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: SupportedLocale;
}) {
  initI18n(initialLocale);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      })
  );

  return (
    <I18nProvider>
      <LocaleSync />
      <DashboardSessionSync />
      <QueryClientProvider client={queryClient}>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerProvider}
          resources={resources}
          options={{ disableTelemetry: true, projectId: "cig-dashboard" }}
        >
          <NotificationProvider />
          {children}
        </Refine>
      </QueryClientProvider>
    </I18nProvider>
  );
}
