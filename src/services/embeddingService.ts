import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { config } from '../config';
import logger from '../utils/logger';
import redisService from './redisService';

export function getEmbeddings() {
    return new OpenAIEmbeddings({ 
        openAIApiKey: config.OPENAI_API_KEY,
        modelName: "text-embedding-ada-002" // Using a default model name
    });
}

export async function getAndStoreEmbedding(userId: string, messageId: string, text: string): Promise<number[]> {
    try {
        const embeddings = getEmbeddings();
        const embedding = await embeddings.embedQuery(text);
        const redis = await redisService;
        await redis.storeEmbedding(userId, messageId, embedding);
        return embedding;
    } catch (error) {
        logger.error('Error getting and storing embedding', { error, userId, messageId });
        throw error;
    }
}

export async function findMostSimilarEmbedding(
    userId: string,
    targetEmbedding: number[]
): Promise<{ similarity: number; messageId: string }> {
    try {
        const redis = await redisService;
        const storedEmbeddings = await redis.getEmbeddings(userId);
        let maxSimilarity = -Infinity;
        let mostSimilarMessageId = '';

        for (const [messageId, embedding] of Object.entries(storedEmbeddings)) {
            const similarity = cosineSimilarity(targetEmbedding, embedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                mostSimilarMessageId = messageId;
            }
        }

        return { similarity: maxSimilarity, messageId: mostSimilarMessageId };
    } catch (error) {
        logger.error('Error finding most similar embedding', { error, userId });
        throw error;
    }
}

export async function batchEmbedDocuments(texts: string[]): Promise<number[][]> {
    try {
        const embeddings = getEmbeddings();
        return await embeddings.embedDocuments(texts);
    } catch (error) {
        logger.error('Error batch embedding documents', { error });
        throw error;
    }
}

export function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, _, i) => sum + a[i] * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
