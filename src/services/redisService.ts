import { Redis } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';
import { Conversation } from '../models/conversation';

class RedisService {
    private redis: Redis;

    constructor(redisClient?: Redis) {
        this.redis = redisClient || new Redis(config.REDIS_URL);
    }

    async saveConversation(userId: string, conversation: Conversation): Promise<void> {
        try {
            await this.redis.set(`conversation:${userId}`, JSON.stringify(conversation));
        } catch (error) {
            logger.error('Error saving conversation to Redis:', error);
            throw error;
        }
    }

    async getConversation(userId: string): Promise<Conversation | null> {
        try {
            const conversation = await this.redis.get(`conversation:${userId}`);
            return conversation ? JSON.parse(conversation) as Conversation : null;
        } catch (error) {
            logger.error('Error getting conversation from Redis:', error);
            throw error;
        }
    }

    async deleteConversation(userId: string): Promise<void> {
        try {
            await this.redis.del(`conversation:${userId}`);
        } catch (error) {
            logger.error('Error deleting conversation from Redis:', error);
            throw error;
        }
    }
}

const redisService = new RedisService();

export { redisService, RedisService };
