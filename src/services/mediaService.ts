// src/services/mediaService.ts

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../utils/logger';
import config from '../config';

// Path to save the downloaded image
const SAVE_IMAGE_PATH = './tmp/query_image.jpg';

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
export async function downloadMedia(mediaUrl: string): Promise<string | null> {
  try {
    // Ensure the directory exists
    const directoryPath = path.dirname(SAVE_IMAGE_PATH);
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
    fs.writeFileSync(SAVE_IMAGE_PATH, response.data);
    return SAVE_IMAGE_PATH;
  } catch (error) {
    logger.error('Error downloading media', { mediaUrl, error });
    return null;
  }
}

/**
 * Encode an image to Base64 format.
 * @param imagePath - The path of the image to encode.
 * @returns The Base64 encoded string of the image.
 */
export async function encodeImage(imagePath: string): Promise<string> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    logger.error('Error encoding image', { imagePath, error });
    throw error;
  }
}
