/**
 * `cig permissions` — Permission Tier Display
 *
 * Loads the node identity, calls GET /api/v1/nodes/:nodeId to get the current
 * permission tier, then prints:
 *   - Current tier (0–4) with description
 *   - Active permissions for the current tier
 *   - Policy JSON required to upgrade to the next tier
 *
 * Requirements: 4.8, 11.10
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ApiClient } from '../services/api-client.js';
import { CredentialManager } from '../credentials.js';
import type { NodeIdentity } from '../types/runtime.js';

const DEFAULT_API_URL = process.env['CIG_API_URL'] ?? 'https://api.cig.technology';

// ---------------------------------------------------------------------------
// Tier metadata
// ---------------------------------------------------------------------------

interface TierInfo {
  tier: number;
  name: string;
  description: string;
  permissions: string[];
  upgradePolicyJson?: string;
}

const TIER_INFO: TierInfo[] = [
  {
    tier: 0,
    name: 'Bootstrap',
    description: 'Credential validation only — no discovery',
    permissions: ['Validate cloud credentials'],
    upgradePolicyJson: JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'CIGTier1ReadOnly',
            Effect: 'Allow',
            Action: [
              'ec2:Describe*',
              'rds:Describe*',
              's3:ListAllMyBuckets',
              's3:GetBucketLocation',
              'lambda:List*',
              'lambda:GetFunction',
              'iam:List*',
              'iam:Get*',
            ],
            Resource: '*',
          },
        ],
      },
      null,
      2
    ),
  },
  {
    tier: 1,
    name: 'Base Discovery',
    description: 'Read-only Describe/List for core infrastructure',
    permissions: [
      'ec2:Describe* (EC2 instances, VPCs, subnets, security groups)',
      'rds:Describe* (RDS instances, clusters)',
      's3:ListAllMyBuckets, s3:GetBucketLocation',
      'lambda:List*, lambda:GetFunction',
      'iam:List*, iam:Get*',
    ],
    upgradePolicyJson: JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'CIGTier2ExpandedMetadata',
            Effect: 'Allow',
            Action: [
              'ec2:Describe*',
              'rds:Describe*',
              's3:GetBucketTagging',
              's3:GetBucketPolicy',
              'cloudtrail:LookupEvents',
              'config:GetResourceConfigHistory',
              'ce:GetCostAndUsage',
              'ce:GetCostForecast',
            ],
            Resource: '*',
          },
        ],
      },
      null,
      2
    ),
  },
  {
    tier: 2,
    name: 'Expanded Metadata',
    description: 'Tags, cost allocation, config history, CloudTrail events',
    permissions: [
      'All Tier 1 permissions',
      'cloudtrail:LookupEvents',
      'config:GetResourceConfigHistory',
      'ce:GetCostAndUsage, ce:GetCostForecast',
      's3:GetBucketTagging, s3:GetBucketPolicy',
    ],
    upgradePolicyJson: JSON.stringify(
      {
        note: 'Tier 3 requires explicit connector approval via the Dashboard.',
        description:
          'Navigate to Nodes → [your node] → Connectors and request a sensitive connector.',
        connectors: ['aws-cost-explorer', 'aws-secrets-manager', 'aws-cloudwatch-logs'],
      },
      null,
      2
    ),
  },
  {
    tier: 3,
    name: 'Sensitive Connectors',
    description: 'Dedicated scoped credentials per approved connector',
    permissions: [
      'All Tier 2 permissions',
      'Per-connector scoped credentials (approved individually)',
    ],
    upgradePolicyJson: JSON.stringify(
      {
        note: 'Tier 4 requires explicit per-action approval via the Dashboard.',
        description:
          'Navigate to Nodes → [your node] → Actions and request specific mutating actions.',
        examples: ['ec2:StartInstances', 'ec2:StopInstances', 'rds:RebootDBInstance'],
      },
      null,
      2
    ),
  },
  {
    tier: 4,
    name: 'Mutating Actions',
    description: 'Explicit per-action approval for remediation and automation',
    permissions: [
      'All Tier 3 permissions',
      'Per-action mutating permissions (approved individually)',
    ],
    // No upgrade — this is the highest tier
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * `cig permissions` — display current tier and next-tier upgrade policy.
 *
 * @param apiUrl  Override the control plane API URL.
 */
export async function permissions(apiUrl = DEFAULT_API_URL): Promise<void> {
  // 1. Resolve nodeId
  let nodeId: string | undefined;

  const identityFile = loadNodeIdentityFile();
  if (identityFile) {
    nodeId = identityFile.nodeId;
  } else {
    const credManager = new CredentialManager();
    const storedIdentity = credManager.loadIdentity();
    nodeId = storedIdentity?.targetId;
  }

  // 2. Fetch current tier from API (if we have a nodeId and token)
  let currentTier = 0;

  if (nodeId) {
    const credManager = new CredentialManager();
    const tokens = credManager.loadTokens();
    const accessToken = tokens?.accessToken;
    const apiClient = new ApiClient({ baseUrl: apiUrl, accessToken });

    try {
      const node = await apiClient.get<{ permissionTier?: number; permission_tier?: number }>(
        `/api/v1/nodes/${nodeId}`
      );
      currentTier = node.permissionTier ?? node.permission_tier ?? 0;
    } catch {
      // Fallback to targets endpoint
      try {
        const node = await apiClient.get<{ permissionTier?: number; permission_tier?: number }>(
          `/api/v1/targets/${nodeId}`
        );
        currentTier = node.permissionTier ?? node.permission_tier ?? 0;
      } catch {
        // Could not reach API — show static tier info only
        console.warn('  (Could not reach API — showing static tier information)\n');
      }
    }
  } else {
    console.warn('  (No node identity found — showing static tier information)\n');
  }

  // 3. Print current tier info
  const info = TIER_INFO[currentTier];
  if (!info) {
    console.error(`Unknown permission tier: ${currentTier}`);
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log(`  Current permission tier: ${currentTier} — ${info.name}`);
  console.log(`  ${info.description}`);
  console.log('');
  console.log('  Active permissions:');
  for (const perm of info.permissions) {
    console.log(`    • ${perm}`);
  }

  // 4. Print next-tier upgrade policy
  if (currentTier < 4 && info.upgradePolicyJson) {
    const nextTier = TIER_INFO[currentTier + 1];
    console.log('');
    console.log(
      `  To upgrade to Tier ${currentTier + 1} (${nextTier?.name ?? ''}), apply the following policy:`
    );
    console.log('');
    console.log(info.upgradePolicyJson);
  } else if (currentTier === 4) {
    console.log('');
    console.log('  You are at the maximum permission tier (Tier 4).');
  }

  console.log('');
}
