import winston from 'winston';
import path from 'path';

const logDirectory = path.join(__dirname, '..', 'logs');

const logger = winston.createLogger({
    level: 'debug',  // Use 'debug' level for more detailed logs
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
    ),
    defaultMeta: { service: 'ray-ban-ai-assistant' },
    transports: [
        new winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') }),
    ],
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    );
}

// Function to ensure logs are flushed
function flushLogs() {
    logger.end(); // Flush all logs
}

// Call flushLogs on process exit
process.on('exit', flushLogs);
process.on('SIGINT', flushLogs);
process.on('SIGTERM', flushLogs);

export default logger;
