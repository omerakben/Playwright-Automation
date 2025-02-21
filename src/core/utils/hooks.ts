import { test as base, Page, TestInfo } from '@playwright/test';
import logger from '../logger';
import { CoreUtils } from './core.utils';
import { TestContext, TestHookConfig } from './utils.types';

/**
 * Custom test hooks for common test lifecycle operations
 */
export class TestHooks {
  private static config: TestHookConfig = {
    screenshotOnFailure: true,
    logConsoleErrors: true,
    cleanupTestData: true,
    recordPerformanceMetrics: true,
    recordNetworkRequests: true,
  };

  /**
   * Configure test hooks
   */
  public static configure(config: Partial<TestHookConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create test fixture with common hooks
   */
  public static createTest() {
    return base.extend<TestContext>({
      page: async ({ page }, use, testInfo) => {
        // Setup hooks
        await this.setupHooks(page, testInfo);

        // Use the page
        await use(page);

        // Teardown hooks
        await this.teardownHooks(page, testInfo);
      },
    });
  }

  /**
   * Setup hooks before test
   */
  private static async setupHooks(page: Page, testInfo: TestInfo): Promise<void> {
    if (this.config.logConsoleErrors) {
      this.setupConsoleLogging(page);
    }

    if (this.config.recordNetworkRequests) {
      this.setupNetworkLogging(page);
    }

    if (this.config.recordPerformanceMetrics) {
      await this.setupPerformanceMonitoring(page);
    }

    logger.info(`Starting test: ${testInfo.title}`, {
      testFile: testInfo.file,
      testProject: testInfo.project.name,
    });
  }

  /**
   * Teardown hooks after test
   */
  private static async teardownHooks(page: Page, testInfo: TestInfo): Promise<void> {
    try {
      if (testInfo.status !== 'passed') {
        if (this.config.screenshotOnFailure) {
          await this.takeFailureScreenshot(page, testInfo);
        }
      }

      if (this.config.cleanupTestData) {
        await this.cleanupTestData(testInfo);
      }

      if (this.config.recordPerformanceMetrics) {
        await this.recordPerformanceMetrics(page, testInfo);
      }
    } catch (error) {
      logger.logError('Error in test teardown', error);
    }

    logger.info(`Completed test: ${testInfo.title}`, {
      status: testInfo.status,
      duration: testInfo.duration,
    });
  }

  /**
   * Setup console error logging
   */
  private static setupConsoleLogging(page: Page): void {
    page.on('console', (message) => {
      const type = message.type();
      const text = message.text();

      if (type === 'error') {
        logger.logError('Browser console error', { message: text });
      } else if (type === 'warning') {
        logger.warn('Browser console warning', { message: text });
      }
    });
  }

  /**
   * Setup network request logging
   */
  private static setupNetworkLogging(page: Page): void {
    page.on('request', (request) => {
      logger.debug('Network request', {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      });
    });

    page.on('response', (response) => {
      logger.debug('Network response', {
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
      });
    });
  }

  /**
   * Setup performance monitoring
   */
  private static async setupPerformanceMonitoring(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.performance.mark('test-start');
    });
  }

  /**
   * Take failure screenshot
   */
  private static async takeFailureScreenshot(page: Page, testInfo: TestInfo): Promise<void> {
    const screenshotPath = await CoreUtils.takeScreenshot(page, {
      path: `test-results/${testInfo.title}/failure.png`,
      fullPage: true,
    });

    if (screenshotPath) {
      logger.info('Failure screenshot saved', { path: screenshotPath });
    }
  }

  /**
   * Cleanup test data
   */
  private static async cleanupTestData(testInfo: TestInfo): Promise<void> {
    // Implement cleanup logic based on your data management system
    logger.info('Cleaning up test data', { test: testInfo.title });
  }

  /**
   * Record performance metrics
   */
  private static async recordPerformanceMetrics(page: Page, testInfo: TestInfo): Promise<void> {
    const metrics = await page.evaluate(() => {
      window.performance.mark('test-end');
      window.performance.measure('test-duration', 'test-start', 'test-end');

      const timing = window.performance.timing;
      const measure = window.performance.getEntriesByName('test-duration')[0];

      return {
        testDuration: measure.duration,
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });

    logger.info('Performance metrics', {
      test: testInfo.title,
      metrics,
    });
  }

  /**
   * Create before all hook
   */
  public static beforeAll(callback: () => Promise<void>) {
    return base.beforeAll(async () => {
      try {
        await callback();
      } catch (error) {
        logger.logError('Error in beforeAll hook', error);
        throw error;
      }
    });
  }

  /**
   * Create after all hook
   */
  public static afterAll(callback: () => Promise<void>) {
    return base.afterAll(async () => {
      try {
        await callback();
      } catch (error) {
        logger.logError('Error in afterAll hook', error);
        throw error;
      }
    });
  }

  /**
   * Create before each hook
   */
  public static beforeEach(callback: (page: Page, testInfo: TestInfo) => Promise<void>) {
    return base.beforeEach(async ({ page }, testInfo) => {
      try {
        await callback(page, testInfo);
      } catch (error) {
        logger.logError('Error in beforeEach hook', error);
        throw error;
      }
    });
  }

  /**
   * Create after each hook
   */
  public static afterEach(callback: (page: Page, testInfo: TestInfo) => Promise<void>) {
    return base.afterEach(async ({ page }, testInfo) => {
      try {
        await callback(page, testInfo);
      } catch (error) {
        logger.logError('Error in afterEach hook', error);
        throw error;
      }
    });
  }
}
