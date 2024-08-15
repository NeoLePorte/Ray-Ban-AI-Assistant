import fs from 'fs';
//import path from 'path';
import axios from 'axios';
import { getMediaLink, downloadMedia, encodeFileToBase64, processPDF } from '../../services/mediaService';
import logger from '../../utils/logger';

jest.mock('axios');
jest.mock('../../utils/logger');

describe('mediaService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaLink', () => {
    it('should return the media URL when the API call is successful', async () => {
      const mediaId = '12345';
      const mediaUrl = 'http://example.com/media.jpg';
      (axios.get as jest.Mock).mockResolvedValue({ data: { url: mediaUrl } });

      const result = await getMediaLink(mediaId);

      expect(result).toBe(mediaUrl);
      expect(axios.get).toHaveBeenCalledWith(`https://graph.facebook.com/v19.0/${mediaId}`, {
        headers: { Authorization: `Bearer undefined` }, // Assuming WHATSAPP_TOKEN is undefined in the test environment
      });
    });

    it('should log an error and return null if the API call fails', async () => {
      const mediaId = '12345';
      (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await getMediaLink(mediaId);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error getting media link', { mediaId, error: expect.any(Error) });
    });
  });

  describe('downloadMedia', () => {
    const mediaUrl = 'http://example.com/media.jpg';
    const savePath = './tmp/query_image.jpg';
    const pdfPath = './tmp/query_document.pdf';

    beforeEach(() => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'mkdirSync').mockReturnValue(savePath);  // Mocking mkdirSync to return the directory path
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    });

    it('should download and save an image file', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from('image data') });

      const result = await downloadMedia(mediaUrl, 'image');

      expect(result).toBe(savePath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(savePath, expect.any(Buffer));
    });

    it('should download and save a PDF file', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from('pdf data') });

      const result = await downloadMedia(mediaUrl, 'pdf');

      expect(result).toBe(pdfPath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(pdfPath, expect.any(Buffer));
    });

    it('should log an error and return null if the download fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Download Error'));

      const result = await downloadMedia(mediaUrl, 'image');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error downloading media', { mediaUrl, error: expect.any(Error) });
    });
  });

  describe('encodeFileToBase64', () => {
    const filePath = './tmp/query_image.jpg';

    beforeEach(() => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('file data'));
    });

    it('should encode a file to Base64 format', async () => {
      const fileBuffer = Buffer.from('file data');

      const result = await encodeFileToBase64(filePath);

      expect(result).toBe(fileBuffer.toString('base64'));
    });

    it('should log an error and throw if encoding fails', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File Read Error');
      });

      await expect(encodeFileToBase64(filePath)).rejects.toThrow('File Read Error');
      expect(logger.error).toHaveBeenCalledWith('Error encoding file', { filePath, error: expect.any(Error) });
    });
  });

  describe('processPDF', () => {
    const pdfPath = './tmp/query_document.pdf';

    beforeEach(() => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('pdf data'));
    });

    it('should process a PDF and return its text content', async () => {
      const pdfParseMock = jest.fn().mockResolvedValue({ text: 'Extracted text from PDF' });
      jest.mock('pdf-parse', () => pdfParseMock);

      const result = await processPDF(pdfPath);

      expect(result).toBe('Extracted text from PDF');
      expect(pdfParseMock).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should log an error and throw if PDF processing fails', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File Read Error');
      });

      await expect(processPDF(pdfPath)).rejects.toThrow('File Read Error');
      expect(logger.error).toHaveBeenCalledWith('Error processing PDF', { pdfPath, error: expect.any(Error) });
    });
  });
});
