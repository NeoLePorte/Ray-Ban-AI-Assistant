import express from 'express';
import { handleTwilioWebhook } from './controllers/webhookController';
import { errorHandler } from './utils/errorHandler';
import logger from './utils/logger';
import { config } from './config';

export const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (_, res) => {
    res.send('Ray-Ban AI Assistant is running!');
});

// Webhook routes
app.post('/twilio-webhook', async (req, res, next) => {
    try {
        await handleTwilioWebhook(req, res);
    } catch (error) {
        next(error);
    }
});

// Error handling
app.use(errorHandler);

export function startServer(port: number = config.PORT): Promise<void> {
    return new Promise((resolve) => {
        app.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
            resolve();
        });
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });
}
