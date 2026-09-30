import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildDashboardRequestPath,
  isProtectedDashboardHostname,
  resolveLandingSignInUrl,
} from "./lib/siteUrl";
import { getPermanentAnalyticsAlias } from "./lib/analyticsAlias";

/** Routes that are always public — no session required. */
const PUBLIC_PATHS = [
  "/auth/callback",
  "/auth/login-callback",
  "/auth/login",
  "/api/auth/sync",
  "/analytics/share",
  "/analytics/alias",
  "/runtime-version.json",
  "/sw.js",
  "/_next",
  "/favicon",
];

function permanentAnalyticsHost(hostname: string): { alias: string; baseDomain: "analytics.cig.technology" } | null {
  const alias = getPermanentAnalyticsAlias(hostname);
  return alias ? { alias, baseDomain: "analytics.cig.technology" } : null;
}

function permanentAnalyticsHostFromRequest(request: NextRequest) {
  const candidates = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    request.nextUrl.hostname,
  ]
    .flatMap((value) => value?.split(",", 1) ?? [])
    .map((value) => value.trim().replace(/:\d+$/, ""))
    .filter(Boolean);

  for (const candidate of candidates) {
    const permanentHost = permanentAnalyticsHost(candidate);
    if (permanentHost) return permanentHost;
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const permanentHost = permanentAnalyticsHostFromRequest(request);
  if (permanentHost && (pathname === "/" || pathname === "/analytics")) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = `/analytics/alias/${permanentHost.alias}`;
    rewritten.searchParams.set("base", permanentHost.baseDomain);
    return NextResponse.rewrite(rewritten);
  }

  if (pathname === "/auth/callback" && request.nextUrl.searchParams.has("code")) {
    const loginCallbackUrl = new URL("/auth/login-callback", request.url);
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      loginCallbackUrl.searchParams.set(key, value);
    }
    return NextResponse.redirect(loginCallbackUrl);
  }

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!isProtectedDashboardHostname(request.nextUrl.hostname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has("cig_has_session");

  if (!hasSession) {
    return NextResponse.redirect(
      resolveLandingSignInUrl({
        hostname: request.nextUrl.hostname,
        protocol: request.nextUrl.protocol,
        dashboardPath: buildDashboardRequestPath(
          pathname,
          request.nextUrl.search,
        ),
      }),
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
