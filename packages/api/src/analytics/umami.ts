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
