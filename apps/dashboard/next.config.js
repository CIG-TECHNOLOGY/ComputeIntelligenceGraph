/** @type {import('next').NextConfig} */
const { version } = require('../../package.json');
const fs = require('node:fs');
const path = require('node:path');

function loadReleaseMetadata() {
  try { return require('../../release-metadata.json'); } catch { return null; }
}

const meta = loadReleaseMetadata();
const metaOk = meta?.version === version;
const buildNumber = process.env.NEXT_PUBLIC_APP_BUILD
  || (metaOk && meta.buildNumber != null ? String(meta.buildNumber) : '');
const releaseTag = process.env.NEXT_PUBLIC_RELEASE_TAG
  || (metaOk ? meta.releaseTag : `v${version}`);
const authentikClientIdFallback = 'cig-dashboard';
const authentikClientId = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID?.trim();
const resolvedAuthentikClientId = authentikClientId || authentikClientIdFallback;

if (process.env.CI === 'true' && !authentikClientId) {
  throw new Error('NEXT_PUBLIC_AUTHENTIK_CLIENT_ID is required to build the dashboard app');
}

function writeRuntimeVersionAsset() {
  const payload = {
    version,
    releaseTag,
    buildNumber,
    generatedAt: new Date().toISOString(),
  };
  const outDir = path.join(__dirname, 'public');
  const outPath = path.join(outDir, 'runtime-version.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeServiceWorkerAsset() {
  const signature = [version, releaseTag, buildNumber].filter(Boolean).join(' ');
  const source = `/* CIG dashboard update worker ${signature} */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
`;
  const outDir = path.join(__dirname, 'public');
  const outPath = path.join(outDir, 'sw.js');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, source, 'utf8');
}

writeRuntimeVersionAsset();
writeServiceWorkerAsset();

const nextConfig = {
  // Standalone output bundles server.js + node_modules into .next/standalone/
  // Required by packages/infra/docker/Dockerfile.dashboard for production containers.
  output: 'standalone',
  transpilePackages: ['@cig/auth', '@cig/ui', '@edcalderon/auth'],
  env: {
    NEXT_PUBLIC_BASE_PATH: '',
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_BUILD: buildNumber,
    NEXT_PUBLIC_RELEASE_TAG: releaseTag,
    // Fallback to localhost landing so logout works in local dev even without .env.local
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001',
    NEXT_PUBLIC_AUTHENTIK_URL: process.env.NEXT_PUBLIC_AUTHENTIK_URL || 'https://auth.cig.technology',
    NEXT_PUBLIC_AUTHENTIK_CLIENT_ID: resolvedAuthentikClientId,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || 'https://cig.lat/documentation',
  },
};

module.exports = nextConfig;
