import { Message } from './message';

export type LLMType = 'openai' | 'anthropic';

export interface Conversation {
    id: string;
    userId: string;
    llmType: LLMType;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;  // New field to track when a conversation was archived
    isArchived: boolean;  // New field to easily identify archived conversations
    model: string;
}

export interface ConversationCreate {
    userId: string;
    llmType: LLMType;
}

export interface ConversationUpdate {
    llmType?: LLMType;
    messages?: Message[];
    updatedAt?: Date;
    archivedAt?: Date;
    isArchived?: boolean;
}