/**
 * Device Authorization Grant endpoints (RFC 8628).
 *
 * Routes:
 *   POST /api/v1/auth/device/authorize  — generate device_code + user_code
 *   GET  /api/v1/auth/device/pending    — list pending device auth requests for authenticated user
 *   POST /api/v1/auth/device/poll       — poll for approval status
 *   POST /api/v1/auth/device/approve    — approve a pending device (Dashboard session required)
 *   POST /api/v1/auth/device/deny       — deny a pending device (Dashboard session required)
 *   POST /api/v1/auth/logout            — invalidate session token
 *
 * Requirement 12: API — Device Authorization Endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import fastifyRateLimit from 'fastify-rate-limit';
import { query } from '../db/client';
import { authenticate, generateJwt, Permission } from '../auth';
import { writeAuditEvent } from '../audit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVICE_CODE_EXPIRY_SECONDS = 900; // 15 minutes
const POLL_RATE_LIMIT_MS = 5_000; // 1 request per 5 seconds per device_code
const VERIFICATION_URI = process.env['VERIFICATION_URI'] ?? 'https://cig.technology/device';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a 32-character lowercase hex device_code. */
function generateDeviceCode(): string {
  return crypto.randomBytes(16).toString('hex'); // 16 bytes → 32 hex chars
}

/**
 * Generate an 8-character alphanumeric user_code.
 * Uses uppercase letters + digits for readability.
 */
function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

/** Return the client IP from the Fastify request. */
function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? request.ip;
  }
  return request.ip;
}

/**
 * Best-effort token revocation against Authentik.
 *
 * Keep this local to the API route so server startup does not depend on the
 * browser-oriented `@cig/auth` entrypoint, which is transpiler-dependent.
 */
async function revokeAuthentikToken(
  config: { issuerUrl: string; clientId: string; redirectUri?: string },
  token: string
): Promise<void> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    token,
  });

  await fetch(`${config.issuerUrl}/application/o/revoke/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    keepalive: true,
  }).catch(() => {
    // Ignore revocation errors — session will expire naturally.
  });
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function deviceAuthRoutes(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit as any, {
    global: false,
  } as any);

  // ── POST /api/v1/auth/device/authorize ─────────────────────────────────────
  // Requirement 12.1, 12.2
  app.post(
    '/api/v1/auth/device/authorize',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const deviceCode = generateDeviceCode();
      const userCode = generateUserCode();
      const ipAddress = getClientIp(request);
      const expiresAt = new Date(Date.now() + DEVICE_CODE_EXPIRY_SECONDS * 1000);

      try {
        await query(
          `INSERT INTO device_auth_records
             (device_code, user_code, ip_address, expires_at)
           VALUES (?, ?, ?, ?)`,
          [deviceCode, userCode, ipAddress, expiresAt.toISOString()]
        );
      } catch {
        // Retry with a fresh code on the (astronomically unlikely) collision
        const dc2 = generateDeviceCode();
        const uc2 = generateUserCode();
        await query(
          `INSERT INTO device_auth_records
             (device_code, user_code, ip_address, expires_at)
           VALUES (?, ?, ?, ?)`,
          [dc2, uc2, ipAddress, expiresAt.toISOString()]
        );
        writeAuditEvent(app, 'device_authorize_initiated', 'unknown', ipAddress, 'success', { user_code: uc2 });
        return reply.status(201).send({
          device_code: dc2,
          user_code: uc2,
          verification_uri: VERIFICATION_URI,
          expires_in: DEVICE_CODE_EXPIRY_SECONDS,
        });
      }

      writeAuditEvent(app, 'device_authorize_initiated', 'unknown', ipAddress, 'success', { user_code: userCode });
      return reply.status(201).send({
        device_code: deviceCode,
        user_code: userCode,
        verification_uri: VERIFICATION_URI,
        expires_in: DEVICE_CODE_EXPIRY_SECONDS,
      });
    }
  );

  // ── GET /api/v1/auth/device/pending ────────────────────────────────────────
  // List pending device auth requests for authenticated user
  app.get(
    '/api/v1/auth/device/pending',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user as { sub: string } | undefined;
      const userId = user?.sub ?? 'unknown';

      const result = await query<{
        device_code: string;
        user_code: string;
        ip_address: string;
        created_at: string;
        expires_at: string;
      }>(
        `SELECT device_code, user_code, ip_address, created_at, expires_at
           FROM device_auth_records
          WHERE user_id = ?
            AND status = 'pending'
            AND expires_at > ?
          ORDER BY created_at DESC`,
        [userId, new Date().toISOString()]
      );

      return reply.send({ items: result.rows, total: result.rowCount });
    }
  );

  // ── POST /api/v1/auth/device/poll ──────────────────────────────────────────
  // Requirement 12.3, 12.4, 12.7, 12.8
  app.post(
    '/api/v1/auth/device/poll',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { device_code?: string };
      const deviceCode = body?.device_code;

      if (!deviceCode) {
        return reply.status(400).send({
          error: 'Missing required field: device_code',
          code: 'missing_device_code',
          statusCode: 400,
        });
      }

      // Look up the record
      const result = await query<{
        device_code: string;
        status: string;
        expires_at: string;
        last_polled_at: string | null;
        access_token: string | null;
        refresh_token: string | null;
        session_id: string | null;
      }>(
        `SELECT device_code, status, expires_at, last_polled_at, access_token, refresh_token, session_id
           FROM device_auth_records
          WHERE device_code = ?`,
        [deviceCode]
      );

      const record = result.rows[0];

      // Unknown or expired device_code
      if (!record) {
        return reply.send({ status: 'expired' });
      }

      const now = Date.now();
      const expiresAt = new Date(record.expires_at).getTime();

      // Check expiry
      if (now > expiresAt) {
        // Mark as expired in DB (best-effort)
        query(
          `UPDATE device_auth_records SET status = 'expired' WHERE device_code = ?`,
          [deviceCode]
        ).catch(() => {/* ignore */});
        return reply.send({ status: 'expired' });
      }

      // Rate-limit: 1 req / 5s per device_code
      if (record.last_polled_at) {
        const lastPolled = new Date(record.last_polled_at).getTime();
        if (now - lastPolled < POLL_RATE_LIMIT_MS) {
          return reply.send({ status: 'slow_down' });
        }
      }

      // Update last_polled_at
      await query(
        `UPDATE device_auth_records SET last_polled_at = ? WHERE device_code = ?`,
        [new Date(now).toISOString(), deviceCode]
      );

      const status = record.status as 'pending' | 'approved' | 'denied' | 'expired';

      if (status === 'approved') {
        return reply.send({
          status: 'approved',
          access_token: record.access_token,
          refresh_token: record.refresh_token,
          session_id: record.session_id ?? undefined,
          token_type: 'Bearer',
        });
      }

      return reply.send({ status });
    }
  );

  // ── POST /api/v1/auth/device/approve ───────────────────────────────────────
  // Requirement 12.5 — requires authenticated Dashboard session
  app.post(
    '/api/v1/auth/device/approve',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { user_code?: string };
      const userCode = body?.user_code;
      const ipAddress = getClientIp(request);

      if (!userCode) {
        return reply.status(400).send({
          error: 'Missing required field: user_code',
          code: 'missing_user_code',
          statusCode: 400,
        });
      }

      const user = (request as any).user as { sub: string } | undefined;
      const userId = user?.sub ?? 'unknown';

      const pendingRecord = await query<{ device_code: string }>(
        `SELECT device_code
           FROM device_auth_records
          WHERE user_code = ?
            AND status = 'pending'
            AND expires_at > ?`,
        [userCode, new Date().toISOString()]
      );

      if (pendingRecord.rowCount === 0) {
        writeAuditEvent(app, 'device_approved', userId, ipAddress, 'failure', { user_code: userCode });
        return reply.status(404).send({
          error: 'Device not found, already processed, or expired',
          code: 'device_not_found',
          statusCode: 404,
        });
      }

      // Device sessions must receive JWTs because the rest of the API authenticates Bearer JWTs.
      const accessToken = generateJwt({
        sub: userId,
        permissions: [Permission.READ_RESOURCES],
      });
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

      const result = await query(
        `UPDATE device_auth_records
            SET status = 'approved',
                user_id = ?,
                access_token = ?,
                refresh_token = ?
          WHERE user_code = ?
            AND status = 'pending'
            AND expires_at > ?`,
        [userId, accessToken, refreshToken, userCode, new Date().toISOString()]
      );

      if (result.rowCount === 0) {
        writeAuditEvent(app, 'device_approved', userId, ipAddress, 'failure', { user_code: userCode });
        return reply.status(404).send({
          error: 'Device not found, already processed, or expired',
          code: 'device_not_found',
          statusCode: 404,
        });
      }

      // Persist device session for Dashboard management
      const sessionId = crypto.randomUUID();
      const body2 = request.body as { user_code?: string; device_name?: string; device_os?: string; device_arch?: string };
      await query(
        `INSERT INTO device_sessions
           (id, user_id, device_code, device_name, device_os, device_arch, ip_address, token_hash, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', '{}')`,
        [
          sessionId,
          userId,
          pendingRecord.rows[0]!.device_code,
          body2.device_name ?? null,
          body2.device_os ?? null,
          body2.device_arch ?? null,
          ipAddress,
          tokenHash,
        ]
      ).catch((err) => {
        app.log.warn({ err }, 'Failed to persist device session (table may not exist)');
      });

      // Store session_id in the device_auth_record for poll retrieval
      await query(
        `UPDATE device_auth_records SET session_id = ? WHERE user_code = ? AND status = 'approved'`,
        [sessionId, userCode]
      ).catch((err) => {
        app.log.warn({ err }, 'Failed to store session_id in device_auth_record');
      });

      writeAuditEvent(app, 'device_approved', userId, ipAddress, 'success', { user_code: userCode });
      return reply.send({ success: true });
    }
  );

  // ── POST /api/v1/auth/device/deny ──────────────────────────────────────────
  // Requirement 12.6 — requires authenticated Dashboard session
  app.post(
    '/api/v1/auth/device/deny',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { user_code?: string };
      const userCode = body?.user_code;
      const ipAddress = getClientIp(request);

      if (!userCode) {
        return reply.status(400).send({
          error: 'Missing required field: user_code',
          code: 'missing_user_code',
          statusCode: 400,
        });
      }

      const user = (request as any).user as { sub: string } | undefined;
      const userId = user?.sub ?? 'unknown';

      const result = await query(
        `UPDATE device_auth_records
            SET status = 'denied'
          WHERE user_code = ?
            AND status = 'pending'
            AND expires_at > ?`,
        [userCode, new Date().toISOString()]
      );

      if (result.rowCount === 0) {
        writeAuditEvent(app, 'device_denied', userId, ipAddress, 'failure', { user_code: userCode });
        return reply.status(404).send({
          error: 'Device not found, already processed, or expired',
          code: 'device_not_found',
          statusCode: 404,
        });
      }

      writeAuditEvent(app, 'device_denied', userId, ipAddress, 'success', { user_code: userCode });
      return reply.send({ success: true });
    }
  );

  // ── POST /api/v1/auth/logout ───────────────────────────────────────────────
  // Requirement 12.9 — invalidate session token
  app.post(
    '/api/v1/auth/logout',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers['authorization'];
      const ipAddress = getClientIp(request);
      const userId = 'unknown';

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);

        // Mark any device_auth_record whose access_token matches as expired
        await query(
          `UPDATE device_auth_records
              SET status = 'expired'
            WHERE access_token = ?`,
          [token]
        ).catch(() => {/* ignore — best effort */});

        // Revoke token at Authentik when running in managed mode
        if (process.env['CIG_AUTH_MODE'] === 'managed') {
          const issuerUrl = process.env['AUTHENTIK_ISSUER_URL'] ?? '';
          const clientId = process.env['OIDC_CLIENT_ID'] ?? '';
          const redirectUri = process.env['OIDC_REDIRECT_URI'] ?? '';
          if (issuerUrl && clientId) {
            await revokeAuthentikToken({ issuerUrl, clientId, redirectUri }, token);
          }
        }

        // Also revoke any device_sessions matching this token hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await query(
          `UPDATE device_sessions
              SET status = 'revoked', revoked_at = ?
            WHERE token_hash = ? AND status = 'active'`,
          [new Date().toISOString(), tokenHash]
        ).catch(() => {/* ignore — best effort */});
      }

      writeAuditEvent(app, 'logout', userId, ipAddress, 'success');
      return reply.send({ success: true });
    }
  );

  // ── POST /api/v1/auth/refresh ──────────────────────────────────────────────
  // Requirement 12.10 — refresh access token from refresh token
  app.post(
    '/api/v1/auth/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { refresh_token?: string };
      const refreshToken = body?.refresh_token;
      const ipAddress = getClientIp(request);

      if (!refreshToken) {
        return reply.status(400).send({
          error: 'Missing required field: refresh_token',
          code: 'missing_refresh_token',
          statusCode: 400,
        });
      }

      // Managed mode: refresh against Authentik directly
      if (process.env['CIG_AUTH_MODE'] === 'managed') {
        try {
          const tokenEndpoint = process.env['AUTHENTIK_TOKEN_ENDPOINT'] ?? '';
          const clientId = process.env['OIDC_CLIENT_ID'] ?? '';
          const clientSecret = process.env['OIDC_CLIENT_SECRET'] ?? '';

          if (!tokenEndpoint || !clientId || !clientSecret) {
            throw new Error('Managed refresh is not configured');
          }

          const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          });

          const refreshResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });

          if (!refreshResponse.ok) {
            writeAuditEvent(app, 'token_refresh', 'unknown', ipAddress, 'failure', {
              reason: 'upstream_refresh_rejected',
              status: refreshResponse.status,
            });
            return reply.status(401).send({
              error: 'Invalid or expired refresh token',
              code: 'refresh_token_invalid',
              statusCode: 401,
            });
          }

          const refreshed = await refreshResponse.json() as {
            access_token: string;
            refresh_token?: string;
            token_type?: string;
            expires_in?: number;
          };

          writeAuditEvent(app, 'token_refresh', 'unknown', ipAddress, 'success', { mode: 'managed' });
          return reply.send({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? refreshToken,
            token_type: refreshed.token_type ?? 'Bearer',
            expires_in: refreshed.expires_in ?? 3600,
          });
        } catch {
          writeAuditEvent(app, 'token_refresh', 'unknown', ipAddress, 'failure', { reason: 'managed_refresh_error' });
          return reply.status(500).send({
            error: 'Failed to refresh token',
            code: 'refresh_failed',
            statusCode: 500,
          });
        }
      }

      // Self-hosted mode: refresh local sessions (web refresh_tokens or device_auth_records).
      const refreshTokenRecord = await query<{ user_id: string }>(
        `SELECT user_id
           FROM refresh_tokens
          WHERE token = ?
            AND expires_at > ?`,
        [refreshToken, new Date().toISOString()]
      ).catch(() => ({ rows: [], rowCount: 0 }));

      const deviceTokenRecord = await query<{ user_id: string }>(
        `SELECT user_id
           FROM device_auth_records
          WHERE refresh_token = ?
            AND status = 'approved'
            AND expires_at > ?`,
        [refreshToken, new Date().toISOString()]
      ).catch(() => ({ rows: [], rowCount: 0 }));

      const userId = refreshTokenRecord.rows[0]?.user_id ?? deviceTokenRecord.rows[0]?.user_id;
      if (!userId) {
        writeAuditEvent(app, 'token_refresh', 'unknown', ipAddress, 'failure', { reason: 'refresh_token_not_found' });
        return reply.status(401).send({
          error: 'Invalid or expired refresh token',
          code: 'refresh_token_invalid',
          statusCode: 401,
        });
      }

      const newAccessToken = generateJwt({
        sub: userId,
        permissions: [Permission.READ_RESOURCES],
      });
      const newRefreshToken = crypto.randomBytes(32).toString('hex');

      if (refreshTokenRecord.rows.length > 0) {
        await query(
          `UPDATE refresh_tokens
              SET token = ?
            WHERE token = ?`,
          [newRefreshToken, refreshToken]
        );
      }

      if (deviceTokenRecord.rows.length > 0) {
        await query(
          `UPDATE device_auth_records
              SET access_token = ?, refresh_token = ?
            WHERE refresh_token = ?`,
          [newAccessToken, newRefreshToken, refreshToken]
        );
      }

      writeAuditEvent(app, 'token_refresh', userId, ipAddress, 'success', { mode: 'self-hosted' });
      return reply.send({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 86400,
      });
    }
  );
}
