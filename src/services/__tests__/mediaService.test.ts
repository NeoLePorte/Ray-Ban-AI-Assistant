// src/services/__tests__/mediaService.test.ts

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { downloadMedia, encodeImage } from '../mediaService';

jest.mock('axios');
jest.mock('fs/promises');

describe('mediaService', () => {
    // Set the temp directory to the correct path
    const TEMP_DIR = path.join(__dirname, '..', '..', '..', 'tmp');

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('downloadMedia', () => {
        it('should download media successfully', async () => {
            const mediaId = 'test_media_id';
            const mediaUrl = 'http://example.com/media.jpg';
            const imageData = Buffer.from('test image data');

            // Mock the responses
            (axios.get as jest.Mock)
                .mockResolvedValueOnce({ data: { url: mediaUrl } }) // First call for media URL
                .mockResolvedValueOnce({ data: imageData }); // Second call for media data

            const imagePath = path.join(TEMP_DIR, `${mediaId}.jpg`);
            
            // Mock the fs writeFile function
            (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);

            // Call the function being tested
            const result = await downloadMedia(mediaId);

            // Use path.join and path.resolve for normalization and comparison
            expect(path.resolve(result!)).toBe(path.resolve(imagePath));

            // Check if writeFile was called with the correct arguments
            expect(fs.writeFile).toHaveBeenCalledWith(imagePath, imageData);
        });

        it('should return null and log an error if download fails', async () => {
            const mediaId = 'test_media_id';
            const error = new Error('Network error');

            // Mock axios to reject with an error
            (axios.get as jest.Mock).mockRejectedValueOnce(error);

            // Call the function being tested
            const result = await downloadMedia(mediaId);

            // Expect the function to return null on failure
            expect(result).toBeNull();
        });
    });

    describe('encodeImage', () => {
        it('should encode an image to base64 format', async () => {
            const imagePath = path.join(TEMP_DIR, 'test.jpg');
            const imageData = Buffer.from('test image data');

            // Mock the fs readFile function
            (fs.readFile as jest.Mock).mockResolvedValueOnce(imageData);

            // Call the function being tested
            const base64 = await encodeImage(imagePath);

            // Expect the function to return correct base64 string
            expect(base64).toBe(imageData.toString('base64'));

            // Check if readFile was called with the correct arguments
            expect(fs.readFile).toHaveBeenCalledWith(imagePath);
        });

        it('should throw an error if reading the image fails', async () => {
            const imagePath = path.join(TEMP_DIR, 'test.jpg');
            const error = new Error('File not found');

            // Mock fs to reject with an error
            (fs.readFile as jest.Mock).mockRejectedValueOnce(error);

            // Expect the function to throw an error
            await expect(encodeImage(imagePath)).rejects.toThrow('File not found');
        });
    });
});
