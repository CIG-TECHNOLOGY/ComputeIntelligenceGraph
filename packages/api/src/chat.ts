import type { Resource_Model } from '@cig/graph';
import type { ChatMessagePresentation } from '@cig/sdk';
import { runChatCompletion } from '@cig/chatbot';
import {
  type ChatContextItem,
  type ChatTurn,
  summarizeChatContextItems,
} from './chat-context';

export interface ChatResponse {
  answer: string;
  cypher?: string;
  needsClarification: boolean;
  clarifyingQuestion?: string;
  sessionId?: string;
  presentation?: ChatMessagePresentation;
}

export interface ChatInfrastructureSnapshot {
  resourceCounts: Record<string, number>;
  sampleResources: Resource_Model[];
  discoveryHealthy: boolean;
  discoveryRunning: boolean;
  discoveryLastRun: string | null;
  discoveryNextRun: string | null;
  deploymentMode: 'managed' | 'self-hosted';
}

type ChatContextOrInfrastructure = ChatContextItem[] | ChatInfrastructureSnapshot | undefined;

type QuestionTopic =
  | 'greeting'
  | 'identity'
  | 'capabilities'
  | 'alerts'
  | 'costs'
  | 'security'
  | 'dependencies'
  | 'discovery'
  | 'resources';

const DEFAULT_CLARIFICATION =
  'Can you mention a provider, resource type, or resource name?';

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase();
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function inferQuestionTopic(question: string): QuestionTopic {
  const normalized = normalizeQuestion(question);

  if (includesAny(normalized, [/^(hi|hello|hey|hola|buenas)\b/, /\bhow are you\b/, /\bcomo estas\b/])) {
    return 'greeting';
  }

  if (includesAny(normalized, [/\bwho are you\b/, /\bwhat are you\b/, /\bquien eres\b/, /\bque eres\b/])) {
    return 'identity';
  }

  if (includesAny(normalized, [/\bwhat can you do\b/, /\bhelp\b/, /\bcapabilit/, /\bcomo ayudas\b/, /\bque puedes hacer\b/])) {
    return 'capabilities';
  }

  if (includesAny(normalized, [/\balert/, /\balarm/, /\bincident/, /\bcritical/, /\bcritica/, /\bwarning/])) {
    return 'alerts';
  }

  if (includesAny(normalized, [/\bcost/, /\bspend/, /\bbudget/, /\bbilling/, /\bprice/, /\bcosto/, /\bgasto/])) {
    return 'costs';
  }

  if (includesAny(normalized, [/\bsecurity/, /\bvulnerab/, /\biam\b/, /\bpublic access\b/, /\bcompliance\b/, /\bseguridad\b/])) {
    return 'security';
  }

  if (includesAny(normalized, [/\bdepend/, /\bdependency/, /\bblast radius\b/, /\bupstream\b/, /\bdownstream\b/, /\bdepends on\b/])) {
    return 'dependencies';
  }

  if (includesAny(normalized, [/\bdiscover/, /\bdiscovery\b/, /\bscan\b/, /\binventory\b/, /\bcrawl\b/, /\bbootstrap\b/, /\bstatus\b/])) {
    return 'discovery';
  }

  return 'resources';
}

function isGeneralTopic(topic: QuestionTopic): boolean {
  return topic === 'greeting' || topic === 'identity' || topic === 'capabilities';
}

function buildClarifyingQuestion(topic: QuestionTopic): string {
  switch (topic) {
    case 'costs':
      return 'Which provider, service, region, or resource should I break costs down for?';
    case 'security':
      return 'Which resource, provider, or finding type should I inspect for security issues?';
    case 'dependencies':
      return 'Which service, database, or resource should I trace dependencies for?';
    case 'discovery':
      return 'Which provider, account, region, or discovery target should I check?';
    case 'alerts':
      return 'Which alert source, service, or severity should I focus on?';
    default:
      return DEFAULT_CLARIFICATION;
  }
}

function buildGeneralFallbackResponse(topic: QuestionTopic): ChatResponse {
  switch (topic) {
    case 'greeting':
      return {
        answer:
          'Hello. I am the CIG assistant. I can help with resources, dependencies, discovery, costs, and security across your infrastructure.',
        needsClarification: false,
      };
    case 'identity':
      return {
        answer:
          'I am the CIG assistant. I help you explore infrastructure data, explain relationships, and shape questions for discovery, cost, and security workflows.',
        needsClarification: false,
      };
    case 'capabilities':
      return {
        answer:
          'I can help you inspect resources, trace dependencies, summarize costs, review security findings, and guide discovery questions. Ask about a specific service, provider, region, or workflow.',
        needsClarification: false,
      };
    default:
      return {
        answer:
          'I can help once you anchor the question to your infrastructure. Ask about a provider, service, region, resource name, or operational workflow.',
        needsClarification: true,
        clarifyingQuestion: DEFAULT_CLARIFICATION,
      };
  }
}

function serializeResource(resource: Resource_Model): string {
  const region = resource.region ? `, ${resource.region}` : '';
  const state = resource.state ? `, ${resource.state}` : '';
  return `${resource.name || resource.id} (${resource.type}, ${resource.provider}${region}${state})`;
}

function serializeResources(resources: Resource_Model[]): string {
  return resources
    .slice(0, 6)
    .map((resource, index) => `${index + 1}. ${serializeResource(resource)}`)
    .join('\n');
}

function summarizeResourceCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts)
    .map(([type, count]) => [type, Number(count)] as const)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((a, b) => b[1] - a[1]);

  return entries
    .slice(0, 4)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');
}

function sumResourceCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
}

function buildDocsUrl(mode: ChatInfrastructureSnapshot['deploymentMode']): string {
  return mode === 'managed'
    ? 'https://cig.technology/documentation'
    : 'http://localhost:3004/documentation';
}

function buildSetupGuidance(infrastructure: ChatInfrastructureSnapshot): string {
  if (infrastructure.deploymentMode === 'managed') {
    return [
      'Managed cloud setup: verify `AUTHENTIK_JWKS_URI`, `OIDC_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and the discovery service credentials, then redeploy the API and dashboard.',
      'If the discovery service is healthy but the graph is still empty, trigger a new scan or confirm the cloud crawlers can reach the target accounts.',
    ].join(' ');
  }

  return [
    'Local setup: run `docker-compose -f docker-compose.dev.yml up -d`, then `pnpm dev:discovery` or `pnpm dev:all`, and confirm `CARTOGRAPHY_URL=http://localhost:8001` with Neo4j and Chroma healthy.',
    'If you are using the CLI instead, `cig install --mode self-hosted --profile discovery` will generate the same local bundle.',
  ].join(' ');
}

function buildConnectionRequiredResponse(
  infrastructure?: ChatInfrastructureSnapshot
): ChatResponse {
  if (!infrastructure) {
    return {
      answer:
        'I cannot inspect the live architecture yet because the connector is not connected or discovery has not indexed any resources. Connect the resources first, then I can discover and check the architecture and resources.',
      needsClarification: false,
    };
  }

  const docsUrl = buildDocsUrl(infrastructure.deploymentMode);
  const setupGuidance = buildSetupGuidance(infrastructure);
  const connectionSummary = infrastructure.discoveryHealthy
    ? 'Discovery is reachable, but the graph still has no indexed resources yet.'
    : 'The discovery connector is not reachable from the API right now.';

  return {
    answer:
      `${connectionSummary} Connect or discover the resources first so I can inspect the architecture and resource relationships. ` +
      `${setupGuidance} Docs: ${docsUrl}.`,
    needsClarification: false,
  };
}

function buildActualStateResponse(
  question: string,
  topic: QuestionTopic,
  infrastructure: ChatInfrastructureSnapshot
): ChatResponse {
  const totalResources = sumResourceCounts(infrastructure.resourceCounts);
  const docsUrl = buildDocsUrl(infrastructure.deploymentMode);
  const resourceSummary = summarizeResourceCounts(infrastructure.resourceCounts);
  const sampleResources = infrastructure.sampleResources
    .slice(0, 3)
    .map((resource) => serializeResource(resource));
  const sampleSummary = sampleResources.length > 0 ? ` Examples: ${sampleResources.join('; ')}.` : '';

  if (totalResources <= 0 || !infrastructure.discoveryHealthy) {
    return buildConnectionRequiredResponse(infrastructure);
  }

  const summarySuffix = resourceSummary ? ` across ${resourceSummary}` : '';
  return {
    answer:
      `I found ${totalResources} indexed resource${totalResources === 1 ? '' : 's'}${summarySuffix}.${sampleSummary} ` +
      `I still need a provider, service, region, or resource name to break "${question}" down accurately.`,
    needsClarification: true,
    clarifyingQuestion: buildClarifyingQuestion(topic),
  };
}

function serializeHistory(history: ChatTurn[]): string {
  return history
    .slice(-6)
    .map((turn) => {
      const contextSummary = turn.contextItems?.length
        ? `\nContext:\n${summarizeChatContextItems(turn.contextItems)}`
        : '';

      return `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}${contextSummary}`;
    })
    .join('\n');
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/, '')
      .trim();
  }
  return trimmed;
}

function buildFallbackResponse(
  question: string,
  resources: Resource_Model[],
  contextItems: ChatContextItem[] = [],
  infrastructure?: ChatInfrastructureSnapshot
): ChatResponse {
  const topic = inferQuestionTopic(question);

  if (resources.length === 0) {
    if (isGeneralTopic(topic)) {
      return buildGeneralFallbackResponse(topic);
    }

    if (infrastructure) {
      return buildActualStateResponse(question, topic, infrastructure);
    }

    return {
      answer:
        `I could not match "${question}" to any connected infrastructure yet. ` +
        'Connect or discover the resources first, and then I can inspect the architecture and resource relationships.',
      needsClarification: false,
    };
  }

  const firstBatch = serializeResources(resources);
  const needsClarification = resources.length > 3;
  return {
    answer: `I found ${resources.length} matching resource${resources.length === 1 ? '' : 's'}:\n${firstBatch}`,
    needsClarification,
    clarifyingQuestion: needsClarification
      ? 'Which resource should I expand on, or do you want a provider-specific summary?'
      : undefined,
  };
}

function shouldUseConnectionGuidance(
  resources: Resource_Model[],
  infrastructure?: ChatInfrastructureSnapshot
): boolean {
  if (resources.length > 0) {
    return false;
  }

  if (!infrastructure) {
    return true;
  }

  return sumResourceCounts(infrastructure.resourceCounts) <= 0 || !infrastructure.discoveryHealthy;
}

async function tryOpenAiResponse(
  question: string,
  resources: Resource_Model[],
  history: ChatTurn[],
  contextItems: ChatContextItem[] = [],
  infrastructure?: ChatInfrastructureSnapshot
): Promise<ChatResponse | null> {
  const topic = inferQuestionTopic(question);
  const infraSummary = infrastructure
    ? {
        deploymentMode: infrastructure.deploymentMode,
        discovery: {
          healthy: infrastructure.discoveryHealthy,
          running: infrastructure.discoveryRunning,
          lastRun: infrastructure.discoveryLastRun,
          nextRun: infrastructure.discoveryNextRun,
        },
        totalResources: sumResourceCounts(infrastructure.resourceCounts),
        resourceCounts: infrastructure.resourceCounts,
        sampleResources: infrastructure.sampleResources.slice(0, 3).map((resource) => ({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          provider: resource.provider,
          region: resource.region ?? null,
          state: resource.state ?? null,
        })),
      }
    : null;
  const contextSummary = summarizeChatContextItems(contextItems);
  const systemPrompt =
    resources.length === 0 && contextItems.length === 0
      ? isGeneralTopic(topic)
        ? 'You are the CIG assistant. You may answer brief conversational questions, explain CIG capabilities, and help the user phrase better infrastructure questions. Return strict JSON with keys: answer (string), needsClarification (boolean), clarifyingQuestion (string or null), cypher (string or null). If live data is unavailable, say that plainly and guide the user toward a more specific next prompt.'
        : infrastructure
        ? 'You are the CIG assistant. The API already checked the real infrastructure state, including whether discovery is reachable, whether any resources are indexed, and a small sample of actual resources. Return strict JSON with keys: answer (string), needsClarification (boolean), clarifyingQuestion (string or null), cypher (string or null). If the graph is empty or discovery is unreachable, explain that plainly and tell the user to connect or discover the resources first. Do not ask a clarifying question in that case. If resources exist but the question is too broad, mention the actual resource counts or sample resources before asking a targeted clarifying question.'
        : 'You are the CIG assistant. No matching infrastructure context was found for the user question. Return strict JSON with keys: answer (string), needsClarification (boolean), clarifyingQuestion (string or null), cypher (string or null). If the connector has no connected resources or discovery has not indexed the architecture yet, tell the user to connect or discover the resources first instead of asking for clarification.'
      : 'You are the CIG assistant. Answer from the provided infrastructure and chat context. Return strict JSON with keys: answer (string), needsClarification (boolean), clarifyingQuestion (string or null), cypher (string or null). If the context is insufficient, set needsClarification to true and ask one concise question. Use linked resources, attachments, code snippets, and voice transcripts when present.';

  const content = await runChatCompletion({
    jsonMode: true,
    temperature: resources.length === 0 ? 0.45 : 0.2,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          recentHistory: serializeHistory(history),
          infrastructureContext: serializeResources(resources),
          chatContext: contextSummary,
          infrastructureSnapshot: infraSummary,
          matchedResources: resources.map((resource) => ({
            id: resource.id,
            name: resource.name,
            type: resource.type,
            provider: resource.provider,
            region: resource.region ?? null,
            state: resource.state ?? null,
            tags: resource.tags,
          })),
        }),
      },
    ],
  });

  if (!content) {
    return null;
  }

  const normalized = stripJsonFence(content);

  try {
    const parsed = JSON.parse(normalized) as Partial<ChatResponse>;
    if (typeof parsed.answer !== 'string' || typeof parsed.needsClarification !== 'boolean') {
      return {
        answer: normalized,
        needsClarification: false,
      };
    }

    return {
      answer: parsed.answer,
      needsClarification: parsed.needsClarification,
      clarifyingQuestion:
        typeof parsed.clarifyingQuestion === 'string' && parsed.clarifyingQuestion.trim()
          ? parsed.clarifyingQuestion.trim()
          : undefined,
      cypher:
        typeof parsed.cypher === 'string' && parsed.cypher.trim()
          ? parsed.cypher.trim()
          : undefined,
    };
  } catch {
    return {
      answer: normalized,
      needsClarification: false,
    };
  }
}

function isInfrastructureSnapshot(
  value: ChatContextOrInfrastructure
): value is ChatInfrastructureSnapshot {
  return Boolean(
    value &&
      !Array.isArray(value) &&
      typeof value === 'object' &&
      'resourceCounts' in value &&
      'sampleResources' in value &&
      'deploymentMode' in value
  );
}

function resolveChatInputs(
  history: ChatTurn[],
  contextItemsOrInfrastructure: ChatContextOrInfrastructure,
  infrastructure: ChatInfrastructureSnapshot | undefined
): {
  history: ChatTurn[];
  contextItems: ChatContextItem[];
  infrastructure: ChatInfrastructureSnapshot | undefined;
} {
  if (isInfrastructureSnapshot(contextItemsOrInfrastructure)) {
    return {
      history,
      contextItems: [],
      infrastructure: contextItemsOrInfrastructure,
    };
  }

  return {
    history,
    contextItems: contextItemsOrInfrastructure ?? [],
    infrastructure,
  };
}

export async function answerChatQuestion(
  question: string,
  resources: Resource_Model[],
  history: ChatTurn[] = [],
  contextItemsOrInfrastructure: ChatContextOrInfrastructure = [],
  infrastructure?: ChatInfrastructureSnapshot
): Promise<ChatResponse> {
  const normalized = resolveChatInputs(history, contextItemsOrInfrastructure, infrastructure);
  const fallback = buildFallbackResponse(
    question,
    resources,
    normalized.contextItems,
    normalized.infrastructure
  );

  if (shouldUseConnectionGuidance(resources, normalized.infrastructure)) {
    return fallback;
  }

  const aiResponse = await tryOpenAiResponse(
    question,
    resources,
    normalized.history,
    normalized.contextItems,
    normalized.infrastructure
  );
  return aiResponse ?? fallback;
}
