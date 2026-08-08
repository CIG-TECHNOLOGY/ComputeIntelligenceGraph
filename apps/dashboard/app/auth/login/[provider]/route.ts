import { NextRequest, NextResponse } from "next/server";
import { resolveDashboardUrl } from "../../../../lib/siteUrl";

/**
 * GET /auth/login/[provider]?code_challenge=...&state=...&redirect_uri=...&client_id=...&code_verifier=...
 *
 * Server-side relay that:
 *   1. Persists the PKCE verifier/state/provider in short-lived cookies on the
 *      dashboard origin, so the Authentik callback can complete the exchange.
 *   2. Redirects the browser directly to Authentik's source-login endpoint
 *      (/source/oauth/login/<provider>/), bypassing the flow executor SPA.
 *
 * This intentionally does NOT force a logout first. That was tried (routing
 * through Authentik's default-invalidation-flow to clear a pre-existing
 * session before default-source-authentication's require_unauthenticated
 * check) across several variants — chaining `next` straight through, via a
 * relative path, and via a same-origin /continue hop on our own domain.
 * Authentik's own source confirms `next` should work for a relative target,
 * but every variant landed on Authentik's generic login form in practice,
 * and reproducing the exact SPA/session mechanics outside a real browser
 * proved unreliable. The actual fix belongs on the Authentik side: the
 * default-source-authentication flow's `authentication` requirement should
 * be `none` instead of `require_unauthenticated`, so it tolerates an
 * existing session instead of rejecting it. See CLAUDE.md / ops notes for
 * that change; this route stays intentionally simple.
 *
 * cig-google-login/cig-github-login are single-stage RedirectStage flows
 * that just forward to this same URL — hitting it directly skips the
 * flow-executor's render/fetch/redirect round trip and its visible flash.
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

  const response = NextResponse.redirect(sourceLoginUrl, 302);
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
