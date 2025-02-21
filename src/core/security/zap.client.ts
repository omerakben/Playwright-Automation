import axios, { AxiosInstance } from 'axios';
import logger from '../logger';

/**
 * ZAP client configuration
 */
export interface ZAPConfig {
  apiKey: string;
  proxyUrl: string;
  apiUrl: string;
  debug?: boolean;
}

/**
 * ZAP scan options
 */
export interface ZAPScanOptions {
  url: string;
  maxDuration?: number;
  recurse?: boolean;
  inScopeOnly?: boolean;
  scanPolicyName?: string;
  method?: string;
  postData?: string;
  contextId?: string;
}

/**
 * ZAP alert severity levels
 */
export enum AlertSeverity {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  Informational = 'Informational',
}

/**
 * ZAP alert risk levels
 */
export enum AlertRisk {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  Info = 'Info',
}

/**
 * ZAP alert interface
 */
export interface ZAPAlert {
  pluginId: string;
  alert: string;
  risk: AlertRisk;
  confidence: string;
  url: string;
  method: string;
  evidence?: string;
  param?: string;
  attack?: string;
  description: string;
  solution: string;
  reference?: string;
  cweid?: string;
  wascid?: string;
  sourceid?: string;
}

/**
 * ZAP client class for interacting with OWASP ZAP
 */
export class ZAPClient {
  private static instance: ZAPClient;
  private client: AxiosInstance;
  private config: ZAPConfig;

  private constructor(config: ZAPConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      params: {
        apikey: config.apiKey,
      },
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: ZAPConfig): ZAPClient {
    if (!ZAPClient.instance) {
      ZAPClient.instance = new ZAPClient(config);
    }
    return ZAPClient.instance;
  }

  /**
   * Start ZAP session
   */
  public async startSession(name?: string): Promise<void> {
    try {
      await this.client.get('/JSON/core/action/newSession/', {
        params: { name: name || `session-${Date.now()}` },
      });
      logger.info('ZAP session started');
    } catch (error) {
      logger.logError('Failed to start ZAP session', error);
      throw error;
    }
  }

  /**
   * Import context from file
   */
  public async importContext(filePath: string): Promise<string> {
    try {
      const response = await this.client.get('/JSON/context/action/importContext/', {
        params: { contextFile: filePath },
      });
      const contextId = response.data.contextId;
      logger.info('Context imported successfully', { contextId });
      return contextId;
    } catch (error) {
      logger.logError('Failed to import context', error);
      throw error;
    }
  }

  /**
   * Start spider scan
   */
  public async startSpiderScan(options: ZAPScanOptions): Promise<string> {
    try {
      const response = await this.client.get('/JSON/spider/action/scan/', {
        params: {
          url: options.url,
          maxDuration: options.maxDuration,
          recurse: options.recurse,
          contextId: options.contextId,
          subtreeOnly: options.inScopeOnly,
        },
      });
      const scanId = response.data.scan;
      logger.info('Spider scan started', { scanId });
      return scanId;
    } catch (error) {
      logger.logError('Failed to start spider scan', error);
      throw error;
    }
  }

  /**
   * Start active scan
   */
  public async startActiveScan(options: ZAPScanOptions): Promise<string> {
    try {
      const response = await this.client.get('/JSON/ascan/action/scan/', {
        params: {
          url: options.url,
          recurse: options.recurse,
          inScopeOnly: options.inScopeOnly,
          scanPolicyName: options.scanPolicyName,
          method: options.method,
          postData: options.postData,
          contextId: options.contextId,
        },
      });
      const scanId = response.data.scan;
      logger.info('Active scan started', { scanId });
      return scanId;
    } catch (error) {
      logger.logError('Failed to start active scan', error);
      throw error;
    }
  }

  /**
   * Get scan status
   */
  public async getScanStatus(scanId: string, scanType: 'spider' | 'active'): Promise<number> {
    try {
      const endpoint = scanType === 'spider' ? 'spider' : 'ascan';
      const response = await this.client.get(`/JSON/${endpoint}/view/status/`, {
        params: { scanId },
      });
      return parseInt(response.data.status);
    } catch (error) {
      logger.logError('Failed to get scan status', error);
      throw error;
    }
  }

  /**
   * Get scan progress
   */
  public async getScanProgress(scanId: string, scanType: 'spider' | 'active'): Promise<number> {
    try {
      const status = await this.getScanStatus(scanId, scanType);
      return status;
    } catch (error) {
      logger.logError('Failed to get scan progress', error);
      throw error;
    }
  }

  /**
   * Get alerts
   */
  public async getAlerts(
    url?: string,
    risk?: AlertRisk,
    start?: number,
    count?: number,
  ): Promise<ZAPAlert[]> {
    try {
      const response = await this.client.get('/JSON/core/view/alerts/', {
        params: {
          baseurl: url,
          riskId: risk,
          start,
          count,
        },
      });
      return response.data.alerts;
    } catch (error) {
      logger.logError('Failed to get alerts', error);
      throw error;
    }
  }

  /**
   * Generate HTML report
   */
  public async generateHtmlReport(): Promise<string> {
    try {
      const response = await this.client.get('/OTHER/core/other/htmlreport/');
      return response.data;
    } catch (error) {
      logger.logError('Failed to generate HTML report', error);
      throw error;
    }
  }

  /**
   * Clear alerts
   */
  public async clearAlerts(): Promise<void> {
    try {
      await this.client.get('/JSON/core/action/deleteAllAlerts/');
      logger.info('Alerts cleared successfully');
    } catch (error) {
      logger.logError('Failed to clear alerts', error);
      throw error;
    }
  }

  /**
   * Shutdown ZAP
   */
  public async shutdown(): Promise<void> {
    try {
      await this.client.get('/JSON/core/action/shutdown/');
      logger.info('ZAP shutdown initiated');
    } catch (error) {
      logger.logError('Failed to shutdown ZAP', error);
      throw error;
    }
  }
}
