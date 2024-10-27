import dotenv from 'dotenv';

dotenv.config();

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ANTHROPIC_KEY: process.env.ANTHROPIC_KEY || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  AUTHORIZED_PHONE_NUMBER: process.env.AUTHORIZED_PHONE_NUMBER || '',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || ''
};

const requiredEnvVars: (keyof typeof config)[] = [
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
if (config.NODE_ENV === 'production' && !config.AUTHORIZED_PHONE_NUMBER) {
  throw new Error('Missing required environment variable: AUTHORIZED_PHONE_NUMBER');
}

// Validate NODE_ENV
if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
  throw new Error(`Invalid NODE_ENV: ${config.NODE_ENV}`);
}

// Validate LOG_LEVEL if implemented
// Add similar checks if LOG_LEVEL is part of your config

export { config };
