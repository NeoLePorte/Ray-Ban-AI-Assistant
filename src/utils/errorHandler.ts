import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    logger.error('Unhandled error:', err);

    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
    });
};

export default errorHandler;
