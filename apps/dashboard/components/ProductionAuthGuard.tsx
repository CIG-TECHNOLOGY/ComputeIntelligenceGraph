"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { buildDashboardRequestPath, isProtectedDashboardHostname, resolveLandingSignInUrl } from "../lib/siteUrl";
import { clearBrowserSession, getBrowserAccessToken } from "../lib/cigClient";

const SILENT_AUTH_ATTEMPTED_COOKIE = "cig_silent_auth_attempted";

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

function hasSilentAuthAttemptedCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${SILENT_AUTH_ATTEMPTED_COOKIE}=1`);
}

function markSilentAuthAttempted(): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // Short-lived: long enough to survive the /auth/silent round trip, short
  // enough that it naturally expires rather than requiring an explicit
  // clear on every code path.
  document.cookie = `${SILENT_AUTH_ATTEMPTED_COOKIE}=1; path=/; max-age=120; SameSite=Lax${secure}`;
}

/**
 * Before giving up and bouncing to landing's sign-in, try completing the
 * OIDC handshake silently via /auth/silent — the user may already have an
 * active Authentik session (e.g. just landed here from Authentik's own
 * post-login app-launch redirect) without a local dashboard session yet.
 *
 * Guarded by a one-shot flag so a failed silent attempt (Authentik has no
 * session either) falls through to the normal sign-in redirect instead of
 * looping. This flag MUST be a cookie, not sessionStorage: sessionStorage
 * persists for the entire tab lifetime, so once the first (pre-login)
 * silent check burned it, a user who then completed an explicit
 * Google/GitHub login and landed back here with a brand-new Authentik
 * session would never get a second silent-auth attempt — they'd be bounced
 * straight back to sign-in in a loop, even though the retry would have
 * succeeded. A cookie lets /auth/login/[provider]/route.ts clear it
 * server-side right before an explicit login starts, guaranteeing a fresh
 * silent-auth attempt when the user returns with a real session.
 */
function trySilentAuthOnce(): boolean {
  try {
    if (hasSilentAuthAttemptedCookie()) {
      return false;
    }
    markSilentAuthAttempted();
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
