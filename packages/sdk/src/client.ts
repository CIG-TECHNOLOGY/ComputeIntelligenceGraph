import type {
  BootstrapCompletePayload,
  BootstrapCompleteResponse,
  BootstrapStatus,
  ChatAttachmentUploadResponse,
  ChatResponse,
  ChatSessionSummary,
  ChatSessionDetailResponse,
  ChatSessionListResponse,
  ChatTranscriptionResponse,
  CostBreakdown,
  CostSummary,
  CostsResponse,
  DeviceAuthResponse,
  DiscoveryStatus,
  GraphRefinementRequest,
  GraphRefinementResponse,
  GraphSource,
  GraphSnapshot,
  EnrollmentTokenResponse,
  PagedResources,
  Relationship,
  Resource,
  ResourceDependencies,
  SecurityFindingsResponse,
  SecurityScore,
  SessionListResponse,
  HealthResponse,
  TargetsResponse,
  RenameChatSessionPayload,
  SendChatMessagePayload,
  AnalyticsSiteInput,
  AnalyticsSiteListResponse,
  AnalyticsSiteResponse,
  AnalyticsStats,
  AnalyticsInsightsResponse,
  AnalyticsPublicAccess,
} from "./types";

// Fetch API types for environments where lib "DOM" is not present (e.g. Node-only consumers).
type _HeadersInit = NonNullable<ConstructorParameters<typeof Headers>[0]>;
type _BodyInit = Exclude<NonNullable<RequestInit["body"]>, null>;

type AccessTokenResolver = () => string | null | undefined | Promise<string | null | undefined>;
type DefaultHeadersResolver = () => _HeadersInit | undefined | Promise<_HeadersInit | undefined>;

export interface CigClientOptions {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  getAccessToken?: AccessTokenResolver;
  defaultHeaders?: _HeadersInit;
  getDefaultHeaders?: DefaultHeadersResolver;
  fetch?: typeof fetch;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function resolveUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

export class CigApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = 'CigApiError';
    this.status = status;
    this.path = path;
  }
}

async function buildErrorMessage(response: Response): Promise<string> {
  const fallback = `API error ${response.status}: ${response.statusText}`;

  try {
    const text = await response.text();
    if (!text) {
      return fallback;
    }

    try {
      const payload = JSON.parse(text) as { error?: string; message?: string };
      return payload.error ?? payload.message ?? fallback;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

export class CigClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: CigClientOptions) {
    this.fetchImpl = (options.fetch ?? fetch).bind(globalThis);
  }

  private async resolveHeaders(headers?: _HeadersInit, body?: _BodyInit | null): Promise<Headers> {
    const defaultHeaders = await this.options.getDefaultHeaders?.() ?? this.options.defaultHeaders;
    const resolvedHeaders = new Headers(defaultHeaders);

    if (headers) {
      new Headers(headers).forEach((value, key) => {
        resolvedHeaders.set(key, value);
      });
    }

    if (!resolvedHeaders.has("Content-Type") && body && !(body instanceof FormData)) {
      resolvedHeaders.set("Content-Type", "application/json");
    }

    const token = await this.options.getAccessToken?.() ?? this.options.accessToken ?? null;
    if (token && !resolvedHeaders.has("Authorization")) {
      resolvedHeaders.set("Authorization", `Bearer ${token}`);
    }

    if (this.options.apiKey && !resolvedHeaders.has("x-api-key")) {
      resolvedHeaders.set("x-api-key", this.options.apiKey);
    }

    return resolvedHeaders;
  }

  async requestRaw(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = await this.resolveHeaders(init.headers, init.body ?? null);

    return this.fetchImpl(resolveUrl(this.options.baseUrl, path), {
      ...init,
      headers,
    });
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.requestRaw(path, init);

    if (!response.ok) {
      throw new CigApiError(await buildErrorMessage(response), response.status, path);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private async requestWithFallback<T>(paths: string[], init: RequestInit = {}): Promise<T> {
    let lastError: Error | null = null;

    for (let index = 0; index < paths.length; index += 1) {
      const response = await this.requestRaw(paths[index], init);

      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }

        return response.json() as Promise<T>;
      }

      const message = await buildErrorMessage(response);
      const error = new CigApiError(message, response.status, paths[index]);

      if (response.status === 404 && index < paths.length - 1) {
        lastError = error;
        continue;
      }

      throw error;
    }

    throw lastError ?? new Error("API error: request failed");
  }

  getResourcesPaged(params?: string, source?: GraphSource): Promise<PagedResources> {
    const queryParts = [params, source === "demo" ? "source=demo" : ""].filter(Boolean);
    return this.request<PagedResources>(`/api/v1/resources${queryParts.length ? `?${queryParts.join("&")}` : ""}`);
  }

  searchResources(query: string, params?: string, source?: GraphSource): Promise<PagedResources> {
    const queryParts = [params, source === "demo" ? "source=demo" : ""].filter(Boolean);
    return this.request<PagedResources>(
      `/api/v1/resources/search?q=${encodeURIComponent(query)}${queryParts.length ? `&${queryParts.join("&")}` : ""}`
    );
  }

  getDiscoveryStatus(): Promise<DiscoveryStatus> {
    return this.request<DiscoveryStatus>("/api/v1/discovery/status");
  }

  getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/v1/health");
  }

  listAnalyticsSites(): Promise<AnalyticsSiteListResponse> {
    return this.request<AnalyticsSiteListResponse>("/api/v1/analytics/sites");
  }

  createAnalyticsSite(payload: AnalyticsSiteInput, idempotencyKey?: string): Promise<AnalyticsSiteResponse> {
    return this.request<AnalyticsSiteResponse>("/api/v1/analytics/sites", {
      method: "POST",
      headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    });
  }

  updateAnalyticsSite(siteId: string, payload: Partial<AnalyticsSiteInput>): Promise<AnalyticsSiteResponse> {
    return this.request<AnalyticsSiteResponse>(`/api/v1/analytics/sites/${encodeURIComponent(siteId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  provisionAnalyticsSite(siteId: string): Promise<AnalyticsSiteResponse> {
    return this.request<AnalyticsSiteResponse>(`/api/v1/analytics/sites/${encodeURIComponent(siteId)}/provision`, {
      method: "POST",
    });
  }

  reconcileAnalyticsSites(): Promise<{ checked: number; active: number; failed: number }> {
    return this.request<{ checked: number; active: number; failed: number }>("/api/v1/analytics/reconcile", {
      method: "POST",
    });
  }

  deleteAnalyticsSite(siteId: string): Promise<AnalyticsSiteResponse> {
    return this.request<AnalyticsSiteResponse>(`/api/v1/analytics/sites/${encodeURIComponent(siteId)}`, {
      method: "DELETE",
    });
  }

  getAnalyticsSiteStats(siteId: string): Promise<AnalyticsStats> {
    return this.request<AnalyticsStats>(`/api/v1/analytics/sites/${encodeURIComponent(siteId)}/stats`);
  }

  getAnalyticsSiteInsights(siteId: string, days = 30): Promise<AnalyticsInsightsResponse> {
    return this.request<AnalyticsInsightsResponse>(
      `/api/v1/analytics/sites/${encodeURIComponent(siteId)}/insights?days=${encodeURIComponent(days)}`,
    );
  }

  setAnalyticsPublicAccess(siteId: string, enabled: boolean, paused = false, rotate = false): Promise<{ publicAccess: AnalyticsPublicAccess }> {
    return this.request<{ publicAccess: AnalyticsPublicAccess }>(
      `/api/v1/analytics/sites/${encodeURIComponent(siteId)}/public-access`,
      { method: "POST", body: JSON.stringify({ enabled, paused, rotate }) },
    );
  }

  getPublicAnalyticsView(token: string, days = 30): Promise<AnalyticsInsightsResponse> {
    return this.request<AnalyticsInsightsResponse>(
      `/api/v1/analytics/public/${encodeURIComponent(token)}?days=${encodeURIComponent(days)}`,
    );
  }

  triggerDiscovery(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/v1/discovery/trigger", {
      method: "POST",
    });
  }

  getResource(id: string, source?: GraphSource): Promise<Resource> {
    const query = source === "demo" ? "?source=demo" : "";
    return this.request<Resource>(`/api/v1/resources/${encodeURIComponent(id)}${query}`);
  }

  getResourceDependencies(id: string, source?: GraphSource): Promise<ResourceDependencies> {
    const query = source === "demo" ? "?source=demo" : "";
    return this.request<ResourceDependencies>(
      `/api/v1/resources/${encodeURIComponent(id)}/dependencies${query}`
    );
  }

  getResourceDependents(id: string, source?: GraphSource): Promise<ResourceDependencies> {
    const query = source === "demo" ? "?source=demo" : "";
    return this.request<ResourceDependencies>(
      `/api/v1/resources/${encodeURIComponent(id)}/dependents${query}`
    );
  }

  getRelationships(limit = 1000): Promise<{ items: Relationship[] }> {
    return this.request<{ items: Relationship[] }>(`/api/v1/relationships?limit=${limit}`);
  }

  getGraphSnapshot(source?: GraphSource): Promise<GraphSnapshot> {
    if (source === "demo") {
      return this.requestWithFallback<GraphSnapshot>([
        "/api/v1/demo/snapshot",
        "/api/v1/graph/snapshot?source=demo",
      ]);
    }

    return this.request<GraphSnapshot>("/api/v1/graph/snapshot");
  }

  getResourceCost(resourceId: string): Promise<CostsResponse> {
    return this.request<CostsResponse>(`/api/v1/costs?resourceId=${encodeURIComponent(resourceId)}`);
  }

  getCostSummary(): Promise<CostSummary> {
    return this.request<CostSummary>("/api/v1/costs");
  }

  getCostBreakdown(): Promise<CostBreakdown> {
    return this.request<CostBreakdown>("/api/v1/costs/breakdown");
  }

  getResourceSecurityFindings(resourceId: string): Promise<SecurityFindingsResponse> {
    return this.request<SecurityFindingsResponse>(
      `/api/v1/security/findings?resourceId=${encodeURIComponent(resourceId)}`
    );
  }

  getSecurityFindings(resourceId?: string): Promise<SecurityFindingsResponse> {
    const query = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : "";
    return this.request<SecurityFindingsResponse>(`/api/v1/security/findings${query}`);
  }

  getSecurityScore(): Promise<SecurityScore> {
    return this.request<SecurityScore>("/api/v1/security/score");
  }

  getChatSessions(): Promise<ChatSessionListResponse> {
    return this.request<ChatSessionListResponse>("/api/v1/chat/sessions");
  }

  getChatSessionMessages(sessionId: string): Promise<ChatSessionDetailResponse> {
    return this.request<ChatSessionDetailResponse>(
      `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages`
    );
  }

  deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      }
    );
  }

  renameChatSession(
    sessionId: string,
    payload: RenameChatSessionPayload
  ): Promise<ChatSessionSummary> {
    return this.request<ChatSessionSummary>(
      `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  }

  uploadChatAttachment(file: Blob, filename = "attachment"): Promise<ChatAttachmentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file, filename);

    return this.request<ChatAttachmentUploadResponse>("/api/v1/chat/uploads", {
      method: "POST",
      body: formData,
    });
  }

  transcribeChatAudio(
    file: Blob,
    options: { filename?: string; durationMs?: number; mode?: "review" | "auto-send" } = {},
  ): Promise<ChatTranscriptionResponse> {
    const formData = new FormData();
    formData.append("file", file, options.filename ?? "voice.webm");
    formData.append("durationMs", String(options.durationMs ?? 0));
    formData.append("mode", options.mode ?? "review");

    return this.request<ChatTranscriptionResponse>("/api/v1/chat/transcriptions", {
      method: "POST",
      body: formData,
    });
  }

  sendChatMessage(payload: SendChatMessagePayload): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  refineGraph(
    payload: GraphRefinementRequest,
  ): Promise<GraphRefinementResponse> {
    return this.request<GraphRefinementResponse>("/api/v1/graph/refine", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getTargets(): Promise<TargetsResponse> {
    return this.request<TargetsResponse>("/api/v1/targets");
  }

  deleteTarget(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/targets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  createEnrollmentToken(): Promise<EnrollmentTokenResponse> {
    return this.request<EnrollmentTokenResponse>("/api/v1/targets/enrollment-token", {
      method: "POST",
    });
  }

  getBootstrapStatus(): Promise<BootstrapStatus> {
    return this.request<BootstrapStatus>("/api/v1/bootstrap/node/status");
  }

  validateBootstrapToken(token: string): Promise<{ valid: boolean }> {
    return this.request<{ valid: boolean }>("/api/v1/bootstrap/validate", {
      method: "POST",
      body: JSON.stringify({ bootstrap_token: token }),
    });
  }

  completeBootstrap(payload: BootstrapCompletePayload): Promise<BootstrapCompleteResponse> {
    return this.request<BootstrapCompleteResponse>("/api/v1/bootstrap/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getPendingDeviceRequests(): Promise<DeviceAuthResponse> {
    return this.request<DeviceAuthResponse>("/api/v1/auth/device/pending");
  }

  approveDevice(userCode: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/api/v1/auth/device/approve", {
      method: "POST",
      body: JSON.stringify({ user_code: userCode }),
    });
  }

  denyDevice(userCode: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/api/v1/auth/device/deny", {
      method: "POST",
      body: JSON.stringify({ user_code: userCode }),
    });
  }

  getSessions(): Promise<SessionListResponse> {
    return this.request<SessionListResponse>("/api/v1/sessions");
  }

  revokeSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  }
}

export function createCigClient(options: CigClientOptions): CigClient {
  return new CigClient(options);
}
