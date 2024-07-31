import { startServer } from './server';
import { config } from './config';
import logger from './utils/logger';

async function main() {
    try {
        await startServer(config.PORT);
        logger.info(`Server started on port ${config.PORT}`);
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();
