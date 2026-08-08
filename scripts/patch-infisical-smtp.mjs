#!/usr/bin/env node
/**
 * Patches SMTP settings into the live Infisical EC2 instance via AWS SSM
 * and restarts the backend container. Run this after updating lean-prod tfvars
 * when the EC2 is already running (user_data_replace_on_change = false means
 * terraform apply does NOT update the env file on a running instance).
 *
 * Reads all credentials from the root .env — nothing sensitive in args.
 *
 * Usage:
 *   node scripts/patch-infisical-smtp.mjs
 *   pnpm infisical:patch:smtp
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env');
const CIG_AWS_ACCOUNT = '520900722378';

function loadEnv(f) {
  const env = {};
  if (!fs.existsSync(f)) return env;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const l = line.trim(); if (!l || l.startsWith('#')) continue;
    const m = l.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (!m) continue;
    const v = m[2].trim(); env[m[1]] = /^["']/.test(v) ? v.slice(1,-1) : v.split(/\s#/)[0].trimEnd();
  }
  return env;
}

function aws(args, extraEnv = {}) {
  return execSync(`aws ${args}`, {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function log(msg)  { console.log(`[smtp-patch] ${msg}`); }

const env = loadEnv(ENV_FILE);

const awsEnv = { AWS_REGION: 'us-east-2', AWS_DEFAULT_REGION: 'us-east-2' };
// Explicit key/secret take priority; otherwise fall back to named profile
if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  awsEnv.AWS_ACCESS_KEY_ID     = env.AWS_ACCESS_KEY_ID;
  awsEnv.AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
  if (env.AWS_SESSION_TOKEN) awsEnv.AWS_SESSION_TOKEN = env.AWS_SESSION_TOKEN;
} else if (env.AWS_PROFILE) {
  awsEnv.AWS_PROFILE = env.AWS_PROFILE;
}

// Guard: verify correct AWS account
const accountId = aws('sts get-caller-identity --query Account --output text', awsEnv);
if (accountId !== CIG_AWS_ACCOUNT) {
  throw new Error(`Wrong AWS account: ${accountId}. Must be ${CIG_AWS_ACCOUNT}.`);
}
log(`AWS account: ${accountId} ✓`);

// Find the Infisical EC2 by tag
log('Looking up Infisical EC2 instance …');
const instanceId = aws(
  'ec2 describe-instances --region us-east-2 ' +
  '--filters "Name=tag:cig-managed,Values=true" ' +
  '"Name=tag:domain,Values=secrets.cig.technology" ' +
  '"Name=instance-state-name,Values=running" ' +
  '--query "Reservations[0].Instances[0].InstanceId" --output text',
  awsEnv
);
if (!instanceId || instanceId === 'None') {
  throw new Error('Infisical EC2 not found. Check AWS tags: cig-managed=true, domain=secrets.cig.technology');
}
log(`Instance: ${instanceId}`);

// Resolve SMTP values from .env
const smtpHost     = env.SMTP_HOST                                      || '';
const smtpPort     = env.SMTP_PORT                                      || '587';
const smtpUsername = env.SMTP_USERNAME || env.SMTP_FROM_EMAIL           || '';
const smtpPassword = env.SMTP_PASSWORD                                   || '';
const smtpFrom     = env.SMTP_FROM_EMAIL || env.SMTP_FROM               || '';

if (!smtpHost || !smtpPassword) {
  throw new Error('SMTP_HOST and SMTP_PASSWORD must be set in the root .env file.');
}

log(`SMTP host: ${smtpHost}:${smtpPort} (from: ${smtpFrom})`);

// Shell script to run on the EC2 via SSM.
// Uses sed to update existing SMTP lines, appends any that are missing.
// Build the remote shell commands as an array (avoids template literal conflicts
// with shell variable syntax like ${key} being misread as JS interpolation).
const upsert = (k, v) =>
  `grep -q "^${k}=" /opt/infisical/.env` +
  ` && sed -i "s|^${k}=.*|${k}=${v}|" /opt/infisical/.env` +
  ` || echo "${k}=${v}" >> /opt/infisical/.env`;

const remoteCommands = [
  'set -euo pipefail',
  upsert('SMTP_HOST',         smtpHost),
  upsert('SMTP_PORT',         smtpPort),
  upsert('SMTP_USERNAME',     smtpUsername),
  upsert('SMTP_PASSWORD',     smtpPassword),
  // Infisical v0.100+ reads SMTP_FROM_ADDRESS; keep SMTP_FROM for older compatibility
  upsert('SMTP_FROM',         smtpFrom),
  upsert('SMTP_FROM_ADDRESS', smtpFrom),
  upsert('SMTP_FROM_NAME',    'CIG Secrets'),
  // Port 587 = STARTTLS, not SSL — must be false
  upsert('SMTP_SECURE',       'false'),
  `grep "^SMTP_" /opt/infisical/.env | sed 's/SMTP_PASSWORD=.*/SMTP_PASSWORD=***/'`,
  'docker restart infisical-backend',
  'echo "infisical-backend restarted"',
];

// Write SSM payload to a temp file — keeps secrets out of the process args
const payloadPath = path.join(ROOT, 'node_modules/.cache/.ssm-smtp-patch.json');
fs.mkdirSync(path.dirname(payloadPath), { recursive: true });
fs.writeFileSync(payloadPath, JSON.stringify({ commands: remoteCommands }), { mode: 0o600 });

log('Sending SSM command …');
const ssmOut = aws(
  `ssm send-command --region us-east-2 --instance-ids ${instanceId} ` +
  `--document-name AWS-RunShellScript --parameters file://${payloadPath} --output json`,
  awsEnv
);
fs.unlinkSync(payloadPath);

const commandId = JSON.parse(ssmOut).Command?.CommandId;
log(`Command id: ${commandId} — polling for completion …`);

for (let i = 0; i < 18; i++) {
  await new Promise(r => setTimeout(r, 5000));
  let inv;
  try {
    inv = JSON.parse(aws(
      `ssm get-command-invocation --region us-east-2 --command-id ${commandId} --instance-id ${instanceId} --output json`,
      awsEnv
    ));
  } catch { continue; }

  const status = inv.Status;
  log(`  Status: ${status}`);

  if (status === 'Success') {
    console.log('\n' + (inv.StandardOutputContent || '').trim());
    console.log('\nSMTP configured on the live Infisical instance.');
    console.log('Test: visit https://secrets.cig.technology/signup and register a new user — you should receive a verification email.');
    process.exit(0);
  }
  if (['Failed', 'Cancelled', 'TimedOut'].includes(status)) {
    console.error('\nSSM error output:', inv.StandardErrorContent?.trim());
    throw new Error(`SSM command ${status}`);
  }
}

throw new Error('Timed out waiting for SSM command to complete.');
