import { describe, expect, it } from 'vitest';
import { resolveCorsOrigins } from './cors.js';

describe('resolveCorsOrigins', () => {
  it('accepts an explicit wildcard origin list', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: '*' })).toBe(true);
  });

  it('prefers CORS_ORIGINS when configured', () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGINS: 'https://app.example.com, https://cig.lat',
      })
    ).toEqual(['https://app.example.com', 'https://cig.lat']);
  });

  it('falls back to API_CORS_ORIGINS for older runtime wiring', () => {
    expect(
      resolveCorsOrigins({
        API_CORS_ORIGINS: 'https://dashboard.example.com',
      })
    ).toEqual(['https://dashboard.example.com']);
  });

  it('allows localhost dashboard origins in self-hosted mode', () => {
    expect(
      resolveCorsOrigins({
        CIG_AUTH_MODE: 'self-hosted',
        NODE_ENV: 'production',
      })
    ).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ]);
  });

  it('keeps production origins limited when no override is present', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'production' })).toEqual([
      'https://cig.lat',
      'https://www.cig.lat',
      'https://app.cig.lat',
      'https://edwardcalderon.github.io',
    ]);
  });
});
