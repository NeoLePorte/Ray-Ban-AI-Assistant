import { sendMMS } from '../twilioService';
import twilio from 'twilio';
import { config } from '../../config';
import logger from '../../utils/logger';

jest.mock('twilio');
jest.mock('../../utils/logger');

describe('twilioService', () => {
    const mockClient = {
        messages: {
            create: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (twilio as unknown as jest.Mock).mockImplementation(() => mockClient);
    });

    describe('sendMMS', () => {
        it('should send an MMS successfully', async () => {
            mockClient.messages.create.mockResolvedValue({ sid: 'SM123' });

            const to = '+1234567890';
            const body = 'Hello, this is a test message';
            const mediaUrl = 'http://example.com/image.jpg';

            await sendMMS(to, body, mediaUrl);

            expect(mockClient.messages.create).toHaveBeenCalledWith({
                from: config.TWILIO_PHONE_NUMBER,
                to,
                body,
                mediaUrl,
            });
            expect(logger.info).toHaveBeenCalledWith('MMS sent successfully', { to, body, mediaUrl });
        });

        it('should send an MMS without mediaUrl successfully', async () => {
            mockClient.messages.create.mockResolvedValue({ sid: 'SM123' });

            const to = '+1234567890';
            const body = 'Hello, this is a test message';

            await sendMMS(to, body);

            expect(mockClient.messages.create).toHaveBeenCalledWith({
                from: config.TWILIO_PHONE_NUMBER,
                to,
                body,
            });
            expect(logger.info).toHaveBeenCalledWith('MMS sent successfully', { to, body, mediaUrl: undefined });
        });

        it('should log an error if sending MMS fails', async () => {
            const error = new Error('Failed to send MMS');
            mockClient.messages.create.mockRejectedValue(error);

            const to = '+1234567890';
            const body = 'Hello, this is a test message';
            const mediaUrl = 'http://example.com/image.jpg';

            await expect(sendMMS(to, body, mediaUrl)).rejects.toThrow(error);

            expect(mockClient.messages.create).toHaveBeenCalledWith({
                from: config.TWILIO_PHONE_NUMBER,
                to,
                body,
                mediaUrl,
            });
            expect(logger.error).toHaveBeenCalledWith('Error sending MMS', { error, to, body, mediaUrl });
        });
    });
});
