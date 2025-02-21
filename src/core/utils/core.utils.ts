import { Locator, Page, expect } from '@playwright/test';
import logger from '../logger';
import {
  ElementStateOptions,
  InterceptionOptions,
  RetryOptions,
  ScreenshotOptions,
  WaitOptions,
} from './utils.types';

/**
 * Core utility functions for test automation
 */
export class CoreUtils {
  /**
   * Retry an action until it succeeds or reaches max attempts
   */
  public static async retry<T>(action: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const { attempts = 3, timeout = 5000, interval = 1000 } = options;
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await Promise.race([
          action(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeout),
          ),
        ]);
      } catch (error) {
        lastError = error as Error;
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Wait for element to be in desired state
   */
  public static async waitForElement(locator: Locator, options: WaitOptions = {}): Promise<void> {
    const { timeout = 5000, state = 'visible', strict = false } = options;

    try {
      switch (state) {
        case 'visible':
          await locator.waitFor({ state: 'visible', timeout });
          break;
        case 'hidden':
          await locator.waitFor({ state: 'hidden', timeout });
          break;
        case 'attached':
          await locator.waitFor({ state: 'attached', timeout });
          break;
      }
    } catch (error) {
      if (strict) {
        throw error;
      }
      logger.warn(`Element wait condition not met: ${state}`, { error });
    }
  }

  /**
   * Check element state with custom conditions
   */
  public static async checkElementState(
    locator: Locator,
    options: ElementStateOptions,
  ): Promise<boolean> {
    const { state, timeout = 5000 } = options;

    try {
      switch (state) {
        case 'visible':
          await expect(locator).toBeVisible({ timeout });
          break;
        case 'hidden':
          await expect(locator).toBeHidden({ timeout });
          break;
        case 'enabled':
          await expect(locator).toBeEnabled({ timeout });
          break;
        case 'disabled':
          await expect(locator).toBeDisabled({ timeout });
          break;
        case 'checked':
          await expect(locator).toBeChecked({ timeout });
          break;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot with enhanced options
   */
  public static async takeScreenshot(
    page: Page,
    options: ScreenshotOptions = {},
  ): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = options.path || `screenshots/screenshot-${timestamp}.png`;

      await page.screenshot({
        path,
        fullPage: options.fullPage,
        quality: options.quality,
        omitBackground: options.omitBackground,
      });

      logger.debug(`Screenshot saved: ${path}`);
      return path;
    } catch (error) {
      logger.logError('Failed to take screenshot', error);
      return null;
    }
  }

  /**
   * Intercept network requests
   */
  public static async interceptNetwork(page: Page, options: InterceptionOptions): Promise<void> {
    await page.route(options.url, (route) => {
      if (options.method && route.request().method() !== options.method) {
        return route.continue();
      }

      route.fulfill({
        status: options.statusCode || 200,
        body: options.body ? JSON.stringify(options.body) : '',
        headers: options.headers || {
          'Content-Type': 'application/json',
        },
      });
    });
  }

  /**
   * Safe click with retry
   */
  public static async safeClick(locator: Locator, options: RetryOptions = {}): Promise<void> {
    await this.retry(async () => {
      await locator.click();
    }, options);
  }

  /**
   * Safe type with retry
   */
  public static async safeType(
    locator: Locator,
    text: string,
    options: RetryOptions = {},
  ): Promise<void> {
    await this.retry(async () => {
      await locator.fill(text);
    }, options);
  }

  /**
   * Get element text safely
   */
  public static async getText(locator: Locator, defaultValue: string = ''): Promise<string> {
    try {
      return (await locator.textContent()) || defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Check if element exists
   */
  public static async exists(locator: Locator): Promise<boolean> {
    try {
      return (await locator.count()) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Wait for network idle
   */
  public static async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      logger.warn('Network did not reach idle state', { error });
    }
  }

  /**
   * Execute in try-catch with logging
   */
  public static async execute<T>(
    action: () => Promise<T>,
    errorMessage: string,
  ): Promise<T | null> {
    try {
      return await action();
    } catch (error) {
      logger.logError(errorMessage, error);
      return null;
    }
  }
}
