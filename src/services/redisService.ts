import { Redis } from 'ioredis';
import { RedisVectorStore } from "langchain/vectorstores/redis";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import { config } from '../config';
import logger from '../utils/logger';
import { Conversation } from '../models/conversation';

export const SUPPORTED_MODELS: string[] = [
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229'
];

class RedisClientWrapper {
    private client: Redis;

    constructor(client: Redis) {
        this.client = client;
    }

    async ft_create(...args: any[]): Promise<any> {
        return this.client.call('FT.CREATE', ...args);
    }

    async ft_search(...args: any[]): Promise<any> {
        return this.client.call('FT.SEARCH', ...args);
    }

    async ft_info(...args: any[]): Promise<any> {
        return this.client.call('FT.INFO', ...args);
    }

    async json_set(...args: any[]): Promise<any> {
        return this.client.call('JSON.SET', ...args);
    }

    async json_get(...args: any[]): Promise<any> {
        return this.client.call('JSON.GET', ...args);
    }

    async json_del(...args: any[]): Promise<any> {
        return this.client.call('JSON.DEL', ...args);
    }
}

class RedisService {
    private redis: Redis;
    private vectorStore!: RedisVectorStore;
    private documentCount: number = 0;

    private constructor() {
        this.redis = new Redis(config.REDIS_URL);
    }

    public static async initialize(): Promise<RedisService> {
        const service = new RedisService();
        try {
            await service.initVectorStore();
            await service.loadDocumentCount();
            logger.info('Redis service initialized successfully');
            return service;
        } catch (error) {
            logger.error('Failed to initialize Redis service', { error });
            throw error;
        }
    }

    private async initVectorStore() {
        try {
            const embeddings = new OpenAIEmbeddings({ openAIApiKey: config.OPENAI_API_KEY });
            const wrappedClient = new RedisClientWrapper(this.redis);
            this.vectorStore = new RedisVectorStore(embeddings, {
                redisClient: wrappedClient as any,
                indexName: "ray-ban-ai-assistant",
                keyPrefix: "doc:",
            });
            logger.info('Vector store initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize vector store', { error });
            throw error;
        }
    }

    private async loadDocumentCount() {
        try {
            const count = await this.redis.get('document_count');
            this.documentCount = count ? parseInt(count, 10) : 0;
            logger.info('Document count loaded', { count: this.documentCount });
        } catch (error) {
            logger.error('Failed to load document count', { error });
            this.documentCount = 0;
        }
    }

    async storeEmbedding(userId: string, messageId: string, embedding: number[]): Promise<void> {
        try {
            const key = `embedding:${userId}:${messageId}`;
            await this.redis.set(key, JSON.stringify(embedding));
            logger.info('Embedding stored in Redis', { userId, messageId });
        } catch (error) {
            logger.error('Error storing embedding in Redis', { error, userId, messageId });
            throw error;
        }
    }

    async getEmbeddings(userId: string): Promise<Record<string, number[]>> {
        try {
            const keys = await this.redis.keys(`embedding:${userId}:*`);
            const embeddings: Record<string, number[]> = {};

            for (const key of keys) {
                const messageId = key.split(':').pop();
                const embedding = await this.redis.get(key);
                if (embedding && messageId) {
                    embeddings[messageId] = JSON.parse(embedding);
                }
            }

            logger.info('Embeddings retrieved from Redis', { userId, count: keys.length });
            return embeddings;
        } catch (error) {
            logger.error('Error retrieving embeddings from Redis', { error, userId });
            throw error;
        }
    }

    private async updateDocumentCount(delta: number) {
        this.documentCount += delta;
        await this.redis.set('document_count', this.documentCount.toString());
    }

    async saveConversation(userId: string, conversation: Conversation): Promise<void> {
        try {
            const conversationDoc = new Document({
                pageContent: JSON.stringify(conversation.messages),
                metadata: { userId, conversationId: conversation.id, type: 'conversation' }
            });
            await this.vectorStore.addDocuments([conversationDoc]);
            await this.updateDocumentCount(1);
            logger.info('Conversation saved to Redis', { conversationId: conversation.id, userId });
        } catch (error) {
            logger.error('Error saving conversation to Redis', { error, userId });
            throw error;
        }
    }

    async getConversation(userId: string): Promise<Conversation | null> {
        try {
            const results = await this.vectorStore.similaritySearch(`userId:${userId} type:conversation`, 1);
            if (results.length > 0) {
                const conversation = JSON.parse(results[0].pageContent);
                logger.info('Conversation retrieved from Redis', { userId });
                return {
                    id: results[0].metadata.conversationId as string,
                    userId: userId,
                    model: SUPPORTED_MODELS[0],
                    messages: conversation,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isArchived: false,
                    userContext: ''
                } as Conversation;
            }
            logger.info('No conversation found in Redis', { userId });
            return null;
        } catch (error) {
            logger.error('Error getting conversation from Redis', { error, userId });
            throw error;
        }
    }

    async deleteConversation(userId: string): Promise<void> {
        try {
            const results = await this.vectorStore.similaritySearch(`userId:${userId} type:conversation`, 100);
            for (const doc of results) {
                const key = `doc:${doc.metadata.conversationId}`;
                await this.redis.del(key);
            }
            await this.updateDocumentCount(-results.length);
            logger.info('Conversation deleted from Redis', { userId, deletedCount: results.length });
        } catch (error) {
            logger.error('Error deleting conversation from Redis', { error, userId });
            throw error;
        }
    }

    async addDocuments(documents: Document[]): Promise<void> {
        try {
            await this.vectorStore.addDocuments(documents);
            await this.updateDocumentCount(documents.length);
            logger.info(`Added ${documents.length} documents to vector store`);
        } catch (error) {
            logger.error('Error adding documents to vector store', { error });
            throw error;
        }
    }

    async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
        try {
            const results = await this.vectorStore.similaritySearch(query, k);
            logger.info(`Performed similarity search for query`, { query, resultCount: results.length });
            return results;
        } catch (error) {
            logger.error('Error performing similarity search', { error, query });
            throw error;
        }
    }

    async storeUserContext(userId: string, context: string): Promise<void> {
        try {
            const contextDoc = new Document({
                pageContent: context,
                metadata: { userId, type: 'userContext' }
            });
            await this.vectorStore.addDocuments([contextDoc]);
            await this.updateDocumentCount(1);
            logger.info('User context stored in Redis', { userId });
        } catch (error) {
            logger.error('Error storing user context in Redis', { error, userId });
            throw error;
        }
    }

    async getUserContext(userId: string): Promise<string | null> {
        try {
            const results = await this.vectorStore.similaritySearch(`userId:${userId} type:userContext`, 1);
            if (results.length > 0) {
                logger.info('User context retrieved from Redis', { userId });
                return results[0].pageContent;
            }
            logger.info('No user context found in Redis', { userId });
            return null;
        } catch (error) {
            logger.error('Error retrieving user context from Redis', { error, userId });
            throw error;
        }
    }

    async deleteAllDocuments(): Promise<void> {
        try {
            const keys = await this.redis.keys('doc:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            await this.updateDocumentCount(-this.documentCount);
            logger.info('All documents deleted from Redis', { deletedCount: keys.length });
        } catch (error) {
            logger.error('Error deleting all documents from Redis', { error });
            throw error;
        }
    }

    getDocumentCount(): number {
        return this.documentCount;
    }

    async close(): Promise<void> {
        try {
            await this.redis.quit();
            logger.info('Redis connection closed successfully');
        } catch (error) {
            logger.error('Error closing Redis connection', { error });
            throw error;
        }
    }
}

const redisServicePromise = RedisService.initialize();
export { redisServicePromise as redisService, RedisService };