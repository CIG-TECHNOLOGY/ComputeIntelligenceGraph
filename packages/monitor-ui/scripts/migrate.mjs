#!/usr/bin/env node
/**
 * migrate.mjs
 *
 * Runs Drizzle migrations against the monitor database via SSM.
 * After `terraform apply`, capture MONITOR_INSTANCE_ID from Terraform
 * output and add it to .env, then run:
 *
 *   pnpm monitor:db:migrate
 *
 * The script SSMs into the EC2, runs `drizzle-kit migrate` inside the
 * running app container, and prints the result.
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
const INSTANCE_ID = env.MONITOR_INSTANCE_ID || process.env.MONITOR_INSTANCE_ID;

if (!INSTANCE_ID) {
  console.error(
    "MONITOR_INSTANCE_ID not set. Run `terraform output` after apply and add it to .env."
  );
  process.exit(1);
}

const awsEnv = {
  AWS_REGION: "us-east-2",
  AWS_DEFAULT_REGION: "us-east-2",
};
if (env.AWS_PROFILE) awsEnv.AWS_PROFILE = env.AWS_PROFILE;

// Guard: correct AWS account
const identity = JSON.parse(aws("sts get-caller-identity --output json", awsEnv));
if (identity.Account !== "520900722378") {
  console.error(`Wrong AWS account: ${identity.Account}`);
  process.exit(1);
}

const commands = [
  // Run drizzle-kit migrate inside the running app container
  "docker exec monitor-app npx drizzle-kit migrate 2>&1",
];

const tmpFile = `/tmp/ssm-migrate-${Date.now()}.json`;
fs.writeFileSync(tmpFile, JSON.stringify({ commands }));

console.log(`Running DB migrations on ${INSTANCE_ID}…`);
const out = aws(
  `ssm send-command --region us-east-2 --instance-ids ${INSTANCE_ID} --document-name AWS-RunShellScript --parameters file://${tmpFile} --output json`,
  awsEnv
);
const commandId = JSON.parse(out).Command?.CommandId;
fs.unlinkSync(tmpFile);

for (let i = 0; i < 24; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  try {
    const inv = JSON.parse(
      aws(
        `ssm get-command-invocation --region us-east-2 --command-id ${commandId} --instance-id ${INSTANCE_ID} --output json`,
        awsEnv
      )
    );
    if (inv.Status === "Success") {
      console.log("✓ Migrations applied:");
      console.log(inv.StandardOutputContent);
      break;
    }
    if (["Failed", "Cancelled", "TimedOut"].includes(inv.Status)) {
      console.error("Migration failed:");
      console.error(inv.StandardOutputContent, inv.StandardErrorContent);
      process.exit(1);
    }
    process.stdout.write(`  ${inv.Status}…\r`);
  } catch (_) {}
}
