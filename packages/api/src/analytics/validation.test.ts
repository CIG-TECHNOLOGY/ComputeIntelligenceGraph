import { describe, expect, it } from 'vitest';

import {
  buildTrackerScript,
  normalizeDomain,
  isAllowedOrigin,
  validateSiteInput,
} from './validation.js';

describe('analytics validation', () => {
  it('normalizes a customer domain without protocol or paths', () => {
    expect(normalizeDomain('https://www.Example.com/path')).toBe('www.example.com');
  });

  it('rejects malformed domains and oversized names', () => {
    expect(validateSiteInput({ name: '', domain: 'example.com' })).toMatchObject({
      valid: false,
      field: 'name',
    });
    expect(validateSiteInput({ name: 'A site', domain: 'not a domain' })).toMatchObject({
      valid: false,
      field: 'domain',
    });
  });

  it('allows only the configured domain origins', () => {
    expect(isAllowedOrigin('https://example.com', 'example.com')).toBe(true);
    expect(isAllowedOrigin('https://www.example.com', 'example.com')).toBe(false);
    expect(isAllowedOrigin('null', 'example.com')).toBe(false);
  });

  it('generates a branded tracker that contains the public site id only', () => {
    const script = buildTrackerScript({
      siteId: 'site_public',
      collectorUrl: 'https://api.example.com/api/v1/analytics/collect',
    });

    expect(script).toContain('site_public');
    expect(script).toContain('api.example.com/api/v1/analytics/collect');
    expect(script).not.toContain('websiteId');
    expect(script).not.toContain('data-website-id');
  });
});
