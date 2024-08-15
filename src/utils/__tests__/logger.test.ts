import logger from '../../utils/logger';
import winston from 'winston';
import path from 'path';

describe('Logger', () => {
  const logDirectory = path.join(__dirname, '..', '..', 'logs');
  const errorLogPath = path.join(logDirectory, 'error.log');
  const combinedLogPath = path.join(logDirectory, 'combined.log');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a winston logger with the correct settings', () => {
    expect(logger).toBeDefined();
    expect(logger.transports).toHaveLength(3); // Two files and one console transport in non-production
    expect(logger.level).toBe('debug');
  });

  it('should have an error file transport with the correct path', () => {
    const errorTransport = logger.transports.find(
      transport => transport instanceof winston.transports.File && transport.level === 'error'
    );
    expect(errorTransport).toBeDefined();
    expect((errorTransport as winston.transports.FileTransportOptions).filename).toBe(errorLogPath);
  });

  it('should have a combined file transport with the correct path', () => {
    const combinedTransport = logger.transports.find(
      transport => transport instanceof winston.transports.File && transport.level === undefined
    );
    expect(combinedTransport).toBeDefined();
    expect((combinedTransport as winston.transports.FileTransportOptions).filename).toBe(combinedLogPath);
  });

  it('should have a console transport in non-production environments', () => {
    const consoleTransport = logger.transports.find(
      transport => transport instanceof winston.transports.Console
    );
    if (process.env.NODE_ENV !== 'production') {
      expect(consoleTransport).toBeDefined();
    } else {
      expect(consoleTransport).toBeUndefined();
    }
  });

  it('should flush logs on process exit', () => {
    const spy = jest.spyOn(logger, 'end');
    process.emit('exit', 0);
    expect(spy).toHaveBeenCalled();
  });

  it('should flush logs on SIGINT', () => {
    const spy = jest.spyOn(logger, 'end');
    process.emit('SIGINT');
    expect(spy).toHaveBeenCalled();
  });

  it('should flush logs on SIGTERM', () => {
    const spy = jest.spyOn(logger, 'end');
    process.emit('SIGTERM');
    expect(spy).toHaveBeenCalled();
  });
});
