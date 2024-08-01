// src/services/anthropicService.ts

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import logger from '../utils/logger';

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_KEY });

export async function getClaudeResponse(query: string): Promise<string> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 100,
            messages: [{ role: 'user', content: query }],
        });

        // Handle different content types
        const content = response.content[0];
        if ('text' in content) {
            return content.text;
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        logger.error('Error getting Claude response:', error);
        throw error;
    }
}

export async function getClaudeImageResponse(query: string, imageBase64: string): Promise<string> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: query },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg', // Adjust this if you're using a different image format
                                data: imageBase64
                            }
                        }
                    ]
                }
            ],
        });

        // Handle different content types
        const content = response.content[0];
        if ('text' in content) {
            return content.text;
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        logger.error('Error getting Claude image response:', error);
        throw error;
    }
}
