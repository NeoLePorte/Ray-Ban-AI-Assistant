import { startServer } from './server';
import { config } from './config';
import logger from './utils/logger';
//import { OpenAI } from "langchain/llms/openai";
//import { ChatAnthropic } from "langchain/chat_models/anthropic";
import { RedisClientWrapper } from './services/redisService';

async function initializeApp() {
    try {
        const redisClient = new RedisClientWrapper();
        await redisClient.initialize();
        
        // Initialize LangChain models
        //const openAI = new OpenAI({ openAIApiKey: config.OPENAI_API_KEY });
        //const anthropic = new ChatAnthropic({ anthropicApiKey: config.ANTHROPIC_KEY });

        // You can add any other LangChain initializations here

        logger.info('LangChain initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize application', { error });
        process.exit(1);
    }
}

async function main() {
    try {
        await initializeApp();
        await startServer(config.PORT);
        logger.info(`Server started on port ${config.PORT}`);
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();
