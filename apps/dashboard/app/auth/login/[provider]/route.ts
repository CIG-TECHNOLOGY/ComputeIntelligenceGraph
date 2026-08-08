import { NextRequest, NextResponse } from "next/server";
import { resolveDashboardUrl } from "../../../../lib/siteUrl";

/**
 * GET /auth/login/[provider]?code_challenge=...&state=...&redirect_uri=...&client_id=...&code_verifier=...
 *
 * Server-side relay that:
 *   1. Persists the PKCE verifier/state/provider in short-lived cookies on the
 *      dashboard origin, so the Authentik callback can complete the exchange.
 *   2. Redirects through Authentik's logout flow first, then to its
 *      source-login endpoint (/source/oauth/login/<provider>/).
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
 * cig-google-login/cig-github-login are single-stage RedirectStage flows
 * that just forward to /source/oauth/login/<provider>/ — hitting it directly
 * (via the logout flow's `next`) skips the flow-executor's render/fetch/
 * redirect round trip for that hop and its visible flash.
 */

const ALLOWED_PROVIDERS = new Set(["google", "github"]);

const PKCE_VERIFIER_COOKIE = "cig_pkce_verifier";
const PKCE_STATE_COOKIE = "cig_pkce_state";
const SOCIAL_PROVIDER_COOKIE = "cig_social_provider";
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
  const codeChallenge = req.nextUrl.searchParams.get("code_challenge");
  const codeVerifier = req.nextUrl.searchParams.get("code_verifier");
  const state = req.nextUrl.searchParams.get("state");

  if (!clientId || !redirectUri || !codeChallenge || !codeVerifier || !state) {
    return NextResponse.json({ error: "Missing PKCE parameters" }, { status: 400 });
  }

  const authentikUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "https://auth.cig.technology";
  const authBase = authentikUrl.replace(/\/$/, "");
  const authorizePath = `${authBase}/application/o/authorize/`;
  const sourceLoginUrl = new URL(`/source/oauth/login/${provider}/`, authBase);
  const dashboardUrl = resolveDashboardUrl({
    hostname: req.nextUrl.hostname,
    protocol: req.nextUrl.protocol,
  });
  sourceLoginUrl.searchParams.set("next", buildAuthorizeUrl(authorizePath, {
    clientId,
    redirectUri,
    state,
    codeChallenge,
  }));

  // Force a clean session before the source login — see comment above.
  // `next` must be a relative path: Authentik's invalidation flow rejects
  // absolute URLs as an open-redirect guard and silently falls back to its
  // own default-authentication-flow instead of erroring, which is why this
  // was landing on Authentik's generic login form rather than Google.
  const logoutUrl = new URL("/if/flow/default-invalidation-flow/", authBase);
  logoutUrl.searchParams.set("next", `${sourceLoginUrl.pathname}${sourceLoginUrl.search}`);

  const response = NextResponse.redirect(logoutUrl, 302);
  setPkceCookies(response, dashboardUrl.startsWith("https://"), {
    verifier: codeVerifier,
    state,
    provider,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function buildAuthorizeUrl(
  authorizePath: string,
  params: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
  },
): string {
  const authorizeParams = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: "openid email profile",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });

  return `${authorizePath}?${authorizeParams}`;
}

function setPkceCookies(
  response: NextResponse,
  secure: boolean,
  session: {
    verifier: string;
    state: string;
    provider: string;
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
}
