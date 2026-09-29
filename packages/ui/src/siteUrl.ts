const DEFAULT_LANDING_URL = "https://cig.technology";
const DEFAULT_DASHBOARD_URL = "https://app.cig.technology";
const DEFAULT_DOCS_URL = "https://cig.technology/documentation";
const PRODUCTION_DASHBOARD_HOSTNAMES = new Set([
  "app.cig.technology",
  // Keep the former cosmetic hostname recognized while it redirects to the
  // canonical product dashboard.
  "app.cig.lat",
]);

export type UrlContext = {
  hostname?: string | null;
  protocol?: string | null;
};

type PublicEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_DASHBOARD_URL?: string;
  NEXT_PUBLIC_DOCS_URL?: string;
};

function getPublicEnv(): PublicEnv {
  return (globalThis as { process?: { env?: PublicEnv } }).process?.env ?? {};
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  );
}

export function isLoopbackHostname(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }

  return isLocalHostname(hostname);
}

export function isProtectedDashboardHostname(hostname: string | null | undefined): boolean {
  return PRODUCTION_DASHBOARD_HOSTNAMES.has((hostname ?? "").trim().toLowerCase());
}

function formatLocalOriginUrl(hostname: string, protocol: string, port: number): string {
  const normalizedProtocol = protocol.endsWith(":") ? protocol : `${protocol}:`;
  const renderedHost = hostname === "::1" ? "[::1]" : hostname;
  return `${normalizedProtocol}//${renderedHost}:${port}`;
}

export function resolveLandingUrl(context: UrlContext = {}): string {
  const env = getPublicEnv();
  const hostname = context.hostname;
  const protocol = context.protocol;

  if (hostname && isLocalHostname(hostname)) {
    return formatLocalOriginUrl(hostname, protocol ?? "http:", 3000);
  }

  return env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_LANDING_URL;
}

export function resolveLandingLoggedOutUrl(context: UrlContext = {}): string {
  return `${resolveLandingUrl(context)}?logged_out=1`;
}

export function normalizeDashboardRedirectPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, DEFAULT_DASHBOARD_URL);
    if (parsed.origin !== DEFAULT_DASHBOARD_URL) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

export function buildDashboardRequestPath(pathname: string, search = ""): string {
  const normalizedPathname = normalizeDashboardRedirectPath(pathname, "/");
  const normalizedSearch = search.startsWith("?") ? search : search ? `?${search}` : "";
  return normalizeDashboardRedirectPath(`${normalizedPathname}${normalizedSearch}`, "/");
}

export function resolveLandingSignInUrl(
  context: UrlContext & { dashboardPath?: string | null } = {},
): string {
  const landingUrl = new URL(resolveLandingUrl(context));
  landingUrl.searchParams.set("auth", "signin");
  landingUrl.searchParams.set(
    "dashboard_redirect",
    normalizeDashboardRedirectPath(context.dashboardPath, "/"),
  );
  return landingUrl.toString();
}

export function resolveDocsUrl(context: UrlContext = {}): string {
  const env = getPublicEnv();
  const hostname = context.hostname;
  const protocol = context.protocol;

  if (hostname && isLocalHostname(hostname)) {
    return `${formatLocalOriginUrl(hostname, protocol ?? "http:", 3004)}/documentation`;
  }

  const configuredDocsUrl = env.NEXT_PUBLIC_DOCS_URL;
  if (configuredDocsUrl) {
    return configuredDocsUrl;
  }

  const configuredSiteUrl = env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    return `${configuredSiteUrl.replace(/\/+$/, "")}/documentation`;
  }

  return DEFAULT_DOCS_URL;
}

export function resolveDashboardUrl(context: UrlContext = {}): string {
  const env = getPublicEnv();
  const hostname = context.hostname;
  const protocol = context.protocol;

  if (hostname && isLocalHostname(hostname)) {
    return formatLocalOriginUrl(hostname, protocol ?? "http:", 3001);
  }

  return env.NEXT_PUBLIC_DASHBOARD_URL ?? DEFAULT_DASHBOARD_URL;
}
