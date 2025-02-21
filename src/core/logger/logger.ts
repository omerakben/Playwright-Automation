import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { consoleFormat, fileFormat } from './logger.formatter';
import {
  HttpLogMetadata,
  LoggerConfig,
  logLevels,
  LogLevelType,
  TestLogMetadata,
} from './logger.types';

/**
 * Framework logger class
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private config: LoggerConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.logger = this.createLogger();
  }

  /**
   * Get logger instance (Singleton)
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Load logger configuration from environment
   */
  private loadConfig(): LoggerConfig {
    return {
      level: (process.env.LOG_LEVEL || 'info') as LogLevelType,
      toFile: process.env.LOG_TO_FILE === 'true',
      toConsole: true,
      filepath: process.env.LOG_FILE_PATH || 'logs/test-automation-%DATE%.log',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
      maxSize: process.env.LOG_MAX_SIZE || '20m',
    };
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.toConsole) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
        }),
      );
    }

    // File transport with rotation
    if (this.config.toFile && this.config.filepath) {
      const rotateFile = new DailyRotateFile({
        filename: this.config.filepath,
        datePattern: 'YYYY-MM-DD',
        maxFiles: this.config.maxFiles,
        maxSize: this.config.maxSize,
        format: fileFormat,
      });

      transports.push(rotateFile);
    }

    return winston.createLogger({
      level: this.config.level as string,
      levels: logLevels,
      transports,
    });
  }

  /**
   * Log test execution
   */
  public logTest(metadata: TestLogMetadata): void {
    this.logger.log('test', '', { ...metadata });
  }

  /**
   * Log HTTP request/response
   */
  public logHttp(metadata: HttpLogMetadata): void {
    this.logger.log('http', '', { ...metadata });
  }

  /**
   * Log error with proper typing
   */
  public logError(message: string, error: unknown): void {
    const errorObject = error instanceof Error ? error : new Error(String(error));
    this.logger.error(message, {
      error: { message: errorObject.message, stack: errorObject.stack },
    });
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.logger.warn(message, metadata);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: Record<string, unknown>): void {
    this.logger.info(message, metadata);
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(message, metadata);
  }

  /**
   * Log trace message
   */
  public trace(message: string, metadata?: Record<string, unknown>): void {
    this.logger.log('trace', message, metadata);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
