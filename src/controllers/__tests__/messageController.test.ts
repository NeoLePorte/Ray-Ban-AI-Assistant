import { processMessage } from '../messageController';
import { redisService } from '../../services/redisService';
import { sendWhatsappResponse } from '../../services/whatsappService';
import { getGPTResponse, getGPTImageResponse } from '../../services/openaiService';
import { getClaudeResponse, getClaudeImageResponse } from '../../services/anthropicService';
import { downloadMedia, encodeImage, getMediaLink } from '../../services/mediaService';
import { TextMessage, ImageMessage } from '../../models/message';
import { Conversation, LLMType } from '../../models/conversation';

jest.mock('../../services/redisService');
jest.mock('../../services/whatsappService');
jest.mock('../../services/openaiService');
jest.mock('../../services/anthropicService');
jest.mock('../../services/mediaService');

describe('messageController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process a text message correctly with GPT model', async () => {
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
            llmType: 'gpt-4o' as LLMType, // Use GPT model
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            model: 'gpt-4o'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (getGPTResponse as jest.Mock).mockResolvedValue('Hello, human!');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user123');
        expect(getGPTResponse).toHaveBeenCalledWith('hello, ai!', 'gpt-4o'); // Ensure it matches the mock input message
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user123', 'Hello, human!');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user123', expect.objectContaining({
            id: 'conv123',
            llmType: 'gpt-4o' as LLMType,
        }));
    });

    it('should process a text message correctly with Claude model', async () => {
        const mockMessage: TextMessage = {
            id: '127',
            role: 'user',
            type: 'text',
            content: 'tell me a joke',
            from: 'user127',
            timestamp: new Date()
        };

        const mockConversation: Conversation = {
            id: 'conv127',
            userId: 'user127',
            llmType: 'claude-3-5-sonnet-20240620' as LLMType, // Use Claude model
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            model: 'claude-3-5-sonnet-20240620'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (getClaudeResponse as jest.Mock).mockResolvedValue('Why did the chicken cross the road? To get to the other side!');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user127');
        expect(getClaudeResponse).toHaveBeenCalledWith('tell me a joke', 'claude-3-5-sonnet-20240620'); // Include model in the call
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user127', 'Why did the chicken cross the road? To get to the other side!');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user127', expect.objectContaining({
            id: 'conv127',
            llmType: 'claude-3-5-sonnet-20240620' as LLMType,
        }));
    });

    it('should process an image message correctly with GPT model', async () => {
        const mockMessage: ImageMessage = {
            id: '128',
            role: 'user',
            type: 'image',
            imageUrl: 'http://example.com/image.jpg',
            caption: "What's in this image?",
            from: 'user128',
            timestamp: new Date()
        };

        const mockConversation: Conversation = {
            id: 'conv128',
            userId: 'user128',
            llmType: 'gpt-4o' as LLMType, // Use GPT model
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            model: 'gpt-4o'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (getMediaLink as jest.Mock).mockResolvedValue('http://example.com/image.jpg'); // Mock media link retrieval
        (downloadMedia as jest.Mock).mockResolvedValue('/tmp/image.jpg');
        (encodeImage as jest.Mock).mockResolvedValue('base64encodedimage');
        (getGPTImageResponse as jest.Mock).mockResolvedValue('I see a dog in the image.');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user128');
        expect(getMediaLink).toHaveBeenCalledWith('http://example.com/image.jpg'); // Verify media link retrieval
        expect(downloadMedia).toHaveBeenCalledWith('http://example.com/image.jpg');
        expect(encodeImage).toHaveBeenCalledWith('/tmp/image.jpg');
        expect(getGPTImageResponse).toHaveBeenCalledWith("What's in this image?", 'base64encodedimage', 'gpt-4o'); // Include the model argument
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user128', 'I see a dog in the image.');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user128', expect.objectContaining({
            id: 'conv128',
            llmType: 'gpt-4o' as LLMType,
        }));
    });

    it('should process an image message correctly with Claude model', async () => {
        const mockMessage: ImageMessage = {
            id: '124',
            role: 'user',
            type: 'image',
            imageUrl: 'http://example.com/image.jpg',
            caption: "What's in this image?",
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
            isArchived: false,
            model: 'claude-3-5-sonnet-20240620'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (getMediaLink as jest.Mock).mockResolvedValue('http://example.com/image.jpg'); // Mock media link retrieval
        (downloadMedia as jest.Mock).mockResolvedValue('/tmp/image.jpg');
        (encodeImage as jest.Mock).mockResolvedValue('base64encodedimage');
        (getClaudeImageResponse as jest.Mock).mockResolvedValue('I see a cat in the image.');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user123');
        expect(getMediaLink).toHaveBeenCalledWith('http://example.com/image.jpg'); // Verify media link retrieval
        expect(downloadMedia).toHaveBeenCalledWith('http://example.com/image.jpg');
        expect(encodeImage).toHaveBeenCalledWith('/tmp/image.jpg');
        expect(getClaudeImageResponse).toHaveBeenCalledWith("What's in this image?", 'base64encodedimage', 'claude-3-5-sonnet-20240620'); // Include the model argument
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user123', 'I see a cat in the image.');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user123', expect.objectContaining({
            id: 'conv124',
            llmType: 'anthropic',
        }));
    });

    it('should switch LLM and send response with alias', async () => {
        const mockMessage: TextMessage = {
            id: '125',
            role: 'user',
            type: 'text',
            content: 'switch to 4o', // Use alias here
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
            isArchived: false,
            model: 'claude-3-5-sonnet-20240620'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user125');
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user125', 'Switched to 4o. How can I assist you?');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user125', expect.objectContaining({
            id: 'conv125',
            llmType: 'gpt-4o', // Ensure it switched to OpenAI
            model: 'gpt-4o',    // Ensure model field is also updated
        }));
    });

    it('should throw an error for invalid model alias', async () => {
        const mockMessage: TextMessage = {
            id: '126',
            role: 'user',
            type: 'text',
            content: 'switch to invalid-model',
            from: 'user126',
            timestamp: new Date()
        };

        const mockConversation: Conversation = {
            id: 'conv126',
            userId: 'user126',
            llmType: 'gpt-4o' as LLMType,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            model: 'gpt-4o'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user126');
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user126', 'Error: Invalid AI model specified. Please choose from: 4o, mini, opus, sonnet.');
    });
});
