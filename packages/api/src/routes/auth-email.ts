/**
 * Custom endpoints for sending OTP-only and magic-link-only emails.
 *
 * POST /api/v1/auth/send-otp        — send OTP code email
 * POST /api/v1/auth/send-magic-link — send magic link email
 * POST /api/v1/auth/verify-otp      — verify OTP code and issue local email session
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import nodemailer, { type Transporter } from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { query, withTransaction } from '../db/client';
import { Permission } from '../auth';

let supabaseClient: SupabaseClient | null = null;
let smtpTransport: Transporter | null = null;
let otpTemplatePromise: Promise<string> | null = null;

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_BCRYPT_ROUNDS = 10;
const EMAIL_SESSION_EXPIRY_SECONDS = 24 * 60 * 60;

interface AuthEmailBody {
  email?: string;
}

interface VerifyOtpBody extends AuthEmailBody {
  token?: string;
}

interface OtpChallengeRow {
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: Date | string;
  consumed_at: Date | string | null;
}

interface EmailSessionClaims {
  sub: string;
  email: string;
  name: string;
  provider: 'email';
  permissions: Permission[];
}

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

function getEmailRedirectTo(): string {
  const configured = process.env.SUPABASE_EMAIL_REDIRECT_TO ?? process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO;
  if (configured) {
    return configured;
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL
    ?? (process.env.NODE_ENV === 'production' ? 'https://app.cig.technology' : 'http://localhost:3001');
  return new URL('/auth/callback', dashboardUrl).toString();
}

const emailSchema = z.string().trim().email();

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.toLowerCase();
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const token = value.trim();
  return token.length > 0 ? token : null;
}

function getOtpTemplatePath(): string {
  // The template is copied into dist/emails/ by the build script (copy-migrations.mjs).
  // This path works both in the monorepo dev environment and in the production container.
  const candidates = [
    path.resolve(__dirname, '../emails/otp-only.html'),
    path.resolve(__dirname, '../../../../packages/emails/src/templates/otp-only.html'),
  ];

  const templatePath = candidates.find((candidate) => existsSync(candidate));
  if (!templatePath) {
    throw new Error(`OTP email template not found. Looked in: ${candidates.join(', ')}`);
  }

  return templatePath;
}

async function getOtpTemplateHtml(): Promise<string> {
  if (!otpTemplatePromise) {
    otpTemplatePromise = readFile(getOtpTemplatePath(), 'utf8');
  }

  return otpTemplatePromise;
}

function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function getSmtpTransport(): Transporter {
  if (smtpTransport) {
    return smtpTransport;
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  let secure = secureEnv === 'true' || (secureEnv !== 'false' && port === 465);
  const requireTLS = (process.env.SMTP_REQUIRE_TLS ?? 'true').toLowerCase() !== 'false';
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  const authEnabled = (process.env.SMTP_AUTH_ENABLED ?? 'true').toLowerCase() !== 'false';
  const user = process.env.SMTP_USER?.trim() || fromEmail;
  const password = process.env.SMTP_PASSWORD?.trim();

  if (port === 587 && secure) {
    // Port 587 is usually STARTTLS (explicit TLS), not implicit TLS.
    // nodemailer expects secure=false and then starts TLS (requireTLS=true).
    secure = false;
  }


  if (!host || !fromEmail) {
    throw new Error('SMTP credentials not configured (SMTP_HOST / SMTP_FROM_EMAIL)');
  }

  if (authEnabled && !password) {
    throw new Error('SMTP credentials not configured (SMTP_PASSWORD)');
  }

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: authEnabled
      ? {
          user,
          pass: password,
        }
      : undefined,
    tls: {
      // Prefer TLS where supported and avoid obsolete/weak protocols.
      rejectUnauthorized: (process.env.SMTP_TLS_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false',
    },
    ...(secure ? {} : { requireTLS }),
  });

  return smtpTransport;
}

export function buildEmailSessionClaims(email: string): EmailSessionClaims {
  return {
    sub: email,
    email,
    name: email.split('@')[0] ?? email,
    provider: 'email',
    permissions: [Permission.READ_RESOURCES],
  };
}

export function issueEmailSessionToken(email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(buildEmailSessionClaims(email), secret, {
    expiresIn: EMAIL_SESSION_EXPIRY_SECONDS,
  });
}

function getEmailOtpQueries() {
  return {
    upsert:
      'INSERT INTO email_otp_challenges (email, code_hash, attempts, expires_at, consumed_at, created_at, updated_at) VALUES (?, ?, 0, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at, consumed_at = NULL, updated_at = CURRENT_TIMESTAMP',
    select:
      'SELECT email, code_hash, attempts, expires_at, consumed_at FROM email_otp_challenges WHERE email = ?',
    consume:
      'UPDATE email_otp_challenges SET consumed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
    failAttempt:
      'UPDATE email_otp_challenges SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
    deleteExpired:
      'DELETE FROM email_otp_challenges WHERE email = ?',
  };
}

async function storeOtpChallenge(email: string, otpCode: string): Promise<void> {
  const codeHash = await bcrypt.hash(otpCode, OTP_BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const { upsert } = getEmailOtpQueries();
  await query(upsert, [email, codeHash, expiresAt.toISOString()]);
}

async function sendOtpViaSmtp(email: string, otpCode: string): Promise<void> {
  const transport = getSmtpTransport();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'CIG';
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  const subject = process.env.SMTP_OTP_SUBJECT?.trim() || 'Your CIG one-time code';
  const htmlTemplate = await getOtpTemplateHtml();
  const html = htmlTemplate.replace(/\{\{\s*otp_code\s*\}\}/g, otpCode);

  await transport.sendMail({
    from: {
      name: fromName,
      address: fromEmail!,
    },
    to: email,
    subject,
    html,
    text: `CIG - Computer Intelligence Graph

Your One-Time Passcode

Enter this code to verify your identity and sign in:

${otpCode}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.
Never share this code with anyone. CIG staff will never ask for it.

© 2026 CIG - Computer Intelligence Graph
`,
  });
}

async function sendMagicLinkViaSupabase(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getEmailRedirectTo(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function sendOtpEmail(email: string): Promise<void> {
  const otpCode = generateOtpCode();
  await storeOtpChallenge(email, otpCode);
  await sendOtpViaSmtp(email, otpCode);
}

async function verifyEmailOtpChallenge(email: string, token: string): Promise<{ accessToken: string; expiresIn: number; socialProvider: 'email' }> {
  const normalizedEmail = email.toLowerCase();
  const { select, consume, failAttempt, deleteExpired } = getEmailOtpQueries();

  return withTransaction(async (txQuery) => {
    const result = await txQuery<OtpChallengeRow>(select, [normalizedEmail]);
    const challenge = result.rows[0];

    if (!challenge) {
      throw new Error('Invalid or expired code');
    }

    const expiresAt = new Date(challenge.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      await txQuery(deleteExpired, [normalizedEmail]);
      throw new Error('Invalid or expired code');
    }

    if (challenge.consumed_at) {
      throw new Error('Invalid or expired code');
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    const isValid = await bcrypt.compare(token, challenge.code_hash);
    if (!isValid) {
      await txQuery(failAttempt, [normalizedEmail]);
      throw new Error('Invalid or expired code');
    }

    await txQuery(consume, [normalizedEmail]);

    return {
      accessToken: issueEmailSessionToken(normalizedEmail),
      expiresIn: EMAIL_SESSION_EXPIRY_SECONDS,
      socialProvider: 'email',
    };
  });
}

type AuthEmailAction = 'otp' | 'magic-link';

function createEmailSendHandler(
  app: FastifyInstance,
  action: AuthEmailAction,
  send: (email: string) => Promise<void>
) {
  const successMessage = action === 'otp' ? 'OTP email sent' : 'Magic link email sent';
  const errorMessage = action === 'otp' ? 'Failed to send OTP email' : 'Failed to send magic link email';
  const errorCode = action === 'otp' ? 'otp_send_failed' : 'magic_link_send_failed';

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const email = normalizeEmail((request.body as AuthEmailBody | undefined)?.email);
    if (!email) {
      return reply.status(400).send({ error: 'Missing or invalid email' });
    }

    try {
      await send(email);
      return reply.send({ success: true, message: successMessage });
    } catch (err) {
      app.log.error({ err, email }, errorMessage);
      return reply.status(502).send({
        error: errorMessage,
        code: errorCode,
        statusCode: 502,
      });
    }
  };
}

export async function authEmailRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/send-otp', createEmailSendHandler(app, 'otp', sendOtpEmail));

  app.post('/api/v1/auth/send-magic-link', createEmailSendHandler(app, 'magic-link', sendMagicLinkViaSupabase));

  app.post('/api/v1/auth/verify-otp', async (request: FastifyRequest, reply: FastifyReply) => {
    const email = normalizeEmail((request.body as VerifyOtpBody | undefined)?.email);
    const token = normalizeToken((request.body as VerifyOtpBody | undefined)?.token);

    if (!email || !token) {
      return reply.status(400).send({ error: 'Missing or invalid email or token' });
    }

    try {
      const result = await verifyEmailOtpChallenge(email, token);
      return reply.send({
        success: true,
        message: 'OTP verified',
        ...result,
      });
    } catch (err) {
      app.log.error({ err, email }, 'Failed to verify OTP');
      return reply.status(401).send({
        error: err instanceof Error ? err.message : 'Invalid or expired code',
        code: 'otp_verify_failed',
        statusCode: 401,
      });
    }
  });
}
