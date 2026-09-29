"use strict";
/**
 * Property 8: Transitive Dependency Resolution
 * Validates: Requirements 6.8
 *
 * For any chain A→B→C→D (3 levels deep):
 *   - getDependencies(A, 1) returns only B
 *   - getDependencies(A, 2) returns B and C
 *   - getDependencies(A, 3) returns B, C, and D
 */
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
const fc = __importStar(require("fast-check"));
const queries_1 = require("./queries");
const neo4j = __importStar(require("./neo4j"));
const types_1 = require("./types");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeResourceProps(id) {
    const now = '2024-01-01T00:00:00.000Z';
    return {
        id,
        name: `resource-${id}`,
        type: types_1.ResourceType.COMPUTE,
        provider: types_1.Provider.AWS,
        region: 'us-east-1',
        state: types_1.ResourceState.RUNNING,
        tags: '{}',
        metadata: '{}',
        createdAt: now,
        updatedAt: now,
        discoveredAt: now,
    };
}
function makeRecord(id) {
    const props = makeResourceProps(id);
    return {
        get: (key) => (key === 'dep' ? props : undefined),
    };
}
/**
 * Build a mock session that, given a depth parameter, returns the correct
 * subset of nodes from the chain A→B→C→D.
 *
 * The chain is: nodeIds[0] → nodeIds[1] → nodeIds[2] → nodeIds[3]
 * At depth d, getDependencies(nodeIds[0], d) should return nodeIds[1..d].
 */
function makeChainSession(nodeIds) {
    const [, b, c, d] = nodeIds;
    return {
        run: vitest_1.vi.fn().mockImplementation((_query, params) => {
            const depth = Number(params.depth);
            const results = [];
            if (depth >= 1)
                results.push(makeRecord(b));
            if (depth >= 2)
                results.push(makeRecord(c));
            if (depth >= 3)
                results.push(makeRecord(d));
            return Promise.resolve({ records: results });
        }),
        close: vitest_1.vi.fn().mockResolvedValue(undefined),
    };
}
// ─── Arbitraries ──────────────────────────────────────────────────────────────
/**
 * Generates 4 distinct resource IDs representing a linear chain A→B→C→D.
 */
const chainArb = fc
    .uniqueArray(fc.hexaString({ minLength: 4, maxLength: 8 }), { minLength: 4, maxLength: 4 })
    .map((ids) => ids);
// ─── Property Tests ───────────────────────────────────────────────────────────
(0, vitest_1.describe)('Property 8: Transitive Dependency Resolution', () => {
    let queryEngine;
    let mockSession;
    (0, vitest_1.beforeEach)(() => {
        queryEngine = new queries_1.GraphQueryEngine();
    });
    (0, vitest_1.it)('depth=1 returns only the direct dependency (B), not C or D', async () => {
        /**
         * Validates: Requirements 6.8
         * For any chain A→B→C→D, getDependencies(A, 1) must return exactly B.
         */
        await fc.assert(fc.asyncProperty(chainArb, async ([a, b, c, d]) => {
            mockSession = makeChainSession([a, b, c, d]);
            vitest_1.vi.spyOn(neo4j, 'getReadSession').mockReturnValue(mockSession);
            const result = await queryEngine.getDependencies(a, 1);
            const ids = result.map((r) => r.id);
            (0, vitest_1.expect)(ids).toContain(b);
            (0, vitest_1.expect)(ids).not.toContain(c);
            (0, vitest_1.expect)(ids).not.toContain(d);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('depth=2 returns B and C, but not D', async () => {
        /**
         * Validates: Requirements 6.8
         * For any chain A→B→C→D, getDependencies(A, 2) must return B and C but not D.
         */
        await fc.assert(fc.asyncProperty(chainArb, async ([a, b, c, d]) => {
            mockSession = makeChainSession([a, b, c, d]);
            vitest_1.vi.spyOn(neo4j, 'getReadSession').mockReturnValue(mockSession);
            const result = await queryEngine.getDependencies(a, 2);
            const ids = result.map((r) => r.id);
            (0, vitest_1.expect)(ids).toContain(b);
            (0, vitest_1.expect)(ids).toContain(c);
            (0, vitest_1.expect)(ids).not.toContain(d);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('depth=3 returns B, C, and D (full 3-level chain)', async () => {
        /**
         * Validates: Requirements 6.8
         * For any chain A→B→C→D, getDependencies(A, 3) must return B, C, and D.
         */
        await fc.assert(fc.asyncProperty(chainArb, async ([a, b, c, d]) => {
            mockSession = makeChainSession([a, b, c, d]);
            vitest_1.vi.spyOn(neo4j, 'getReadSession').mockReturnValue(mockSession);
            const result = await queryEngine.getDependencies(a, 3);
            const ids = result.map((r) => r.id);
            (0, vitest_1.expect)(ids).toContain(b);
            (0, vitest_1.expect)(ids).toContain(c);
            (0, vitest_1.expect)(ids).toContain(d);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('depth > MAX_DEPTH (3) is capped and still returns B, C, and D', async () => {
        /**
         * Validates: Requirements 6.8
         * Depth is capped at MAX_DEPTH=3, so any depth > 3 behaves like depth=3.
         */
        await fc.assert(fc.asyncProperty(chainArb, fc.integer({ min: 4, max: 100 }), async ([a, b, c, d], excessiveDepth) => {
            mockSession = makeChainSession([a, b, c, d]);
            vitest_1.vi.spyOn(neo4j, 'getReadSession').mockReturnValue(mockSession);
            const result = await queryEngine.getDependencies(a, excessiveDepth);
            const ids = result.map((r) => r.id);
            // Capped at 3 — same as depth=3
            (0, vitest_1.expect)(ids).toContain(b);
            (0, vitest_1.expect)(ids).toContain(c);
            (0, vitest_1.expect)(ids).toContain(d);
            // Verify the session was called with capped depth of 3
            const [, params] = mockSession.run.mock.calls[0];
            (0, vitest_1.expect)(params.depth.toNumber()).toBe(3);
        }), { numRuns: 50 });
    });
});
//# sourceMappingURL=transitive-deps.property.test.js.map