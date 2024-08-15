// src/__tests__/whatsappService.test.ts

import axios from 'axios';
import { sendWhatsappResponse } from '../../services/whatsappService';
import { config } from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/errorHandler';

jest.mock('axios');
jest.mock('../config', () => ({
  config: {
    WHATSAPP_PHONE_NUMBER_ID: 'mock_phone_number_id',
    WHATSAPP_TOKEN: 'mock_token'
  }
}));
jest.mock('../utils/logger');

describe('WhatsApp Service', () => {
  const mockTo = '+1234567890';
  const mockBody = 'Test message';
  const mockWhatsAppApiUrl = `https://graph.facebook.com/v20.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a WhatsApp message successfully', async () => {
    const mockResponse = {
      data: {
        messages: [{ id: 'mock_message_id' }]
      }
    };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    await sendWhatsappResponse(mockTo, mockBody);

    expect(axios.post).toHaveBeenCalledWith(
      mockWhatsAppApiUrl,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: mockTo,
        type: "text",
        text: { body: mockBody }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(logger.info).toHaveBeenCalledWith(
      'WhatsApp message sent successfully',
      { to: mockTo, messageId: 'mock_message_id' }
    );
  });

  it('should throw an AppError when sending a WhatsApp message fails', async () => {
    const mockError = new Error('API Error');
    (axios.post as jest.Mock).mockRejectedValue(mockError);

    await expect(sendWhatsappResponse(mockTo, mockBody)).rejects.toThrow(AppError);
    await expect(sendWhatsappResponse(mockTo, mockBody)).rejects.toThrow('Failed to send WhatsApp message');

    expect(logger.error).toHaveBeenCalledWith(
      'Error sending WhatsApp message:',
      mockError.message
    );
  });

  it('should log the response data when the API returns an error', async () => {
    const mockErrorResponse = {
      response: {
        data: { error: 'API Error Details' }
      }
    };
    (axios.post as jest.Mock).mockRejectedValue(mockErrorResponse);

    await expect(sendWhatsappResponse(mockTo, mockBody)).rejects.toThrow(AppError);

    expect(logger.error).toHaveBeenCalledWith(
      'Error sending WhatsApp message:',
      mockErrorResponse.response.data
    );
  });
});