import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import logger from '../utils/logger';
import { getLangChainResponse, getLangChainImageResponse } from './langchainService';
import { LLMType } from '../models/conversation';
import { redisService } from './redisService';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import os from 'os';

let documentCount = 0;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Function to add a document to the Redis-backed vector store
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

// Function to handle adding a PDF buffer to the vector store
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

// Function to handle adding a Word document buffer to the vector store
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

// Function to handle adding an Excel document buffer to the vector store
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

// Function to retrieve relevant documents from the Redis-backed vector store
export async function retrieveRelevantDocuments(query: string, k: number = 3): Promise<Document[]> {
  try {
    const redis = await redisService;
    const documents = await redis.similaritySearch(query, k);
    logger.info(`Retrieved ${documents.length} relevant documents for query`, { query });
    return documents;
  } catch (error) {
    logger.error('Error retrieving relevant documents', { error, query });
    throw error;
  }
}

// Function to generate an answer based on the retrieved documents and LLM
export async function generateAnswer(query: string, model: LLMType, userContext?: string): Promise<string> {
  const relevantDocs = await retrieveRelevantDocuments(query);
  const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
  const systemPrompt = `You are an AI assistant for smart glasses. Answer the question based on the following context and user-specific information. If the context doesn't contain relevant information, use your general knowledge to provide a helpful response. Keep your answers concise and suitable for brief voice interactions.

Context: ${context}
User-specific information: ${userContext || 'None provided'}

Question: ${query}

Answer:`;
  
  return await getLangChainResponse(query, model, systemPrompt);
}

// Function to analyze an image and retrieve information based on the analysis and documents
export async function analyzeImageAndRetrieveInfo(imageUrl: string, query: string, model: LLMType): Promise<string> {
  const imageAnalysis = await getLangChainImageResponse(query, imageUrl, model, "Analyze this image and describe what you see.");
  const relevantDocs = await retrieveRelevantDocuments(imageAnalysis);
  const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
  
  const systemPrompt = `You are an AI assistant for smart glasses. Based on the image analysis and the following context, provide a concise and informative response to the user's query. If the context doesn't contain relevant information, use your general knowledge.

Image Analysis: ${imageAnalysis}
Context: ${context}

User's Query: ${query}

Response:`;

  return await getLangChainResponse(query, model, systemPrompt);
}

// Function to provide location-based information
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

// Function to clear the Redis-backed vector store
export async function clearVectorStore(): Promise<void> {
  try {
    const redis = await redisService;
    await redis.deleteConversation('ALL'); // Assuming this clears all documents
    documentCount = 0;
    logger.info('Vector store cleared. Document count reset to 0.');
  } catch (error) {
    logger.error('Error clearing vector store', { error });
    throw error;
  }
}

// Function to get the current size of the vector store
export function getVectorStoreSize(): number {
  return documentCount;
}