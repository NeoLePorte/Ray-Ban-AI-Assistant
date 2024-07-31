import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import logger from '../utils/logger';

const TEMP_DIR = path.join(__dirname, '..', '..', 'tmp');

export async function downloadMedia(mediaId: string): Promise<string | null> {
    try {
        // Get media URL
        const mediaUrlResponse = await axios.get(
            `https://graph.facebook.com/v19.0/${mediaId}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`
                }
            }
        );
        const mediaUrl = mediaUrlResponse.data.url;

        // Download media
        const mediaResponse = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            headers: {
                'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`
            }
        });

        // Save media to temp file
        const fileName = `${mediaId}.jpg`;
        const filePath = path.join(TEMP_DIR, fileName);
        await fs.writeFile(filePath, mediaResponse.data);

        logger.info(`Media downloaded and saved: ${filePath}`);
        return filePath;
    } catch (error) {
        logger.error('Error downloading media:', error);
        return null;
    }
}

export async function encodeImage(imagePath: string): Promise<string> {
    try {
        const imageBuffer = await fs.readFile(imagePath);
        return imageBuffer.toString('base64');
    } catch (error) {
        logger.error('Error encoding image:', error);
        throw error;
    }
}
