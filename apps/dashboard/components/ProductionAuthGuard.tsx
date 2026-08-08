"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { buildDashboardRequestPath, isProtectedDashboardHostname, resolveLandingSignInUrl } from "../lib/siteUrl";
import { clearBrowserSession, getBrowserAccessToken } from "../lib/cigClient";

const SILENT_AUTH_ATTEMPTED_KEY = "cig_silent_auth_attempted";

function getRedirectUrl(pathname: string, search: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!isProtectedDashboardHostname(window.location.hostname)) {
    return null;
  }

  return resolveLandingSignInUrl({
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    dashboardPath: buildDashboardRequestPath(pathname, search),
  });
}

/**
 * Before giving up and bouncing to landing's sign-in, try completing the
 * OIDC handshake silently via /auth/silent — the user may already have an
 * active Authentik session (e.g. just landed here from Authentik's own
 * post-login app-launch redirect) without a local dashboard session yet.
 * Guarded by a one-shot sessionStorage flag so a failed silent attempt
 * (Authentik has no session either) falls through to the normal sign-in
 * redirect instead of looping.
 */
function trySilentAuthOnce(): boolean {
  try {
    if (sessionStorage.getItem(SILENT_AUTH_ATTEMPTED_KEY) === "1") {
      return false;
    }
    sessionStorage.setItem(SILENT_AUTH_ATTEMPTED_KEY, "1");
  } catch {
    return false;
  }
  window.location.replace("/auth/silent");
  return true;
}

export function ProductionAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const search = useMemo(() => {
    const rendered = searchParams?.toString() ?? "";
    return rendered ? `?${rendered}` : "";
  }, [searchParams]);

  const redirectUrl = useMemo(() => getRedirectUrl(pathname, search), [pathname, search]);
  const shouldRedirect = Boolean(redirectUrl && getBrowserAccessToken() == null);

  useEffect(() => {
    if (!redirectUrl || !shouldRedirect || typeof window === "undefined") {
      return;
    }

    if (trySilentAuthOnce()) {
      return;
    }

    clearBrowserSession();
    window.location.replace(redirectUrl);
  }, [redirectUrl, shouldRedirect]);

  if (shouldRedirect) {
    return (
      <div className="flex h-screen items-center justify-center bg-cig-base">
        <div className="flex flex-col items-center gap-4">
          <div className="relative size-12">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
          </div>
          <p className="text-sm tracking-wide text-cyan-500">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
