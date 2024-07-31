import { RedisService } from '../redisService';
import redisClient from '../__mocks__/redisClient';
import { Message, TextMessage, ImageMessage } from '../../models/message';
import { Conversation } from '../../models/conversation';

describe('RedisService', () => {
  let redisService: RedisService;

  beforeAll(() => {
    redisService = new RedisService(redisClient);
  });

  afterEach(() => {
    redisClient.flushall();
  });

  it('should set and get a text message', async () => {
    const textMessage: TextMessage = {
      id: '1',
      role: 'user',
      timestamp: new Date(),
      type: 'text',
      content: 'testMessage'
    };

    const conversation: Conversation = {
      id: '1',
      userId: 'testUser',
      llmType: 'openai',
      messages: [textMessage],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await redisService.saveConversation('testUser', conversation);
    const value = await redisService.getConversation('testUser');
    expect(value).toEqual(conversation);
  });

  it('should set and get an image message', async () => {
    const imageMessage: ImageMessage = {
      id: '2',
      role: 'assistant',
      timestamp: new Date(),
      type: 'image',
      imageUrl: 'http://example.com/image.jpg',
      caption: 'testCaption'
    };

    const conversation: Conversation = {
      id: '2',
      userId: 'testUser2',
      llmType: 'anthropic',
      messages: [imageMessage],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await redisService.saveConversation('testUser2', conversation);
    const value = await redisService.getConversation('testUser2');
    expect(value).toEqual(conversation);
  });

  // Add more tests...
});
