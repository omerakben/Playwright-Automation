import { Page } from '@playwright/test';
import logger from '../logger';
import { CoreUtils } from '../utils';
import { BasePage, NavigationOptions, PageState } from './types';

/**
 * Base page class that all page objects should extend
 */
export abstract class BasePageObject implements BasePage {
  protected readonly _page: Page;
  protected readonly _url: string;

  constructor(page: Page, url: string) {
    this._page = page;
    this._url = url;
  }

  /**
   * Get page instance
   */
  public get page(): Page {
    return this._page;
  }

  /**
   * Get page URL
   */
  public get url(): string {
    return this._url;
  }

  /**
   * Navigate to page
   */
  public async goto(options: NavigationOptions = {}): Promise<void> {
    const { timeout = 30000, waitUntil = 'networkidle' } = options;

    try {
      logger.debug(`Navigating to ${this.url}`);
      await this._page.goto(this.url, { timeout, waitUntil });
      await this.waitForLoad();
    } catch (error) {
      logger.logError(`Failed to navigate to ${this.url}`, error);
      throw error;
    }
  }

  /**
   * Check if current page
   */
  public async isCurrentPage(): Promise<boolean> {
    try {
      const currentUrl = this._page.url();
      return currentUrl.includes(this._url);
    } catch (error) {
      logger.logError('Failed to check current page', error);
      return false;
    }
  }

  /**
   * Wait for page to load
   */
  public async waitForLoad(): Promise<void> {
    try {
      await CoreUtils.retry(async () => {
        await Promise.all([
          this._page.waitForLoadState('domcontentloaded'),
          this._page.waitForLoadState('networkidle'),
        ]);
      });
    } catch (error) {
      logger.logError('Failed to wait for page load', error);
      throw error;
    }
  }

  /**
   * Get page title
   */
  public async getTitle(): Promise<string> {
    return await this._page.title();
  }

  /**
   * Get page state
   */
  public async getState(): Promise<PageState> {
    const startTime = Date.now();
    await this.waitForLoad();
    const loadTime = Date.now() - startTime;

    return {
      url: this._page.url(),
      title: await this.getTitle(),
      readyState: await this._page.evaluate(() => document.readyState),
      loadTime,
    };
  }

  /**
   * Refresh page
   */
  public async refresh(): Promise<void> {
    try {
      await this._page.reload();
      await this.waitForLoad();
    } catch (error) {
      logger.logError('Failed to refresh page', error);
      throw error;
    }
  }

  /**
   * Go back
   */
  public async goBack(): Promise<void> {
    try {
      await this._page.goBack();
      await this.waitForLoad();
    } catch (error) {
      logger.logError('Failed to go back', error);
      throw error;
    }
  }

  /**
   * Go forward
   */
  public async goForward(): Promise<void> {
    try {
      await this._page.goForward();
      await this.waitForLoad();
    } catch (error) {
      logger.logError('Failed to go forward', error);
      throw error;
    }
  }

  /**
   * Take page screenshot
   */
  public async screenshot(path?: string): Promise<string | null> {
    return await CoreUtils.takeScreenshot(this._page, { path, fullPage: true });
  }

  /**
   * Get page metrics
   */
  public async getMetrics(): Promise<Record<string, number>> {
    return await this._page.evaluate(() => {
      const timing = performance.timing;
      return {
        navigationStart: timing.navigationStart,
        loadEventEnd: timing.loadEventEnd,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });
  }

  /**
   * Wait for URL to include string
   */
  public async waitForUrl(urlPart: string, timeout = 30000): Promise<void> {
    await this._page.waitForURL((url) => url.href.includes(urlPart), { timeout });
  }

  /**
   * Execute client-side JavaScript
   */
  public async evaluate<T>(fn: () => T): Promise<T> {
    return await this._page.evaluate(fn);
  }

  /**
   * Add page event listeners
   */
  protected setupEventListeners(): void {
    this._page.on('console', (message) => {
      const type = message.type();
      const text = message.text();
      if (type === 'error') {
        logger.logError('Browser console error', { message: text });
      } else if (type === 'warning') {
        logger.warn('Browser console warning', { message: text });
      }
    });

    this._page.on('pageerror', (error) => {
      logger.logError('Page error', error);
    });
  }
}
