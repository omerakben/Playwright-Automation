import type { TestResult } from '@playwright/test/reporter';

/**
 * Test status types
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

/**
 * Test result with additional metadata
 */
export interface EnhancedTestResult extends Omit<TestResult, 'status' | 'error'> {
  testName: string;
  duration: number;
  retries: number;
  status?: TestStatus;
  error?: Error;
  screenshot?: string;
  video?: string;
  trace?: string;
  console?: string[];
  network?: {
    requests: number;
    responses: number;
    failedRequests: number;
  };
  performance?: {
    firstPaint: number;
    firstContentfulPaint: number;
    domContentLoaded: number;
    loadTime: number;
  };
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  name: string;
  file: string;
  tests: EnhancedTestResult[];
  duration: number;
  status: TestStatus;
  startTime: Date;
  endTime: Date;
}

/**
 * Test run statistics
 */
export interface TestRunStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  browsers: string[];
  retries: number;
}

/**
 * Reporter configuration
 */
export interface ReporterConfig {
  outputDir: string;
  attachments: {
    screenshots: boolean;
    videos: boolean;
    traces: boolean;
  };
  metrics: {
    performance: boolean;
    network: boolean;
  };
  notifications: {
    slack?: {
      webhook: string;
      channel: string;
    };
    email?: {
      to: string[];
      from: string;
    };
  };
}
