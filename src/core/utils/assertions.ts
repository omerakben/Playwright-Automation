import { expect, Locator, Page } from '@playwright/test';
import { CoreUtils } from './core.utils';
import { AssertionOptions } from './utils.types';

/**
 * Custom assertions for enhanced test validation
 */
export class CustomAssertions {
  /**
   * Assert element contains text with retry
   */
  public static async containsText(
    locator: Locator,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000, ignoreCase = false } = options;

    await CoreUtils.retry(
      async () => {
        const content = await locator.textContent();
        const actualText = content || '';
        const expectedText = ignoreCase ? text.toLowerCase() : text;
        const comparison = ignoreCase ? actualText.toLowerCase() : actualText;

        expect(comparison).toContain(expectedText);
      },
      { timeout },
    );
  }

  /**
   * Assert element matches regex pattern
   */
  public static async matchesPattern(
    locator: Locator,
    pattern: RegExp,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        const content = await locator.textContent();
        expect(content).toMatch(pattern);
      },
      { timeout },
    );
  }

  /**
   * Assert element has specific attributes
   */
  public static async hasAttributes(
    locator: Locator,
    attributes: Record<string, string>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        for (const [attr, value] of Object.entries(attributes)) {
          const actualValue = await locator.getAttribute(attr);
          expect(actualValue).toBe(value);
        }
      },
      { timeout },
    );
  }

  /**
   * Assert element has specific CSS properties
   */
  public static async hasCssProperties(
    locator: Locator,
    properties: Record<string, string>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        for (const [prop, value] of Object.entries(properties)) {
          const actualValue = await locator.evaluate(
            (el, p) => window.getComputedStyle(el).getPropertyValue(p),
            prop,
          );
          expect(actualValue).toBe(value);
        }
      },
      { timeout },
    );
  }

  /**
   * Assert network request was made
   */
  public static async requestWasMade(
    page: Page,
    urlPattern: RegExp | string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        const request = await page.waitForRequest(
          (request) =>
            typeof urlPattern === 'string'
              ? request.url().includes(urlPattern)
              : urlPattern.test(request.url()),
          { timeout: options.timeout },
        );
        return !!request;
      },
      { timeout },
    );
  }

  /**
   * Assert element count
   */
  public static async hasCount(
    locator: Locator,
    count: number,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        await expect(locator).toHaveCount(count, { timeout });
      },
      { timeout },
    );
  }

  /**
   * Assert element is in viewport
   */
  public static async isInViewport(
    locator: Locator,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        const isVisible = await locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        });
        expect(isVisible).toBe(true);
      },
      { timeout },
    );
  }

  /**
   * Assert page has no console errors
   */
  public static async hasNoConsoleErrors(
    page: Page,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await CoreUtils.retry(
      async () => {
        expect(errors).toHaveLength(0);
      },
      { timeout },
    );
  }

  /**
   * Assert element meets accessibility standards
   */
  public static async isAccessible(
    locator: Locator,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        // Check for basic accessibility attributes
        const hasRole = await locator.getAttribute('role');
        const hasAriaLabel = await locator.getAttribute('aria-label');
        const hasTabIndex = await locator.getAttribute('tabindex');

        if (!hasRole && !hasAriaLabel) {
          throw new Error('Element lacks basic accessibility attributes');
        }

        // Check if element is keyboard focusable
        if (hasTabIndex !== null) {
          const tabIndex = parseInt(hasTabIndex);
          expect(tabIndex).toBeGreaterThanOrEqual(-1);
        }
      },
      { timeout },
    );
  }

  /**
   * Assert performance metrics
   */
  public static async meetsPerformanceMetrics(
    page: Page,
    metrics: { [key: string]: number },
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await CoreUtils.retry(
      async () => {
        const performanceMetrics = await page.evaluate(() => {
          const timing = window.performance.timing;
          return {
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
          };
        });

        for (const [metric, threshold] of Object.entries(metrics)) {
          const actualValue = performanceMetrics[metric as keyof typeof performanceMetrics];
          expect(actualValue).toBeLessThanOrEqual(threshold);
        }
      },
      { timeout },
    );
  }
}
