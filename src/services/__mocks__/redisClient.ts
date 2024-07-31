import redisMock from 'redis-mock';
import { Redis } from 'ioredis';

const redisClient = redisMock.createClient();

// Type assertion to match ioredis.Redis
const mockedRedisClient = redisClient as unknown as Redis;

export default mockedRedisClient;
