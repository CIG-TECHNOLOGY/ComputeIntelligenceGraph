import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveImageManifestUrl,
  resolvePublishedImageManifest,
} from './image-manifest.js';

describe('image manifest resolver', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds the release asset URL from the CLI version', () => {
    expect(resolveImageManifestUrl('0.1.11')).toBe(
      'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/releases/download/cli-v0.1.11/images.json'
    );
  });

  it('supports a URL override template', () => {
    vi.stubEnv('CIG_IMAGE_MANIFEST_URL', 'https://example.com/manifests/{version}.json');

    expect(resolveImageManifestUrl('0.1.11')).toBe('https://example.com/manifests/0.1.11.json');
  });

  it('loads and validates a published manifest', async () => {
    const manifest = {
      version: '0.1.11',
      images: {
        api: 'docker.io/cigtechnology/cig-api@sha256:1111111111111111111111111111111111111111111111111111111111111111',
        dashboard: 'docker.io/cigtechnology/cig-dashboard@sha256:2222222222222222222222222222222222222222222222222222222222222222',
        neo4j: 'docker.io/library/neo4j@sha256:40bf5ae9282213087e4d6036aab3ec443fe9c974d3dd4f14a11892c63157238f',
        discovery: 'docker.io/cigtechnology/cig-discovery@sha256:3333333333333333333333333333333333333333333333333333333333333333',
        cartography: 'docker.io/cigtechnology/cig-cartography@sha256:4444444444444444444444444444444444444444444444444444444444444444',
      },
    };

    const result = await resolvePublishedImageManifest('0.1.11', async () =>
      new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(result.version).toBe('0.1.11');
    expect(result.images.api).toContain('cig-api@sha256:');
  });

  it('rejects a manifest that does not match the CLI version', async () => {
    await expect(
      resolvePublishedImageManifest('0.1.11', async () =>
        new Response(JSON.stringify({ version: '0.1.10', images: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ).rejects.toThrow('version mismatch');
  });

  it('falls back to Docker Hub latest tags when the release asset is missing', async () => {
    const digests: Record<string, string> = {
      'cig-api': 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      'cig-dashboard': 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      neo4j: 'sha256:40bf5ae9282213087e4d6036aab3ec443fe9c974d3dd4f14a11892c63157238f',
      'cig-discovery': 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
      'cig-cartography': 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
      'cig-chatbot': 'sha256:5555555555555555555555555555555555555555555555555555555555555555',
    };

    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/releases/download/cli-v0.1.11/images.json')) {
        return new Response('not found', { status: 404, statusText: 'Not Found' });
      }

      if (url.startsWith('https://auth.docker.io/token')) {
        const scope = new URL(url).searchParams.get('scope') ?? '';
        const repository = scope.replace(/^repository:/, '').replace(/:pull$/, '');
        const imageName = repository.split('/').at(-1) ?? 'unknown';
        return new Response(JSON.stringify({ token: `token-${imageName}` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.startsWith('https://registry-1.docker.io/v2/')) {
        const imageName = url.split('/').at(-3) ?? 'unknown';
        const digest = digests[imageName];
        if (!digest) {
          return new Response('', { status: 404, statusText: 'Not Found' });
        }

        return new Response('', {
          status: 200,
          headers: { 'docker-content-digest': digest },
        });
      }

      return new Response('', { status: 500, statusText: 'Unhandled request' });
    };

    const result = await resolvePublishedImageManifest('0.1.11', fetchMock as typeof fetch);

    expect(result.version).toBe('0.1.11');
    expect(result.resolutionSource).toBe('docker-hub-latest');
    expect(result.source_tag).toBe('cli-v0.1.11');
    expect(result.registry).toBe('docker.io/cigtechnology');
    expect(result.images.api).toBe(
      'docker.io/cigtechnology/cig-api@sha256:1111111111111111111111111111111111111111111111111111111111111111'
    );
    expect(result.images.neo4j).toBe(
      'docker.io/library/neo4j@sha256:40bf5ae9282213087e4d6036aab3ec443fe9c974d3dd4f14a11892c63157238f'
    );
  });

  it('falls back to Docker Hub latest tags when the release asset is malformed', async () => {
    const digests: Record<string, string> = {
      'cig-api': 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'cig-dashboard': 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      neo4j: 'sha256:40bf5ae9282213087e4d6036aab3ec443fe9c974d3dd4f14a11892c63157238f',
      'cig-discovery': 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'cig-cartography': 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      'cig-chatbot': 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    };

    const fetchMock = async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/releases/download/cli-v0.1.11/images.json')) {
        return new Response(
          JSON.stringify({
            version: '0.1.11',
            images: {
              api: 'docker.io/cigtechnology/cig-api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              neo4j: 'docker.io/library/neo4j@sha256:40bf5ae9282213087e4d6036aab3ec443fe9c974d3dd4f14a11892c63157238f',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (url.startsWith('https://auth.docker.io/token')) {
        const scope = new URL(url).searchParams.get('scope') ?? '';
        const repository = scope.replace(/^repository:/, '').replace(/:pull$/, '');
        const imageName = repository.split('/').at(-1) ?? 'unknown';
        return new Response(JSON.stringify({ token: `token-${imageName}` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.startsWith('https://registry-1.docker.io/v2/')) {
        const imageName = url.split('/').at(-3) ?? 'unknown';
        const digest = digests[imageName];
        if (!digest) {
          return new Response('', { status: 404, statusText: 'Not Found' });
        }

        return new Response('', {
          status: 200,
          headers: { 'docker-content-digest': digest },
        });
      }

      return new Response('', { status: 500, statusText: 'Unhandled request' });
    };

    const result = await resolvePublishedImageManifest('0.1.11', fetchMock as typeof fetch);

    expect(result.version).toBe('0.1.11');
    expect(result.resolutionSource).toBe('docker-hub-latest');
    expect(result.images.chatbot).toBe(
      'docker.io/cigtechnology/cig-chatbot@sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );
    expect(result.images.neo4j).toBe(
      'docker.io/library/neo4j@sha256:40bf5ae9282213087e4d6036aab3ec443fe9c974d3dd4f14a11892c63157238f'
    );
  });
});
