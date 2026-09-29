"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGPipeline = exports.EmbeddingService = void 0;
const inference_1 = require("./inference");
function buildResourceText(resource) {
    const tags = resource.tags
        ? Object.entries(resource.tags)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')
        : '';
    const deps = resource.relationships ? resource.relationships.join(',') : '';
    return `${resource.name} ${resource.type} ${resource.provider} ${resource.region ?? ''} ${resource.state ?? ''} tags:${tags} deps:${deps}`.trim();
}
class EmbeddingService {
    async embedText(text) {
        const embedding = await (0, inference_1.runEmbedding)({ input: text });
        if (!embedding) {
            throw new Error('No embedding provider is configured.');
        }
        return embedding;
    }
    async embedResource(resource) {
        return this.embedText(buildResourceText(resource));
    }
}
exports.EmbeddingService = EmbeddingService;
class RAGPipeline {
    vectorStore;
    embeddingService;
    constructor(vectorStore, embeddingService) {
        this.vectorStore = vectorStore;
        this.embeddingService = embeddingService;
    }
    async indexResource(resource) {
        const embedding = await this.embeddingService.embedResource(resource);
        const doc = {
            id: resource.id,
            content: buildResourceText(resource),
            metadata: {
                name: resource.name,
                type: resource.type,
                provider: resource.provider,
                region: resource.region ?? '',
                state: resource.state ?? '',
            },
        };
        await this.vectorStore.addDocumentsWithEmbeddings([doc], [embedding]);
    }
    async indexResources(resources) {
        for (const resource of resources) {
            await this.indexResource(resource);
        }
    }
    async removeResource(id) {
        await this.vectorStore.deleteDocument(id);
    }
    async retrieve(query, topK = 10) {
        const embedding = await this.embeddingService.embedText(query);
        return this.vectorStore.query(embedding, topK);
    }
    async assembleContext(query, history, topK = 10) {
        const resources = await this.retrieve(query, topK);
        const resourceLines = resources
            .map((r) => {
            const m = r.metadata;
            const region = m.region ? `, ${m.region}` : '';
            return `- ${m.name} (${m.type}, ${m.provider}${region}): ${m.state ?? 'unknown'}`;
        })
            .join('\n');
        const historyLines = history
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');
        return `Infrastructure context:\n${resourceLines}\n\nConversation history:\n${historyLines}`;
    }
}
exports.RAGPipeline = RAGPipeline;
//# sourceMappingURL=rag.js.map