import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generateJwt, Permission } from '../auth.js';
import { closeDatabase, query } from '../db/client.js';
import { analyticsRoutes } from './analytics.js';

const userToken = (sub: string) => generateJwt({ sub, permissions: [Permission.READ_RESOURCES] });

describe('analytics routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'sqlite://:memory:';
    process.env.JWT_SECRET = ['analytics', 'route', 'test', 'secret'].join('-');
    process.env.ANALYTICS_PROVISIONING_MODE = 'local';

    await query(`
      CREATE TABLE analytics_organizations (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'free', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )
    `);
    await query(`
      CREATE TABLE analytics_memberships (
        organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner', created_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, user_id)
      )
    `);
    await query(`
      CREATE TABLE analytics_sites (
        id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL, domain TEXT NOT NULL,
        status TEXT NOT NULL, umami_website_id TEXT, last_error_code TEXT, idempotency_key TEXT,
        last_event_at TEXT, public_share_token_hash TEXT, public_share_enabled INTEGER NOT NULL DEFAULT 0,
        public_share_paused INTEGER NOT NULL DEFAULT 0,
        public_share_created_at TEXT, public_share_alias TEXT, public_share_base_domain TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )
    `);
    await query('CREATE UNIQUE INDEX analytics_sites_org_domain_idx ON analytics_sites (organization_id, domain)');
    await query('CREATE UNIQUE INDEX analytics_sites_org_idempotency_idx ON analytics_sites (organization_id, idempotency_key)');
    await query(`
      CREATE TABLE analytics_usage_daily (
        organization_id TEXT NOT NULL, site_id TEXT NOT NULL, usage_date TEXT NOT NULL,
        pageviews INTEGER NOT NULL DEFAULT 0, events INTEGER NOT NULL DEFAULT 0,
        accepted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
        PRIMARY KEY (site_id, usage_date)
      )
    `);
    await query(`
      CREATE TABLE analytics_audit_events (
        id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, site_id TEXT,
        actor_user_id TEXT NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL,
        metadata_json TEXT, created_at TEXT NOT NULL
      )
    `);

    app = Fastify();
    await app.register(analyticsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  it('onboards a site idempotently and never returns the private mapping', async () => {
    const token = userToken('user-a');
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'launch-1' },
      payload: { name: 'Marketing site', domain: 'https://Example.com/' },
    });

    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ site: { name: 'Marketing site', domain: 'example.com', status: 'active' } });
    expect(first.json().site).not.toHaveProperty('umamiWebsiteId');

    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'launch-1' },
      payload: { name: 'Different name', domain: 'example.com' },
    });

    expect(replay.statusCode).toBe(200);
    expect(replay.json().site.id).toBe(first.json().site.id);
  });

  it('isolates sites by authenticated organization', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${userToken('user-b')}` },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toEqual([]);

    const created = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${userToken('user-a')}` },
    });
    const siteId = created.json().items[0].id as string;
    const forbidden = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/sites/${siteId}`,
      headers: { authorization: `Bearer ${userToken('user-b')}` },
    });
    expect(forbidden.statusCode).toBe(404);
  });

  it('collects only from the approved origin and exposes aggregate verification', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${userToken('user-a')}` },
    });
    const siteId = list.json().items[0].id as string;

    const script = await app.inject({ method: 'GET', url: `/api/v1/analytics/tracker.js?site=${siteId}` });
    expect(script.statusCode).toBe(200);
    expect(script.headers['cache-control']).toContain('public');
    expect(script.body).toContain(siteId);
    expect(script.body).not.toContain('local_');

    const rejected = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/collect',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      payload: { site: siteId, payload: { type: 'pageview', url: 'https://example.com/' } },
    });
    expect(rejected.statusCode).toBe(403);

    const accepted = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/collect',
      headers: { origin: 'https://example.com', 'content-type': 'application/json' },
      payload: { site: siteId, payload: { type: 'pageview', url: 'https://example.com/' } },
    });
    expect(accepted.statusCode).toBe(202);

    const stats = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/sites/${siteId}/stats`,
      headers: { authorization: `Bearer ${userToken('user-a')}` },
    });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().totals.pageviews).toBe(1);
    expect(stats.json().lastEventAt).toBeTruthy();

    const insights = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/sites/${siteId}/insights?days=7`,
      headers: { authorization: `Bearer ${userToken('user-a')}` },
    });
    expect(insights.statusCode).toBe(200);
    expect(insights.json()).toMatchObject({ site: { id: siteId }, insights: { rangeDays: 7 } });
  });

  it('creates a revocable read-only public dashboard link', async () => {
    const token = userToken('user-a');
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${token}` },
    });
    const siteId = list.json().items[0].id as string;

    const enabled = await app.inject({
      method: 'POST',
      url: `/api/v1/analytics/sites/${siteId}/public-access`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: true },
    });
    expect(enabled.statusCode).toBe(200);
    expect(enabled.json()).toMatchObject({ publicAccess: { enabled: true } });
    expect(enabled.json().publicAccess.url).toMatch(/\/analytics\/share\/[A-Za-z0-9_-]+$/);

    const shareToken = enabled.json().publicAccess.token as string;

    const paused = await app.inject({
      method: 'POST',
      url: `/api/v1/analytics/sites/${siteId}/public-access`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: true, paused: true },
    });
    expect(paused.statusCode).toBe(200);
    expect(paused.json()).toMatchObject({ publicAccess: { enabled: true, paused: true } });

    const maintenanceView = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/public/${shareToken}`,
    });
    expect(maintenanceView.statusCode).toBe(423);
    expect(maintenanceView.json()).toMatchObject({ error: 'Public analytics link is under maintenance' });

    const resumed = await app.inject({
      method: 'POST',
      url: `/api/v1/analytics/sites/${siteId}/public-access`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: true, paused: false },
    });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({ publicAccess: { enabled: true, paused: false } });

    const publicView = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/public/${shareToken}`,
    });
    expect(publicView.statusCode).toBe(200);
    expect(publicView.json()).toMatchObject({ site: { id: siteId, name: 'Marketing site' } });
    expect(publicView.json().insights).toHaveProperty('realtime');
    expect(publicView.json().insights).toHaveProperty('countries');

    const disabled = await app.inject({
      method: 'POST',
      url: `/api/v1/analytics/sites/${siteId}/public-access`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: false },
    });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json()).toMatchObject({ publicAccess: { enabled: false } });

    const revoked = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/public/${shareToken}`,
    });
    expect(revoked.statusCode).toBe(404);
  });

  it('creates, updates, and removes a permanent signal-room hostname', async () => {
    const token = userToken('user-a');
    const siteId = (await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/sites',
      headers: { authorization: `Bearer ${token}` },
    })).json().items[0].id as string;

    await app.inject({
      method: 'POST',
      url: `/api/v1/analytics/sites/${siteId}/public-access`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: true },
    });
    const assigned = await app.inject({
      method: 'PUT',
      url: `/api/v1/analytics/sites/${siteId}/public-alias`,
      headers: { authorization: `Bearer ${token}` },
      payload: { alias: 'hashpass-tech', baseDomain: 'analytics.cig.lat' },
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.json().publicAccess).toMatchObject({
      alias: 'hashpass-tech',
      baseDomain: 'analytics.cig.lat',
      permanentUrl: 'https://hashpass-tech.analytics.cig.lat',
    });

    const publicView = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/public-alias/hashpass-tech?base=analytics.cig.lat',
    });
    expect(publicView.statusCode).toBe(200);
    expect(publicView.json().site.publicAccess.permanentUrl).toBe('https://hashpass-tech.analytics.cig.lat');

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/analytics/sites/${siteId}/public-alias`,
      headers: { authorization: `Bearer ${token}` },
      payload: { alias: 'hashpass-prod', baseDomain: 'analytics.cig.technology' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().publicAccess.permanentUrl).toBe('https://hashpass-prod.analytics.cig.technology');

    const invalid = await app.inject({
      method: 'PUT',
      url: `/api/v1/analytics/sites/${siteId}/public-alias`,
      headers: { authorization: `Bearer ${token}` },
      payload: { alias: 'nested.room', baseDomain: 'analytics.cig.lat' },
    });
    expect(invalid.statusCode).toBe(400);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/analytics/sites/${siteId}/public-alias`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().publicAccess).not.toHaveProperty('permanentUrl');
  });
});
