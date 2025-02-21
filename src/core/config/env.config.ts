import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment types supported by the framework
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Base configuration interface that all environment configs must implement
 */
export interface BaseConfig {
  environment: Environment;
  baseUrl: string;
  apiBaseUrl: string;
  timeout: number;
  retries: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  auth: {
    username?: string;
    password?: string;
    apiKey?: string;
  };
}

/**
 * Configuration manager class for handling environment-specific settings
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private currentConfig: BaseConfig;

  private constructor() {
    this.currentConfig = this.loadConfig();
  }

  /**
   * Get the singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): BaseConfig {
    return this.currentConfig;
  }

  /**
   * Load configuration based on current environment
   */
  private loadConfig(): BaseConfig {
    const env = (process.env.NODE_ENV || 'development') as Environment;

    // Default configuration
    const defaultConfig: BaseConfig = {
      environment: env,
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
      timeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.DEFAULT_RETRIES || '2', 10),
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'test_db',
        user: process.env.DB_USER || 'test_user',
        password: process.env.DB_PASSWORD || 'test_password',
      },
      auth: {
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD,
        apiKey: process.env.API_KEY,
      },
    };

    return defaultConfig;
  }
}

// Export a singleton instance
export const config = ConfigManager.getInstance();
