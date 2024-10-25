import {
    getLangChainResponse,
    getLangChainImageResponse,
    getStructuredOutput,
    streamLangChainResponse,
} from '../../services/langchainService';
import { LLMType } from '../../models/conversation';
import { AppError } from '../../utils/errorHandler';
import { ChatOpenAI } from '@langchain/openai';
//import { ChatAnthropic } from '@langchain/anthropic';
import { BaseCallbackHandler } from 'langchain/callbacks';
import { z } from 'zod';

jest.mock('@langchain/openai');
jest.mock('@langchain/anthropic');
jest.mock('langchain/schema/runnable', () => ({
    RunnableSequence: {
        from: jest.fn().mockImplementation(() => ({
            invoke: jest.fn().mockResolvedValue('mocked response'),
        })),
    },
}));

describe('LangChain Service Functions', () => {
    const mockModel = 'gpt-4o' as LLMType;
    const mockSystemPrompt = 'This is a system prompt.';
    const mockQuery = 'What is AI?';
    const mockImageBase64 = 'base64ImageString';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getLangChainResponse', () => {
        it('should return a valid response from a supported model', async () => {
            const response = await getLangChainResponse(mockQuery, mockModel, mockSystemPrompt);

            expect(ChatOpenAI).toHaveBeenCalledWith({ modelName: mockModel, openAIApiKey: expect.any(String) });
            expect(response).toBe('mocked response');
        });

        it('should throw an AppError for unsupported models', async () => {
            const invalidModel = 'invalid-model' as LLMType;

            await expect(getLangChainResponse(mockQuery, invalidModel, mockSystemPrompt)).rejects.toThrow(AppError);
        });
    });

    describe('getLangChainImageResponse', () => {
        it('should return a valid response after analyzing an image', async () => {
            const response = await getLangChainImageResponse(mockQuery, mockImageBase64, mockModel, mockSystemPrompt);

            expect(ChatOpenAI).toHaveBeenCalledWith({ modelName: mockModel, openAIApiKey: expect.any(String) });
            expect(response).toBe('mocked response');
        });
    });

    describe('getStructuredOutput', () => {
        it('should return structured output as per the provided schema', async () => {
            const schema = z.object({
                result: z.string(),
            });

            const mockStructuredResponse = { result: 'Structured data' };
            jest.spyOn(z.ZodObject.prototype, 'parse').mockReturnValue(mockStructuredResponse);

            const response = await getStructuredOutput(mockQuery, mockModel, schema);

            expect(ChatOpenAI).toHaveBeenCalledWith({ modelName: mockModel, openAIApiKey: expect.any(String) });
            expect(response).toEqual(mockStructuredResponse);
        });
    });

    describe('streamLangChainResponse', () => {
        it('should stream responses correctly using callbacks', async () => {
            const mockCallbacks: BaseCallbackHandler[] = [];

            await streamLangChainResponse(mockQuery, mockModel, mockSystemPrompt, mockCallbacks);

            expect(ChatOpenAI).toHaveBeenCalledWith({ modelName: mockModel, openAIApiKey: expect.any(String) });
        });
    });
});