// src/services/__tests__/mediaService.test.ts

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { downloadMedia, encodeImage, getMediaLink } from '../mediaService';
import logger from '../../utils/logger';
import config from '../../config';

jest.mock('axios');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('../../utils/logger');

describe('mediaService', () => {
  const SAVE_IMAGE_PATH = './tmp/query_image.jpg';
  const TEMP_DIR = path.dirname(SAVE_IMAGE_PATH);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaLink', () => {
    it('should retrieve media URL successfully', async () => {
      const mediaId = 'test_media_id';
      const mediaUrl = 'http://example.com/media.jpg';

      // Mock axios.get to return the media URL
      (axios.get as jest.Mock).mockResolvedValue({
        data: { url: mediaUrl },
      });

      const result = await getMediaLink(mediaId);

      // Verify that axios.get was called with the correct URL and headers
      expect(axios.get).toHaveBeenCalledWith(`https://graph.facebook.com/v19.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${config.WHATSAPP_TOKEN}` },
      });

      expect(result).toBe(mediaUrl);
    });

    it('should return null and log an error if media link retrieval fails', async () => {
      const mediaId = 'test_media_id';
      const error = new Error('Network error');

      // Mock axios.get to reject with an error
      (axios.get as jest.Mock).mockRejectedValue(error);

      const result = await getMediaLink(mediaId);

      expect(result).toBeNull();

      // Verify logger is called with the correct message
      expect(logger.error).toHaveBeenCalledWith('Error getting media link', {
        mediaId,
        error,
      });
    });
  });

  describe('downloadMedia', () => {
    it('should download media successfully', async () => {
      const mediaUrl = 'http://example.com/media.jpg';
      const imageData = Buffer.from('test image data');

      // Mock the axios.get to return a response with data as a buffer
      (axios.get as jest.Mock).mockResolvedValue({
        data: imageData,
      });

      // Mock the fs.existsSync function to return false initially
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock the fs.mkdirSync function
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      // Mock the fs.writeFileSync function to write the image data
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      // Call the function being tested
      const result = await downloadMedia(mediaUrl);

      // Ensure paths are correctly compared
      expect(result).toBe(SAVE_IMAGE_PATH);

      // Check if fs methods were called with the correct arguments
      expect(fs.existsSync).toHaveBeenCalledWith(TEMP_DIR);
      expect(fs.mkdirSync).toHaveBeenCalledWith(TEMP_DIR, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(SAVE_IMAGE_PATH, imageData);
    });

    it('should return null and log an error if download fails', async () => {
      const mediaUrl = 'http://example.com/media.jpg';
      const error = new Error('Network error');

      // Mock axios.get to reject with an error
      (axios.get as jest.Mock).mockRejectedValue(error);

      // Call the function being tested
      const result = await downloadMedia(mediaUrl);

      // Expect the function to return null on failure
      expect(result).toBeNull();

      // Verify logger is called with the correct message
      expect(logger.error).toHaveBeenCalledWith('Error downloading media', {
        mediaUrl,
        error,
      });
    });
  });

  describe('encodeImage', () => {
    it('should encode an image to base64 format', async () => {
      const imageData = Buffer.from('test image data');

      // Mock the fs readFileSync function
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(imageData);

      // Call the function being tested
      const base64 = await encodeImage(SAVE_IMAGE_PATH);

      // Expect the function to return correct base64 string
      expect(base64).toBe(imageData.toString('base64'));

      // Check if readFileSync was called with the correct arguments
      expect(fs.readFileSync).toHaveBeenCalledWith(SAVE_IMAGE_PATH);
    });

    it('should throw an error if reading the image fails', async () => {
      const error = new Error('File not found');

      // Mock fs.readFileSync to throw an error
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      // Expect the function to throw an error
      await expect(encodeImage(SAVE_IMAGE_PATH)).rejects.toThrow('File not found');

      // Verify logger is called with the correct message
      expect(logger.error).toHaveBeenCalledWith('Error encoding image', {
        imagePath: SAVE_IMAGE_PATH,
        error,
      });
    });
  });
});
