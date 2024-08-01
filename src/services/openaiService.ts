// src/services/openaiService.ts

import { OpenAI } from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === MAX_RETRIES - 1) throw error;
            logger.warn(`Retrying operation, attempt ${i + 1} of ${MAX_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    throw new Error('Max retries reached');
}

export async function getGPTResponse(query: string, conversationContext: string[] = []): Promise<string> {
    try {
        const messages = [
            ...conversationContext.map(msg => ({ role: 'user' as const, content: msg })),
            { role: 'user' as const, content: `Limit your response to 100 characters for this query: ${query}` }
        ];

        const response = await retryOperation(() => openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages,
            max_tokens: 100,
        }));

        const content = response.choices[0].message.content;
        if (!content) {
            throw new AppError('Received empty response from GPT', 500);
        }
        return content;
    } catch (error) {
        logger.error('Error getting GPT response:', error);
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to get response from GPT', 500);
    }
}

export async function getGPTImageResponse(query: string, imageBase64: string): Promise<string> {
    try {
        const response = await retryOperation(() => openai.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `${query}, limit your response to 100 characters or less.` },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ],
                }
            ],
            max_tokens: 100,
        }));

        const content = response.choices[0].message.content;
        if (!content) {
            throw new AppError('Received empty response from GPT for image analysis', 500);
        }
        return content;
    } catch (error) {
        logger.error('Error getting GPT image response:', error);
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to get image analysis from GPT', 500);
    }
}
