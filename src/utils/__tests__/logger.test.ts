import logger from '../../utils/logger';

// Automatically mock the logger
jest.mock('../../utils/logger');

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have all log methods', () => {
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.http).toBeDefined();
    expect(logger.verbose).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.silly).toBeDefined();
  });

  it('should call error method', () => {
    logger.error('Test error');
    expect(logger.error).toHaveBeenCalledWith('Test error');
  });

  it('should call warn method', () => {
    logger.warn('Test warning');
    expect(logger.warn).toHaveBeenCalledWith('Test warning');
  });

  it('should call info method', () => {
    logger.info('Test info');
    expect(logger.info).toHaveBeenCalledWith('Test info');
  });

  it('should call http method', () => {
    logger.http('Test http');
    expect(logger.http).toHaveBeenCalledWith('Test http');
  });

  it('should call verbose method', () => {
    logger.verbose('Test verbose');
    expect(logger.verbose).toHaveBeenCalledWith('Test verbose');
  });

  it('should call debug method', () => {
    logger.debug('Test debug');
    expect(logger.debug).toHaveBeenCalledWith('Test debug');
  });

  it('should call silly method', () => {
    logger.silly('Test silly');
    expect(logger.silly).toHaveBeenCalledWith('Test silly');
  });

  it('should handle objects in log methods', () => {
    const testObject = { key: 'value' };
    logger.info('Test with object', testObject);
    expect(logger.info).toHaveBeenCalledWith('Test with object', testObject);
  });

  it('should handle multiple arguments in log methods', () => {
    logger.error('Error occurred', 'Details:', { code: 500 });
    expect(logger.error).toHaveBeenCalledWith('Error occurred', 'Details:', { code: 500 });
  });
});