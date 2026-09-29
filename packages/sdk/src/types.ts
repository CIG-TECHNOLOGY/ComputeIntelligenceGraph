export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface Resource {
  id: string;
  type: string;
  provider: string;
  name: string;
  region?: string;
  state?: string;
  tags?: Record<string, string>;
}

export interface PagedResources {
  items: Resource[];
  total: number;
  hasMore: boolean;
}

export interface DiscoveryStatus {
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export type GraphSource = 'live' | 'demo';

export interface GraphSourceState {
  kind: GraphSource;
  available: boolean;
  lastSyncedAt: string | null;
}

export interface ChatHealthStatus {
  provider: "openai" | "ollama" | "fallback";
  model: string;
  configured: boolean;
  reachable: boolean;
  providerReachable: boolean;
  checkedAt: string;
  latencyMs: number | null;
}

export interface HealthResponse {
  status: "ok";
  version: string;
  timestamp: string;
  chat: ChatHealthStatus;
}

export type AnalyticsSiteStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "failed"
  | "deleting"
  | "deleted";

export interface AnalyticsSite {
  id: string;
  name: string;
  domain: string;
  status: AnalyticsSiteStatus;
  createdAt: string;
  updatedAt: string;
  lastEventAt: string | null;
  provisioningError?: string;
  publicAccess?: AnalyticsPublicAccess;
}

export interface AnalyticsPublicAccess {
  enabled: boolean;
  url?: string;
  /** Returned only once when a new public link is created. */
  token?: string;
}

export interface AnalyticsSiteInput {
  name: string;
  domain: string;
}

export interface AnalyticsSiteListResponse {
  items: AnalyticsSite[];
}

export interface AnalyticsSiteResponse {
  site: AnalyticsSite;
  replayed?: boolean;
}

export interface AnalyticsStats {
  totals: { pageviews: number; events: number; accepted: number };
  daily: Array<{ date: string; pageviews: number; events: number }>;
  lastEventAt: string | null;
}

export interface AnalyticsBreakdown {
  label: string;
  value: number;
}

export interface AnalyticsInsights {
  source: "umami" | "local";
  generatedAt: string;
  rangeDays: number;
  totals: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
  series: Array<{ date: string; pageviews: number; visitors: number }>;
  countries: AnalyticsBreakdown[];
  pages: AnalyticsBreakdown[];
  realtime: {
    visitors: number;
    countries: AnalyticsBreakdown[];
    pages: AnalyticsBreakdown[];
    updatedAt: string;
  };
}

export interface AnalyticsInsightsResponse {
  site: AnalyticsSite;
  insights: AnalyticsInsights;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  type: string;
}

export interface GraphDiscoverySnapshot {
  healthy: boolean;
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export interface GraphSnapshot {
  source: GraphSourceState;
  resourceCounts: Record<string, number>;
  resources: Resource[];
  relationships: Relationship[];
  discovery: GraphDiscoverySnapshot;
}

export interface ResourceDependencies {
  items: Resource[];
}

export interface CostEntry {
  resourceId: string;
  monthlyCost: number;
  currency: string;
}

export interface CostsResponse {
  items: CostEntry[];
}

export interface CostBreakdownEntry {
  name: string;
  amount: number;
  currency: string;
  percentage?: number;
}

export interface CostBreakdown {
  byProvider: CostBreakdownEntry[];
  byType: CostBreakdownEntry[];
  byRegion: CostBreakdownEntry[];
  byTag: CostBreakdownEntry[];
}

export interface CostTrendPeriod {
  total: number;
  currency: string;
  change?: number;
}

export interface ResourceCostEntry {
  resourceId: string;
  resourceName?: string;
  type?: string;
  region?: string;
  amount: number;
  currency: string;
}

export interface CostSummary {
  totalMonthlyCost: number;
  currency: string;
  breakdown: CostBreakdown;
  trends: {
    "7d": CostTrendPeriod;
    "30d": CostTrendPeriod;
    "90d": CostTrendPeriod;
  };
  resourceCosts: ResourceCostEntry[];
}

export interface SecurityFinding {
  id: string;
  resourceId: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  category?: "public-access" | "encryption" | "iam" | "network" | string;
  status?: "open" | "acknowledged" | "resolved" | "false-positive";
  remediationSteps?: string;
}

export interface SecurityFindingsResponse {
  items: SecurityFinding[];
  findings?: SecurityFinding[];
  total?: number;
  score?: SecurityScore;
  scannedAt?: string;
}

export interface SecurityScore {
  score: number;
  maxScore: number;
  grade: string;
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export type ChatContextItem =
  | ChatResourceLinkContextItem
  | ChatAttachmentContextItem
  | ChatCodeSnippetContextItem
  | ChatTranscriptContextItem;

export interface ChatResourceLinkContextItem {
  type: "resource_link";
  resourceId: string;
  title: string;
  href: string;
  provider?: string;
  resourceType?: string;
}

export interface ChatAttachmentContextItem {
  type: "attachment";
  kind: "image" | "document";
  name: string;
  mimeType: string;
  extractedText?: string;
  summary?: string;
}

export interface ChatCodeSnippetContextItem {
  type: "code_snippet";
  language: "sql" | "search" | "cypher";
  title: string;
  content: string;
}

export interface ChatTranscriptContextItem {
  type: "transcript";
  text: string;
  durationMs: number;
  mode: "review" | "auto-send";
}

export interface SecurityScanResult {
  findings: SecurityFinding[];
  score: SecurityScore;
  scannedAt: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  contextItems?: ChatContextItem[];
  template?: ChatTemplateSelection;
  presentation?: ChatMessagePresentation;
}

export interface ChatTemplateSelection {
  id: string;
  title: string;
  prompt: string;
  lane?: string;
  source?: GraphSource;
}

export interface ChatMessagePresentation {
  format: "text" | "html";
  html?: string;
  templateId?: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RenameChatSessionPayload {
  title: string;
}

export interface ChatSessionListResponse {
  items: ChatSessionSummary[];
  total: number;
}

export interface ChatSessionDetailResponse {
  session: ChatSessionSummary;
  items: ChatMessage[];
  total: number;
}

export interface ChatResponse {
  answer: string;
  cypher?: string;
  needsClarification: boolean;
  clarifyingQuestion?: string;
  sessionId?: string;
  presentation?: ChatMessagePresentation;
}

export interface SendChatMessagePayload {
  message?: string;
  sessionId?: string;
  contextItems?: ChatContextItem[];
  graphSource?: GraphSource;
  template?: ChatTemplateSelection;
}

export interface ChatAttachmentUploadResponse {
  item: ChatAttachmentContextItem;
}

export interface ChatTranscriptionResponse {
  text: string;
  item: ChatTranscriptContextItem;
}

export interface ManagedTarget {
  id: string;
  hostname: string;
  os: string;
  architecture: string;
  ip_address: string;
  profile: "core" | "discovery" | "full";
  status: "online" | "degraded" | "offline" | "revoked";
  last_seen: string | null;
  service_status: Record<string, unknown> | null;
  system_metrics: Record<string, unknown> | null;
  cig_version: string | null;
  created_at: string;
}

export interface TargetsResponse {
  items: ManagedTarget[];
  total: number;
}

export interface EnrollmentTokenResponse {
  enrollment_token: string;
  expires_at: string;
}

export interface BootstrapStatus {
  requires_bootstrap: boolean;
  mode: "managed" | "self-hosted";
}

export interface BootstrapCompletePayload {
  bootstrap_token: string;
  username: string;
  email: string;
  password: string;
}

export interface BootstrapCompleteResponse {
  access_token: string;
  refresh_token: string;
}

export interface DeviceSession {
  id: string;
  device_code: string;
  device_name: string | null;
  device_os: string | null;
  device_arch: string | null;
  ip_address: string | null;
  status: string;
  last_active: string;
  created_at: string;
}

export interface SessionListResponse {
  items: DeviceSession[];
  total: number;
}

export interface DeviceAuthRequest {
  device_code: string;
  user_code: string;
  ip_address: string;
  created_at: string;
  expires_at: string;
}

export interface DeviceAuthResponse {
  items: DeviceAuthRequest[];
  total: number;
}

// ─── CIG Node Onboarding Types ───────────────────────────────────────────────
// Requirements: 3.2, 18.1–18.10, 21.10

export interface AWSManifestConfig {
  roleArn: string;
  externalId: string;
  region: string;
}

export interface GCPManifestConfig {
  projectId: string;
  serviceAccountEmail: string;
  impersonationEnabled: boolean;
}

export interface SetupManifest {
  /** e.g. "1.0" */
  version: string;
  cloudProvider: 'aws' | 'gcp';
  /** IAM Role ARN or SA email */
  credentialsRef: string;
  /** single-use UUID */
  enrollmentToken: string;
  /** public key fingerprint */
  nodeIdentitySeed: string;
  installProfile: 'core' | 'discovery' | 'full';
  targetMode: 'local' | 'ssh' | 'host';
  /** https://api.cig.lat or http://localhost:3003 */
  controlPlaneEndpoint: string;
  awsConfig?: AWSManifestConfig;
  gcpConfig?: GCPManifestConfig;
  /** HMAC-SHA256 over manifest body */
  signature: string;
  /** ISO 8601 */
  issuedAt: string;
  /** ISO 8601, 15 min from issuedAt */
  expiresAt: string;
  /** Whether to provision with demo/mock data */
  isDemo?: boolean;
}

export interface NodeIdentity {
  /** UUID */
  nodeId: string;
  /** Ed25519 private key, base64 */
  privateKey: string;
  /** Ed25519 public key, base64 */
  publicKey: string;
  issuedAt: string;
}

export interface EnrollmentToken {
  /** UUID */
  token: string;
  expiresAt: string;
  manifestId: string;
}

export interface GraphNode {
  id: string;
  type: string;
  provider: 'aws' | 'gcp';
  properties: Record<string, unknown>;
}

export interface GraphNodeUpdate {
  id: string;
  properties: Record<string, unknown>;
}

export interface GraphDelta {
  nodeId: string;
  deltaType: 'full' | 'targeted' | 'drift';
  additions: GraphNode[];
  modifications: GraphNodeUpdate[];
  /** resource IDs */
  deletions: string[];
  timestamp: string;
  scanId: string;
}

export interface GraphRefinementSnapshot {
  resourceCounts: Record<string, number>;
  resources: Resource[];
  relationships: Relationship[];
  discovery: GraphDiscoverySnapshot;
}

export interface GraphRefinementPreviewChange {
  kind: 'resource' | 'relationship';
  action: 'create' | 'update' | 'delete';
  id: string;
  label?: string;
  detail?: string;
}

export interface GraphRefinementProposal {
  summary: string;
  proposedCypher: string;
  previewDiff: GraphRefinementPreviewChange[];
  requiresApproval: boolean;
  rationale?: string;
}

export interface GraphRefinementRequest {
  goal: string;
  snapshot: GraphRefinementSnapshot;
  proposal: GraphRefinementProposal;
  confirmed?: boolean;
}

export interface GraphRefinementResponse {
  applied: boolean;
  preview: GraphRefinementProposal;
  result?: {
    affectedNodes: number;
    affectedRelationships: number;
  };
  message?: string;
}

export interface HeartbeatPayload {
  nodeId: string;
  timestamp: string;
  serviceHealth: Record<string, 'healthy' | 'degraded' | 'down'>;
  systemMetrics: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
  };
  permissionTier: 0 | 1 | 2 | 3 | 4;
  activeConnectors: string[];
}

export type OnboardingStatus =
  | 'draft'
  | 'manifest_ready'
  | 'cli_started'
  | 'node_enrolled'
  | 'credential_validated'
  | 'discovery_started'
  | 'online'
  | 'enrollment_failed'
  | 'credential_error'
  | 'discovery_failed';

export type NodeStatus =
  | 'enrolling'
  | 'online'
  | 'degraded'
  | 'offline'
  | 'credential-error'
  | 'revoked';
