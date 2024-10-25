import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../utils/logger';
//import config from '../config';

// Define paths for saving media files
const SAVE_IMAGE_PATH = './tmp/query_image.jpg';
const SAVE_PDF_PATH = './tmp/query_document.pdf';

/**
 * Download media from a given URL and save it to a file.
 * @param mediaUrl - The URL of the media to download.
 * @param mediaType - The type of media (image or file).
 * @returns The path where the media is saved.
 */
export async function downloadMedia(mediaUrl: string, mediaType: 'image' | 'file'): Promise<string | null> {
  try {
    const savePath = mediaType === 'file' ? SAVE_PDF_PATH : SAVE_IMAGE_PATH;

    // Ensure the directory exists
    const directoryPath = path.dirname(savePath);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
    });

    // Write the file to disk
    fs.writeFileSync(savePath, response.data);
    return savePath;
  } catch (error) {
    logger.error('Error downloading media', { mediaUrl, error: error as any });
    return null;
  }
}

/**
 * Encode an image or document to Base64 format.
 * @param filePath - The path of the file to encode.
 * @returns The Base64 encoded string of the file.
 */
export async function encodeFileToBase64(filePath: string): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
  } catch (error) {
    logger.error('Error encoding file', { filePath, error: error as any });
    throw error;
  }
}
