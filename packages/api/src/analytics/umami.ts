import { randomUUID } from 'node:crypto';

export interface UmamiWebsiteInput {
  name: string;
  domain: string;
}

export interface UmamiProvisioner {
  findWebsite?(input: UmamiWebsiteInput): Promise<{ websiteId: string } | null>;
  createWebsite(input: UmamiWebsiteInput): Promise<{ websiteId: string }>;
  updateWebsite(websiteId: string, input: UmamiWebsiteInput): Promise<void>;
  deleteWebsite(websiteId: string): Promise<void>;
  collect(websiteId: string, payload: Record<string, unknown>): Promise<void>;
  getInsights?(websiteId: string, startAt: number, endAt: number): Promise<UmamiInsights>;
}

export interface UmamiBreakdown {
  label: string;
  value: number;
}

export interface UmamiInsights {
  totals: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
  series: Array<{ date: string; pageviews: number; visitors: number }>;
  countries: UmamiBreakdown[];
  pages: UmamiBreakdown[];
  realtime: {
    visitors: number;
    countries: UmamiBreakdown[];
    pages: UmamiBreakdown[];
    updatedAt: string;
  };
}

const emptyInsights = (): UmamiInsights => ({
  totals: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 },
  series: [],
  countries: [],
  pages: [],
  realtime: { visitors: 0, countries: [], pages: [], updatedAt: new Date().toISOString() },
});

type RealtimeRecord = Record<string, unknown>;

function asRecord(value: unknown): RealtimeRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as RealtimeRecord;
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as RealtimeRecord;
  for (const key of ['visitors', 'value', 'count', 'active', 'total']) {
    const candidate = record[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }
  return undefined;
}

function breakdownRows(value: unknown): UmamiBreakdown[] {
  const record = asRecord(value);
  const data = Object.keys(record).length === 1 && 'data' in record ? record.data : value;
  if (Array.isArray(data)) {
    return data.map((row) => {
      const item = asRecord(row);
      return {
        label: String(item.x ?? item.name ?? item.label ?? item.country ?? 'Unknown'),
        value: Number(item.y ?? item.value ?? item.count ?? 0),
      };
    }).filter((row) => Number.isFinite(row.value) && row.value > 0);
  }
  if (data && typeof data === 'object') {
    return Object.entries(data as RealtimeRecord).map(([label, value]) => ({ label, value: Number(value) }))
      .filter((row) => Number.isFinite(row.value) && row.value > 0);
  }
  return [];
}

/** Normalize the several realtime response shapes used by Umami versions. */
export function normalizeRealtime(realtime: unknown, active: unknown): UmamiInsights['realtime'] {
  const record = asRecord(realtime);
  const totals = asRecord(record.totals);
  const data = asRecord(record.data);
  const visitors = numericValue(record.visitors)
    ?? numericValue(totals.visitors)
    ?? numericValue(data.visitors)
    ?? numericValue(record.count)
    ?? numericValue(active)
    ?? 0;

  return {
    visitors,
    countries: breakdownRows(record.countries ?? data.countries),
    pages: breakdownRows(record.pages ?? record.paths ?? record.urls ?? data.pages ?? data.urls),
    updatedAt: new Date().toISOString(),
  };
}

class LocalUmamiProvisioner implements UmamiProvisioner {
  async findWebsite(input: UmamiWebsiteInput): Promise<{ websiteId: string } | null> {
    void input;
    return null;
  }

  async createWebsite(input: UmamiWebsiteInput): Promise<{ websiteId: string }> {
    void input;
    return { websiteId: `local_${randomUUID()}` };
  }

  async updateWebsite(websiteId: string, input: UmamiWebsiteInput): Promise<void> {
    void websiteId;
    void input;
  }

  async deleteWebsite(websiteId: string): Promise<void> {
    void websiteId;
  }

  async collect(websiteId: string, payload: Record<string, unknown>): Promise<void> {
    void websiteId;
    void payload;
  }

  async getInsights(websiteId: string, startAt: number, endAt: number): Promise<UmamiInsights> {
    void websiteId;
    void startAt;
    void endAt;
    return emptyInsights();
  }
}

class HttpUmamiProvisioner implements UmamiProvisioner {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T | undefined> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`upstream_${response.status}`);
    }

    if (response.status === 204) return undefined;
    return response.json() as Promise<T>;
  }

  private async safeRequest<T>(path: string, init: RequestInit = {}): Promise<T | undefined> {
    try {
      return await this.request<T>(path, init);
    } catch {
      return undefined;
    }
  }

  async createWebsite(input: UmamiWebsiteInput): Promise<{ websiteId: string }> {
    const result = await this.request<{ id?: string; websiteId?: string; website?: { id?: string } }>(
      '/api/websites',
      { method: 'POST', body: JSON.stringify({ name: input.name, domain: input.domain, ...(process.env.UMAMI_TEAM_ID ? { teamId: process.env.UMAMI_TEAM_ID } : {}) }) },
    );
    const websiteId = result?.id ?? result?.websiteId ?? result?.website?.id;
    if (!websiteId) throw new Error('upstream_invalid_response');
    return { websiteId };
  }

  async findWebsite(input: UmamiWebsiteInput): Promise<{ websiteId: string } | null> {
    const result = await this.request<Array<{ id?: string; domain?: string }> | { data?: Array<{ id?: string; domain?: string }> }>(
      `/api/websites?search=${encodeURIComponent(input.domain)}`,
      { method: 'GET' },
    );
    const websites = Array.isArray(result) ? result : result?.data ?? [];
    const match = websites.find((website) => website.domain?.toLowerCase() === input.domain.toLowerCase());
    return match?.id ? { websiteId: match.id } : null;
  }

  async updateWebsite(websiteId: string, input: UmamiWebsiteInput): Promise<void> {
    await this.request(`/api/websites/${encodeURIComponent(websiteId)}`, {
      method: 'POST',
      body: JSON.stringify({ name: input.name, domain: input.domain }),
    });
  }

  async deleteWebsite(websiteId: string): Promise<void> {
    await this.request(`/api/websites/${encodeURIComponent(websiteId)}`, { method: 'DELETE' });
  }

  async collect(websiteId: string, payload: Record<string, unknown>): Promise<void> {
    await this.request('/api/send', {
      method: 'POST',
      body: JSON.stringify({ type: 'event', payload: { website: websiteId, ...payload } }),
    });
  }

  async getInsights(websiteId: string, startAt: number, endAt: number): Promise<UmamiInsights> {
    const encodedId = encodeURIComponent(websiteId);
    const range = `startAt=${startAt}&endAt=${endAt}`;
    const [stats, pageviews, countries, pages, realtime, active] = await Promise.all([
      this.safeRequest<Record<string, unknown>>(`/api/websites/${encodedId}/stats?${range}`),
      this.safeRequest<unknown>(`/api/websites/${encodedId}/pageviews?${range}&unit=day`),
      this.safeRequest<unknown>(`/api/websites/${encodedId}/metrics?${range}&type=country`),
      this.safeRequest<unknown>(`/api/websites/${encodedId}/metrics?${range}&type=path`),
      this.safeRequest<unknown>(`/api/realtime/${encodedId}?startAt=${endAt - 30 * 60 * 1000}&endAt=${endAt}`),
      this.safeRequest<unknown>(`/api/websites/${encodedId}/active`),
    ]);

    const rows = (value: unknown, key?: string): Array<Record<string, unknown>> => {
      const candidate = key && value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : value;
      const data = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        ? (candidate as Record<string, unknown>).data
        : candidate;
      if (Array.isArray(data)) {
        return data.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'));
      }
      if (data && typeof data === 'object') {
        return Object.entries(data as Record<string, unknown>).map(([label, value]) => ({ label, value }));
      }
      return [];
    };

    const breakdown = (value: unknown): UmamiBreakdown[] => rows(value).map((row) => ({
      label: String(row.x ?? row.name ?? row.label ?? row.country ?? 'Unknown'),
      value: Number(row.y ?? row.value ?? row.count ?? 0),
    })).filter((row) => Number.isFinite(row.value) && row.value > 0);

    const pageviewRows = rows(pageviews, 'pageviews');
    const normalizedRealtime = normalizeRealtime(realtime, active);

    return {
      totals: {
        pageviews: Number(stats?.pageviews ?? 0),
        visitors: Number(stats?.visitors ?? 0),
        visits: Number(stats?.visits ?? 0),
        bounces: Number(stats?.bounces ?? 0),
        totaltime: Number(stats?.totaltime ?? 0),
      },
      series: pageviewRows.map((row) => ({
        date: String(row.x ?? row.date ?? ''),
        pageviews: Number(row.y ?? row.pageviews ?? 0),
        visitors: Number(row.visitors ?? 0),
      })).filter((row) => row.date),
      countries: breakdown(countries),
      pages: breakdown(pages),
      realtime: normalizedRealtime,
    };
  }
}

export function getAnalyticsProvisioner(): UmamiProvisioner {
  const mode = process.env.ANALYTICS_PROVISIONING_MODE?.trim().toLowerCase();
  const baseUrl = process.env.UMAMI_API_URL?.trim();
  const token = process.env.UMAMI_API_TOKEN?.trim();

  if (mode === 'local' || (!baseUrl && !token && process.env.NODE_ENV !== 'production')) {
    return new LocalUmamiProvisioner();
  }

  if (!baseUrl || !token) {
    throw new Error('analytics_upstream_not_configured');
  }

  return new HttpUmamiProvisioner(baseUrl, token);
}
