"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const engine_1 = require("./engine");
const queries_1 = require("./queries");
const types_1 = require("./types");
const neo4j = __importStar(require("./neo4j"));
// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeResource(overrides = {}) {
    const now = new Date('2024-01-01T00:00:00.000Z');
    return {
        id: 'res-1',
        name: 'test-resource',
        type: types_1.ResourceType.COMPUTE,
        provider: types_1.Provider.AWS,
        region: 'us-east-1',
        state: types_1.ResourceState.RUNNING,
        tags: { env: 'prod' },
        metadata: { instanceType: 't3.micro' },
        createdAt: now,
        updatedAt: now,
        discoveredAt: now,
        ...overrides,
    };
}
function makeNeo4jRecord(props) {
    const now = '2024-01-01T00:00:00.000Z';
    const defaults = {
        id: 'res-1',
        name: 'test',
        type: types_1.ResourceType.COMPUTE,
        provider: types_1.Provider.AWS,
        region: 'us-east-1',
        state: types_1.ResourceState.RUNNING,
        tags: JSON.stringify({ env: 'prod' }),
        metadata: '{}',
        createdAt: now,
        updatedAt: now,
        discoveredAt: now,
        ...props,
    };
    return {
        get: (key) => defaults[key],
    };
}
function makeSession(runResult = {}) {
    const records = runResult['records'] ?? [];
    return {
        run: vitest_1.vi.fn().mockResolvedValue({ records }),
        close: vitest_1.vi.fn().mockResolvedValue(undefined),
    };
}
// ─── GraphEngine Tests ────────────────────────────────────────────────────────
(0, vitest_1.describe)('GraphEngine', () => {
    let engine;
    let mockWriteSession;
    let mockReadSession;
    (0, vitest_1.beforeEach)(() => {
        engine = new engine_1.GraphEngine();
        mockWriteSession = makeSession();
        mockReadSession = makeSession();
        vitest_1.vi.spyOn(neo4j, 'getWriteSession').mockReturnValue(mockWriteSession);
        vitest_1.vi.spyOn(neo4j, 'getReadSession').mockReturnValue(mockReadSession);
    });
    // ─── createResource ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)('createResource', () => {
        (0, vitest_1.it)('runs a MERGE query with serialized tags and metadata', async () => {
            const resource = makeResource();
            await engine.createResource(resource);
            (0, vitest_1.expect)(mockWriteSession.run).toHaveBeenCalledOnce();
            const [query, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('MERGE (r:Resource {id: $id})');
            (0, vitest_1.expect)(params.id).toBe('res-1');
            (0, vitest_1.expect)(params.tags).toBe(JSON.stringify({ env: 'prod' }));
            (0, vitest_1.expect)(params.metadata).toBe(JSON.stringify({ instanceType: 't3.micro' }));
            (0, vitest_1.expect)(params.createdAt).toBe('2024-01-01T00:00:00.000Z');
        });
        (0, vitest_1.it)('closes the session even on success', async () => {
            await engine.createResource(makeResource());
            (0, vitest_1.expect)(mockWriteSession.close).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('closes the session on failure', async () => {
            mockWriteSession.run.mockRejectedValueOnce(new Error('boom'));
            await (0, vitest_1.expect)(engine.createResource(makeResource())).rejects.toThrow('boom');
            (0, vitest_1.expect)(mockWriteSession.close).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('serializes null for optional fields', async () => {
            const resource = makeResource({ region: undefined, zone: undefined, cost: undefined });
            await engine.createResource(resource);
            const [, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.region).toBeNull();
            (0, vitest_1.expect)(params.zone).toBeNull();
            (0, vitest_1.expect)(params.cost).toBeNull();
        });
    });
    // ─── updateResource ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)('updateResource', () => {
        (0, vitest_1.it)('builds SET clause only for provided fields', async () => {
            await engine.updateResource('res-1', { state: types_1.ResourceState.STOPPED });
            const [query, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('r.state = $state');
            (0, vitest_1.expect)(query).not.toContain('r.name');
            (0, vitest_1.expect)(params.state).toBe(types_1.ResourceState.STOPPED);
            (0, vitest_1.expect)(params.id).toBe('res-1');
        });
        (0, vitest_1.it)('always updates updatedAt', async () => {
            await engine.updateResource('res-1', { name: 'new-name' });
            const [, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.updatedAt).toBeDefined();
        });
        (0, vitest_1.it)('serializes tags when provided', async () => {
            await engine.updateResource('res-1', { tags: { env: 'staging' } });
            const [, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.tags).toBe(JSON.stringify({ env: 'staging' }));
        });
        (0, vitest_1.it)('serializes metadata when provided', async () => {
            await engine.updateResource('res-1', { metadata: { size: 'large' } });
            const [, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.metadata).toBe(JSON.stringify({ size: 'large' }));
        });
        (0, vitest_1.it)('can update multiple fields at once', async () => {
            await engine.updateResource('res-1', { name: 'new', state: types_1.ResourceState.STOPPED });
            const [query] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('r.name = $name');
            (0, vitest_1.expect)(query).toContain('r.state = $state');
        });
    });
    // ─── deleteResource ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)('deleteResource', () => {
        (0, vitest_1.it)('runs DETACH DELETE with the given id', async () => {
            await engine.deleteResource('res-1');
            const [query, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('DETACH DELETE r');
            (0, vitest_1.expect)(params.id).toBe('res-1');
        });
        (0, vitest_1.it)('closes the session after delete', async () => {
            await engine.deleteResource('res-1');
            (0, vitest_1.expect)(mockWriteSession.close).toHaveBeenCalledOnce();
        });
    });
    // ─── executeCypher ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)('executeCypher', () => {
        (0, vitest_1.it)('runs write queries against the write session and returns row count', async () => {
            mockWriteSession.run.mockResolvedValueOnce({ records: [{}, {}] });
            const result = await engine.executeCypher('MATCH (a:Resource {id: $id}), (b:Resource {id: $target}) MERGE (a)-[:DEPENDS_ON]->(b) RETURN a, b', { id: 'res-1', target: 'res-2' }, 'write');
            (0, vitest_1.expect)(result.rowCount).toBe(2);
            (0, vitest_1.expect)(mockWriteSession.run).toHaveBeenCalledOnce();
            (0, vitest_1.expect)(mockReadSession.run).not.toHaveBeenCalled();
            const [query, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('MERGE (a)-[:DEPENDS_ON]->(b)');
            (0, vitest_1.expect)(params.id).toBe('res-1');
            (0, vitest_1.expect)(params.target).toBe('res-2');
        });
        (0, vitest_1.it)('runs read queries against the read session by default', async () => {
            mockReadSession.run.mockResolvedValueOnce({ records: [{}, {}, {}] });
            const result = await engine.executeCypher('MATCH (r:Resource) RETURN r LIMIT $limit', { limit: 3 });
            (0, vitest_1.expect)(result.rowCount).toBe(3);
            (0, vitest_1.expect)(mockReadSession.run).toHaveBeenCalledOnce();
            (0, vitest_1.expect)(mockWriteSession.run).not.toHaveBeenCalled();
        });
    });
    // ─── getResource ────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('getResource', () => {
        (0, vitest_1.it)('returns null when no record found', async () => {
            const result = await engine.getResource('missing');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('maps Neo4j record to Resource_Model with Date deserialization', async () => {
            const fakeRecord = {
                get: (key) => {
                    if (key === 'r') {
                        return {
                            id: 'res-1',
                            name: 'test',
                            type: types_1.ResourceType.COMPUTE,
                            provider: types_1.Provider.AWS,
                            region: 'us-east-1',
                            state: types_1.ResourceState.RUNNING,
                            tags: JSON.stringify({ env: 'prod' }),
                            metadata: JSON.stringify({}),
                            createdAt: '2024-01-01T00:00:00.000Z',
                            updatedAt: '2024-01-01T00:00:00.000Z',
                            discoveredAt: '2024-01-01T00:00:00.000Z',
                        };
                    }
                },
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await engine.getResource('res-1');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result.id).toBe('res-1');
            (0, vitest_1.expect)(result.createdAt).toBeInstanceOf(Date);
            (0, vitest_1.expect)(result.tags).toEqual({ env: 'prod' });
        });
        (0, vitest_1.it)('parses metadata JSON from Neo4j record', async () => {
            const fakeRecord = {
                get: (key) => key === 'r'
                    ? {
                        id: 'res-2', name: 'x', type: types_1.ResourceType.STORAGE, provider: types_1.Provider.AWS,
                        state: types_1.ResourceState.ACTIVE, tags: '{}',
                        metadata: JSON.stringify({ bucket: 'my-bucket' }),
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                        discoveredAt: '2024-01-01T00:00:00.000Z',
                    }
                    : undefined,
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await engine.getResource('res-2');
            (0, vitest_1.expect)(result.metadata).toEqual({ bucket: 'my-bucket' });
        });
    });
    // ─── listResources ──────────────────────────────────────────────────────────
    (0, vitest_1.describe)('listResources', () => {
        (0, vitest_1.it)('runs query without WHERE when no filters', async () => {
            await engine.listResources();
            const [query] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).not.toContain('WHERE');
        });
        (0, vitest_1.it)('adds WHERE clause for type filter', async () => {
            await engine.listResources({ type: types_1.ResourceType.COMPUTE });
            const [query, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('WHERE r.type = $type');
            (0, vitest_1.expect)(params.type).toBe(types_1.ResourceType.COMPUTE);
        });
        (0, vitest_1.it)('adds WHERE clause for provider filter', async () => {
            await engine.listResources({ provider: types_1.Provider.GCP });
            const [query, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('r.provider = $provider');
            (0, vitest_1.expect)(params.provider).toBe(types_1.Provider.GCP);
        });
        (0, vitest_1.it)('adds WHERE clause for state filter', async () => {
            await engine.listResources({ state: types_1.ResourceState.STOPPED });
            const [query, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('r.state = $state');
            (0, vitest_1.expect)(params.state).toBe(types_1.ResourceState.STOPPED);
        });
        (0, vitest_1.it)('filters by tags in-memory', async () => {
            const now = '2024-01-01T00:00:00.000Z';
            const makeRec = (tags) => ({
                get: (key) => key === 'r'
                    ? {
                        id: 'x', name: 'x', type: types_1.ResourceType.COMPUTE, provider: types_1.Provider.AWS,
                        state: types_1.ResourceState.RUNNING, tags: JSON.stringify(tags), metadata: '{}',
                        createdAt: now, updatedAt: now, discoveredAt: now,
                    }
                    : undefined,
            });
            mockReadSession.run.mockResolvedValueOnce({
                records: [makeRec({ env: 'prod' }), makeRec({ env: 'dev' })],
            });
            const results = await engine.listResources({ tags: { env: 'prod' } });
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].tags.env).toBe('prod');
        });
        (0, vitest_1.it)('returns empty array when no resources match', async () => {
            mockReadSession.run.mockResolvedValueOnce({ records: [] });
            const results = await engine.listResources({ type: types_1.ResourceType.FUNCTION });
            (0, vitest_1.expect)(results).toEqual([]);
        });
    });
    // ─── createRelationship ─────────────────────────────────────────────────────
    (0, vitest_1.describe)('createRelationship', () => {
        (0, vitest_1.it)('runs MERGE with correct relationship type', async () => {
            await engine.createRelationship('a', 'b', types_1.RelationshipType.DEPENDS_ON, { weight: 1 });
            const [query, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('MERGE (a)-[rel:DEPENDS_ON');
            (0, vitest_1.expect)(params.from).toBe('a');
            (0, vitest_1.expect)(params.to).toBe('b');
            (0, vitest_1.expect)(params.properties).toBe(JSON.stringify({ weight: 1 }));
        });
        (0, vitest_1.it)('defaults to empty props when none provided', async () => {
            await engine.createRelationship('a', 'b', types_1.RelationshipType.USES);
            const [, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.properties).toBe('{}');
        });
        (0, vitest_1.it)('generates a composite id from from:type:to', async () => {
            await engine.createRelationship('src', 'dst', types_1.RelationshipType.CONNECTS_TO);
            const [, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.relId).toBe('src:CONNECTS_TO:dst');
        });
        (0, vitest_1.it)('supports all relationship types', async () => {
            for (const relType of Object.values(types_1.RelationshipType)) {
                mockWriteSession.run.mockResolvedValueOnce({ records: [] });
                await engine.createRelationship('a', 'b', relType);
                const [query] = mockWriteSession.run.mock.calls.at(-1);
                (0, vitest_1.expect)(query).toContain(relType);
            }
        });
    });
    // ─── deleteRelationship ─────────────────────────────────────────────────────
    (0, vitest_1.describe)('deleteRelationship', () => {
        (0, vitest_1.it)('runs DELETE on the matching relationship', async () => {
            await engine.deleteRelationship('a', 'b', types_1.RelationshipType.CONNECTS_TO);
            const [query, params] = mockWriteSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('DELETE rel');
            (0, vitest_1.expect)(query).toContain(':CONNECTS_TO');
            (0, vitest_1.expect)(params.from).toBe('a');
            (0, vitest_1.expect)(params.to).toBe('b');
        });
        (0, vitest_1.it)('closes the session after delete', async () => {
            await engine.deleteRelationship('a', 'b', types_1.RelationshipType.USES);
            (0, vitest_1.expect)(mockWriteSession.close).toHaveBeenCalledOnce();
        });
    });
    // ─── getRelationships ───────────────────────────────────────────────────────
    (0, vitest_1.describe)('getRelationships', () => {
        (0, vitest_1.it)('returns empty array when no relationships', async () => {
            const result = await engine.getRelationships('res-1');
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('maps records to Relationship objects', async () => {
            const fakeRecord = {
                get: (key) => {
                    const data = {
                        id: 'a:DEPENDS_ON:b',
                        type: 'DEPENDS_ON',
                        fromId: 'a',
                        toId: 'b',
                        properties: JSON.stringify({ weight: 2 }),
                    };
                    return data[key];
                },
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await engine.getRelationships('a');
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].type).toBe(types_1.RelationshipType.DEPENDS_ON);
            (0, vitest_1.expect)(result[0].properties).toEqual({ weight: 2 });
            (0, vitest_1.expect)(result[0].fromId).toBe('a');
            (0, vitest_1.expect)(result[0].toId).toBe('b');
        });
        (0, vitest_1.it)('handles null properties gracefully', async () => {
            const fakeRecord = {
                get: (key) => {
                    const data = {
                        id: 'a:USES:b', type: 'USES', fromId: 'a', toId: 'b', properties: null,
                    };
                    return data[key];
                },
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await engine.getRelationships('a');
            (0, vitest_1.expect)(result[0].properties).toEqual({});
        });
    });
    // ─── Circuit Breaker ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)('circuit breaker', () => {
        (0, vitest_1.it)('opens after 5 consecutive failures', async () => {
            mockWriteSession.run.mockRejectedValue(new Error('db down'));
            vitest_1.vi.spyOn(neo4j, 'getWriteSession').mockReturnValue(mockWriteSession);
            for (let i = 0; i < 5; i++) {
                await (0, vitest_1.expect)(engine.deleteResource('x')).rejects.toThrow();
            }
            await (0, vitest_1.expect)(engine.deleteResource('x')).rejects.toThrow('circuit breaker is OPEN');
        });
        (0, vitest_1.it)('allows calls through when circuit is closed', async () => {
            mockWriteSession.run.mockResolvedValue({ records: [] });
            await (0, vitest_1.expect)(engine.deleteResource('x')).resolves.toBeUndefined();
        });
        (0, vitest_1.it)('resets failure count on success', async () => {
            mockWriteSession.run
                .mockRejectedValueOnce(new Error('fail'))
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValueOnce({ records: [] });
            await (0, vitest_1.expect)(engine.deleteResource('x')).rejects.toThrow();
            await (0, vitest_1.expect)(engine.deleteResource('x')).rejects.toThrow();
            await (0, vitest_1.expect)(engine.deleteResource('x')).resolves.toBeUndefined();
            // After success, circuit should still be closed — next call should work
            mockWriteSession.run.mockResolvedValueOnce({ records: [] });
            await (0, vitest_1.expect)(engine.deleteResource('x')).resolves.toBeUndefined();
        });
        (0, vitest_1.it)('transitions to HALF_OPEN after recovery timeout and allows a call through', async () => {
            vitest_1.vi.useFakeTimers();
            mockWriteSession.run.mockRejectedValue(new Error('db down'));
            for (let i = 0; i < 5; i++) {
                await (0, vitest_1.expect)(engine.deleteResource('x')).rejects.toThrow();
            }
            // Advance past the 30s recovery timeout
            vitest_1.vi.advanceTimersByTime(31_000);
            // Next call should be allowed through (HALF_OPEN), not blocked by circuit breaker
            mockWriteSession.run.mockResolvedValueOnce({ records: [] });
            await (0, vitest_1.expect)(engine.deleteResource('x')).resolves.toBeUndefined();
            vitest_1.vi.useRealTimers();
        });
    });
    // ─── Retry Logic ─────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('retry logic', () => {
        (0, vitest_1.it)('retries on transient ServiceUnavailable error', async () => {
            const transientErr = Object.assign(new Error('ServiceUnavailable'), { code: 'ServiceUnavailable' });
            mockWriteSession.run
                .mockRejectedValueOnce(transientErr)
                .mockRejectedValueOnce(transientErr)
                .mockResolvedValueOnce({ records: [] });
            await (0, vitest_1.expect)(engine.createResource(makeResource())).resolves.toBeUndefined();
            (0, vitest_1.expect)(mockWriteSession.run).toHaveBeenCalledTimes(3);
        });
        (0, vitest_1.it)('retries on transient SessionExpired error', async () => {
            const transientErr = Object.assign(new Error('SessionExpired'), { code: 'SessionExpired' });
            mockWriteSession.run
                .mockRejectedValueOnce(transientErr)
                .mockResolvedValueOnce({ records: [] });
            await (0, vitest_1.expect)(engine.createResource(makeResource())).resolves.toBeUndefined();
            (0, vitest_1.expect)(mockWriteSession.run).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.it)('does not retry on non-transient errors', async () => {
            mockWriteSession.run.mockRejectedValue(new Error('ConstraintViolation'));
            await (0, vitest_1.expect)(engine.createResource(makeResource())).rejects.toThrow('ConstraintViolation');
            (0, vitest_1.expect)(mockWriteSession.run).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('throws after exhausting all retries on persistent transient error', async () => {
            const transientErr = Object.assign(new Error('ServiceUnavailable'), { code: 'ServiceUnavailable' });
            mockWriteSession.run.mockRejectedValue(transientErr);
            await (0, vitest_1.expect)(engine.createResource(makeResource())).rejects.toThrow('ServiceUnavailable');
            // 1 initial + 3 retries = 4 total attempts
            (0, vitest_1.expect)(mockWriteSession.run).toHaveBeenCalledTimes(4);
        });
    });
});
// ─── GraphQueryEngine Tests ───────────────────────────────────────────────────
(0, vitest_1.describe)('GraphQueryEngine', () => {
    let queryEngine;
    let mockReadSession;
    (0, vitest_1.beforeEach)(() => {
        queryEngine = new queries_1.GraphQueryEngine();
        mockReadSession = makeSession();
        vitest_1.vi.spyOn(neo4j, 'getReadSession').mockReturnValue(mockReadSession);
    });
    // ─── getDependencies ────────────────────────────────────────────────────────
    (0, vitest_1.describe)('getDependencies', () => {
        (0, vitest_1.it)('queries with default depth of 1', async () => {
            await queryEngine.getDependencies('res-1');
            const [query, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('DEPENDS_ON|USES|CONNECTS_TO*1..$depth');
            (0, vitest_1.expect)(params.id).toBe('res-1');
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(1);
        });
        (0, vitest_1.it)('queries with specified depth', async () => {
            await queryEngine.getDependencies('res-1', 2);
            const [, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(2);
        });
        (0, vitest_1.it)('caps depth at 3', async () => {
            await queryEngine.getDependencies('res-1', 10);
            const [, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(3);
        });
        (0, vitest_1.it)('enforces minimum depth of 1', async () => {
            await queryEngine.getDependencies('res-1', 0);
            const [, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(1);
        });
        (0, vitest_1.it)('maps returned records to Resource_Model', async () => {
            const fakeRecord = {
                get: (key) => key === 'dep'
                    ? {
                        id: 'dep-1', name: 'dep', type: types_1.ResourceType.DATABASE, provider: types_1.Provider.AWS,
                        state: types_1.ResourceState.RUNNING, tags: '{}', metadata: '{}',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                        discoveredAt: '2024-01-01T00:00:00.000Z',
                    }
                    : undefined,
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await queryEngine.getDependencies('res-1');
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].id).toBe('dep-1');
            (0, vitest_1.expect)(result[0].type).toBe(types_1.ResourceType.DATABASE);
        });
        (0, vitest_1.it)('returns empty array when no dependencies', async () => {
            const result = await queryEngine.getDependencies('isolated');
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    // ─── getDependents ──────────────────────────────────────────────────────────
    (0, vitest_1.describe)('getDependents', () => {
        (0, vitest_1.it)('queries with default depth of 1', async () => {
            await queryEngine.getDependents('res-1');
            const [query, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('DEPENDS_ON|USES|CONNECTS_TO*1..$depth');
            (0, vitest_1.expect)(params.id).toBe('res-1');
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(1);
        });
        (0, vitest_1.it)('uses reverse direction (dependents point TO the resource)', async () => {
            await queryEngine.getDependents('res-1');
            const [query] = mockReadSession.run.mock.calls[0];
            // dependents query: (dep)-[...]->(r {id})
            (0, vitest_1.expect)(query).toContain('->(r:Resource {id: $id})');
        });
        (0, vitest_1.it)('caps depth at 3', async () => {
            await queryEngine.getDependents('res-1', 99);
            const [, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(3);
        });
        (0, vitest_1.it)('maps returned records to Resource_Model', async () => {
            const fakeRecord = {
                get: (key) => key === 'dep'
                    ? {
                        id: 'caller-1', name: 'caller', type: types_1.ResourceType.SERVICE, provider: types_1.Provider.AWS,
                        state: types_1.ResourceState.RUNNING, tags: '{}', metadata: '{}',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                        discoveredAt: '2024-01-01T00:00:00.000Z',
                    }
                    : undefined,
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await queryEngine.getDependents('res-1');
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].id).toBe('caller-1');
        });
        (0, vitest_1.it)('returns empty array when no dependents', async () => {
            const result = await queryEngine.getDependents('leaf-node');
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    // ─── findUnusedResources ────────────────────────────────────────────────────
    (0, vitest_1.describe)('findUnusedResources', () => {
        (0, vitest_1.it)('queries for resources with no incoming relationships', async () => {
            await queryEngine.findUnusedResources();
            const [query] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('NOT ()-[:DEPENDS_ON|USES|CONNECTS_TO]->(r)');
        });
        (0, vitest_1.it)('returns mapped Resource_Model list', async () => {
            const fakeRecord = {
                get: (key) => key === 'r'
                    ? {
                        id: 'orphan-1', name: 'orphan', type: types_1.ResourceType.VOLUME, provider: types_1.Provider.DOCKER,
                        state: types_1.ResourceState.INACTIVE, tags: '{}', metadata: '{}',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                        discoveredAt: '2024-01-01T00:00:00.000Z',
                    }
                    : undefined,
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await queryEngine.findUnusedResources();
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].id).toBe('orphan-1');
        });
        (0, vitest_1.it)('returns empty array when all resources are used', async () => {
            const result = await queryEngine.findUnusedResources();
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    // ─── findCircularDependencies ────────────────────────────────────────────────
    (0, vitest_1.describe)('findCircularDependencies', () => {
        (0, vitest_1.it)('returns empty array when no cycles exist', async () => {
            const result = await queryEngine.findCircularDependencies();
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('returns cycles from APOC SCC when available', async () => {
            const fakeRecord = {
                get: (key) => key === 'nodeIds' ? ['a', 'b', 'c'] : undefined,
            };
            mockReadSession.run.mockResolvedValueOnce({ records: [fakeRecord] });
            const result = await queryEngine.findCircularDependencies();
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].nodes).toEqual(['a', 'b', 'c']);
            (0, vitest_1.expect)(result[0].edges).toEqual([]);
        });
        (0, vitest_1.it)('falls back to manual Cypher detection when APOC unavailable', async () => {
            // First call (APOC) throws, second call (manual) returns a cycle
            mockReadSession.run
                .mockRejectedValueOnce(new Error('APOC not available'))
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'nodeIds')
                                return ['x', 'y', 'x'];
                            if (key === 'edgeTypes')
                                return ['DEPENDS_ON', 'DEPENDS_ON'];
                            return undefined;
                        },
                    },
                ],
            });
            const result = await queryEngine.findCircularDependencies();
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].nodes).toEqual(['x', 'y', 'x']);
            (0, vitest_1.expect)(result[0].edges).toEqual(['DEPENDS_ON', 'DEPENDS_ON']);
        });
        (0, vitest_1.it)('deduplicates cycles in manual fallback', async () => {
            // Two records with same nodes (different order) should be deduplicated
            mockReadSession.run
                .mockRejectedValueOnce(new Error('APOC not available'))
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'nodeIds')
                                return ['a', 'b'];
                            if (key === 'edgeTypes')
                                return ['DEPENDS_ON'];
                            return undefined;
                        },
                    },
                    {
                        get: (key) => {
                            if (key === 'nodeIds')
                                return ['b', 'a'];
                            if (key === 'edgeTypes')
                                return ['DEPENDS_ON'];
                            return undefined;
                        },
                    },
                ],
            });
            const result = await queryEngine.findCircularDependencies();
            (0, vitest_1.expect)(result).toHaveLength(1);
        });
    });
    // ─── listResourcesPaged ─────────────────────────────────────────────────────
    (0, vitest_1.describe)('listResourcesPaged', () => {
        function makeCountRecord(total) {
            return { get: (key) => key === 'total' ? total : undefined };
        }
        function makeDataRecord(id, tags = {}) {
            const now = '2024-01-01T00:00:00.000Z';
            return {
                get: (key) => key === 'r'
                    ? {
                        id, name: id, type: types_1.ResourceType.COMPUTE, provider: types_1.Provider.AWS,
                        state: types_1.ResourceState.RUNNING, tags: JSON.stringify(tags), metadata: '{}',
                        createdAt: now, updatedAt: now, discoveredAt: now,
                    }
                    : undefined,
            };
        }
        (0, vitest_1.it)('returns paged results with total and hasMore', async () => {
            mockReadSession.run
                .mockResolvedValueOnce({ records: [makeCountRecord(10)] })
                .mockResolvedValueOnce({ records: [makeDataRecord('r1'), makeDataRecord('r2')] });
            const result = await queryEngine.listResourcesPaged(undefined, { limit: 2, offset: 0 });
            (0, vitest_1.expect)(result.items).toHaveLength(2);
            (0, vitest_1.expect)(result.total).toBe(10);
            (0, vitest_1.expect)(result.hasMore).toBe(true);
        });
        (0, vitest_1.it)('runs count and data queries serially on the same session', async () => {
            let activeRuns = 0;
            mockReadSession.run.mockImplementation(async (query) => {
                if (activeRuns > 0) {
                    throw new Error('session.run called concurrently');
                }
                activeRuns += 1;
                try {
                    await Promise.resolve();
                    if (query.includes('count(r)')) {
                        return { records: [makeCountRecord(1)] };
                    }
                    return { records: [makeDataRecord('r1')] };
                }
                finally {
                    activeRuns -= 1;
                }
            });
            const result = await queryEngine.listResourcesPaged(undefined, { limit: 1, offset: 0 });
            (0, vitest_1.expect)(result.items).toHaveLength(1);
            (0, vitest_1.expect)(result.total).toBe(1);
            (0, vitest_1.expect)(mockReadSession.run).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.it)('hasMore is false when all items returned', async () => {
            mockReadSession.run
                .mockResolvedValueOnce({ records: [makeCountRecord(2)] })
                .mockResolvedValueOnce({ records: [makeDataRecord('r1'), makeDataRecord('r2')] });
            const result = await queryEngine.listResourcesPaged(undefined, { limit: 50, offset: 0 });
            (0, vitest_1.expect)(result.hasMore).toBe(false);
        });
        (0, vitest_1.it)('applies type filter in query', async () => {
            mockReadSession.run
                .mockResolvedValueOnce({ records: [makeCountRecord(0)] })
                .mockResolvedValueOnce({ records: [] });
            await queryEngine.listResourcesPaged({ type: types_1.ResourceType.STORAGE });
            const [countQuery] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(countQuery).toContain('r.type = $type');
        });
        (0, vitest_1.it)('filters by tags in-memory after query', async () => {
            mockReadSession.run
                .mockResolvedValueOnce({ records: [makeCountRecord(2)] })
                .mockResolvedValueOnce({
                records: [
                    makeDataRecord('r1', { env: 'prod' }),
                    makeDataRecord('r2', { env: 'dev' }),
                ],
            });
            const result = await queryEngine.listResourcesPaged({ tags: { env: 'prod' } });
            (0, vitest_1.expect)(result.items).toHaveLength(1);
            (0, vitest_1.expect)(result.items[0].id).toBe('r1');
        });
        (0, vitest_1.it)('uses default limit of 50 and offset of 0', async () => {
            mockReadSession.run
                .mockResolvedValueOnce({ records: [makeCountRecord(0)] })
                .mockResolvedValueOnce({ records: [] });
            await queryEngine.listResourcesPaged();
            const [, params] = mockReadSession.run.mock.calls[1];
            (0, vitest_1.expect)(params.limit.toNumber()).toBe(50);
            (0, vitest_1.expect)(params.offset.toNumber()).toBe(0);
        });
        (0, vitest_1.it)('returns empty items and total 0 when no resources', async () => {
            mockReadSession.run
                .mockResolvedValueOnce({ records: [makeCountRecord(0)] })
                .mockResolvedValueOnce({ records: [] });
            const result = await queryEngine.listResourcesPaged();
            (0, vitest_1.expect)(result.items).toEqual([]);
            (0, vitest_1.expect)(result.total).toBe(0);
            (0, vitest_1.expect)(result.hasMore).toBe(false);
        });
    });
    // ─── listRelationships ─────────────────────────────────────────────────────
    (0, vitest_1.describe)('listRelationships', () => {
        (0, vitest_1.it)('runs the relationship query and maps records into typed relationships', async () => {
            mockReadSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            const data = {
                                id: 'res-1:DEPENDS_ON:res-2',
                                type: 'DEPENDS_ON',
                                fromId: 'res-1',
                                toId: 'res-2',
                                properties: JSON.stringify({ since: '2024-01-01T00:00:00.000Z' }),
                            };
                            return data[key];
                        },
                    },
                ],
            });
            const result = await queryEngine.listRelationships(25);
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0]).toEqual({
                id: 'res-1:DEPENDS_ON:res-2',
                type: types_1.RelationshipType.DEPENDS_ON,
                fromId: 'res-1',
                toId: 'res-2',
                properties: { since: '2024-01-01T00:00:00.000Z' },
            });
            const [query, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(query).toContain('MATCH (a:Resource)-[rel]->(b:Resource)');
            (0, vitest_1.expect)(query).toContain('LIMIT $limit');
            (0, vitest_1.expect)(params.limit.toNumber()).toBe(25);
        });
        (0, vitest_1.it)('clamps the limit to the safe upper bound', async () => {
            mockReadSession.run.mockResolvedValueOnce({ records: [] });
            await queryEngine.listRelationships(10_000);
            const [, params] = mockReadSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.limit.toNumber()).toBe(1000);
        });
    });
});
//# sourceMappingURL=engine.test.js.map