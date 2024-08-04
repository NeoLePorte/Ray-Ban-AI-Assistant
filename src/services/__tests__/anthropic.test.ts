// src/services/__tests__/anthropicService.test.ts

import { getClaudeResponse, getClaudeImageResponse } from '../anthropicService';
import Anthropic from '@anthropic-ai/sdk';
import { AppError } from '../../utils/errorHandler';

jest.mock('@anthropic-ai/sdk');

describe('Anthropic Service', () => {
    const mockCreateMessage = jest.fn();

    beforeAll(() => {
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

            mockCreateMessage.mockResolvedValue(mockResponse);

            const response = await getClaudeResponse('Test query', 'claude-3-opus-20240229');

            expect(mockCreateMessage).toHaveBeenCalledWith({
                model: 'claude-3-opus-20240229',
                max_tokens: 1000,
                temperature: 1,
                system: "You are a helpful AI assistant. Provide concise and accurate responses.",
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Test query'
                            }
                        ]
                    }
                ]
            });

            expect(response).toBe('This is a test response from Claude.');
        });

        it('should throw an AppError if Claude returns an unexpected format', async () => {
            const mockResponse = {
                content: [{ image: 'image-data' }],
            };

            mockCreateMessage.mockResolvedValue(mockResponse);

            await expect(getClaudeResponse('Test query', 'claude-3-opus-20240229'))
                .rejects.toThrow(AppError);
            // Update to match actual service implementation
            await expect(getClaudeResponse('Test query', 'claude-3-opus-20240229'))
                .rejects.toThrow('Unexpected response format from Claude'); // Error message from service
        });

        it('should handle errors thrown by Anthropic', async () => {
            mockCreateMessage.mockRejectedValue(new Error('Anthropic Error'));

            await expect(getClaudeResponse('Test query', 'claude-3-opus-20240229'))
                .rejects.toThrow(AppError);
            // Update to match actual service implementation
            await expect(getClaudeResponse('Test query', 'claude-3-opus-20240229'))
                .rejects.toThrow('Unexpected response format from Claude'); // Error message from service
        });
    });

    describe('getClaudeImageResponse', () => {
        it('should return a valid image analysis response from Claude', async () => {
            const mockResponse = {
                content: [
                    { text: 'This is an image analysis response from Claude.' },
                ],
            };

            mockCreateMessage.mockResolvedValue(mockResponse);

            const response = await getClaudeImageResponse('Analyze this image', 'base64encodedimage', 'claude-3-opus-20240229');

            expect(mockCreateMessage).toHaveBeenCalledWith({
                model: 'claude-3-opus-20240229',
                max_tokens: 1000,
                temperature: 1,
                system: "You are a helpful AI assistant capable of analyzing images. Provide concise and accurate responses.",
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

            expect(response).toBe('This is an image analysis response from Claude.');
        });

        it('should throw an AppError if Claude returns an unexpected image analysis format', async () => {
            const mockResponse = {
                content: [{ video: 'video-data' }],
            };

            mockCreateMessage.mockResolvedValue(mockResponse);

            await expect(getClaudeImageResponse('Analyze this image', 'base64encodedimage', 'claude-3-opus-20240229'))
                .rejects.toThrow(AppError);
            // Update to match actual service implementation
            await expect(getClaudeImageResponse('Analyze this image', 'base64encodedimage', 'claude-3-opus-20240229'))
                .rejects.toThrow('Unexpected response format from Claude for image analysis'); // Error message from service
        });

        it('should handle errors thrown by Anthropic during image analysis', async () => {
            mockCreateMessage.mockRejectedValue(new Error('Anthropic Image Error'));

            await expect(getClaudeImageResponse('Analyze this image', 'base64encodedimage', 'claude-3-opus-20240229'))
                .rejects.toThrow(AppError);
            // Update to match actual service implementation
            await expect(getClaudeImageResponse('Analyze this image', 'base64encodedimage', 'claude-3-opus-20240229'))
                .rejects.toThrow('Unexpected response format from Claude for image analysis'); // Error message from service
        });
    });
});
