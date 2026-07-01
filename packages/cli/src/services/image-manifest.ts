export interface PublishedImageManifest {
  version: string;
  source_tag?: string;
  source_sha?: string;
  registry?: string;
  resolutionSource?: 'release-asset' | 'docker-hub-latest';
  images: Record<string, string>;
}

const DEFAULT_RELEASE_BASE_URL = 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/releases/download';
const DEFAULT_DOCKERHUB_NAMESPACE = 'cigtechnology';
const DEFAULT_DOCKERHUB_REGISTRY = `docker.io/${DEFAULT_DOCKERHUB_NAMESPACE}`;
const DEFAULT_DOCKERHUB_ACCEPT =
  'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json';
const SERVICE_IMAGE_NAMES: Record<string, string> = {
  api: 'cig-api',
  dashboard: 'cig-dashboard',
  discovery: 'cig-discovery',
  cartography: 'cig-cartography',
  chatbot: 'cig-chatbot',
  neo4j: 'library/neo4j',
};

export function resolveImageManifestUrl(version: string): string {
  const override = process.env['CIG_IMAGE_MANIFEST_URL']?.trim();
  if (override) {
    return override.replace(/\{version\}/g, version);
  }

  return `${DEFAULT_RELEASE_BASE_URL}/cli-v${version}/images.json`;
}

function isReleaseAssetFallbackAllowed(): boolean {
  return !process.env['CIG_IMAGE_MANIFEST_URL']?.trim();
}

async function resolveReleaseAssetManifest(
  version: string,
  fetchImpl: typeof fetch
): Promise<PublishedImageManifest> {
  const url = resolveImageManifestUrl(version);
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch published image manifest from ${url}: ${response.status} ${response.statusText}`);
  }

  const manifest = (await response.json()) as unknown;
  return assertManifestShape(manifest, version);
}

function buildDockerHubRepository(imageName: string): string {
  return `${DEFAULT_DOCKERHUB_NAMESPACE}/${imageName}`;
}

async function resolveDockerHubToken(repositoryPath: string, fetchImpl: typeof fetch): Promise<string> {
  const tokenUrl = new URL('https://auth.docker.io/token');
  tokenUrl.searchParams.set('service', 'registry.docker.io');
  tokenUrl.searchParams.set('scope', `repository:${repositoryPath}:pull`);

  const response = await fetchImpl(tokenUrl);
  if (!response.ok) {
    throw new Error(`Failed to request Docker Hub token for ${repositoryPath}: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { token?: unknown; access_token?: unknown };
  const token = typeof payload.token === 'string' && payload.token.trim() !== ''
    ? payload.token
    : typeof payload.access_token === 'string' && payload.access_token.trim() !== ''
      ? payload.access_token
      : '';

  if (token === '') {
    throw new Error(`Docker Hub did not return an access token for ${repositoryPath}.`);
  }

  return token;
}

async function resolveDockerHubDigest(
  repositoryPath: string,
  reference: string,
  fetchImpl: typeof fetch
): Promise<string> {
  const token = await resolveDockerHubToken(repositoryPath, fetchImpl);
  const manifestUrl = `https://registry-1.docker.io/v2/${repositoryPath}/manifests/${reference}`;
  const response = await fetchImpl(manifestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: DEFAULT_DOCKERHUB_ACCEPT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve digest for ${repositoryPath}:${reference}: ${response.status} ${response.statusText}`);
  }

  const digest = response.headers.get('docker-content-digest');
  if (typeof digest !== 'string' || digest.trim() === '') {
    throw new Error(`Docker Hub did not return a digest for ${repositoryPath}:${reference}.`);
  }

  return `docker.io/${repositoryPath}@${digest}`;
}

async function resolveDockerHubFallbackManifest(
  version: string,
  fetchImpl: typeof fetch
): Promise<PublishedImageManifest> {
  const images: Record<string, string> = {};

  for (const [service, imageName] of Object.entries(SERVICE_IMAGE_NAMES)) {
    const repositoryPath = imageName.startsWith('library/') ? imageName : buildDockerHubRepository(imageName);
    const reference = imageName.startsWith('library/') ? '5' : 'latest';
    images[service] = await resolveDockerHubDigest(repositoryPath, reference, fetchImpl);
  }

  return {
    version,
    source_tag: `cli-v${version}`,
    registry: DEFAULT_DOCKERHUB_REGISTRY,
    resolutionSource: 'docker-hub-latest',
    images,
  };
}

function assertManifestShape(manifest: unknown, version: string): PublishedImageManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Published image manifest is not valid JSON.');
  }

  const data = manifest as Partial<PublishedImageManifest> & { images?: unknown };
  if (data.version !== version) {
    throw new Error(`Published image manifest version mismatch: expected ${version}, received ${data.version ?? 'unknown'}.`);
  }

  if (!data.images || typeof data.images !== 'object') {
    throw new Error('Published image manifest is missing service image references.');
  }

  const images = data.images as Record<string, unknown>;
  for (const service of ['api', 'dashboard', 'discovery', 'cartography', 'neo4j']) {
    if (typeof images[service] !== 'string' || String(images[service]).trim() === '') {
      throw new Error(`Published image manifest is missing a pinned image for ${service}.`);
    }
  }

  return {
    version: data.version,
    source_tag: data.source_tag,
    source_sha: data.source_sha,
    registry: data.registry,
    resolutionSource: 'release-asset',
    images: images as Record<string, string>,
  };
}

export async function resolvePublishedImageManifest(
  version: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<PublishedImageManifest> {
  if (!isReleaseAssetFallbackAllowed()) {
    return resolveReleaseAssetManifest(version, fetchImpl);
  }

  try {
    return await resolveReleaseAssetManifest(version, fetchImpl);
  } catch (releaseAssetError) {
    try {
      return await resolveDockerHubFallbackManifest(version, fetchImpl);
    } catch (fallbackError) {
      const releaseMessage =
        releaseAssetError instanceof Error ? releaseAssetError.message : String(releaseAssetError);
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

      throw new Error(
        `Failed to resolve published image manifest for cli-v${version}. ` +
          `Release asset lookup failed: ${releaseMessage}. ` +
          `Docker Hub fallback also failed: ${fallbackMessage}`
      );
    }
  }
}
