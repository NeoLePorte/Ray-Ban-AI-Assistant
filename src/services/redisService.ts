import { RedisVectorStore } from 'langchain/vectorstores/redis';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';
import { Conversation, LLMType } from '../models/conversation';
import { Document } from 'langchain/document';

export const SUPPORTED_MODELS: LLMType[] = [
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229'
];

export class RedisClientWrapper {
    private client: RedisClientType;
    private vectorStore: RedisVectorStore | null = null;
    private embeddings: OpenAIEmbeddings;
    private initialized: boolean = false;

    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL,
            password: process.env.REDIS_PASSWORD
        });

        this.client.on('error', (err) => {
            logger.error('Redis Client Error', { error: err.message });
        });

        // Ensure we're using text-embedding-3-small model consistently
        this.embeddings = new OpenAIEmbeddings({
            modelName: 'text-embedding-3-small'
        });
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.client.connect();
            logger.info('Connected to Redis');

            // Test RediSearch capability
            try {
                await this.client.sendCommand(['FT._LIST']);
            } catch (error) {
                throw new Error(
                    'RediSearch module not detected. Please ensure you are using redis-stack image: ' +
                    (error instanceof Error ? error.message : String(error))
                );
            }

            this.vectorStore = new RedisVectorStore(
                this.embeddings,
                {
                    redisClient: this.client,
                    indexName: 'conversations',
                    keyPrefix: 'conversation:'
                }
            );

            await this.vectorStore.createIndex();
            this.initialized = true;
            logger.info('Redis vector store initialized successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error initializing Redis', { error: errorMessage });
            throw error;
        }
    }

    async getConversation(userId: string): Promise<Conversation | null> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            const key = `user:${userId}:conversation`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error retrieving conversation from Redis', { error: errorMessage, userId });
            throw error;
        }
    }

    async saveConversation(userId: string, conversation: Conversation): Promise<void> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Save the full conversation data
            const key = `user:${userId}:conversation`;
            await this.client.set(key, JSON.stringify(conversation));

            // Also store as a document in the vector store
            if (this.vectorStore) {
                const conversationText = conversation.messages
                    .map(msg => `${msg.role}: ${msg.content}`)
                    .join('\n');
                
                await this.vectorStore.addDocuments([
                    new Document({
                        pageContent: conversationText,
                        metadata: { userId, conversationId: conversation.id }
                    })
                ]);
            }

            logger.info('Conversation saved successfully', { userId });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error saving conversation to Redis', { error: errorMessage, userId });
            throw error;
        }
    }

    async similaritySearch(query: string, k: number = 3) {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        return await this.vectorStore.similaritySearch(query, k);
    }

    async addDocuments(documents: Document[]): Promise<void> {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        await this.vectorStore.addDocuments(documents);
    }
    async deleteAllDocuments(): Promise<void> {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        await this.vectorStore.delete({ deleteAll: true });
    }

    async storeEmbedding(userId: string, messageId: string, embedding: number[]): Promise<void> {
        try {
            const key = `embeddings:${userId}`;
            const existingData = await this.client.hGet(key, 'embeddings');
            const embeddings = existingData ? JSON.parse(existingData) : {};
            
            embeddings[messageId] = embedding;
            await this.client.hSet(key, 'embeddings', JSON.stringify(embeddings));
            
            logger.info('Embedding stored successfully', { userId, messageId });
        } catch (error) {
            logger.error('Error storing embedding', { error, userId, messageId });
            throw error;
        }
    }

    async getEmbeddings(userId: string): Promise<Record<string, number[]>> {
        const pattern = `embeddings:${userId}:*`;
        const keys = await this.client.keys(pattern);
        const result: Record<string, number[]> = {};
        
        for (const key of keys) {
            const messageId = key.split(':')[2];
            const embedding = await this.client.get(key);
            if (embedding) {
                result[messageId] = JSON.parse(embedding);
            }
        }
        
        return result;
    }

    async findMostSimilarEmbedding(userId: string, queryEmbedding: number[]): Promise<{ similarity: number; messageId: string }> {
        const key = `embeddings:${userId}`;
        const existingData = await this.client.hGet(key, 'embeddings');
        if (!existingData) {
            return { similarity: 0, messageId: '' };
        }

        const embeddings: Record<string, number[]> = JSON.parse(existingData);
        let maxSimilarity = -1;
        let bestMessageId = '';
        
        for (const [messageId, embedding] of Object.entries(embeddings)) {
            const similarity = this.cosineSimilarity(queryEmbedding, embedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMessageId = messageId;
            }
        }
        
        return { similarity: maxSimilarity, messageId: bestMessageId };
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
}

// Add at the bottom:
const redisClient = new RedisClientWrapper();
export default redisClient;
