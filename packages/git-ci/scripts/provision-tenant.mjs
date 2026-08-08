#!/usr/bin/env node
/**
 * provision-tenant.mjs
 *
 * Onboards a new git-ci-fallback tenant:
 *   1. Creates a Forgejo organization for the tenant
 *   2. Configures a push-mirror target so the tenant's GitHub repo can push
 *      to it (GitHub's own repo-level "Push mirror" setting is what actually
 *      drives the sync — this script prints the exact values to enter there)
 *   3. Prompts for the tenant's fine-grained GitHub PAT (Checks: write, that
 *      repo only) and stores it as an org-level Forgejo Action secret
 *   4. Shells out to migrate-workflows.mjs to open a PR against the tenant's
 *      GitHub repo adding the default onboarding workflows
 *
 * Usage:
 *   node scripts/provision-tenant.mjs \
 *     --name Hashpass --slug hashpass --github-repo hashpass-tech/hashpass.tech
 *
 * Prerequisites:
 *   - GIT_CI_URL and GIT_CI_ADMIN_TOKEN set in .env (or env vars) — the
 *     admin token is a Forgejo personal access token with org:write scope
 */

import fs from "node:fs";
import readline from "node:readline";
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
const GIT_CI_URL = env.GIT_CI_URL || process.env.GIT_CI_URL || "https://ci.cig.technology";
const ADMIN_TOKEN = env.GIT_CI_ADMIN_TOKEN || process.env.GIT_CI_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("GIT_CI_ADMIN_TOKEN is required in .env or environment (a Forgejo PAT with org:write scope)");
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    name:         { type: "string" },
    slug:         { type: "string" },
    "github-repo": { type: "string" },
    help:         { type: "boolean", short: "h" },
  },
});

if (args.help || !args.name || !args.slug || !args["github-repo"]) {
  console.log(`
Usage: provision-tenant.mjs --name <name> --slug <slug> --github-repo <owner/repo>

Example:
  node scripts/provision-tenant.mjs --name Hashpass --slug hashpass --github-repo hashpass-tech/hashpass.tech
`);
  process.exit(0);
}

async function api(method, path, body) {
  const res = await fetch(`${GIT_CI_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${ADMIN_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok && res.status !== 422) {
    console.error(`[${method} ${path}] ${res.status}:`, json);
    process.exit(1);
  }
  return { ok: res.ok, status: res.status, json };
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

console.log(`\nProvisioning git-ci tenant: ${args.name} (${args.slug})\n`);

// 1. Create the Forgejo organization (422 = already exists, treated as idempotent)
const org = await api("POST", "/api/v1/orgs", { username: args.slug, full_name: args.name, visibility: "private" });
if (org.status === 422) {
  console.log(`Organization "${args.slug}" already exists — continuing`);
} else {
  console.log(`Organization created: ${args.slug}`);
}

// 2. Push-mirror is configured GitHub-side (its own repo "Push mirror"
// setting), not something the Forgejo API drives. Print the values to enter.
const mirrorUrl = `${GIT_CI_URL}/${args.slug}/${args["github-repo"].split("/").pop()}.git`;
console.log(`\nACTION REQUIRED on github.com/${args["github-repo"]}:`);
console.log(`  Settings -> General -> "Push mirror this repository" (or via 'git remote')`);
console.log(`  Target URL: ${mirrorUrl}`);
console.log(`  Auth: use a Forgejo PAT scoped to this org's repo (create one for the mirror, distinct from GIT_CI_ADMIN_TOKEN)`);

// 3. Prompt for tenant's GitHub PAT and store as an org-level Forgejo Action secret
const tenantPat = await prompt(
  `\nPaste the tenant's fine-grained GitHub PAT (Checks: write, repo "${args["github-repo"]}" only): `
);
if (!tenantPat) {
  console.warn("No PAT provided — skipping FORGEJO_RELAY_TOKEN secret. Set it manually before onboarding is complete.");
} else {
  await api("PUT", `/api/v1/orgs/${args.slug}/actions/secrets/FORGEJO_RELAY_TOKEN`, { data: tenantPat });
  console.log(`✓ Stored FORGEJO_RELAY_TOKEN as an org-level secret (scoped to "${args.slug}" only — no cross-tenant blast radius)`);
}

// 4. Open a PR against the tenant's GitHub repo adding default workflows
console.log(`\nOpening onboarding PR with default workflows…`);
try {
  execSync(
    `node ${new URL("migrate-workflows.mjs", import.meta.url).pathname} --github-repo ${args["github-repo"]} --slug ${args.slug}`,
    { stdio: "inherit", env: { ...process.env, ...env } }
  );
} catch {
  console.warn("⚠ migrate-workflows.mjs failed — run it manually to open the onboarding PR");
}

console.log(`
Done. Next steps:
  1. Confirm the push-mirror above is configured and has synced at least once:
     git ls-remote ${mirrorUrl} HEAD
  2. Merge the onboarding PR on github.com/${args["github-repo"]} once the tenant reviews it
  3. Verify: https://${new URL(GIT_CI_URL).host}/${args.slug}/${args["github-repo"].split("/").pop()}
`);
