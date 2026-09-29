/**
 * `cig doctor` — Prerequisite Checks
 *
 * Validates system prerequisites without installing anything.
 * Checks Docker, Docker Compose, network reachability to the control plane,
 * and (when --target ssh) SSH key existence and host reachability.
 *
 * Requirements: 4.6, 5.7, 5.8
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as https from 'https';
import * as http from 'http';

const DEFAULT_CONTROL_PLANE_URL = 'https://api.cig.technology';

export interface DoctorOptions {
  target?: string;
  sshHost?: string;
  sshKeyPath?: string;
  controlPlaneUrl?: string;
  skipNetworkCheck?: boolean;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
  remediation?: string;
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkDocker(): CheckResult {
  try {
    const out = execSync('docker --version', { stdio: 'pipe', encoding: 'utf-8' });
    const version = out.trim();
    return { name: 'Docker available', passed: true, detail: version };
  } catch {
    return {
      name: 'Docker available',
      passed: false,
      detail: 'docker not found',
      remediation: 'Install Docker from https://docs.docker.com/get-docker/',
    };
  }
}

function checkDockerCompose(): CheckResult {
  try {
    const out = execSync('docker compose version', { stdio: 'pipe', encoding: 'utf-8' });
    const version = out.trim();
    return { name: 'Docker Compose available', passed: true, detail: version };
  } catch {
    return {
      name: 'Docker Compose available',
      passed: false,
      detail: 'docker compose not found',
      remediation:
        'Docker Compose is included with Docker Desktop or install separately: https://docs.docker.com/compose/install/',
    };
  }
}

function checkNetworkReachability(controlPlaneUrl: string): Promise<CheckResult> {
  return new Promise((resolve) => {
    const url = new URL(controlPlaneUrl);
    const lib = url.protocol === 'https:' ? https : http;
    const port = url.port ? parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;

    const req = lib.request(
      {
        hostname: url.hostname,
        port,
        path: '/',
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        res.resume(); // drain
        resolve({
          name: `Network reachability to ${controlPlaneUrl}`,
          passed: true,
          detail: `HTTP ${res.statusCode}`,
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: `Network reachability to ${controlPlaneUrl}`,
        passed: false,
        detail: 'connection timed out',
        remediation: 'Check your network connection and firewall settings',
      });
    });

    req.on('error', (err) => {
      resolve({
        name: `Network reachability to ${controlPlaneUrl}`,
        passed: false,
        detail: err.message,
        remediation: 'Check your network connection and firewall settings',
      });
    });

    req.end();
  });
}

function checkSshKeyPath(sshKeyPath: string): CheckResult {
  const exists = fs.existsSync(sshKeyPath);
  if (exists) {
    return { name: `SSH key exists (${sshKeyPath})`, passed: true, detail: 'file found' };
  }
  return {
    name: `SSH key exists (${sshKeyPath})`,
    passed: false,
    detail: `file not found: ${sshKeyPath}`,
    remediation: `Ensure the SSH key file exists at ${sshKeyPath} or specify a different path with --ssh-key-path`,
  };
}

function checkSshHostReachable(sshHost: string): Promise<CheckResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);

    socket.connect(22, sshHost, () => {
      socket.destroy();
      resolve({
        name: `SSH host reachable (${sshHost}:22)`,
        passed: true,
        detail: 'TCP connection to port 22 succeeded',
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        name: `SSH host reachable (${sshHost}:22)`,
        passed: false,
        detail: 'connection timed out',
        remediation: `Ensure ${sshHost} is reachable on port 22 and SSH is running`,
      });
    });

    socket.on('error', (err) => {
      resolve({
        name: `SSH host reachable (${sshHost}:22)`,
        passed: false,
        detail: err.message,
        remediation: `Ensure ${sshHost} is reachable on port 22 and SSH is running`,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Print helpers
// ---------------------------------------------------------------------------

function printResult(result: CheckResult): void {
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const reset = '\x1b[0m';

  if (result.passed) {
    console.log(`${green}✓${reset} ${result.name} (${result.detail})`);
  } else {
    const remediationSuffix = result.remediation ? ` — ${result.remediation}` : '';
    console.log(`${red}✗${reset} ${result.name}: ${result.detail}${remediationSuffix}`);
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function doctor(opts: DoctorOptions = {}): Promise<void> {
  const controlPlaneUrl = opts.controlPlaneUrl ?? process.env['CIG_CONTROL_PLANE_URL'] ?? DEFAULT_CONTROL_PLANE_URL;
  const target = opts.target;

  const results: CheckResult[] = [];

  // Core checks
  results.push(checkDocker());
  results.push(checkDockerCompose());
  if (!opts.skipNetworkCheck) {
    results.push(await checkNetworkReachability(controlPlaneUrl));
  }

  // SSH-specific checks
  if (target === 'ssh') {
    const sshKeyPath = opts.sshKeyPath ?? process.env['CIG_SSH_KEY_PATH'];
    const sshHost = opts.sshHost ?? process.env['CIG_SSH_HOST'];

    if (sshKeyPath) {
      results.push(checkSshKeyPath(sshKeyPath));
    } else {
      results.push({
        name: 'SSH key path',
        passed: false,
        detail: 'not specified',
        remediation: 'Provide --ssh-key-path when using --target ssh',
      });
    }

    if (sshHost) {
      results.push(await checkSshHostReachable(sshHost));
    } else {
      results.push({
        name: 'SSH host',
        passed: false,
        detail: 'not specified',
        remediation: 'Provide --ssh-host when using --target ssh',
      });
    }
  }

  // Print all results
  console.log('');
  for (const result of results) {
    printResult(result);
  }
  console.log('');

  const allPassed = results.every((r) => r.passed);

  if (!allPassed) {
    process.exitCode = 1;
  }
}
