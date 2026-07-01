import Fastify, {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import cors from '@fastify/cors';
import { createRateLimiter } from './rate-limit';
import { registerRoutes } from './routes';
import { registerGraphQL } from './graphql';
import { registerWebSocket } from './websocket';
import { getMetrics, recordHttpRequest } from './metrics';
import { startHeartbeatMonitor, stopHeartbeatMonitor } from './jobs/heartbeat-monitor';
import { startSemanticIndexSync, stopSemanticIndexSync } from './jobs/semantic-index-sync';
import { ensureDemoWorkspaceProvisioned } from './demo-workspace';
import { seedSelfHostedBootstrapTokens } from './bootstrap/self-hosted-bootstrap';
import { applyMigrations } from './db/migrate';
import { closeDatabase, query } from './db/client';
import { resolveCorsOrigins } from './cors';
import { probeInferenceHealth } from '@cig/chatbot';

const VERSION = '0.1.0';
const RATE_LIMIT_EXEMPT_ROUTES = new Set(['GET /api/v1/health', 'GET /metrics']);
const OPENAI_HEALTH_CACHE_MS = 30_000;
const AUTO_MIGRATE_ENV = 'CIG_AUTO_MIGRATE';
const DEMO_WORKSPACE_RETRY_ATTEMPTS = 10;
const DEMO_WORKSPACE_RETRY_DELAY_MS = 1_500;

type ChatHealthStatus = {
  provider: 'openai' | 'ollama' | 'fallback';
  model: string;
  configured: boolean;
  reachable: boolean;
  providerReachable: boolean;
  checkedAt: string;
  latencyMs: number | null;
};

let inferenceHealthCache: { checkedAt: number; status: ChatHealthStatus } | null = null;

export function startBackgroundJobs(app: FastifyInstance): void {
  startHeartbeatMonitor();
  startSemanticIndexSync(app.log);

  if (process.env.CIG_AUTH_MODE === 'managed' || process.env.CIG_DEMO_MODE === 'true') {
    void ensureDemoWorkspaceProvisioned(app.log).catch((error) => {
      app.log.warn(
        { err: error },
        'Demo workspace auto-provision failed; falling back to seeded demo snapshot'
      );
    });
  }
}

export async function runConfiguredMigrations(app: FastifyInstance): Promise<void> {
  if (process.env[AUTO_MIGRATE_ENV] !== 'true') {
    return;
  }

  const result = await applyMigrations();
  app.log.info(
    {
      applied: result.applied,
      skipped: result.skipped,
    },
    'Configured local database migrations completed'
  );
}

async function waitForDemoWorkspaceProvisioning(
  logger: Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>
): Promise<void> {
  if (process.env.CIG_AUTH_MODE !== 'managed' && process.env.CIG_DEMO_MODE !== 'true') {
    return;
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= DEMO_WORKSPACE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await ensureDemoWorkspaceProvisioned(logger);
      return;
    } catch (error) {
      lastError = error;
      logger.warn(
        {
          err: error,
          attempt,
          maxAttempts: DEMO_WORKSPACE_RETRY_ATTEMPTS,
        },
        'Demo workspace provisioning not ready yet; retrying'
      );

      if (attempt < DEMO_WORKSPACE_RETRY_ATTEMPTS) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, DEMO_WORKSPACE_RETRY_DELAY_MS * attempt)
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Demo workspace provisioning failed');
}

async function resolveChatHealth(endpointReady: boolean): Promise<ChatHealthStatus> {
  const now = Date.now();

  if (inferenceHealthCache && now - inferenceHealthCache.checkedAt < OPENAI_HEALTH_CACHE_MS) {
    return inferenceHealthCache.status;
  }

  const status = await probeInferenceHealth(endpointReady);
  inferenceHealthCache = { checkedAt: now, status };
  return status;
}

export async function createServer(): Promise<FastifyInstance> {
  const multipart = require('@fastify/multipart') as typeof import('@fastify/multipart');
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    // The API is deployed behind a single public ALB. Trust one proxy hop so
    // Fastify resolves the real client IP from X-Forwarded-For and rate
    // limiting does not collapse all traffic into the load balancer address.
    trustProxy: 1,
  });

  // CORS
  await app.register(cors, {
    origin: resolveCorsOrigins(),
  });

  await app.register(multipart, {
    limits: {
      files: 1,
    },
  });

  // Rate limiting (100 req/min per client, Requirement 16.9)
  // Operational endpoints stay exempt so health checks and metrics scraping
  // cannot be throttled by normal client traffic.
  const rateLimit = createRateLimiter();
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = request.routeOptions?.url ?? request.url;
    const routeKey = `${request.method.toUpperCase()} ${route}`;

    if (RATE_LIMIT_EXEMPT_ROUTES.has(routeKey)) {
      return;
    }

    await rateLimit(request, reply);
  });

  // Record HTTP metrics on every response (Requirement 25.1–25.4)
  app.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    const route = request.routerPath ?? request.url;
    recordHttpRequest(request.method, route, reply.statusCode, reply.elapsedTime);
    done();
  });

  // Global error handler
  app.setErrorHandler((error, _request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    app.log.error({ err: error }, 'Unhandled error');
    reply.status(statusCode).send({
      error: error.message ?? 'Internal Server Error',
      statusCode,
    });
  });

  // Health check
  app.get('/api/v1/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const chat = await resolveChatHealth(
      app.hasRoute({ method: 'POST', url: '/api/v1/chat' })
    );
    return reply.send({
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
      chat,
    });
  });

  // DB keep-alive — external cron pings this to prevent Supabase from pausing on inactivity
  RATE_LIMIT_EXEMPT_ROUTES.add('GET /api/v1/health/db');
  app.get('/api/v1/health/db', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await query('SELECT 1');
      return reply.send({ db: 'ok' });
    } catch (err) {
      app.log.warn({ err }, 'DB keep-alive ping failed');
      return reply.status(503).send({ db: 'unavailable' });
    }
  });

  // Prometheus metrics endpoint (no auth — internal scraping, Requirement 25.1)
  app.get('/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await getMetrics();
    return reply.header('Content-Type', 'text/plain; version=0.0.4').send(metrics);
  });

  // Register all API routes
  await registerRoutes(app);

  // Register GraphQL API (Requirement 17.1)
  await registerGraphQL(app);

  // Register WebSocket server (Requirement 9.10)
  await registerWebSocket(app);

  app.addHook('onClose', async () => {
    stopHeartbeatMonitor();
    stopSemanticIndexSync();
    await closeDatabase();
  });

  return app;
}

export async function start(): Promise<void> {
  const port = parseInt(process.env.PORT ?? '3003', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  const app = await createServer();

  try {
    await runConfiguredMigrations(app);
    await seedSelfHostedBootstrapTokens(app.log);
    await waitForDemoWorkspaceProvisioning(app.log);
    await app.listen({ port, host });
    app.log.info(`Server listening on ${host}:${port}`);
    // Start background jobs after the server is listening so startup remains responsive.
    startBackgroundJobs(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Start server when run directly
if (require.main === module) {
  start();
}
