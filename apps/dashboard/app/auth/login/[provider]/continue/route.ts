import { NextRequest, NextResponse } from "next/server";

/**
 * GET /auth/login/[provider]/continue
 *
 * Server-side relay, step 2 of 2 — hit after Authentik's logout flow
 * redirects back here (see ../route.ts for why the logout hop exists and
 * why it lands here instead of chaining straight to Authentik's
 * source-login endpoint).
 *
 * Reconstructs the PKCE session entirely from the cookies step 1 set (no
 * query string needed), then performs the single clean redirect to
 * Authentik's /source/oauth/login/<provider>/ that skips its flow-executor
 * SPA and jumps straight to Google/GitHub.
 */

const ALLOWED_PROVIDERS = new Set(["google", "github"]);

const PKCE_VERIFIER_COOKIE = "cig_pkce_verifier";
const PKCE_STATE_COOKIE = "cig_pkce_state";
const PKCE_CLIENT_ID_COOKIE = "cig_pkce_client_id";
const PKCE_REDIRECT_URI_COOKIE = "cig_pkce_redirect_uri";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const verifier = req.cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const state = req.cookies.get(PKCE_STATE_COOKIE)?.value;
  const clientId = req.cookies.get(PKCE_CLIENT_ID_COOKIE)?.value;
  const redirectUri = req.cookies.get(PKCE_REDIRECT_URI_COOKIE)?.value;

  if (!verifier || !state || !clientId || !redirectUri) {
    return NextResponse.json({ error: "Missing or expired login session" }, { status: 400 });
  }

  const codeChallenge = await generateCodeChallenge(verifier);

  const authentikUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "https://auth.cig.technology";
  const authBase = authentikUrl.replace(/\/$/, "");
  const authorizePath = `${authBase}/application/o/authorize/`;
  const sourceLoginUrl = new URL(`/source/oauth/login/${provider}/`, authBase);
  sourceLoginUrl.searchParams.set("next", buildAuthorizeUrl(authorizePath, {
    clientId,
    redirectUri,
    state,
    codeChallenge,
  }));

  const response = NextResponse.redirect(sourceLoginUrl, 302);
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

function base64urlEncode(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(digest);
}
