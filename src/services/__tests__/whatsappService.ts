// src/services/__tests__/whatsappService.test.ts

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { sendWhatsappResponse } from '../whatsappService';
import { config } from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/errorHandler';

jest.mock('../../utils/logger');

describe('whatsappService', () => {
    const mockAxios = new MockAdapter(axios);
    const WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    afterEach(() => {
        mockAxios.reset();
        jest.clearAllMocks();
    });

    it('should send WhatsApp message successfully', async () => {
        const to = '1234567890';
        const body = 'Hello, this is a test message!';
        const messageId = 'fake_message_id';

        // Mocking the successful API response
        mockAxios.onPost(WHATSAPP_API_URL).reply(200, {
            messages: [{ id: messageId }],
        });

        await sendWhatsappResponse(to, body);

        expect(mockAxios.history.post.length).toBe(1);
        expect(mockAxios.history.post[0].url).toBe(WHATSAPP_API_URL);
        expect(mockAxios.history.post[0].data).toBe(JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: body },
        }));

        expect(mockAxios.history.post[0].headers).toEqual(expect.objectContaining({
            'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
        }));

        // Check if the logger.info was called with the correct parameters
        expect(logger.info).toHaveBeenCalledWith('WhatsApp message sent successfully', { to, messageId });
    });

    it('should handle error when sending WhatsApp message fails', async () => {
        const to = '1234567890';
        const body = 'Hello, this is a test message!';
        const errorResponse = {
            error: {
                message: 'Error sending message',
                type: 'OAuthException',
                code: 190,
            },
        };

        // Mocking the failed API response
        mockAxios.onPost(WHATSAPP_API_URL).reply(400, errorResponse);

        await expect(sendWhatsappResponse(to, body)).rejects.toThrow(AppError);
        await expect(sendWhatsappResponse(to, body)).rejects.toThrow('Failed to send WhatsApp message');

        // Check if the logger.error was called with the correct parameters
        expect(logger.error).toHaveBeenCalledWith('Error sending WhatsApp message:', errorResponse);

        // Ensure that logger.error is called with the error message
        expect(logger.error).toHaveBeenCalledWith(
            'Error sending WhatsApp message:',
            expect.objectContaining({ error: errorResponse.error })
        );
    });

    it('should handle network errors gracefully', async () => {
        const to = '1234567890';
        const body = 'Hello, this is a test message!';
        const errorMessage = 'Network Error';

        // Simulate a network error
        mockAxios.onPost(WHATSAPP_API_URL).networkError();

        await expect(sendWhatsappResponse(to, body)).rejects.toThrow(AppError);
        await expect(sendWhatsappResponse(to, body)).rejects.toThrow('Failed to send WhatsApp message');

        // Ensure that logger.error is called with the error message
        expect(logger.error).toHaveBeenCalledWith(
            'Error sending WhatsApp message:',
            errorMessage
        );
    });
});
