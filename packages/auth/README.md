# @cig/auth

Authentication package for the CIG (Compute Intelligence Graph) platform.

Supports **Authentik** (primary, OIDC/PKCE) and **Supabase** (fallback) as auth backends, switchable via the `NEXT_PUBLIC_AUTH_PROVIDER` environment variable.

## Exports

| Entry point       | Description                                         |
| ------------------ | --------------------------------------------------- |
| `@cig/auth`        | Client-safe helpers: PKCE flow, Supabase client, OTP |
| `@cig/auth/server`  | Server-only: OIDC adapter, JWT verification (jose)   |
| `@cig/auth/provider` | React `<CIGAuthProvider>` context component          |
| `@cig/auth/client`   | Supabase browser client singleton                    |

## Authentik PKCE Flow

This package now tracks `@edcalderon/auth@1.4.1` as the shared baseline. The
published package adds a reusable Authentik kit (`authentik` subpath) for
relay, callback, logout, provisioning, endpoint discovery, and redirect
validation. CIG now consumes those shared primitives directly in the dashboard
relay, login-callback bridge, and landing logout flow, while the local wrapper remains as
compatibility glue for any legacy callers that still import `@cig/auth`.
The dashboard login-callback route now derives provisioning claims from the
`id_token` locally so login does not depend on Authentik `userinfo` CORS behavior.

The platform uses OAuth 2.0 Authorization Code with PKCE (S256) for browser-based authentication. Social providers (Google, GitHub) are supported via Authentik source integrations.

### Key functions

```ts
import {
  buildAuthentikAuthUrl,
  startAuthentikSocialLogin,
  exchangeAuthentikCode,
  revokeAuthentikToken,
} from "@cig/auth";
```

- **`buildAuthentikAuthUrl(config)`** — Generates PKCE verifier/challenge, stores in `sessionStorage`, returns the Authentik authorize URL.
- **`startAuthentikSocialLogin(config, provider, dashboardUrl)`** — Initiates a direct social login (Google/GitHub) bypassing the Authentik login UI. Navigates to a dashboard relay route that bridges the PKCE verifier across origins with short-lived cookies.
- **`exchangeAuthentikCode(config, code, state?)`** — Exchanges the authorization code for tokens via the Authentik token endpoint. Validates state and reads the PKCE verifier from `sessionStorage`.
- **`revokeAuthentikToken(config, token)`** — Revokes a token on sign-out.

### Configuration

```ts
interface AuthentikConfig {
  issuerUrl: string;    // e.g. "https://auth.cig.technology"
  clientId: string;     // OIDC public client ID
  redirectUri: string;  // e.g. "https://app.cig.technology/auth/callback"
}
```

### Environment Variables

| Variable                          | Default                        | Description                              |
| --------------------------------- | ------------------------------ | ---------------------------------------- |
| `NEXT_PUBLIC_AUTH_PROVIDER`       | `"authentik"`                  | Auth backend: `"authentik"` or `"supabase"` |
| `NEXT_PUBLIC_AUTHENTIK_URL`       | `"https://auth.cig.technology"` | Authentik issuer URL                     |
| `NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` | required                       | OIDC client ID                           |
| `NEXT_PUBLIC_DASHBOARD_URL`       | `"http://localhost:3001"`      | Dashboard origin (for relay route)       |
| `NEXT_PUBLIC_SITE_URL`            | `"http://localhost:3000"`      | Landing page origin                      |
| `NEXT_PUBLIC_SUPABASE_URL`        | —                              | Supabase URL (fallback mode only)        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | —                              | Supabase anon key (fallback mode only)   |

## Architecture

See [docs/authentication/README.md](../../docs/authentication/README.md) for the complete flow diagrams, cross-origin bridging details, and Authentik configuration guide.

## Session Storage Keys

All session data is stored in `sessionStorage` (per-origin, cleared on browser close):

| Key                    | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `cig_access_token`     | Authentik OAuth access token                     |
| `cig_id_token`         | OIDC ID token (contains user claims)             |
| `cig_refresh_token`    | OAuth refresh token                              |
| `cig_expires_in`       | Token lifetime in seconds                        |
| `cig_expires_at`       | Expiry timestamp (ms since epoch)                |
| `cig_social_provider`  | Social provider slug (`"google"`, `"github"`)    |
| `cig_pkce_verifier`    | PKCE code verifier (cleared after token exchange) |
| `cig_pkce_state`       | OAuth state parameter (cleared after validation) |

A `cig_has_session` cookie (`SameSite=Lax`, `Secure` in production) is set so server-side middleware can gate protected routes without reading `sessionStorage`.

## Security

- **PKCE S256**: 256-bit random verifier, SHA-256 challenge. No implicit/plain flows.
- **State validation**: 128-bit random state parameter prevents CSRF.
- **Open redirect protection**: Callback validates redirect URLs against allowed origins.
- **Token isolation**: `sessionStorage` is per-origin and per-tab session.
- **Stale token clearing**: All `cig_*` keys are cleared before storing new tokens to prevent identity bleed.
- **Token revocation**: Sign-out revokes the access token server-side via Authentik.
- **Secure cookies**: `cig_has_session` cookie includes `Secure` flag over HTTPS.
