import { getAndStoreEmbedding, findMostSimilarEmbedding, batchEmbedDocuments, cosineSimilarity } from '../embeddingService';
import { RedisService } from '../redisService';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import logger from '../../utils/logger';
import mockRedisClient from '../../__mocks__/redisClient.mock';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});
jest.mock('langchain/embeddings/openai');
jest.mock('../redisService');
jest.mock('../../utils/logger');
jest.mock('../../config', () => ({
    config: {
        OPENAI_API_KEY: 'test-api-key',
        EMBEDDING_MODEL: 'test-model'
    }
}));

describe('embeddingService', () => {
    let mockRedisService: jest.Mocked<RedisService>;
    let mockEmbeddings: jest.Mocked<OpenAIEmbeddings>;

    beforeEach(() => {
        // Mock RedisService
        mockRedisService = {
            storeEmbedding: jest.fn(),
            getEmbeddings: jest.fn(),
        } as unknown as jest.Mocked<RedisService>;
        (RedisService as jest.MockedClass<typeof RedisService>).mockImplementation(() => mockRedisService);

        // Mock OpenAIEmbeddings
        mockEmbeddings = {
            embedQuery: jest.fn(),
            embedDocuments: jest.fn(),
        } as unknown as jest.Mocked<OpenAIEmbeddings>;
        (OpenAIEmbeddings as jest.Mock).mockImplementation(() => mockEmbeddings);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAndStoreEmbedding', () => {
        it('should store the embedding in Redis and return it', async () => {
            const userId = 'user-1';
            const messageId = 'msg-1';
            const text = 'Hello world';
            const mockEmbedding = [0.1, 0.2, 0.3];
            
            mockEmbeddings.embedQuery.mockResolvedValue(mockEmbedding);

            const result = await getAndStoreEmbedding(userId, messageId, text);

            expect(result).toEqual(mockEmbedding);
            expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith(text);
            expect(mockRedisService.storeEmbedding).toHaveBeenCalledWith(userId, messageId, mockEmbedding);
        });

        it('should log an error and throw if embedding fails', async () => {
            const userId = 'user-1';
            const messageId = 'msg-1';
            const text = 'Hello world';
            const mockError = new Error('Embedding Error');
            
            mockEmbeddings.embedQuery.mockRejectedValue(mockError);

            await expect(getAndStoreEmbedding(userId, messageId, text)).rejects.toThrow(mockError);
            expect(logger.error).toHaveBeenCalledWith('Error getting and storing embedding', { error: mockError, userId, messageId });
        });
    });

    describe('findMostSimilarEmbedding', () => {
        it('should return the most similar embedding and its messageId', async () => {
            const userId = 'user-1';
            const targetEmbedding = [0.1, 0.2, 0.3];
            const storedEmbeddings = {
                'msg-1': [0.1, 0.2, 0.3],
                'msg-2': [0.4, 0.5, 0.6]
            };
            
            mockRedisService.getEmbeddings.mockResolvedValue(storedEmbeddings);

            const result = await findMostSimilarEmbedding(userId, targetEmbedding);

            expect(result).toEqual({ similarity: 1, messageId: 'msg-1' });
            expect(mockRedisService.getEmbeddings).toHaveBeenCalledWith(userId);
        });

        it('should log an error and throw if retrieval fails', async () => {
            const userId = 'user-1';
            const targetEmbedding = [0.1, 0.2, 0.3];
            const mockError = new Error('Redis Error');
            
            mockRedisService.getEmbeddings.mockRejectedValue(mockError);

            await expect(findMostSimilarEmbedding(userId, targetEmbedding)).rejects.toThrow(mockError);
            expect(logger.error).toHaveBeenCalledWith('Error finding most similar embedding', { error: mockError, userId });
        });
    });

    describe('batchEmbedDocuments', () => {
        it('should embed documents and return their embeddings', async () => {
            const texts = ['Hello', 'world'];
            const mockEmbeddingsArray = [[0.1, 0.2], [0.3, 0.4]];
            
            mockEmbeddings.embedDocuments.mockResolvedValue(mockEmbeddingsArray);

            const result = await batchEmbedDocuments(texts);

            expect(result).toEqual(mockEmbeddingsArray);
            expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(texts);
        });

        it('should log an error and throw if embedding documents fails', async () => {
            const texts = ['Hello', 'world'];
            const mockError = new Error('Batch Embedding Error');
            
            mockEmbeddings.embedDocuments.mockRejectedValue(mockError);

            await expect(batchEmbedDocuments(texts)).rejects.toThrow(mockError);
            expect(logger.error).toHaveBeenCalledWith('Error batch embedding documents', { error: mockError });
        });
    });

    describe('cosineSimilarity', () => {
        it('should calculate and return the correct cosine similarity', () => {
            const vectorA = [1, 2, 3];
            const vectorB = [1, 2, 3];
            const expectedSimilarity = 1; // because they are identical vectors

            const result = cosineSimilarity(vectorA, vectorB);

            expect(result).toBeCloseTo(expectedSimilarity, 5);
        });

        it('should handle orthogonal vectors', () => {
            const vectorA = [1, 0, 0];
            const vectorB = [0, 1, 0];
            const expectedSimilarity = 0; // because they are orthogonal

            const result = cosineSimilarity(vectorA, vectorB);

            expect(result).toBeCloseTo(expectedSimilarity, 5);
        });
    });
});