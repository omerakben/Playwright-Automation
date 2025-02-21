import { Page, TestInfo } from '@playwright/test';

/**
 * Retry options for utility functions
 */
export interface RetryOptions {
  attempts?: number;
  timeout?: number;
  interval?: number;
}

/**
 * Wait options for utility functions
 */
export interface WaitOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  strict?: boolean;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  fullPage?: boolean;
  path?: string;
  quality?: number;
  omitBackground?: boolean;
}

/**
 * Network interception options
 */
export interface InterceptionOptions {
  url: string | RegExp;
  method?: string;
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Test hook configuration
 */
export interface TestHookConfig {
  before?: () => Promise<void>;
  after?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
  screenshotOnFailure?: boolean;
  logConsoleErrors?: boolean;
  cleanupTestData?: boolean;
  recordPerformanceMetrics?: boolean;
  recordNetworkRequests?: boolean;
}

/**
 * Element state check options
 */
export interface ElementStateOptions {
  state: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'checked';
  timeout?: number;
}

/**
 * Custom assertion options
 */
export interface AssertionOptions {
  message?: string;
  timeout?: number;
  interval?: number;
  softAssert?: boolean;
  ignoreCase?: boolean;
}

/**
 * Performance measurement options
 */
export interface PerformanceOptions {
  name: string;
  metrics?: string[];
  threshold?: number;
}

/**
 * Test context type
 */
export interface TestContext {
  page: Page;
  info: TestInfo;
  data?: Record<string, unknown>;
}
