import { RedisService } from '../../services/redisService';
import { Redis } from 'ioredis';
import { Document } from 'langchain/document';
import logger from '../../utils/logger';
import { Conversation, SUPPORTED_MODELS } from '../../models/conversation';
import { RedisVectorStore } from "langchain/vectorstores/redis";

jest.mock('ioredis');
jest.mock('langchain/vectorstores/redis');
jest.mock('langchain/embeddings/openai');
jest.mock('../../utils/logger');

describe('RedisService', () => {
    let redisService: RedisService;
    let mockRedis: jest.Mocked<Redis>;
    let mockVectorStore: jest.Mocked<RedisVectorStore>;

    beforeEach(async () => {
        mockRedis = new Redis() as jest.Mocked<Redis>;
        mockVectorStore = {
            addDocuments: jest.fn(),
            similaritySearch: jest.fn(),
        } as unknown as jest.Mocked<RedisVectorStore>;

        // Mock the RedisVectorStore constructor
        (RedisVectorStore as unknown as jest.Mock).mockImplementation(() => mockVectorStore);

        redisService = await RedisService.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize the RedisService and VectorStore successfully', async () => {
            expect(redisService).toBeInstanceOf(RedisService);
            expect(logger.info).toHaveBeenCalledWith('Redis service initialized successfully');
        });

        it('should fail to initialize the RedisService if there is an error', async () => {
            jest.spyOn(RedisService.prototype as any, 'initVectorStore').mockRejectedValue(new Error('Init error'));
            await expect(RedisService.initialize()).rejects.toThrow('Init error');
            expect(logger.error).toHaveBeenCalledWith('Failed to initialize Redis service', expect.any(Object));
        });
    });

    describe('Embedding Handling', () => {
        it('should store embedding', async () => {
            const embedding = [0.1, 0.2, 0.3];
            await redisService.storeEmbedding('user-1', 'msg-1', embedding);

            expect(mockRedis.set).toHaveBeenCalledWith('embedding:user-1:msg-1', JSON.stringify(embedding));
            expect(logger.info).toHaveBeenCalledWith('Embedding stored in Redis', { userId: 'user-1', messageId: 'msg-1' });
        });

        it('should get embeddings', async () => {
            const mockEmbeddings: { [key: string]: string } = {
                'embedding:user-1:msg-1': '[0.1,0.2,0.3]'
            };
            mockRedis.keys.mockResolvedValue(Object.keys(mockEmbeddings));
            mockRedis.get.mockImplementation(key => Promise.resolve(mockEmbeddings[String(key)] || null));

            const embeddings = await redisService.getEmbeddings('user-1');

            expect(embeddings).toEqual({ 'msg-1': [0.1, 0.2, 0.3] });
            expect(logger.info).toHaveBeenCalledWith('Embeddings retrieved from Redis', { userId: 'user-1', count: 1 });
        });
    });

    describe('Conversation Handling', () => {
        it('should save conversation', async () => {
            const conversation: Conversation = {
                id: 'conv-1',
                userId: 'user-1',
                model: SUPPORTED_MODELS[0],
                messages: [{
                    id: 'msg-1',
                    role: 'user',
                    timestamp: new Date(),
                    from: 'user-1',
                    type: 'text',
                    content: 'Hello'
                }],
                createdAt: new Date(),
                updatedAt: new Date(),
                isArchived: false,
                userContext: '',
            };

            await redisService.saveConversation('user-1', conversation);

            expect(mockVectorStore.addDocuments).toHaveBeenCalledWith([expect.any(Document)]);
            expect(mockRedis.set).toHaveBeenCalledWith('document_count', '1');
            expect(logger.info).toHaveBeenCalledWith('Conversation saved to Redis', { conversationId: 'conv-1', userId: 'user-1' });
        });

        it('should get conversation', async () => {
            const mockResults = [{
                pageContent: JSON.stringify([{ 
                    id: 'msg-1', 
                    role: 'user', 
                    timestamp: new Date(), 
                    from: 'user-1', 
                    type: 'text', 
                    content: 'Hello' 
                }]),
                metadata: {
                    conversationId: 'conv-1'
                }
            }];
            mockVectorStore.similaritySearch.mockResolvedValue(mockResults.map(result => new Document(result)));

            const conversation = await redisService.getConversation('user-1');

            expect(conversation?.messages).toEqual([{
                id: 'msg-1',
                role: 'user',
                timestamp: expect.any(Date),
                from: 'user-1',
                type: 'text',
                content: 'Hello',
            }]);
            expect(logger.info).toHaveBeenCalledWith('Conversation retrieved from Redis', { userId: 'user-1' });
        });

        it('should delete conversation', async () => {
            const mockResults = [{
                pageContent: '',
                metadata: { conversationId: 'conv-1' }
            }];
            mockVectorStore.similaritySearch.mockResolvedValue(mockResults.map(result => new Document(result)));

            await redisService.deleteConversation('user-1');

            expect(mockRedis.del).toHaveBeenCalledWith('doc:conv-1');
            expect(mockRedis.set).toHaveBeenCalledWith('document_count', '0');
            expect(logger.info).toHaveBeenCalledWith('Conversation deleted from Redis', { userId: 'user-1', deletedCount: 1 });
        });
    });

    describe('Vector Store Handling', () => {
        it('should add documents to vector store and update document count', async () => {
            const documents = [new Document({ pageContent: 'Doc content', metadata: {} })];
            await redisService.addDocuments(documents);

            expect(mockVectorStore.addDocuments).toHaveBeenCalledWith(documents);
            expect(mockRedis.set).toHaveBeenCalledWith('document_count', '1');
            expect(logger.info).toHaveBeenCalledWith(`Added ${documents.length} documents to vector store`);
        });

        it('should perform similarity search', async () => {
            const documents = [new Document({ pageContent: 'Doc content', metadata: {} })];
            mockVectorStore.similaritySearch.mockResolvedValue(documents);

            const results = await redisService.similaritySearch('query', 2);

            expect(results).toEqual(documents);
            expect(logger.info).toHaveBeenCalledWith('Performed similarity search for query', { query: 'query', resultCount: documents.length });
        });

        it('should delete all documents from vector store', async () => {
            const keys = ['doc:1', 'doc:2'];
            mockRedis.keys.mockResolvedValue(keys);

            await redisService.deleteAllDocuments();

            expect(mockRedis.del).toHaveBeenCalledWith(...keys);
            expect(mockRedis.set).toHaveBeenCalledWith('document_count', '0');
            expect(logger.info).toHaveBeenCalledWith('All documents deleted from Redis', { deletedCount: keys.length });
        });
    });

    describe('User Context Handling', () => {
        it('should store user context', async () => {
            await redisService.storeUserContext('user-1', 'User context');

            expect(mockVectorStore.addDocuments).toHaveBeenCalledWith([expect.any(Document)]);
            expect(mockRedis.set).toHaveBeenCalledWith('document_count', '1');
            expect(logger.info).toHaveBeenCalledWith('User context stored in Redis', { userId: 'user-1' });
        });

        it('should get user context', async () => {
            const mockResults = [{
                pageContent: 'User context',
                metadata: {}
            }];
            mockVectorStore.similaritySearch.mockResolvedValue(mockResults.map(result => new Document(result)));

            const context = await redisService.getUserContext('user-1');

            expect(context).toBe('User context');
            expect(logger.info).toHaveBeenCalledWith('User context retrieved from Redis', { userId: 'user-1' });
        });
    });

    describe('Connection Handling', () => {
        it('should close connection', async () => {
            await redisService.close();

            expect(mockRedis.quit).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('Redis connection closed successfully');
        });
    });
});