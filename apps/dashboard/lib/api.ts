import type {
  BootstrapCompletePayload,
  GraphRefinementRequest,
  GraphSource,
  GraphSnapshot,
  SendChatMessagePayload,
  AnalyticsSite,
  AnalyticsSiteInput,
  AnalyticsSiteListResponse,
  AnalyticsSiteResponse,
  AnalyticsStats,
  AnalyticsInsightsResponse,
  AnalyticsPublicAccess,
} from "@cig/sdk";
import { getDashboardClient } from "./cigClient";

export type {
  BootstrapCompletePayload,
  BootstrapCompleteResponse,
  BootstrapStatus,
  ChatAttachmentContextItem,
  ChatAttachmentUploadResponse,
  ChatCodeSnippetContextItem,
  ChatContextItem,
  ChatMessage,
  ChatResponse,
  ChatSessionDetailResponse,
  ChatSessionListResponse,
  ChatSessionSummary,
  ChatResourceLinkContextItem,
  ChatTranscriptContextItem,
  ChatTranscriptionResponse,
  CostBreakdown,
  CostBreakdownEntry,
  CostEntry,
  CostSummary,
  CostTrendPeriod,
  CostsResponse,
  DeviceAuthRequest,
  DeviceAuthResponse,
  DeviceSession,
  HealthResponse,
  DiscoveryStatus,
  EnrollmentTokenResponse,
  GraphStats,
  GraphRefinementRequest,
  GraphRefinementResponse,
  GraphSource,
  GraphSnapshot,
  ManagedTarget,
  PagedResources,
  Relationship,
  Resource,
  ResourceCostEntry,
  ResourceDependencies,
  SecurityFinding,
  SecurityFindingsResponse,
  SecurityScanResult,
  SecurityScore,
  SendChatMessagePayload,
  SessionListResponse,
  TargetsResponse,
  AnalyticsSite,
  AnalyticsSiteInput,
  AnalyticsSiteListResponse,
  AnalyticsSiteResponse,
  AnalyticsStats,
  AnalyticsInsightsResponse,
  AnalyticsPublicAccess,
} from "@cig/sdk";

function getClient() {
  return getDashboardClient();
}

async function readErrorMessage(response: Response): Promise<string> {
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

async function requestGraphSnapshot(path: string): Promise<GraphSnapshot> {
  const response = await getClient().requestRaw(path);
  if (!response.ok) {
    const error = new Error(await readErrorMessage(response)) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<GraphSnapshot>;
}

async function requestGraphSnapshotWithFallback(paths: string[]): Promise<GraphSnapshot> {
  let lastError: Error | null = null;

  for (let index = 0; index < paths.length; index += 1) {
    try {
      return await requestGraphSnapshot(paths[index]);
    } catch (error) {
      const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
      if (status === 404 && index < paths.length - 1) {
        lastError = error instanceof Error ? error : new Error("API error: request failed");
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("API error: request failed");
}

export const getResourcesPaged = (params?: string, source?: GraphSource) =>
  getClient().getResourcesPaged(params, source);

export const searchResources = (query: string, params?: string, source?: GraphSource) =>
  getClient().searchResources(query, params, source);

export const getDiscoveryStatus = () => getClient().getDiscoveryStatus();

export const getHealth = () => getClient().getHealth();

export const listAnalyticsSites = (): Promise<AnalyticsSiteListResponse> =>
  getClient().listAnalyticsSites();

export const createAnalyticsSite = (payload: AnalyticsSiteInput, idempotencyKey?: string): Promise<AnalyticsSiteResponse> =>
  getClient().createAnalyticsSite(payload, idempotencyKey);

export const updateAnalyticsSite = (siteId: string, payload: Partial<AnalyticsSiteInput>): Promise<AnalyticsSiteResponse> =>
  getClient().updateAnalyticsSite(siteId, payload);

export const provisionAnalyticsSite = (siteId: string): Promise<AnalyticsSiteResponse> =>
  getClient().provisionAnalyticsSite(siteId);

export const reconcileAnalyticsSites = () => getClient().reconcileAnalyticsSites();

export const deleteAnalyticsSite = (siteId: string): Promise<AnalyticsSiteResponse> =>
  getClient().deleteAnalyticsSite(siteId);

export const getAnalyticsSiteStats = (siteId: string): Promise<AnalyticsStats> =>
  getClient().getAnalyticsSiteStats(siteId);

export const getAnalyticsSiteInsights = (siteId: string, days = 30): Promise<AnalyticsInsightsResponse> =>
  getClient().getAnalyticsSiteInsights(siteId, days);

export const setAnalyticsPublicAccess = (siteId: string, enabled: boolean): Promise<{ publicAccess: AnalyticsPublicAccess }> =>
  getClient().setAnalyticsPublicAccess(siteId, enabled);

export const getPublicAnalyticsView = (token: string, days = 30): Promise<AnalyticsInsightsResponse> =>
  getClient().getPublicAnalyticsView(token, days);

export const triggerDiscovery = () => getClient().triggerDiscovery();

export const getGraphSnapshot = (source?: GraphSource) =>
  source === "demo"
    ? requestGraphSnapshotWithFallback([
        "/api/v1/demo/snapshot",
        "/api/v1/graph/snapshot?source=demo",
      ])
    : getClient().getGraphSnapshot(source);

export const getResource = (id: string, source?: GraphSource) =>
  getClient().getResource(id, source);

export const getResourceDependencies = (id: string, source?: GraphSource) =>
  getClient().getResourceDependencies(id, source);

export const getResourceDependents = (id: string, source?: GraphSource) =>
  getClient().getResourceDependents(id, source);

export const getRelationships = (limit?: number) =>
  getClient().getRelationships(limit);

export const getResourceCost = (resourceId: string) =>
  getClient().getResourceCost(resourceId);

export const getCostSummary = () => getClient().getCostSummary();

export const getCostBreakdown = () => getClient().getCostBreakdown();

export const getResourceSecurityFindings = (resourceId: string) =>
  getClient().getResourceSecurityFindings(resourceId);

export const getSecurityFindings = (resourceId?: string) =>
  getClient().getSecurityFindings(resourceId);

export const getSecurityScore = () => getClient().getSecurityScore();

export const getChatSessions = () => getClient().getChatSessions();

export const getChatSessionMessages = (sessionId: string) =>
  getClient().getChatSessionMessages(sessionId);

export const deleteChatSession = (sessionId: string) =>
  getClient().deleteChatSession(sessionId);

export const renameChatSession = (sessionId: string, title: string) =>
  getClient().renameChatSession(sessionId, { title });

export const uploadChatAttachment = (file: Blob, filename?: string) =>
  getClient().uploadChatAttachment(file, filename);

export const transcribeChatAudio = (
  file: Blob,
  options?: { filename?: string; durationMs?: number; mode?: "review" | "auto-send" },
) => getClient().transcribeChatAudio(file, options);

export const sendChatMessage = (payload: SendChatMessagePayload) =>
  getClient().sendChatMessage(payload);

export const refineGraph = (payload: GraphRefinementRequest) =>
  getClient().refineGraph(payload);

export const getTargets = () => getClient().getTargets();

export const deleteTarget = (id: string) => getClient().deleteTarget(id);

export const createEnrollmentToken = () => getClient().createEnrollmentToken();

export const getBootstrapStatus = () => getClient().getBootstrapStatus();

export const validateBootstrapToken = (token: string) =>
  getClient().validateBootstrapToken(token);

export const completeBootstrap = (payload: BootstrapCompletePayload) =>
  getClient().completeBootstrap(payload);

export const getPendingDeviceRequests = () =>
  getClient().getPendingDeviceRequests();

export const approveDevice = (userCode: string) =>
  getClient().approveDevice(userCode);

export const denyDevice = (userCode: string) =>
  getClient().denyDevice(userCode);

export const getSessions = () => getClient().getSessions();

export const revokeSession = (sessionId: string) =>
  getClient().revokeSession(sessionId);
