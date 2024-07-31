import { Message } from './message';

export type LLMType = 'openai' | 'anthropic';

export interface Conversation {
    id: string;
    userId: string;
    llmType: LLMType;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ConversationCreate {
    userId: string;
    llmType: LLMType;
}

export interface ConversationUpdate {
    llmType?: LLMType;
    messages?: Message[];
}
