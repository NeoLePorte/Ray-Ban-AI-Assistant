import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';

const WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

export async function sendWhatsappResponse(to: string, body: string): Promise<void> {
    const message = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: body }
    };

    try {
        const response = await axios.post(WHATSAPP_API_URL, message, {
            headers: {
                'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        logger.info('WhatsApp message sent successfully', { to, messageId: response.data.messages[0].id });
    } catch (error: any) {
        logger.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        throw new AppError('Failed to send WhatsApp message', 500);
    }
}