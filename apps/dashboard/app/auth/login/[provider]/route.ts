import { NextRequest, NextResponse } from "next/server";
import { resolveDashboardUrl } from "../../../../lib/siteUrl";

/**
 * GET /auth/login/[provider]?code_challenge=...&state=...&redirect_uri=...&client_id=...&code_verifier=...
 *
 * Server-side relay, step 1 of 2:
 *   1. Persists the full PKCE session (verifier/state/provider/client_id/
 *      redirect_uri) in short-lived cookies on the dashboard origin.
 *   2. Redirects through Authentik's logout flow, with `next` pointing back
 *      to our own /continue endpoint (see that file for step 2).
 *
 * The logout hop matters: Authentik's built-in default-source-authentication
 * flow (which processes the Google/GitHub callback) has
 * authentication=require_unauthenticated. Any existing Authentik session in
 * the browser — an admin session, a leftover session from a previous
 * attempt, anything — makes that flow reject with "Flow does not apply to
 * current user" before the social login can even complete. Forcing a logout
 * first guarantees the precondition is met on every attempt, for every user,
 * not just in an incognito window.
 *
 * Why two hops instead of chaining straight to /source/oauth/login/: tried
 * that first, passing it as Authentik's `next` (both as an absolute URL and
 * as a relative path) — Authentik's invalidation flow logs the value
 * correctly but the follow-through silently doesn't happen, landing on its
 * generic login form instead. Authentik's `next` handling isn't reliable
 * for a URL that itself carries another URL-encoded `next` nested inside
 * it. Routing the continuation back through our own domain first sidesteps
 * that: our own /continue hop needs no query string on Authentik's `next`
 * at all, so there's nothing nested to get mangled.
 */

const ALLOWED_PROVIDERS = new Set(["google", "github"]);

const PKCE_VERIFIER_COOKIE = "cig_pkce_verifier";
const PKCE_STATE_COOKIE = "cig_pkce_state";
const SOCIAL_PROVIDER_COOKIE = "cig_social_provider";
const PKCE_CLIENT_ID_COOKIE = "cig_pkce_client_id";
const PKCE_REDIRECT_URI_COOKIE = "cig_pkce_redirect_uri";
const PKCE_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const clientId = req.nextUrl.searchParams.get("client_id");
  const redirectUri = req.nextUrl.searchParams.get("redirect_uri");
  const codeVerifier = req.nextUrl.searchParams.get("code_verifier");
  const state = req.nextUrl.searchParams.get("state");

  if (!clientId || !redirectUri || !codeVerifier || !state) {
    return NextResponse.json({ error: "Missing PKCE parameters" }, { status: 400 });
  }

  const authentikUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "https://auth.cig.technology";
  const authBase = authentikUrl.replace(/\/$/, "");
  const dashboardUrl = resolveDashboardUrl({
    hostname: req.nextUrl.hostname,
    protocol: req.nextUrl.protocol,
  });

  // Force a clean session before the source login — see comment above.
  // No query string on this `next`: it points at our own /continue route,
  // which reconstructs everything from cookies.
  const logoutUrl = new URL("/if/flow/default-invalidation-flow/", authBase);
  logoutUrl.searchParams.set("next", new URL(`/auth/login/${provider}/continue`, dashboardUrl).toString());

  const response = NextResponse.redirect(logoutUrl, 302);
  setPkceCookies(response, dashboardUrl.startsWith("https://"), {
    verifier: codeVerifier,
    state,
    provider,
    clientId,
    redirectUri,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function setPkceCookies(
  response: NextResponse,
  secure: boolean,
  session: {
    verifier: string;
    state: string;
    provider: string;
    clientId: string;
    redirectUri: string;
  },
) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: PKCE_COOKIE_MAX_AGE_SECONDS,
  };

  response.cookies.set(PKCE_VERIFIER_COOKIE, session.verifier, cookieOptions);
  response.cookies.set(PKCE_STATE_COOKIE, session.state, cookieOptions);
  response.cookies.set(SOCIAL_PROVIDER_COOKIE, session.provider, cookieOptions);
  response.cookies.set(PKCE_CLIENT_ID_COOKIE, session.clientId, cookieOptions);
  response.cookies.set(PKCE_REDIRECT_URI_COOKIE, session.redirectUri, cookieOptions);
}
