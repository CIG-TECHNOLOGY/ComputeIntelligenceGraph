#!/usr/bin/env node
/**
 * Migrates monitor secrets from AWS Secrets Manager → Infisical cig-production project.
 *
 * Reads all credentials from environment variables — never from command-line args.
 *
 * Required env (set in .env or export before running):
 *   INFISICAL_URL             https://secrets.cig.technology
 *   INFISICAL_ADMIN_EMAIL     admin@cig.lat
 *   INFISICAL_ADMIN_PASSWORD  ...
 *   AWS_PROFILE               aws-cig  (or set AWS_* env vars directly)
 *   AWS_REGION                us-east-2
 *
 * Usage:
 *   node scripts/migrate-secrets-to-infisical.mjs [--delete-from-sm]
 *
 * Pass --delete-from-sm to schedule deletion of the 4 operator secrets from AWS SM
 * after confirming they are in Infisical. The 2 auto-generated secrets (db-password,
 * nextauth-secret) stay in AWS SM because the EC2 needs them on first boot before
 * Infisical is reachable.
 */

import { execSync } from "child_process";

const INFISICAL_URL = process.env.INFISICAL_URL;
const EMAIL = process.env.INFISICAL_ADMIN_EMAIL;
const PASSWORD = process.env.INFISICAL_ADMIN_PASSWORD;
const AWS_REGION = process.env.AWS_REGION || "us-east-2";
const AWS_PROFILE = process.env.AWS_PROFILE || "aws-cig";
const DELETE_FROM_SM = process.argv.includes("--delete-from-sm");

if (!INFISICAL_URL || !EMAIL || !PASSWORD) {
  console.error("Missing required env: INFISICAL_URL, INFISICAL_ADMIN_EMAIL, INFISICAL_ADMIN_PASSWORD");
  process.exit(1);
}

// The 4 operator-supplied monitor secrets to migrate.
// The 2 auto-generated ones (db-password, nextauth-secret) stay in AWS SM
// as bootstrap credentials needed before Infisical is reachable on first boot.
const SECRETS_TO_MIGRATE = [
  {
    smName: "monitor/status.cig.technology/smtp-password",
    infisicalKey: "MONITOR_SMTP_PASSWORD",
    comment: "SMTP password for monitor alert notifications",
  },
  {
    smName: "monitor/status.cig.technology/authentik-client-id",
    infisicalKey: "MONITOR_AUTHENTIK_CLIENT_ID",
    comment: "Authentik OIDC client ID for monitor-ui",
  },
  {
    smName: "monitor/status.cig.technology/authentik-client-secret",
    infisicalKey: "MONITOR_AUTHENTIK_CLIENT_SECRET",
    comment: "Authentik OIDC client secret for monitor-ui",
  },
  {
    smName: "monitor/status.cig.technology/ghcr-pull-token",
    infisicalKey: "MONITOR_GHCR_PULL_TOKEN",
    comment: "GHCR PAT for pulling ghcr.io/cig-technology private images",
  },
];

function awsGetSecret(secretId) {
  return execSync(
    `aws secretsmanager get-secret-value --secret-id "${secretId}" --region ${AWS_REGION} --query SecretString --output text`,
    { env: { ...process.env, AWS_PROFILE }, stdio: ["pipe", "pipe", "pipe"] }
  ).toString().trim();
}

async function infisicalLogin() {
  // Step 1: email/password login → initial accessToken
  const res = await fetch(`${INFISICAL_URL}/api/v3/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Infisical login failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const initToken = data.accessToken ?? data.token;

  // Step 2: select-organization → org-scoped token required for workspace/secret APIs
  const orgRes = await fetch(`${INFISICAL_URL}/api/v1/organization`, {
    headers: { Authorization: `Bearer ${initToken}` },
  });
  if (!orgRes.ok) throw new Error(`GET /organization failed: ${orgRes.status}`);
  const orgData = await orgRes.json();
  const orgs = orgData.organizations ?? [];
  if (!orgs.length) throw new Error("No organizations found for this user");
  const orgId = orgs[0].id;

  const selRes = await fetch(`${INFISICAL_URL}/api/v3/auth/select-organization`, {
    method: "POST",
    headers: { Authorization: `Bearer ${initToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId: orgId }),
  });
  if (!selRes.ok) throw new Error(`select-organization failed: ${selRes.status}: ${await selRes.text()}`);
  const selData = await selRes.json();
  return selData.token ?? selData.accessToken;
}

async function getWorkspaces(token) {
  const res = await fetch(`${INFISICAL_URL}/api/v1/workspace`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET /workspace failed: ${res.status}`);
  const data = await res.json();
  // Environments are embedded in the workspace listing response
  return data.workspaces ?? data;
}

async function upsertSecret(token, workspaceId, envSlug, key, value, comment) {
  const body = { workspaceId, environment: envSlug, type: "shared", secretName: key, secretValue: value, secretComment: comment ?? "" };

  const createRes = await fetch(`${INFISICAL_URL}/api/v3/secrets/raw/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (createRes.status === 409) {
    const patchRes = await fetch(`${INFISICAL_URL}/api/v3/secrets/raw/${key}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!patchRes.ok) throw new Error(`PATCH ${key}: ${patchRes.status} ${await patchRes.text()}`);
    return "updated";
  }
  if (!createRes.ok) throw new Error(`POST ${key}: ${createRes.status} ${await createRes.text()}`);
  return "created";
}

function scheduleSmDeletion(secretId) {
  execSync(
    `aws secretsmanager delete-secret --secret-id "${secretId}" --recovery-window-in-days 7 --region ${AWS_REGION}`,
    { env: { ...process.env, AWS_PROFILE }, stdio: ["pipe", "pipe", "pipe"] }
  );
}

async function main() {
  console.log(`\n🔐  Infisical Migration — AWS Secrets Manager → ${INFISICAL_URL}`);
  console.log(`    Secrets to migrate: ${SECRETS_TO_MIGRATE.length}\n`);

  process.stdout.write("  Authenticating... ");
  const token = await infisicalLogin();
  console.log("✓");

  process.stdout.write("  Finding cig-production workspace... ");
  const workspaces = await getWorkspaces(token);
  const ws =
    workspaces.find((w) => w.name?.toLowerCase().includes("cig-production") || w.slug?.includes("cig-production")) ??
    workspaces[0];
  if (!ws) throw new Error("No workspaces found");
  console.log(`✓  ${ws.name} (${ws.id})`);

  process.stdout.write("  Finding production environment... ");
  // Environments are embedded in the workspace listing
  const envs = ws.environments ?? [];
  const env =
    envs.find((e) => e.slug === "production" || e.name?.toLowerCase() === "production") ??
    envs.find((e) => e.slug === "prod") ??
    envs[0];
  if (!env) throw new Error("No environments found in workspace");
  console.log(`✓  ${env.name ?? env.slug} (${env.slug})`);

  console.log("\n  Migrating:\n");
  const results = [];
  for (const { smName, infisicalKey, comment } of SECRETS_TO_MIGRATE) {
    process.stdout.write(`    ${infisicalKey.padEnd(40)} `);
    try {
      const value = awsGetSecret(smName);
      const status = await upsertSecret(token, ws.id, env.slug, infisicalKey, value, comment);
      console.log(`✓  ${status}`);
      results.push({ infisicalKey, smName, ok: true });
    } catch (err) {
      console.log(`✗  ${err.message}`);
      results.push({ infisicalKey, smName, ok: false, err: err.message });
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n⚠️  ${failed.length} failure(s) — AWS SM secrets NOT deleted`);
    process.exit(1);
  }

  console.log(`\n✅  All ${SECRETS_TO_MIGRATE.length} secrets in Infisical`);

  if (DELETE_FROM_SM) {
    console.log("\n  Scheduling AWS SM deletion (7-day recovery window):\n");
    for (const { smName } of SECRETS_TO_MIGRATE) {
      process.stdout.write(`    ${smName.padEnd(60)} `);
      try {
        scheduleSmDeletion(smName);
        console.log("✓  scheduled");
      } catch (err) {
        console.log(`✗  ${err.message}`);
      }
    }
  } else {
    console.log("\n  AWS SM secrets kept (re-run with --delete-from-sm to schedule removal)");
  }

  console.log("\n  Next steps:");
  console.log("  1. Verify secrets in Infisical dashboard at secrets.cig.technology");
  console.log("  2. Create a Machine Identity or Service Token for the monitor EC2 in Infisical");
  console.log("  3. Store that token in AWS SM as: monitor/status.cig.technology/infisical-token");
  console.log("  4. Update bootstrap to: infisical run --env=production -- docker-compose up");
  console.log("  5. Re-run with --delete-from-sm once Infisical is confirmed source of truth\n");
}

main().catch((err) => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
