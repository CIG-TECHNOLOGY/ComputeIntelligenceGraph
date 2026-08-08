import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  getSupabaseAdminConfig,
  syncOidcUserToSupabase,
  type OidcSyncPayload,
} from "../../../lib/authSync";
import { resolveDashboardUrl, resolveLandingUrl } from "../../../lib/siteUrl";

const PKCE_VERIFIER_COOKIE = "cig_pkce_verifier";
const PKCE_STATE_COOKIE = "cig_pkce_state";
const SOCIAL_PROVIDER_COOKIE = "cig_social_provider";

const AUTH_SYNC_MAX_ATTEMPTS = 2;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const verifier = req.cookies.get(PKCE_VERIFIER_COOKIE)?.value ?? "";
  const savedState = req.cookies.get(PKCE_STATE_COOKIE)?.value ?? "";
  const socialProvider = req.cookies.get(SOCIAL_PROVIDER_COOKIE)?.value ?? "sso";
  const dashboardUrl = resolveDashboardUrl({
    hostname: req.nextUrl.hostname,
    protocol: req.nextUrl.protocol,
  });

  try {
    if (!code) {
      throw new Error("Missing authorization code");
    }
    if (!verifier || !savedState) {
      throw new Error("Missing login relay state");
    }
    if (state !== savedState) {
      throw new Error("Invalid callback state — possible CSRF or expired session");
    }

    const issuer = getAuthentikIssuer();
    const redirectUri = new URL("/auth/login-callback", dashboardUrl).toString();
    const tokens = await exchangeAuthentikCode({
      issuer,
      clientId: getAuthentikClientId(),
      clientSecret: getAuthentikClientSecret(),
      redirectUri,
      code,
      verifier,
    });

    const claims = buildClaimsFromTokens(tokens.id_token ?? tokens.access_token, issuer);
    await provisionUser({
      sub: claims.sub,
      iss: claims.iss,
      email: (claims.email ?? "").toLowerCase(),
      emailVerified: claims.email_verified,
      name: claims.name ?? claims.preferred_username,
      picture: claims.picture,
      provider: socialProvider,
      rawClaims: claims,
    });

    const response = NextResponse.redirect(buildLandingRedirect(tokens, socialProvider), 302);
    clearPkceCookies(response, dashboardUrl);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    return response;
  } catch (error) {
    console.error("[auth/login-callback] Authentik callback failed:", error);

    const response = new NextResponse(renderFailurePage(resolveLandingUrl()), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
      },
    });
    clearPkceCookies(response, dashboardUrl);
    return response;
  }
}

function buildLandingRedirect(
  tokens: {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  },
  socialProvider: string,
): URL {
  const target = new URL(resolveLandingUrl());
  const hash = new URLSearchParams({
    access_token: tokens.access_token,
    ...(tokens.id_token && { id_token: tokens.id_token }),
    expires_in: String(tokens.expires_in ?? 3600),
    ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    ...(socialProvider && { social_provider: socialProvider }),
  });
  target.hash = hash.toString();
  return target;
}

function clearPkceCookies(response: NextResponse, dashboardUrl: string) {
  const secure = dashboardUrl.startsWith("https://");
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(PKCE_VERIFIER_COOKIE, "", cookieOptions);
  response.cookies.set(PKCE_STATE_COOKIE, "", cookieOptions);
  response.cookies.set(SOCIAL_PROVIDER_COOKIE, "", cookieOptions);
}

async function exchangeAuthentikCode(params: {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): Promise<{
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const issuerUrl = ensureTrailingSlash(params.issuer);
  const tokenEndpoint = new URL("../token/", issuerUrl).toString();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.verifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const tokens = await response.json().catch(() => null) as
    | {
        access_token?: string;
        id_token?: string;
        refresh_token?: string;
        expires_in?: number;
      }
    | null;

  if (!tokens?.access_token) {
    throw new Error("Token exchange failed: missing access token");
  }

  return {
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in ?? 3600,
  };
}

async function provisionUser(payload: OidcSyncPayload) {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error("supabase_not_configured");
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < AUTH_SYNC_MAX_ATTEMPTS; attempt += 1) {
    try {
      const client = createSupabaseAdminClient(config);
      await syncOidcUserToSupabase(client, payload);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < AUTH_SYNC_MAX_ATTEMPTS - 1) {
        await delay(250 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Supabase provisioning failed");
}

function buildClaimsFromTokens(
  token: string,
  issuer: string,
): {
  sub: string;
  iss: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
} {
  const claims = decodeJwtPayload(token) ?? {};
  const sub = pickString(claims.sub);
  if (!sub) {
    throw new Error("SESSION_ERROR: ID token missing required claim (sub)");
  }

  return {
    sub,
    iss: pickString(claims.iss) ?? issuer,
    email: pickString(claims.email),
    email_verified: pickBoolean(claims.email_verified),
    name: pickString(claims.name),
    preferred_username: pickString(claims.preferred_username),
    picture: pickString(claims.picture),
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function pickBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function getAuthentikIssuer(): string {
  const base = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "https://auth.cig.technology";
  return new URL("/application/o/cig-dashboard/", base).toString();
}

function getAuthentikClientId(): string {
  const clientId = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_AUTHENTIK_CLIENT_ID is required for Authentik social login");
  }
  return clientId;
}

// Server-side only — never exposed to the browser. The cig-dashboard provider
// is a confidential OAuth2 client; this code exchange runs in the Route
// Handler (Node.js runtime), so holding the secret here is safe.
function getAuthentikClientSecret(): string {
  const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET?.trim();
  if (!clientSecret) {
    throw new Error("AUTHENTIK_CLIENT_SECRET is required for Authentik social login");
  }
  return clientSecret;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderFailurePage(landingUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authentication failed</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #09090b;
        color: #f4f4f5;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .card {
        max-width: 28rem;
        padding: 1.5rem;
        text-align: center;
      }
      a {
        display: inline-block;
        margin-top: 1rem;
        color: #67e8f9;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Authentication failed</h1>
      <p>Please return to the landing page and try again.</p>
      <a href="${landingUrl}">Back to landing</a>
    </div>
  </body>
</html>`;
}
