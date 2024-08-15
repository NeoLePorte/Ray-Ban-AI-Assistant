import { Message } from './message';

export type LLMType = 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet-20240620' | 'claude-3-opus-20240229';

export interface Conversation {
    id: string;
    userId: string;
    model: LLMType;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    isArchived: boolean;
    userContext: string; // Added field for storing user-specific context
}

export const SUPPORTED_MODELS: LLMType[] = [
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229'
];

export const MODEL_ALIASES: Record<string, LLMType> = {
    '4o': 'gpt-4o',
    'mini': 'gpt-4o-mini',
    'sonnet': 'claude-3-5-sonnet-20240620',
    'opus': 'claude-3-opus-20240229'
};

export function isSupportedModel(model: string): model is LLMType {
    return SUPPORTED_MODELS.includes(model as LLMType);
}

export function getModelFromAlias(alias: string): LLMType | undefined {
    return MODEL_ALIASES[alias.toLowerCase()] || (isSupportedModel(alias) ? alias as LLMType : undefined);
}

export function createNewConversation(userId: string): Conversation {
    return {
        id: userId,
        userId: userId,
        model: SUPPORTED_MODELS[0],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        userContext: ''
    };
}