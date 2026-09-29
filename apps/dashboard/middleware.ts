import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildDashboardRequestPath,
  isProtectedDashboardHostname,
  resolveLandingSignInUrl,
} from "./lib/siteUrl";

/** Routes that are always public — no session required. */
const PUBLIC_PATHS = [
  "/auth/callback",
  "/auth/login-callback",
  "/auth/login",
  "/api/auth/sync",
  "/analytics/share",
  "/runtime-version.json",
  "/sw.js",
  "/_next",
  "/favicon",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
