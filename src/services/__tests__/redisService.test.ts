import { RedisService } from '../redisService';
import mockRedisClient from '../../__mocks__/redisClient.mock' // Ensure this path is correct
import { RedisVectorStore } from 'langchain/vectorstores/redis';
import { Document } from 'langchain/document';
import logger from '../../utils/logger';
import { Conversation, SUPPORTED_MODELS } from '../../models/conversation';
import { RedisKey } from 'ioredis/built/utils/RedisCommander';
import { Message } from '../../models/message'; // Add this import

jest.mock('langchain/vectorstores/redis');
jest.mock('../../utils/logger');

describe('RedisService', () => {
    let mockVectorStore: jest.Mocked<RedisVectorStore>;
    let redisService: RedisService;

    beforeEach(async () => {
        mockVectorStore = new RedisVectorStore({} as any, {} as any) as jest.Mocked<RedisVectorStore>;
        // Directly mock the static methods
        jest.spyOn(RedisService, 'createRedisClient').mockResolvedValue(mockRedisClient);
        jest.spyOn(RedisService, 'createVectorStore').mockResolvedValue(mockVectorStore);

        redisService = await RedisService.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize RedisService correctly', async () => {
            const service = await RedisService.initialize();

            expect(RedisService.createRedisClient).toHaveBeenCalled();
            expect(RedisService.createVectorStore).toHaveBeenCalled();
            expect(service).toBeInstanceOf(RedisService);
        });
    });

    describe('Document Count Management', () => {
        it('should load the document count correctly', async () => {
            mockRedisClient.get.mockResolvedValue('5');

            await (redisService as any).loadDocumentCount();

            expect(redisService.getDocumentCount()).toBe(5);
            expect(logger.info).toHaveBeenCalledWith('Document count loaded', { count: 5 });
        });

        it('should update the document count correctly', async () => {
            await redisService.updateDocumentCount(2);

            expect(redisService.getDocumentCount()).toBe(2);
            expect(mockRedisClient.set).toHaveBeenCalledWith('document_count', '2');
        });
    });

    describe('Embedding Management', () => {
        it('should store embedding in Redis', async () => {
            const userId = 'user-1';
            const messageId = 'msg-1';
            const embedding = [0.1, 0.2, 0.3];

            await redisService.storeEmbedding(userId, messageId, embedding);

            expect(mockRedisClient.set).toHaveBeenCalledWith(`embedding:${userId}:${messageId}`, JSON.stringify(embedding));
            expect(logger.info).toHaveBeenCalledWith('Embedding stored in Redis', { userId, messageId });
        });

        it('should retrieve embeddings from Redis', async () => {
            const userId = 'user-1';
            const keys = [`embedding:${userId}:msg-1`, `embedding:${userId}:msg-2`];
            const embeddings: { [key: string]: number[] } = { 'msg-1': [0.1, 0.2, 0.3], 'msg-2': [0.4, 0.5, 0.6] };

            mockRedisClient.keys.mockResolvedValue(keys);
            mockRedisClient.get.mockImplementation((key: RedisKey) => {
                const messageId = key.toString().split(':').pop();
                return Promise.resolve(JSON.stringify(embeddings[messageId as string]));
            });

            const result = await redisService.getEmbeddings(userId);

            expect(result).toEqual(embeddings);
            expect(logger.info).toHaveBeenCalledWith('Embeddings retrieved from Redis', { userId, count: keys.length });
        });
    });

    describe('Conversation Management', () => {
        it('should save conversation to vector store', async () => {
            const userId = '1234567890'; // Messenger user IDs are typically numeric strings
            const conversation: Conversation = {
                id: 'conv-1',
                userId,
                model: SUPPORTED_MODELS[0],
                messages: [{ id: 'msg1', type: 'text', text: 'Hello', timestamp: Date.now() }] as Message[],
                createdAt: new Date(),
                updatedAt: new Date(),
                isArchived: false,
                userContext: ''
            };

            const conversationDoc = new Document({
                pageContent: JSON.stringify(conversation.messages),
                metadata: { userId, conversationId: conversation.id, type: 'conversation' },
            });

            await redisService.saveConversation(userId, conversation);

            expect(mockVectorStore.addDocuments).toHaveBeenCalledWith([conversationDoc]);
            expect(mockRedisClient.set).toHaveBeenCalledWith('document_count', '1');
            expect(logger.info).toHaveBeenCalledWith('Conversation saved to Redis', { conversationId: conversation.id, userId });
        });

        it('should retrieve conversation from vector store', async () => {
            const userId = '1234567890';
            const mockMessages: Message[] = [{ id: 'msg1', type: 'text', text: 'Hello', timestamp: Date.now() }];
            const mockResult = {
                pageContent: JSON.stringify(mockMessages),
                metadata: { conversationId: 'conv-1' },
            };
            const conversationDoc = new Document(mockResult);
            mockVectorStore.similaritySearch.mockResolvedValue([conversationDoc]);

            const result = await redisService.getConversation(userId);

            expect(result).toEqual({
                id: 'conv-1',
                userId: userId,
                model: SUPPORTED_MODELS[0],
                messages: mockMessages,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                isArchived: false,
                userContext: ''
            });
            expect(logger.info).toHaveBeenCalledWith('Conversation retrieved from Redis', { userId });
        });

        it('should delete conversation from Redis and update document count', async () => {
            const userId = 'user-1';
            const mockResult = {
                metadata: { conversationId: 'conv-1' },
            };

            mockVectorStore.similaritySearch.mockResolvedValue([{ ...mockResult, pageContent: 'mockPageContent' }]);
            mockRedisClient.del.mockResolvedValue(1);

            await redisService.deleteConversation(userId);

            expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(`userId:${userId} type:conversation`, 100);
            expect(mockRedisClient.del).toHaveBeenCalledWith('doc:conv-1');
            expect(mockRedisClient.set).toHaveBeenCalledWith('document_count', '0');
            expect(logger.info).toHaveBeenCalledWith('Conversation deleted from Redis', { userId, deletedCount: 1 });
        });

        it('should log an error if deleting conversation fails', async () => {
            const userId = 'user-1';
            const error = new Error('Redis error');

            mockVectorStore.similaritySearch.mockRejectedValue(error);

            await expect(redisService.deleteConversation(userId)).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith('Error deleting conversation from Redis', { error, userId });
        });
    });

    describe('Document Management', () => {
        it('should add documents to the vector store and update document count', async () => {
            const documents = [
                new Document({
                    pageContent: 'Content of document 1',
                    metadata: { source: 'doc1' },
                }),
                new Document({
                    pageContent: 'Content of document 2',
                    metadata: { source: 'doc2' },
                }),
            ];

            await redisService.addDocuments(documents);

            expect(mockVectorStore.addDocuments).toHaveBeenCalledWith(documents);
            expect(mockRedisClient.set).toHaveBeenCalledWith('document_count', '2');
            expect(logger.info).toHaveBeenCalledWith('Added 2 documents to vector store');
        });

        it('should delete all documents from Redis and reset document count', async () => {
            const keys = ['doc:1', 'doc:2'];

            mockRedisClient.keys.mockResolvedValue(keys);
            mockRedisClient.del.mockResolvedValue(keys.length);

            await redisService.deleteAllDocuments();

            expect(mockRedisClient.keys).toHaveBeenCalledWith('doc:*');
            expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
            expect(mockRedisClient.set).toHaveBeenCalledWith('document_count', '0');
            expect(logger.info).toHaveBeenCalledWith('All documents deleted from Redis', { deletedCount: keys.length });
        });

        it('should log an error if deleting all documents fails', async () => {
            const error = new Error('Redis error');

            mockRedisClient.keys.mockRejectedValue(error);

            await expect(redisService.deleteAllDocuments()).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith('Error deleting all documents from Redis', { error });
        });
    });

    describe('User Context Management', () => {
        it('should store user context in Redis', async () => {
            const userId = 'user-1';
            const context = 'user context data';

            const contextDoc = new Document({
                pageContent: context,
                metadata: { userId, type: 'userContext' }
            });

            await redisService.storeUserContext(userId, context);

            expect(mockVectorStore.addDocuments).toHaveBeenCalledWith([contextDoc]);
            expect(mockRedisClient.set).toHaveBeenCalledWith('document_count', '1');
            expect(logger.info).toHaveBeenCalledWith('User context stored in Redis', { userId });
        });

        it('should retrieve user context from Redis', async () => {
            const userId = 'user-1';
            const mockResult = {
                pageContent: 'user context data',
                metadata: { userId: 'user-1', type: 'userContext' },
            };
            const contextDoc = new Document({
                pageContent: mockResult.pageContent,
                metadata: mockResult.metadata,
            });
            mockVectorStore.similaritySearch.mockResolvedValue([contextDoc]);

            const result = await redisService.getUserContext(userId);

            expect(result).toBe('user context data');
            expect(logger.info).toHaveBeenCalledWith('User context retrieved from Redis', { userId });
        });

        it('should log an error if retrieving user context fails', async () => {
            const userId = 'user-1';
            const error = new Error('Redis error');

            mockVectorStore.similaritySearch.mockRejectedValue(error);

            await expect(redisService.getUserContext(userId)).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith('Error retrieving user context from Redis', { error, userId });
        });
    });

    describe('Connection Management', () => {
        it('should close the Redis connection', async () => {
            await redisService.close();

            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('Redis connection closed successfully');
        });

        it('should log an error if closing the Redis connection fails', async () => {
            const error = new Error('Redis error');

            mockRedisClient.quit.mockRejectedValue(error);

            await expect(redisService.close()).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith('Error closing Redis connection', { error });
        });
    });
});
