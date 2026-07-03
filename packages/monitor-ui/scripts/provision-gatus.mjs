#!/usr/bin/env node
/**
 * provision-gatus.mjs
 *
 * Reads all orgs + monitors from the monitor-ui API, generates a Gatus
 * config.yml covering TCP, DNS, SSL, and ping checks (the things that
 * monitor-ui's HTTP poller doesn't cover), then pushes the file to the
 * EC2 instance via SSM and restarts the Gatus container.
 *
 * Run this after any change to monitors or when onboarding a new tenant.
 *
 * Usage:
 *   node packages/monitor-ui/scripts/provision-gatus.mjs
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

const MONITOR_URL = env.MONITOR_URL || "https://status.cig.technology";
const ADMIN_TOKEN = env.MONITOR_ADMIN_TOKEN || process.env.MONITOR_ADMIN_TOKEN;
const INSTANCE_ID = env.MONITOR_INSTANCE_ID || process.env.MONITOR_INSTANCE_ID;

const awsEnv = {
  AWS_REGION: "us-east-2",
  AWS_DEFAULT_REGION: "us-east-2",
};
if (env.AWS_PROFILE) awsEnv.AWS_PROFILE = env.AWS_PROFILE;

if (!ADMIN_TOKEN || !INSTANCE_ID) {
  console.error("MONITOR_ADMIN_TOKEN and MONITOR_INSTANCE_ID are required in .env");
  process.exit(1);
}

// Fetch all monitors from the monitor-ui API
async function fetchMonitors() {
  const res = await fetch(`${MONITOR_URL}/api/admin/monitors`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// Build Gatus YAML from monitor list
// monitor-ui handles HTTP checks directly; Gatus covers TCP, DNS, SSL expiry, ICMP
function buildGatusConfig(monitors) {
  const lines = [
    "web:",
    "  port: 8080",
    "",
    "storage:",
    "  type: memory",
    "",
    "endpoints:",
  ];

  // Always include CIG infrastructure as the seed
  const seed = [
    {
      name: "CIG API",
      group: "cig",
      url: "https://api.cig.technology/health",
      interval: "1m",
      conditions: ["[STATUS] == 200", "[RESPONSE_TIME] < 2000"],
    },
    {
      name: "CIG Auth SSL",
      group: "cig",
      url: "https://auth.cig.technology",
      interval: "24h",
      conditions: ["[CERTIFICATE_EXPIRATION] > 720h"],
    },
    {
      name: "CIG Secrets SSL",
      group: "cig",
      url: "https://secrets.cig.technology",
      interval: "24h",
      conditions: ["[CERTIFICATE_EXPIRATION] > 720h"],
    },
  ];

  // Derive Gatus checks from monitor DB entries of types Gatus covers natively
  const gatusTypes = ["tcp", "dns", "ssl", "ping"];
  const fromDb = monitors
    .filter((m) => gatusTypes.includes(m.type))
    .map((m) => {
      const group = m.orgSlug ?? "unknown";
      if (m.type === "tcp") {
        return {
          name: m.name,
          group,
          url: `tcp://${m.target}`,
          interval: `${Math.floor(m.intervalSeconds / 60)}m`,
          conditions: ["[CONNECTED] == true"],
        };
      }
      if (m.type === "ssl") {
        return {
          name: `${m.name} SSL`,
          group,
          url: m.target,
          interval: "24h",
          conditions: ["[CERTIFICATE_EXPIRATION] > 720h"],
        };
      }
      if (m.type === "ping") {
        return {
          name: m.name,
          group,
          url: `icmp://${m.target}`,
          interval: `${Math.floor(m.intervalSeconds / 60)}m`,
          conditions: ["[CONNECTED] == true"],
        };
      }
      if (m.type === "dns") {
        return {
          name: m.name,
          group,
          url: `dns://${m.target}`,
          interval: `${Math.floor(m.intervalSeconds / 60)}m`,
          conditions: ["[DNS_RCODE] == NOERROR"],
        };
      }
    });

  for (const ep of [...seed, ...fromDb]) {
    if (!ep) continue;
    lines.push(`  - name: "${ep.name}"`);
    lines.push(`    group: "${ep.group}"`);
    lines.push(`    url: "${ep.url}"`);
    lines.push(`    interval: "${ep.interval}"`);
    lines.push("    conditions:");
    for (const c of ep.conditions) {
      lines.push(`      - "${c}"`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

console.log("Fetching monitors from monitor API…");
const monitors = await fetchMonitors();
console.log(`  ${monitors.length} monitors loaded`);

const gatusYml = buildGatusConfig(monitors);
console.log("Gatus config generated.");

// Write to temp file and push via SSM
const tmpConfig = `/tmp/gatus-config-${Date.now()}.yml`;
fs.writeFileSync(tmpConfig, gatusYml);

const escapedYml = gatusYml
  .replace(/\\/g, "\\\\")
  .replace(/'/g, "'\\''");

const commands = [
  `cat > /opt/monitor/gatus/config.yml << 'YAMLEOF'\n${gatusYml}\nYAMLEOF`,
  "docker restart monitor-gatus",
  "sleep 2 && docker exec monitor-gatus wget -qO- http://localhost:8080/health && echo 'Gatus healthy'",
];

const tmpSsm = `/tmp/ssm-gatus-${Date.now()}.json`;
fs.writeFileSync(tmpSsm, JSON.stringify({ commands }));

console.log("Pushing config to EC2 via SSM…");
const cmdOut = aws(
  `ssm send-command --region us-east-2 --instance-ids ${INSTANCE_ID} --document-name AWS-RunShellScript --parameters file://${tmpSsm} --output json`,
  awsEnv
);
const commandId = JSON.parse(cmdOut).Command?.CommandId;

fs.unlinkSync(tmpSsm);
fs.unlinkSync(tmpConfig);

console.log(`SSM command ID: ${commandId}`);

for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  try {
    const inv = JSON.parse(
      aws(
        `ssm get-command-invocation --region us-east-2 --command-id ${commandId} --instance-id ${INSTANCE_ID} --output json`,
        awsEnv
      )
    );
    if (inv.Status === "Success") {
      console.log("✓ Gatus config deployed and restarted successfully");
      if (inv.StandardOutputContent?.trim()) {
        console.log(inv.StandardOutputContent);
      }
      break;
    }
    if (["Failed", "Cancelled", "TimedOut"].includes(inv.Status)) {
      console.error("SSM command failed:", inv.StandardOutputContent, inv.StandardErrorContent);
      process.exit(1);
    }
    process.stdout.write("  waiting…\r");
  } catch (_) {}
}
