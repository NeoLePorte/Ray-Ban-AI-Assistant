import { handleTwilioWebhook } from '../webhookController';
import { Request, Response } from 'express';
import { processMessage } from '../messageController';
import logger from '../../utils/logger';
import { config } from '../../config';

jest.mock('../messageController');
jest.mock('../../utils/logger');
jest.mock('../../config', () => ({
    AUTHORIZED_PHONE_NUMBER: '1234567890',
}));

describe('Webhook Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            sendStatus: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('handleTwilioWebhook', () => {
        it('should process a message from an authorized user', async () => {
            mockRequest.body = {
                From: config.AUTHORIZED_PHONE_NUMBER,
                Body: 'Hello',
            };
            await handleTwilioWebhook(mockRequest as Request, mockResponse as Response);
            expect(processMessage).toHaveBeenCalledWith(config.AUTHORIZED_PHONE_NUMBER, { text: 'Hello', mediaUrl: undefined });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith('EVENT_RECEIVED');
        });

        it('should not process a message from an unauthorized user', async () => {
            mockRequest.body = {
                From: 'unauthorized_number',
                Body: 'Hello',
            };
            await handleTwilioWebhook(mockRequest as Request, mockResponse as Response);
            expect(processMessage).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith('Unauthorized sender', { From: 'unauthorized_number' });
            expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
        });

        it('should handle errors and respond with 500', async () => {
            mockRequest.body = {
                From: config.AUTHORIZED_PHONE_NUMBER,
                Body: 'Hello',
            };
            (processMessage as jest.Mock).mockRejectedValue(new Error('Test error'));
            await handleTwilioWebhook(mockRequest as Request, mockResponse as Response);
            expect(logger.error).toHaveBeenCalledWith('Error handling Twilio webhook', expect.any(Object));
            expect(mockResponse.sendStatus).toHaveBeenCalledWith(500);
        });
    });
});
