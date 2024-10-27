import { Message, TextMessage } from '../models/message';
import { Conversation, LLMType, isSupportedModel } from '../models/conversation';
import { sendMMS } from '../services/twilioService';
import { downloadMedia, encodeFileToBase64 } from '../services/mediaService';
import redisClient from '../services/redisService';
import { generateAnswer, analyzeImageAndRetrieveInfo, getLocationBasedInfo } from '../services/ragService';
import logger from '../utils/logger';
import { AppError, LangGraphError } from '../utils/errorHandler';
import { generateUniqueId, truncateString } from '../utils/helpers';
// import { Document } from 'langchain/document';

const MAX_RESPONSE_LENGTH = 2000;

export async function processMessage(senderId: string, receivedMessage: any): Promise<void> {
    const messageId = generateUniqueId();
    logger.info('Processing message', { 
        senderId, 
        messageId,
        messageType: receivedMessage.type,
        messageContent: receivedMessage.text || 'media content',
        timestamp: new Date().toISOString()
    });

    let conversation = await getOrCreateConversation(senderId);

    try {
        let response: string;
        const startTime = Date.now();

        if (receivedMessage.text) {
            logger.debug('Processing text message', {
                senderId,
                messageId,
                textLength: receivedMessage.text.length,
                model: conversation.model
            });
            response = await handleTextMessage(senderId, receivedMessage.text, conversation);
        } else if (receivedMessage.mediaUrls && receivedMessage.mediaUrls.length > 0) {
            logger.debug('Processing media message', {
                senderId,
                messageId,
                mediaCount: receivedMessage.mediaUrls.length,
                mediaTypes: receivedMessage.mediaUrls.map((url: string) => url.split('.').pop())
            });
            response = await handleMediaMessage(receivedMessage.mediaUrls, conversation);
        } else {
            logger.warn('Unsupported message type', { 
                senderId,
                messageId,
                receivedMessage 
            });
            throw new AppError(`Unsupported message type`, 400);
        }

        const processingTime = Date.now() - startTime;
        logger.info({
            senderId,
            messageId,
            processingTimeMs: processingTime,
            responseLength: response.length,
            model: conversation.model
        });

        // Update conversation with the new message and response
        await updateConversation(conversation, receivedMessage, response);
        
        // Send the response back to the user
        await sendMMS(senderId, truncateString(response, MAX_RESPONSE_LENGTH));
    } catch (error) {
        logger.error('Error processing message', { 
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : 'Unknown error',
            senderId,
            messageId,
            messageType: receivedMessage.type,
            model: conversation.model
        });

        let errorMessage: string;
        if (error instanceof LangGraphError) {
            errorMessage = 'Sorry, I had trouble processing your message. Please try again.';
        } else if (error instanceof AppError) {
            errorMessage = `Error: ${error.message}`;
        } else {
            errorMessage = 'Sorry, I encountered an unexpected error. Please try again later.';
        }
        
        await sendMMS(senderId, errorMessage);
    }
}

async function handleTextMessage(senderId: string, text: string, conversation: Conversation): Promise<string> {
    const query = text.trim().toLowerCase();

    // Handle model switching
    if (query.startsWith('switch to ')) {
        const newModel = query.replace('switch to ', '').trim();
        if (isSupportedModel(newModel)) {
            conversation.model = newModel;
            logger.info(`Switching model`, { senderId, oldModel: conversation.model, newModel });
            return `Switched to ${newModel}. How can I assist you?`;
        }
        throw new AppError('Invalid model specified. Please choose from the supported models.', 400);
    }

    // Handle location-based queries
    if (query.startsWith('in ') && query.includes(',')) {
        const [location, ...queryParts] = query.replace('in ', '').split(',');
        const actualQuery = queryParts.join(',').trim();
        return await getLocationBasedInfo(location.trim(), actualQuery, conversation.model);
    }

    // Handle regular queries
    return await generateAnswer(query, conversation.model, conversation.userContext);
}

async function handleMediaMessage(mediaUrls: string[], conversation: Conversation): Promise<string> {
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
    try {
        let conversation = await redisClient.getConversation(senderId);
        if (!conversation) {
            logger.info('No existing conversation found, creating new one', { senderId });
            conversation = createNewConversation(senderId);
            await redisClient.saveConversation(senderId, conversation);
        }
        return conversation;
    } catch (error) {
        logger.error('Error getting conversation from Redis', { error, userId: senderId });
        // Fallback to creating a new conversation
        return createNewConversation(senderId);
    }
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
            role: 'user',
            content: receivedMessage.text,
            text: receivedMessage.text
        };
    } else if (receivedMessage.mediaUrl) {
        userMessage = {
            id: generateUniqueId(),
            type: 'image',
            timestamp: Date.now(),
            role: 'user',
            content: receivedMessage.mediaUrl,
            attachments: [{
                type: 'image',
                payload: {
                    url: receivedMessage.mediaUrl
                }
            }]
        };
    } else {
        throw new AppError('Unsupported message type', 400);
    }

    const assistantMessage: TextMessage = {
        id: generateUniqueId(),
        type: 'text',
        timestamp: Date.now(),
        role: 'assistant',
        content: assistantResponse,
        text: assistantResponse
    };

    conversation.messages.push(userMessage, assistantMessage);
    conversation.updatedAt = new Date();

    await Promise.all([
        redisClient.saveConversation(conversation.userId, conversation),
    ]);
}
