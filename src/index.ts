import { startServer } from './server';
import { config } from './config';
import logger from './utils/logger';
//import { OpenAI } from "langchain/llms/openai";
//import { ChatAnthropic } from "langchain/chat_models/anthropic";

async function initializeLangChain() {
    // Initialize LangChain models
    //const openAI = new OpenAI({ openAIApiKey: config.OPENAI_API_KEY });
    //const anthropic = new ChatAnthropic({ anthropicApiKey: config.ANTHROPIC_KEY });

    // You can add any other LangChain initializations here

    logger.info('LangChain initialized successfully');
}

async function main() {
    try {
        await initializeLangChain();
        await startServer(config.PORT);
        logger.info(`Server started on port ${config.PORT}`);
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();