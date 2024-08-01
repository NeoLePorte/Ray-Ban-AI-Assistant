import { RedisService } from '../redisService';
import redisClient from '../__mocks__/redisClient';
import { TextMessage, ImageMessage } from '../../models/message';
import { Conversation } from '../../models/conversation';

describe('RedisService', () => {
  let redisService: RedisService;

  beforeAll(() => {
    redisService = new RedisService(redisClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisClient.flushall();
  });

  afterAll(async () => {
    await redisService.closeConnection();
  });

  it('should set and get a text message', async () => {
    const textMessage: TextMessage = {
      id: '1',
      role: 'user',
      timestamp: new Date(),
      type: 'text',
      content: 'testMessage',
      from: 'testUser',
    };

    const conversation: Conversation = {
      id: '1',
      userId: 'testUser',
      llmType: 'openai',
      messages: [textMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
    };

    await redisService.saveConversation('testUser', conversation);
    const value = await redisService.getConversation('testUser');
    expect(value).toEqual({
      ...conversation,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      messages: [
        {
          ...textMessage,
          timestamp: expect.any(Date),
        },
      ],
    });
  });

  it('should handle image messages', async () => {
    const imageMessage: ImageMessage = {
      id: '2',
      role: 'user',
      timestamp: new Date(),
      type: 'image',
      imageUrl: 'http://example.com/image.jpg',
      caption: 'Test image',
      from: 'testUser',
    };

    const conversation: Conversation = {
      id: '2',
      userId: 'testUser',
      llmType: 'anthropic',
      messages: [imageMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
    };

    await redisService.saveConversation('testUser', conversation);
    const value = await redisService.getConversation('testUser');
    expect(value).toEqual({
      ...conversation,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      messages: [
        {
          ...imageMessage,
          timestamp: expect.any(Date),
        },
      ],
    });
  });

  it('should handle non-existent conversations', async () => {
    const value = await redisService.getConversation('nonExistentUser');
    expect(value).toBeNull();
  });

  it('should delete conversations', async () => {
    const conversation: Conversation = {
      id: '3',
      userId: 'testUser',
      llmType: 'openai',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
    };

    await redisService.saveConversation('testUser', conversation);
    await redisService.deleteConversation('testUser');
    const value = await redisService.getConversation('testUser');
    expect(value).toBeNull();
  });

  it('should archive conversations', async () => {
    const conversation: Conversation = {
      id: '4',
      userId: 'testUser',
      llmType: 'openai',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
    };

    await redisService.saveConversation('testUser', conversation);
    await redisService.archiveConversation(conversation);

    const activeConversation = await redisService.getConversation('testUser');
    expect(activeConversation).toBeNull();

    const archivedConversation = await redisService.getArchivedConversation('testUser', '4');
    expect(archivedConversation).toEqual({
      ...conversation,
      isArchived: true,
      archivedAt: expect.any(Date),
    });
  });

  it('should close the connection', async () => {
    await expect(redisService.closeConnection()).resolves.toBeUndefined();
  });

  it('should get archived conversation keys', async () => {
    const conversation1: Conversation = {
      id: '5',
      userId: 'testUser',
      llmType: 'openai',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: true,
      archivedAt: new Date(),
    };

    const conversation2: Conversation = {
      id: '6',
      userId: 'testUser',
      llmType: 'anthropic',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: true,
      archivedAt: new Date(),
    };

    await redisService.archiveConversation(conversation1);
    await redisService.archiveConversation(conversation2);

    const archivedKeys = await redisService.getArchivedConversationsKeys('testUser');
    expect(archivedKeys).toHaveLength(2);
    expect(archivedKeys).toEqual(
      expect.arrayContaining([
        'archived:conversation:testUser:5',
        'archived:conversation:testUser:6',
      ])
    );
  });
});
