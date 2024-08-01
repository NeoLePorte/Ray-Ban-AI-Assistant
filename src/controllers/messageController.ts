import { Message, TextMessage, ImageMessage } from '../models/message';
import { Conversation, LLMType } from '../models/conversation';
import { getGPTResponse, getGPTImageResponse } from '../services/openaiService';
import { getClaudeResponse, getClaudeImageResponse } from '../services/anthropicService';
import { sendWhatsappResponse } from '../services/whatsappService';
import { downloadMedia, encodeImage } from '../services/mediaService';
import { redisService } from '../services/redisService';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { generateUniqueId, truncateString } from '../utils/helpers';

// Constants
const MAX_CONVERSATION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CONVERSATION_MESSAGES = 50; // Maximum number of messages to keep in a conversation

/**
 * Processes an incoming message.
 * @param message - The incoming message object.
 */
export async function processMessage(message: Message): Promise<void> {
    logger.info(`Processing message`, { messageId: message.id, messageType: message.type, userId: message.from });

    if (message.role !== 'user') {
        logger.info(`Ignoring non-user message`, { messageId: message.id });
        return;
    }

    let conversation = await getOrCreateConversation(message.from);

    try {
        let response: string;

        // Use type guards to narrow down the message type
        if (isTextMessage(message)) {
            response = await handleTextMessage(message, conversation);
        } else if (isImageMessage(message)) {
            response = await handleImageMessage(message, conversation);
        } else {
            // Handle unsupported message types
            logger.warn(`Unsupported message type`, { message });
            throw new AppError(`Unsupported message type: ${JSON.stringify(message)}`, 400);
        }

        await updateConversation(conversation, message, response);
        await sendWhatsappResponse(message.from, truncateString(response, 1000));
    } catch (error) {
        logger.error('Error processing message', { error, messageId: message.id, userId: message.from });
        const errorMessage = error instanceof AppError ? `Error: ${error.message}` : 'Sorry, I encountered an error while processing your message.';
        await sendWhatsappResponse(message.from, errorMessage);
    }
}

/**
 * Type guard for TextMessage
 * @param message - The message object to check
 * @returns True if the message is a TextMessage, false otherwise
 */
function isTextMessage(message: Message): message is TextMessage {
    return message.type === 'text';
}

/**
 * Type guard for ImageMessage
 * @param message - The message object to check
 * @returns True if the message is an ImageMessage, false otherwise
 */
function isImageMessage(message: Message): message is ImageMessage {
    return message.type === 'image';
}

/**
 * Retrieves or creates a new conversation for a given user ID.
 * @param userId - The user ID for the conversation.
 * @returns The conversation object.
 */
async function getOrCreateConversation(userId: string): Promise<Conversation> {
    let conversation = await redisService.getConversation(userId);
    if (!conversation) {
        logger.info('No existing conversation found, creating new one', { userId });
        conversation = createNewConversation(userId);
    } else if (isConversationExpired(conversation)) {
        logger.info('Conversation expired, archiving and creating new one', { userId, conversationId: conversation.id });
        conversation = await archiveAndCreateNewConversation(conversation);
    }
    return conversation;
}

/**
 * Creates a new conversation object for a given user ID.
 * @param userId - The user ID for the new conversation.
 * @returns The new conversation object.
 */
function createNewConversation(userId: string): Conversation {
    return {
        id: generateUniqueId(),
        userId: userId,
        llmType: 'openai' as LLMType,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false
    };
}

/**
 * Determines if a conversation is expired.
 * @param conversation - The conversation to check.
 * @returns True if the conversation is expired, false otherwise.
 */
function isConversationExpired(conversation: Conversation): boolean {
    const now = new Date().getTime();
    const conversationAge = now - conversation.updatedAt.getTime();
    return conversationAge > MAX_CONVERSATION_AGE || conversation.messages.length >= MAX_CONVERSATION_MESSAGES;
}

/**
 * Archives an old conversation and creates a new one.
 * @param oldConversation - The old conversation to archive.
 * @returns The new conversation object.
 */
async function archiveAndCreateNewConversation(oldConversation: Conversation): Promise<Conversation> {
    oldConversation.isArchived = true;
    await redisService.archiveConversation(oldConversation);
    return createNewConversation(oldConversation.userId);
}

/**
 * Updates a conversation with a new message and response.
 * @param conversation - The conversation to update.
 * @param userMessage - The user's message.
 * @param assistantResponse - The assistant's response.
 */
async function updateConversation(conversation: Conversation, userMessage: Message, assistantResponse: string): Promise<void> {
    conversation.messages.push(userMessage);
    conversation.messages.push({
        id: generateUniqueId(),
        role: 'assistant',
        type: 'text',
        content: assistantResponse,
        timestamp: new Date(),
        from: 'assistant'
    });
    conversation.updatedAt = new Date();

    if (conversation.messages.length > MAX_CONVERSATION_MESSAGES) {
        conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_MESSAGES);
        logger.info('Trimmed conversation messages to maintain max limit', { conversationId: conversation.id, messageCount: conversation.messages.length });
    }

    await redisService.saveConversation(conversation.userId, conversation);
}

/**
 * Handles a text message.
 * @param message - The text message.
 * @param conversation - The current conversation.
 * @returns The assistant's response.
 */
async function handleTextMessage(message: TextMessage, conversation: Conversation): Promise<string> {
    const query = message.content;

    if (query.toLowerCase().startsWith('switch to ')) {
        const newLlmType = query.split(' ')[2].toLowerCase() as LLMType;
        if (newLlmType === 'openai' || newLlmType === 'anthropic') {
            logger.info(`Switching LLM type`, { userId: conversation.userId, oldLlmType: conversation.llmType, newLlmType });
            conversation.llmType = newLlmType;
            return `Switched to ${newLlmType}. How can I assist you?`;
        } else {
            logger.warn('Invalid LLM type specified', { userId: conversation.userId, specifiedLlmType: newLlmType });
            throw new AppError('Invalid AI model specified. Please choose "openai" or "anthropic".', 400);
        }
    }

    try {
        logger.info('Fetching AI response', { userId: conversation.userId, llmType: conversation.llmType });
        return conversation.llmType === 'openai' ? await getGPTResponse(query) : await getClaudeResponse(query);
    } catch (error) {
        logger.error('Error getting AI response', { error, userId: conversation.userId });
        throw new AppError('Failed to get AI response. Please try again later.', 500);
    }
}

/**
 * Handles an image message.
 * @param message - The image message.
 * @param conversation - The current conversation.
 * @returns The assistant's response.
 */
async function handleImageMessage(message: ImageMessage, conversation: Conversation): Promise<string> {
    const imagePath = await downloadMedia(message.imageUrl);
    if (!imagePath) {
        logger.error('Failed to download image', { imageUrl: message.imageUrl });
        throw new AppError("Failed to download the image. Please try sending it again.", 500);
    }

    let imageBase64: string;
    try {
        imageBase64 = await encodeImage(imagePath);
    } catch (error) {
        logger.error('Failed to encode image', { error, imagePath });
        throw new AppError("Failed to process the image. Please try sending it again.", 500);
    }

    const query = message.caption || "What's in this image?";

    try {
        logger.info('Fetching AI image response', { userId: conversation.userId, llmType: conversation.llmType });
        return conversation.llmType === 'openai' ? await getGPTImageResponse(query, imageBase64) : await getClaudeImageResponse(query, imageBase64);
    } catch (error) {
        logger.error('Error processing image', { error, userId: conversation.userId });
        throw new AppError('Failed to process the image. Please try again later.', 500);
    }
}
