import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GraphEngine, GraphQueryEngine, ResourceFilters } from '@cig/graph';
import type { CartographyRecentRuns, CartographyStatus } from '@cig/discovery';
import { CartographyClient } from '@cig/discovery';
import { authenticate, authorize, Permission } from './auth';
import { costAnalyzer } from './costs';
import { securityScanner } from './security';
import { newsletterManager } from './newsletter';
import { deviceAuthRoutes } from './routes/device-auth';
import { enrollmentRoutes } from './routes/enrollment';
import { heartbeatRoutes } from './routes/heartbeat';
import { bootstrapRoutes } from './routes/bootstrap';
import { oidcRoutes } from './routes/oidc';
import { auditRoutes } from './routes/audit';
import { sessionRoutes } from './routes/sessions';
import { scanRoutes } from './routes/scans';
import { authEmailRoutes } from './routes/auth-email';
import { chatRoutes } from './routes/chat';
import { demoRoutes } from './routes/demo';
import { onboardingRoutes } from './routes/onboarding';
import { nodeEnrollmentRoutes } from './routes/nodes/enroll';
import { nodeHeartbeatRoutes } from './routes/nodes/heartbeat';
import { nodeRevocationRoutes } from './routes/nodes/revoke';
import { nodeGraphDeltaRoutes } from './routes/nodes/graphDelta';
import { nodeListRoutes } from './routes/nodes/list';
import { bootstrapNodeRoutes } from './routes/bootstrap-node';
import { nodeSSERoutes } from './sse/nodeStatus';
import { graphRoutes } from './routes/graph';
import { analyticsRoutes } from './routes/analytics';
import { organizationRoutes } from './routes/organizations';

// Shared instances
const graphEngine = new GraphEngine();
const queryEngine = new GraphQueryEngine();
const cartographyClient = new CartographyClient();

const readResources = [authenticate, authorize([Permission.READ_RESOURCES])];
const manageDiscovery = [authenticate, authorize([Permission.MANAGE_DISCOVERY])];
const executeActions = [authenticate, authorize([Permission.EXECUTE_ACTIONS])];

function parseInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function emptyPagedResources() {
  return { items: [], total: 0, hasMore: false };
}

type DiscoveryStatusSnapshot = {
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
};

const DEFAULT_DISCOVERY_INTERVAL_MINUTES = 5;

function resolveDiscoveryIntervalMinutes(): number {
  const parsed = Number.parseInt(process.env.DISCOVERY_INTERVAL_MINUTES ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DISCOVERY_INTERVAL_MINUTES;
}

function resolveNextRun(lastRun: string | null): string | null {
  if (!lastRun) {
    return null;
  }

  const startedAt = new Date(lastRun);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  startedAt.setMinutes(startedAt.getMinutes() + resolveDiscoveryIntervalMinutes());
  return startedAt.toISOString();
}

function buildDiscoveryStatusSnapshot(
  status: CartographyStatus | null,
  recentRuns: CartographyRecentRuns | null
): DiscoveryStatusSnapshot {
  const lastRun = recentRuns?.last_run ?? status?.last_run_end ?? status?.last_run_start ?? null;

  return {
    running: status?.running ?? false,
    lastRun,
    nextRun: resolveNextRun(lastRun),
  };
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // ─── Device Authorization (RFC 8628) ────────────────────────────────────────
  await app.register(deviceAuthRoutes);

  // ─── Target Enrollment (Requirement 13) ─────────────────────────────────────
  await app.register(enrollmentRoutes);

  // ─── Heartbeat (Requirement 14) ──────────────────────────────────────────────
  await app.register(heartbeatRoutes);

  // ─── Bootstrap (Requirement 15) ──────────────────────────────────────────────
  await app.register(bootstrapRoutes);

  // ─── OIDC Callback (Requirement 16) ──────────────────────────────────────────
  await app.register(oidcRoutes);

  // ─── Audit (Requirement 18) ──────────────────────────────────────────────────
  await app.register(auditRoutes);

  // ─── Session Management (Phase 1.3) ──────────────────────────────────────────
  await app.register(sessionRoutes);

  // ─── Scan Results (Phase 3.2) ────────────────────────────────────────────────
  await app.register(scanRoutes);

  // ─── Custom Auth Email Endpoints ─────────────────────────────────────────────
  await app.register(authEmailRoutes);

  // ─── Chat (RAG + OpenAI) ─────────────────────────────────────────────────────
  await app.register(chatRoutes);

  // ─── Demo workspace (shared seeded graph snapshot) ──────────────────────────
  await app.register(demoRoutes);

  // ─── Graph snapshot, relationships, and refinement ────────────────────────
  await app.register(graphRoutes);

  // ─── Umami Analytics SaaS control plane and tracker ─────────────────────
  await app.register(analyticsRoutes);

  // ─── Organization control plane and workspace selection ───────────────
  await app.register(organizationRoutes);

  // ─── CIG Node Onboarding (Phase 1, Requirements 3.1–3.9, 17.1–17.3) ─────────
  await app.register(onboardingRoutes);

  // ─── CIG Node Enrollment (Phase 3, Requirements 7.1–7.3, 7.10, 3.4, 3.5, 22.4) ─
  await app.register(nodeEnrollmentRoutes);

  // ─── CIG Node Heartbeat (Phase 3, Requirements 16.1–16.10, 17.5) ─────────────
  await app.register(nodeHeartbeatRoutes);

  // ─── CIG Node Revocation (Phase 3, Requirements 7.8, 14.9) ──────────────────
  await app.register(nodeRevocationRoutes);

  // ─── CIG Node Graph Delta (Phase 3, Requirements 8.9, 8.10, 17.6) ────────────
  await app.register(nodeGraphDeltaRoutes);

  // ─── CIG Node List (Phase 3, Requirements 12.7, 16.7, 17.7) ─────────────────
  await app.register(nodeListRoutes);

  // ─── CIG Node Self-Hosted Bootstrap (Phase 6, Requirements 13.4–13.7) ────────
  await app.register(bootstrapNodeRoutes);

  // ─── CIG Node SSE (Phase 3, Requirements 12.8, 16.10) ────────────────────────
  await app.register(nodeSSERoutes);

  // ─── Resources ──────────────────────────────────────────────────────────────

  // GET /api/v1/resources — list all resources with optional filtering
  app.get(
    '/api/v1/resources',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;
      const filters: ResourceFilters = {};
      if (query['type']) filters.type = query['type'] as ResourceFilters['type'];
      if (query['provider']) filters.provider = query['provider'] as ResourceFilters['provider'];
      if (query['region']) filters.region = query['region'];
      if (query['state']) filters.state = query['state'] as ResourceFilters['state'];

      const limit = parseInteger(query['limit'], 50);
      const offset = parseInteger(query['offset'], 0);

      try {
        const result = await queryEngine.listResourcesPaged(filters, { limit, offset });
        return reply.send(result);
      } catch (error) {
        request.log.error(
          { err: error, limit, offset, filters },
          'Failed to list resources; returning an empty result set'
        );
        return reply.send(emptyPagedResources());
      }
    }
  );

  // GET /api/v1/resources/search — search resources by query string
  app.get(
    '/api/v1/resources/search',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q } = request.query as { q?: string };
      if (!q) {
        return reply.status(400).send({ error: 'Missing query parameter: q', statusCode: 400 });
      }
      const resources = await queryEngine.searchResources(q);
      return reply.send({ items: resources, total: resources.length });
    }
  );

  // GET /api/v1/resources/:id — get resource by ID
  app.get(
    '/api/v1/resources/:id',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const resource = await graphEngine.getResource(id);
      if (!resource) {
        return reply.status(404).send({ error: 'Resource not found', statusCode: 404 });
      }
      return reply.send(resource);
    }
  );

  // GET /api/v1/resources/:id/dependencies — get resources this resource depends on
  app.get(
    '/api/v1/resources/:id/dependencies',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { depth } = request.query as { depth?: string };
      const deps = await queryEngine.getDependencies(id, depth ? parseInt(depth, 10) : 1);
      return reply.send({ items: deps, total: deps.length });
    }
  );

  // GET /api/v1/resources/:id/dependents — get resources that depend on this resource
  app.get(
    '/api/v1/resources/:id/dependents',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { depth } = request.query as { depth?: string };
      const dependents = await queryEngine.getDependents(id, depth ? parseInt(depth, 10) : 1);
      return reply.send({ items: dependents, total: dependents.length });
    }
  );

  // ─── Discovery ──────────────────────────────────────────────────────────────

  // GET /api/v1/discovery/status — get discovery status
  app.get(
    '/api/v1/discovery/status',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let status: CartographyStatus | null = null;
      let recentRuns: CartographyRecentRuns | null = null;

      try {
        status = await cartographyClient.getStatus();
      } catch (error) {
        request.log.warn({ err: error }, 'Discovery status unavailable; falling back to empty status');
      }

      try {
        recentRuns = await cartographyClient.getRecentRuns();
      } catch (error) {
        request.log.warn({ err: error }, 'Discovery recent runs unavailable; falling back to status-only snapshot');
      }

      return reply.send(buildDiscoveryStatusSnapshot(status, recentRuns));
    }
  );

  // POST /api/v1/discovery/trigger — manually trigger discovery
  app.post(
    '/api/v1/discovery/trigger',
    { preHandler: manageDiscovery },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await cartographyClient.triggerRun();
      return reply.status(202).send(result);
    }
  );

  // ─── Costs (stub — implemented in later phases) ─────────────────────────────

  // GET /api/v1/costs — get cost summary
  app.get(
    '/api/v1/costs',
    { preHandler: readResources },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const summary = await costAnalyzer.getSummary();
      return reply.send(summary);
    }
  );

  // GET /api/v1/costs/breakdown — get cost breakdown by resource type/provider
  app.get(
    '/api/v1/costs/breakdown',
    { preHandler: readResources },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const breakdown = await costAnalyzer.getBreakdown();
      return reply.send(breakdown);
    }
  );

  // ─── Security (stub — implemented in later phases) ──────────────────────────

  // GET /api/v1/security/findings — get security findings (optionally filtered by resourceId)
  app.get(
    '/api/v1/security/findings',
    { preHandler: readResources },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { resourceId } = request.query as { resourceId?: string };
      const findings = await securityScanner.getFindings(resourceId);
      return reply.send({ items: findings, total: findings.length });
    }
  );

  // GET /api/v1/security/score — get overall security score
  app.get(
    '/api/v1/security/score',
    { preHandler: readResources },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const score = await securityScanner.getScore();
      return reply.send(score);
    }
  );

  // ─── Actions ────────────────────────────────────────────────────────────────

  // POST /api/v1/actions/execute — execute an infrastructure action
  app.post(
    '/api/v1/actions/execute',
    { preHandler: executeActions },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { action?: string; resourceId?: string; parameters?: Record<string, unknown> };
      if (!body?.action || !body?.resourceId) {
        return reply.status(400).send({ error: 'Missing required fields: action, resourceId', statusCode: 400 });
      }
      // Verify resource exists before accepting the action
      const resource = await graphEngine.getResource(body.resourceId);
      if (!resource) {
        return reply.status(404).send({ error: 'Resource not found', statusCode: 404 });
      }
      return reply.status(202).send({
        actionId: `action_${Date.now()}`,
        action: body.action,
        resourceId: body.resourceId,
        status: 'accepted',
        message: 'Action queued for execution',
      });
    }
  );

  // ─── Newsletter ──────────────────────────────────────────────────────────────

  // POST /api/v1/newsletter/subscribe — public endpoint, no auth required
  app.post(
    '/api/v1/newsletter/subscribe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { email?: string; source?: string; locale?: string };
      if (!body?.email) {
        return reply.status(400).send({ error: 'Missing required field: email', statusCode: 400 });
      }
      try {
        const result = await newsletterManager.subscribe(
          body.email,
          body.source ?? 'landing',
          body.locale ?? 'en',
        );
        if (!result.success) {
          const status = result.duplicate ? 409 : 400;
          return reply.status(status).send({ error: result.message, statusCode: status });
        }
        return reply.status(201).send({ subscription: result.subscription });
      } catch (err) {
        app.log.error({ err }, 'Newsletter subscription error');
        return reply.status(500).send({ error: 'Internal server error', statusCode: 500 });
      }
    }
  );

  // POST /api/v1/newsletter/unsubscribe — public, token-based unsubscription
  app.post(
    '/api/v1/newsletter/unsubscribe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { token?: string };
      if (!body?.token || typeof body.token !== 'string') {
        return reply.status(400).send({ error: 'Missing required field: token', statusCode: 400 });
      }
      try {
        const result = await newsletterManager.unsubscribe(body.token);
        if (!result.success) {
          return reply.status(404).send({ error: 'Invalid or expired unsubscribe token', statusCode: 404 });
        }
        return reply.send({ message: 'Successfully unsubscribed' });
      } catch (err) {
        app.log.error({ err }, 'Newsletter unsubscribe error');
        return reply.status(500).send({ error: 'Internal server error', statusCode: 500 });
      }
    }
  );

  // GET /api/v1/newsletter/subscriptions — admin-only list of all subscriptions
  app.get(
    '/api/v1/newsletter/subscriptions',
    { preHandler: [authenticate, authorize([Permission.ADMIN])] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const subscriptions = await newsletterManager.listSubscriptions();
        return reply.send({ subscriptions, total: subscriptions.length });
      } catch (err) {
        app.log.error({ err }, 'Newsletter list error');
        return reply.status(500).send({ error: 'Internal server error', statusCode: 500 });
      }
    }
  );
}
