import { writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../logger';
import { AlertRisk, ZAPAlert, ZAPClient, ZAPConfig, ZAPScanOptions } from './zap.client';

/**
 * Security scan configuration
 */
export interface SecurityScanConfig {
  target: string;
  outputDir: string;
  contextFile?: string;
  spiderScan?: boolean;
  activeScan?: boolean;
  maxDuration?: number;
  recurse?: boolean;
  inScopeOnly?: boolean;
  scanPolicyName?: string;
  alertThreshold?: {
    high?: number;
    medium?: number;
    low?: number;
  };
}

/**
 * Security scan result
 */
export interface SecurityScanResult {
  scanId: string;
  target: string;
  duration: number;
  alerts: {
    high: ZAPAlert[];
    medium: ZAPAlert[];
    low: ZAPAlert[];
    info: ZAPAlert[];
  };
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  reportPath?: string;
}

/**
 * Security scanner class
 */
export class SecurityScanner {
  private static instance: SecurityScanner;
  private client: ZAPClient;

  private constructor(config: ZAPConfig) {
    this.client = ZAPClient.getInstance(config);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: ZAPConfig): SecurityScanner {
    if (!SecurityScanner.instance) {
      SecurityScanner.instance = new SecurityScanner(config);
    }
    return SecurityScanner.instance;
  }

  /**
   * Run security scan
   */
  public async runScan(config: SecurityScanConfig): Promise<SecurityScanResult> {
    const startTime = Date.now();
    let contextId: string | undefined;

    try {
      // Start new session
      await this.client.startSession();

      // Import context if provided
      if (config.contextFile) {
        contextId = await this.client.importContext(config.contextFile);
      }

      // Run spider scan if enabled
      if (config.spiderScan) {
        await this.runSpiderScan(config, contextId);
      }

      // Run active scan if enabled
      let scanId: string | undefined;
      if (config.activeScan) {
        scanId = await this.runActiveScan(config, contextId);
      }

      // Wait for scan to complete
      if (scanId) {
        await this.waitForScan(scanId, 'active', config.maxDuration);
      }

      // Get alerts
      const alerts = await this.getAllAlerts(config.target);

      // Generate report
      const reportPath = await this.generateReport(config.outputDir);

      // Create scan result
      const result = this.createScanResult(
        scanId || '',
        config.target,
        Date.now() - startTime,
        alerts,
        reportPath,
      );

      // Validate against thresholds
      this.validateThresholds(result, config.alertThreshold);

      logger.info('Security scan completed successfully', { result: result.summary });
      return result;
    } catch (error) {
      logger.logError('Security scan failed', error);
      throw error;
    }
  }

  /**
   * Run spider scan
   */
  private async runSpiderScan(config: SecurityScanConfig, contextId?: string): Promise<void> {
    const options: ZAPScanOptions = {
      url: config.target,
      maxDuration: config.maxDuration,
      recurse: config.recurse,
      inScopeOnly: config.inScopeOnly,
      contextId,
    };

    const scanId = await this.client.startSpiderScan(options);
    await this.waitForScan(scanId, 'spider', config.maxDuration);
  }

  /**
   * Run active scan
   */
  private async runActiveScan(config: SecurityScanConfig, contextId?: string): Promise<string> {
    const options: ZAPScanOptions = {
      url: config.target,
      recurse: config.recurse,
      inScopeOnly: config.inScopeOnly,
      scanPolicyName: config.scanPolicyName,
      contextId,
    };

    return await this.client.startActiveScan(options);
  }

  /**
   * Wait for scan to complete
   */
  private async waitForScan(
    scanId: string,
    scanType: 'spider' | 'active',
    timeout?: number,
  ): Promise<void> {
    const startTime = Date.now();
    const maxDuration = timeout || 3600000; // Default 1 hour

    while (true) {
      const progress = await this.client.getScanProgress(scanId, scanType);
      logger.debug(`Scan progress: ${progress}%`, { scanId, scanType });

      if (progress >= 100) {
        break;
      }

      if (timeout && Date.now() - startTime > maxDuration) {
        throw new Error(`Scan timeout after ${maxDuration}ms`);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  /**
   * Get all alerts
   */
  private async getAllAlerts(target: string): Promise<ZAPAlert[]> {
    const alerts: ZAPAlert[] = [];
    let start = 0;
    const count = 1000;

    while (true) {
      const batch = await this.client.getAlerts(target, undefined, start, count);
      alerts.push(...batch);

      if (batch.length < count) {
        break;
      }
      start += count;
    }

    return alerts;
  }

  /**
   * Generate security report
   */
  private async generateReport(outputDir: string): Promise<string> {
    const report = await this.client.generateHtmlReport();
    const reportPath = join(outputDir, `security-report-${Date.now()}.html`);
    writeFileSync(reportPath, report);
    return reportPath;
  }

  /**
   * Create scan result
   */
  private createScanResult(
    scanId: string,
    target: string,
    duration: number,
    alerts: ZAPAlert[],
    reportPath: string,
  ): SecurityScanResult {
    const result: SecurityScanResult = {
      scanId,
      target,
      duration,
      alerts: {
        high: [],
        medium: [],
        low: [],
        info: [],
      },
      summary: {
        total: alerts.length,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      reportPath,
    };

    // Categorize alerts by risk
    alerts.forEach((alert) => {
      switch (alert.risk) {
        case AlertRisk.High:
          result.alerts.high.push(alert);
          result.summary.high++;
          break;
        case AlertRisk.Medium:
          result.alerts.medium.push(alert);
          result.summary.medium++;
          break;
        case AlertRisk.Low:
          result.alerts.low.push(alert);
          result.summary.low++;
          break;
        case AlertRisk.Info:
          result.alerts.info.push(alert);
          result.summary.info++;
          break;
      }
    });

    return result;
  }

  /**
   * Validate against alert thresholds
   */
  private validateThresholds(
    result: SecurityScanResult,
    thresholds?: SecurityScanConfig['alertThreshold'],
  ): void {
    if (!thresholds) {
      return;
    }

    const { high = 0, medium = 0, low = 0 } = thresholds;

    if (result.summary.high > high) {
      throw new Error(`High risk alerts (${result.summary.high}) exceed threshold (${high})`);
    }

    if (result.summary.medium > medium) {
      throw new Error(`Medium risk alerts (${result.summary.medium}) exceed threshold (${medium})`);
    }

    if (result.summary.low > low) {
      throw new Error(`Low risk alerts (${result.summary.low}) exceed threshold (${low})`);
    }
  }

  /**
   * Clear previous scan results
   */
  public async clearResults(): Promise<void> {
    await this.client.clearAlerts();
  }

  /**
   * Shutdown ZAP
   */
  public async shutdown(): Promise<void> {
    await this.client.shutdown();
  }
}
