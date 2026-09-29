---
id: README
title: Authentication
description: Current CIG authentication architecture
sidebar_position: 1
---

# CIG Authentication Architecture

CIG uses **Authentik** as the primary identity provider and **Supabase** as a feature-flagged fallback. The current production flow uses the landing app as the entry point and the dashboard as the relay/callback bridge.

## Current Production Principals

| Component | Production origin | Role |
| --------- | ----------------- | ---- |
| Landing (`apps/landing`) | `https://cig.technology` | Public entrypoint, login buttons, canonical logout completion target |
| Dashboard (`apps/dashboard`) | `https://app.cig.technology` | Protected app, PKCE relay, login callback bridge |
| Authentik | `https://auth.cig.technology` | OIDC provider and social-source broker |

## Current Login Flow

1. The user starts login from the landing app.
2. Landing stores PKCE state and navigates to the dashboard relay route.
3. The dashboard relay hands off to Authentik.
4. Authentik returns an authorization code to the dashboard callback bridge.
5. The callback bridge exchanges the code, provisions the user if needed, and returns the tokens to landing.

## Provisioning and Runtime Requirements

The dashboard runtime must have:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If those values are missing, provisioning fails closed and the user is returned to sign-in.

## Logout

Logout is centralized in the landing app. It clears local session state and redirects through the sign-out flow so the browser session is fully reset.
