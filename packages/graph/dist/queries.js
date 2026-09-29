"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQueryEngine = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const neo4j_1 = require("./neo4j");
const scope_1 = require("./scope");
// ─── Constants ────────────────────────────────────────────────────────────────
const QUERY_TIMEOUT_MS = 30_000;
const MAX_DEPTH = 3;
const DEFAULT_LIMIT = 50;
function normalizeInteger(value, fallback) {
    if (!Number.isFinite(value ?? NaN)) {
        return fallback;
    }
    return Math.trunc(value);
}
function toNeo4jInteger(value) {
    return neo4j_driver_1.default.int(value);
}
// ─── Record Mapping ───────────────────────────────────────────────────────────
function toDate(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === 'string')
        return new Date(value);
    return new Date();
}
function recordToResource(record) {
    return {
        id: record['id'],
        name: record['name'],
        type: record['type'],
        provider: record['provider'],
        region: record['region'],
        zone: record['zone'],
        state: record['state'],
        tags: record['tags'] ? JSON.parse(record['tags']) : {},
        metadata: record['metadata'] ? JSON.parse(record['metadata']) : {},
        cost: record['cost'] != null ? Number(record['cost']) : undefined,
        ownerId: record['ownerId'],
        tenant: record['tenant'],
        workspace: record['workspace'],
        createdAt: toDate(record['createdAt']),
        updatedAt: toDate(record['updatedAt']),
        discoveredAt: toDate(record['discoveredAt']),
    };
}
function recordToRelationship(record) {
    const r = record;
    return {
        id: r['id'],
        type: r['type'],
        fromId: r['fromId'],
        toId: r['toId'],
        properties: r['properties'] ? JSON.parse(r['properties']) : {},
    };
}
// ─── Session Runner ───────────────────────────────────────────────────────────
async function runRead(fn) {
    const session = (0, neo4j_1.getReadSession)();
    try {
        return await fn(session);
    }
    finally {
        await session.close();
    }
}
// ─── GraphQueryEngine ─────────────────────────────────────────────────────────
class GraphQueryEngine {
    /**
     * Returns all resources that the given resource depends on, up to `depth` levels.
     * Depth is capped at 3. Requirements: 8.3, 8.4
     */
    async getDependencies(resourceId, depth = 1, scope) {
        const cappedDepth = Math.min(Math.max(1, normalizeInteger(depth, 1)), MAX_DEPTH);
        return runRead(async (session) => {
            const params = { id: resourceId, depth: toNeo4jInteger(cappedDepth) };
            const conditions = [
                ...(0, scope_1.buildGraphScopeConditions)('r', scope, params),
                ...(0, scope_1.buildGraphScopeConditions)('dep', scope, params),
            ];
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await session.run(`MATCH (r:Resource {id: $id})-[:DEPENDS_ON|USES|CONNECTS_TO*1..$depth]->(dep:Resource) ${where}
         RETURN DISTINCT properties(dep) AS dep`, params, { timeout: QUERY_TIMEOUT_MS });
            return result.records.map((rec) => recordToResource(rec.get('dep')));
        });
    }
    /**
     * Returns all resources that depend on the given resource, up to `depth` levels.
     * Requirements: 8.5
     */
    async getDependents(resourceId, depth = 1, scope) {
        const cappedDepth = Math.min(Math.max(1, normalizeInteger(depth, 1)), MAX_DEPTH);
        return runRead(async (session) => {
            const params = { id: resourceId, depth: toNeo4jInteger(cappedDepth) };
            const conditions = [
                ...(0, scope_1.buildGraphScopeConditions)('dep', scope, params),
                ...(0, scope_1.buildGraphScopeConditions)('r', scope, params),
            ];
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await session.run(`MATCH (dep:Resource)-[:DEPENDS_ON|USES|CONNECTS_TO*1..$depth]->(r:Resource {id: $id}) ${where}
         RETURN DISTINCT properties(dep) AS dep`, params, { timeout: QUERY_TIMEOUT_MS });
            return result.records.map((rec) => recordToResource(rec.get('dep')));
        });
    }
    /**
     * Returns resources that no other resource depends on (leaf/orphan resources).
     * Requirements: 8.6
     */
    async findUnusedResources(scope) {
        return runRead(async (session) => {
            const params = {};
            const conditions = (0, scope_1.buildGraphScopeConditions)('r', scope, params);
            const scopeWhere = conditions.length > 0 ? `${conditions.join(' AND ')} AND ` : '';
            const result = await session.run(`MATCH (r:Resource)
         WHERE ${scopeWhere}NOT ()-[:DEPENDS_ON|USES|CONNECTS_TO]->(r)
         RETURN properties(r) AS r`, params, { timeout: QUERY_TIMEOUT_MS });
            return result.records.map((rec) => recordToResource(rec.get('r')));
        });
    }
    /**
     * Detects circular dependency cycles in the graph.
     * Uses manual Cypher cycle detection via path matching.
     * Requirements: 8.7
     */
    async findCircularDependencies(scope) {
        return runRead(async (session) => {
            const params = {};
            const conditions = (0, scope_1.buildGraphScopeConditions)('r', scope, params);
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Try APOC SCC first, fall back to manual Cypher detection
            try {
                const result = await session.run(`CALL apoc.algo.scc() YIELD nodes
           WHERE size(nodes) > 1
           RETURN [n IN nodes | n.id] AS nodeIds`, {}, { timeout: QUERY_TIMEOUT_MS });
                return result.records.map((rec) => {
                    const nodeIds = rec.get('nodeIds');
                    return {
                        nodes: nodeIds,
                        edges: [],
                    };
                });
            }
            catch {
                // APOC not available — use manual Cypher cycle detection
                const result = await session.run(`MATCH path = (r:Resource)-[:DEPENDS_ON|USES|CONNECTS_TO*2..${MAX_DEPTH}]->(r)
           ${where}
           RETURN [n IN nodes(path) | n.id] AS nodeIds,
                  [rel IN relationships(path) | type(rel)] AS edgeTypes`, params, { timeout: QUERY_TIMEOUT_MS });
                const seen = new Set();
                const cycles = [];
                for (const rec of result.records) {
                    const nodeIds = rec.get('nodeIds');
                    const edgeTypes = rec.get('edgeTypes');
                    const key = [...nodeIds].sort().join(',');
                    if (!seen.has(key)) {
                        seen.add(key);
                        cycles.push({ nodes: nodeIds, edges: edgeTypes });
                    }
                }
                return cycles;
            }
        });
    }
    /**
     * Full-text search across resource names and metadata.
     * Requirements: 8.8
     */
    async searchResources(query, scope) {
        return runRead(async (session) => {
            const params = { query };
            const conditions = (0, scope_1.buildGraphScopeConditions)('node', scope, params);
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await session.run(`CALL db.index.fulltext.queryNodes('resource_search', $query) YIELD node
         ${where}
         RETURN properties(node) AS r`, params, { timeout: QUERY_TIMEOUT_MS });
            return result.records.map((rec) => recordToResource(rec.get('r')));
        });
    }
    /**
     * Lists resources with optional filters and pagination.
     * Requirements: 8.9, 8.10, 24.8
     */
    async listResourcesPaged(filters, pagination, scope) {
        const limit = Math.max(0, normalizeInteger(pagination?.limit, DEFAULT_LIMIT));
        const offset = Math.max(0, normalizeInteger(pagination?.offset, 0));
        return runRead(async (session) => {
            const conditions = [];
            const params = {
                limit: toNeo4jInteger(limit),
                offset: toNeo4jInteger(offset),
            };
            if (filters?.type) {
                conditions.push('r.type = $type');
                params['type'] = filters.type;
            }
            if (filters?.provider) {
                conditions.push('r.provider = $provider');
                params['provider'] = filters.provider;
            }
            if (filters?.region) {
                conditions.push('r.region = $region');
                params['region'] = filters.region;
            }
            if (filters?.state) {
                conditions.push('r.state = $state');
                params['state'] = filters.state;
            }
            conditions.push(...(0, scope_1.buildGraphScopeConditions)('r', scope, params));
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Neo4j sessions execute queries serially; parallel `session.run()` calls on the
            // same session can fail in production even when tests mock the driver.
            const countResult = await session.run(`MATCH (r:Resource) ${where} RETURN count(r) AS total`, params, { timeout: QUERY_TIMEOUT_MS });
            const dataResult = await session.run(`MATCH (r:Resource) ${where} RETURN properties(r) AS r ORDER BY r.name SKIP $offset LIMIT $limit`, params, { timeout: QUERY_TIMEOUT_MS });
            const total = countResult.records[0]?.get('total');
            const totalCount = typeof total === 'object' && total !== null && 'toNumber' in total
                ? total.toNumber()
                : Number(total ?? 0);
            let resources = dataResult.records.map((rec) => recordToResource(rec.get('r')));
            // Tag filtering done in-memory (tags stored as JSON string)
            if (filters?.tags) {
                const tagEntries = Object.entries(filters.tags);
                resources = resources.filter((res) => tagEntries.every(([k, v]) => res.tags[k] === v));
            }
            return {
                items: resources,
                total: totalCount,
                hasMore: offset + resources.length < totalCount,
            };
        });
    }
    /**
     * Returns resource counts grouped by type.
     * Requirements: 8.9
     */
    async getResourceCounts(scope) {
        return runRead(async (session) => {
            const params = {};
            const conditions = (0, scope_1.buildGraphScopeConditions)('r', scope, params);
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await session.run(`MATCH (r:Resource) ${where} RETURN r.type AS type, count(r) AS count`, params, { timeout: QUERY_TIMEOUT_MS });
            const counts = {};
            for (const rec of result.records) {
                const type = rec.get('type');
                const count = rec.get('count');
                counts[type] = typeof count === 'object' && count !== null && 'toNumber' in count
                    ? count.toNumber()
                    : Number(count);
            }
            return counts;
        });
    }
    /**
     * Returns all relationships in the graph, capped by `limit`.
     * Requirements: 8.9, 24.8
     */
    async listRelationships(limit = DEFAULT_LIMIT, scope) {
        const cappedLimit = Math.min(Math.max(1, normalizeInteger(limit, DEFAULT_LIMIT)), 1_000);
        return runRead(async (session) => {
            const params = { limit: toNeo4jInteger(cappedLimit) };
            const conditions = [
                ...(0, scope_1.buildGraphScopeConditions)('a', scope, params),
                ...(0, scope_1.buildGraphScopeConditions)('b', scope, params),
            ];
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await session.run(`MATCH (a:Resource)-[rel]->(b:Resource)
         ${where}
         RETURN rel.id AS id,
                type(rel) AS type,
                a.id AS fromId,
                b.id AS toId,
                rel.properties AS properties
         ORDER BY type(rel), a.id, b.id
         LIMIT $limit`, params, { timeout: QUERY_TIMEOUT_MS });
            return result.records.map((rec) => recordToRelationship({
                id: rec.get('id'),
                type: rec.get('type'),
                fromId: rec.get('fromId'),
                toId: rec.get('toId'),
                properties: rec.get('properties'),
            }));
        });
    }
}
exports.GraphQueryEngine = GraphQueryEngine;
//# sourceMappingURL=queries.js.map