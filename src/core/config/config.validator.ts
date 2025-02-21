import { BaseConfig, Environment } from './env.config';

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Configuration Validation Error: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates environment configuration
 */
export class ConfigValidator {
  /**
   * Validate the entire configuration object
   */
  public static validate(config: BaseConfig): void {
    this.validateEnvironment(config.environment);
    this.validateUrls(config);
    this.validateTimeouts(config);
    this.validateDatabase(config);
  }

  /**
   * Validate environment type
   */
  private static validateEnvironment(env: Environment): void {
    const validEnvironments: Environment[] = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(env)) {
      throw new ConfigValidationError(`Invalid environment: ${env}`);
    }
  }

  /**
   * Validate URL configurations
   */
  private static validateUrls(config: BaseConfig): void {
    try {
      new URL(config.baseUrl);
      new URL(config.apiBaseUrl);
    } catch (error) {
      throw new ConfigValidationError('Invalid URL format in configuration');
    }
  }

  /**
   * Validate timeout and retry settings
   */
  private static validateTimeouts(config: BaseConfig): void {
    if (config.timeout <= 0) {
      throw new ConfigValidationError('Timeout must be greater than 0');
    }
    if (config.retries < 0) {
      throw new ConfigValidationError('Retries cannot be negative');
    }
  }

  /**
   * Validate database configuration
   */
  private static validateDatabase(config: BaseConfig): void {
    const { database } = config;
    if (database.port <= 0 || database.port > 65535) {
      throw new ConfigValidationError('Invalid database port number');
    }
    if (!database.host || !database.name || !database.user) {
      throw new ConfigValidationError('Missing required database configuration');
    }
  }
}

/**
 * Utility function to validate configuration
 */
export function validateConfig(config: BaseConfig): void {
  ConfigValidator.validate(config);
}
