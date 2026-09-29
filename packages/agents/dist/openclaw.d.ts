import { ActionExecutor } from './openfang.js';
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
export interface RAGPipelineLike {
    assembleContext(query: string, history: ChatMessage[], topK?: number): Promise<string>;
}
export interface ActionIntent {
    type: string;
    resourceId: string;
    params: Record<string, unknown>;
}
export interface GraphRefinementResourceSummary {
    id: string;
    name: string;
    type: string;
    provider: string;
    region?: string;
    state?: string;
}
export interface GraphRefinementRelationshipSummary {
    id: string;
    type: string;
    fromId: string;
    toId: string;
}
export interface GraphRefinementSnapshot {
    resourceCounts: Record<string, number>;
    resources: GraphRefinementResourceSummary[];
    relationships: GraphRefinementRelationshipSummary[];
    discovery: {
        healthy: boolean;
        running: boolean;
        lastRun: string | null;
        nextRun: string | null;
    };
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
export interface OpenClawResponse {
    answer: string;
    cypher?: string;
    needsClarification: boolean;
    clarifyingQuestion?: string;
    action?: ActionIntent;
}
export declare class ConversationContext {
    private messages;
    private readonly maxTurns;
    private pendingAction?;
    addMessage(role: 'user' | 'assistant', content: string): void;
    getHistory(): ChatMessage[];
    setPendingAction(action: ActionIntent): void;
    getPendingAction(): ActionIntent | undefined;
    clearPendingAction(): void;
    clear(): void;
}
export declare class OpenClawAgent {
    private ragPipeline;
    private actionExecutor;
    private userId;
    private llm;
    private sessions;
    constructor(ragPipeline?: RAGPipelineLike | null, actionExecutor?: ActionExecutor | null, userId?: string);
    private fetchCostContext;
    private fetchSecurityContext;
    private getSession;
    query(input: string, sessionId?: string): Promise<OpenClawResponse>;
    generateCypher(naturalLanguage: string): Promise<string>;
    refineGraph(goal: string, snapshot: GraphRefinementSnapshot): Promise<GraphRefinementProposal>;
}
//# sourceMappingURL=openclaw.d.ts.map