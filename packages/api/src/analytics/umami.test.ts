import { describe, expect, it } from 'vitest';

import { normalizeRealtime } from './umami.js';
import { localRealtimeFromLastEvent } from './service.js';

describe('normalizeRealtime', () => {
  it('maps the Umami realtime totals and url/country breakdowns', () => {
    const result = normalizeRealtime(
      {
        totals: { visitors: 4 },
        urls: { '/': 3, '/docs': 1 },
        countries: { CO: 4 },
      },
      undefined,
    );

    expect(result.visitors).toBe(4);
    expect(result.pages).toEqual([
      { label: '/', value: 3 },
      { label: '/docs', value: 1 },
    ]);
    expect(result.countries).toEqual([{ label: 'CO', value: 4 }]);
  });

  it('uses the active endpoint value when realtime is unavailable', () => {
    expect(normalizeRealtime(undefined, { value: 1 }).visitors).toBe(1);
  });

  it('keeps a recent accepted tracker event visible when upstream realtime is unavailable', () => {
    const now = Date.parse('2026-09-29T17:30:00.000Z');
    expect(localRealtimeFromLastEvent('2026-09-29T17:20:00.000Z', now).visitors).toBe(1);
    expect(localRealtimeFromLastEvent('2026-09-29T16:59:00.000Z', now).visitors).toBe(0);
  });
});
