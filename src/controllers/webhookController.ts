import { Request, Response } from 'express';
import { config } from '../config';
import logger from '../utils/logger';
import { processMessage } from './messageController';
import MessagingResponse = require('twilio/lib/twiml/MessagingResponse');

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    logger.info('Received Twilio webhook request', { body: req.body });
    const { From, Body, NumMedia } = req.body;

    if (From !== config.AUTHORIZED_PHONE_NUMBER) {
        logger.warn('Unauthorized sender', { From });
        res.sendStatus(403);
        return;
    }

    const twiml = new MessagingResponse();

    try {
        // Collect all media URLs
        const mediaUrls = [];
        for (let i = 0; i < parseInt(NumMedia); i++) {
            mediaUrls.push(req.body[`MediaUrl${i}`]);
        }

        // Process message asynchronously
        processMessage(From, { text: Body, mediaUrls }).catch(error => {
            logger.error('Error processing message', { error, From });
        });

        // Respond immediately to Twilio
        twiml.message('Your message has been received and is being processed.');
    } catch (error) {
        logger.error('Error handling Twilio webhook', { error });
        twiml.message('Sorry, there was an error processing your message.');
    }

    res.type('text/xml').send(twiml.toString());
}
