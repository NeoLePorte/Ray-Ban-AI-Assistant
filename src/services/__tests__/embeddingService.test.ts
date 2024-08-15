// src/__tests__/embeddingService.test.ts

import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { getAndStoreEmbedding, findMostSimilarEmbedding, batchEmbedDocuments } from '../../services/embeddingService';
import { redisService, RedisService } from '../../services/redisService';
import logger from '../../utils/logger';

jest.mock("langchain/embeddings/openai");
jest.mock('../../services/redisService');
jest.mock('../../utils/logger');

describe('Embedding Service', () => {
  const mockEmbedding = [0.1, 0.2, 0.3];
  const mockUserId = 'user123';
  const mockMessageId = 'message456';
  const mockText = 'Sample text';
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService = {
      storeEmbedding: jest.fn(),
      getEmbeddings: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;
    (redisService as unknown as jest.Mock).mockResolvedValue(mockRedisService);
  });

  describe('getAndStoreEmbedding', () => {
    it('should get embedding and store it in Redis', async () => {
      (OpenAIEmbeddings.prototype.embedQuery as jest.Mock).mockResolvedValue(mockEmbedding);
      mockRedisService.storeEmbedding.mockResolvedValue(undefined);

      const result = await getAndStoreEmbedding(mockUserId, mockMessageId, mockText);

      expect(OpenAIEmbeddings.prototype.embedQuery).toHaveBeenCalledWith(mockText);
      expect(mockRedisService.storeEmbedding).toHaveBeenCalledWith(mockUserId, mockMessageId, mockEmbedding);
      expect(result).toEqual(mockEmbedding);
    });

    it('should log and throw error if embedding fails', async () => {
      const mockError = new Error('Embedding failed');
      (OpenAIEmbeddings.prototype.embedQuery as jest.Mock).mockRejectedValue(mockError);

      await expect(getAndStoreEmbedding(mockUserId, mockMessageId, mockText)).rejects.toThrow('Embedding failed');
      expect(logger.error).toHaveBeenCalledWith('Error getting and storing embedding', expect.objectContaining({
        error: mockError,
        userId: mockUserId,
        messageId: mockMessageId
      }));
    });
  });

  describe('findMostSimilarEmbedding', () => {
    it('should find the most similar embedding', async () => {
      const mockStoredEmbeddings = {
        'message1': [0.1, 0.2, 0.3],
        'message2': [0.4, 0.5, 0.6],
        'message3': [0.7, 0.8, 0.9]
      };
      mockRedisService.getEmbeddings.mockResolvedValue(mockStoredEmbeddings);

      const targetEmbedding = [0.39, 0.49, 0.59];
      const result = await findMostSimilarEmbedding(mockUserId, targetEmbedding);

      expect(mockRedisService.getEmbeddings).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        similarity: expect.any(Number),
        messageId: 'message2'
      });
    });

    it('should log and throw error if finding similar embedding fails', async () => {
      const mockError = new Error('Redis retrieval failed');
      mockRedisService.getEmbeddings.mockRejectedValue(mockError);

      await expect(findMostSimilarEmbedding(mockUserId, [0.1, 0.2, 0.3])).rejects.toThrow('Redis retrieval failed');
      expect(logger.error).toHaveBeenCalledWith('Error finding most similar embedding', expect.objectContaining({
        error: mockError,
        userId: mockUserId
      }));
    });
  });

  describe('batchEmbedDocuments', () => {
    it('should batch embed documents', async () => {
      const mockTexts = ['text1', 'text2', 'text3'];
      const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]];
      (OpenAIEmbeddings.prototype.embedDocuments as jest.Mock).mockResolvedValue(mockEmbeddings);

      const result = await batchEmbedDocuments(mockTexts);

      expect(OpenAIEmbeddings.prototype.embedDocuments).toHaveBeenCalledWith(mockTexts);
      expect(result).toEqual(mockEmbeddings);
    });

    it('should log and throw error if batch embedding fails', async () => {
      const mockError = new Error('Batch embedding failed');
      (OpenAIEmbeddings.prototype.embedDocuments as jest.Mock).mockRejectedValue(mockError);

      await expect(batchEmbedDocuments(['text1', 'text2'])).rejects.toThrow('Batch embedding failed');
      expect(logger.error).toHaveBeenCalledWith('Error batch embedding documents', expect.objectContaining({
        error: mockError
      }));
    });
  });

  // Optional: Test for cosineSimilarity function if it's exported
  // describe('cosineSimilarity', () => {
  //   it('should calculate cosine similarity correctly', () => {
  //     const a = [1, 2, 3];
  //     const b = [4, 5, 6];
  //     const result = cosineSimilarity(a, b);
  //     expect(result).toBeCloseTo(0.9746318461970762, 6);
  //   });
  // });
});