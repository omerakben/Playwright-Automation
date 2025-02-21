/**
 * Custom log levels with corresponding priorities
 */
export const logLevels: { [key: string]: number } = {
  error: 0, // Error conditions
  warn: 1, // Warning conditions
  info: 2, // Informational messages
  http: 3, // HTTP request/response logs
  debug: 4, // Debug messages
  trace: 5, // Detailed debugging (method entry/exit)
  test: 6, // Test execution logs
};

/**
 * Log level type definition
 */
export type LogLevelType = keyof typeof logLevels;

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevelType;
  toFile: boolean;
  toConsole: boolean;
  filepath?: string;
  maxFiles?: number;
  maxSize?: string;
}

/**
 * Test execution log metadata
 */
export interface TestLogMetadata {
  testName: string;
  testFile: string;
  browser?: string;
  device?: string;
  status?: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration?: number;
  error?: Error;
}

/**
 * HTTP request/response log metadata
 */
export interface HttpLogMetadata {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  duration?: number;
  error?: Error;
}
