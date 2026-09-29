"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const graph_1 = require("@cig/graph");
const discovery_1 = require("@cig/discovery");
const auth_1 = require("./auth");
const costs_1 = require("./costs");
const security_1 = require("./security");
const newsletter_1 = require("./newsletter");
const device_auth_1 = require("./routes/device-auth");
const enrollment_1 = require("./routes/enrollment");
const heartbeat_1 = require("./routes/heartbeat");
const bootstrap_1 = require("./routes/bootstrap");
const oidc_1 = require("./routes/oidc");
const audit_1 = require("./routes/audit");
const sessions_1 = require("./routes/sessions");
const scans_1 = require("./routes/scans");
const auth_email_1 = require("./routes/auth-email");
const chat_1 = require("./routes/chat");
const demo_1 = require("./routes/demo");
const onboarding_1 = require("./routes/onboarding");
const enroll_1 = require("./routes/nodes/enroll");
const heartbeat_2 = require("./routes/nodes/heartbeat");
const revoke_1 = require("./routes/nodes/revoke");
const graphDelta_1 = require("./routes/nodes/graphDelta");
const list_1 = require("./routes/nodes/list");
const bootstrap_node_1 = require("./routes/bootstrap-node");
const nodeStatus_1 = require("./sse/nodeStatus");
const graph_2 = require("./routes/graph");
const analytics_1 = require("./routes/analytics");
// Shared instances
const graphEngine = new graph_1.GraphEngine();
const queryEngine = new graph_1.GraphQueryEngine();
const cartographyClient = new discovery_1.CartographyClient();
const readResources = [auth_1.authenticate, (0, auth_1.authorize)([auth_1.Permission.READ_RESOURCES])];
const manageDiscovery = [auth_1.authenticate, (0, auth_1.authorize)([auth_1.Permission.MANAGE_DISCOVERY])];
const executeActions = [auth_1.authenticate, (0, auth_1.authorize)([auth_1.Permission.EXECUTE_ACTIONS])];
function parseInteger(value, fallback) {
    if (typeof value !== 'string')
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function emptyPagedResources() {
    return { items: [], total: 0, hasMore: false };
}
const DEFAULT_DISCOVERY_INTERVAL_MINUTES = 5;
function resolveDiscoveryIntervalMinutes() {
    const parsed = Number.parseInt(process.env.DISCOVERY_INTERVAL_MINUTES ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DISCOVERY_INTERVAL_MINUTES;
}
function resolveNextRun(lastRun) {
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
function buildDiscoveryStatusSnapshot(status, recentRuns) {
    const lastRun = recentRuns?.last_run ?? status?.last_run_end ?? status?.last_run_start ?? null;
    return {
        running: status?.running ?? false,
        lastRun,
        nextRun: resolveNextRun(lastRun),
    };
}
async function registerRoutes(app) {
    // ─── Device Authorization (RFC 8628) ────────────────────────────────────────
    await app.register(device_auth_1.deviceAuthRoutes);
    // ─── Target Enrollment (Requirement 13) ─────────────────────────────────────
    await app.register(enrollment_1.enrollmentRoutes);
    // ─── Heartbeat (Requirement 14) ──────────────────────────────────────────────
    await app.register(heartbeat_1.heartbeatRoutes);
    // ─── Bootstrap (Requirement 15) ──────────────────────────────────────────────
    await app.register(bootstrap_1.bootstrapRoutes);
    // ─── OIDC Callback (Requirement 16) ──────────────────────────────────────────
    await app.register(oidc_1.oidcRoutes);
    // ─── Audit (Requirement 18) ──────────────────────────────────────────────────
    await app.register(audit_1.auditRoutes);
    // ─── Session Management (Phase 1.3) ──────────────────────────────────────────
    await app.register(sessions_1.sessionRoutes);
    // ─── Scan Results (Phase 3.2) ────────────────────────────────────────────────
    await app.register(scans_1.scanRoutes);
    // ─── Custom Auth Email Endpoints ─────────────────────────────────────────────
    await app.register(auth_email_1.authEmailRoutes);
    // ─── Chat (RAG + OpenAI) ─────────────────────────────────────────────────────
    await app.register(chat_1.chatRoutes);
    // ─── Demo workspace (shared seeded graph snapshot) ──────────────────────────
    await app.register(demo_1.demoRoutes);
    // ─── Graph snapshot, relationships, and refinement ────────────────────────
    await app.register(graph_2.graphRoutes);
    // ─── Umami Analytics SaaS control plane and tracker ─────────────────────
    await app.register(analytics_1.analyticsRoutes);
    // ─── CIG Node Onboarding (Phase 1, Requirements 3.1–3.9, 17.1–17.3) ─────────
    await app.register(onboarding_1.onboardingRoutes);
    // ─── CIG Node Enrollment (Phase 3, Requirements 7.1–7.3, 7.10, 3.4, 3.5, 22.4) ─
    await app.register(enroll_1.nodeEnrollmentRoutes);
    // ─── CIG Node Heartbeat (Phase 3, Requirements 16.1–16.10, 17.5) ─────────────
    await app.register(heartbeat_2.nodeHeartbeatRoutes);
    // ─── CIG Node Revocation (Phase 3, Requirements 7.8, 14.9) ──────────────────
    await app.register(revoke_1.nodeRevocationRoutes);
    // ─── CIG Node Graph Delta (Phase 3, Requirements 8.9, 8.10, 17.6) ────────────
    await app.register(graphDelta_1.nodeGraphDeltaRoutes);
    // ─── CIG Node List (Phase 3, Requirements 12.7, 16.7, 17.7) ─────────────────
    await app.register(list_1.nodeListRoutes);
    // ─── CIG Node Self-Hosted Bootstrap (Phase 6, Requirements 13.4–13.7) ────────
    await app.register(bootstrap_node_1.bootstrapNodeRoutes);
    // ─── CIG Node SSE (Phase 3, Requirements 12.8, 16.10) ────────────────────────
    await app.register(nodeStatus_1.nodeSSERoutes);
    // ─── Resources ──────────────────────────────────────────────────────────────
    // GET /api/v1/resources — list all resources with optional filtering
    app.get('/api/v1/resources', { preHandler: readResources }, async (request, reply) => {
        const query = request.query;
        const filters = {};
        if (query['type'])
            filters.type = query['type'];
        if (query['provider'])
            filters.provider = query['provider'];
        if (query['region'])
            filters.region = query['region'];
        if (query['state'])
            filters.state = query['state'];
        const limit = parseInteger(query['limit'], 50);
        const offset = parseInteger(query['offset'], 0);
        try {
            const result = await queryEngine.listResourcesPaged(filters, { limit, offset });
            return reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error, limit, offset, filters }, 'Failed to list resources; returning an empty result set');
            return reply.send(emptyPagedResources());
        }
    });
    // GET /api/v1/resources/search — search resources by query string
    app.get('/api/v1/resources/search', { preHandler: readResources }, async (request, reply) => {
        const { q } = request.query;
        if (!q) {
            return reply.status(400).send({ error: 'Missing query parameter: q', statusCode: 400 });
        }
        const resources = await queryEngine.searchResources(q);
        return reply.send({ items: resources, total: resources.length });
    });
    // GET /api/v1/resources/:id — get resource by ID
    app.get('/api/v1/resources/:id', { preHandler: readResources }, async (request, reply) => {
        const { id } = request.params;
        const resource = await graphEngine.getResource(id);
        if (!resource) {
            return reply.status(404).send({ error: 'Resource not found', statusCode: 404 });
        }
        return reply.send(resource);
    });
    // GET /api/v1/resources/:id/dependencies — get resources this resource depends on
    app.get('/api/v1/resources/:id/dependencies', { preHandler: readResources }, async (request, reply) => {
        const { id } = request.params;
        const { depth } = request.query;
        const deps = await queryEngine.getDependencies(id, depth ? parseInt(depth, 10) : 1);
        return reply.send({ items: deps, total: deps.length });
    });
    // GET /api/v1/resources/:id/dependents — get resources that depend on this resource
    app.get('/api/v1/resources/:id/dependents', { preHandler: readResources }, async (request, reply) => {
        const { id } = request.params;
        const { depth } = request.query;
        const dependents = await queryEngine.getDependents(id, depth ? parseInt(depth, 10) : 1);
        return reply.send({ items: dependents, total: dependents.length });
    });
    // ─── Discovery ──────────────────────────────────────────────────────────────
    // GET /api/v1/discovery/status — get discovery status
    app.get('/api/v1/discovery/status', { preHandler: readResources }, async (request, reply) => {
        let status = null;
        let recentRuns = null;
        try {
            status = await cartographyClient.getStatus();
        }
        catch (error) {
            request.log.warn({ err: error }, 'Discovery status unavailable; falling back to empty status');
        }
        try {
            recentRuns = await cartographyClient.getRecentRuns();
        }
        catch (error) {
            request.log.warn({ err: error }, 'Discovery recent runs unavailable; falling back to status-only snapshot');
        }
        return reply.send(buildDiscoveryStatusSnapshot(status, recentRuns));
    });
    // POST /api/v1/discovery/trigger — manually trigger discovery
    app.post('/api/v1/discovery/trigger', { preHandler: manageDiscovery }, async (_request, reply) => {
        const result = await cartographyClient.triggerRun();
        return reply.status(202).send(result);
    });
    // ─── Costs (stub — implemented in later phases) ─────────────────────────────
    // GET /api/v1/costs — get cost summary
    app.get('/api/v1/costs', { preHandler: readResources }, async (_request, reply) => {
        const summary = await costs_1.costAnalyzer.getSummary();
        return reply.send(summary);
    });
    // GET /api/v1/costs/breakdown — get cost breakdown by resource type/provider
    app.get('/api/v1/costs/breakdown', { preHandler: readResources }, async (_request, reply) => {
        const breakdown = await costs_1.costAnalyzer.getBreakdown();
        return reply.send(breakdown);
    });
    // ─── Security (stub — implemented in later phases) ──────────────────────────
    // GET /api/v1/security/findings — get security findings (optionally filtered by resourceId)
    app.get('/api/v1/security/findings', { preHandler: readResources }, async (request, reply) => {
        const { resourceId } = request.query;
        const findings = await security_1.securityScanner.getFindings(resourceId);
        return reply.send({ items: findings, total: findings.length });
    });
    // GET /api/v1/security/score — get overall security score
    app.get('/api/v1/security/score', { preHandler: readResources }, async (_request, reply) => {
        const score = await security_1.securityScanner.getScore();
        return reply.send(score);
    });
    // ─── Actions ────────────────────────────────────────────────────────────────
    // POST /api/v1/actions/execute — execute an infrastructure action
    app.post('/api/v1/actions/execute', { preHandler: executeActions }, async (request, reply) => {
        const body = request.body;
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
    });
    // ─── Newsletter ──────────────────────────────────────────────────────────────
    // POST /api/v1/newsletter/subscribe — public endpoint, no auth required
    app.post('/api/v1/newsletter/subscribe', async (request, reply) => {
        const body = request.body;
        if (!body?.email) {
            return reply.status(400).send({ error: 'Missing required field: email', statusCode: 400 });
        }
        try {
            const result = await newsletter_1.newsletterManager.subscribe(body.email, body.source ?? 'landing', body.locale ?? 'en');
            if (!result.success) {
                const status = result.duplicate ? 409 : 400;
                return reply.status(status).send({ error: result.message, statusCode: status });
            }
            return reply.status(201).send({ subscription: result.subscription });
        }
        catch (err) {
            app.log.error({ err }, 'Newsletter subscription error');
            return reply.status(500).send({ error: 'Internal server error', statusCode: 500 });
        }
    });
    // POST /api/v1/newsletter/unsubscribe — public, token-based unsubscription
    app.post('/api/v1/newsletter/unsubscribe', async (request, reply) => {
        const body = request.body;
        if (!body?.token || typeof body.token !== 'string') {
            return reply.status(400).send({ error: 'Missing required field: token', statusCode: 400 });
        }
        try {
            const result = await newsletter_1.newsletterManager.unsubscribe(body.token);
            if (!result.success) {
                return reply.status(404).send({ error: 'Invalid or expired unsubscribe token', statusCode: 404 });
            }
            return reply.send({ message: 'Successfully unsubscribed' });
        }
        catch (err) {
            app.log.error({ err }, 'Newsletter unsubscribe error');
            return reply.status(500).send({ error: 'Internal server error', statusCode: 500 });
        }
    });
    // GET /api/v1/newsletter/subscriptions — admin-only list of all subscriptions
    app.get('/api/v1/newsletter/subscriptions', { preHandler: [auth_1.authenticate, (0, auth_1.authorize)([auth_1.Permission.ADMIN])] }, async (_request, reply) => {
        try {
            const subscriptions = await newsletter_1.newsletterManager.listSubscriptions();
            return reply.send({ subscriptions, total: subscriptions.length });
        }
        catch (err) {
            app.log.error({ err }, 'Newsletter list error');
            return reply.status(500).send({ error: 'Internal server error', statusCode: 500 });
        }
    });
}
//# sourceMappingURL=routes.js.map