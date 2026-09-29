import { describe, expect, it } from 'vitest';

import { createSiteId } from './site-id';

describe('createSiteId', () => {
  it('creates an opaque public identifier from the supplied random bytes', () => {
    const id = createSiteId(() => Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));

    expect(id).toBe('site_AQIDBAUGBwgJCgsM');
  });

  it('uses the site prefix and URL-safe random payload', () => {
    const id = createSiteId(() => Buffer.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]));

    expect(id).toMatch(/^site_[A-Za-z0-9_-]{16}$/);
  });

  it('rejects an entropy source that returns too few bytes', () => {
    expect(() => createSiteId(() => Buffer.alloc(11))).toThrow(
      'Site identifier entropy source must return 12 bytes',
    );
  });
});
