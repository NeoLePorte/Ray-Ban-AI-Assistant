import {
    BaseMessage,
    TextMessage,
    ImageMessage,
    FileMessage,
    isTextMessage,
    isImageMessage,
    isFileMessage,
  } from '../message';

describe('Message Interfaces and Type Guards', () => {
  
  const baseMessage: BaseMessage = {
    id: '1',
    timestamp: Date.now(),
  };

  describe('TextMessage', () => {
    it('should correctly identify a TextMessage', () => {
      const textMessage: TextMessage = {
        ...baseMessage,
        type: 'text',
        text: 'Hello, World!',
      };

      expect(isTextMessage(textMessage)).toBe(true);
      expect(isImageMessage(textMessage)).toBe(false);
      expect(isFileMessage(textMessage)).toBe(false);
    });
  });

  describe('ImageMessage', () => {
    it('should correctly identify an ImageMessage', () => {
      const imageMessage: ImageMessage = {
        ...baseMessage,
        type: 'image',
        attachments: [{
          type: 'image',
          payload: {
            url: 'http://example.com/image.jpg',
          },
        }],
      };

      expect(isTextMessage(imageMessage)).toBe(false);
      expect(isImageMessage(imageMessage)).toBe(true);
      expect(isFileMessage(imageMessage)).toBe(false);
    });
  });

  describe('FileMessage', () => {
    it('should correctly identify a FileMessage', () => {
      const fileMessage: FileMessage = {
        ...baseMessage,
        type: 'file',
        attachments: [{
          type: 'file',
          payload: {
            url: 'http://example.com/document.pdf',
            name: 'document.pdf',
          },
        }],
      };

      expect(isTextMessage(fileMessage)).toBe(false);
      expect(isImageMessage(fileMessage)).toBe(false);
      expect(isFileMessage(fileMessage)).toBe(true);
    });
  });
});
