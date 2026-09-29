/**
 * `cig status` — Node Health Summary
 *
 * Loads the node identity from ~/.cig/node-identity.json, calls
 * GET /api/v1/nodes/:nodeId using the stored access token, and prints
 * a health summary.
 *
 * Requirements: 4.5
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ApiClient } from '../services/api-client.js';
import { CredentialManager } from '../credentials.js';
import type { NodeIdentity } from '../types/runtime.js';

const DEFAULT_API_URL = process.env['CIG_API_URL'] ?? 'https://api.cig.technology';

interface NodeDetail {
  id: string;
  status: 'online' | 'degraded' | 'offline' | 'enrolling' | 'credential-error' | 'revoked';
  lastSeenAt: string | null;
  last_seen?: string | null;
  permissionTier: number;
  permission_tier?: number;
  activeConnectors?: string[];
  active_connectors?: string[];
  hostname?: string;
  os?: string;
  architecture?: string;
}

function loadNodeIdentityFile(): NodeIdentity | null {
  const identityFile = path.join(os.homedir(), '.cig', 'node-identity.json');
  if (!fs.existsSync(identityFile)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(identityFile, 'utf8');
    return JSON.parse(raw) as NodeIdentity;
  } catch {
    return null;
  }
}

function statusColor(status: string): string {
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  switch (status) {
    case 'online':
      return `${green}${status}${reset}`;
    case 'degraded':
      return `${yellow}${status}${reset}`;
    case 'offline':
    case 'revoked':
    case 'credential-error':
      return `${red}${status}${reset}`;
    default:
      return status;
  }
}

/**
 * `cig status` — print node health summary.
 *
 * @param jsonOutput  When true, print raw JSON response.
 * @param apiUrl      Override the control plane API URL.
 */
export async function status(jsonOutput = false, apiUrl = DEFAULT_API_URL): Promise<void> {
  // 1. Load node identity to get nodeId
  const identity = loadNodeIdentityFile();
  if (!identity) {
    const credManager = new CredentialManager();
    const storedIdentity = credManager.loadIdentity();
    if (!storedIdentity) {
      console.error('No node identity found. Run `cig enroll` first.');
      process.exitCode = 1;
      return;
    }
    // Fall through using storedIdentity.targetId as nodeId
    await fetchAndPrint(storedIdentity.targetId, apiUrl, jsonOutput);
    return;
  }

  await fetchAndPrint(identity.nodeId, apiUrl, jsonOutput);
}

async function fetchAndPrint(nodeId: string, apiUrl: string, jsonOutput: boolean): Promise<void> {
  const credManager = new CredentialManager();
  const tokens = credManager.loadTokens();
  const accessToken = tokens?.accessToken;

  const apiClient = new ApiClient({ baseUrl: apiUrl, accessToken });

  let node: NodeDetail;
  try {
    node = await apiClient.get<NodeDetail>(`/api/v1/nodes/${nodeId}`);
  } catch (err) {
    // Fallback: try the targets endpoint used by the existing API
    try {
      node = await apiClient.get<NodeDetail>(`/api/v1/targets/${nodeId}`);
    } catch {
      console.error(`Failed to fetch node status: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
      return;
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(node, null, 2));
    return;
  }

  const lastSeen = node.lastSeenAt ?? node.last_seen ?? 'never';
  const tier = node.permissionTier ?? node.permission_tier ?? 0;
  const connectors = node.activeConnectors ?? node.active_connectors ?? [];

  console.log('');
  console.log(`  Node ID:          ${node.id}`);
  console.log(`  Status:           ${statusColor(node.status)}`);
  console.log(`  Last seen:        ${lastSeen}`);
  console.log(`  Permission tier:  ${tier}`);
  if (node.hostname) {
    console.log(`  Hostname:         ${node.hostname}`);
  }
  if (connectors.length > 0) {
    console.log(`  Active connectors: ${connectors.join(', ')}`);
  } else {
    console.log(`  Active connectors: none`);
  }
  console.log('');
}
