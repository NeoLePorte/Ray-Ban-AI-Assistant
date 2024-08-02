import { processMessage } from '../messageController';
import { redisService } from '../../services/redisService';
import { sendWhatsappResponse } from '../../services/whatsappService';
import { getGPTResponse,  } from '../../services/openaiService';
import { getClaudeImageResponse } from '../../services/anthropicService';
import { downloadMedia, encodeImage } from '../../services/mediaService';
import { TextMessage, ImageMessage } from '../../models/message';
import { Conversation } from '../../models/conversation';

jest.mock('../../services/redisService');
jest.mock('../../services/whatsappService');
jest.mock('../../services/openaiService');
jest.mock('../../services/anthropicService');
jest.mock('../../services/mediaService');

describe('messageController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process a text message correctly', async () => {
        const mockMessage: TextMessage = {
            id: '123',
            role: 'user',
            type: 'text',
            content: 'hello, ai!',
            from: 'user123',
            timestamp: new Date()
        };

        const mockConversation: Conversation = {
            id: 'conv123',
            userId: 'user123',
            llmType: 'openai',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (getGPTResponse as jest.Mock).mockResolvedValue('Hello, human!');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user123');
        expect(getGPTResponse).toHaveBeenCalledWith('Hello, AI!');
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user123', 'Hello, human!');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user123', expect.objectContaining({
            id: 'conv123',
            llmType: 'openai',
        }));
    });

    it('should process an image message correctly', async () => {
        const mockMessage: ImageMessage = {
            id: '124',
            role: 'user',
            type: 'image',
            imageUrl: 'http://example.com/image.jpg',
            caption: 'What\'s in this image?',
            from: 'user123',
            timestamp: new Date()
        };

        const mockConversation: Conversation = {
            id: 'conv124',
            userId: 'user123',
            llmType: 'anthropic',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (downloadMedia as jest.Mock).mockResolvedValue('/tmp/image.jpg');
        (encodeImage as jest.Mock).mockResolvedValue('base64encodedimage');
        (getClaudeImageResponse as jest.Mock).mockResolvedValue('I see a cat in the image.');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user123');
        expect(downloadMedia).toHaveBeenCalledWith('http://example.com/image.jpg');
        expect(encodeImage).toHaveBeenCalledWith('/tmp/image.jpg');
        expect(getClaudeImageResponse).toHaveBeenCalledWith('What\'s in this image?', 'base64encodedimage'); // Use getClaudeImageResponse
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user123', 'I see a cat in the image.');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user123', expect.objectContaining({
            id: 'conv124',
            llmType: 'anthropic',
        }));
    });

    it('should switch LLM and send response', async () => {
        const mockMessage: TextMessage = {
            id: '125',
            role: 'user',
            type: 'text',
            content: 'switch to openai',
            from: 'user125',
            timestamp: new Date()
        };

        const mockConversation: Conversation = {
            id: 'conv125',
            userId: 'user125',
            llmType: 'anthropic', // Assume previous type
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user125');
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user125', 'Switched to openai. How can I assist you?');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user125', expect.objectContaining({
            id: 'conv125',
            llmType: 'openai', // Ensure it switched to OpenAI
        }));
    });
});
