import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { verifyIdToken } from './middleware/oidc-verify';
import { verifySupabaseAccessToken } from './middleware/supabase-verify';
import { isLocalBrowserRequest } from './bootstrap/request-context';

// Permission model (Requirements 16.8, 17.8)
export enum Permission {
  READ_RESOURCES = 'READ_RESOURCES',
  WRITE_RESOURCES = 'WRITE_RESOURCES',
  EXECUTE_ACTIONS = 'EXECUTE_ACTIONS',
  MANAGE_DISCOVERY = 'MANAGE_DISCOVERY',
  ADMIN = 'ADMIN',
}

export interface JwtPayload {
  sub: string;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

export interface ApiKeyEntry {
  permissions: Permission[];
}

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
const apiKeyStore = new Map<string, ApiKeyEntry>();

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = '24h';

// Generate a random API key and return both the plaintext key and its bcrypt hash
export async function generateApiKey(permissions: Permission[] = [Permission.READ_RESOURCES]): Promise<{ key: string; hashedKey: string }> {
  const key = `cig_${crypto.randomBytes(32).toString('hex')}`;
  const hashedKey = await bcrypt.hash(key, BCRYPT_ROUNDS);
  apiKeyStore.set(hashedKey, { permissions });
  return { key, hashedKey };
}

// Verify a plaintext API key against a stored bcrypt hash
export async function verifyApiKey(key: string, hashedKey: string): Promise<boolean> {
  return bcrypt.compare(key, hashedKey);
}

// Generate a JWT token with 24h expiry
export function generateJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

// Verify and decode a JWT token
export function verifyJwt(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.verify(token, secret) as JwtPayload;
}

function permissionsFromManagedGroups(groups: string[]): Permission[] {
  const normalizedGroups = groups.map((group) => group.toLowerCase());
  const permissions = [Permission.READ_RESOURCES];

  if (normalizedGroups.some((group) => MANAGED_ADMIN_GROUPS.has(group))) {
    permissions.push(
      Permission.WRITE_RESOURCES,
      Permission.EXECUTE_ACTIONS,
      Permission.MANAGE_DISCOVERY,
      Permission.ADMIN
    );
  }

  return [...new Set(permissions)];
}

function canVerifyManagedToken(): boolean {
  return Boolean(process.env.AUTHENTIK_JWKS_URI && process.env.OIDC_CLIENT_ID);
}

function canVerifySupabaseToken(): boolean {
  return Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function permissionsFromSupabaseClaims(claims: {
  role?: string;
  appMetadata?: Record<string, unknown>;
}): Permission[] {
  const permissions = [Permission.READ_RESOURCES];
  const role = claims.role?.toLowerCase() ?? '';
  const groups = Array.isArray(claims.appMetadata?.['groups'])
    ? claims.appMetadata?.['groups']
        .map((group) => (typeof group === 'string' ? group.toLowerCase() : ''))
        .filter(Boolean)
    : [];

  if (
    role === 'service_role'
    || role === 'admin'
    || groups.some((group) => MANAGED_ADMIN_GROUPS.has(group))
  ) {
    permissions.push(
      Permission.WRITE_RESOURCES,
      Permission.EXECUTE_ACTIONS,
      Permission.MANAGE_DISCOVERY,
      Permission.ADMIN
    );
  }

  return [...new Set(permissions)];
}

function resolveRoutePath(request: FastifyRequest): string {
  const routeOptions = request.routeOptions as { url?: string } | undefined;
  const routerPath = (request as FastifyRequest & { routerPath?: string }).routerPath;
  return routeOptions?.url ?? routerPath ?? request.url ?? '';
}

function isLocalSelfHostedBypassRoute(request: FastifyRequest): boolean {
  const routePath = resolveRoutePath(request);
  if (!routePath) {
    return false;
  }

  return LOCAL_SELF_HOSTED_ROUTE_PREFIXES.some(
    (prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`)
  );
}

export async function verifyBearerToken(token: string): Promise<JwtPayload> {
  try {
    return verifyJwt(token);
  } catch (localError) {
    const managedMode = process.env.CIG_AUTH_MODE === 'managed';
    const canVerifyManaged = managedMode || canVerifyManagedToken();
    const canVerifySupabase = canVerifySupabaseToken();

    if (!canVerifyManaged && !canVerifySupabase) {
      throw localError;
    }

    if (canVerifyManaged) {
      try {
        const managedClaims = await verifyIdToken(token);
        return {
          sub: managedClaims.sub,
          permissions: permissionsFromManagedGroups(managedClaims.groups),
        };
      } catch {
        // Try Supabase verification below before giving up.
      }
    }

    if (canVerifySupabase) {
      try {
        const supabaseClaims = await verifySupabaseAccessToken(token);
        return {
          sub: supabaseClaims.sub,
          permissions: permissionsFromSupabaseClaims(supabaseClaims),
        };
      } catch {
        // Fall through and return the original local JWT error below.
      }
    }

    throw localError;
  }
}

// Fastify preHandler: authenticate via Bearer JWT or X-API-Key header
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers['authorization'];
  const apiKeyHeader = request.headers['x-api-key'] as string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyBearerToken(token);
      (request as any).user = payload;
      return;
    } catch {
      reply.status(401).send({ error: 'Invalid or expired JWT token', statusCode: 401 });
      return;
    }
  }

  if (apiKeyHeader) {
    // Check against all stored hashed keys
    for (const [hashedKey, entry] of apiKeyStore.entries()) {
      const valid = await verifyApiKey(apiKeyHeader, hashedKey);
      if (valid) {
        (request as any).user = { sub: 'api-key', permissions: entry.permissions };
        return;
      }
    }
    reply.status(401).send({ error: 'Invalid API key', statusCode: 401 });
    return;
  }

  if (
    process.env.CIG_AUTH_MODE === 'self-hosted' &&
    isLocalBrowserRequest(request) &&
    isLocalSelfHostedBypassRoute(request)
  ) {
    (request as any).user = {
      sub: LOCAL_SELF_HOSTED_SUBJECT,
      permissions: [Permission.READ_RESOURCES],
    };
    return;
  }

  reply.status(401).send({ error: 'Authentication required', statusCode: 401 });
}

// Fastify preHandler factory: authorize based on required permissions
export function authorize(requiredPermissions: Permission[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = (request as any).user as JwtPayload | undefined;
    if (!user) {
      reply.status(401).send({ error: 'Authentication required', statusCode: 401 });
      return;
    }

    const userPermissions: Permission[] = user.permissions ?? [];

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
