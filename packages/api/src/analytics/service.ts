import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { query, withTransaction } from '../db/client.js';
import { createSiteId } from './site-id.js';
import { isAllowedOrigin, normalizeDomain, type SiteInput, validateSiteInput } from './validation.js';
import { getAnalyticsProvisioner, type UmamiInsights, type UmamiProvisioner } from './umami.js';

export type AnalyticsSiteStatus = 'pending' | 'provisioning' | 'active' | 'failed' | 'deleting' | 'deleted';

interface SiteRow {
  id: string;
  organization_id: string;
  name: string;
  domain: string;
  status: AnalyticsSiteStatus;
  umami_website_id: string | null;
  last_error_code: string | null;
  last_event_at: string | null;
  public_share_token_hash: string | null;
  public_share_enabled: boolean | number;
  public_share_created_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicAnalyticsSite {
  id: string;
  name: string;
  domain: string;
  status: AnalyticsSiteStatus;
  createdAt: string;
  updatedAt: string;
  lastEventAt: string | null;
  publicAccess: AnalyticsPublicAccess;
  provisioningError?: string;
}

export interface AnalyticsStats {
  totals: { pageviews: number; events: number; accepted: number };
  daily: Array<{ date: string; pageviews: number; events: number }>;
  lastEventAt: string | null;
}

export interface AnalyticsPublicAccess {
  enabled: boolean;
  url?: string;
  token?: string;
}

export interface AnalyticsInsights {
  source: 'umami' | 'local';
  generatedAt: string;
  rangeDays: number;
  totals: UmamiInsights['totals'];
  series: UmamiInsights['series'];
  countries: UmamiInsights['countries'];
  pages: UmamiInsights['pages'];
  realtime: UmamiInsights['realtime'];
}

function toSite(row: SiteRow): PublicAnalyticsSite {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEventAt: row.last_event_at,
    publicAccess: { enabled: Boolean(row.public_share_enabled) },
    ...(row.last_error_code ? { provisioningError: row.last_error_code } : {}),
  };
}

function publicShareUrlForSite(token: string): string {
  // Keep the API portable across local and production dashboard origins. The
  // browser resolves this path against the origin that created the link.
  return `/analytics/share/${encodeURIComponent(token)}`;
}

function shareTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function selectSiteColumns(alias = ''): string {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}id, ${prefix}organization_id, ${prefix}name, ${prefix}domain, ${prefix}status,
            ${prefix}umami_website_id, ${prefix}last_error_code, ${prefix}last_event_at,
            ${prefix}public_share_token_hash, ${prefix}public_share_enabled, ${prefix}public_share_created_at,
            ${prefix}created_at, ${prefix}updated_at`;
}

function safeErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : 'provisioning_failed';
  const code = message.toLowerCase().match(/upstream_\d+|analytics_[a-z_]+|invalid_[a-z_]+/)?.[0];
  return code ?? 'provisioning_failed';
}

async function findOrganizationForUser(userId: string): Promise<{ id: string; role: string } | null> {
  const result = await query<{ id: string; role: string }>(
    `SELECT o.id, m.role
       FROM analytics_organizations o
       JOIN analytics_memberships m ON m.organization_id = o.id
      WHERE m.user_id = ?
      ORDER BY o.created_at ASC
      LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function ensureOrganizationForUser(userId: string): Promise<{ id: string; role: string }> {
  const existing = await findOrganizationForUser(userId);
  if (existing) return existing;

  const organizationId = randomUUID();
  const timestamp = new Date().toISOString();
  const slug = `workspace-${randomUUID().slice(0, 12)}`;
  await withTransaction(async (tx) => {
    await tx(
      `INSERT INTO analytics_organizations (id, name, slug, plan, created_at, updated_at)
       VALUES (?, ?, ?, 'free', ?, ?)`,
      [organizationId, process.env.ANALYTICS_DEFAULT_ORG_NAME?.trim() || 'Personal workspace', slug, timestamp, timestamp],
    );
    await tx(
      `INSERT INTO analytics_memberships (organization_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)`,
      [organizationId, userId, timestamp],
    );
  });
  await writeAudit(organizationId, null, userId, 'organization_created', 'success');
  return { id: organizationId, role: 'owner' };
}

async function findSiteForUser(userId: string, siteId: string): Promise<SiteRow | null> {
  const result = await query<SiteRow>(
    `SELECT ${selectSiteColumns('s')}
       FROM analytics_sites s
       JOIN analytics_memberships m ON m.organization_id = s.organization_id
      WHERE m.user_id = ? AND s.id = ?`,
    [userId, siteId],
  );
  return result.rows[0] ?? null;
}

async function writeAudit(organizationId: string, siteId: string | null, actorUserId: string, action: string, outcome: 'success' | 'failure', metadata: Record<string, unknown> = {}): Promise<void> {
  await query(
    `INSERT INTO analytics_audit_events (id, organization_id, site_id, actor_user_id, action, outcome, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), organizationId, siteId, actorUserId, action, outcome, JSON.stringify(metadata), new Date().toISOString()],
  );
}

export async function listSites(userId: string): Promise<PublicAnalyticsSite[]> {
  const organization = await ensureOrganizationForUser(userId);
  const result = await query<SiteRow>(
    `SELECT ${selectSiteColumns()}
       FROM analytics_sites WHERE organization_id = ? AND status != 'deleted'
      ORDER BY created_at DESC`,
    [organization.id],
  );
  return result.rows.map(toSite);
}

export async function getSite(userId: string, siteId: string): Promise<PublicAnalyticsSite | null> {
  const site = await findSiteForUser(userId, siteId);
  return site ? toSite(site) : null;
}

export async function createSite(
  userId: string,
  input: SiteInput,
  idempotencyKey: string | undefined,
  provisioner?: UmamiProvisioner,
): Promise<{ site: PublicAnalyticsSite; replayed: boolean }> {
  const validation = validateSiteInput(input);
  if (!validation.valid) throw Object.assign(new Error(validation.message), { statusCode: 400, field: validation.field });

  const organization = await ensureOrganizationForUser(userId);
  if (idempotencyKey) {
    const existing = await query<SiteRow>(
      `SELECT ${selectSiteColumns()}
         FROM analytics_sites WHERE organization_id = ? AND idempotency_key = ?`,
      [organization.id, idempotencyKey.slice(0, 200)],
    );
    if (existing.rows[0]) return { site: toSite(existing.rows[0]), replayed: true };
  }

  const domainAlreadyUsed = await query<{ id: string }>(
    `SELECT id FROM analytics_sites WHERE organization_id = ? AND domain = ? AND status != 'deleted' LIMIT 1`,
    [organization.id, validation.domain],
  );
  if (domainAlreadyUsed.rows[0]) {
    throw Object.assign(new Error('A site already exists for this domain'), { statusCode: 409 });
  }

  const siteId = createSiteId();
  const timestamp = new Date().toISOString();
  await query(
    `INSERT INTO analytics_sites
      (id, organization_id, name, domain, status, idempotency_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'provisioning', ?, ?, ?)`,
    [siteId, organization.id, validation.name, validation.domain, idempotencyKey?.slice(0, 200) ?? null, timestamp, timestamp],
  );

  return { site: await provisionSite(userId, siteId, provisioner ?? getAnalyticsProvisioner()), replayed: false };
}

export async function provisionSite(
  userId: string,
  siteId: string,
  provisioner?: UmamiProvisioner,
): Promise<PublicAnalyticsSite> {
  const site = await findSiteForUser(userId, siteId);
  if (!site) throw Object.assign(new Error('Site not found'), { statusCode: 404 });
  if (site.status === 'deleted') throw Object.assign(new Error('Site is deleted'), { statusCode: 410 });
  const activeProvisioner = provisioner ?? getAnalyticsProvisioner();

  await query(`UPDATE analytics_sites SET status = 'provisioning', last_error_code = NULL, updated_at = ? WHERE id = ?`, [new Date().toISOString(), siteId]);
  try {
    const websiteInput = { name: site.name, domain: site.domain };
    const reconciledWebsite = !site.umami_website_id && activeProvisioner.findWebsite
      ? await activeProvisioner.findWebsite(websiteInput)
      : null;
    const website = site.umami_website_id
      ? (await activeProvisioner.updateWebsite(site.umami_website_id, websiteInput), { websiteId: site.umami_website_id })
      : reconciledWebsite ?? await activeProvisioner.createWebsite(websiteInput);
    await query(
      `UPDATE analytics_sites SET status = 'active', umami_website_id = ?, last_error_code = NULL, updated_at = ? WHERE id = ?`,
      [website.websiteId, new Date().toISOString(), siteId],
    );
    await writeAudit(site.organization_id, siteId, userId, 'site_provisioned', 'success');
  } catch (error) {
    const code = safeErrorCode(error);
    await query(`UPDATE analytics_sites SET status = 'failed', last_error_code = ?, updated_at = ? WHERE id = ?`, [code, new Date().toISOString(), siteId]);
    await writeAudit(site.organization_id, siteId, userId, 'site_provisioned', 'failure', { code });
  }
  const refreshed = await findSiteForUser(userId, siteId);
  if (!refreshed) throw new Error('Site disappeared during provisioning');
  return toSite(refreshed);
}

export async function updateSite(
  userId: string,
  siteId: string,
  input: Partial<SiteInput>,
  provisioner?: UmamiProvisioner,
): Promise<PublicAnalyticsSite> {
  const current = await findSiteForUser(userId, siteId);
  if (!current) throw Object.assign(new Error('Site not found'), { statusCode: 404 });
  if (current.status === 'deleted') throw Object.assign(new Error('Site is deleted'), { statusCode: 410 });
  const validation = validateSiteInput({ name: input.name ?? current.name, domain: input.domain ?? current.domain });
  if (!validation.valid) throw Object.assign(new Error(validation.message), { statusCode: 400, field: validation.field });
  await query(
    `UPDATE analytics_sites SET name = ?, domain = ?, updated_at = ? WHERE id = ?`,
    [validation.name, validation.domain, new Date().toISOString(), siteId],
  );
  let upstreamFailed = false;
  if (current.umami_website_id) {
    const activeProvisioner = provisioner ?? getAnalyticsProvisioner();
    try {
      await activeProvisioner.updateWebsite(current.umami_website_id, { name: validation.name, domain: validation.domain });
    } catch (error) {
      upstreamFailed = true;
      const code = safeErrorCode(error);
      await query(`UPDATE analytics_sites SET status = 'failed', last_error_code = ?, updated_at = ? WHERE id = ?`, [code, new Date().toISOString(), siteId]);
      await writeAudit(current.organization_id, siteId, userId, 'site_updated', 'failure', { code });
    }
  }
  const refreshed = await findSiteForUser(userId, siteId);
  if (!refreshed) throw new Error('Site disappeared during update');
  if (!upstreamFailed) await writeAudit(current.organization_id, siteId, userId, 'site_updated', 'success');
  return toSite(refreshed);
}

export async function deleteSite(userId: string, siteId: string, provisioner?: UmamiProvisioner): Promise<PublicAnalyticsSite> {
  const site = await findSiteForUser(userId, siteId);
  if (!site) throw Object.assign(new Error('Site not found'), { statusCode: 404 });
  if (site.status === 'deleted') return toSite(site);
  await query(`UPDATE analytics_sites SET status = 'deleting', updated_at = ? WHERE id = ?`, [new Date().toISOString(), siteId]);
  try {
    if (site.umami_website_id) {
      const activeProvisioner = provisioner ?? getAnalyticsProvisioner();
      await activeProvisioner.deleteWebsite(site.umami_website_id);
    }
    await query(`UPDATE analytics_sites SET status = 'deleted', umami_website_id = NULL, updated_at = ? WHERE id = ?`, [new Date().toISOString(), siteId]);
    await writeAudit(site.organization_id, siteId, userId, 'site_deleted', 'success');
  } catch (error) {
    const code = safeErrorCode(error);
    await query(`UPDATE analytics_sites SET status = 'failed', last_error_code = ?, updated_at = ? WHERE id = ?`, [code, new Date().toISOString(), siteId]);
    await writeAudit(site.organization_id, siteId, userId, 'site_deleted', 'failure', { code });
  }
  const refreshed = await findSiteForUser(userId, siteId);
  if (!refreshed) throw new Error('Site disappeared during deletion');
  return toSite(refreshed);
}

export async function getSiteStats(userId: string, siteId: string): Promise<AnalyticsStats | null> {
  const site = await findSiteForUser(userId, siteId);
  if (!site || site.status === 'deleted') return null;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const result = await query<{ usage_date: string; pageviews: number; events: number; accepted: number }>(
    `SELECT usage_date, pageviews, events, accepted FROM analytics_usage_daily
      WHERE site_id = ? AND usage_date >= ? ORDER BY usage_date ASC`,
    [siteId, since],
  );
  const daily = result.rows.map((row) => ({ date: row.usage_date, pageviews: Number(row.pageviews), events: Number(row.events) }));
  return {
    totals: {
      pageviews: daily.reduce((total, row) => total + row.pageviews, 0),
      events: daily.reduce((total, row) => total + row.events, 0),
      accepted: result.rows.reduce((total, row) => total + Number(row.accepted), 0),
    },
    daily,
    lastEventAt: site.last_event_at,
  };
}

async function buildInsights(site: SiteRow, rangeDays: number): Promise<AnalyticsInsights> {
  const safeDays = Math.min(90, Math.max(1, Math.floor(rangeDays) || 30));
  const endAt = Date.now();
  const startAt = endAt - safeDays * 24 * 60 * 60 * 1000;
  const localSince = new Date(startAt).toISOString().slice(0, 10);
  const localRows = await query<{ usage_date: string; pageviews: number; events: number }>(
    `SELECT usage_date, pageviews, events FROM analytics_usage_daily
      WHERE site_id = ? AND usage_date >= ? ORDER BY usage_date ASC`,
    [site.id, localSince],
  );
  const localInsights: UmamiInsights = {
    totals: {
      pageviews: localRows.rows.reduce((sum, row) => sum + Number(row.pageviews), 0),
      visitors: 0,
      visits: 0,
      bounces: 0,
      totaltime: 0,
    },
    series: localRows.rows.map((row) => ({ date: row.usage_date, pageviews: Number(row.pageviews), visitors: 0 })),
    countries: [],
    pages: [],
    realtime: { visitors: 0, countries: [], pages: [], updatedAt: new Date().toISOString() },
  };

  let insights = localInsights;
  let source: AnalyticsInsights['source'] = 'local';
  if (site.umami_website_id && !site.umami_website_id.startsWith('local_')) {
    try {
      const provisioner = getAnalyticsProvisioner();
      if (provisioner.getInsights) {
        insights = await provisioner.getInsights(site.umami_website_id, startAt, endAt);
        source = 'umami';
      }
    } catch {
      // Keep local control-plane counters available while upstream analytics recovers.
    }
  }

  return {
    source,
    generatedAt: new Date().toISOString(),
    rangeDays: safeDays,
    ...insights,
  };
}

export async function getSiteInsights(userId: string, siteId: string, rangeDays = 30): Promise<{ site: PublicAnalyticsSite; insights: AnalyticsInsights } | null> {
  const site = await findSiteForUser(userId, siteId);
  if (!site || site.status === 'deleted') return null;
  return { site: toSite(site), insights: await buildInsights(site, rangeDays) };
}

export async function setPublicAccess(
  userId: string,
  siteId: string,
  enabled: boolean,
): Promise<{ publicAccess: AnalyticsPublicAccess }> {
  const site = await findSiteForUser(userId, siteId);
  if (!site || site.status === 'deleted') throw Object.assign(new Error('Site not found'), { statusCode: 404 });

  if (!enabled) {
    await query(
      `UPDATE analytics_sites SET public_share_token_hash = NULL, public_share_enabled = FALSE, public_share_created_at = NULL, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), siteId],
    );
    await writeAudit(site.organization_id, siteId, userId, 'public_access_disabled', 'success');
    return { publicAccess: { enabled: false } };
  }

  const token = randomBytes(32).toString('base64url');
  await query(
    `UPDATE analytics_sites SET public_share_token_hash = ?, public_share_enabled = TRUE, public_share_created_at = ?, updated_at = ? WHERE id = ?`,
    [shareTokenHash(token), new Date().toISOString(), new Date().toISOString(), siteId],
  );
  await writeAudit(site.organization_id, siteId, userId, 'public_access_enabled', 'success');
  return { publicAccess: { enabled: true, token, url: publicShareUrlForSite(token) } };
}

async function findSiteByPublicToken(token: string): Promise<SiteRow | null> {
  const result = await query<SiteRow>(
    `SELECT ${selectSiteColumns()} FROM analytics_sites
      WHERE public_share_token_hash = ? AND public_share_enabled = TRUE AND status = 'active'
      LIMIT 1`,
    [shareTokenHash(token)],
  );
  return result.rows[0] ?? null;
}

export async function getPublicAnalyticsView(token: string, rangeDays = 30): Promise<{ site: PublicAnalyticsSite; insights: AnalyticsInsights } | null> {
  if (!token || token.length > 200) return null;
  const site = await findSiteByPublicToken(token);
  if (!site) return null;
  return { site: toSite(site), insights: await buildInsights(site, rangeDays) };
}

export async function collectEvent(
  siteId: string,
  origin: string | undefined,
  payload: Record<string, unknown>,
  provisioner?: UmamiProvisioner,
): Promise<{ organizationId: string }> {
  const result = await query<SiteRow>(
      `SELECT ${selectSiteColumns()} FROM analytics_sites WHERE id = ?`,
    [siteId],
  );
  const site = result.rows[0];
  if (!site || site.status !== 'active') throw Object.assign(new Error('Tracker not active'), { statusCode: 404 });
  if (!isAllowedOrigin(origin, site.domain)) throw Object.assign(new Error('Origin is not allowed for this site'), { statusCode: 403 });

  const type = payload.type;
  if (type !== 'pageview' && type !== 'event') throw Object.assign(new Error('Unsupported event type'), { statusCode: 400 });
  if (typeof payload.url === 'string') {
    try {
      const pageUrl = new URL(payload.url);
      if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') throw new Error('invalid_protocol');
      if (pageUrl.host.toLowerCase() !== normalizeDomain(site.domain)) throw new Error('invalid_domain');
    } catch {
      throw Object.assign(new Error('Event URL is not allowed for this site'), { statusCode: 400 });
    }
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > 16_384) throw Object.assign(new Error('Event payload is too large'), { statusCode: 413 });
  const now = new Date();
  const usageDate = now.toISOString().slice(0, 10);
  const pageviews = type === 'pageview' ? 1 : 0;
  const events = type === 'event' ? 1 : 0;
  await query(
    `INSERT INTO analytics_usage_daily (organization_id, site_id, usage_date, pageviews, events, accepted, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(site_id, usage_date) DO UPDATE SET
       pageviews = analytics_usage_daily.pageviews + excluded.pageviews,
       events = analytics_usage_daily.events + excluded.events,
       accepted = analytics_usage_daily.accepted + 1,
       updated_at = excluded.updated_at`,
    [site.organization_id, siteId, usageDate, pageviews, events, now.toISOString()],
  );
  await query(`UPDATE analytics_sites SET last_event_at = ?, updated_at = ? WHERE id = ?`, [now.toISOString(), now.toISOString(), siteId]);

  if (site.umami_website_id && !site.umami_website_id.startsWith('local_')) {
    const activeProvisioner = provisioner ?? getAnalyticsProvisioner();
    const upstreamPayload: Record<string, unknown> = {
      url: typeof payload.url === 'string' ? payload.url.slice(0, 2000) : undefined,
      hostname: site.domain,
      title: typeof payload.title === 'string' ? payload.title.slice(0, 200) : undefined,
      referrer: typeof payload.referrer === 'string' ? payload.referrer.slice(0, 2000) : undefined,
    };
    if (type === 'event') {
      upstreamPayload.name = typeof payload.name === 'string' ? payload.name.slice(0, 120) : 'event';
      upstreamPayload.data = typeof payload.data === 'object' && payload.data ? payload.data : {};
    }
    try {
      await activeProvisioner.collect(site.umami_website_id, upstreamPayload);
    } catch {
      // The control-plane counter remains authoritative. The MVP deliberately
      // does not retain raw payloads for a queue-based upstream retry.
    }
  }
  return { organizationId: site.organization_id };
}

export async function getTrackerSite(siteId: string): Promise<SiteRow | null> {
  const result = await query<SiteRow>(
    `SELECT ${selectSiteColumns()} FROM analytics_sites WHERE id = ?`,
    [siteId],
  );
  const site = result.rows[0] ?? null;
  return site?.status === 'active' ? site : null;
}

export async function reconcileSites(
  userId: string,
  provisioner?: UmamiProvisioner,
): Promise<{ checked: number; active: number; failed: number }> {
  const organization = await ensureOrganizationForUser(userId);
  const result = await query<{ id: string }>(
    `SELECT id FROM analytics_sites
      WHERE organization_id = ? AND status IN ('provisioning', 'failed')
      ORDER BY updated_at ASC LIMIT 25`,
    [organization.id],
  );
  let active = 0;
  let failed = 0;
  const activeProvisioner = result.rows.length > 0 ? (provisioner ?? getAnalyticsProvisioner()) : undefined;
  for (const row of result.rows) {
    const site = await provisionSite(userId, row.id, activeProvisioner);
    if (site.status === 'active') active += 1;
    else failed += 1;
  }
  return { checked: result.rows.length, active, failed };
}
