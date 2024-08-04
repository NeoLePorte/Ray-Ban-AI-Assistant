import { getGPTResponse, getGPTImageResponse } from '../openaiService';
import { OpenAI } from 'openai';
import { AppError } from '../../utils/errorHandler';

jest.mock('openai');

describe('OpenAI Service', () => {
    const mockCreateCompletion = jest.fn();

    beforeAll(() => {
        (OpenAI.prototype as any).chat = {
            completions: {
                create: mockCreateCompletion,
            },
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getGPTResponse', () => {
        it('should return a valid response from OpenAI using gpt-4o', async () => {
            const mockResponse = {
                choices: [
                    { message: { content: 'This is a test response from OpenAI.' } },
                ],
            };

            mockCreateCompletion.mockResolvedValue(mockResponse);

            const response = await getGPTResponse('Test query', 'gpt-4o');

            expect(mockCreateCompletion).toHaveBeenCalledWith({
                model: 'gpt-4o',
                messages: [
                    { role: 'user', content: 'Limit your response to 100 characters for this query: Test query' },
                ],
                max_tokens: 100,
            });
            expect(response).toBe('This is a test response from OpenAI.');
        });

        it('should return a valid response from OpenAI using gpt-4o-mini', async () => {
            const mockResponse = {
                choices: [
                    { message: { content: 'This is a test response from OpenAI mini.' } },
                ],
            };

            mockCreateCompletion.mockResolvedValue(mockResponse);

            const response = await getGPTResponse('Test query', 'gpt-4o-mini');

            expect(mockCreateCompletion).toHaveBeenCalledWith({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'user', content: 'Limit your response to 100 characters for this query: Test query' },
                ],
                max_tokens: 100,
            });
            expect(response).toBe('This is a test response from OpenAI mini.');
        });

        it('should retry and succeed after an initial failure', async () => {
            const mockResponse = {
                choices: [
                    { message: { content: 'This is a retry response from OpenAI.' } },
                ],
            };

            mockCreateCompletion
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockResolvedValueOnce(mockResponse);

            const response = await getGPTResponse('Test retry query', 'gpt-4o');

            expect(mockCreateCompletion).toHaveBeenCalledTimes(2);
            expect(response).toBe('This is a retry response from OpenAI.');
        });

        it('should throw an error if OpenAI returns an empty response', async () => {
            mockCreateCompletion.mockResolvedValue({ choices: [{ message: { content: '' } }] });

            await expect(getGPTResponse('Test query', 'gpt-4o')).rejects.toThrow(AppError);
            await expect(getGPTResponse('Test query', 'gpt-4o')).rejects.toThrow('Received empty response from GPT');
        });

        it('should handle errors thrown by OpenAI', async () => {
            mockCreateCompletion.mockRejectedValue(new Error('OpenAI Error'));

            await expect(getGPTResponse('Test query', 'gpt-4o')).rejects.toThrow(AppError);
            await expect(getGPTResponse('Test query', 'gpt-4o')).rejects.toThrow('Failed to get response from GPT');
        });
    });

    describe('getGPTImageResponse', () => {
        it('should return a valid image analysis response from OpenAI using gpt-4o', async () => {
            const mockResponse = {
                choices: [
                    { message: { content: 'This is an image analysis response from OpenAI.' } },
                ],
            };

            mockCreateCompletion.mockResolvedValue(mockResponse);

            const response = await getGPTImageResponse('Analyze this image', 'base64encodedimage', 'gpt-4o');

            expect(mockCreateCompletion).toHaveBeenCalledWith({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this image, limit your response to 100 characters or less.' },
                            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,base64encodedimage' } },
                        ],
                    },
                ],
                max_tokens: 100,
            });
            expect(response).toBe('This is an image analysis response from OpenAI.');
        });

        it('should throw an error if OpenAI returns an empty image analysis response', async () => {
            mockCreateCompletion.mockResolvedValue({ choices: [{ message: { content: '' } }] });

            await expect(getGPTImageResponse('Analyze this image', 'base64encodedimage', 'gpt-4o')).rejects.toThrow(AppError);
            await expect(getGPTImageResponse('Analyze this image', 'base64encodedimage', 'gpt-4o')).rejects.toThrow('Received empty response from GPT for image analysis');
        });

        it('should handle errors thrown by OpenAI during image analysis', async () => {
            mockCreateCompletion.mockRejectedValue(new Error('OpenAI Error'));

            await expect(getGPTImageResponse('Analyze this image', 'base64encodedimage', 'gpt-4o')).rejects.toThrow(AppError);
            await expect(getGPTImageResponse('Analyze this image', 'base64encodedimage', 'gpt-4o')).rejects.toThrow('Received empty response from GPT for image analysis');
        });
    });
});