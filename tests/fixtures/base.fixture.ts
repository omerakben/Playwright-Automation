import { test as base, Page } from '@playwright/test';
import { BaseApiClient } from '../../src/core/api/base.client';
import config from '../../src/core/config';
import logger from '../../src/core/logger';
import { BasePageObject } from '../../src/core/page-objects/base.page';
import { TestHooks } from '../../src/core/utils/hooks';

/**
 * Test info interface
 */
export interface TestInfo {
  page?: Page;
  api?: BaseApiClient;
  config: typeof config;
}

/**
 * Base test fixture
 */
export const test = base.extend<TestInfo>({
  // Make config available in all tests
  config: [
    async ({}, use) => {
      await use(config);
    },
    { auto: true },
  ],

  // Setup page with custom configurations
  page: async ({ page }, use) => {
    if (!page) return;

    try {
      // Add custom page configurations
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8' });

      // Setup page event listeners
      page.on('console', (message) => {
        if (message.type() === 'error') {
          logger.error('Browser console error:', { message: message.text() });
        }
      });

      page.on('pageerror', (error) => {
        logger.logError('Page error:', error);
      });

      // Use the configured page
      await use(page);
    } catch (error) {
      logger.logError('Failed to setup page fixture', error);
      throw error;
    }
  },

  // Setup API client
  api: async ({}, use) => {
    const apiConfig = {
      baseURL: config.getConfig().apiBaseUrl,
      timeout: config.getConfig().timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const api = new BaseApiClient(apiConfig);
    await use(api);
  },
});

/**
 * Base test hooks
 */
export const expect = test.expect;
export const describe = test.describe;
export const beforeAll = TestHooks.beforeAll;
export const afterAll = TestHooks.afterAll;
export const beforeEach = TestHooks.beforeEach;
export const afterEach = TestHooks.afterEach;

/**
 * Create page object
 */
export function createPageObject<T extends BasePageObject>(
  PageObjectClass: new (page: Page) => T,
  page: Page,
): T {
  return new PageObjectClass(page);
}

/**
 * Test utilities
 */
export const utils = {
  /**
   * Wait for network idle
   */
  waitForNetworkIdle: async (page: Page, timeout = 5000) => {
    await page.waitForLoadState('networkidle', { timeout });
  },

  /**
   * Wait for animation completion
   */
  waitForAnimations: async (page: Page) => {
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    );
  },

  /**
   * Take screenshot with timestamp
   */
  takeScreenshot: async (page: Page, name: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  },

  /**
   * Get random test data
   */
  getRandomData: () => ({
    email: `test${Date.now()}@example.com`,
    password: `Test${Date.now()}!`,
    username: `user${Date.now()}`,
  }),
};
