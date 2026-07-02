#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ENV_FILE = path.join(ROOT_DIR, '.env');
const DEFAULT_REGION = 'us-east-2';
const MAIN_CIG_AWS_ACCOUNT_ID = '520900722378';

const targetSecrets = [
  '/cig/prod/api/database-url',
  '/cig/prod/api/supabase-url',
  '/cig/prod/api/supabase-service-role-key',
  '/cig/prod/api/jwt-secret',
  '/cig/prod/api/authentik-issuer-url',
  '/cig/prod/api/authentik-jwks-uri',
  '/cig/prod/api/authentik-token-endpoint',
  '/cig/prod/api/oidc-client-id',
  '/cig/prod/api/oidc-client-secret',
  '/cig/prod/api/openai-api-key',
  '/cig/prod/api/smtp-from-email',
  '/cig/prod/api/smtp-password',
  'cig-api/neo4j/password'
];

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (value.length === 0) return '';
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    let inner = value.slice(1, -1);
    if (first === '"') {
      inner = inner
        .replaceAll('\\n', '\n')
        .replaceAll('\\r', '\r')
        .replaceAll('\\t', '\t')
        .replaceAll('\\"', '"')
        .replaceAll('\\\\', '\\');
    } else {
      inner = inner.replaceAll("\\'", "'");
    }
    return inner;
  }
  const inlineCommentIndex = value.search(/\s#/);
  return inlineCommentIndex >= 0 ? value.slice(0, inlineCommentIndex).trimEnd() : value;
}

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    env[key] = parseEnvValue(rawValue);
  }
  return env;
}

function run(command, args, { env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || ''}`);
  }
  return result.stdout.trim();
}

function buildAwsEnv(parsedEnv, region) {
  const env = { ...process.env };
  const accessKeyId = parsedEnv.AWS_ACCESS_KEY_ID || parsedEnv.AWS_KEY_ID || env.AWS_ACCESS_KEY_ID || env.AWS_KEY_ID;
  const secretAccessKey = parsedEnv.AWS_SECRET_ACCESS_KEY || parsedEnv.AWS_SECRET_KEY || env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_KEY;
  const sessionToken = parsedEnv.AWS_SESSION_TOKEN || parsedEnv.AWS_SECURITY_TOKEN || env.AWS_SESSION_TOKEN || env.AWS_SECURITY_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('CIG migration requires explicit AWS access keys in .env');
  }

  env.AWS_ACCESS_KEY_ID = accessKeyId;
  env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
  if (sessionToken) env.AWS_SESSION_TOKEN = sessionToken;
  else delete env.AWS_SESSION_TOKEN;
  delete env.AWS_PROFILE;
  delete env.AWS_DEFAULT_PROFILE;
  env.AWS_REGION = region;
  env.AWS_DEFAULT_REGION = region;

  const accountId = run('aws', ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'], { env });
  if (accountId !== MAIN_CIG_AWS_ACCOUNT_ID) {
    throw new Error(`CIG migration must run against AWS account ${MAIN_CIG_AWS_ACCOUNT_ID}; resolved ${accountId}`);
  }
  return env;
}

async function apiRequest(url, method, headers, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers }
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Request to ${url} failed with ${response.status}: ${text}`);
  }
  return response.json();
}

async function main() {
  const parsedEnv = loadEnvFile(DEFAULT_ENV_FILE);
  const awsEnv = buildAwsEnv(parsedEnv, DEFAULT_REGION);

  const infisicalUrl = parsedEnv.INFISICAL_URL || 'https://secrets.cig.technology';
  const email = parsedEnv.INFISICAL_ADMIN_EMAIL || 'admin@cig.lat';
  const password = parsedEnv.INFISICAL_ADMIN_PASSWORD || 'bRVwx2zZsbFZsL';

  console.log(`Authenticating against Infisical API at ${infisicalUrl} as ${email}`);
  const loginRes = await apiRequest(`${infisicalUrl}/api/v3/auth/login`, 'POST', {}, { email, password });
  const rawToken = loginRes.accessToken;

  console.log('Retrieving organization ID');
  const orgsRes = await apiRequest(`${infisicalUrl}/api/v1/organization`, 'GET', { Authorization: `Bearer ${rawToken}` });
  if (!orgsRes.organizations || orgsRes.organizations.length === 0) {
    throw new Error('No organizations found');
  }
  const orgId = orgsRes.organizations[0].id;

  console.log(`Selecting organization: ${orgId}`);
  const selectRes = await apiRequest(`${infisicalUrl}/api/v3/auth/select-organization`, 'POST', { Authorization: `Bearer ${rawToken}` }, { organizationId: orgId });
  const scopedToken = selectRes.token;

  console.log('Querying projects to locate cig-production workspace ID');
  const projectsRes = await apiRequest(`${infisicalUrl}/api/v1/projects?includeRoles=false`, 'GET', { Authorization: `Bearer ${scopedToken}` });
  const project = projectsRes.projects.find(p => p.name === 'cig-production');
  if (!project) throw new Error('Could not find cig-production project');
  const projectId = project.id;
  console.log(`Located cig-production project ID: ${projectId}`);

  console.log('\nBeginning secret migration from AWS Secrets Manager -> Infisical (cig-production, Production environment)');
  const authHeaders = { Authorization: `Bearer ${scopedToken}` };

  for (const secretName of targetSecrets) {
    console.log(`Fetching secret ${secretName} from AWS Secrets Manager...`);
    try {
      const secretValue = run('aws', ['secretsmanager', 'get-secret-value', '--secret-id', secretName, '--query', 'SecretString', '--output', 'text'], { env: awsEnv });
      
      const payloadKey = secretName.split('/').pop().toUpperCase().replaceAll('-', '_');
      console.log(`Uploading raw secret to Infisical [${payloadKey}]...`);

      const payload = {
        workspaceId: projectId,
        environment: 'prod',
        type: 'shared',
        secretPath: '/',
        secretKey: payloadKey,
        secretValue: secretValue
      };

      await apiRequest(`${infisicalUrl}/api/v3/secrets/raw/${payloadKey}`, 'POST', authHeaders, payload);
      console.log(`Successfully migrated ${payloadKey}!`);
    } catch (err) {
      console.error(`Failed to migrate ${secretName}: ${err.message}`);
    }
  }

  console.log('\nMigration complete! All active production secrets are now managed by Infisical.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
