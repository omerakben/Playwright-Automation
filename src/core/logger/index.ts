export * from './logger';
export * from './logger.types';
export * from './logger.formatter';

// Re-export the logger instance for easy access
import { logger } from './logger';
export default logger;
