#!/usr/bin/env node
/**
 * runner-stop.mjs
 *
 * Force-stops the on-demand Forgejo Actions runner EC2 instance. Not
 * normally required — the runner self-stops after 15 idle minutes — but
 * available for immediately reclaiming it after a dry-run.
 *
 * Usage:
 *   node scripts/runner-stop.mjs
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
const INSTANCE_ID = env.GIT_CI_RUNNER_INSTANCE_ID || process.env.GIT_CI_RUNNER_INSTANCE_ID;

const awsEnv = { AWS_REGION: "us-east-2", AWS_DEFAULT_REGION: "us-east-2" };
if (env.AWS_PROFILE) awsEnv.AWS_PROFILE = env.AWS_PROFILE;

if (!INSTANCE_ID) {
  console.error("GIT_CI_RUNNER_INSTANCE_ID is required in .env (set after terraform apply, from the git_ci_runner_instance_id output)");
  process.exit(1);
}

const identity = JSON.parse(aws("sts get-caller-identity --output json", awsEnv));
if (identity.Account !== "520900722378") {
  console.error(`Wrong AWS account: ${identity.Account} (expected 520900722378)`);
  process.exit(1);
}

console.log(`Stopping runner ${INSTANCE_ID}…`);
aws(`ec2 stop-instances --region us-east-2 --instance-ids ${INSTANCE_ID}`, awsEnv);
console.log("✓ Stop requested.");
