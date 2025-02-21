import { AuthHandler, AuthType } from '../../src/core/api/auth.handler';
import { BaseApiClient } from '../../src/core/api/base.client';
import { SchemaValidator } from '../../src/core/api/schema.validator';
import logger from '../../src/core/logger';
import { test as baseTest } from './base.fixture';

/**
 * API test info interface
 */
export interface ApiTestInfo {
  authHandler: AuthHandler;
  schemaValidator: typeof SchemaValidator;
  apiUtils: {
    validateResponse: <T>(data: any, schema: any) => T;
    getAuthToken: (type: AuthType, credentials: any) => Promise<string>;
    clearAuth: () => void;
  };
}

/**
 * API test fixture
 */
export const test = baseTest.extend<ApiTestInfo>({
  // Make auth handler available in all tests
  authHandler: async ({ api }, use) => {
    const handler = new AuthHandler({
      type: AuthType.None,
    });
    await use(handler);
  },

  // Make schema validator available in all tests
  schemaValidator: async ({}, use) => {
    await use(SchemaValidator);
  },

  // Make API utilities available in all tests
  apiUtils: async ({ api, authHandler }, use) => {
    await use({
      /**
       * Validate API response against schema
       */
      validateResponse: <T>(data: any, schema: any): T => {
        const result = SchemaValidator.validate<T>(data, schema);
        if (!result.isValid) {
          const errors = SchemaValidator.getErrorMessages(result.error);
          logger.error('Schema validation failed', { errors });
          throw new Error(`Schema validation failed: ${errors.join(', ')}`);
        }
        return result.value;
      },

      /**
       * Get authentication token
       */
      getAuthToken: async (type: AuthType, credentials: any): Promise<string> => {
        try {
          authHandler.updateCredentials({
            type,
            ...credentials,
          });

          // Make auth request based on type
          switch (type) {
            case AuthType.Basic:
              return Buffer.from(`${credentials.username}:${credentials.password}`).toString(
                'base64',
              );
            case AuthType.Bearer:
              if (api) {
                const response = await api.post('/auth/token', credentials);
                return response.data.token;
              }
              throw new Error('API client not available');
            case AuthType.ApiKey:
              return credentials.apiKey;
            default:
              throw new Error(`Unsupported auth type: ${type}`);
          }
        } catch (error) {
          logger.logError('Failed to get auth token', error);
          throw error;
        }
      },

      /**
       * Clear authentication
       */
      clearAuth: () => {
        authHandler.clearCredentials();
      },
    });
  },
});

/**
 * API test utilities
 */
export const apiUtils = {
  /**
   * Create API request with retries
   */
  createRequest: async <T>(
    client: BaseApiClient,
    method: string,
    url: string,
    options?: any,
  ): Promise<T> => {
    try {
      const response = await client.request({
        method,
        url,
        ...options,
      });
      return response.data;
    } catch (error) {
      logger.logError('API request failed', error);
      throw error;
    }
  },

  /**
   * Build query parameters
   */
  buildQueryParams: (params: Record<string, any>): string => {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  },

  /**
   * Handle pagination
   */
  handlePagination: async <T>(client: BaseApiClient, url: string, options?: any): Promise<T[]> => {
    const results: T[] = [];
    let page = 1;
    const limit = options?.limit || 100;

    while (true) {
      const response = await client.request({
        url: `${url}?page=${page}&limit=${limit}`,
        ...options,
      });

      results.push(...response.data);

      if (response.data.length < limit) {
        break;
      }
      page++;
    }

    return results;
  },
};
