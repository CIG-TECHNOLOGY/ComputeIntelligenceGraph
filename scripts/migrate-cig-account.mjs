#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ENV_FILE = path.join(ROOT_DIR, '.env');
const BOOTSTRAP_DIR = path.join(ROOT_DIR, 'packages/iac/environments/bootstrap-account');
const LEAN_DIR = path.join(ROOT_DIR, 'packages/iac/environments/lean-prod');
const DEFAULT_REGION = 'us-east-2';
const DEFAULT_DOMAIN = 'cig.technology';
const DEFAULT_API_REPOSITORY = 'cig-api';
const DEFAULT_DOCKERHUB_USERNAME = 'cigtechnology';
const MAIN_CIG_AWS_ACCOUNT_ID = '520900722378';

function parseArgs(argv) {
  const result = {
    envFile: DEFAULT_ENV_FILE,
    region: DEFAULT_REGION,
    domain: DEFAULT_DOMAIN,
    apiImageUri: '',
    replaceAuthentik: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--env-file') {
      index += 1;
      if (index >= argv.length) {
        throw new Error('--env-file requires a value');
      }
      result.envFile = path.resolve(argv[index]);
      continue;
    }

    if (arg === '--region') {
      index += 1;
      if (index >= argv.length) {
        throw new Error('--region requires a value');
      }
      result.region = argv[index];
      continue;
    }

    if (arg === '--domain') {
      index += 1;
      if (index >= argv.length) {
        throw new Error('--domain requires a value');
      }
      result.domain = argv[index];
      continue;
    }

    if (arg === '--api-image-uri') {
      index += 1;
      if (index >= argv.length) {
        throw new Error('--api-image-uri requires a value');
      }
      result.apiImageUri = argv[index];
      continue;
    }

    if (arg === '--replace-authentik') {
      result.replaceAuthentik = true;
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      result.help = true;
      return result;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  result.help = false;
  return result;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/migrate-cig-account.mjs [--env-file .env] [--region us-east-2] [--domain cig.technology] [--api-image-uri <uri>] [--replace-authentik]

What it does:
  1. Bootstraps the new AWS account state bucket, lock table, and Route 53 hosted zone
  2. Restores the shared mail DNS records so SPF, DKIM, DMARC, MX, and IMAPS/submission stay intact
  3. Applies the lean Authentik host first
  4. Waits for the Authentik bootstrap marker and verifies the Google/GitHub login flows
  5. Syncs API secrets
  6. Applies the API host stack
  7. Waits for the API and Authentik bootstrap markers in console output

The script expects AWS credentials in the env file (for example AWS_KEY_ID / AWS_SECRET_ACCESS_KEY).
It ignores AWS_PROFILE/default and derives the active account from STS after loading the explicit keys.
It refuses to mutate any Authentik or production API resources unless STS resolves to AWS account 520900722378.
It also expects the Authentik social-login credentials:
  GOOGLE_AUTH_CLIENT_ID / GOOGLE_AUTH_CLIENT_SECRET
  GITHUB_AUTH_CLIENT_ID / GITHUB_AUTH_CLIENT_SECRET
If --api-image-uri is omitted, it defaults to the public Docker Hub tag for the current API source fingerprint.
Pass --replace-authentik to force a clean replacement of the Authentik EC2 host when the live bootstrap is stale or broken.
The lean stack does not require SSM for verification, but it still uses the AWS control plane to read console output.
`.trim());
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (value.length === 0) {
    return '';
  }

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
  if (!fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    env[key] = parseEnvValue(rawValue);
  }

  return env;
}

function buildAwsEnv(parsedEnv, region) {
  const env = { ...process.env };

  const accessKeyId =
    parsedEnv.AWS_ACCESS_KEY_ID ||
    parsedEnv.AWS_KEY_ID ||
    env.AWS_ACCESS_KEY_ID ||
    env.AWS_KEY_ID;
  const secretAccessKey =
    parsedEnv.AWS_SECRET_ACCESS_KEY ||
    parsedEnv.AWS_SECRET_KEY ||
    env.AWS_SECRET_ACCESS_KEY ||
    env.AWS_SECRET_KEY;
  const sessionToken =
    parsedEnv.AWS_SESSION_TOKEN ||
    parsedEnv.AWS_SECURITY_TOKEN ||
    env.AWS_SESSION_TOKEN ||
    env.AWS_SECURITY_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'CIG migration requires explicit AWS access keys in .env; AWS_PROFILE/default is not used.',
    );
  }

  env.AWS_ACCESS_KEY_ID = accessKeyId;
  env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
  if (sessionToken) {
    env.AWS_SESSION_TOKEN = sessionToken;
  } else {
    delete env.AWS_SESSION_TOKEN;
  }
  delete env.AWS_PROFILE;
  delete env.AWS_DEFAULT_PROFILE;
  env.AWS_REGION = region;
  env.AWS_DEFAULT_REGION = region;
  env.AWS_EC2_METADATA_DISABLED = 'true';
  env.TF_IN_AUTOMATION = 'true';
  env.TF_INPUT = 'false';
  env.AWS_PAGER = '';

  const accountId = run(
    'aws',
    ['sts', 'get-caller-identity', '--region', region, '--query', 'Account', '--output', 'text'],
    { env },
  ).stdout.trim();

  if (!accountId) {
    throw new Error('Unable to resolve the AWS account id for the migration account.');
  }

  if (accountId !== MAIN_CIG_AWS_ACCOUNT_ID) {
    throw new Error(
      `CIG migration must run against AWS account ${MAIN_CIG_AWS_ACCOUNT_ID}; resolved ${accountId}.`,
    );
  }

  env.AWS_ACCOUNT_ID = accountId;
  return env;
}

function run(command, args, { cwd = ROOT_DIR, env = process.env, capture = true, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (!allowFailure && result.status !== 0) {
    const stderr = capture ? (result.stderr || '').trim() : '';
    const stdout = capture ? (result.stdout || '').trim() : '';
    throw new Error(
      `${command} ${args.join(' ')} failed${stderr || stdout ? `\n${stderr || stdout}` : ''}`,
    );
  }

  return {
    status: result.status ?? 0,
    stdout: capture ? (result.stdout || '').trim() : '',
  };
}

function terraform(dir, args, env) {
  return run('terraform', [`-chdir=${dir}`, ...args], { env });
}

function aws(args, env) {
  return run('aws', args, { env });
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse ${label} JSON: ${(error && error.message) || String(error)}\n${stdout}`);
  }
}

function requireValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeNameServers(values) {
  return values
    .map((value) => value.trim().replace(/\.$/, ''))
    .filter((value) => value.length > 0)
    .sort();
}

function resolveDelegatedRoute53ZoneId(domain, fallbackZoneId, env) {
  const publicNameServers = normalizeNameServers(
    run('dig', ['NS', domain, '+short'], { env }).stdout.split(/\r?\n/),
  );

  if (publicNameServers.length === 0) {
    return fallbackZoneId;
  }

  const hostedZones = parseJson(
    aws(['route53', 'list-hosted-zones-by-name', '--dns-name', domain, '--output', 'json'], env).stdout,
    'route53 hosted zones',
  );

  for (const hostedZone of hostedZones.HostedZones ?? []) {
    if (hostedZone.Name !== `${domain}.`) {
      continue;
    }

    const zoneId = hostedZone.Id.replace(/^\/hostedzone\//, '');
    const zoneDetails = parseJson(
      aws(['route53', 'get-hosted-zone', '--id', zoneId], env).stdout,
      `route53 hosted zone ${zoneId}`,
    );
    const zoneNameServers = normalizeNameServers(zoneDetails.DelegationSet?.NameServers ?? []);

    if (
      zoneNameServers.length > 0 &&
      zoneNameServers.length === publicNameServers.length &&
      zoneNameServers.every((nameServer, index) => nameServer === publicNameServers[index])
    ) {
      return zoneId;
    }
  }

  return fallbackZoneId;
}

function retrySync(fn, { attempts = 30, delayMs = 10000, label = 'operation' } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        process.stderr.write(`[wait] ${label} attempt ${attempt} failed; retrying...\n`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
      }
    }
  }

  throw lastError ?? new Error(`${label} failed`);
}

function sendSsmCommand(instanceId, region, commands, env) {
  const payload = JSON.stringify({ commands });
  const { stdout } = aws(
    [
      'ssm',
      'send-command',
      '--region',
      region,
      '--instance-ids',
      instanceId,
      '--document-name',
      'AWS-RunShellScript',
      '--comment',
      'CIG account migration verification',
      '--parameters',
      payload,
      '--query',
      'Command.CommandId',
      '--output',
      'text',
    ],
    env,
  );

  const commandId = stdout.trim();
  if (!commandId) {
    throw new Error('Failed to start SSM command');
  }

  aws(
    [
      'ssm',
      'wait',
      'command-executed',
      '--region',
      region,
      '--command-id',
      commandId,
      '--instance-id',
      instanceId,
    ],
    env,
  );

  const invocation = aws(
    [
      'ssm',
      'get-command-invocation',
      '--region',
      region,
      '--command-id',
      commandId,
      '--instance-id',
      instanceId,
      '--query',
      '{Status:Status,StatusDetails:StatusDetails,ResponseCode:ResponseCode,StandardOutputContent:StandardOutputContent,StandardErrorContent:StandardErrorContent}',
      '--output',
      'json',
    ],
    env,
  );

  const result = parseJson(invocation.stdout, 'SSM invocation');
  if (result.ResponseCode !== 0) {
    throw new Error(
      `SSM command failed on ${instanceId}: ${result.Status} (${result.StatusDetails})\n${result.StandardErrorContent || ''}`,
    );
  }

  return result.StandardOutputContent || '';
}

function waitForConsoleMarker(instanceId, region, marker, env, { attempts = 30, delayMs = 10000, label = 'console output' } = {}) {
  return retrySync(
    () => {
      const { stdout } = aws(
        [
          'ec2',
          'get-console-output',
          '--region',
          region,
          '--instance-id',
          instanceId,
          '--latest',
          '--output',
          'text',
          '--query',
          'Output',
        ],
        env,
      );

      if (!stdout.includes(marker)) {
        throw new Error(`Waiting for ${label} marker "${marker}"`);
      }

      return stdout;
    },
    { attempts, delayMs, label },
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const parsedEnv = loadEnvFile(args.envFile);
  const awsEnv = buildAwsEnv(parsedEnv, args.region);

  const bootstrapEnv = {
    ...awsEnv,
    TF_VAR_region: args.region,
    TF_VAR_domain: args.domain,
  };

  console.log(`Bootstrapping account for ${args.domain} in ${args.region}`);
  terraform(BOOTSTRAP_DIR, ['init', '-input=false'], bootstrapEnv);
  terraform(BOOTSTRAP_DIR, ['apply', '-auto-approve', '-input=false'], bootstrapEnv);
  const bootstrapOutputs = parseJson(
    terraform(BOOTSTRAP_DIR, ['output', '-json'], bootstrapEnv).stdout,
    'bootstrap outputs',
  );

  const stateBucket = requireValue(bootstrapOutputs.state_bucket?.value, 'state bucket');
  const lockTable = requireValue(bootstrapOutputs.lock_table?.value, 'lock table');
  const bootstrapRoute53ZoneId = requireValue(bootstrapOutputs.route53_zone_id?.value, 'route53 zone id');
  const route53ZoneId = resolveDelegatedRoute53ZoneId(args.domain, bootstrapRoute53ZoneId, awsEnv);
  const nameServers = Array.isArray(bootstrapOutputs.name_servers?.value)
    ? bootstrapOutputs.name_servers.value
    : [];

  let apiImageUri = args.apiImageUri || parsedEnv.API_IMAGE_URI || '';
  if (!apiImageUri) {
    const apiImpact = parseJson(
      run('node', ['scripts/detect-api-impact.mjs', '--head', 'HEAD'], {
        cwd: ROOT_DIR,
        env: awsEnv,
      }).stdout,
      'API impact',
    );
    const sourceTag = requireValue(
      apiImpact.apiSourceTag ?? apiImpact.api_source_tag,
      'api source tag',
    );
    apiImageUri = `docker.io/${DEFAULT_DOCKERHUB_USERNAME}/${DEFAULT_API_REPOSITORY}:${sourceTag}`;
  }

  const googleAuthClientId = requireValue(parsedEnv.GOOGLE_AUTH_CLIENT_ID, 'GOOGLE_AUTH_CLIENT_ID');
  const googleAuthClientSecret = requireValue(parsedEnv.GOOGLE_AUTH_CLIENT_SECRET, 'GOOGLE_AUTH_CLIENT_SECRET');
  const githubAuthClientId = requireValue(parsedEnv.GITHUB_AUTH_CLIENT_ID, 'GITHUB_AUTH_CLIENT_ID');
  const githubAuthClientSecret = requireValue(parsedEnv.GITHUB_AUTH_CLIENT_SECRET, 'GITHUB_AUTH_CLIENT_SECRET');

  const leanBackendEnv = {
    ...awsEnv,
    TF_VAR_region: args.region,
    TF_VAR_route53_zone_id: route53ZoneId,
    TF_VAR_api_image_uri: 'placeholder://bootstrap-auth-only',
    TF_VAR_authentik_admin_email: parsedEnv.AUTHENTIK_ADMIN_EMAIL ?? 'admin@cig.technology',
    TF_VAR_authentik_oidc_client_id: parsedEnv.AUTHENTIK_CLIENT_ID ?? 'cig-dashboard',
    TF_VAR_authentik_oidc_client_secret: parsedEnv.AUTHENTIK_CLIENT_SECRET ?? '',
    TF_VAR_google_auth_client_id: googleAuthClientId,
    TF_VAR_google_auth_client_secret: googleAuthClientSecret,
    TF_VAR_github_auth_client_id: githubAuthClientId,
    TF_VAR_github_auth_client_secret: githubAuthClientSecret,
    TF_VAR_smtp_host: parsedEnv.SMTP_HOST ?? '',
    TF_VAR_smtp_port: parsedEnv.SMTP_PORT ?? '587',
    TF_VAR_smtp_username: parsedEnv.SMTP_USERNAME ?? '',
    TF_VAR_smtp_password: parsedEnv.SMTP_PASSWORD ?? '',
    TF_VAR_smtp_from: parsedEnv.SMTP_FROM_EMAIL ?? '',
    TF_VAR_ssh_public_key: parsedEnv.SSH_PUBLIC_KEY ?? '',
  };

  const backendArgs = [
    'init',
    '-reconfigure',
    '-input=false',
    '-backend-config',
    `bucket=${stateBucket}`,
    '-backend-config',
    'key=prod/lean-prod/terraform.tfstate',
    '-backend-config',
    `region=${args.region}`,
    '-backend-config',
    `dynamodb_table=${lockTable}`,
    '-backend-config',
    'encrypt=true',
  ];

  console.log('Applying Authentik host first so its OIDC values can seed the API secrets');
  terraform(LEAN_DIR, backendArgs, leanBackendEnv);
  const authentikApplyArgs = ['apply', '-auto-approve', '-input=false', '-target=module.authentik_host'];
  if (args.replaceAuthentik) {
    authentikApplyArgs.push('-replace=module.authentik_host.aws_instance.authentik');
  }
  terraform(LEAN_DIR, authentikApplyArgs, leanBackendEnv);

  const authOutputs = parseJson(terraform(LEAN_DIR, ['output', '-json'], leanBackendEnv).stdout, 'auth outputs');
  const authentikInstanceId = requireValue(authOutputs.authentik_instance_id?.value, 'authentik instance id');
  const authentikElasticIp = requireValue(authOutputs.authentik_elastic_ip?.value, 'authentik elastic ip');
  const authClientId = requireValue(
    authOutputs.authentik_oidc_client_id?.value ?? parsedEnv.AUTHENTIK_CLIENT_ID ?? 'cig-dashboard',
    'authentik client id',
  );
  const authClientSecret = requireValue(
    authOutputs.authentik_oidc_client_secret?.value ?? parsedEnv.AUTHENTIK_CLIENT_SECRET ?? '',
    'authentik client secret',
  );
  const authIssuer = `https://${args.domain}/application/o/${authClientId}/`;
  const authJwksUri = `${authIssuer}jwks/`;
  const authTokenEndpoint = `${authIssuer}token/`;

  console.log(`Authentik host provisioned: ${authentikInstanceId} (${authentikElasticIp})`);
  waitForConsoleMarker(
    authentikInstanceId,
    args.region,
    'Authentik host bootstrap complete',
    awsEnv,
    { label: 'Authentik bootstrap' },
  );

  const databaseUrl = parsedEnv.SUPABASE_DIRECT_URL_POOLER || parsedEnv.SUPABASE_DIRECT_URL || parsedEnv.SUPABASE_DATABASE_URL;
  const supabaseUrl = parsedEnv.SUPABASE_URL;
  const supabaseServiceRoleKey = parsedEnv.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = parsedEnv.JWT_SECRET;
  const openAiApiKey = parsedEnv.OPENAI_API_KEY;
  const smtpFromEmail = parsedEnv.SMTP_FROM_EMAIL;
  const smtpPassword = parsedEnv.SMTP_PASSWORD;

  requireValue(databaseUrl, 'SUPABASE_DIRECT_URL_POOLER or SUPABASE_DIRECT_URL');
  requireValue(supabaseUrl, 'SUPABASE_URL');
  requireValue(supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY');
  requireValue(jwtSecret, 'JWT_SECRET');
  requireValue(openAiApiKey, 'OPENAI_API_KEY');
  requireValue(smtpFromEmail, 'SMTP_FROM_EMAIL');
  requireValue(smtpPassword, 'SMTP_PASSWORD');

  const secretsEnv = {
    ...awsEnv,
    AWS_REGION: args.region,
    AWS_DEFAULT_REGION: args.region,
  };

  const secrets = [
    ['/cig/prod/api/database-url', databaseUrl],
    ['/cig/prod/api/supabase-url', supabaseUrl],
    ['/cig/prod/api/supabase-service-role-key', supabaseServiceRoleKey],
    ['/cig/prod/api/jwt-secret', jwtSecret],
    ['/cig/prod/api/authentik-issuer-url', authIssuer],
    ['/cig/prod/api/authentik-jwks-uri', authJwksUri],
    ['/cig/prod/api/authentik-token-endpoint', authTokenEndpoint],
    ['/cig/prod/api/oidc-client-id', authClientId],
    ['/cig/prod/api/oidc-client-secret', authClientSecret],
    ['/cig/prod/api/openai-api-key', openAiApiKey],
    ['/cig/prod/api/smtp-from-email', smtpFromEmail],
    ['/cig/prod/api/smtp-password', smtpPassword],
  ];

  console.log('Syncing API runtime secrets into the new AWS account');
  for (const [secretName, secretValue] of secrets) {
    const describeResult = run(
      'aws',
      ['secretsmanager', 'describe-secret', '--region', args.region, '--secret-id', secretName],
      { env: secretsEnv, allowFailure: true },
    );

    if (describeResult.status === 0 && describeResult.stdout) {
      aws(
        [
          'secretsmanager',
          'put-secret-value',
          '--region',
          args.region,
          '--secret-id',
          secretName,
          '--secret-string',
          secretValue,
        ],
        secretsEnv,
      );
    } else {
      aws(
        [
          'secretsmanager',
          'create-secret',
          '--region',
          args.region,
          '--name',
          secretName,
          '--secret-string',
          secretValue,
        ],
        secretsEnv,
      );
    }
  }

  const fullApplyEnv = {
    ...leanBackendEnv,
    TF_VAR_route53_zone_id: route53ZoneId,
    TF_VAR_api_image_uri: apiImageUri,
    TF_VAR_authentik_admin_email: parsedEnv.AUTHENTIK_ADMIN_EMAIL ?? 'admin@cig.technology',
    TF_VAR_authentik_oidc_client_id: parsedEnv.AUTHENTIK_CLIENT_ID ?? 'cig-dashboard',
    TF_VAR_authentik_oidc_client_secret: parsedEnv.AUTHENTIK_CLIENT_SECRET ?? '',
    TF_VAR_smtp_host: parsedEnv.SMTP_HOST ?? '',
    TF_VAR_smtp_port: parsedEnv.SMTP_PORT ?? '587',
    TF_VAR_smtp_username: parsedEnv.SMTP_USERNAME ?? '',
    TF_VAR_smtp_password: parsedEnv.SMTP_PASSWORD ?? '',
    TF_VAR_smtp_from: parsedEnv.SMTP_FROM_EMAIL ?? '',
    TF_VAR_ssh_public_key: parsedEnv.SSH_PUBLIC_KEY ?? '',
  };

  console.log(`Applying full lean production stack with API image ${apiImageUri}`);
  terraform(LEAN_DIR, ['apply', '-auto-approve', '-input=false'], fullApplyEnv);
  const finalOutputs = parseJson(terraform(LEAN_DIR, ['output', '-json'], fullApplyEnv).stdout, 'final outputs');

  const apiInstanceId = requireValue(finalOutputs.api_instance_id?.value, 'api instance id');
  const apiElasticIp = requireValue(finalOutputs.api_elastic_ip?.value, 'api elastic ip');
  const apiUrl = requireValue(finalOutputs.api_url?.value, 'api url');
  const authUrl = requireValue(finalOutputs.authentik_url?.value, 'authentik url');

  waitForConsoleMarker(apiInstanceId, args.region, 'CIG API host bootstrap complete', awsEnv, {
    label: 'API bootstrap',
  });
  waitForConsoleMarker(authentikInstanceId, args.region, 'Authentik host bootstrap complete', awsEnv, {
    label: 'Authentik bootstrap',
  });

  console.log('');
  console.log('Migration complete');
  console.log(`  Account zone: ${route53ZoneId}`);
  console.log(`  Hosted zone NS: ${nameServers.join(', ') || '(not returned)'}`);
  console.log(`  API host: ${apiInstanceId} (${apiElasticIp})`);
  console.log(`  Auth host: ${authentikInstanceId} (${authentikElasticIp})`);
  console.log(`  API URL: ${apiUrl}`);
  console.log(`  Auth URL: ${authUrl}`);
  console.log('');
  console.log('Bootstrap markers:');
  console.log('  API: CIG API host bootstrap complete');
  console.log('  Authentik: Authentik host bootstrap complete');
  console.log('');
  console.log('Next step: delegate cig.technology to the new Route 53 name servers above.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
}
