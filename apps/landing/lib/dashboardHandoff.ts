"use client";

import { getSupabaseClient } from "@cig/auth";
import {
  isProtectedDashboardHostname,
  normalizeDashboardRedirectPath,
} from "@cig/ui/siteUrl";

const PENDING_DASHBOARD_REDIRECT_KEY = "cig_pending_dashboard_redirect";
const PENDING_DASHBOARD_AUTH_INTENT_KEY = "cig_pending_dashboard_auth_intent";
const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
const SUPABASE_HANDOFF_ATTEMPTS = 8;
const SUPABASE_HANDOFF_DELAY_MS = 180;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function persistPendingDashboardRedirect(path: string): void {
  const storage = readStorage();
  if (!storage) {
    return;
  }

  storage.setItem(
    PENDING_DASHBOARD_REDIRECT_KEY,
    normalizeDashboardRedirectPath(path, "/"),
  );
  storage.setItem(PENDING_DASHBOARD_AUTH_INTENT_KEY, "1");
}

export function readPendingDashboardRedirect(): string | null {
  const storage = readStorage();
  if (!storage) {
    return null;
  }

  return normalizeDashboardRedirectPath(
    storage.getItem(PENDING_DASHBOARD_REDIRECT_KEY),
    "/",
  );
}

export function clearPendingDashboardRedirect(): void {
  const storage = readStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(PENDING_DASHBOARD_REDIRECT_KEY);
  storage.removeItem(PENDING_DASHBOARD_AUTH_INTENT_KEY);
}

function hasPendingDashboardAuthIntent(): boolean {
  const storage = readStorage();
  if (!storage) {
    return false;
  }

  return storage.getItem(PENDING_DASHBOARD_AUTH_INTENT_KEY) === "1";
}

export function consumePendingDashboardRedirect(): string | null {
  if (!hasPendingDashboardAuthIntent()) {
    clearPendingDashboardRedirect();
    return null;
  }

  const target = readPendingDashboardRedirect();
  clearPendingDashboardRedirect();
  return target;
}

export function resolveDashboardRedirectFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const requested = normalizeDashboardRedirectPath(
    params.get("dashboard_redirect"),
    "/",
  );
  return requested || "/";
}

export function cleanLandingAuthSearchParams(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("auth");
  url.searchParams.delete("dashboard_redirect");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function buildDashboardCallbackHash(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

function getAuthentikDashboardCallbackHash(): string | null {
  try {
    const authSource = sessionStorage.getItem("cig_auth_source");
    if (authSource !== "authentik") {
      return null;
    }

    const accessToken = sessionStorage.getItem("cig_access_token");
    if (!accessToken) {
      return null;
    }

    const expiresAt = sessionStorage.getItem("cig_expires_at");
    if (expiresAt) {
      const parsedExpiresAt = Number.parseInt(expiresAt, 10);
      if (Number.isFinite(parsedExpiresAt) && Date.now() >= parsedExpiresAt) {
        return null;
      }
    }

    const idToken = sessionStorage.getItem("cig_id_token") ?? "";
    const expiresIn = sessionStorage.getItem("cig_expires_in") ?? "3600";
    return buildDashboardCallbackHash({
      access_token: accessToken,
      ...(idToken && { id_token: idToken }),
      expires_in: expiresIn,
      auth_source: "authentik",
    });
  } catch {
    return null;
  }
}

async function getSupabaseDashboardCallbackHash(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  for (let attempt = 0; attempt < SUPABASE_HANDOFF_ATTEMPTS; attempt += 1) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        return buildDashboardCallbackHash({
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? "",
          token_type: session.token_type ?? "bearer",
          expires_in: String(session.expires_in ?? 3600),
          auth_source: "supabase",
        });
      }
    } catch {
      // Retry below for freshly-created sessions.
    }

    if (attempt === 2 || attempt === 5) {
      try {
        const {
          data: { session },
        } = await supabase.auth.refreshSession();

        if (session?.access_token) {
          return buildDashboardCallbackHash({
            access_token: session.access_token,
            refresh_token: session.refresh_token ?? "",
            token_type: session.token_type ?? "bearer",
            expires_in: String(session.expires_in ?? 3600),
            auth_source: "supabase",
          });
        }
      } catch {
        // Fall through to retry delay below.
      }
    }

    if (attempt < SUPABASE_HANDOFF_ATTEMPTS - 1) {
      await delay(SUPABASE_HANDOFF_DELAY_MS);
    }
  }

  return null;
}

// Handles email OTP sessions: persistEmailSession() stores the CIG JWT directly
// in sessionStorage with cig_auth_source="supabase". The Supabase-client path
// above won't find it (no real Supabase session), so we read sessionStorage
// directly and build the same hash the dashboard /auth/callback expects.
function getEmailOtpDashboardCallbackHash(): string | null {
  try {
    const authSource = sessionStorage.getItem("cig_auth_source");
    if (authSource !== "supabase") {
      return null;
    }
    const accessToken = sessionStorage.getItem("cig_access_token");
    if (!accessToken) {
      return null;
    }
    const expiresAt = sessionStorage.getItem("cig_expires_at");
    if (expiresAt) {
      const parsed = Number.parseInt(expiresAt, 10);
      if (Number.isFinite(parsed) && Date.now() >= parsed) {
        return null;
      }
    }
    const idToken = sessionStorage.getItem("cig_id_token") ?? "";
    const expiresIn = sessionStorage.getItem("cig_expires_in") ?? "3600";
    const socialProvider = sessionStorage.getItem("cig_social_provider") ?? "";
    return buildDashboardCallbackHash({
      access_token: accessToken,
      ...(idToken && { id_token: idToken }),
      expires_in: expiresIn,
      ...(socialProvider && { social_provider: socialProvider }),
      auth_source: "supabase",
    });
  } catch {
    return null;
  }
}

export async function goToDashboard(path = "/"): Promise<void> {
  const normalizedPath = normalizeDashboardRedirectPath(path, "/");
  const dashboardHostname = (() => {
    try {
      return new URL(DASHBOARD_URL).hostname;
    } catch {
      return "";
    }
  })();
  const requiresProtectedHandoff = isProtectedDashboardHostname(dashboardHostname);

  const authentikHash = getAuthentikDashboardCallbackHash();
  if (authentikHash) {
    clearPendingDashboardRedirect();
    window.location.replace(
      `${DASHBOARD_URL}/auth/callback?redirect=${encodeURIComponent(normalizedPath)}#${authentikHash}`,
    );
    return;
  }

  const supabaseHash = await getSupabaseDashboardCallbackHash();
  if (supabaseHash) {
    clearPendingDashboardRedirect();
    window.location.replace(
      `${DASHBOARD_URL}/auth/callback?redirect=${encodeURIComponent(normalizedPath)}#${supabaseHash}`,
    );
    return;
  }

  const emailOtpHash = getEmailOtpDashboardCallbackHash();
  if (emailOtpHash) {
    clearPendingDashboardRedirect();
    window.location.replace(
      `${DASHBOARD_URL}/auth/callback?redirect=${encodeURIComponent(normalizedPath)}#${emailOtpHash}`,
    );
    return;
  }

  if (requiresProtectedHandoff) {
    throw new Error("Protected dashboard access requires an authenticated handoff.");
  }

  window.location.replace(`${DASHBOARD_URL}${normalizedPath}`);
}
