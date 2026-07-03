#!/usr/bin/env node
/**
 * provision-org.mjs
 *
 * Creates a new tenant organization in the monitor database, then
 * (optionally) syncs Gatus config so checks start running immediately.
 *
 * Usage:
 *   node packages/monitor-ui/scripts/provision-org.mjs \
 *     --name "Hashpass" --slug hashpass [--domain status.hashpass.tech] [--plan starter]
 *
 * Prerequisites:
 *   - MONITOR_URL and MONITOR_ADMIN_TOKEN set in .env (or env vars)
 *   - The monitor API must be reachable
 */

import fs from "node:fs";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

const ENV_FILE = new URL("../../../.env", import.meta.url).pathname;

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

const env = loadEnv(ENV_FILE);
const MONITOR_URL = env.MONITOR_URL || process.env.MONITOR_URL || "https://status.cig.technology";
const ADMIN_TOKEN = env.MONITOR_ADMIN_TOKEN || process.env.MONITOR_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("MONITOR_ADMIN_TOKEN is required in .env or environment");
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    name:   { type: "string" },
    slug:   { type: "string" },
    domain: { type: "string" },
    plan:   { type: "string", default: "free" },
    help:   { type: "boolean", short: "h" },
  },
});

if (args.help || !args.name || !args.slug) {
  console.log(`
Usage: provision-org.mjs --name <name> --slug <slug> [--domain <custom-domain>] [--plan free|starter|pro]

Examples:
  node packages/monitor-ui/scripts/provision-org.mjs --name Hashpass --slug hashpass
  node packages/monitor-ui/scripts/provision-org.mjs --name Hashpass --slug hashpass --domain status.hashpass.tech --plan starter
`);
  process.exit(0);
}

async function api(method, path, body) {
  const res = await fetch(`${MONITOR_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    console.error(`[${method} ${path}] ${res.status}:`, json);
    process.exit(1);
  }
  return json;
}

console.log(`\nProvisioning org: ${args.name} (${args.slug})\n`);

// 1. Create the org via admin API
const org = await api("POST", "/api/admin/orgs", {
  name: args.name,
  slug: args.slug,
  plan: args.plan,
  customDomain: args.domain,
});

console.log(`✓ Organization created:  ${org.id}`);
console.log(`  Slug:                  ${args.slug}`);
console.log(`  Default URL:           https://${args.slug}.status.cig.technology`);
if (args.domain) {
  console.log(`  Custom domain:         https://${args.domain}`);
  console.log(`\n  ACTION REQUIRED: The tenant must add this DNS record:`);
  console.log(`    ${args.domain}  CNAME  status.cig.technology`);
  console.log(`  Caddy will auto-provision a TLS cert within ~60s of first request.`);
}

// 2. Sync Gatus so checks start running (calls provision-gatus as a subprocess)
console.log(`\nSyncing Gatus config…`);
try {
  execSync(
    `node ${new URL("provision-gatus.mjs", import.meta.url).pathname}`,
    { stdio: "inherit", env: { ...process.env, ...env } }
  );
} catch {
  console.warn("⚠ Gatus sync failed — run provision-gatus.mjs manually");
}

console.log(`
Done. Next steps for the ${args.name} team:
  1. Log in at https://status.cig.technology (invite them via admin panel)
  2. Add their monitors under the "${args.slug}" org
  3. Configure alert channels (email/Slack webhook)
  4. Add CI/CD deployment marker:

     curl -X POST https://status.cig.technology/api/v1/deployments \\
       -H "Authorization: Bearer <their-api-key>" \\
       -d '{"version":"v1.0.0","environment":"production"}'
`);
