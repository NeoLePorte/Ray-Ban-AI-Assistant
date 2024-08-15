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

export interface DocumentMessage extends BaseMessage {
  type: 'document';
  content: string;
  mimeType: string;
  documentBuffer: Buffer;
}

export type Message = TextMessage | ImageMessage | DocumentMessage;

export function isTextMessage(message: Message): message is TextMessage {
  return message.type === 'text';
}

export function isImageMessage(message: Message): message is ImageMessage {
  return message.type === 'image';
}

export function isDocumentMessage(message: Message): message is DocumentMessage {
  return message.type === 'document';
}