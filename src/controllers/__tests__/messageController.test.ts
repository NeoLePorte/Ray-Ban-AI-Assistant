import { processMessage } from '../messageController';
import { Conversation } from '../../models/conversation';
import * as ragService from '../../services/ragService';
import redisService from '../../services/redisService';
import { sendMMS } from '../../services/twilioService';
import logger from '../../utils/logger';

jest.mock('../../services/ragService');
jest.mock('../../services/redisService');
jest.mock('../../services/twilioService');
jest.mock('../../utils/logger');
describe('MessageController', () => {
    let mockRedisService: jest.Mocked<typeof redisService>;
    let mockConversation: Conversation;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConversation = {
            id: 'conv-1',
            userId: '1234567890',
            model: 'gpt-4o',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            userContext: '',
        };

        mockRedisService = {
            getConversation: jest.fn().mockResolvedValue(mockConversation),
            saveConversation: jest.fn().mockResolvedValue(undefined),
            deleteConversation: jest.fn().mockResolvedValue(undefined),
            archiveConversation: jest.fn().mockResolvedValue(undefined),
            getArchivedConversation: jest.fn().mockResolvedValue(mockConversation),
            getArchivedConversationsKeys: jest.fn().mockResolvedValue(['conv-1']),
            storeEmbedding: jest.fn().mockResolvedValue(undefined),
            getEmbeddings: jest.fn().mockResolvedValue({}),
            deleteDocuments: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<typeof redisService>;

        Object.assign(redisService, mockRedisService);
    });

    describe('processMessage', () => {
        it('should process a text message and generate a response', async () => {
            const senderId = '1234567890';
            const receivedMessage = {
                text: 'Hello',
            };

            (ragService.generateAnswer as jest.Mock).mockResolvedValue('Hi there!');

            await processMessage(senderId, receivedMessage);

            expect(ragService.generateAnswer).toHaveBeenCalledWith('Hello', 'gpt-4o', '');
            expect(sendMMS).toHaveBeenCalledWith('1234567890', 'Hi there!', undefined);
            expect(mockRedisService.saveConversation).toHaveBeenCalled();
        });

        it('should process an image message and analyze the image', async () => {
            const senderId = '1234567890';
            const receivedMessage = {
                mediaUrl: 'http://example.com/image.jpg',
            };

            (ragService.analyzeImageAndRetrieveInfo as jest.Mock).mockResolvedValue('This is an image of a cat.');

            await processMessage(senderId, receivedMessage);

            expect(ragService.analyzeImageAndRetrieveInfo).toHaveBeenCalledWith(expect.any(String), "What's in this image?", 'gpt-4o');
            expect(sendMMS).toHaveBeenCalledWith('1234567890', 'This is an image of a cat.', 'http://example.com/image.jpg');
            expect(mockRedisService.saveConversation).toHaveBeenCalled();
        });

        it('should handle model switching', async () => {
            const senderId = '1234567890';
            const receivedMessage = {
                text: 'switch to claude-3-opus-20240229',
            };

            await processMessage(senderId, receivedMessage);

            expect(sendMMS).toHaveBeenCalledWith('1234567890', 'Switched to claude-3-opus-20240229. How can I assist you?', undefined);
            expect(mockRedisService.saveConversation).toHaveBeenCalledWith('1234567890', expect.objectContaining({ model: 'claude-3-opus-20240229' }));
        });

        it('should handle location-based queries', async () => {
            const senderId = '1234567890';
            const receivedMessage = {
                text: 'in New York, what\'s the weather?',
            };

            (ragService.getLocationBasedInfo as jest.Mock).mockResolvedValue('The weather in New York is sunny.');

            await processMessage(senderId, receivedMessage);

            expect(ragService.getLocationBasedInfo).toHaveBeenCalledWith('New York', 'what\'s the weather?', 'gpt-4o');
            expect(sendMMS).toHaveBeenCalledWith('1234567890', 'The weather in New York is sunny.', undefined);
        });

        it('should handle errors and send appropriate error messages', async () => {
            const senderId = '1234567890';
            const receivedMessage = {
                text: 'Hello',
            };

            (ragService.generateAnswer as jest.Mock).mockRejectedValue(new Error('Test error'));

            await processMessage(senderId, receivedMessage);

            expect(logger.error).toHaveBeenCalledWith('Error processing message', expect.any(Object));
            expect(sendMMS).toHaveBeenCalledWith('1234567890', 'Sorry, I encountered an error while processing your message.', undefined);
        });
    });
});
