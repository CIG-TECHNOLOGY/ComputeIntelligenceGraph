#!/usr/bin/env node
/**
 * patch-env.mjs
 *
 * Live-patches /opt/git-ci/.env on the Forgejo host EC2 instance via SSM
 * without requiring SSH access. Only patches keys listed in PATCHES below.
 * Uses upsert pattern: overwrites existing key or appends if missing.
 *
 * Usage:
 *   node scripts/patch-env.mjs
 *
 * To patch a specific key set an env var before running:
 *   AUTHENTIK_CLIENT_SECRET=newsecret node scripts/patch-env.mjs
 */

import fs from "node:fs";
import { execSync } from "node:child_process";

const ROOT_ENV = new URL("../../../.env", import.meta.url).pathname;

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

function aws(args, extraEnv = {}) {
  return execSync(`aws ${args}`, {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const env = loadEnv(ROOT_ENV);
const INSTANCE_ID = env.GIT_CI_HOST_INSTANCE_ID || process.env.GIT_CI_HOST_INSTANCE_ID;

const awsEnv = {
  AWS_REGION: "us-east-2",
  AWS_DEFAULT_REGION: "us-east-2",
};
if (env.AWS_PROFILE) awsEnv.AWS_PROFILE = env.AWS_PROFILE;

if (!INSTANCE_ID) {
  console.error("GIT_CI_HOST_INSTANCE_ID is required in .env (set after terraform apply, from the git_ci_host_instance_id output)");
  process.exit(1);
}

// Guard: verify we are targeting the right AWS account
const identity = JSON.parse(aws("sts get-caller-identity --output json", awsEnv));
if (identity.Account !== "520900722378") {
  console.error(`Wrong AWS account: ${identity.Account} (expected 520900722378)`);
  process.exit(1);
}

// Keys to patch. Each value is read from local .env (not hardcoded here).
// Only defined keys are patched; undefined keys are skipped.
const PATCHES = {
  FORGEJO__server__ROOT_URL: env.GIT_CI_URL ? `${env.GIT_CI_URL.replace(/\/$/, "")}/` : undefined,
  AUTHENTIK_CLIENT_SECRET: env.GIT_CI_AUTHENTIK_CLIENT_SECRET,
};

function upsertCmd(key, value) {
  const escaped = String(value).replace(/[/&]/g, "\\$&").replace(/'/g, "'\\''");
  return [
    `grep -q "^${key}=" /opt/git-ci/.env`,
    `&& sed -i "s|^${key}=.*|${key}=${escaped}|" /opt/git-ci/.env`,
    `|| echo "${key}=${escaped}" >> /opt/git-ci/.env`,
  ].join(" ");
}

const patchCmds = Object.entries(PATCHES)
  .filter(([, v]) => v !== undefined)
  .map(([k, v]) => upsertCmd(k, v));

if (patchCmds.length === 0) {
  console.log("No keys to patch. Set values in .env first.");
  process.exit(0);
}

const commands = [
  "set -euo pipefail",
  ...patchCmds,
  "cd /opt/git-ci && docker compose up -d --no-deps --force-recreate forgejo",
  "echo 'Patch complete — forgejo container recreated'",
];

const tmpFile = `/tmp/ssm-git-ci-patch-${Date.now()}.json`;
fs.writeFileSync(tmpFile, JSON.stringify({ commands }));

console.log(`Patching ${patchCmds.length} key(s) on ${INSTANCE_ID}…`);
const out = aws(
  `ssm send-command --region us-east-2 --instance-ids ${INSTANCE_ID} --document-name AWS-RunShellScript --parameters file://${tmpFile} --output json`,
  awsEnv
);
const commandId = JSON.parse(out).Command?.CommandId;
fs.unlinkSync(tmpFile);

for (let i = 0; i < 18; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  try {
    const inv = JSON.parse(
      aws(
        `ssm get-command-invocation --region us-east-2 --command-id ${commandId} --instance-id ${INSTANCE_ID} --output json`,
        awsEnv
      )
    );
    if (inv.Status === "Success") {
      console.log("✓", inv.StandardOutputContent?.trim() || "Done");
      break;
    }
    if (["Failed", "Cancelled", "TimedOut"].includes(inv.Status)) {
      console.error("SSM command failed:", inv.StandardOutputContent, inv.StandardErrorContent);
      process.exit(1);
    }
    process.stdout.write(`  ${inv.Status}…\r`);
  } catch (_) {}
}
