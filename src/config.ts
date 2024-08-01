import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface Config {
    PORT: number;
    WHATSAPP_TOKEN: string;
    WHATSAPP_VERIFY_TOKEN: string;
    WHATSAPP_PHONE_NUMBER_ID: string;
    WHATSAPP_INCOMING_PHONE_NUMBER: string;
    AUTHORIZED_WHATSAPP_NUMBER: string;
    OPENAI_API_KEY: string;
    ANTHROPIC_KEY: string;
    REDIS_URL: string;
    NODE_ENV: string;
    LOG_LEVEL: string;
}

export const config: Config = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    WHATSAPP_INCOMING_PHONE_NUMBER: process.env.WHATSAPP_INCOMING_PHONE_NUMBER || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    ANTHROPIC_KEY: process.env.ANTHROPIC_KEY || '',
    REDIS_URL: process.env.REDIS_URL || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    AUTHORIZED_WHATSAPP_NUMBER: process.env.AUTHORIZED_WHATSAPP_NUMBER || '',
};

// Validate required environment variables
const requiredEnvVars: (keyof Config)[] = [
    'WHATSAPP_TOKEN',
    'WHATSAPP_VERIFY_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_INCOMING_PHONE_NUMBER',
    'OPENAI_API_KEY',
    'ANTHROPIC_KEY',
    'REDIS_URL',
];

for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

// Additional configuration checks
if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${config.NODE_ENV}`);
}

if (!['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(config.LOG_LEVEL)) {
    throw new Error(`Invalid LOG_LEVEL: ${config.LOG_LEVEL}`);
}

export default config;