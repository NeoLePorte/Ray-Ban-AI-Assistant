import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import logger from '../utils/logger';
import { getLangChainResponse, getLangChainImageResponse } from './langchainService';
import { LLMType } from '../models/conversation';
import redisService from './redisService';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OpenAIEmbeddings } from "@langchain/openai";
import { LangGraphService } from './langGraphService';
import { AppError } from '../utils/errorHandler';  // Adjust the path as needed
import { LangGraphError } from '../utils/errorHandler';  // Adjust the path as needed

let documentCount = 0;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function addDocumentToVectorStore(content: string, metadata: Record<string, any>): Promise<void> {
  try {
    const docs = await textSplitter.createDocuments([content], [metadata]);
    const redis = await redisService;
    await redis.addDocuments(docs);
    documentCount += docs.length;
    logger.info(`Added ${docs.length} document chunks to vector store. Total count: ${documentCount}`);
  } catch (error) {
    logger.error('Error adding document to vector store', { error });
    throw error;
  }
}

export async function addPDFToVectorStore(pdfBuffer: Buffer, metadata: Record<string, any>): Promise<void> {
  try {
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}_temp.pdf`);
    fs.writeFileSync(tempFilePath, pdfBuffer);

    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();
    const splitDocs = await textSplitter.splitDocuments(docs);

    const redis = await redisService;
    await redis.addDocuments(splitDocs.map(doc => ({ ...doc, metadata: { ...doc.metadata, ...metadata } })));
    documentCount += splitDocs.length;
    logger.info(`Added ${splitDocs.length} PDF chunks to vector store. Total count: ${documentCount}`);

    fs.unlinkSync(tempFilePath);
  } catch (error) {
    logger.error('Error adding PDF to vector store', { error });
    throw error;
  }
}

export async function addWordToVectorStore(docBuffer: Buffer, metadata: Record<string, any>): Promise<void> {
  try {
    const result = await mammoth.extractRawText({ buffer: docBuffer });
    const text = result.value;
    await addDocumentToVectorStore(text, metadata);
    logger.info('Word document processed and added to vector store.');
  } catch (error) {
    logger.error('Error processing Word document', { error });
    throw error;
  }
}

export async function addExcelToVectorStore(excelBuffer: Buffer, metadata: Record<string, any>): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer);
    
    let textContent = '';
    workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
            if (Array.isArray(row.values)) {
                textContent += row.values.join(' ') + '\n';
            }
        });
    });

    await addDocumentToVectorStore(textContent, metadata);
    logger.info('Excel document processed and added to vector store.');
  } catch (error) {
    logger.error('Error processing Excel document', { error });
    throw error;
  }
}

export async function retrieveRelevantDocuments(query: string, k: number = 3): Promise<Document[]> {
  try {
    const redis = await redisService;
    const documents = await redis.similaritySearch(query, k);
    logger.info(`Retrieved ${documents.length} relevant documents for query`, { query });
    return documents;
  } catch (error) {
    logger.error('Error retrieving relevant documents', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query
    });
    return []; // Return empty array instead of throwing
  }
}

export async function generateAnswer(query: string, model: LLMType, userContext?: string): Promise<string> {
  try {
    logger.info('Starting answer generation', { 
      query, 
      model,
      hasUserContext: !!userContext 
    });

    const langGraph = new LangGraphService(model);
    
    // Get relevant documents
    const relevantDocs = await retrieveRelevantDocuments(query, 3);
    logger.debug('Retrieved relevant documents', {
      query,
      documentCount: relevantDocs.length,
      documentSources: relevantDocs.map(doc => doc.metadata?.source)
    });

    const currentContext = relevantDocs.map(doc => doc.pageContent).join('\n');
    const contextString = currentContext || userContext || '';
    
    logger.debug('Processing with context', {
      query,
      contextLength: contextString.length,
      model
    });
    
    // Process the message with context using the new LangGraph implementation
    const response = await langGraph.processMessage(query, contextString);

    logger.info('Answer generated successfully', {
      query,
      responseLength: response.length,
      model
    });

    return response;
  } catch (error) {
    logger.error('Error generating answer', { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      } : error,
      query, 
      model,
      step: 'generateAnswer'
    });

    // Determine appropriate error message and status code
    if (error instanceof LangGraphError) {
      throw error; // Propagate LangGraph errors as-is
    } else if (error instanceof AppError) {
      throw error; // Propagate other AppErrors as-is
    } else {
      throw new AppError(
        'Failed to generate answer',
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}

export async function analyzeImageAndRetrieveInfo(imageUrl: string, query: string, model: LLMType): Promise<string> {
  try {
    const langGraph = new LangGraphService(model);
    const imageAnalysis = await getLangChainImageResponse(query, imageUrl, model, "Analyze this image and describe what you see.");
    const relevantDocs = await retrieveRelevantDocuments(imageAnalysis);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
    
    const response = await langGraph.processMessage(
      query,
      `Image Analysis: ${imageAnalysis}\nContext: ${context}`
    );

    return response;
  } catch (error) {
    logger.error('Error analyzing image', { error, query, model });
    throw new Error('Failed to analyze image');
  }
}

export async function getLocationBasedInfo(location: string, query: string, model: LLMType): Promise<string> {
  const relevantDocs = await retrieveRelevantDocuments(`${location} ${query}`);
  const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
  
  const systemPrompt = `You are an AI assistant for smart glasses. Provide location-specific information based on the following context. If the context doesn't contain relevant information, use your general knowledge to provide helpful information about the location.

Location: ${location}
Context: ${context}

User's Query: ${query}

Response:`;

  return await getLangChainResponse(query, model, systemPrompt);
}

export async function clearVectorStore(): Promise<void> {
  try {
    const redis = await redisService;
    await redis.deleteAllDocuments();
    documentCount = 0;
    logger.info('Vector store cleared. Document count reset to 0.');
  } catch (error) {
    logger.error('Error clearing vector store', { error });
    throw error;
  }
}

export function getVectorStoreSize(): number {
  return documentCount;
}

export async function getAndStoreEmbedding(userId: string, messageId: string, text: string): Promise<number[]> {
    try {
        const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
        const embedding = await embeddings.embedQuery(text);
        
        // Store in Redis
        const redis = await redisService;
        await redis.storeEmbedding(userId, messageId, embedding);
        
        logger.info('Embedding stored successfully', { userId, messageId });
        return embedding;
    } catch (error) {
        logger.error('Error generating and storing embedding', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            userId, 
            messageId 
        });
        throw new Error('Failed to generate and store embedding');
    }
}
