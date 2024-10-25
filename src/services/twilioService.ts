import twilio from 'twilio';
import { config } from '../config';
import logger from '../utils/logger';

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export async function sendMMS(to: string, body: string, mediaUrl?: string): Promise<void> {
    try {
        const message = {
            from: config.TWILIO_PHONE_NUMBER,
            to,
            body,
        };
        const messageOptions: any = {
            ...message,
            ...(mediaUrl && { mediaUrl })
        };

        await client.messages.create(messageOptions);
        logger.info('MMS sent successfully', { to, body, mediaUrl });
    } catch (error) {
        logger.error('Error sending MMS', { error, to, body, mediaUrl });
        throw error;
    }
}
