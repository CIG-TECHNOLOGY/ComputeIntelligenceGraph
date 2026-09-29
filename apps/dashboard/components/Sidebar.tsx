"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@cig-technology/i18n/react";
import { Cpu, HeartPulse, ScrollText, Settings, Activity, BarChart3 } from "lucide-react";
import { useAppStore } from "../lib/store";
import { useResolvedLandingUrl, useResolvedDocsUrl } from "@cig/ui/siteUrl.client";
import { UserMenu } from "./UserMenu";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  external?: boolean;
}

const platformItems: NavItem[] = [
  { labelKey: "nav.overview",  href: "/",          icon: <HomeIcon />,      color: "#06b6d4" },
  { labelKey: "nav.resources", href: "/resources", icon: <ResourcesIcon />, color: "#3b82f6" },
  { labelKey: "nav.graph",     href: "/graph",     icon: <GraphIcon />,     color: "#8b5cf6" },
  { labelKey: "nav.costs",     href: "/costs",     icon: <CostsIcon />,     color: "#a855f7" },
  { labelKey: "nav.security",  href: "/security",  icon: <SecurityIcon />,  color: "#10b981" },
  { labelKey: "nav.analytics", href: "/analytics", icon: <BarChart3 className="size-4" />, color: "#06b6d4" },
];

const gpuComputeItems: NavItem[] = [
  { labelKey: "nav.gpu.sessions",  href: "/gpu",            icon: <Cpu className="size-4" />,         color: "#f59e0b" },
  { labelKey: "nav.gpu.health",    href: "/gpu/health",     icon: <HeartPulse className="size-4" />,  color: "#10b981" },
  { labelKey: "nav.gpu.logs",      href: "/gpu/logs",       icon: <ScrollText className="size-4" />,  color: "#8b5cf6" },
  { labelKey: "nav.gpu.config",    href: "/gpu/config",     icon: <Settings className="size-4" />,    color: "#06b6d4" },
  { labelKey: "nav.gpu.activity",  href: "/gpu/activity",   icon: <Activity className="size-4" />,    color: "#a855f7" },
];

const operationsItems: NavItem[] = [
  { labelKey: "nav.devices",        href: "/devices",         icon: <DevicesIcon />,   color: "#06b6d4" },
  { labelKey: "nav.targets",        href: "/targets",         icon: <TargetsIcon />,   color: "#ef4444" },
  { labelKey: "nav.bootstrap",      href: "/bootstrap",       icon: <BootstrapIcon />, color: "#06b6d4" },
];

const accountItems: NavItem[] = [
  { labelKey: "nav.notifications", href: "/notifications", icon: <NotificationsIcon />, color: "#f59e0b" },
  { labelKey: "nav.profile",       href: "/profile",       icon: <ProfileIcon />,       color: "#3b82f6" },
  { labelKey: "nav.settings",      href: "/settings",      icon: <SettingsIcon />,      color: "#8b5cf6" },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`size-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function NavSection({
  titleKey,
  items,
  isActive,
  onNavClick,
  defaultOpen = true,
}: {
  titleKey: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavClick: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useTranslation();

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 mb-1 group cursor-pointer"
      >
        <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-cig-muted group-hover:text-cig-secondary transition-colors">
          {t(titleKey)}
        </span>
        <span className="text-cig-muted group-hover:text-cig-secondary transition-colors">
          <ChevronIcon open={open} />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <ul className="space-y-0.5 overflow-hidden">
          {items.map((item) => {
            const active = !item.external && isActive(item.href);
            const sharedClass = [
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
              active
                ? "text-cig-primary bg-slate-100 dark:bg-white/[0.07]"
                : "text-cig-secondary hover:text-cig-primary hover:bg-slate-50 dark:hover:bg-white/[0.04]",
            ].join(" ");
            const inner = (
              <>
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}60` }}
                  />
                )}
                <span
                  className="flex items-center justify-center size-5 transition-colors"
                  style={{ color: active ? item.color : undefined }}
                >
                  {item.icon}
                </span>
                {t(item.labelKey)}
                {active && (
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none hidden dark:block"
                    style={{ background: `radial-gradient(ellipse at left, ${item.color}10 0%, transparent 70%)` }}
                  />
                )}
              </>
            );
            return (
              <li key={item.href}>
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={sharedClass}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link href={item.href} onClick={onNavClick} className={sharedClass}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const t = useTranslation();
  const docsUrl = useResolvedDocsUrl();
  const landingUrl = useResolvedLandingUrl();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/gpu") return pathname === "/gpu" || pathname.startsWith("/gpu/sessions");
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile overlay - closes sidebar when clicked */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/40 dark:bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col transition-transform duration-200 ease-out",
          "bg-cig-sidebar border-r border-cig",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0 lg:transition-none",
        ].join(" ")}
      >
        {/* Logo */}
        <a
          href={landingUrl}
          className="group flex h-14 items-center gap-3 px-5 border-b border-cig transition-colors hover:bg-cig-hover flex-shrink-0"
        >
          <div className="relative flex items-center justify-center size-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/10 border border-cyan-500/20">
            <div className="size-2 rounded-full bg-cyan-500 dark:bg-cyan-400 dark:shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-cig-primary">CIG</span>
            <span className="text-[10px] font-mono text-cig-muted">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
          </div>
        </a>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
          <NavSection
            titleKey="sidebar.platform"
            items={platformItems}
            isActive={isActive}
            onNavClick={() => setSidebarOpen(false)}
          />
          <NavSection
            titleKey="sidebar.gpuCompute"
            items={gpuComputeItems}
            isActive={isActive}
            onNavClick={() => setSidebarOpen(false)}
          />
          <NavSection
            titleKey="sidebar.operations"
            items={operationsItems}
            isActive={isActive}
            onNavClick={() => setSidebarOpen(false)}
          />
          <NavSection
            titleKey="sidebar.account"
            items={accountItems}
            isActive={isActive}
            onNavClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Docs link */}
        <div className="border-t border-cig px-2.5 py-2 flex-shrink-0">
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-cig-secondary transition-all duration-150 hover:text-cig-primary hover:bg-slate-50 dark:hover:bg-white/[0.04]"
          >
            <span className="flex items-center justify-center size-5 transition-colors">
              <DocsIcon />
            </span>
            {t("nav.docs")}
            <span className="ml-auto opacity-40 group-hover:opacity-70 transition-opacity">
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </span>
          </a>
        </div>

        {/* User menu */}
        <div className="border-t border-cig flex-shrink-0">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function HomeIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
function ResourcesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
    </svg>
  );
}
function GraphIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
    </svg>
  );
}
function CostsIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function SecurityIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}
function NotificationsIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
function DeviceIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}
function TargetsIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}
function BootstrapIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}
function DevicesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
    </svg>
  );
}
function DocsIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
