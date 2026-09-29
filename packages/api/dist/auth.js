"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
exports.generateApiKey = generateApiKey;
exports.verifyApiKey = verifyApiKey;
exports.generateJwt = generateJwt;
exports.verifyJwt = verifyJwt;
exports.verifyBearerToken = verifyBearerToken;
exports.authenticate = authenticate;
exports.authorize = authorize;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const oidc_verify_1 = require("./middleware/oidc-verify");
const supabase_verify_1 = require("./middleware/supabase-verify");
const request_context_1 = require("./bootstrap/request-context");
// Permission model (Requirements 16.8, 17.8)
var Permission;
(function (Permission) {
    Permission["READ_RESOURCES"] = "READ_RESOURCES";
    Permission["WRITE_RESOURCES"] = "WRITE_RESOURCES";
    Permission["EXECUTE_ACTIONS"] = "EXECUTE_ACTIONS";
    Permission["MANAGE_DISCOVERY"] = "MANAGE_DISCOVERY";
    Permission["ADMIN"] = "ADMIN";
})(Permission || (exports.Permission = Permission = {}));
const MANAGED_ADMIN_GROUPS = new Set(['admin', 'admins', 'cig-admin', 'cig-admins']);
const LOCAL_SELF_HOSTED_SUBJECT = 'local-self-hosted';
const LOCAL_SELF_HOSTED_ROUTE_PREFIXES = [
    '/api/v1/chat',
    '/api/v1/resources',
    '/api/v1/relationships',
    '/api/v1/graph/snapshot',
    '/api/v1/costs',
    '/api/v1/security',
    '/api/v1/discovery/status',
    '/api/v1/analytics',
    '/api/v1/demo/status',
    '/api/v1/demo/snapshot',
];
// In-memory API key store: hashedKey -> entry
const apiKeyStore = new Map();
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = '24h';
// Generate a random API key and return both the plaintext key and its bcrypt hash
async function generateApiKey(permissions = [Permission.READ_RESOURCES]) {
    const key = `cig_${crypto_1.default.randomBytes(32).toString('hex')}`;
    const hashedKey = await bcryptjs_1.default.hash(key, BCRYPT_ROUNDS);
    apiKeyStore.set(hashedKey, { permissions });
    return { key, hashedKey };
}
// Verify a plaintext API key against a stored bcrypt hash
async function verifyApiKey(key, hashedKey) {
    return bcryptjs_1.default.compare(key, hashedKey);
}
// Generate a JWT token with 24h expiry
function generateJwt(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}
// Verify and decode a JWT token
function verifyJwt(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jsonwebtoken_1.default.verify(token, secret);
}
function permissionsFromManagedGroups(groups) {
    const normalizedGroups = groups.map((group) => group.toLowerCase());
    const permissions = [Permission.READ_RESOURCES];
    if (normalizedGroups.some((group) => MANAGED_ADMIN_GROUPS.has(group))) {
        permissions.push(Permission.WRITE_RESOURCES, Permission.EXECUTE_ACTIONS, Permission.MANAGE_DISCOVERY, Permission.ADMIN);
    }
    return [...new Set(permissions)];
}
function canVerifyManagedToken() {
    return Boolean(process.env.AUTHENTIK_JWKS_URI && process.env.OIDC_CLIENT_ID);
}
function canVerifySupabaseToken() {
    return Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
}
function permissionsFromSupabaseClaims(claims) {
    const permissions = [Permission.READ_RESOURCES];
    const role = claims.role?.toLowerCase() ?? '';
    const groups = Array.isArray(claims.appMetadata?.['groups'])
        ? claims.appMetadata?.['groups']
            .map((group) => (typeof group === 'string' ? group.toLowerCase() : ''))
            .filter(Boolean)
        : [];
    if (role === 'service_role'
        || role === 'admin'
        || groups.some((group) => MANAGED_ADMIN_GROUPS.has(group))) {
        permissions.push(Permission.WRITE_RESOURCES, Permission.EXECUTE_ACTIONS, Permission.MANAGE_DISCOVERY, Permission.ADMIN);
    }
    return [...new Set(permissions)];
}
function resolveRoutePath(request) {
    const routeOptions = request.routeOptions;
    const routerPath = request.routerPath;
    return routeOptions?.url ?? routerPath ?? request.url ?? '';
}
function isLocalSelfHostedBypassRoute(request) {
    const routePath = resolveRoutePath(request);
    if (!routePath) {
        return false;
    }
    return LOCAL_SELF_HOSTED_ROUTE_PREFIXES.some((prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`));
}
async function verifyBearerToken(token) {
    try {
        return verifyJwt(token);
    }
    catch (localError) {
        const managedMode = process.env.CIG_AUTH_MODE === 'managed';
        const canVerifyManaged = managedMode || canVerifyManagedToken();
        const canVerifySupabase = canVerifySupabaseToken();
        if (!canVerifyManaged && !canVerifySupabase) {
            throw localError;
        }
        if (canVerifyManaged) {
            try {
                const managedClaims = await (0, oidc_verify_1.verifyIdToken)(token);
                return {
                    sub: managedClaims.sub,
                    permissions: permissionsFromManagedGroups(managedClaims.groups),
                };
            }
            catch {
                // Try Supabase verification below before giving up.
            }
        }
        if (canVerifySupabase) {
            try {
                const supabaseClaims = await (0, supabase_verify_1.verifySupabaseAccessToken)(token);
                return {
                    sub: supabaseClaims.sub,
                    permissions: permissionsFromSupabaseClaims(supabaseClaims),
                };
            }
            catch {
                // Fall through and return the original local JWT error below.
            }
        }
        throw localError;
    }
}
// Fastify preHandler: authenticate via Bearer JWT or X-API-Key header
async function authenticate(request, reply) {
    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'];
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = await verifyBearerToken(token);
            request.user = payload;
            return;
        }
        catch {
            reply.status(401).send({ error: 'Invalid or expired JWT token', statusCode: 401 });
            return;
        }
    }
    if (apiKeyHeader) {
        // Check against all stored hashed keys
        for (const [hashedKey, entry] of apiKeyStore.entries()) {
            const valid = await verifyApiKey(apiKeyHeader, hashedKey);
            if (valid) {
                request.user = { sub: 'api-key', permissions: entry.permissions };
                return;
            }
        }
        reply.status(401).send({ error: 'Invalid API key', statusCode: 401 });
        return;
    }
    if (process.env.CIG_AUTH_MODE === 'self-hosted' &&
        (0, request_context_1.isLocalBrowserRequest)(request) &&
        isLocalSelfHostedBypassRoute(request)) {
        request.user = {
            sub: LOCAL_SELF_HOSTED_SUBJECT,
            permissions: [Permission.READ_RESOURCES],
        };
        return;
    }
    reply.status(401).send({ error: 'Authentication required', statusCode: 401 });
}
// Fastify preHandler factory: authorize based on required permissions
function authorize(requiredPermissions) {
    return async function (request, reply) {
        const user = request.user;
        if (!user) {
            reply.status(401).send({ error: 'Authentication required', statusCode: 401 });
            return;
        }
        const userPermissions = user.permissions ?? [];
        // ADMIN permission grants all access
        if (userPermissions.includes(Permission.ADMIN)) {
            return;
        }
        const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
        if (!hasAll) {
            reply.status(403).send({ error: 'Insufficient permissions', statusCode: 403 });
            return;
        }
    };
}
//# sourceMappingURL=auth.js.map