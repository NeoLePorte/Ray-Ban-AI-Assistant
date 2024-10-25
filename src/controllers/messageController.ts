import { Message, TextMessage } from '../models/message';
import { Conversation, LLMType } from '../models/conversation';
import { sendMMS } from '../services/twilioService';
import { downloadMedia, encodeFileToBase64 } from '../services/mediaService';
import { redisService } from '../services/redisService';
import { generateAnswer, analyzeImageAndRetrieveInfo, getLocationBasedInfo } from '../services/ragService';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { generateUniqueId, truncateString } from '../utils/helpers';

const MAX_RESPONSE_LENGTH = 2000;

export async function processMessage(senderId: string, receivedMessage: any): Promise<void> {
    logger.info(`Processing message`, { senderId, messageType: receivedMessage.type });

    let conversation = await getOrCreateConversation(senderId);

    try {
        let response: string;

        if (receivedMessage.text) {
            response = await handleTextMessage(senderId, receivedMessage.text, conversation);
        } else if (receivedMessage.mediaUrls && receivedMessage.mediaUrls.length > 0) {
            response = await handleMediaMessage(senderId, receivedMessage.mediaUrls, conversation);
        } else {
            logger.warn(`Unsupported message type`, { message: receivedMessage });
            throw new AppError(`Unsupported message type`, 400);
        }

        await updateConversation(conversation, receivedMessage, response);
        await sendMMS(senderId, truncateString(response, MAX_RESPONSE_LENGTH));
    } catch (error) {
        logger.error('Error processing message', { error, senderId });
        const errorMessage = error instanceof AppError ? `Error: ${error.message}` : 'Sorry, I encountered an error while processing your message.';
        await sendMMS(senderId, errorMessage);
    }
}

async function handleTextMessage(senderId: string, text: string, conversation: Conversation): Promise<string> {
    const query = text.trim().toLowerCase();

    if (query.startsWith('switch to ')) {
        const newLlmType = query.replace('switch to ', '').replace(/\s+/g, '').toLowerCase() as LLMType;
        if (newLlmType === 'gpt-4o' || newLlmType === 'claude-3-opus-20240229') {
            logger.info(`Switching LLM type`, { senderId, oldLlmType: conversation.model, newLlmType });
            conversation.model = newLlmType;
            return `Switched to ${newLlmType}. How can I assist you?`;
        } else {
            logger.warn('Invalid LLM type specified', { senderId, specifiedLlmType: newLlmType });
            throw new AppError('Invalid AI model specified. Please choose "gpt-4o" or "claude-3-opus-20240229".', 400);
        }
    }

    if (query.startsWith('in ') && query.includes(',')) {
        const parts = query.split(',');
        const location = parts[0].replace('in ', '').trim();
        const actualQuery = parts.slice(1).join(',').trim();
        return await getLocationBasedInfo(location, actualQuery, conversation.model);
    }

    return await generateAnswer(query, conversation.model, conversation.userContext);
}

async function handleMediaMessage(senderId: string, mediaUrls: string[], conversation: Conversation): Promise<string> {
    const responses = await Promise.all(mediaUrls.map(async (url) => {
        const imagePath = await downloadMedia(url, 'image');
        if (!imagePath) {
            logger.error('Failed to download image', { url });
            return "Failed to download an image.";
        }

        let imageBase64: string;
        try {
            imageBase64 = await encodeFileToBase64(imagePath);
        } catch (error) {
            logger.error('Failed to encode image', { error, imagePath });
            return "Failed to process an image.";
        }

        const query = "What's in this image?";
        return await analyzeImageAndRetrieveInfo(imageBase64, query, conversation.model);
    }));

    return responses.join('\n\n');
}

async function getOrCreateConversation(senderId: string): Promise<Conversation> {
    const redis = await redisService;
    let conversation = await redis.getConversation(senderId);
    if (!conversation) {
        logger.info('No existing conversation found, creating new one', { senderId });
        conversation = createNewConversation(senderId);
    }
    return conversation;
}

function createNewConversation(senderId: string): Conversation {
    return {
        id: generateUniqueId(),
        userId: senderId,
        model: 'gpt-4o' as LLMType,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        userContext: ''
    };
}

async function updateConversation(conversation: Conversation, receivedMessage: any, assistantResponse: string): Promise<void> {
    let userMessage: Message;

    if (receivedMessage.text) {
        userMessage = {
            id: generateUniqueId(),
            type: 'text',
            timestamp: Date.now(),
            text: receivedMessage.text
        };
    } else if (receivedMessage.mediaUrl) {
        userMessage = {
            id: generateUniqueId(),
            type: 'image',
            timestamp: Date.now(),
            attachments: [{
                type: 'image',
                payload: {
                    url: receivedMessage.mediaUrl
                }
            }]
        };
    } else {
        throw new Error('Unsupported message type');
    }

    conversation.messages.push(userMessage);

    const assistantMessage: TextMessage = {
        id: generateUniqueId(),
        type: 'text',
        timestamp: Date.now(),
        text: assistantResponse
    };

    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    const redis = await redisService;
    await redis.saveConversation(conversation.userId, conversation);
}
