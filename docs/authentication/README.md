# CIG Authentication Architecture

This document describes the current authentication setup used by CIG and the Authentik resources that make it work. It also calls out the provider-agnostic pattern to follow when adding another social identity source or another relying party.

Repository paths, linked docs, and production-origin references were rechecked against the codebase on `2026-03-29`.

Last audited against the live Authentik tenant on `2026-03-22`.

## Related Docs

- Root overview: [../../README.md](../../README.md)
- Status snapshot: [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md)
- Deployment notes: [../deployment/README.md](../deployment/README.md)

## Overview

CIG uses **Authentik** as the primary identity provider and **Supabase** as a feature-flagged fallback. The primary path is:

1. Start OIDC Authorization Code + PKCE from the landing app
2. Bounce through the dashboard relay route so PKCE state exists in short-lived cookies on the dashboard origin
3. Enter Authentik through a provider-specific social login flow
4. Exchange the OIDC code on the dashboard login-callback bridge
5. Provision or update the user in Supabase `auth.users` and `public.users`
6. Return the tokens to landing through a hash fragment
7. Use the landing app as the canonical logout orchestrator

### Auth/API boundary rule

- Browser-specific auth bridges can live in dashboard route handlers when they need cookies, server-side secrets, or callback orchestration.
- Device authorization, session management, token refresh, and general domain endpoints belong in the standalone API package.
- Client consumers should reach those API capabilities through `packages/sdk` rather than duplicating raw endpoint calls per surface.

### Current production principals

| Component | Production origin | Role |
| --------- | ----------------- | ---- |
| Landing (`apps/landing`) | `https://cig.lat` | Public entrypoint, login buttons, canonical logout completion target |
| Dashboard (`apps/dashboard`) | `https://app.cig.lat` | Protected app, PKCE relay, login callback bridge |
| Authentik | `https://auth.cig.technology` | OIDC provider, user directory, social-source broker |
| Google / GitHub | External | Upstream social identity providers |

## Current login flow

### Social login sequence

```
Landing (cig.lat)                  Dashboard (app.cig.lat)                   Authentik                    Google/GitHub
       |                                      |                                  |                              |
  1. User clicks a social login button         |                                  |                              |
       |                                      |                                  |                              |
  2. startAuthentikSocialLogin()              |                                  |                              |
     - Generate PKCE verifier + challenge      |                                  |                              |
     - Generate state                          |                                  |                              |
     - Store verifier/state/provider in        |                                  |                              |
       landing sessionStorage                  |                                  |                              |
     - Navigate to dashboard relay route       |                                  |                              |
       |                                      |                                  |                              |
       |-------- GET /auth/login/{provider} -->|                                  |                              |
       |                                      |                                  |                              |
  3.   |                            Relay response stores verifier/state/provider  |                              |
       |                            in dashboard cookies and redirects into       |                              |
       |                            an Authentik flow                              |                              |
       |                                      |                                  |                              |
       |                                      |--- /if/flow/cig-{provider}-login/|                              |
       |                                      |    ?next=/application/o/authorize |                              |
       |                                      |                                  |                              |
  4.   |                                      |                     Redirect stage points to                     |
       |                                      |                     /source/oauth/login/{provider}/             |
       |                                      |                                  |                              |
       |                                      |                                  |--- OAuth2 authorize -------->|
       |                                      |                                  |                              |
  5.   |                                      |                                  |<--- provider callback ------|
       |                                      |                                  |                              |
  6.   |                                      |                     Authentik links or enrolls the user,        |
       |                                      |                     runs source property mappings,              |
       |                                      |                     resumes ?next= authorization,               |
       |                                      |                     and issues the CIG auth code               |
       |                                      |                                  |                              |
  7.   |                                      |<-- /auth/callback?code=...&state=...                           |
       |                                      |                                  |                              |
  8.   |                            login-callback bridge                         |                              |
       |                            - Validate state                             |                              |
       |                            - Read verifier from dashboard cookies       |                              |
       |                            - POST /application/o/token/                 |                              |
       |                            - Provision Supabase                         |                              |
       |                            - Redirect to landing with token hash        |                              |
       |                                      |                                  |                              |
  9.   |<------- hash fragment redirect ------|                                  |                              |
       |            #access_token=...&id_token=...&expires_in=...                |                              |
       |                                      |                                  |                              |
 10. Landing AuthProvider stores the tokens, decodes id_token claims, and clears the hash                          |
```

### Why the relay route exists

The landing app and dashboard are different origins. `sessionStorage` is origin-scoped, so the PKCE verifier created on landing would not be visible to the dashboard login-callback bridge. The relay route on the dashboard origin solves that by writing the PKCE verifier into short-lived cookies before entering Authentik.

That removes the rendered "redirecting" interstitial while keeping the same origin boundary and PKCE safety model.

The login-callback bridge also rebuilds the callback URL from the configured dashboard origin, not from the incoming request URL. That matters behind HTTPS-terminating proxies, where the internal request scheme can be `http:` even though the public callback must stay `https://app.cig.lat/auth/callback`.

### Why per-provider login flows exist

Authentik's default login UI is intentionally bypassed for social login. Each upstream social provider gets its own Authentik **authentication** flow with a single **Redirect Stage**:

| Flow slug | Redirect target |
| --------- | --------------- |
| `cig-google-login` | `/source/oauth/login/google/` |
| `cig-github-login` | `/source/oauth/login/github/` |

That keeps the RP flow explicit and avoids accidental dependence on whatever the tenant's default login screen happens to show.

## Current provisioning flow

Authentik is the identity source, but the login-callback bridge is the point where that identity is mirrored into Supabase.

```
Authentik login succeeds              Login callback                        Supabase
         |                                   |                                 |
  1. User exists in Authentik                |                                 |
     and source link is resolved             |                                 |
         |                                   |                                 |
  2. Redirect back with OIDC code ---------->|                                 |
         |                                   |                                 |
  3. token exchange stores tokens             |                                 |
         |                                   |                                 |
  4. POST /api/auth/sync ------------------->|                                 |
         |                                   |                                 |
  5. Server route ensures a shadow user in   |-------------------------------> |
     `auth.users` using the service role     |    create/update auth user      |
         |                                   |                                 |
  6. Server route upserts `public.users`     |-------------------------------> |
     keyed by `(sub, iss)`                   |    upsert_oidc_user RPC         |
         |                                   |                                 |
  7. Only after sync succeeds does the       |                                 |
     callback redirect to landing            |                                 |
```

### Current provisioning guarantees

- Authentik-backed logins are blocked until Supabase provisioning succeeds.
- The login-callback bridge fails closed if provisioning fails, so users do not continue with a half-signed-in state.
- Supabase `auth.users` is matched by Authentik `(issuer, sub)` first and by email second, which prevents duplicate shadow users on repeat Google/GitHub logins.
- Supabase `public.users` remains the app-owned registry keyed by `(sub, iss)`, while the corresponding Supabase auth user id is written into `raw_claims`.
- The login-callback bridge derives claims from the `id_token` first and uses the configured OIDC issuer as `iss`, which avoids a browser-side `userinfo` fetch and keeps the login flow independent of Authentik CORS behavior.

### Required dashboard runtime configuration

The provisioning route is server-side. Production must provide these variables to the dashboard runtime, not only to the frontend build:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Important rules:

- never expose `SUPABASE_SERVICE_ROLE_KEY` through `next.config.js env` or any `NEXT_PUBLIC_*` variable
- build-time `NEXT_PUBLIC_SUPABASE_URL` is not enough for server provisioning
- the deployed dashboard container must receive the service-role key as a runtime env var
- a successful Docker build does **not** prove runtime provisioning is configured; the login path still fails if the deployed service does not have these runtime vars

### Current production deploy mapping

In the current CIG dashboard deploy workflow, the runtime vars are expected to come from GitHub Actions secrets:

- `SUPABASE_URL <- secrets.NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY <- secrets.SUPABASE_SERVICE_ROLE_KEY`

If `secrets.SUPABASE_SERVICE_ROLE_KEY` is missing or empty, the deployment can still build and publish the dashboard image, but Authentik-backed login will fail during the provisioning step at runtime.

### Provisioning failure mode and troubleshooting

When the dashboard runtime is missing its Supabase admin config, the failure is intentionally fail-closed.

Expected symptoms:

- the login-callback bridge shows a failure page
- the browser console logs: `[auth/login-callback] Authentik callback failed ...`
- the dashboard `/api/auth/sync` route returns `503` with `{"synced":false,"reason":"supabase_not_configured"}`

What that means:

- `SUPABASE_SERVICE_ROLE_KEY` is missing in the dashboard runtime, or
- both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` are unavailable to the server route

What the app does on purpose:

- blocks entry into the protected app
- clears the local `cig_*` session state
- sends the user back to sign-in instead of allowing a half-provisioned session

What to fix:

- ensure the dashboard runtime has both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- confirm the GitHub Actions secret `SUPABASE_SERVICE_ROLE_KEY` exists for the dashboard deploy workflow
- redeploy the dashboard after fixing the runtime env
- rerun one real social-login smoke test after deploy, because this failure only appears when the server-side sync route is exercised

If the failure only happens in production and the logs mention a redirect URI mismatch, also confirm `NEXT_PUBLIC_DASHBOARD_URL` resolves to the public dashboard origin (`https://app.cig.lat`) so the login-callback bridge exchanges the code against the registered callback URL.

### Authentik client ID: build-time requirement and error path

`NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` is baked into the Next.js bundle at build time. Unlike the Supabase runtime vars above, setting it after build has no effect — the value in the deployed bundle controls which OIDC client ID the frontend uses.

**Where it comes from:**

- Local builds: falls back to `'cig-dashboard'` (the Authentik application slug)
- CI builds: the deploy workflow sets it from `vars.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` with the same `'cig-dashboard'` fallback
- If `NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` is absent in CI (`process.env.CI === 'true'`), `next.config.js` throws `NEXT_PUBLIC_AUTHENTIK_CLIENT_ID is required to build the [dashboard|landing] app` and aborts the build

**Previous incident — wrong client ID in the fallback:**

Before commit `d4aea56` (2026-06-30), the fallback in both `apps/dashboard/next.config.js` and `apps/landing/next.config.js` was set to a non-slug value (`G4D6S7WXUoCNZxY7uZSbD08zO3cuXEZwSyUATw2v`) instead of the Authentik application slug. When `NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` was not provided to a build, that stale value was baked in.

Authentik checks the `client_id` parameter in the OIDC authorization request against registered applications. An unrecognised value causes Authentik to immediately return:

```
error=invalid_client&error_description=No+matching+client+was+found
```

The browser is redirected back to the callback URL with this error, and the login-callback bridge logs:

```
[auth/login-callback] Authentik callback failed — Authentik returned an error during authorization: invalid_client
```

**How the fix works:**

The correct client ID is the Authentik **application slug** (`cig-dashboard`), not the OIDC client secret or any other credential. The fallback is now `'cig-dashboard'` so a build without the env var still uses the right value in non-CI environments. In CI the guard throws, forcing the deploy workflow to supply the value explicitly.

**What to check if the error recurs:**

1. Confirm the Authentik provider for `CIG Dashboard` is still registered with slug `cig-dashboard` in the live tenant.
2. Confirm the deploy workflow `vars.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` matches that slug.
3. If a new Authentik application is registered with a different slug, update both the GitHub variable and the fallback in `apps/dashboard/next.config.js` and `apps/landing/next.config.js`.

## Current logout flow

Logout is intentionally centralized in the landing app, even when the user clicks logout inside the dashboard.

```
Dashboard or Landing                  Landing                              Authentik
        |                               |                                     |
  1. Dashboard logout redirects -------->| ?signout=1                          |
        |                               |                                     |
  2. Landing signOut()                  |                                     |
     - Best-effort revoke access token  |                                     |
     - Clear local `cig_*` session keys |                                     |
     - Build RP-initiated end-session   |                                     |
       URL using `id_token_hint`        |                                     |
     - Set post_logout_redirect_uri     |                                     |
       to `https://cig.lat/?logged_out=1`                                     |
        |------------------------------>| /end-session/...                     |
        |                               |                                     |
  3. Authentik provider invalidation flow runs                                 |
     - User Logout stage ends the authentik browser session                    |
     - Redirect stage sends the browser back to landing                        |
        |<------------------------------|                                     |
        |                               |                                     |
  4. Landing loads `?logged_out=1`, cleans the URL, and remains signed out     |
```

### Important logout design rules

- The app clears its own session **before** leaving for Authentik so a partially completed remote logout does not leave stale local identity visible.
- The post-logout target is always the landing root with `?logged_out=1`, not the current pathname, so logout completion is deterministic.
- If you keep using `default-provider-invalidation-flow`, every RP that shares it will inherit the same post-logout behavior.
- Once multiple relying parties need different logout destinations, create a provider-specific invalidation flow instead of hardcoding a shared default flow.

### Known limitation

- If Authentik shows its `Logout successful` page and does not return to `/?logged_out=1`, the local app logout has still completed. The remaining redirect is Authentik-side behavior, not a critical app failure.
- We keep this documented as non-blocking for local development and for the current tenant configuration.
- The proper long-term fix is a provider-specific invalidation flow or an upstream Authentik change that consistently honors the logout redirect target.
- Track the upstream discussion here: https://github.com/goauthentik/authentik/issues/10430

## Authentik resources CIG depends on

### 1. OIDC provider and application

Current live CIG production provider:

- Provider: `CIG Dashboard`
- Client type: `public`
- Authorization flow: `default-provider-authorization-implicit-consent`
- Redirect URIs:
  - `https://app.cig.lat/auth/callback`
  - `http://localhost:3001/auth/callback`
  - The dashboard middleware forwards these code callbacks internally to `/auth/login-callback`.
- Scope mappings currently attached:
  - `authentik default OAuth Mapping: OpenID 'openid'`
  - `authentik default OAuth Mapping: OpenID 'email'`
  - `authentik default OAuth Mapping: OpenID 'profile'`
- Invalidation flow: `default-provider-invalidation-flow`

Provider-agnostic requirement:

- Every relying party needs an application/provider pair with redirect URIs for every environment it serves.
- For browser-only apps, use PKCE and avoid client secrets in the frontend.
- Decide the invalidation flow deliberately. The Authentik default is not enough if you want RP logout to also end the Authentik browser session and return to the application.

### 2. OAuth sources

Current live CIG sources:

- `google`
- `github`

Each live source currently uses:

- callback URL in the upstream provider console:
  `https://auth.cig.technology/source/oauth/callback/{provider}/`
- authentication flow: `default-source-authentication`
- enrollment flow: `cig-source-enrollment`
- matching mode: `identifier`

Why `identifier` matters:

- source links are based on the upstream account binding, not on email equality
- this avoids silently merging accounts just because two providers share an email address

### 3. Verified flow layout

The live Authentik tenant currently has these relevant flow-stage bindings:

- `cig-google-login`
  - order `10`: `cig-redirect-google-source`
- `cig-github-login`
  - order `10`: `cig-redirect-github-source`
- `default-source-authentication`
  - order `0`: `default-source-authentication-login`
- `cig-source-enrollment`
  - order `0`: `cig-source-enrollment-write`
  - order `1`: `cig-source-enrollment-login`
- `default-provider-invalidation-flow`
  - order `0`: `CIG: Full logout`
  - order `10`: `CIG: Return to landing after logout`
- `default-invalidation-flow`
  - order `0`: `default-invalidation-logout`

This is the actual current tenant wiring that the application depends on. If any of these flow slugs or stage names change in Authentik, this document should be updated in the same change.

Provider-agnostic rule:

- keep the login, enrollment, and invalidation flows explicit and named per use case
- document the real flow slugs and stage bindings, not just the conceptual intent

### 4. Mappings and claim-shaping notes

The live provider audit on `2026-03-22` verified the attached OIDC scope mappings, but this repo does not currently provision or export the full claim-shaping expressions from the Authentik tenant.

That means the source of truth for:

- custom source property mappings
- any modifications to the default `profile` scope mapping
- any extra custom claims beyond `openid`, `email`, and `profile`

is still the live Authentik tenant, not infrastructure code in this repository.

Provider-agnostic rule:

- if a relying party depends on custom claims such as avatar URLs, group lists, or normalized provider metadata, codify those mappings in exportable Authentik config or IaC and then document that exported form here
- do not leave custom claim behavior described only from memory

### 5. Per-provider login flows

For every upstream social provider CIG exposes directly in the landing UI:

1. Create an **Authentication** flow named `cig-{provider}-login`
2. Bind a **Redirect Stage**
3. Set the Redirect Stage to static mode
4. Point it at `/source/oauth/login/{provider}/`

This keeps the app's social buttons mapped to explicit Authentik resources instead of implicit tenant defaults.

### 6. Provider invalidation flow

This is the resource that fixes the logout issue that originally caused users to remain attached to the previous Authentik browser session.

Minimum working pattern:

1. Use an **Invalidation** flow for the provider
2. Add a **User Logout** stage so RP logout also ends the Authentik session
3. Add a **Redirect Stage** after it so the browser returns to the application

Current CIG production behavior:

- the `CIG Dashboard` provider uses `default-provider-invalidation-flow`
- that flow must contain:
  - `CIG: Full logout`
  - `CIG: Return to landing after logout`
  - the redirect target `https://cig.lat/?logged_out=1`

Recommended provider-agnostic pattern:

- create a dedicated invalidation flow per relying party when different apps need different logout destinations
- reserve `default-provider-invalidation-flow` for shared behavior only
- if you need the redirect target to vary dynamically, use a Redirect Stage plus policy-driven `redirect_stage_target`

## Token and session lifecycle

| Event | Action |
| ----- | ------ |
| Login start | Clear `cig_*` session keys before writing new PKCE/session state |
| Relay route | Store verifier, state, and provider in dashboard cookies |
| Login callback | Exchange code, provision Supabase, and return tokens to landing |
| Dashboard callback | Store landing-provided tokens in session storage and set `cig_has_session` |
| Cross-origin return | Pass tokens back to landing via hash fragment |
| Page load | `AuthProvider` reads session storage and decodes the id token |
| Local logout | Clear local `cig_*` state immediately |
| Remote logout | Revoke access token best-effort, then call Authentik end-session |
| Logout completion | Return to `/?logged_out=1`, clean URL, remain signed out |

## Supabase fallback

Set `NEXT_PUBLIC_AUTH_PROVIDER=supabase` to use the fallback path:

- login uses Supabase OAuth instead of the Authentik PKCE flow
- user state comes from `supabase.auth.getSession()` and `onAuthStateChange()`
- logout calls `supabase.auth.signOut()`

The fallback is implementation-compatible at the app level, but it does not use Authentik login flows, Authentik source mappings, or Authentik invalidation flows.

When Authentik remains the primary IdP, Supabase acts as a mirrored local registry:

- `auth.users` holds a shadow account for rollback and future migration scenarios
- `public.users` holds the app-owned user registry keyed by Authentik `sub` + `iss`
- the login-callback route is the bridge that keeps both in sync

### Passwordless: OTP and Magic Link together

Supabase can send either a 6-digit OTP code or a magic link using the same `signInWithOtp()` call. Which one is sent is controlled by the email template variables, not by the client code.

- Rule: If the template contains `{{ .Token }}`, the email includes a one‑time code.
- Rule: If the template contains `{{ .ConfirmationURL }}`, the email includes a magic link.
- If you include both variables in the "Sign in" email template, users receive both the code and a clickable link in a single email, and both flows in the UI work concurrently.

How to enable both at once:
- In Supabase Dashboard → Authentication → Email Templates → "Sign in".
- Edit the body to include both variables, for example:

  Your sign-in code: {{ .Token }}

  Or click to sign in: {{ .ConfirmationURL }}

- Ensure your Redirect URLs allow the dashboard callback (e.g. `https://app.cig.lat/auth/callback` and `http://localhost:3001/auth/callback`).
- Keep the client calls as implemented:
  - OTP flow: `signInWithOtp({ email, options: { shouldCreateUser: true } })` then `verifyOtp({ email, token, type: 'email' })`.
  - Magic link flow: `signInWithOtp({ email, options: { emailRedirectTo: '<dashboard>/auth/callback', shouldCreateUser: true } })`.

Notes:
- You do not need to flip a project-wide toggle to switch between OTP and magic link if the template includes both tokens; the single email will support either action.
- If you only see magic links (no code), your template likely lacks `{{ .Token }}`.
- If you only see codes (no link), your template likely lacks `{{ .ConfirmationURL }}`.

## Security and failure-mode notes

| Measure | Implementation |
| ------- | -------------- |
| PKCE S256 | random verifier + SHA-256 challenge |
| CSRF protection | state parameter validated on callback |
| Origin isolation | verifier lives in dashboard cookies on the origin that completes the callback |
| Identity bleed prevention | all `cig_*` session keys are cleared before new login data is stored |
| Local-first logout | local app state is cleared before remote logout finishes |
| Remote token revocation | access token revocation is best-effort and uses `keepalive` |
| Authentik session termination | provider invalidation flow includes `User Logout` |
| Deterministic return target | logout completes on `/?logged_out=1` |
| Open redirect protection | callback validates redirect targets against allowed origins |
| Provisioning guard | login-callback route waits for Supabase sync before redirecting |
| Supabase shadow identity | `auth.users` is matched by Authentik identity first, then email |

## Drift checks

Before trusting this document after Authentik admin changes, re-check these live tenant values:

- provider redirect URIs for `CIG Dashboard`
- source `user_matching_mode` for `google` and `github`
- `default-provider-invalidation-flow` stage bindings
- `cig-google-login` and `cig-github-login` redirect stages
- `default-source-authentication` and `cig-source-enrollment` bindings
- default brand `default_application_id` points to `CIG Dashboard`; if this is blank, external users can hit the Authentik "Interface can only be accessed by internal users" denial page after login/enrollment
- dashboard runtime env includes `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_AUTHENTIK_CLIENT_ID` build-time var matches the live Authentik application slug (`cig-dashboard`); a mismatch causes `invalid_client` on the first OIDC authorization redirect

This is the minimum audit set that caught the March 22, 2026 GitHub login regression, where the live sources had drifted from `identifier` to `email_link`.

## Files reference

| File | Purpose |
| ---- | ------- |
| `packages/auth/src/authentik.ts` | PKCE helpers, code exchange, end-session URL builder, token revocation |
| `packages/auth/src/index.ts` | client-safe auth exports |
| `apps/landing/components/AuthProvider.tsx` | landing-side session state and canonical logout orchestration |
| `apps/landing/components/AuthButton.tsx` | login UI and social button entrypoints |
| `apps/landing/app/page.tsx` | logout entry and completion query normalization |
| `apps/dashboard/app/auth/login/[provider]/route.ts` | cross-origin PKCE bridge into Authentik |
| `apps/dashboard/app/auth/login-callback/route.ts` | server-side Authentik code exchange and landing redirect |
| `apps/dashboard/app/auth/callback/page.tsx` | dashboard handoff page for landing-provided tokens |
| `apps/dashboard/lib/authSync.ts` | server-side Supabase auth/public user mirroring for Authentik logins |
| `apps/dashboard/lib/authProvider.ts` | dashboard logout handoff to landing |
