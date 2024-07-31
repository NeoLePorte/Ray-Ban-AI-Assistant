export type MessageRole = 'user' | 'assistant' | 'system';

interface BaseMessage {
    id: string;
    role: MessageRole;
    timestamp: Date;
}

export interface TextMessage extends BaseMessage {
    type: 'text';
    content: string;
}

export interface ImageMessage extends BaseMessage {
    type: 'image';
    imageUrl: string;
    caption?: string;
}

export type Message = TextMessage | ImageMessage;

export interface MessageCreate {
    role: MessageRole;
    type: 'text' | 'image';
    content?: string;
    imageUrl?: string;
    caption?: string;
}
