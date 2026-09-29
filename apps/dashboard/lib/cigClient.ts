import { getSupabaseClient } from "@cig/auth";
import type { Session } from "@supabase/supabase-js";
import { CigClient } from "@cig/sdk";
import { getActiveOrganizationId } from "./organizations";
import { resolveDashboardAuthSource } from "./sessionAuth";

export const DASHBOARD_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

type BrowserSessionSnapshot = {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  expiresIn: number | null;
  authSource: "authentik" | "supabase";
  socialProvider: string | null;
};

type BrowserSessionInput = {
  accessToken: string;
  idToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  expiresIn?: number | null;
  authSource?: "authentik" | "supabase";
  socialProvider?: string | null;
};

const LEGACY_BOOTSTRAP_ACCESS_TOKEN_KEY = "cig-access-token";

export function clearBrowserSession(): void {
  try {
    sessionStorage.removeItem("cig_access_token");
    sessionStorage.removeItem("cig_id_token");
    sessionStorage.removeItem("cig_refresh_token");
    sessionStorage.removeItem("cig_expires_in");
    sessionStorage.removeItem("cig_expires_at");
    sessionStorage.removeItem("cig_auth_source");
    sessionStorage.removeItem("cig_social_provider");
    localStorage.removeItem(LEGACY_BOOTSTRAP_ACCESS_TOKEN_KEY);
    document.cookie = "cig_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  } catch {
    // ignore
  }
}

function setSessionCookie(expiresAt: number | null): void {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  if (!expiresAt || Number.isNaN(expiresAt)) {
    document.cookie = `cig_has_session=1; path=/; SameSite=Lax${secure}`;
    return;
  }

  document.cookie =
    `cig_has_session=1; path=/; expires=${new Date(expiresAt).toUTCString()}; SameSite=Lax${secure}`;
}

export function storeBrowserSession(session: BrowserSessionInput): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    clearBrowserSession();

    const expiresAtMs =
      typeof session.expiresAt === "number" && Number.isFinite(session.expiresAt)
        ? session.expiresAt
        : typeof session.expiresIn === "number"
          ? Date.now() + session.expiresIn * 1000
          : null;

    sessionStorage.setItem("cig_access_token", session.accessToken);

    if (session.idToken) {
      sessionStorage.setItem("cig_id_token", session.idToken);
    }

    if (session.refreshToken) {
      sessionStorage.setItem("cig_refresh_token", session.refreshToken);
    }

    sessionStorage.setItem("cig_auth_source", session.authSource ?? "authentik");

    if (typeof session.expiresIn === "number") {
      sessionStorage.setItem("cig_expires_in", String(session.expiresIn));
    }

    if (expiresAtMs !== null) {
      sessionStorage.setItem("cig_expires_at", String(expiresAtMs));
    }

    if (session.socialProvider) {
      sessionStorage.setItem("cig_social_provider", session.socialProvider);
    }

    setSessionCookie(expiresAtMs);
  } catch {
    // ignore
  }
}

function readBrowserSession(): BrowserSessionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const accessToken = sessionStorage.getItem("cig_access_token");
    const idToken = sessionStorage.getItem("cig_id_token");
    const refreshToken = sessionStorage.getItem("cig_refresh_token");
    const socialProvider = sessionStorage.getItem("cig_social_provider");
    const expiresAtRaw = sessionStorage.getItem("cig_expires_at");
    const expiresInRaw = sessionStorage.getItem("cig_expires_in");

    if (!accessToken && !idToken) {
      const legacyAccessToken = localStorage.getItem(LEGACY_BOOTSTRAP_ACCESS_TOKEN_KEY);
      if (!legacyAccessToken) {
        return null;
      }

      const authSource = resolveDashboardAuthSource({
        explicitAuthSource: localStorage.getItem("cig_auth_source"),
        accessToken: legacyAccessToken,
      });

      storeBrowserSession({
        accessToken: legacyAccessToken,
        authSource,
      });

      return {
        accessToken: legacyAccessToken,
        idToken: null,
        refreshToken: null,
        expiresAt: null,
        expiresIn: null,
        authSource,
        socialProvider: null,
      };
    }

    return {
      accessToken,
      idToken,
      refreshToken,
      expiresAt: expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : null,
      expiresIn: expiresInRaw ? Number.parseInt(expiresInRaw, 10) : null,
      authSource: resolveDashboardAuthSource({
        explicitAuthSource: sessionStorage.getItem("cig_auth_source"),
        accessToken,
        idToken,
      }),
      socialProvider,
    };
  } catch {
    return null;
  }
}

export function syncSupabaseSessionToBrowserStorage(session: Session | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session?.access_token) {
    const current = readBrowserSession();
    if (current?.authSource === "supabase") {
      clearBrowserSession();
    }
    return;
  }

  try {
    const expiresAtMs =
      typeof session.expires_at === "number"
        ? session.expires_at * 1000
        : Date.now() + (session.expires_in ?? 3600) * 1000;

    const provider =
      typeof session.user?.app_metadata?.provider === "string"
        ? session.user.app_metadata.provider
        : typeof session.user?.app_metadata?.['providers']?.[0] === "string"
          ? String(session.user?.app_metadata?.['providers']?.[0])
          : null;

    storeBrowserSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: expiresAtMs,
      expiresIn: session.expires_in ?? 3600,
      authSource: "supabase",
      socialProvider: provider,
    });
  } catch {
    // ignore
  }
}

export function getBrowserAccessToken(): string | null {
  const session = readBrowserSession();
  if (!session) {
    return null;
  }

  if (session.expiresAt && Date.now() > session.expiresAt) {
    clearBrowserSession();
    return null;
  }

  if (session.authSource === "authentik" && session.idToken) {
    return session.idToken;
  }

  return session.accessToken ?? session.idToken;
}

export async function resolveDashboardAccessToken(): Promise<string | null> {
  const storedToken = getBrowserAccessToken();
  const currentSession = readBrowserSession();

  if (currentSession?.authSource === "authentik") {
    return storedToken;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return storedToken;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      syncSupabaseSessionToBrowserStorage(session);
      return session.access_token;
    }
  } catch {
    // Fall back to whatever is already in browser storage.
  }

  return storedToken;
}

export function resolveDashboardOrganizationHeaders(): HeadersInit | undefined {
  const organizationId = getActiveOrganizationId();
  return organizationId ? { "x-cig-organization-id": organizationId } : undefined;
}

let dashboardClient: CigClient | null = null;

export function getDashboardClient(): CigClient {
  if (!dashboardClient) {
    dashboardClient = new CigClient({
      baseUrl: DASHBOARD_API_URL,
      getAccessToken: resolveDashboardAccessToken,
      getDefaultHeaders: resolveDashboardOrganizationHeaders,
    });
  }

  return dashboardClient;
}
