import { Message, TextMessage, ImageMessage } from '../models/message';
import { Conversation, LLMType } from '../models/conversation';
import { getGPTResponse, getGPTImageResponse } from '../services/openaiService';
import { getClaudeResponse, getClaudeImageResponse } from '../services/anthropicService';
import { sendWhatsappResponse } from '../services/whatsappService';
import { downloadMedia, encodeImage } from '../services/mediaService';
import { redisService } from '../services/redisService';
import logger from '../utils/logger';
import { config } from '../config';
import { AppError } from '../utils/errorHandler';
import { generateUniqueId, truncateString } from '../utils/helpers';

export async function processMessage(message: Message): Promise<void> {
    if (message.role !== 'user') {
        logger.info(`Ignoring non-user message: ${message.id}`);
        return;
    }

    let conversation = await redisService.getConversation(message.id);
    if (!conversation) {
        conversation = {
            id: generateUniqueId(),
            userId: message.id,
            llmType: 'openai' as LLMType, // Default to OpenAI
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    let response: string;

    try {
        switch (message.type) {
            case 'text':
                response = await handleTextMessage(message as TextMessage, conversation);
                break;
            case 'image':
                response = await handleImageMessage(message as ImageMessage, conversation);
                break;
            default:
                throw new AppError('Unsupported message type', 400);
        }

        conversation.messages.push(message);
        conversation.messages.push({
            id: generateUniqueId(),
            role: 'assistant',
            type: 'text',
            content: response,
            timestamp: new Date()
        });
        conversation.updatedAt = new Date();

        await redisService.saveConversation(conversation.userId, conversation);
        await sendWhatsappResponse(message.id, truncateString(response, 1000)); // Limit response to 1000 characters
    } catch (error) {
        logger.error('Error processing message:', error);
        if (error instanceof AppError) {
            await sendWhatsappResponse(message.id, error.message);
        } else {
            await sendWhatsappResponse(message.id, 'Sorry, I encountered an error while processing your message.');
        }
    }
}

async function handleTextMessage(message: TextMessage, conversation: Conversation): Promise<string> {
    const query = message.content;

    if (query.toLowerCase().startsWith('switch to ')) {
        const newLlmType = query.split(' ')[2].toLowerCase() as LLMType;
        if (newLlmType === 'openai' || newLlmType === 'anthropic') {
            conversation.llmType = newLlmType;
            return `Switched to ${newLlmType}. How can I assist you?`;
        } else {
            throw new AppError('Invalid AI model specified. Please choose "openai" or "anthropic".', 400);
        }
    }

    if (conversation.llmType === 'openai') {
        return await getGPTResponse(query);
    } else {
        return await getClaudeResponse(query);
    }
}

async function handleImageMessage(message: ImageMessage, conversation: Conversation): Promise<string> {
    const imagePath = await downloadMedia(message.imageUrl);
    if (!imagePath) {
        throw new AppError("Failed to download the image. Please try sending it again.", 500);
    }

    const imageBase64 = await encodeImage(imagePath);
    const query = message.caption || "What's in this image?";

    if (conversation.llmType === 'openai') {
        return await getGPTImageResponse(query, imageBase64);
    } else {
        return await getClaudeImageResponse(query, imageBase64);
    }
}

export async function processImageQuery(userId: string, query: string): Promise<string> {
    const conversation = await redisService.getConversation(userId);
    if (!conversation) {
        throw new AppError('No active conversation found. Please send an image first.', 400);
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage.type !== 'image') {
        throw new AppError('No recent image found. Please send an image before asking about it.', 400);
    }

    const imagePath = await downloadMedia((lastMessage as ImageMessage).imageUrl);
    if (!imagePath) {
        throw new AppError("Failed to retrieve the image. Please try sending it again.", 500);
    }

    const imageBase64 = await encodeImage(imagePath);

    if (conversation.llmType === 'openai') {
        return await getGPTImageResponse(query, imageBase64);
    } else {
        return await getClaudeImageResponse(query, imageBase64);
    }
}
