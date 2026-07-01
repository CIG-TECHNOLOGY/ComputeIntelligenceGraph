"use client";

import { useAppStore } from "../lib/store";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useTranslation } from "@cig-technology/i18n/react";
import { NotificationBell } from "./NotificationBell";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { getBrowserAccessToken } from "../lib/cigClient";
import { getPendingDeviceRequests, type DeviceAuthResponse } from "../lib/api";

export function Header() {
  const { toggleSidebar, theme } = useAppStore();
  const t = useTranslation();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const { data } = useQuery<DeviceAuthResponse>({
    queryKey: ["device-auth", "pending"],
    queryFn: getPendingDeviceRequests,
    refetchInterval: (query) => (query.state.error ? false : 5_000),
    retry: false,
    enabled: typeof window !== "undefined" && Boolean(getBrowserAccessToken()),
  });

  const activeRequests = (data?.items ?? []).filter(
    (req) => new Date(req.expires_at).getTime() > Date.now()
  );
  const pendingCount = activeRequests.length;

  return (
    <header className="flex h-12 min-w-0 items-center justify-between border-b border-cig bg-cig-card px-3 sm:px-4">
      {/* Mobile menu toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={t("header.toggleSidebar")}
        className="rounded-lg p-2 text-cig-muted hover:text-cig-secondary hover:bg-cig-hover transition-colors lg:hidden"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="hidden lg:block" />

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {pendingCount > 0 && (
          <Link
            href="/devices"
            className="relative rounded-lg p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title={t("header.pendingDeviceApprovals")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center size-4 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
              {pendingCount}
            </span>
          </Link>
        )}

        <NotificationBell />

        <LocaleSwitcher />

        {/* Settings link */}
        <Link
          href="/settings"
          aria-label={t("header.settings")}
          className="rounded-lg p-2 text-cig-muted hover:text-cig-secondary hover:bg-cig-hover transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
