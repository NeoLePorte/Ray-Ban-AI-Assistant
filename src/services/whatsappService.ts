import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

export async function sendWhatsappResponse(to: string, body: string): Promise<void> {
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${config.WHATSAPP_SENDER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                text: { body }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        logger.info(`Message sent to ${to}`);
    } catch (error) {
        logger.error('Error sending WhatsApp message:', error);
        throw error;
    }
}
