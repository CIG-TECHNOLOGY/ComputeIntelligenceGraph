import { VectorStore, VectorDocument } from './vectordb';
import { ChatMessage } from './types';
export interface ResourceDoc {
    id: string;
    name: string;
    type: string;
    provider: string;
    region?: string;
    state?: string;
    tags?: Record<string, string>;
    relationships?: string[];
}
export declare class EmbeddingService {
    embedText(text: string): Promise<number[]>;
    embedResource(resource: ResourceDoc): Promise<number[]>;
}
export declare class RAGPipeline {
    private vectorStore;
    private embeddingService;
    constructor(vectorStore: VectorStore, embeddingService: EmbeddingService);
    indexResource(resource: ResourceDoc): Promise<void>;
    indexResources(resources: ResourceDoc[]): Promise<void>;
    removeResource(id: string): Promise<void>;
    retrieve(query: string, topK?: number): Promise<VectorDocument[]>;
    assembleContext(query: string, history: ChatMessage[], topK?: number): Promise<string>;
}
//# sourceMappingURL=rag.d.ts.map