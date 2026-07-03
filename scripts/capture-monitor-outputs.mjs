#!/usr/bin/env node
/**
 * capture-monitor-outputs.mjs
 *
 * Reads Terraform outputs for the monitor_host module from the lean-prod
 * state and writes the key values into the root .env so that SSM scripts
 * (provision-gatus.mjs, patch-env.mjs, migrate.mjs) can pick them up
 * without manual copy-paste.
 *
 * Run once after `terraform apply ENV=lean-prod`:
 *   node scripts/capture-monitor-outputs.mjs
 *
 * Writes / updates these keys in .env:
 *   MONITOR_INSTANCE_ID=i-0xxxx
 *   MONITOR_URL=https://status.cig.technology
 *   MONITOR_ELASTIC_IP=x.x.x.x
 */

import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ENV_FILE = path.join(ROOT, ".env");
const TF_DIR = path.join(ROOT, "packages/iac/environments/lean-prod");

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

function upsertEnvKey(file, key, value) {
  let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const escaped = value.replace(/[\/&]/g, "\\$&");
  if (new RegExp(`^${key}=`, "m").test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(file, content);
}

const rootEnv = loadEnv(ENV_FILE);
const awsEnv = { AWS_REGION: "us-east-2", AWS_DEFAULT_REGION: "us-east-2" };
if (rootEnv.AWS_PROFILE) awsEnv.AWS_PROFILE = rootEnv.AWS_PROFILE;

// Load backend config from Makefile to find the right state
let backendBucket = "";
let backendKey = "";
try {
  const makefile = fs.readFileSync(path.join(TF_DIR, "../../Makefile"), "utf8");
  const bucketMatch = makefile.match(/TF_STATE_BUCKET\s*[:?]?=\s*(.+)/);
  const keyMatch = makefile.match(/lean-prod.*backend-config=key=([^\s]+)/);
  if (bucketMatch) backendBucket = bucketMatch[1].trim();
  if (keyMatch) backendKey = keyMatch[1].trim();
} catch (_) {}

console.log("Reading Terraform outputs for lean-prod…");

let tfOutput;
try {
  tfOutput = JSON.parse(
    execSync("terraform output -json", {
      cwd: TF_DIR,
      encoding: "utf8",
      env: { ...process.env, ...awsEnv },
      stdio: ["ignore", "pipe", "pipe"],
    })
  );
} catch (err) {
  console.error(`
terraform output failed. Make sure you have already run:
  make apply ENV=lean-prod

or equivalent. Error: ${err.message}
`);
  process.exit(1);
}

// Extract monitor_host module outputs (Terraform nests module outputs)
const monitorOutputs = tfOutput?.monitor_host?.value ?? {};

const instanceId  = monitorOutputs.instance_id  ?? tfOutput?.["monitor_host.instance_id"]?.value;
const monitorUrl  = monitorOutputs.monitor_url   ?? tfOutput?.["monitor_host.monitor_url"]?.value;
const elasticIp   = monitorOutputs.elastic_ip    ?? tfOutput?.["monitor_host.elastic_ip"]?.value;
const backupBucket = monitorOutputs.backup_bucket ?? tfOutput?.["monitor_host.backup_bucket"]?.value;

if (!instanceId) {
  console.error("Could not find monitor_host.instance_id in Terraform output.");
  console.error("Available keys:", Object.keys(tfOutput).join(", "));
  process.exit(1);
}

const updates = [
  ["MONITOR_INSTANCE_ID", instanceId],
  ["MONITOR_URL",         monitorUrl  ?? "https://status.cig.technology"],
  ["MONITOR_ELASTIC_IP",  elasticIp   ?? ""],
  ["MONITOR_BACKUP_BUCKET", backupBucket ?? ""],
];

for (const [key, value] of updates) {
  if (!value) continue;
  upsertEnvKey(ENV_FILE, key, value);
  console.log(`  ${key}=${value}`);
}

console.log(`
✓ Written to ${ENV_FILE}

Next steps:
  1. pnpm monitor:db:migrate          — run DB migrations on the EC2
  2. node scripts/provision-authentik-monitor.mjs   — register OIDC app
  3. pnpm monitor:provision:org -- --name CIG --slug cig
  4. pnpm monitor:provision:org -- --name Hashpass --slug hashpass
`);
