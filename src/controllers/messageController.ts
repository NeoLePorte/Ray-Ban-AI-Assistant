import { Message, TextMessage, ImageMessage, DocumentMessage, isTextMessage, isImageMessage, isDocumentMessage } from '../models/message';
import { Conversation, LLMType, getModelFromAlias, SUPPORTED_MODELS, createNewConversation } from '../models/conversation';
import { generateAnswer, analyzeImageAndRetrieveInfo, getLocationBasedInfo, addDocumentToVectorStore, addPDFToVectorStore, addWordToVectorStore, addExcelToVectorStore } from '../services/ragService';
import { redisService } from '../services/redisService';
import { sendWhatsappResponse } from '../services/whatsappService';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';

export async function processMessage(message: Message): Promise<void> {
    logger.info(`Processing message`, { messageId: message.id, messageType: message.type, userId: message.from });

    if (message.role !== 'user') {
        logger.info(`Ignoring non-user message`, { messageId: message.id });
        return;
    }

    const redis = await redisService;
    let conversation = await getOrCreateConversation(message.from);

    try {
        let response: string;

        if (isTextMessage(message)) {
            response = await handleTextMessage(message, conversation);
        } else if (isImageMessage(message)) {
            response = await handleImageMessage(message, conversation);
        } else if (isDocumentMessage(message)) {
            response = await handleDocumentMessage(message, conversation);
        } else {
            logger.warn(`Unsupported message type`, { message });
            throw new AppError(`Unsupported message type: ${JSON.stringify(message)}`, 400);
        }

        await updateConversation(conversation, message, response);
        await sendWhatsappResponse(message.from, response);
    } catch (error) {
        logger.error('Error processing message', { error, messageId: message.id, userId: message.from });
        const errorMessage = error instanceof AppError ? `Error: ${error.message}` : 'Sorry, I encountered an error while processing your message.';
        await sendWhatsappResponse(message.from, errorMessage);
    }
}

async function handleTextMessage(message: TextMessage, conversation: Conversation): Promise<string> {
    const query = message.content.trim().toLowerCase();

    if (query.startsWith('switch to ')) {
        return handleModelSwitch(query.slice(10).trim(), conversation);
    }

    if (query.startsWith('location:')) {
        const [location, ...queryParts] = query.slice(9).split(',').map(part => part.trim());
        return await getLocationBasedInfo(location, queryParts.join(' '), conversation.model);
    }

    // Update user context if the message starts with "context:"
    if (query.startsWith('context:')) {
        conversation.userContext = message.content.slice(8).trim();
        const redis = await redisService;
        await redis.saveConversation(conversation.userId, conversation);
        return "User context updated successfully.";
    }

    return await generateAnswer(message.content, conversation.model, conversation.userContext);
}

async function handleImageMessage(message: ImageMessage, conversation: Conversation): Promise<string> {
    return await analyzeImageAndRetrieveInfo(message.imageUrl, message.caption || "What's in this image?", conversation.model);
}

async function handleDocumentMessage(message: DocumentMessage, conversation: Conversation): Promise<string> {
    switch (message.mimeType) {
        case 'application/pdf':
            await addPDFToVectorStore(message.documentBuffer, { userId: conversation.userId });
            break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
            await addWordToVectorStore(message.documentBuffer, { userId: conversation.userId });
            break;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
            await addExcelToVectorStore(message.documentBuffer, { userId: conversation.userId });
            break;
        default:
            await addDocumentToVectorStore(message.content, { userId: conversation.userId, mimeType: message.mimeType });
    }
    return "Document processed and added to your knowledge base. You can now ask questions about its content.";
}

function handleModelSwitch(modelAlias: string, conversation: Conversation): string {
    const newModel = getModelFromAlias(modelAlias);
    if (newModel) {
        conversation.model = newModel;
        return `Switched to ${newModel}. How can I assist you?`;
    } else {
        const validModels = SUPPORTED_MODELS.join(', ');
        throw new AppError(`Invalid model. Available models are: ${validModels}`, 400);
    }
}

async function getOrCreateConversation(userId: string): Promise<Conversation> {
    const redis = await redisService;
    let conversation = await redis.getConversation(userId);
    if (!conversation) {
        conversation = createNewConversation(userId);
        await redis.saveConversation(userId, conversation);
    }
    return conversation;
}

async function updateConversation(conversation: Conversation, userMessage: Message, assistantResponse: string): Promise<void> {
    conversation.messages.push(userMessage);
    conversation.messages.push({
        id: Date.now().toString(),
        role: 'assistant',
        type: 'text',
        content: assistantResponse,
        timestamp: new Date(),
        from: 'assistant'
    });
    conversation.updatedAt = new Date();
    const redis = await redisService;
    await redis.saveConversation(conversation.userId, conversation);
}