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
    process.env.JWT_SECRET = 'analytics-route-test-secret';
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
        last_event_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
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
  });
});
