import {
    BaseMessage,
    TextMessage,
    ImageMessage,
    DocumentMessage,
    isTextMessage,
    isImageMessage,
    isDocumentMessage,
  } from '../../models/message';
  
  describe('Message Interfaces and Type Guards', () => {
  
    const baseMessage: BaseMessage = {
      id: '1',
      role: 'user',
      timestamp: new Date(),
      from: 'user-123',
    };
  
    describe('TextMessage', () => {
      it('should correctly identify a TextMessage', () => {
        const textMessage: TextMessage = {
          ...baseMessage,
          type: 'text',
          content: 'Hello, World!',
        };
  
        expect(isTextMessage(textMessage)).toBe(true);
        expect(isImageMessage(textMessage)).toBe(false);
        expect(isDocumentMessage(textMessage)).toBe(false);
      });
    });
  
    describe('ImageMessage', () => {
      it('should correctly identify an ImageMessage', () => {
        const imageMessage: ImageMessage = {
          ...baseMessage,
          type: 'image',
          imageUrl: 'http://example.com/image.jpg',
          caption: 'An example image',
        };
  
        expect(isTextMessage(imageMessage)).toBe(false);
        expect(isImageMessage(imageMessage)).toBe(true);
        expect(isDocumentMessage(imageMessage)).toBe(false);
      });
    });
  
    describe('DocumentMessage', () => {
      it('should correctly identify a DocumentMessage', () => {
        const documentMessage: DocumentMessage = {
          ...baseMessage,
          type: 'document',
          content: 'This is a document content',
          mimeType: 'application/pdf',
          documentBuffer: Buffer.from('This is a document'),
        };
  
        expect(isTextMessage(documentMessage)).toBe(false);
        expect(isImageMessage(documentMessage)).toBe(false);
        expect(isDocumentMessage(documentMessage)).toBe(true);
      });
    });
  
    describe('Type Guard Functions', () => {
      it('should return true for isTextMessage when the message is of type "text"', () => {
        const textMessage: TextMessage = {
          ...baseMessage,
          type: 'text',
          content: 'Hello, World!',
        };
  
        expect(isTextMessage(textMessage)).toBe(true);
      });
  
      it('should return true for isImageMessage when the message is of type "image"', () => {
        const imageMessage: ImageMessage = {
          ...baseMessage,
          type: 'image',
          imageUrl: 'http://example.com/image.jpg',
        };
  
        expect(isImageMessage(imageMessage)).toBe(true);
      });
  
      it('should return true for isDocumentMessage when the message is of type "document"', () => {
        const documentMessage: DocumentMessage = {
          ...baseMessage,
          type: 'document',
          content: 'Document content',
          mimeType: 'application/pdf',
          documentBuffer: Buffer.from('This is a document'),
        };
  
        expect(isDocumentMessage(documentMessage)).toBe(true);
      });
    });
  });
  