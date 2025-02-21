import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import logger from '../logger';
import { CoreUtils } from '../utils';

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

/**
 * Base API client configuration
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  validateStatus?: (status: number) => boolean;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryCondition: (error: any) => boolean;
  };
}

/**
 * Base API client class that all API clients should extend
 */
export abstract class BaseApiClient {
  protected readonly client: AxiosInstance;
  protected readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
      validateStatus: this.config.validateStatus,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  protected setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const startTime = Date.now();
        logger.debug('API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
          data: config.data,
        });
        config.metadata = { startTime };
        return config;
      },
      (error) => {
        logger.logError('API Request Error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        logger.debug('API Response', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          duration,
        });
        return response;
      },
      (error) => {
        logger.logError('API Response Error', error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const retryConfig = this.config.retryConfig;
    if (!retryConfig) {
      return this.client.request<T>(config);
    }

    return CoreUtils.retry(() => this.client.request<T>(config), {
      attempts: retryConfig.maxRetries,
      interval: retryConfig.retryDelay,
      timeout: 30000,
    });
  }

  /**
   * Make GET request
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Make POST request
   */
  protected async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Make PUT request
   */
  protected async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * Make PATCH request
   */
  protected async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * Make DELETE request
   */
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Make HEAD request
   */
  protected async head<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'HEAD', url });
  }

  /**
   * Make OPTIONS request
   */
  protected async options<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'OPTIONS', url });
  }
}
