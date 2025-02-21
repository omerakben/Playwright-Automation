import logger from '../../src/core/logger';
import { K6ScriptGenerator } from '../../src/core/performance/k6.generator';
import { MetricsCollector } from '../../src/core/performance/metrics.collector';
import { PerformanceTestRunner } from '../../src/core/performance/test.runner';
import { test as baseTest } from './base.fixture';

/**
 * Performance test info interface
 */
export interface PerformanceTestInfo {
  k6: K6ScriptGenerator;
  runner: PerformanceTestRunner;
  metrics: MetricsCollector;
  performanceUtils: {
    generateLoadTest: (baseUrl: string, options?: any) => Promise<string>;
    generateStressTest: (baseUrl: string, options?: any) => Promise<string>;
    generateSpikeTest: (baseUrl: string, options?: any) => Promise<string>;
    runTest: (scriptPath: string, options?: any) => Promise<void>;
    collectMetrics: (outputDir: string) => Promise<any>;
  };
}

/**
 * Performance test fixture
 */
export const test = baseTest.extend<PerformanceTestInfo>({
  // Make k6 script generator available in all tests
  k6: async ({}, use) => {
    await use(K6ScriptGenerator.getInstance());
  },

  // Make performance test runner available in all tests
  runner: async ({}, use) => {
    await use(PerformanceTestRunner.getInstance());
  },

  // Make metrics collector available in all tests
  metrics: async ({}, use) => {
    await use(MetricsCollector.getInstance());
  },

  // Make performance utilities available in all tests
  performanceUtils: async ({ k6, runner, metrics }, use) => {
    await use({
      /**
       * Generate load test script
       */
      generateLoadTest: async (baseUrl: string, options?: any): Promise<string> => {
        try {
          const script = k6.generateLoadTestScenarios(baseUrl);
          return k6.generateScript(
            script,
            {
              vus: options?.vus || 10,
              duration: options?.duration || '5m',
              thresholds: {
                http_req_duration: ['p(95)<500'],
                http_req_failed: ['rate<0.01'],
              },
              ...options,
            },
            'tests/performance/load-test.js',
          );
        } catch (error) {
          logger.logError('Failed to generate load test script', error);
          throw error;
        }
      },

      /**
       * Generate stress test script
       */
      generateStressTest: async (baseUrl: string, options?: any): Promise<string> => {
        try {
          const script = k6.generateStressTestScenarios(baseUrl);
          return k6.generateScript(
            script,
            {
              stages: [
                { duration: '2m', target: 10 },
                { duration: '5m', target: 30 },
                { duration: '2m', target: 50 },
                { duration: '1m', target: 0 },
              ],
              thresholds: {
                http_req_duration: ['p(95)<2000'],
                http_req_failed: ['rate<0.05'],
              },
              ...options,
            },
            'tests/performance/stress-test.js',
          );
        } catch (error) {
          logger.logError('Failed to generate stress test script', error);
          throw error;
        }
      },

      /**
       * Generate spike test script
       */
      generateSpikeTest: async (baseUrl: string, options?: any): Promise<string> => {
        try {
          const script = k6.generateSpikeTestScenarios(baseUrl);
          return k6.generateScript(
            script,
            {
              stages: [
                { duration: '1m', target: 10 },
                { duration: '1m', target: 100 },
                { duration: '1m', target: 10 },
              ],
              thresholds: {
                http_req_duration: ['p(95)<5000'],
                http_req_failed: ['rate<0.1'],
              },
              ...options,
            },
            'tests/performance/spike-test.js',
          );
        } catch (error) {
          logger.logError('Failed to generate spike test script', error);
          throw error;
        }
      },

      /**
       * Run performance test
       */
      runTest: async (scriptPath: string, options?: any): Promise<void> => {
        try {
          const config = {
            baseUrl: options?.baseUrl || 'http://localhost:3000',
            outputDir: options?.outputDir || 'test-results/performance',
            thresholds: options?.thresholds,
            env: options?.env,
          };

          await runner.runTest('load', config, options);
        } catch (error) {
          logger.logError('Failed to run performance test', error);
          throw error;
        }
      },

      /**
       * Collect performance metrics
       */
      collectMetrics: async (outputDir: string): Promise<any> => {
        try {
          return metrics.collectMetrics(outputDir);
        } catch (error) {
          logger.logError('Failed to collect performance metrics', error);
          throw error;
        }
      },
    });
  },
});

/**
 * Performance test utilities
 */
export const performanceUtils = {
  /**
   * Calculate percentile
   */
  calculatePercentile: (values: number[], percentile: number): number => {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  },

  /**
   * Calculate statistics
   */
  calculateStats: (
    values: number[],
  ): {
    min: number;
    max: number;
    avg: number;
    p90: number;
    p95: number;
    p99: number;
  } => {
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      p90: performanceUtils.calculatePercentile(values, 90),
      p95: performanceUtils.calculatePercentile(values, 95),
      p99: performanceUtils.calculatePercentile(values, 99),
    };
  },

  /**
   * Format bytes
   */
  formatBytes: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  },
};
