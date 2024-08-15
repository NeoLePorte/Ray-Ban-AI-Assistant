import {
    addDocumentToVectorStore,
    addPDFToVectorStore,
    addWordToVectorStore,
    addExcelToVectorStore,
    retrieveRelevantDocuments,
    generateAnswer,
    analyzeImageAndRetrieveInfo,
    getLocationBasedInfo,
    clearVectorStore,
    getVectorStoreSize,
} from '../../services/ragService';
import { redisService, RedisService } from '../../services/redisService';
import { getLangChainResponse, getLangChainImageResponse } from '../../services/langchainService';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { Document } from "langchain/document";
import logger from '../../utils/logger';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import fs from 'fs';

jest.mock('../../services/redisService');
jest.mock('../../services/langchainService');
jest.mock('langchain/text_splitter');
jest.mock('langchain/document_loaders/fs/pdf');
jest.mock('../../utils/logger');
jest.mock('mammoth');
jest.mock('exceljs');
jest.mock('fs');

describe('RAG Service', () => {
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisService = {
            addDocuments: jest.fn(),
            similaritySearch: jest.fn(),
            deleteDocuments: jest.fn(),
        } as unknown as jest.Mocked<RedisService>;
        (redisService as unknown as jest.Mock).mockResolvedValue(mockRedisService);
    });

    describe('addDocumentToVectorStore', () => {
        it('should add document chunks to vector store', async () => {
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            (RecursiveCharacterTextSplitter.prototype.createDocuments as jest.Mock).mockResolvedValue(mockDocs);

            await addDocumentToVectorStore('content', {});

            expect(mockRedisService.addDocuments).toHaveBeenCalledWith(mockDocs);
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            (RecursiveCharacterTextSplitter.prototype.createDocuments as jest.Mock).mockRejectedValue(new Error('Test error'));

            await expect(addDocumentToVectorStore('content', {})).rejects.toThrow('Test error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('addPDFToVectorStore', () => {
        it('should process PDF and add to vector store', async () => {
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            (PDFLoader.prototype.load as jest.Mock).mockResolvedValue(mockDocs);
            (RecursiveCharacterTextSplitter.prototype.splitDocuments as jest.Mock).mockResolvedValue(mockDocs);

            await addPDFToVectorStore(Buffer.from('pdf'), {});

            expect(mockRedisService.addDocuments).toHaveBeenCalledWith(mockDocs);
            expect(logger.info).toHaveBeenCalled();
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            (PDFLoader.prototype.load as jest.Mock).mockRejectedValue(new Error('PDF error'));

            await expect(addPDFToVectorStore(Buffer.from('pdf'), {})).rejects.toThrow('PDF error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('addWordToVectorStore', () => {
        it('should process Word document and add to vector store', async () => {
            (mammoth.extractRawText as jest.Mock).mockResolvedValue({ value: 'content' });
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            (RecursiveCharacterTextSplitter.prototype.createDocuments as jest.Mock).mockResolvedValue(mockDocs);

            await addWordToVectorStore(Buffer.from('word'), {});

            expect(mockRedisService.addDocuments).toHaveBeenCalledWith(mockDocs);
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            (mammoth.extractRawText as jest.Mock).mockRejectedValue(new Error('Word error'));

            await expect(addWordToVectorStore(Buffer.from('word'), {})).rejects.toThrow('Word error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('addExcelToVectorStore', () => {
        it('should process Excel document and add to vector store', async () => {
            const mockWorkbook = {
                eachSheet: jest.fn((callback) => callback({ eachRow: jest.fn((rowCallback) => rowCallback({ values: ['cell1', 'cell2'] })) })),
                xlsx: { load: jest.fn().mockResolvedValue(undefined) },
            };
            (ExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            (RecursiveCharacterTextSplitter.prototype.createDocuments as jest.Mock).mockResolvedValue(mockDocs);

            await addExcelToVectorStore(Buffer.from('excel'), {});

            expect(mockRedisService.addDocuments).toHaveBeenCalledWith(mockDocs);
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            (ExcelJS.Workbook as jest.Mock).mockImplementation(() => {
                return { xlsx: { load: jest.fn().mockRejectedValue(new Error('Excel error')) } };
            });

            await expect(addExcelToVectorStore(Buffer.from('excel'), {})).rejects.toThrow('Excel error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('retrieveRelevantDocuments', () => {
        it('should retrieve relevant documents', async () => {
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            mockRedisService.similaritySearch.mockResolvedValue(mockDocs);

            const result = await retrieveRelevantDocuments('query');

            expect(result).toEqual(mockDocs);
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            mockRedisService.similaritySearch.mockRejectedValue(new Error('Search error'));

            await expect(retrieveRelevantDocuments('query')).rejects.toThrow('Search error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('generateAnswer', () => {
        it('should generate an answer based on relevant documents', async () => {
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            mockRedisService.similaritySearch.mockResolvedValue(mockDocs);
            (getLangChainResponse as jest.Mock).mockResolvedValue('answer');

            const result = await generateAnswer('query', 'gpt-4o');

            expect(result).toBe('answer');
        });
    });

    describe('analyzeImageAndRetrieveInfo', () => {
        it('should analyze image and retrieve info', async () => {
            (getLangChainImageResponse as jest.Mock).mockResolvedValue('analysis');
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            mockRedisService.similaritySearch.mockResolvedValue(mockDocs);
            (getLangChainResponse as jest.Mock).mockResolvedValue('response');

            const result = await analyzeImageAndRetrieveInfo('image_url', 'query', 'gpt-4o');

            expect(result).toBe('response');
        });
    });

    describe('getLocationBasedInfo', () => {
        it('should get location-based info', async () => {
            const mockDocs = [{ pageContent: 'content', metadata: {} } as Document];
            mockRedisService.similaritySearch.mockResolvedValue(mockDocs);
            (getLangChainResponse as jest.Mock).mockResolvedValue('response');

            const result = await getLocationBasedInfo('location', 'query', 'gpt-4o');

            expect(result).toBe('response');
        });
    });

    describe('clearVectorStore', () => {
        it('should clear the vector store', async () => {
            await clearVectorStore();

            expect(mockRedisService.deleteAllDocuments).toHaveBeenCalledWith({ deleteAll: true });
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            mockRedisService.deleteAllDocuments.mockRejectedValue(new Error('Clear error'));

            await expect(clearVectorStore()).rejects.toThrow('Clear error');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getVectorStoreSize', () => {
        it('should return the vector store size', () => {
            const size = getVectorStoreSize();
            expect(typeof size).toBe('number');
        });
    });
});
