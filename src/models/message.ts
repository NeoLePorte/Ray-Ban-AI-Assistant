export interface BaseMessage {
  id: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
  role: 'user' | 'assistant' | 'system'; // expant roles later. loom system
  content: string;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
}

export interface ImageMessage extends BaseMessage {
  type: 'image';
  attachments: [{
    type: 'image';
    payload: {
      url: string;
    };
  }];
}

export interface FileMessage extends BaseMessage {
  type: 'file';
  attachments: [{
    type: 'file';
    payload: {
      url: string;
      name: string;
    };
  }];
}

export type Message = TextMessage | ImageMessage | FileMessage;

export function isTextMessage(message: Message): message is TextMessage {
  return message.type === 'text';
}

export function isImageMessage(message: Message): message is ImageMessage {
  return message.type === 'image';
}

export function isFileMessage(message: Message): message is FileMessage {
  return message.type === 'file';
}
