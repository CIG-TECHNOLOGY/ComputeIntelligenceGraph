import { NextRequest, NextResponse } from "next/server";
import { resolveDashboardUrl } from "../../../lib/siteUrl";

/**
 * GET /auth/silent
 *
 * Attempts to complete the OIDC handshake silently, without going through
 * Google/GitHub again. Used when the dashboard has no local session but the
 * user may already have an active Authentik session — e.g. right after
 * landing on app.cig.lat from Authentik's own post-login app-launch
 * (chaining the OAuth2 authorize request through the Google/GitHub source
 * login proved unreliable: Authentik's session-based `next` tracking gets
 * overwritten by the separate default-source-authentication flow's own
 * dispatch when the source redirects back, so it can't be trusted to carry
 * our authorize URL through that hop — see /auth/login/[provider]/route.ts).
 *
 * Generates a fresh PKCE pair and hits Authentik's OAuth2 authorize
 * endpoint directly with prompt=none:
 *   - If Authentik has an active session, this completes silently and
 *     redirects to /auth/login-callback with a code — no UI shown.
 *   - If not, Authentik returns error=login_required to the same
 *     redirect_uri, which login-callback handles by sending the user to
 *     landing's sign-in without an error page (this was just a background
 *     check, not an explicit login attempt).
 * Either way, control returns to /auth/login-callback, never back through
 * this route or the dashboard's auth guard — so there's no redirect loop.
 */

// Generates a fresh random PKCE pair and sets cookies on every request —
// must never be statically cached/prerendered.
export const dynamic = "force-dynamic";

const PKCE_VERIFIER_COOKIE = "cig_pkce_verifier";
const PKCE_STATE_COOKIE = "cig_pkce_state";
const SOCIAL_PROVIDER_COOKIE = "cig_social_provider";
const PKCE_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "NEXT_PUBLIC_AUTHENTIK_CLIENT_ID is required" }, { status: 500 });
  }

  const authentikUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "https://auth.cig.technology";
  const authBase = authentikUrl.replace(/\/$/, "");
  const dashboardUrl = resolveDashboardUrl({
    hostname: req.nextUrl.hostname,
    protocol: req.nextUrl.protocol,
  });
  const redirectUri = new URL("/auth/login-callback", dashboardUrl).toString();

  const verifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(verifier);
  const state = generateState();

  const authorizeUrl = new URL("/application/o/authorize/", authBase);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("prompt", "none");

  const response = NextResponse.redirect(authorizeUrl, 302);
  const secure = dashboardUrl.startsWith("https://");
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: PKCE_COOKIE_MAX_AGE_SECONDS,
  };
  response.cookies.set(PKCE_VERIFIER_COOKIE, verifier, cookieOptions);
  response.cookies.set(PKCE_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(SOCIAL_PROVIDER_COOKIE, "sso", cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function base64urlEncode(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(digest);
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}
