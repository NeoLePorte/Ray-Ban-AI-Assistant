// src/services/__tests__/anthropicService.test.ts

import { getClaudeResponse, getClaudeImageResponse } from '../anthropicService';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('Anthropic Service', () => {
    const mockCreateMessage = jest.fn();

    beforeAll(() => {
        // Mock the Anthropic prototype to simulate the API calls
        (Anthropic.prototype as any).messages = {
            create: mockCreateMessage,
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getClaudeResponse', () => {
        it('should return a valid response from Claude', async () => {
            const mockResponse = {
                content: [
                    { text: 'This is a test response from Claude.' },
                ],
            };

            // Mock a successful API response
            mockCreateMessage.mockResolvedValue(mockResponse);

            // Call the function being tested
            const response = await getClaudeResponse('Test query');

            // Verify that the API was called with the correct parameters
            expect(mockCreateMessage).toHaveBeenCalledWith({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 100,
                messages: [{ role: 'user', content: 'Test query' }],
            });

            // Assert the expected outcome
            expect(response).toBe('This is a test response from Claude.');
        });

        it('should throw an error if Claude returns an unexpected format', async () => {
            const mockResponse = {
                content: [{ image: 'image-data' }], // Simulating an unexpected format
            };

            // Mock a response with unexpected format
            mockCreateMessage.mockResolvedValue(mockResponse);

            // Ensure the function throws an error for unexpected format
            await expect(getClaudeResponse('Test query')).rejects.toThrow('Unexpected response format');
        });

        it('should handle errors thrown by Anthropic', async () => {
            // Mock an error response
            mockCreateMessage.mockRejectedValue(new Error('Anthropic Error'));

            // Ensure the function propagates the error
            await expect(getClaudeResponse('Test query')).rejects.toThrow('Anthropic Error');
        });
    });

    describe('getClaudeImageResponse', () => {
        it('should return a valid image analysis response from Claude', async () => {
            const mockResponse = {
                content: [
                    { text: 'This is an image analysis response from Claude.' },
                ],
            };

            // Mock a successful API response
            mockCreateMessage.mockResolvedValue(mockResponse);

            // Call the function being tested
            const response = await getClaudeImageResponse('Analyze this image', 'base64encodedimage');

            // Verify that the API was called with the correct parameters
            expect(mockCreateMessage).toHaveBeenCalledWith({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 100,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this image' },
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: 'image/jpeg',
                                    data: 'base64encodedimage',
                                },
                            },
                        ],
                    },
                ],
            });

            // Assert the expected outcome
            expect(response).toBe('This is an image analysis response from Claude.');
        });

        it('should throw an error if Claude returns an unexpected image analysis format', async () => {
            const mockResponse = {
                content: [{ video: 'video-data' }], // Simulating an unexpected format
            };

            // Mock a response with unexpected format
            mockCreateMessage.mockResolvedValue(mockResponse);

            // Ensure the function throws an error for unexpected format
            await expect(getClaudeImageResponse('Analyze this image', 'base64encodedimage')).rejects.toThrow('Unexpected response format');
        });

        it('should handle errors thrown by Anthropic during image analysis', async () => {
            // Mock an error response
            mockCreateMessage.mockRejectedValue(new Error('Anthropic Image Error'));

            // Ensure the function propagates the error
            await expect(getClaudeImageResponse('Analyze this image', 'base64encodedimage')).rejects.toThrow('Anthropic Image Error');
        });
    });
});
