import { NextRequest, NextResponse } from "next/server";
import { resolveDashboardUrl } from "../../../../lib/siteUrl";

/**
 * GET /auth/login/[provider]?code_challenge=...&state=...&redirect_uri=...&client_id=...&code_verifier=...
 *
 * Server-side relay that:
 *   1. Persists the PKCE verifier/state/provider in short-lived cookies on the
 *      dashboard origin, so the Authentik callback can complete the exchange.
 *   2. Redirects the browser into the provider-specific Authentik flow
 *      (cig-google-login / cig-github-login), which forwards to Google/GitHub.
 *
 * Earlier versions of this route redirected straight to
 * /source/oauth/login/<provider>/ to skip the flow-executor SPA's render
 * round trip. That broke the OAuth continuation entirely: that view
 * (OAuthRedirect, authentik/sources/oauth/views/redirect.py) never reads or
 * stores a `next` parameter — it only builds the redirect to the external
 * provider. The `next`-after-login mechanism only exists on the flow
 * executor (authentik/flows/views/executor.py dispatch()), which persists
 * it into request.session[SESSION_KEY_GET] — a value that survives the
 * round trip to Google/GitHub and back because it's tied to the Django
 * session cookie, not the URL. Bypassing the flow entirely meant that state
 * was never seeded, so after the source login completed, Authentik had no
 * record of where to send the user and fell back to its own default
 * (authentik_core:if-user) instead of continuing to the OAuth2 authorize
 * endpoint — silently stranding the login before it ever reached our
 * /auth/login-callback.
 *
 * The flow executor also doesn't read `next` directly off the querystring —
 * it reads request.GET.get(QS_QUERY, "") and parses THAT as a nested query
 * string (QS_QUERY = "query"). So the URL has to carry
 * ?query=next%3D<url-encoded-authorize-url>, not a bare ?next=. Confirmed
 * directly against a live flow executor call: with the query= wrapper, the
 * flow's own response (cancel_url) correctly echoed the full next value
 * back; without it, next was silently dropped every time.
 */

const PROVIDER_FLOW: Record<string, string> = {
  google: "cig-google-login",
  github: "cig-github-login",
};

const PKCE_VERIFIER_COOKIE = "cig_pkce_verifier";
const PKCE_STATE_COOKIE = "cig_pkce_state";
const SOCIAL_PROVIDER_COOKIE = "cig_social_provider";
const PKCE_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!(provider in PROVIDER_FLOW)) {
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
  const authorizeUrl = buildAuthorizeUrl(authorizePath, {
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  const dashboardUrl = resolveDashboardUrl({
    hostname: req.nextUrl.hostname,
    protocol: req.nextUrl.protocol,
  });

  const flowUrl = new URL(`/if/flow/${PROVIDER_FLOW[provider]}/`, authBase);
  // Authentik's flow executor only honors `next` when wrapped: it reads
  // request.GET["query"] and re-parses that as a nested query string.
  flowUrl.searchParams.set("query", new URLSearchParams({ next: authorizeUrl }).toString());

  const response = NextResponse.redirect(flowUrl, 302);
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
