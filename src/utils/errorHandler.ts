import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export class AppError extends Error {
    statusCode: number;
    originalError?: Error; // Optional property to hold the original error

    constructor(message: string, statusCode: number, originalError?: Error) {
        super(message);
        this.statusCode = statusCode;
        this.originalError = originalError; // Store the original error if provided
    }
}

// Add to src/utils/errorHandler.ts
export class LangGraphError extends AppError {
    constructor(message: string, statusCode: number = 500, originalError?: Error) {
        super(message, statusCode, originalError);
        this.name = 'LangGraphError';
    }
}

// Make sure to export the errorHandler function correctly
export const errorHandler = (err: Error, _: Request, res: Response, __: NextFunction) => {
    logger.error('Error:', err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
};
