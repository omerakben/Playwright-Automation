import { AxiosRequestConfig } from 'axios';
import logger from '../logger';

/**
 * Authentication types
 */
export enum AuthType {
  None = 'none',
  Basic = 'basic',
  Bearer = 'bearer',
  ApiKey = 'apiKey',
  OAuth = 'oauth',
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  keyName?: string;
  keyLocation?: 'header' | 'query';
}

/**
 * Authentication handler class
 */
export class AuthHandler {
  private credentials: AuthCredentials;

  constructor(credentials: AuthCredentials) {
    this.credentials = credentials;
  }

  /**
   * Apply authentication to request config
   */
  public applyAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    try {
      switch (this.credentials.type) {
        case AuthType.Basic:
          return this.applyBasicAuth(config);
        case AuthType.Bearer:
          return this.applyBearerAuth(config);
        case AuthType.ApiKey:
          return this.applyApiKeyAuth(config);
        case AuthType.OAuth:
          return this.applyOAuthAuth(config);
        default:
          return config;
      }
    } catch (error) {
      logger.logError('Failed to apply authentication', error);
      return config;
    }
  }

  /**
   * Apply Basic authentication
   */
  private applyBasicAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    if (!this.credentials.username || !this.credentials.password) {
      throw new Error('Username and password are required for Basic authentication');
    }

    const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString(
      'base64',
    );

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Basic ${auth}`,
      },
    };
  }

  /**
   * Apply Bearer token authentication
   */
  private applyBearerAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    if (!this.credentials.token) {
      throw new Error('Token is required for Bearer authentication');
    }

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${this.credentials.token}`,
      },
    };
  }

  /**
   * Apply API Key authentication
   */
  private applyApiKeyAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    if (!this.credentials.apiKey || !this.credentials.keyName) {
      throw new Error('API key and key name are required for API Key authentication');
    }

    const keyLocation = this.credentials.keyLocation || 'header';

    if (keyLocation === 'header') {
      return {
        ...config,
        headers: {
          ...config.headers,
          [this.credentials.keyName]: this.credentials.apiKey,
        },
      };
    } else {
      return {
        ...config,
        params: {
          ...config.params,
          [this.credentials.keyName]: this.credentials.apiKey,
        },
      };
    }
  }

  /**
   * Apply OAuth authentication
   */
  private applyOAuthAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    if (!this.credentials.token) {
      throw new Error('Access token is required for OAuth authentication');
    }

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${this.credentials.token}`,
      },
    };
  }

  /**
   * Update credentials
   */
  public updateCredentials(credentials: Partial<AuthCredentials>): void {
    this.credentials = {
      ...this.credentials,
      ...credentials,
    };
  }

  /**
   * Get current credentials
   */
  public getCredentials(): AuthCredentials {
    return { ...this.credentials };
  }

  /**
   * Clear credentials
   */
  public clearCredentials(): void {
    this.credentials = {
      type: AuthType.None,
    };
  }
}
