import { AppError, errorHandler } from '../errorHandler';
import { Request, Response } from 'express';
import logger from '../logger';

// Mock the logger
jest.mock('../logger', () => ({
  error: jest.fn(),
}));

describe('AppError', () => {
  it('should create an instance with the correct properties', () => {
    const message = 'Test error message';
    const statusCode = 400;
    const error = new AppError(message, statusCode);

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);
  });
});

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should handle AppError and return correct status and message', () => {
    const appError = new AppError('Test app error', 400);
    errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Error:', appError);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Test app error',
    });
  });

  it('should handle non-AppError and return 500 status with generic message', () => {
    const error = new Error('Test general error');
    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Error:', error);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal server error',
    });
  });
});