import dotenv from 'dotenv';
import path from 'path';
import { LLMType } from './models/conversation';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

interface Config {
    PORT: number;
    AUTHORIZED_PHONE_NUMBER: string;
    OPENAI_API_KEY: string;
    ANTHROPIC_KEY: string;
    REDIS_URL: string;
    NODE_ENV: string;
    LOG_LEVEL: string;
    DEFAULT_MODEL: LLMType;
    EMBEDDING_MODEL: string;
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const config: Config = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    AUTHORIZED_PHONE_NUMBER: process.env.AUTHORIZED_PHONE_NUMBER || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    ANTHROPIC_KEY: process.env.ANTHROPIC_KEY || '',
    REDIS_URL: process.env.REDIS_URL || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    DEFAULT_MODEL: (process.env.DEFAULT_MODEL as LLMType) || 'gpt-4o',
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'gpt-4o',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
};

const requiredEnvVars: (keyof Config)[] = [
    'OPENAI_API_KEY',
    'ANTHROPIC_KEY',
    'REDIS_URL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'AUTHORIZED_PHONE_NUMBER'
];

// Check for required environment variables
for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

// Only require AUTHORIZED_PHONE_NUMBER in production
if (!isDevelopment && !isTest && !config.AUTHORIZED_PHONE_NUMBER) {
    throw new Error('Missing required environment variable: AUTHORIZED_PHONE_NUMBER');
}

if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${config.NODE_ENV}`);
}

if (!['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(config.LOG_LEVEL)) {
    throw new Error(`Invalid LOG_LEVEL: ${config.LOG_LEVEL}`);
}

export default config;