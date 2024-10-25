import RedisMock from 'ioredis-mock';
import { Redis } from 'ioredis';

const createMockRedisClient = (): jest.Mocked<Redis> => {
  const redisMock = new RedisMock();

  // Create a proxy to handle property access and method calls
  return new Proxy(redisMock, {
    get: (target, prop) => {
      const value = (target as any)[prop];
      if (typeof value === 'function') {
        // Wrap methods with Jest mock functions
        return jest.fn((...args: any[]) => {
          return value.apply(target, args);
        });
      }
      return value;
    },
  }) as unknown as jest.Mocked<Redis>;
};

const mockRedisClient = createMockRedisClient();

// Add custom implementations for methods not provided by ioredis-mock
mockRedisClient.call = jest.fn((command: string, ..._args: any[]) => {
  switch (command) {
    case 'FT.CREATE':
    case 'FT.SEARCH':
    case 'FT.INFO':
    case 'JSON.SET':
    case 'JSON.GET':
    case 'JSON.DEL':
      return Promise.resolve('OK');
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
});

export default mockRedisClient;