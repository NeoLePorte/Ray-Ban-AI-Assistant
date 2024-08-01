import redisMock from 'redis-mock';
import { Redis } from 'ioredis';

const redisClient = redisMock.createClient();

// Extend the mock client with additional methods
const extendedRedisClient = {
  ...redisClient,
  
  // Add missing methods
  set: (key: string, value: string) => {
    return new Promise<'OK'>((resolve) => {
      redisClient.set(key, value, () => resolve('OK'));
    });
  },

  get: (key: string) => {
    return new Promise<string | null>((resolve) => {
      redisClient.get(key, (_, reply) => resolve(reply));
    });
  },

  del: (key: string) => {
    return new Promise<number>((resolve) => {
      redisClient.del(key, (_, reply) => resolve(reply));
    });
  },

  keys: (pattern: string) => {
    return new Promise<string[]>((resolve) => {
      redisClient.keys(pattern, (_, reply) => resolve(reply));
    });
  },

  flushall: () => {
    return new Promise<'OK'>((resolve) => {
      redisClient.flushall(() => resolve('OK'));
    });
  },

  // Add quit method
  quit: () => {
    return new Promise<'OK'>((resolve) => {
      // Simulating async behavior
      setTimeout(() => resolve('OK'), 0);
    });
  },

  // Add any other methods you're using in your RedisService
};

// Type assertion to match ioredis.Redis
const mockedRedisClient = extendedRedisClient as unknown as Redis;

export default mockedRedisClient;