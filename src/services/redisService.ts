import { Redis } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';
import { Conversation } from '../models/conversation';

class RedisService {
    private redis: Redis;

    constructor(redisClient?: Redis) {
        this.redis = redisClient || new Redis(config.REDIS_URL);
        
        this.redis.on('connect', () => {
            logger.info('Redis connection established', { service: 'ray-ban-ai-assistant' });
        });

        this.redis.on('error', (err) => {
            logger.error('Redis connection error', { error: err, service: 'ray-ban-ai-assistant' });
            this.retryConnection();
        });
    }

    private retryConnection() {
        setTimeout(() => {
            logger.info('Retrying Redis connection...', { service: 'ray-ban-ai-assistant' });
            this.redis = new Redis(config.REDIS_URL);
            this.redis.on('connect', () => {
                logger.info('Redis connection re-established', { service: 'ray-ban-ai-assistant' });
            });
            this.redis.on('error', (err) => {
                logger.error('Redis reconnection error', { error: err, service: 'ray-ban-ai-assistant' });
                this.retryConnection();
            });
        }, 5000);
    }

    async saveConversation(userId: string, conversation: Conversation): Promise<void> {
        try {
            await this.redis.set(`conversation:${userId}`, JSON.stringify(conversation));
            logger.info('Conversation saved to Redis', { conversationId: conversation.id, userId });
        } catch (error) {
            logger.error('Error saving conversation to Redis', { error, userId });
            throw error;
        }
    }

    async getConversation(userId: string): Promise<Conversation | null> {
        try {
            const conversation = await this.redis.get(`conversation:${userId}`);
            if (conversation) {
                logger.info('Conversation retrieved from Redis', { userId });
                return JSON.parse(conversation);
            } else {
                logger.info('No conversation found in Redis', { userId });
            }
            return null;
        } catch (error) {
            logger.error('Error getting conversation from Redis', { error, userId });
            throw error;
        }
    }

    async deleteConversation(userId: string): Promise<void> {
        try {
            await this.redis.del(`conversation:${userId}`);
            logger.info('Conversation deleted from Redis', { userId });
        } catch (error) {
            logger.error('Error deleting conversation from Redis', { error, userId });
            throw error;
        }
    }

    async archiveConversation(conversation: Conversation): Promise<void> {
        try {
            const archivedConversation = {
                ...conversation,
                isArchived: true,
                archivedAt: new Date()
            };
            await this.redis.set(`archived:conversation:${conversation.userId}:${conversation.id}`, JSON.stringify(archivedConversation));
            logger.info('Conversation archived in Redis', { conversationId: conversation.id, userId: conversation.userId });
            await this.deleteConversation(conversation.userId);
        } catch (error) {
            logger.error('Error archiving conversation in Redis', { error, userId: conversation.userId });
            throw error;
        }
    }

    async getArchivedConversation(userId: string, conversationId: string): Promise<Conversation | null> {
        try {
            const conversation = await this.redis.get(`archived:conversation:${userId}:${conversationId}`);
            if (conversation) {
                logger.info('Archived conversation retrieved from Redis', { conversationId, userId });
                return JSON.parse(conversation);
            }
            return null;
        } catch (error) {
            logger.error('Error getting archived conversation from Redis', { error, userId });
            throw error;
        }
    }

    async getArchivedConversationsKeys(userId: string): Promise<string[]> {
        try {
            const keys = await this.redis.keys(`archived:conversation:${userId}:*`);
            logger.info('Archived conversation keys retrieved from Redis', { keyCount: keys.length, userId });
            return keys;
        } catch (error) {
            logger.error('Error getting archived conversation keys from Redis', { error, userId });
            throw error;
        }
    }

    async closeConnection(): Promise<void> {
        try {
            await this.redis.quit();
            logger.info('Redis connection closed successfully', { service: 'ray-ban-ai-assistant' });
        } catch (error) {
            logger.error('Error closing Redis connection', { error });
            throw error;
        }
    }
}

const redisService = new RedisService();

export { redisService, RedisService };