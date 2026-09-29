import { describe, expect, it, vi } from 'vitest';
import { CigClient } from './client';

describe('CigClient', () => {
  it('binds fetch to the global object before issuing requests', async () => {
    let observedThis: unknown;

    const fetchImpl = vi.fn(function (this: unknown) {
      observedThis = this;
      return Promise.resolve(
        new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    const client = new CigClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await client.requestRaw('/api/v1/health');

    expect(observedThis).toBe(globalThis);
  });

  it('resolves organization headers for every request at request time', async () => {
    const fetchImpl = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response('{}', { status: 200 }))
    );
    const getDefaultHeaders = vi.fn(() => ({ 'x-cig-organization-id': 'org_active' }));
    const client = new CigClient({
      baseUrl: 'https://api.example.com',
      getDefaultHeaders,
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await client.requestRaw('/api/v1/resources', { headers: { 'x-request-id': 'request-1' } });

    expect(getDefaultHeaders).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('x-cig-organization-id')).toBe('org_active');
    expect(new Headers(init.headers).get('x-request-id')).toBe('request-1');
  });

  it('fetches dashboard health metadata from the API', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: 'ok',
            version: '0.2.15',
            timestamp: '2026-03-26T09:00:00.000Z',
            chat: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              configured: true,
              reachable: true,
              providerReachable: true,
              checkedAt: '2026-03-26T09:00:00.000Z',
              latencyMs: 42,
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    );

    const client = new CigClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchImpl as unknown as typeof fetch,
    });

    const health = await client.getHealth();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/health',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(health.chat.model).toBe('gpt-4o-mini');
    expect(health.chat.reachable).toBe(true);
  });

  it('falls back to the legacy demo graph snapshot route when the demo compatibility route is unavailable', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found', statusCode: 404 }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            source: {
              kind: 'demo',
              available: true,
              lastSyncedAt: '2026-03-27T00:00:00.000Z',
            },
            resourceCounts: {},
            resources: [],
            relationships: [],
            discovery: {
              healthy: true,
              running: false,
              lastRun: '2026-03-27T00:00:00.000Z',
              nextRun: null,
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

    const client = new CigClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchImpl as unknown as typeof fetch,
    });

    const snapshot = await client.getGraphSnapshot('demo');

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/api/v1/demo/snapshot',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/api/v1/graph/snapshot?source=demo',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(snapshot.source.kind).toBe('demo');
    expect(snapshot.source.available).toBe(true);
  });

  it('creates an analytics site with an idempotency key', async () => {
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(
      JSON.stringify({ site: { id: 'site_public', status: 'active' }, replayed: false }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    )));
    const client = new CigClient({ baseUrl: 'https://api.example.com', fetch: fetchImpl as unknown as typeof fetch });

    await client.createAnalyticsSite({ name: 'Marketing', domain: 'example.com' }, 'launch-1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/analytics/sites',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ name: 'Marketing', domain: 'example.com' }),
      }),
    );
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('idempotency-key')).toBe('launch-1');
  });
});
