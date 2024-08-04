import { processMessage } from '../messageController';
import { redisService } from '../../services/redisService';
import { sendWhatsappResponse } from '../../services/whatsappService';
import { getGPTResponse } from '../../services/openaiService';
import { TextMessage } from '../../models/message';
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
            isArchived: false,
            model: 'gpt-4o'
        };

        (redisService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
        (getGPTResponse as jest.Mock).mockResolvedValue('Hello, human!');
        (sendWhatsappResponse as jest.Mock).mockResolvedValue(undefined);
        (redisService.saveConversation as jest.Mock).mockResolvedValue(undefined);

        await processMessage(mockMessage);

        expect(redisService.getConversation).toHaveBeenCalledWith('user123');
        expect(getGPTResponse).toHaveBeenCalledWith('hello, ai!', 'gpt-4o');
        expect(sendWhatsappResponse).toHaveBeenCalledWith('user123', 'Hello, human!');
        expect(redisService.saveConversation).toHaveBeenCalledWith('user123', expect.objectContaining({
            id: 'conv123',
            llmType: 'openai',
        }));
    });

    // ... other tests remain the same
});