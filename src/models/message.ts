export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  from: string;
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
