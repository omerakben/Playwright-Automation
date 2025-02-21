import { format } from 'winston';
import { HttpLogMetadata, TestLogMetadata } from './logger.types';

const { combine, timestamp, printf, colorize } = format;

/**
 * Custom formatter for test execution logs
 */
const formatTestLog = (metadata: TestLogMetadata): string => {
  const { testName, testFile, browser, device, status, duration, error } = metadata;
  let message = `Test: ${testName} (${testFile})`;

  if (browser) message += ` | Browser: ${browser}`;
  if (device) message += ` | Device: ${device}`;
  if (status) message += ` | Status: ${status}`;
  if (duration) message += ` | Duration: ${duration}ms`;
  if (error) message += `\nError: ${error.message}\n${error.stack}`;

  return message;
};

/**
 * Custom formatter for HTTP request/response logs
 */
const formatHttpLog = (metadata: HttpLogMetadata): string => {
  const {
    method,
    url,
    requestHeaders,
    requestBody,
    responseStatus,
    responseHeaders,
    responseBody,
    duration,
    error,
  } = metadata;
  let message = `${method} ${url}`;

  if (requestHeaders) message += `\nRequest Headers: ${JSON.stringify(requestHeaders, null, 2)}`;
  if (requestBody) message += `\nRequest Body: ${JSON.stringify(requestBody, null, 2)}`;
  if (responseStatus) message += `\nResponse Status: ${responseStatus}`;
  if (responseHeaders) message += `\nResponse Headers: ${JSON.stringify(responseHeaders, null, 2)}`;
  if (responseBody) message += `\nResponse Body: ${JSON.stringify(responseBody, null, 2)}`;
  if (duration) message += `\nDuration: ${duration}ms`;
  if (error) message += `\nError: ${error.message}\n${error.stack}`;

  return message;
};

/**
 * Console format with colors and timestamps
 */
export const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp: ts, level, message, ...metadata }) => {
    let formattedMessage = message;

    // Format test logs
    if ('testName' in metadata && 'testFile' in metadata) {
      formattedMessage = formatTestLog(metadata as unknown as TestLogMetadata);
    }
    // Format HTTP logs
    else if ('method' in metadata) {
      formattedMessage = formatHttpLog(metadata as unknown as HttpLogMetadata);
    }

    return `${String(ts)} [${level}]: ${formattedMessage}`;
  }),
);

/**
 * File format without colors
 */
export const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp, level, message, ...metadata }) => {
    let formattedMessage = message;

    // Format test logs
    if ('testName' in metadata && 'testFile' in metadata) {
      formattedMessage = formatTestLog(metadata as unknown as TestLogMetadata);
    }
    // Format HTTP logs
    else if ('method' in metadata) {
      formattedMessage = formatHttpLog(metadata as unknown as HttpLogMetadata);
    }

    return `${timestamp} [${level}]: ${formattedMessage}`;
  }),
);
