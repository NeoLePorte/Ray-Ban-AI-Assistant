import { processMessage } from '../../controllers/messageController';
import { Message, TextMessage, ImageMessage, DocumentMessage } from '../../models/message';
import { Conversation } from '../../models/conversation';
import * as ragService from '../../services/ragService';
import { redisService } from '../../services/redisService';
import { sendWhatsappResponse } from '../../services/whatsappService';
import logger from '../../utils/logger';
import { AppError } from '../../utils/errorHandler';

jest.mock('../services/ragService');
jest.mock('../services/redisService');
jest.mock('../services/whatsappService');
jest.mock('../utils/logger');

describe('MessageController', () => {
    let mockConversation: Conversation;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockConversation = {
            id: 'conv-1',
            userId: 'user-1',
            model: 'gpt-4o',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            userContext: '',
        };

        ((await redisService).getConversation as jest.Mock).mockResolvedValue(mockConversation);
        ((await redisService).saveConversation as jest.Mock).mockResolvedValue(undefined);
    });

    describe('processMessage', () => {
        it('should process a text message and generate a response', async () => {
            const mockTextMessage: TextMessage = {
                id: 'msg-1',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'text',
                content: 'Hello',
            };

            (ragService.generateAnswer as jest.Mock).mockResolvedValue('Hi there!');

            await processMessage(mockTextMessage);

            expect(ragService.generateAnswer).toHaveBeenCalledWith('Hello', mockConversation.model, '');
            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'Hi there!');
            expect((await redisService).saveConversation).toHaveBeenCalled();
        });

        it('should process an image message and analyze the image', async () => {
            const mockImageMessage: ImageMessage = {
                id: 'msg-2',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'image',
                imageUrl: 'http://example.com/image.jpg',
            };

            (ragService.analyzeImageAndRetrieveInfo as jest.Mock).mockResolvedValue('This is an image of a cat.');

            await processMessage(mockImageMessage);

            expect(ragService.analyzeImageAndRetrieveInfo).toHaveBeenCalledWith(mockImageMessage.imageUrl, "What's in this image?", mockConversation.model);
            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'This is an image of a cat.');
            expect((await redisService).saveConversation).toHaveBeenCalled();
        });

        it('should process a document message and add it to the vector store', async () => {
            const mockDocumentMessage: DocumentMessage = {
                id: 'msg-3',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'document',
                content: 'Document content',
                mimeType: 'application/pdf',
                documentBuffer: Buffer.from('dummy buffer'),
            };

            (ragService.addPDFToVectorStore as jest.Mock).mockResolvedValue(undefined);

            await processMessage(mockDocumentMessage);

            expect(ragService.addPDFToVectorStore).toHaveBeenCalledWith(mockDocumentMessage.documentBuffer, { userId: 'user-1' });
            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'Document processed and added to your knowledge base. You can now ask questions about its content.');
            expect((await redisService).saveConversation).toHaveBeenCalled();
        });

        it('should handle unsupported message types by throwing an AppError', async () => {
            const mockUnsupportedMessage: any = {
                id: 'msg-4',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'unsupported',
            };

            await expect(processMessage(mockUnsupportedMessage)).rejects.toThrow(AppError);
            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'Error: Unsupported message type: {"id":"msg-4","role":"user","timestamp":"...","from":"user-1","type":"unsupported"}');
        });

        it('should update user context when context: is provided', async () => {
            const mockTextMessage: TextMessage = {
                id: 'msg-1',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'text',
                content: 'context: update my context',
            };

            await processMessage(mockTextMessage);

            expect((await redisService).saveConversation).toHaveBeenCalledWith('user-1', expect.objectContaining({ userContext: 'update my context' }));
            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'User context updated successfully.');
        });

        it('should handle model switching', async () => {
            const mockTextMessage: TextMessage = {
                id: 'msg-1',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'text',
                content: 'switch to claude',
            };

            await processMessage(mockTextMessage);

            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'Switched to claude. How can I assist you?');
            expect((await redisService).saveConversation).toHaveBeenCalledWith('user-1', expect.objectContaining({ model: 'claude' }));
        });

        it('should handle errors and send appropriate error messages', async () => {
            const mockTextMessage: TextMessage = {
                id: 'msg-1',
                role: 'user',
                timestamp: new Date(),
                from: 'user-1',
                type: 'text',
                content: 'Hello',
            };

            (ragService.generateAnswer as jest.Mock).mockRejectedValue(new Error('Test error'));

            await processMessage(mockTextMessage);

            expect(logger.error).toHaveBeenCalledWith('Error processing message', expect.objectContaining({ error: expect.any(Error), messageId: 'msg-1', userId: 'user-1' }));
            expect(sendWhatsappResponse).toHaveBeenCalledWith('user-1', 'Sorry, I encountered an error while processing your message.');
        });
    });
});
