import dotenv from 'dotenv';
import path from 'path';
import { jest } from '@jest/globals';
import RedisMock from 'ioredis-mock';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

// Mock the logger
jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
  silly: jest.fn(),
}));

// Use ioredis-mock to simulate Redis
jest.mock('ioredis', () => RedisMock);

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
