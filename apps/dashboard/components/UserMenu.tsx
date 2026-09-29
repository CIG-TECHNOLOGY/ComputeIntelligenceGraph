"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { useTranslation } from "@cig-technology/i18n/react";
import { OrganizationSwitcher } from "./OrganizationSwitcher";

interface Identity {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function UserMenu() {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout, isPending: isLoading } = useLogout();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = identity?.name
    ? identity.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div ref={menuRef} className="relative py-2.5">
      <OrganizationSwitcher />
      <div className="px-2.5 pt-2.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-cig-hover transition-colors"
        aria-label={t("userMenu.userLabel")}
      >
        {identity?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={identity.avatar}
            alt={identity.name}
            className="size-8 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
          />
        ) : (
          <span className="size-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-medium text-cig-primary">{identity?.name ?? "User"}</p>
          <p className="truncate text-[10px] text-cig-muted">{identity?.email ?? ""}</p>
        </div>
        <svg
          className={`size-3.5 text-cig-muted flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-2.5 right-2.5 mb-1 rounded-xl border border-cig bg-cig-card shadow-lg dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] py-1 z-50">
          <Link href="/profile" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-cig-secondary hover:text-cig-primary hover:bg-cig-hover transition-colors">
            <ProfileIcon /> {t("userMenu.profile")}
          </Link>
          <Link href="/settings" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-cig-secondary hover:text-cig-primary hover:bg-cig-hover transition-colors">
            <SettingsIcon /> {t("userMenu.settings")}
          </Link>
          <hr className="my-1 border-cig" />
          <button
            onClick={() => { setOpen(false); logout(); }}
            disabled={isLoading}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors disabled:opacity-50"
          >
            <LogoutIcon />
            {isLoading ? t("userMenu.signingOut") : t("userMenu.signOut")}
          </button>
        </div>
      )}
      </div>
    </div>
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
function LogoutIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}
