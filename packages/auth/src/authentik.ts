"use client";

/**
 * Authentik PKCE OAuth2 helpers for client-side (static export) apps.
 *
 * Flow:
 *   1. buildAuthentikAuthUrl()  →  redirect browser to Authentik
 *   2. Authentik redirects back to redirect_uri with ?code=...&state=...
 *   3. exchangeAuthentikCode()  →  POST to Authentik token endpoint → tokens
 */

const VERIFIER_KEY = "cig_pkce_verifier";
const STATE_KEY    = "cig_pkce_state";

/* ── PKCE helpers ──────────────────────────────────────────────────────── */

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeVerifier(): Promise<string> {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return base64urlEncode(array.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(digest);
}

function generateState(): string {
  return base64urlEncode(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/* ── Public API ────────────────────────────────────────────────────────── */

export interface AuthentikConfig {
  /** e.g. https://auth.cig.technology */
  issuerUrl: string;
  clientId: string;
  /** Where Authentik should send the user back (must be registered in Authentik) */
  redirectUri: string;
}

/** Social provider slug as configured in Authentik sources */
export type AuthentikSocialProvider = "google" | "github";

/**
 * Build the Authentik authorization URL and store the PKCE verifier + state
 * in sessionStorage so exchangeAuthentikCode() can retrieve them.
 *
 * When `provider` is given, the PKCE params are stored and the caller should
 * use `startAuthentikSocialLogin()` instead to perform the two-step redirect
 * that seeds the Authentik session before navigating to the social provider.
 */
export async function buildAuthentikAuthUrl(
  config: AuthentikConfig,
): Promise<string> {
  const verifier  = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state     = generateState();

  try {
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    // sessionStorage unavailable (private mode) — PKCE still works, state check skipped
  }

  const oidcParams = new URLSearchParams({
    response_type:         "code",
    client_id:             config.clientId,
    redirect_uri:          config.redirectUri,
    scope:                 "openid email profile",
    state,
    code_challenge:        challenge,
    code_challenge_method: "S256",
  });

  return `${config.issuerUrl}/application/o/authorize/?${oidcParams}`;
}

/**
 * Start a direct social login via Google or GitHub, bypassing the Authentik UI.
 *
 * How it works:
 *   1. Generate PKCE params, store verifier + state in sessionStorage.
 *   2. Navigate to the dashboard relay route /auth/login/<provider>?<pkce-params>.
 *   3. The relay redirects to auth.cig.technology/source/oauth/login/<provider>/
 *      with ?next=/application/o/authorize/?<pkce> — Authentik goes straight to Google/GitHub.
 *   4. After social auth: Google/GitHub → Authentik callback → source flow → user logged in →
 *      follows ?next= → OIDC authorize (user is now authenticated) → issues code → redirect_uri.
 *   5. exchangeAuthentikCode() reads the verifier from sessionStorage and exchanges it.
 *
 * `dashboardUrl` must be the origin of the dashboard app (e.g. https://app.cig.lat
 * or http://localhost:3001) — the relay route lives there.
 */
export async function startAuthentikSocialLogin(
  config: AuthentikConfig,
  provider: AuthentikSocialProvider,
  dashboardUrl: string,
): Promise<void> {
  // Clear any stale session tokens before starting a new login to prevent
  // identity bleed (showing a previous user's info if the new flow fails
  // or returns different claims).
  try {
    sessionStorage.removeItem("cig_access_token");
    sessionStorage.removeItem("cig_id_token");
    sessionStorage.removeItem("cig_refresh_token");
    sessionStorage.removeItem("cig_expires_in");
    sessionStorage.removeItem("cig_expires_at");
  } catch { /* ignore */ }

  const verifier  = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state     = generateState();

  try {
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem("cig_social_provider", provider);
  } catch {
    // sessionStorage unavailable — continue without state check
  }

  // Pass PKCE params to the relay route on the dashboard origin.
  // The verifier must travel to the dashboard origin so /auth/login-callback can
  // complete the exchange. The relay route stores it in short-lived cookies before
  // redirecting to Authentik.
  const relayParams = new URLSearchParams({
    client_id:             config.clientId,
    redirect_uri:          config.redirectUri,
    state,
    code_challenge:        challenge,
    code_challenge_method: "S256",
    code_verifier:         verifier,
  });

  const base = dashboardUrl.replace(/\/$/, "");
  window.location.replace(`${base}/auth/login/${provider}?${relayParams}`);
}

export interface AuthentikTokens {
  access_token:  string;
  id_token:      string;
  refresh_token?: string;
  expires_in:    number;
  token_type:    string;
}

/**
 * Build the RP-initiated logout URL for the current Authentik OIDC session.
 * Uses the `iss` claim from the id_token so the app does not need a separate
 * public issuer env var.
 */
export function buildAuthentikEndSessionUrl(
  idToken: string,
  postLogoutRedirectUri?: string,
): string | null {
  const payload = decodeJwtPayload(idToken);
  const issuer = typeof payload?.iss === "string" ? payload.iss : "";
  if (!issuer) return null;

  const baseIssuer = issuer.endsWith("/") ? issuer : `${issuer}/`;
  const url = new URL("end-session/", baseIssuer);
  url.searchParams.set("id_token_hint", idToken);
  if (postLogoutRedirectUri) {
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  }
  return url.toString();
}

/**
 * Exchange the authorization code from the callback URL for tokens.
 * Reads the PKCE verifier from sessionStorage.
 */
export async function exchangeAuthentikCode(
  config: AuthentikConfig,
  code: string,
  returnedState?: string
): Promise<AuthentikTokens> {
  // Verify state to prevent CSRF
  try {
    const savedState = sessionStorage.getItem(STATE_KEY);
    if (savedState && returnedState && savedState !== returnedState) {
      throw new Error("State mismatch — possible CSRF attack");
    }
    sessionStorage.removeItem(STATE_KEY);
  } catch (e) {
    if ((e as Error).message.includes("State mismatch")) throw e;
    // sessionStorage unavailable — skip state check
  }

  const verifier = (() => {
    try { return sessionStorage.getItem(VERIFIER_KEY) ?? ""; }
    catch { return ""; }
  })();

  const body = new URLSearchParams({
    grant_type:    "authorization_code",
    client_id:     config.clientId,
    redirect_uri:  config.redirectUri,
    code,
    code_verifier: verifier,
  });

  const resp = await fetch(`${config.issuerUrl}/application/o/token/`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  const tokens: AuthentikTokens = await resp.json();

  try { sessionStorage.removeItem(VERIFIER_KEY); } catch { /* ignore */ }

  return tokens;
}

/**
 * Revoke the current session token from Authentik (sign out).
 */
export async function revokeAuthentikToken(
  config: AuthentikConfig,
  token: string
): Promise<void> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    token,
  });
  await fetch(`${config.issuerUrl}/application/o/revoke/`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
    keepalive: true,
  }).catch(() => {
    // Ignore revocation errors — session will expire naturally
  });
}
