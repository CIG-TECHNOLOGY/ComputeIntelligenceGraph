"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBackgroundJobs = startBackgroundJobs;
exports.runConfiguredMigrations = runConfiguredMigrations;
exports.createServer = createServer;
exports.start = start;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = require("./rate-limit");
const routes_1 = require("./routes");
const graphql_1 = require("./graphql");
const websocket_1 = require("./websocket");
const metrics_1 = require("./metrics");
const heartbeat_monitor_1 = require("./jobs/heartbeat-monitor");
const semantic_index_sync_1 = require("./jobs/semantic-index-sync");
const demo_workspace_1 = require("./demo-workspace");
const self_hosted_bootstrap_1 = require("./bootstrap/self-hosted-bootstrap");
const migrate_1 = require("./db/migrate");
const client_1 = require("./db/client");
const cors_2 = require("./cors");
const chatbot_1 = require("@cig/chatbot");
const VERSION = '0.1.0';
const RATE_LIMIT_EXEMPT_ROUTES = new Set(['GET /api/v1/health', 'GET /metrics']);
const OPENAI_HEALTH_CACHE_MS = 30_000;
const AUTO_MIGRATE_ENV = 'CIG_AUTO_MIGRATE';
const DEMO_WORKSPACE_RETRY_ATTEMPTS = 10;
const DEMO_WORKSPACE_RETRY_DELAY_MS = 1_500;
let inferenceHealthCache = null;
function startBackgroundJobs(app) {
    (0, heartbeat_monitor_1.startHeartbeatMonitor)();
    (0, semantic_index_sync_1.startSemanticIndexSync)(app.log);
    if (process.env.CIG_AUTH_MODE === 'managed' || process.env.CIG_DEMO_MODE === 'true') {
        void (0, demo_workspace_1.ensureDemoWorkspaceProvisioned)(app.log).catch((error) => {
            app.log.warn({ err: error }, 'Demo workspace auto-provision failed; falling back to seeded demo snapshot');
        });
    }
}
async function runConfiguredMigrations(app) {
    if (process.env[AUTO_MIGRATE_ENV] !== 'true') {
        return;
    }
    const result = await (0, migrate_1.applyMigrations)();
    app.log.info({
        applied: result.applied,
        skipped: result.skipped,
    }, 'Configured local database migrations completed');
}
async function waitForDemoWorkspaceProvisioning(logger) {
    if (process.env.CIG_AUTH_MODE !== 'managed' && process.env.CIG_DEMO_MODE !== 'true') {
        return;
    }
    let lastError = null;
    for (let attempt = 1; attempt <= DEMO_WORKSPACE_RETRY_ATTEMPTS; attempt += 1) {
        try {
            await (0, demo_workspace_1.ensureDemoWorkspaceProvisioned)(logger);
            return;
        }
        catch (error) {
            lastError = error;
            logger.warn({
                err: error,
                attempt,
                maxAttempts: DEMO_WORKSPACE_RETRY_ATTEMPTS,
            }, 'Demo workspace provisioning not ready yet; retrying');
            if (attempt < DEMO_WORKSPACE_RETRY_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, DEMO_WORKSPACE_RETRY_DELAY_MS * attempt));
            }
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error('Demo workspace provisioning failed');
}
async function resolveChatHealth(endpointReady) {
    const now = Date.now();
    if (inferenceHealthCache && now - inferenceHealthCache.checkedAt < OPENAI_HEALTH_CACHE_MS) {
        return inferenceHealthCache.status;
    }
    const status = await (0, chatbot_1.probeInferenceHealth)(endpointReady);
    inferenceHealthCache = { checkedAt: now, status };
    return status;
}
async function createServer() {
    const multipart = require('@fastify/multipart');
    const app = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL ?? 'info',
        },
        // The API is deployed behind a single public ALB. Trust one proxy hop so
        // Fastify resolves the real client IP from X-Forwarded-For and rate
        // limiting does not collapse all traffic into the load balancer address.
        trustProxy: 1,
    });
    // CORS
    await app.register(cors_1.default, {
        origin: (0, cors_2.resolveCorsOrigins)(),
    });
    await app.register(multipart, {
        limits: {
            files: 1,
        },
    });
    // Rate limiting (100 req/min per client, Requirement 16.9)
    // Operational endpoints stay exempt so health checks and metrics scraping
    // cannot be throttled by normal client traffic.
    const rateLimit = (0, rate_limit_1.createRateLimiter)();
    app.addHook('preHandler', async (request, reply) => {
        const route = request.routeOptions?.url ?? request.url;
        const routeKey = `${request.method.toUpperCase()} ${route}`;
        if (RATE_LIMIT_EXEMPT_ROUTES.has(routeKey)) {
            return;
        }
        await rateLimit(request, reply);
    });
    // Record HTTP metrics on every response (Requirement 25.1–25.4)
    app.addHook('onResponse', (request, reply, done) => {
        const route = request.routerPath ?? request.url;
        (0, metrics_1.recordHttpRequest)(request.method, route, reply.statusCode, reply.elapsedTime);
        done();
    });
    // Global error handler
    app.setErrorHandler((error, _request, reply) => {
        const statusCode = error.statusCode ?? 500;
        app.log.error({ err: error }, 'Unhandled error');
        reply.status(statusCode).send({
            error: error.message ?? 'Internal Server Error',
            statusCode,
        });
    });
    // Health check
    app.get('/api/v1/health', async (_request, reply) => {
        const chat = await resolveChatHealth(app.hasRoute({ method: 'POST', url: '/api/v1/chat' }));
        return reply.send({
            status: 'ok',
            version: VERSION,
            timestamp: new Date().toISOString(),
            chat,
        });
    });
    // DB keep-alive — external cron pings this to prevent Supabase from pausing on inactivity
    RATE_LIMIT_EXEMPT_ROUTES.add('GET /api/v1/health/db');
    app.get('/api/v1/health/db', async (_request, reply) => {
        try {
            await (0, client_1.query)('SELECT 1');
            return reply.send({ db: 'ok' });
        }
        catch (err) {
            app.log.warn({ err }, 'DB keep-alive ping failed');
            return reply.status(503).send({ db: 'unavailable' });
        }
    });
    // Prometheus metrics endpoint (no auth — internal scraping, Requirement 25.1)
    app.get('/metrics', async (_request, reply) => {
        const metrics = await (0, metrics_1.getMetrics)();
        return reply.header('Content-Type', 'text/plain; version=0.0.4').send(metrics);
    });
    // Register all API routes
    await (0, routes_1.registerRoutes)(app);
    // Register GraphQL API (Requirement 17.1)
    await (0, graphql_1.registerGraphQL)(app);
    // Register WebSocket server (Requirement 9.10)
    await (0, websocket_1.registerWebSocket)(app);
    app.addHook('onClose', async () => {
        (0, heartbeat_monitor_1.stopHeartbeatMonitor)();
        (0, semantic_index_sync_1.stopSemanticIndexSync)();
        await (0, client_1.closeDatabase)();
    });
    return app;
}
async function start() {
    const port = parseInt(process.env.PORT ?? '3003', 10);
    const host = process.env.HOST ?? '0.0.0.0';
    const app = await createServer();
    try {
        await runConfiguredMigrations(app);
        await (0, self_hosted_bootstrap_1.seedSelfHostedBootstrapTokens)(app.log);
        await waitForDemoWorkspaceProvisioning(app.log);
        await app.listen({ port, host });
        app.log.info(`Server listening on ${host}:${port}`);
        // Start background jobs after the server is listening so startup remains responsive.
        startBackgroundJobs(app);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
// Start server when run directly
if (require.main === module) {
    start();
}
//# sourceMappingURL=index.js.map