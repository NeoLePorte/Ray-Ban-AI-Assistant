import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import * as ragService from '../ragService';
import { RedisService } from '../redisService';
import { getLangChainResponse, getLangChainImageResponse } from '../langchainService';
import logger from '../../utils/logger';
import Redis from 'ioredis-mock';

jest.mock('langchain/document');
jest.mock('langchain/text_splitter');
jest.mock('langchain/document_loaders/fs/pdf');
jest.mock('../langchainService');
jest.mock('../../utils/logger');
jest.mock('mammoth');
jest.mock('exceljs');
jest.mock('fs');
jest.mock('os');

// Mock the RedisService to use ioredis-mock
jest.mock('../redisService', () => {
  const RedisService = jest.requireActual('../redisService').RedisService;
  const mockRedisClient = new Redis();
  const mockRedisService = new RedisService(mockRedisClient);

  return {
    redisService: Promise.resolve(mockRedisService),
    RedisService: jest.fn().mockImplementation(() => mockRedisService),
  };
});

describe('RAG Service', () => {
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { redisService } = await import('../redisService');
    mockRedisService = await redisService as unknown as jest.Mocked<RedisService>;
  });

  describe('addDocumentToVectorStore', () => {
    it('should add document chunks to vector store', async () => {
      const mockDocs = [new Document({ pageContent: 'test', metadata: { source: 'test1' } })];
      (RecursiveCharacterTextSplitter.prototype.createDocuments as jest.Mock).mockResolvedValue(mockDocs);

      await ragService.addDocumentToVectorStore('test content', { source: 'test1' });

      expect(mockRedisService.addDocuments).toHaveBeenCalledWith(mockDocs);
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('addPDFToVectorStore', () => {
    it('should process PDF and add to vector store', async () => {
      const mockDocs = [new Document({ pageContent: 'test', metadata: { source: 'test1' } })];
      (PDFLoader.prototype.load as jest.Mock).mockResolvedValue(mockDocs);
      (RecursiveCharacterTextSplitter.prototype.splitDocuments as jest.Mock).mockResolvedValue(mockDocs);

      await ragService.addPDFToVectorStore(Buffer.from('pdf content'), { source: 'test1' });

      expect(mockRedisService.addDocuments).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('addWordToVectorStore', () => {
    it('should process Word document and add to vector store', async () => {
      const mockText = 'test content';
      const mammoth = await import('mammoth');
      (mammoth.extractRawText as jest.Mock).mockResolvedValue({ value: mockText });

      await ragService.addWordToVectorStore(Buffer.from('word content'), { source: 'test1' });

      expect(mockRedisService.addDocuments).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('addExcelToVectorStore', () => {
    it('should process Excel document and add to vector store', async () => {
      const mockWorkbook = {
        xlsx: { load: jest.fn() },
        eachSheet: jest.fn((callback) => callback({ eachRow: jest.fn((rowCallback) => rowCallback({ values: ['test'] })) })),
      };
      const exceljs = await import('exceljs');
      (exceljs.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);

      await ragService.addExcelToVectorStore(Buffer.from('excel content'), { source: 'test1' });

      expect(mockRedisService.addDocuments).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('retrieveRelevantDocuments', () => {
    it('should retrieve relevant documents', async () => {
      const mockDocs = [new Document({ pageContent: 'test', metadata: { source: 'test1' } })];
      await mockRedisService.addDocuments(mockDocs);

      const result = await ragService.retrieveRelevantDocuments('test query');

      expect(result).toHaveLength(1);
      expect(result[0].pageContent).toBe('test');
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('generateAnswer', () => {
    it('should generate an answer based on relevant documents', async () => {
      const mockDocs = [new Document({ pageContent: 'relevant info', metadata: { source: 'test1' } })];
      mockRedisService.similaritySearch.mockResolvedValue(mockDocs);
      (getLangChainResponse as jest.Mock).mockResolvedValue('Generated answer');

      const result = await ragService.generateAnswer('test query', 'gpt-4o');

      expect(result).toBe('Generated answer');
      expect(getLangChainResponse).toHaveBeenCalled();
    });
  });

  describe('analyzeImageAndRetrieveInfo', () => {
    it('should analyze image and retrieve info', async () => {
      (getLangChainImageResponse as jest.Mock).mockResolvedValue('Image analysis');
      mockRedisService.similaritySearch.mockResolvedValue([]);
      (getLangChainResponse as jest.Mock).mockResolvedValue('Final response');

      const result = await ragService.analyzeImageAndRetrieveInfo('image.jpg', 'What is in this image?', 'gpt-4o');

      expect(result).toBe('Final response');
      expect(getLangChainImageResponse).toHaveBeenCalled();
      expect(getLangChainResponse).toHaveBeenCalled();
    });
  });

  describe('getLocationBasedInfo', () => {
    it('should get location-based info', async () => {
      mockRedisService.similaritySearch.mockResolvedValue([]);
      (getLangChainResponse as jest.Mock).mockResolvedValue('Location info');

      const result = await ragService.getLocationBasedInfo('New York', 'Best restaurants', 'gpt-4o');

      expect(result).toBe('Location info');
      expect(getLangChainResponse).toHaveBeenCalled();
    });
  });

  describe('clearVectorStore', () => {
    it('should clear the vector store', async () => {
      const mockDocs = [new Document({ pageContent: 'test', metadata: { source: 'test1' } })];
      await mockRedisService.addDocuments(mockDocs);

      await ragService.clearVectorStore();

      expect(mockRedisService.deleteAllDocuments).toHaveBeenCalled();
      const docs = await mockRedisService.similaritySearch('test');
      expect(docs).toHaveLength(0);
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('getVectorStoreSize', () => {
    it('should return the correct vector store size', () => {
      const size = ragService.getVectorStoreSize();
      expect(typeof size).toBe('number');
    });
  });
});
