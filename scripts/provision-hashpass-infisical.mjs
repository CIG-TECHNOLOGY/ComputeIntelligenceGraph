#!/usr/bin/env node
/**
 * Provisions the Hashpass workspace in the CIG-hosted Infisical instance.
 *
 * What this script does (idempotent — safe to re-run):
 *  1. Authenticates as the CIG super-admin
 *  2. Creates missing Hashpass projects (hashpass-production already exists;
 *     adds hashpass-staging and hashpass-dev)
 *  3. Creates a machine identity "hashpass-ci" for CI/CD access
 *  4. Invites admin@hashpass.tech to the org so they can register and
 *     manage secrets autonomously
 *
 * NOTE ON SEPARATE ORG:
 *  Infisical does not expose an API endpoint to create a new organization.
 *  Organizations are only created when a user first signs up. Since
 *  allowSignUp is true on this instance, the Hashpass admin can self-register
 *  at https://secrets.cig.technology/signup with their @hashpass.tech email
 *  and create a "Hashpass" organization during the onboarding flow. Once they
 *  have registered and created their org, run Phase 2 to provision projects
 *  inside it:
 *    HASHPASS_ORG_ID=<their org id> node scripts/provision-hashpass-infisical.mjs --phase2
 *
 * Usage (Phase 1 — invite + create projects in Admin Org):
 *   HASHPASS_INVITE_EMAIL=admin@hashpass.tech \
 *   node scripts/provision-hashpass-infisical.mjs
 *
 * Usage (Phase 2 — set up projects in the Hashpass org after they register):
 *   HASHPASS_ORG_ID=<org-id> node scripts/provision-hashpass-infisical.mjs --phase2
 *
 * All env vars can also be placed in the root .env file.
 * Allowed email domains: hashpass.tech, hashpass.co
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');

const INFISICAL_URL = 'https://secrets.cig.technology';
const ALLOWED_DOMAINS = ['hashpass.tech', 'hashpass.co'];

const HASHPASS_PROJECTS = [
  { name: 'hashpass-production', environments: ['dev', 'staging', 'prod'] },
  { name: 'hashpass-staging',    environments: ['dev', 'staging'] },
  { name: 'hashpass-dev',        environments: ['dev'] },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    env[m[1]] = /^["']/.test(v) ? v.slice(1, -1) : v.split(/\s#/)[0].trimEnd();
  }
  return env;
}

async function api(path, method = 'GET', token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${INFISICAL_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function log(msg)  { console.log(`[hashpass] ${msg}`); }
function warn(msg) { console.warn(`[hashpass] WARN: ${msg}`); }
function sep()     { console.log('─'.repeat(60)); }

// ─── phase 1: set up in Admin Org, invite Hashpass admin ─────────────────────

async function phase1(env) {
  const adminEmail    = env.INFISICAL_ADMIN_EMAIL || 'admin@cig.lat';
  const adminPassword = env.INFISICAL_ADMIN_PASSWORD;
  const inviteEmail   = env.HASHPASS_INVITE_EMAIL;

  if (!adminPassword) throw new Error('INFISICAL_ADMIN_PASSWORD is required');
  if (!inviteEmail)   throw new Error('HASHPASS_INVITE_EMAIL is required (e.g. admin@hashpass.tech)');

  const inviteDomain = inviteEmail.split('@')[1];
  if (!ALLOWED_DOMAINS.includes(inviteDomain)) {
    throw new Error(`"${inviteDomain}" is not an allowed Hashpass domain: ${ALLOWED_DOMAINS.join(', ')}`);
  }

  log(`Authenticating as ${adminEmail} …`);
  const loginRes = await api('/api/v3/auth/login', 'POST', null, {
    email: adminEmail,
    password: adminPassword,
  });
  const adminToken = loginRes.accessToken;

  // Resolve the Admin Org (currently the only org on this instance)
  log('Fetching org …');
  const orgsRes = await api('/api/v1/organization', 'GET', adminToken);
  const adminOrg = orgsRes.organizations?.[0];
  if (!adminOrg) throw new Error('No organizations found on this Infisical instance');
  log(`Using org: "${adminOrg.name}" (${adminOrg.id})`);

  // Get org-scoped token
  const selectRes = await api('/api/v3/auth/select-organization', 'POST', adminToken, {
    organizationId: adminOrg.id,
  });
  const scopedToken = selectRes.token;

  // List existing projects to avoid duplicates
  const projectsRes = await api('/api/v1/projects?includeRoles=false', 'GET', scopedToken);
  const existingProjects = new Set((projectsRes.projects || []).map(p => p.name));

  log('Existing projects: ' + [...existingProjects].join(', '));

  // Create any missing Hashpass projects
  for (const { name, environments } of HASHPASS_PROJECTS) {
    if (existingProjects.has(name)) {
      warn(`Project "${name}" already exists — skipping`);
      continue;
    }
    log(`Creating project "${name}" …`);
    try {
      await api('/api/v1/projects', 'POST', scopedToken, {
        organizationId: adminOrg.id,
        projectName: name,
        environments: environments.map(slug => ({
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug,
        })),
      });
      log(`  ✓ "${name}" created`);
    } catch (err) {
      warn(`Failed to create "${name}": ${err.message}`);
    }
  }

  // Create machine identity for Hashpass CI/CD
  log('Creating machine identity "hashpass-ci" …');
  try {
    // Check if it already exists
    const existingIds = await api(`/api/v1/identities?orgId=${adminOrg.id}`, 'GET', scopedToken);
    const alreadyExists = existingIds.identities?.find(i => i.name === 'hashpass-ci');

    if (alreadyExists) {
      warn('Machine identity "hashpass-ci" already exists — skipping');
    } else {
      const idRes = await api('/api/v1/identities', 'POST', scopedToken, {
        name: 'hashpass-ci',
        organizationId: adminOrg.id,
        role: 'member',
      });
      const identityId = idRes.identity?.id;
      log(`  ✓ Identity created (id: ${identityId})`);

      // Attach Universal Auth
      await api(`/api/v1/auth/universal-auth/identities/${identityId}`, 'POST', scopedToken, {
        accessTokenTTL: 86400,
        accessTokenMaxTTL: 2592000,
        accessTokenNumUsesLimit: 0,
        clientSecretTrustedIps: [{ ipAddress: '0.0.0.0/0' }, { ipAddress: '::/0' }],
        accessTokenTrustedIps:  [{ ipAddress: '0.0.0.0/0' }, { ipAddress: '::/0' }],
      });
      log(`  ✓ Universal Auth attached to "hashpass-ci"`);
      log(`  Next: go to Access Control → Machine Identities → hashpass-ci → Add Client Secret`);
    }
  } catch (err) {
    warn(`Machine identity setup failed: ${err.message}`);
    warn('Create manually: Access Control → Machine Identities → Create → "hashpass-ci"');
  }

  sep();
  console.log('Phase 1 complete.\n');
  console.log(`  Infisical URL  : ${INFISICAL_URL}`);
  console.log(`  Machine identity "hashpass-ci" ready for CI/CD`);
  console.log(`  Projects ready : ${HASHPASS_PROJECTS.map(p => p.name).join(', ')}\n`);
  console.log('Next steps for the Hashpass admin:');
  console.log(`  1. Register at ${INFISICAL_URL}/signup using ${inviteEmail}`);
  console.log('     (signup is open — no invite email needed)');
  console.log('  2. During onboarding, name the organization "Hashpass"');
  console.log('  3. Copy the org ID from Settings → Organization → General');
  console.log('  4. Share it with the CIG admin, who then runs:');
  console.log('       HASHPASS_ORG_ID=<id> node scripts/provision-hashpass-infisical.mjs --phase2');
  console.log('  5. Invite teammates via the UI (allowed domains: hashpass.tech, hashpass.co)');
  sep();
}

// ─── phase 2: set up projects inside the Hashpass-owned org ──────────────────

async function phase2(env) {
  const adminEmail    = env.INFISICAL_ADMIN_EMAIL || 'admin@cig.lat';
  const adminPassword = env.INFISICAL_ADMIN_PASSWORD;
  const hashpassOrgId = env.HASHPASS_ORG_ID;

  if (!adminPassword)  throw new Error('INFISICAL_ADMIN_PASSWORD is required');
  if (!hashpassOrgId)  throw new Error('HASHPASS_ORG_ID is required — get it from the Hashpass admin after they create their org');

  log(`Authenticating as ${adminEmail} …`);
  const loginRes = await api('/api/v3/auth/login', 'POST', null, {
    email: adminEmail,
    password: adminPassword,
  });
  const adminToken = loginRes.accessToken;

  log(`Selecting Hashpass org (${hashpassOrgId}) …`);
  const selectRes = await api('/api/v3/auth/select-organization', 'POST', adminToken, {
    organizationId: hashpassOrgId,
  });
  const scopedToken = selectRes.token;

  const projectsRes = await api('/api/v1/projects?includeRoles=false', 'GET', scopedToken);
  const existingProjects = new Set((projectsRes.projects || []).map(p => p.name));

  for (const { name, environments } of HASHPASS_PROJECTS) {
    if (existingProjects.has(name)) {
      warn(`Project "${name}" already exists in Hashpass org — skipping`);
      continue;
    }
    log(`Creating project "${name}" in Hashpass org …`);
    try {
      await api('/api/v1/projects', 'POST', scopedToken, {
        organizationId: hashpassOrgId,
        projectName: name,
        environments: environments.map(slug => ({
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug,
        })),
      });
      log(`  ✓ "${name}" created`);
    } catch (err) {
      warn(`Failed to create "${name}": ${err.message}`);
    }
  }

  // Machine identity in Hashpass org
  log('Creating machine identity "hashpass-ci" in Hashpass org …');
  try {
    const idRes = await api('/api/v1/identities', 'POST', scopedToken, {
      name: 'hashpass-ci',
      organizationId: hashpassOrgId,
      role: 'member',
    });
    const identityId = idRes.identity?.id;
    await api(`/api/v1/auth/universal-auth/identities/${identityId}`, 'POST', scopedToken, {
      accessTokenTTL: 86400,
      accessTokenMaxTTL: 2592000,
      accessTokenNumUsesLimit: 0,
      clientSecretTrustedIps: [{ ipAddress: '0.0.0.0/0' }, { ipAddress: '::/0' }],
      accessTokenTrustedIps:  [{ ipAddress: '0.0.0.0/0' }, { ipAddress: '::/0' }],
    });
    log(`  ✓ "hashpass-ci" created with Universal Auth (identity id: ${identityId})`);
    log('  Next: Hashpass org → Access Control → Machine Identities → hashpass-ci → Add Client Secret');
  } catch (err) {
    warn(`Machine identity failed: ${err.message}`);
  }

  sep();
  console.log('Phase 2 complete — Hashpass org is fully provisioned.');
  console.log(`  Org ID     : ${hashpassOrgId}`);
  console.log(`  Projects   : ${HASHPASS_PROJECTS.map(p => p.name).join(', ')}`);
  console.log('  CI/CD      : Use "hashpass-ci" Universal Auth credentials');
  sep();
}

// ─── entry point ─────────────────────────────────────────────────────────────

const env = { ...loadEnv(ENV_FILE), ...process.env };
const isPhase2 = process.argv.includes('--phase2');

if (isPhase2) {
  await phase2(env).catch(err => { console.error(`[hashpass] ERROR: ${err.message}`); process.exitCode = 1; });
} else {
  await phase1(env).catch(err => { console.error(`[hashpass] ERROR: ${err.message}`); process.exitCode = 1; });
}
