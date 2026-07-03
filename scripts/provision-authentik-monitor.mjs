#!/usr/bin/env node
/**
 * provision-authentik-monitor.mjs
 *
 * Registers the CIG Monitor app in Authentik as an OIDC provider and
 * application. Authenticates via admin email+password (flows through the
 * Authentik authentication flow to get a session token).
 *
 * Idempotent: detects if the provider/app already exists and skips creation.
 *
 * Usage:
 *   node scripts/provision-authentik-monitor.mjs
 *
 * Required in root .env:
 *   AUTHENTIK_URL=https://auth.cig.technology
 *   AUTHENTIK_ADMIN_EMAIL=admin@example.com
 *   AUTHENTIK_ADMIN_PASSWORD=...
 *   MONITOR_URL=https://status.cig.technology   (optional, defaults to above)
 */

import fs from "node:fs";

const ROOT_ENV = new URL("../.env", import.meta.url).pathname;

function loadEnv(f) {
  if (!fs.existsSync(f)) return {};
  const env = {};
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const m = l.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)/);
    if (!m) continue;
    const v = m[2].trim();
    env[m[1]] = /^["']/.test(v) ? v.slice(1, -1) : v.split(/\s#/)[0].trimEnd();
  }
  return env;
}

const env = loadEnv(ROOT_ENV);

const AUTHENTIK_URL = (env.AUTHENTIK_URL || "https://auth.cig.technology").replace(/\/$/, "");
const ADMIN_PASS    = env.AUTHENTIK_ADMIN_PASSWORD;
const MONITOR_URL   = (env.MONITOR_URL || "https://status.cig.technology").replace(/\/$/, "");

// Username: prefer explicit var, then email if not a placeholder, else akadmin
const rawEmail = env.AUTHENTIK_ADMIN_EMAIL ?? "";
const ADMIN_UID =
  env.AUTHENTIK_ADMIN_USERNAME ||
  (rawEmail && !rawEmail.includes("example.com") ? rawEmail : "akadmin");

// Accept an explicit token (takes priority over email/password flow)
const EXPLICIT_TOKEN = env.AUTHENTIK_BOOTSTRAP_TOKEN || env.AUTHENTIK_API_TOKEN;

if (!EXPLICIT_TOKEN && !ADMIN_PASS) {
  console.error(`
Need one of:
  AUTHENTIK_BOOTSTRAP_TOKEN  (an unexpired API token from Authentik admin panel)
  OR AUTHENTIK_ADMIN_PASSWORD in .env (will use uid=${ADMIN_UID})
`);
  process.exit(1);
}

// ── Authenticate via username+password flow ────────────────────────────────

async function getSessionToken() {
  if (EXPLICIT_TOKEN) {
    // Verify it first
    const test = await fetch(`${AUTHENTIK_URL}/api/v3/core/applications/`, {
      headers: { Authorization: `Bearer ${EXPLICIT_TOKEN}` },
    });
    if (test.ok) return EXPLICIT_TOKEN;
    console.log("Stored API token expired — authenticating with admin credentials…");
  }

  // Helper: extract named cookie value from a Set-Cookie header array
  function parseCookies(res, existing = {}) {
    const raw = typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
    const out = { ...existing };
    for (const line of raw) {
      const m = line.match(/^([^=]+)=([^;]*)/);
      if (m) out[m[1].trim()] = m[2].trim();
    }
    return out;
  }

  function cookieStr(jar) {
    return Object.entries(jar)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  // Step 1: start the authentication flow to get CSRF + session cookies
  const flowSlug = "default-authentication-flow";
  console.log(`  Initiating auth flow: ${AUTHENTIK_URL}/api/v3/flows/executor/${flowSlug}/`);
  const startRes = await fetch(
    `${AUTHENTIK_URL}/api/v3/flows/executor/${flowSlug}/?query=`,
    { headers: { Accept: "application/json" } }
  );
  let jar = parseCookies(startRes, {});
  console.log(`  Step 1 status: ${startRes.status}, cookies: ${Object.keys(jar).join(", ") || "none"}`);

  // Step 2: submit username/uid
  const identRes = await fetch(
    `${AUTHENTIK_URL}/api/v3/flows/executor/${flowSlug}/?query=`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStr(jar),
        "X-CSRFToken": jar["authentik_csrf"] ?? "",
      },
      body: JSON.stringify({ uid_field: ADMIN_UID }),
    }
  );
  jar = parseCookies(identRes, jar);
  const identData = await identRes.json().catch(() => ({}));
  console.log(`  Step 2 status: ${identRes.status}, component: ${identData.component ?? "?"}`);

  if (identData.component === "ak-stage-access-denied") {
    console.error("Authentik rejected username:", ADMIN_UID);
    process.exit(1);
  }

  // Step 3: submit password
  const passRes = await fetch(
    `${AUTHENTIK_URL}/api/v3/flows/executor/${flowSlug}/?query=`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStr(jar),
        "X-CSRFToken": jar["authentik_csrf"] ?? "",
      },
      body: JSON.stringify({ password: ADMIN_PASS }),
    }
  );
  jar = parseCookies(passRes, jar);
  const passData = await passRes.json().catch(() => ({}));
  console.log(`  Step 3 status: ${passRes.status}, component: ${passData.component ?? "?"}`);

  if (passData.component === "ak-stage-access-denied") {
    console.error("Password rejected by Authentik.");
    process.exit(1);
  }

  if (!jar["authentik_session"]) {
    console.error("No session cookie after login. Flow response:", JSON.stringify(passData, null, 2));
    console.error(`
Please create an API token manually:
  1. Go to ${AUTHENTIK_URL}/if/admin/#/core/tokens
  2. Create → type: API Token, assigned to akadmin, non-expiring
  3. Add to .env: AUTHENTIK_BOOTSTRAP_TOKEN=<key>
  4. Re-run this script
`);
    process.exit(1);
  }

  // Step 4: create an API token using the authenticated session
  const tokenRes = await fetch(`${AUTHENTIK_URL}/api/v3/core/tokens/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStr(jar),
      "X-CSRFToken": jar["authentik_csrf"] ?? "",
    },
    body: JSON.stringify({
      identifier: `cig-monitor-provision-${Date.now()}`,
      description: "Temporary token for monitor provisioning",
      expiring: false,
    }),
  });

  const tokenBody = await tokenRes.text();
  console.log(`  Step 4 (create token) status: ${tokenRes.status}`);

  if (!tokenRes.ok) {
    console.error("Could not create API token via session:", tokenBody);
    console.error(`
Please create an API token manually:
  1. Go to ${AUTHENTIK_URL}/if/admin/#/core/tokens
  2. Create token → type: API Token, non-expiring, assigned to akadmin
  3. Add to .env: AUTHENTIK_BOOTSTRAP_TOKEN=<key>
  4. Re-run this script
`);
    process.exit(1);
  }

  let tokenData;
  try { tokenData = JSON.parse(tokenBody); } catch { tokenData = {}; }
  const key = tokenData.key;

  if (!key) {
    // Authentik may return the token object but require a separate view_key call
    const keyRes = await fetch(
      `${AUTHENTIK_URL}/api/v3/core/tokens/${tokenData.identifier}/view_key/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieStr(jar),
          "X-CSRFToken": jar["authentik_csrf"] ?? "",
        },
      }
    );
    const keyData = await keyRes.json().catch(() => ({}));
    if (!keyData.key) {
      console.error("Token created but could not retrieve key:", JSON.stringify(tokenData));
      process.exit(1);
    }
    console.log("✓ Obtained fresh API token via admin credentials");
    return keyData.key;
  }

  console.log("✓ Obtained fresh API token via admin credentials");
  return key;
}

const TOKEN = await getSessionToken();

async function api(method, path, body) {
  const res = await fetch(`${AUTHENTIK_URL}/api/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok && res.status !== 404) {
    console.error(`[${method} ${path}] ${res.status}:`, JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return res.ok ? json : null;
}

// ── 1. Check if provider already exists ───────────────────────────────────
console.log("Checking for existing CIG Monitor OIDC provider…");
const existingProviders = await api("GET", "/providers/oauth2/?name=CIG+Monitor");
const existing = existingProviders?.results?.[0] ?? null;

let providerId, clientId, clientSecret;

if (existing) {
  console.log(`  Already exists (id=${existing.pk}) — fetching credentials`);
  providerId   = existing.pk;
  clientId     = existing.client_id;
  clientSecret = existing.client_secret;
} else {
  // ── 2. Fetch authorization + invalidation flows ───────────────────────
  console.log("Fetching flows…");
  const authFlows = await api("GET", "/flows/instances/?designation=authorization");
  const authFlow = authFlows?.results?.[0];
  if (!authFlow) {
    console.error("No authorization flow found.");
    process.exit(1);
  }
  const invFlows = await api("GET", "/flows/instances/?designation=invalidation");
  const invFlow = invFlows?.results?.[0];
  if (!invFlow) {
    console.error("No invalidation flow found (required by Authentik v2024+).");
    process.exit(1);
  }

  // ── 3. Create the OIDC provider ───────────────────────────────────────
  console.log(`Creating OIDC provider (auth_flow: ${authFlow.slug}, inv_flow: ${invFlow.slug})…`);
  const provider = await api("POST", "/providers/oauth2/", {
    name: "CIG Monitor",
    authorization_flow: authFlow.pk,
    invalidation_flow: invFlow.pk,
    client_type: "confidential",
    redirect_uris: [
      {
        url: `${MONITOR_URL}/api/auth/callback/authentik`,
        matching_mode: "strict",
      },
    ],
    sub_mode: "hashed_user_id",
    include_claims_in_id_token: true,
    issuer_mode: "per_provider",
    access_code_validity: "minutes=1",
    access_token_validity: "hours=1",
    refresh_token_validity: "days=30",
  });

  if (!provider) { console.error("Failed to create OIDC provider"); process.exit(1); }

  providerId   = provider.pk;
  clientId     = provider.client_id;
  clientSecret = provider.client_secret;
  console.log(`  ✓ Provider created (id=${providerId})`);
}

// ── 4. Ensure groups scope mapping exists and is attached ─────────────────
console.log("Checking groups scope mapping…");
const scopeMaps = await api("GET", "/propertymappings/provider/scope/");
const allMappings = scopeMaps?.results ?? [];
let groupsMapping = allMappings.find((m) => m.scope_name === "groups") ?? null;

if (!groupsMapping) {
  console.log("  Creating groups scope mapping…");
  groupsMapping = await api("POST", "/propertymappings/provider/scope/", {
    name: "OAuth Mapping: OpenID 'groups'",
    scope_name: "groups",
    description: "Return user group memberships",
    expression: "return [group.name for group in request.user.ak_groups.all()]",
  });
  if (groupsMapping) console.log(`  ✓ groups mapping created (id=${groupsMapping.pk})`);
}

// Attach groups mapping to the provider if not already present
if (groupsMapping) {
  const currentProvider = await api("GET", `/providers/oauth2/${providerId}/`);
  const currentMappings = currentProvider?.property_mappings ?? [];
  if (!currentMappings.includes(groupsMapping.pk)) {
    await api("PATCH", `/providers/oauth2/${providerId}/`, {
      property_mappings: [...currentMappings, groupsMapping.pk],
    });
    console.log("  ✓ groups mapping attached to provider");
  } else {
    console.log("  groups mapping already attached");
  }
}

// ── 5. Application ────────────────────────────────────────────────────────
console.log("Checking for CIG Monitor application…");
const existingApps = await api("GET", "/core/applications/?slug=cig-monitor");
if (existingApps?.results?.[0]) {
  console.log(`  Application already exists`);
} else {
  const app = await api("POST", "/core/applications/", {
    name: "CIG Monitor",
    slug: "cig-monitor",
    provider: providerId,
    meta_launch_url: MONITOR_URL,
    meta_description: "Multi-tenant uptime monitoring SaaS",
    policy_engine_mode: "any",
  });
  if (app) console.log(`  ✓ Application created (slug=${app.slug})`);
}

// ── 6. cig-admins group ───────────────────────────────────────────────────
console.log("Checking cig-admins group…");
const groups = await api("GET", "/core/groups/?name=cig-admins");
if (groups?.results?.[0]) {
  console.log(`  cig-admins group already exists (id=${groups.results[0].pk})`);
} else {
  const group = await api("POST", "/core/groups/", {
    name: "cig-admins",
    is_superuser: false,
    attributes: { description: "CIG platform super-admins" },
  });
  if (group) console.log(`  ✓ cig-admins group created (id=${group.pk})`);
}

// ── Done ─────────────────────────────────────────────────────────────────
console.log(`
✓ Done. Add these to packages/iac/environments/lean-prod/secrets.auto.tfvars:

  monitor_authentik_client_id     = "${clientId}"
  monitor_authentik_client_secret = "${clientSecret}"

And to root .env (for local scripts):
  MONITOR_AUTHENTIK_CLIENT_ID=${clientId}
  MONITOR_AUTHENTIK_CLIENT_SECRET=${clientSecret}
  MONITOR_URL=${MONITOR_URL}

Next: add yourself to the cig-admins group in Authentik:
  ${AUTHENTIK_URL}/if/admin/#/core/groups
  → cig-admins → Users → Add user
`);
