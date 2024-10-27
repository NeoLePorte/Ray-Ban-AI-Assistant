import { Request, Response } from 'express';
import { config } from '../config';
import logger from '../utils/logger';
import { processMessage } from './messageController';
import MessagingResponse = require('twilio/lib/twiml/MessagingResponse');

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    const { From, Body, NumMedia } = req.body;
    logger.info('Received Twilio webhook request', { body: req.body });

    try {
        if (From !== config.AUTHORIZED_PHONE_NUMBER) {
            logger.warn('Unauthorized sender', { From });
            const twiml = new MessagingResponse();
            twiml.message('Unauthorized number');
            res.type('text/xml').send(twiml.toString());
            return;
        }

        const mediaUrls = [];
        for (let i = 0; i < parseInt(NumMedia || '0'); i++) {
            mediaUrls.push(req.body[`MediaUrl${i}`]);
        }

        // Process message first
        await processMessage(From, { text: Body, mediaUrls });
        
        // Send success response after processing
        const twiml = new MessagingResponse();
        twiml.message('Message processed successfully');
        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        logger.error('Error handling Twilio webhook', { 
            error: error instanceof Error ? error.message : error
        });
        const twiml = new MessagingResponse();
        twiml.message('An error occurred processing your message.');
        res.type('text/xml').send(twiml.toString());
    }
}
