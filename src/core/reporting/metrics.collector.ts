import { TestResult } from '@playwright/test/reporter';
import logger from '../logger';

/**
 * Test metrics
 */
export interface TestMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  browsers: string[];
  retries: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  loadTime: {
    avg: number;
    min: number;
    max: number;
    p90: number;
  };
  firstPaint: {
    avg: number;
    min: number;
    max: number;
    p90: number;
  };
  domContentLoaded: {
    avg: number;
    min: number;
    max: number;
    p90: number;
  };
}

/**
 * Network metrics
 */
export interface NetworkMetrics {
  requests: number;
  responses: number;
  failedRequests: number;
  totalBytes: number;
  avgResponseTime: number;
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  totalErrors: number;
  uniqueErrors: number;
  topErrors: {
    message: string;
    count: number;
    locations: string[];
  }[];
}

/**
 * Test run metrics
 */
export interface TestRunMetrics {
  test: TestMetrics;
  performance: PerformanceMetrics;
  network: NetworkMetrics;
  error: ErrorMetrics;
}

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: TestRunMetrics;
  private performanceData: number[];
  private networkData: Map<string, number>;
  private errorMap: Map<string, { count: number; locations: Set<string> }>;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.performanceData = [];
    this.networkData = new Map();
    this.errorMap = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): TestRunMetrics {
    return {
      test: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        duration: 0,
        startTime: new Date(),
        endTime: new Date(),
        browsers: [],
        retries: 0,
      },
      performance: {
        loadTime: { avg: 0, min: 0, max: 0, p90: 0 },
        firstPaint: { avg: 0, min: 0, max: 0, p90: 0 },
        domContentLoaded: { avg: 0, min: 0, max: 0, p90: 0 },
      },
      network: {
        requests: 0,
        responses: 0,
        failedRequests: 0,
        totalBytes: 0,
        avgResponseTime: 0,
      },
      error: {
        totalErrors: 0,
        uniqueErrors: 0,
        topErrors: [],
      },
    };
  }

  /**
   * Record test result
   */
  public recordTestResult(result: TestResult): void {
    try {
      // Update test metrics
      this.metrics.test.total++;
      switch (result.status) {
        case 'passed':
          this.metrics.test.passed++;
          break;
        case 'failed':
          this.metrics.test.failed++;
          break;
        case 'skipped':
          this.metrics.test.skipped++;
          break;
      }

      // Update duration
      this.metrics.test.duration += result.duration;

      // Record error if test failed
      if (result.status === 'failed' && result.error) {
        const errorMessage = result.error.message || 'Unknown error';
        this.recordError(errorMessage, 'unknown');
      }

      logger.debug('Recorded test result', {
        status: result.status,
        duration: result.duration,
      });
    } catch (error) {
      logger.logError('Failed to record test result', error);
    }
  }

  /**
   * Record performance metrics
   */
  public recordPerformanceMetrics(metrics: {
    loadTime: number;
    firstPaint: number;
    domContentLoaded: number;
  }): void {
    try {
      this.performanceData.push(metrics.loadTime);

      // Update performance metrics
      this.updatePerformanceMetrics();

      logger.debug('Recorded performance metrics', { metrics });
    } catch (error) {
      logger.logError('Failed to record performance metrics', error);
    }
  }

  /**
   * Record network metrics
   */
  public recordNetworkMetrics(metrics: {
    url: string;
    responseTime: number;
    bytes: number;
    failed?: boolean;
  }): void {
    try {
      // Update network metrics
      this.metrics.network.requests++;
      this.metrics.network.responses++;
      this.metrics.network.totalBytes += metrics.bytes;

      if (metrics.failed) {
        this.metrics.network.failedRequests++;
      }

      // Record response time
      this.networkData.set(metrics.url, metrics.responseTime);

      // Update average response time
      this.updateNetworkMetrics();

      logger.debug('Recorded network metrics', { metrics });
    } catch (error) {
      logger.logError('Failed to record network metrics', error);
    }
  }

  /**
   * Record error
   */
  private recordError(message: string, location: string): void {
    const error = this.errorMap.get(message) || { count: 0, locations: new Set() };
    error.count++;
    error.locations.add(location);
    this.errorMap.set(message, error);

    // Update error metrics
    this.updateErrorMetrics();
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const data = this.performanceData.sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const p90Index = Math.floor(data.length * 0.9);

    this.metrics.performance.loadTime = {
      avg: sum / data.length,
      min: data[0],
      max: data[data.length - 1],
      p90: data[p90Index],
    };
  }

  /**
   * Update network metrics
   */
  private updateNetworkMetrics(): void {
    const responseTimes = Array.from(this.networkData.values());
    const sum = responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.network.avgResponseTime = sum / responseTimes.length;
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(): void {
    this.metrics.error.totalErrors = Array.from(this.errorMap.values()).reduce(
      (sum, error) => sum + error.count,
      0,
    );
    this.metrics.error.uniqueErrors = this.errorMap.size;

    // Get top errors
    this.metrics.error.topErrors = Array.from(this.errorMap.entries())
      .map(([message, { count, locations }]) => ({
        message,
        count,
        locations: Array.from(locations),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): TestRunMetrics {
    return this.metrics;
  }

  /**
   * Reset metrics
   */
  public reset(): void {
    this.metrics = this.initializeMetrics();
    this.performanceData = [];
    this.networkData.clear();
    this.errorMap.clear();
  }
}
