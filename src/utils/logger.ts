import winston from 'winston';
import path from 'path';
import 'winston-daily-rotate-file';
import fs from 'fs';

const logDirectory = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

const fileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDirectory, '%DATE%-combined.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});

const errorFileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDirectory, '%DATE%-error.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'ray-ban-ai-assistant' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

// Only add file transports in non-test environments
if (process.env.NODE_ENV !== 'test') {
    logger.add(fileTransport);
    logger.add(errorFileTransport);
}

export default logger;