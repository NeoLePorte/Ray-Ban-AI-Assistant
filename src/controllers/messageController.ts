// Import necessary modules
import { Message, TextMessage, ImageMessage } from '../models/message';
import { Conversation, LLMType } from '../models/conversation';
import { getGPTResponse, getGPTImageResponse } from '../services/openaiService';
import { getClaudeResponse, getClaudeImageResponse } from '../services/anthropicService';
import { sendWhatsappResponse } from '../services/whatsappService';
import { downloadMedia, encodeImage, getMediaLink } from '../services/mediaService';
import { redisService } from '../services/redisService';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { generateUniqueId, truncateString } from '../utils/helpers';

// Constants
const MAX_CONVERSATION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CONVERSATION_MESSAGES = 50; // Maximum number of messages to keep in a conversation

// Mapping of aliases to actual model names
const MODEL_ALIASES: Record<string, string> = {
    '4o': 'gpt-4o',
    'mini': 'gpt-4o-mini',
    'opus': 'claude-3-opus-20240229',
    'sonnet': 'claude-3-5-sonnet-20240620'
};

// Extract valid models from MODEL_ALIASES
const VALID_MODELS = Object.values(MODEL_ALIASES);

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
    if (conversation) {
        logger.info('Conversation retrieved from Redis', { userId });

        // Convert date strings to Date objects
        conversation.createdAt = new Date(conversation.createdAt);
        conversation.updatedAt = new Date(conversation.updatedAt);

        if (isConversationExpired(conversation)) {
            logger.info('Conversation expired, archiving and creating new one', { userId, conversationId: conversation.id });
            conversation = await archiveAndCreateNewConversation(conversation);
        }
    } else {
        logger.info('No existing conversation found, creating new one', { userId });
        conversation = createNewConversation(userId);
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
        llmType: MODEL_ALIASES['sonnet'] as LLMType, // Default to claude-3-5-sonnet using alias
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        model: MODEL_ALIASES['sonnet'] // Ensure the model field is set correctly
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
    const query = message.content.trim();

    if (query.toLowerCase().startsWith('switch to ')) {
        const alias = query.toLowerCase().replace('switch to ', '').trim();
        const newModel = MODEL_ALIASES[alias];

        if (newModel && VALID_MODELS.includes(newModel)) {
            logger.info(`Switching LLM model`, { userId: conversation.userId, oldModel: conversation.llmType, newModel });
            conversation.llmType = newModel as LLMType;
            conversation.model = newModel; // Ensure the model field is updated
            return `Switched to ${alias}. How can I assist you?`;
        } else {
            logger.warn('Invalid LLM model specified', { userId: conversation.userId, specifiedModel: alias });
            throw new AppError(`Invalid AI model specified. Please choose from: ${Object.keys(MODEL_ALIASES).join(', ')}.`, 400);
        }
    }

    try {
        logger.info('Fetching AI response', { userId: conversation.userId, model: conversation.llmType });
        if (conversation.llmType.startsWith('gpt')) {
            return await getGPTResponse(query, conversation.model); // Ensure the correct model is passed
        } else {
            return await getClaudeResponse(query, conversation.model); // Ensure the correct model is passed
        }
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
    const mediaUrl = await getMediaLink(message.imageUrl); // Obtain the actual media URL
    const imagePath = await downloadMedia(mediaUrl as string);
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
        logger.info('Fetching AI image response', { userId: conversation.userId, model: conversation.llmType });
        if (conversation.llmType.startsWith('gpt')) {
            return await getGPTImageResponse(query, imageBase64, conversation.model); // Ensure the correct model is passed
        } else {
            return await getClaudeImageResponse(query, imageBase64, conversation.model); // Ensure the correct model is passed
        }
    } catch (error) {
        logger.error('Error processing image', { error, userId: conversation.userId });
        throw new AppError('Failed to process the image. Please try again later.', 500);
    }
}
