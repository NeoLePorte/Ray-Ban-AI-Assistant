import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../utils/logger';
import config from '../config';

// Define paths for saving media files
const SAVE_IMAGE_PATH = './tmp/query_image.jpg';
const SAVE_PDF_PATH = './tmp/query_document.pdf';

// Your WhatsApp API token
const WHATSAPP_TOKEN = config.WHATSAPP_TOKEN;

/**
 * Get the media URL from the WhatsApp Graph API using the media ID.
 * @param mediaId - The ID of the media to fetch the URL for.
 * @returns The URL of the media.
 */
export async function getMediaLink(mediaId: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
    });
    return response.data.url; // Extract the URL from the response
  } catch (error) {
    logger.error('Error getting media link', { mediaId, error });
    return null;
  }
}

/**
 * Download media from a given URL and save it to a file.
 * @param mediaUrl - The URL of the media to download.
 * @returns The path where the media is saved.
 */
export async function downloadMedia(mediaUrl: string, mediaType: 'image' | 'pdf'): Promise<string | null> {
  try {
    const savePath = mediaType === 'pdf' ? SAVE_PDF_PATH : SAVE_IMAGE_PATH;

    // Ensure the directory exists
    const directoryPath = path.dirname(savePath);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
    });

    // Write the file to disk
    fs.writeFileSync(savePath, response.data);
    return savePath;
  } catch (error) {
    logger.error('Error downloading media', { mediaUrl, error });
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
    logger.error('Error encoding file', { filePath, error });
    throw error;
  }
}

/**
 * Process a PDF document and return its content as a string.
 * @param pdfPath - The path of the PDF to process.
 * @returns The text content of the PDF.
 */
export async function processPDF(pdfPath: string): Promise<string> {
  // Assuming you have a PDF processing function that extracts text from a PDF
  // Use libraries like `pdf-parse` to extract text from the PDF for further processing.
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfParser = require('pdf-parse'); // Dynamically load the pdf-parse library
    const data = await pdfParser(pdfBuffer);
    return data.text; // Extracted text content from PDF
  } catch (error) {
    logger.error('Error processing PDF', { pdfPath, error });
    throw error;
  }
}

