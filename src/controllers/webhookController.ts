import { Router, Request, Response } from 'express';
import { config } from '../config';
import logger from '../utils/logger';
import { processMessage } from '../controllers/messageController';
import { AppError } from '../utils/errorHandler';
import { Message, TextMessage, ImageMessage } from '../models/message';

const router = Router();

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

    if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'messages') {
                    for (const incomingMessage of change.value.messages) {
                        try {
                            const message = convertWhatsAppMessageToInternalFormat(incomingMessage);
                            await processMessage(message);
                        } catch (error) {
                            if (error instanceof AppError) {
                                logger.error('AppError processing message:', error.message);
                            } else {
                                logger.error('Unexpected error processing message:', error);
                            }
                        }
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

function convertWhatsAppMessageToInternalFormat(whatsappMessage: any): Message {
    const baseMessage = {
        id: whatsappMessage.id,
        timestamp: new Date(Number(whatsappMessage.timestamp) * 1000),
        from: whatsappMessage.from,
        role: 'user' as const,
    };

    switch (whatsappMessage.type) {
        case 'text':
            return {
                ...baseMessage,
                type: 'text',
                content: whatsappMessage.text.body,
            } as TextMessage;
        case 'image':
            return {
                ...baseMessage,
                type: 'image',
                imageUrl: whatsappMessage.image.id, // We'll use the media ID as the URL for now
                caption: whatsappMessage.image.caption,
            } as ImageMessage;
        default:
            throw new AppError(`Unsupported message type: ${whatsappMessage.type}`, 400);
    }
}

export default router;