import { Router, Request, Response } from 'express';
import { config } from '../config';
import logger from '../utils/logger';
import { processMessage } from './messageController';
import { AppError } from '../utils/errorHandler';
import { Message, TextMessage, ImageMessage } from '../models/message';

const router = Router();

// Use the environment variable for the authorized number
const AUTHORIZED_NUMBER = `${config.AUTHORIZED_WHATSAPP_NUMBER}`;

router.get('/', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
        logger.info('Webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        logger.warn('Failed webhook verification', { mode, token });
        res.sendStatus(403);
    }
});

router.post('/', async (req: Request, res: Response) => {
    const { body } = req;

    // Log the entire body to understand what data is being received
    logger.info('Received webhook data', { body });

    if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field === 'messages') {
                    const messages = change.value.messages;
                    if (Array.isArray(messages)) {
                        for (const incomingMessage of messages) {
                            try {
                                const incomingNumber = incomingMessage.from;

                                // Log incoming number and expected number
                                logger.info('Received message', { incomingNumber, expectedNumber: AUTHORIZED_NUMBER });

                                if (incomingNumber === AUTHORIZED_NUMBER) {
                                    const message = convertWhatsAppMessageToInternalFormat(incomingMessage);
                                    await processMessage(message);
                                } else {
                                    logger.warn('Unauthorized message attempt', { from: incomingNumber });
                                }
                            } catch (error) {
                                logger.error('Error processing message', { error });
                            }
                        }
                    } else {
                        // Log a warning if messages are not in the expected format
                        logger.warn('Messages field is not an array', { value: change.value });
                    }
                }
            }
        }
        res.sendStatus(200);
    } else {
        logger.warn('Received non-WhatsApp Business account webhook', { object: body.object });
        res.sendStatus(404);
    }
});

// Ensure the message format is compatible with the latest updates
function convertWhatsAppMessageToInternalFormat(whatsappMessage: any): Message {
    const baseMessage = {
        id: whatsappMessage.id,
        timestamp: new Date(Number(whatsappMessage.timestamp) * 1000), // Convert UNIX timestamp
        from: whatsappMessage.from,
        role: 'user' as const,
    };

    switch (whatsappMessage.type) {
        case 'text':
            if (!whatsappMessage.text || !whatsappMessage.text.body) {
                logger.warn('Invalid text message format', { message: whatsappMessage });
                throw new AppError('Invalid text message format', 400);
            }
            return {
                ...baseMessage,
                type: 'text',
                content: whatsappMessage.text.body,
            } as TextMessage;
        case 'image':
            if (!whatsappMessage.image || !whatsappMessage.image.id) {
                logger.warn('Invalid image message format', { message: whatsappMessage });
                throw new AppError('Invalid image message format', 400);
            }
            return {
                ...baseMessage,
                type: 'image',
                imageUrl: whatsappMessage.image.id, // Assuming image.id contains the URL or ID
                caption: whatsappMessage.image.caption || '',
            } as ImageMessage;
        default:
            logger.warn(`Unsupported message type: ${whatsappMessage.type}`);
            throw new AppError(`Unsupported message type: ${whatsappMessage.type}`, 400);
    }
}

export default router;
