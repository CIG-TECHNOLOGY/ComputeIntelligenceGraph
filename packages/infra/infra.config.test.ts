import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadApiStackConfig, secretArns } from './infra.config.js';

const originalEnv = { ...process.env };
const originalApp = (globalThis as typeof globalThis & {
  $app?: { stage: string; name: string };
}).$app;

beforeEach(() => {
  process.env = { ...originalEnv };
  (globalThis as typeof globalThis & {
    $app?: { stage: string; name: string };
  }).$app = {
    stage: 'production',
    name: 'cig-api',
  };

  process.env.AWS_REGION = 'us-east-2';
  process.env.API_DOMAIN = 'api.cig.technology';
  process.env.API_IMAGE_REPOSITORY = 'cig-api-production';
  process.env.API_VPC_ID = 'vpc-123';
  process.env.API_PUBLIC_SUBNET_IDS = 'subnet-public-a,subnet-public-b';
  process.env.API_PRIVATE_SUBNET_IDS = 'subnet-private-a,subnet-private-b';
  process.env.API_ALB_SECURITY_GROUP_ID = 'sg-alb';
  process.env.API_SECURITY_GROUP_IDS = 'sg-api';
  process.env.API_DATABASE_URL_SECRET_ARN = 'arn:aws:secretsmanager:::db';
  process.env.API_JWT_SECRET_ARN = 'arn:aws:secretsmanager:::jwt';
  process.env.API_NEO4J_BOLT_URI = 'bolt://10.0.2.10:7687';
  process.env.API_NEO4J_PASSWORD_SECRET_ARN = 'arn:aws:secretsmanager:::neo4j';
  process.env.API_AUTHENTIK_ISSUER_URL_SECRET_ARN = 'arn:aws:secretsmanager:::issuer';
  process.env.API_AUTHENTIK_JWKS_URI_SECRET_ARN = 'arn:aws:secretsmanager:::jwks';
  process.env.API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN = 'arn:aws:secretsmanager:::token';
  process.env.API_OIDC_CLIENT_ID_SECRET_ARN = 'arn:aws:secretsmanager:::client-id';
  process.env.API_OIDC_CLIENT_SECRET_SECRET_ARN = 'arn:aws:secretsmanager:::client-secret';
  process.env.API_OPENAI_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:::openai-key';
  process.env.API_CORS_ORIGINS = 'https://app.cig.lat';
  process.env.API_SMTP_HOST = 'mail.example.com';
  process.env.API_SMTP_PORT = '587';
  process.env.API_SMTP_SECURE = 'true';
  process.env.API_SMTP_FROM_EMAIL = 'smtp-login@example.com';
  process.env.API_SMTP_AUTH_ENABLED = 'true';
  process.env.API_SMTP_USER = 'smtp-login@example.com';
  process.env.API_SMTP_OTP_SUBJECT = 'Your one-time code';
  process.env.API_SMTP_PASSWORD_SECRET_ARN = 'arn:aws:secretsmanager:::smtp-password';
  process.env.UMAMI_API_URL = 'https://umami.example.com';
  process.env.API_UMAMI_API_TOKEN_SECRET_ARN = 'arn:aws:secretsmanager:::umami-token';
});

afterEach(() => {
  process.env = originalEnv;
  (globalThis as typeof globalThis & {
    $app?: { stage: string; name: string };
  }).$app = originalApp;
});

describe('infra config', () => {
  it('loads SMTP runtime config into the API stack and includes the password secret', () => {
    const config = loadApiStackConfig();

    expect(config.smtpHost).toBe('mail.example.com');
    expect(config.smtpPort).toBe(587);
    expect(config.smtpSecure).toBe(true);
    expect(config.smtpFromEmail).toBe('smtp-login@example.com');
    expect(config.smtpAuthEnabled).toBe(true);
    expect(config.smtpUser).toBe('smtp-login@example.com');
    expect(config.smtpOtpSubject).toBe('Your one-time code');
    expect(config.smtpPasswordSecretArn).toBe('arn:aws:secretsmanager:::smtp-password');
    expect(config.umamiApiUrl).toBe('https://umami.example.com');
    expect(config.umamiApiTokenSecretArn).toBe('arn:aws:secretsmanager:::umami-token');
    expect(secretArns(config)).toContain('arn:aws:secretsmanager:::smtp-password');
    expect(secretArns(config)).toContain('arn:aws:secretsmanager:::umami-token');
  });
});
