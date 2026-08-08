import { NextRequest, NextResponse } from "next/server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "status.cig.technology";
// The org slug whose status page is shown at the apex domain
const APEX_SLUG = process.env.APEX_STATUS_SLUG ?? "cig";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const host = hostname.split(":")[0];
  const { pathname } = request.nextUrl;

  // Already routed to /status/* — don't loop
  if (pathname.startsWith("/status/")) {
    return NextResponse.next();
  }

  // Apex domain: status.cig.technology/ → /status/cig (public, no login)
  // Protected paths (/admin, /dashboard, /login, /api) pass through for SSO auth.
  if (host === BASE_DOMAIN) {
    const isProtected =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon");
    if (!isProtected && (pathname === "/" || pathname === "")) {
      const url = request.nextUrl.clone();
      url.pathname = `/status/${APEX_SLUG}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Tenant subdomain: hashpass.status.cig.technology/ → /status/hashpass
  if (!host.endsWith(`.${BASE_DOMAIN}`)) {
    return NextResponse.next();
  }

  const slug = host.slice(0, host.length - BASE_DOMAIN.length - 1);
  if (!slug || slug === "www") {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone();
    url.pathname = `/status/${slug}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
