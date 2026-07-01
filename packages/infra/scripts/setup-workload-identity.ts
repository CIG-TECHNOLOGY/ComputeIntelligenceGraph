#!/usr/bin/env ts-node
/**
 * One-time script to configure Workload Identity Federation for GitHub Actions.
 *
 * Prerequisites:
 *   - gcloud CLI installed and authenticated with an Owner/Editor account
 *   - IAM API enabled on the project
 *
 * Usage:
 *   npx ts-node packages/infra/scripts/setup-workload-identity.ts
 *
 * Or via package.json script:
 *   pnpm --filter @cig/infra exec ts-node scripts/setup-workload-identity.ts
 */

import { setupWorkloadIdentity } from '../src/gcp/WorkloadIdentity';

setupWorkloadIdentity({
  project: 'cig-technology',
  githubRepo: 'CIG-TECHNOLOGY/ComputeIntelligenceGraph',
  serviceAccount: 'cig-lat@cig-technology.iam.gserviceaccount.com',
})
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  });
