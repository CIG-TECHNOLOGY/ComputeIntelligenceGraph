import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { authenticate } from '../auth.js';
import {
  collectEvent,
  createSite,
  deleteSite,
  getSite,
  getSiteStats,
  getSiteInsights,
  getPublicAnalyticsView,
  getTrackerSite,
  listSites,
  provisionSite,
  reconcileSites,
  setPublicAccess,
  updateSite,
} from '../analytics/service.js';
import { buildTrackerScript } from '../analytics/validation.js';

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

function userId(request: AuthenticatedRequest): string {
  return request.user?.sub ?? '';
}

function sendError(reply: FastifyReply, error: unknown, fallback = 'Analytics request failed') {
  const candidate = typeof error === 'object' && error && 'statusCode' in error
    ? Number((error as { statusCode?: number }).statusCode)
    : Number.NaN;
  const statusCode = Number.isFinite(candidate) && candidate >= 400 ? candidate : 500;
  return reply.status(statusCode).send({
    error: error instanceof Error ? error.message : fallback,
    statusCode,
  });
}

function collectorUrl(request: FastifyRequest): string {
  const configured = process.env.ANALYTICS_COLLECTOR_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = (typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : undefined) || request.protocol;
  return `${protocol}://${request.headers.host ?? 'localhost'}/api/v1/analytics/collect`;
}

function setTrackerHeaders(reply: FastifyReply): void {
  reply
    .header('content-type', 'application/javascript; charset=utf-8')
    .header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    .header('x-content-type-options', 'nosniff')
    .header('content-security-policy', "default-src 'none'")
    .header('referrer-policy', 'no-referrer');
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  // text/plain keeps tracker collection a CORS-simple request (no preflight)
  // while the parser still accepts JSON from fetch/sendBeacon.
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, (_request, body, done) => {
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(new Error('Invalid analytics payload'));
    }
  });

  app.get('/api/v1/analytics/sites', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const items = await listSites(userId(request as AuthenticatedRequest));
      return reply.send({ items });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/analytics/sites', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { name?: string; domain?: string };
      const result = await createSite(
        userId(request as AuthenticatedRequest),
        { name: body.name ?? '', domain: body.domain ?? '' },
        typeof request.headers['idempotency-key'] === 'string' ? request.headers['idempotency-key'] : undefined,
      );
      return reply.status(result.replayed ? 200 : result.site.status === 'active' ? 201 : 202).send({ site: result.site, replayed: result.replayed });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get('/api/v1/analytics/sites/:siteId', { preHandler: [authenticate] }, async (request, reply) => {
    const { siteId } = request.params as { siteId: string };
    const site = await getSite(userId(request as AuthenticatedRequest), siteId);
    return site ? reply.send({ site }) : reply.status(404).send({ error: 'Site not found', statusCode: 404 });
  });

  app.patch('/api/v1/analytics/sites/:siteId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { siteId } = request.params as { siteId: string };
      const body = (request.body ?? {}) as { name?: string; domain?: string };
      const site = await updateSite(userId(request as AuthenticatedRequest), siteId, body);
      return reply.send({ site });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/analytics/sites/:siteId/provision', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { siteId } = request.params as { siteId: string };
      const site = await provisionSite(userId(request as AuthenticatedRequest), siteId);
      return reply.status(site.status === 'active' ? 200 : 202).send({ site });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/analytics/reconcile', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const result = await reconcileSites(userId(request as AuthenticatedRequest));
      return reply.send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete('/api/v1/analytics/sites/:siteId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { siteId } = request.params as { siteId: string };
      const site = await deleteSite(userId(request as AuthenticatedRequest), siteId);
      return reply.status(site.status === 'deleted' ? 200 : 202).send({ site });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get('/api/v1/analytics/sites/:siteId/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const { siteId } = request.params as { siteId: string };
    const stats = await getSiteStats(userId(request as AuthenticatedRequest), siteId);
    return stats ? reply.send(stats) : reply.status(404).send({ error: 'Site not found', statusCode: 404 });
  });

  app.get('/api/v1/analytics/sites/:siteId/insights', { preHandler: [authenticate] }, async (request, reply) => {
    const { siteId } = request.params as { siteId: string };
    const days = Number((request.query as { days?: string }).days ?? 30);
    const result = await getSiteInsights(userId(request as AuthenticatedRequest), siteId, days);
    return result ? reply.send(result) : reply.status(404).send({ error: 'Site not found', statusCode: 404 });
  });

  app.post('/api/v1/analytics/sites/:siteId/public-access', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { siteId } = request.params as { siteId: string };
      const enabled = (request.body as { enabled?: boolean } | undefined)?.enabled === true;
      return reply.send(await setPublicAccess(userId(request as AuthenticatedRequest), siteId, enabled));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get('/api/v1/analytics/public/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const days = Number((request.query as { days?: string }).days ?? 30);
    const result = await getPublicAnalyticsView(token, days);
    if (!result) return reply.status(404).send({ error: 'Public analytics link not found', statusCode: 404 });
    return reply
      .header('cache-control', 'private, max-age=15, stale-while-revalidate=30')
      .send(result);
  });

  app.get('/api/v1/analytics/tracker.js', async (request, reply) => {
    const siteId = (request.query as { site?: string }).site;
    const site = siteId ? await getTrackerSite(siteId) : null;
    if (!site) return reply.status(404).send({ error: 'Tracker not found', statusCode: 404 });
    setTrackerHeaders(reply);
    return reply.send(buildTrackerScript({ siteId: site.id, collectorUrl: collectorUrl(request) }));
  });

  app.options('/api/v1/analytics/collect', async (_request, reply) => {
    return reply.status(204)
      .header('access-control-allow-methods', 'POST, OPTIONS')
      .header('access-control-allow-headers', 'content-type')
      .send();
  });

  app.post('/api/v1/analytics/collect', async (request, reply) => {
    const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
    const body = (request.body ?? {}) as { site?: string; payload?: Record<string, unknown> };
    if (!body.site || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
      return reply.status(400).send({ error: 'Invalid analytics payload', statusCode: 400 });
    }
    try {
      await collectEvent(body.site, origin, body.payload);
      if (origin) {
        reply.header('access-control-allow-origin', origin).header('vary', 'Origin');
      }
      return reply.status(202).send({ accepted: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
