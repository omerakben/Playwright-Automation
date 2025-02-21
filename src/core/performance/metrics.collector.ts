import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../logger';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  http_reqs: number;
  http_req_duration: {
    avg: number;
    min: number;
    med: number;
    max: number;
    p90: number;
    p95: number;
    p99: number;
  };
  http_req_failed: number;
  iterations: number;
  vus: number;
  vus_max: number;
  data_received: number;
  data_sent: number;
  checks: {
    passes: number;
    fails: number;
  };
}

/**
 * Performance test summary
 */
export interface PerformanceTestSummary {
  testType: string;
  timestamp: string;
  duration: string;
  metrics: PerformanceMetrics;
  thresholds: {
    [key: string]: boolean;
  };
  checks: {
    [key: string]: {
      passes: number;
      fails: number;
    };
  };
}

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private static instance: MetricsCollector;

  private constructor() {}

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
   * Collect metrics from test results
   */
  public collectMetrics(outputDir: string): PerformanceTestSummary {
    try {
      const summaryPath = join(outputDir, 'summary.json');
      const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));

      logger.info('Performance metrics collected successfully', { outputDir });
      return this.processMetrics(summary);
    } catch (error) {
      logger.logError('Failed to collect performance metrics', error);
      throw error;
    }
  }

  /**
   * Process metrics from summary
   */
  private processMetrics(summary: any): PerformanceTestSummary {
    const {
      type,
      timestamp,
      state: { duration, metrics, thresholds },
    } = summary;

    return {
      testType: type,
      timestamp,
      duration: `${duration / 1000}s`,
      metrics: this.extractMetrics(metrics),
      thresholds: this.extractThresholds(thresholds),
      checks: this.extractChecks(metrics.checks),
    };
  }

  /**
   * Extract metrics from summary
   */
  private extractMetrics(metrics: any): PerformanceMetrics {
    return {
      http_reqs: metrics.http_reqs.values.count,
      http_req_duration: {
        avg: metrics.http_req_duration.values.avg,
        min: metrics.http_req_duration.values.min,
        med: metrics.http_req_duration.values.med,
        max: metrics.http_req_duration.values.max,
        p90: metrics.http_req_duration.values['p(90)'],
        p95: metrics.http_req_duration.values['p(95)'],
        p99: metrics.http_req_duration.values['p(99)'],
      },
      http_req_failed: metrics.http_req_failed.values.rate,
      iterations: metrics.iterations.values.count,
      vus: metrics.vus.values.max,
      vus_max: metrics.vus_max.values.max,
      data_received: metrics.data_received.values.count,
      data_sent: metrics.data_sent.values.count,
      checks: {
        passes: metrics.checks.values.passes,
        fails: metrics.checks.values.fails,
      },
    };
  }

  /**
   * Extract thresholds from summary
   */
  private extractThresholds(thresholds: any): { [key: string]: boolean } {
    const result: { [key: string]: boolean } = {};
    for (const [key, value] of Object.entries(thresholds)) {
      result[key] = (value as any).ok;
    }
    return result;
  }

  /**
   * Extract checks from summary
   */
  private extractChecks(checks: any): {
    [key: string]: { passes: number; fails: number };
  } {
    const result: { [key: string]: { passes: number; fails: number } } = {};
    for (const [key, value] of Object.entries(checks.values)) {
      result[key] = {
        passes: (value as any).passes,
        fails: (value as any).fails,
      };
    }
    return result;
  }

  /**
   * Generate performance report
   */
  public generateReport(summary: PerformanceTestSummary): string {
    const { testType, timestamp, duration, metrics, thresholds, checks } = summary;

    return `
Performance Test Report
======================

Test Type: ${testType}
Timestamp: ${timestamp}
Duration: ${duration}

Metrics
-------
- Total Requests: ${metrics.http_reqs}
- Failed Requests: ${(metrics.http_req_failed * 100).toFixed(2)}%
- Virtual Users: ${metrics.vus} (max: ${metrics.vus_max})
- Iterations: ${metrics.iterations}

Response Times
-------------
- Average: ${metrics.http_req_duration.avg.toFixed(2)}ms
- Median: ${metrics.http_req_duration.med.toFixed(2)}ms
- P90: ${metrics.http_req_duration.p90.toFixed(2)}ms
- P95: ${metrics.http_req_duration.p95.toFixed(2)}ms
- P99: ${metrics.http_req_duration.p99.toFixed(2)}ms
- Min: ${metrics.http_req_duration.min.toFixed(2)}ms
- Max: ${metrics.http_req_duration.max.toFixed(2)}ms

Data Transfer
------------
- Received: ${(metrics.data_received / 1024 / 1024).toFixed(2)}MB
- Sent: ${(metrics.data_sent / 1024 / 1024).toFixed(2)}MB

Checks
------
${Object.entries(checks)
  .map(([name, { passes, fails }]) => `- ${name}: ${passes} passed, ${fails} failed`)
  .join('\n')}

Thresholds
----------
${Object.entries(thresholds)
  .map(([name, passed]) => `- ${name}: ${passed ? '✓' : '✗'}`)
  .join('\n')}
    `.trim();
  }
}
