import express from 'express';
import  webhookController  from './controllers/webhookController';
import errorHandler from './utils/errorHandler';
import logger from './utils/logger';

export const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send('Ray-Ban AI Assistant is running!');
});

app.use('/webhook', webhookController);

// Error handling
app.use(errorHandler);

export function startServer(port: number): Promise<void> {
    return new Promise((resolve) => {
        app.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
            resolve();
        });
    });
}
