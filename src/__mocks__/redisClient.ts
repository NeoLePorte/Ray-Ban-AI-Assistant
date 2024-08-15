import { Redis } from 'ioredis';

const mockStorage: { [key: string]: string | { [field: string]: string } } = {};

const redisClient = {
  set: jest.fn((key, value) => {
    mockStorage[key] = value;
    return Promise.resolve('OK');
  }),
  get: jest.fn((key) => Promise.resolve(mockStorage[key] as string || null)),
  del: jest.fn((key) => {
    delete mockStorage[key];
    return Promise.resolve(1);
  }),
  keys: jest.fn((pattern) => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Promise.resolve(Object.keys(mockStorage).filter(key => regex.test(key)));
  }),
  hset: jest.fn((key, field, value) => {
    if (!mockStorage[key]) {
      mockStorage[key] = {};
    }
    (mockStorage[key] as { [field: string]: string })[field] = value;
    return Promise.resolve(1);
  }),
  hgetall: jest.fn((key) => {
    return Promise.resolve(mockStorage[key] as { [field: string]: string } || {});
  }),
  flushall: jest.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    return Promise.resolve('OK');
  }),
  quit: jest.fn(() => Promise.resolve('OK')),
  on: jest.fn(),
};

const mockedRedisClient = redisClient as unknown as Redis;

export default mockedRedisClient;
