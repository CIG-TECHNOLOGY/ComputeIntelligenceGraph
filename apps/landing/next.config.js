const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/** @type {import('next').NextConfig} */
const legacyBasePath = '/ComputeIntelligenceGraph';
const useLegacyBasePath = process.env.LEGACY_BASEPATH === 'true';

const { version } = require('../../package.json');

function loadReleaseMetadata() {
  try {
    return require('../../release-metadata.json');
  } catch {
    return null;
  }
}

function resolveReleaseMetadata() {
  const fallbackTag = `v${version}`;
  const releaseMetadata = loadReleaseMetadata();
  const metadataMatchesVersion = releaseMetadata?.version === version;
  let releaseTag =
    process.env.NEXT_PUBLIC_RELEASE_TAG ||
    (metadataMatchesVersion ? releaseMetadata.releaseTag : '') ||
    fallbackTag;
  let buildNumber =
    process.env.NEXT_PUBLIC_APP_BUILD ||
    (metadataMatchesVersion && releaseMetadata?.buildNumber != null
      ? String(releaseMetadata.buildNumber)
      : '');

  try {
    const tags = execSync('git tag --points-at HEAD', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .split('\n')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const buildTagPattern = new RegExp(`^v${escapedVersion}\\+build\\.(\\d+)$`);
    const buildTag = tags.find((tag) => buildTagPattern.test(tag));

    if (!buildNumber && buildTag) {
      releaseTag = buildTag;
      buildNumber = buildTag.match(buildTagPattern)?.[1] || '';
    } else if (releaseTag === fallbackTag && tags.includes(fallbackTag)) {
      releaseTag = fallbackTag;
    }
  } catch {
    // Fall back to env vars when git metadata is unavailable at build time.
  }

  return {
    releaseTag,
    buildNumber,
  };
}

const { releaseTag, buildNumber } = resolveReleaseMetadata();
// Local builds should stay on localhost; the deploy workflow sets production explicitly.
const defaultSiteUrl = 'http://localhost:3000';
const authentikClientIdFallback = 'cig-dashboard';
const authentikClientId = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID?.trim();
const resolvedAuthentikClientId = authentikClientId || authentikClientIdFallback;

if (process.env.CI === 'true' && !authentikClientId) {
  throw new Error('NEXT_PUBLIC_AUTHENTIK_CLIENT_ID is required to build the landing app');
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
  const source = `/* CIG landing update worker ${signature} */
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
  transpilePackages: ['@cig/auth', '@cig/ui', '@edcalderon/auth'],
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Primary domain deploys at root, while legacy GitHub Pages deploys under /ComputeIntelligenceGraph.
  basePath: useLegacyBasePath ? legacyBasePath : '',
  assetPrefix: useLegacyBasePath ? legacyBasePath : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: useLegacyBasePath ? legacyBasePath : '',
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_BUILD: buildNumber,
    NEXT_PUBLIC_RELEASE_TAG: releaseTag,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl,
    NEXT_PUBLIC_LEGACY_SITE_URL:
      process.env.NEXT_PUBLIC_LEGACY_SITE_URL ||
      'https://edwardcalderon.github.io/ComputeIntelligenceGraph',
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || 'https://cig.lat/documentation',
    NEXT_PUBLIC_AUTHENTIK_URL: process.env.NEXT_PUBLIC_AUTHENTIK_URL || 'https://auth.cig.technology',
    NEXT_PUBLIC_AUTHENTIK_CLIENT_ID: resolvedAuthentikClientId,
  },
};

module.exports = nextConfig;
