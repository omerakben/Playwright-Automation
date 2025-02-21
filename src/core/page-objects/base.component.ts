import { Locator, Page } from '@playwright/test';
import logger from '../logger';
import { CoreUtils } from '../utils';
import { ActionOptions, BaseComponent, ComponentOptions } from './types';

/**
 * Base component class that all page components should extend
 */
export abstract class BaseComponentObject implements BaseComponent {
  protected readonly _page: Page;
  protected readonly _root: Locator;
  protected readonly _name: string;
  protected readonly _timeout: number;
  protected readonly _required: boolean;

  constructor(page: Page, root: Locator, options: ComponentOptions = {}) {
    this._page = page;
    this._root = root;
    this._name = options.name || this.constructor.name;
    this._timeout = options.timeout || 5000;
    this._required = options.required || false;
  }

  /**
   * Get page instance
   */
  public get page(): Page {
    return this._page;
  }

  /**
   * Get root locator
   */
  public get root(): Locator {
    return this._root;
  }

  /**
   * Check if component is visible
   */
  public async isVisible(): Promise<boolean> {
    try {
      return await this._root.isVisible();
    } catch (error) {
      logger.logError(`Failed to check visibility of ${this._name}`, error);
      return false;
    }
  }

  /**
   * Wait for component to be visible
   */
  public async waitForVisible(timeout?: number): Promise<void> {
    try {
      await CoreUtils.waitForElement(this._root, {
        state: 'visible',
        timeout: timeout || this._timeout,
        strict: this._required,
      });
    } catch (error) {
      logger.logError(`Failed to wait for ${this._name} to be visible`, error);
      throw error;
    }
  }

  /**
   * Wait for component to be hidden
   */
  public async waitForHidden(timeout?: number): Promise<void> {
    try {
      await CoreUtils.waitForElement(this._root, {
        state: 'hidden',
        timeout: timeout || this._timeout,
        strict: this._required,
      });
    } catch (error) {
      logger.logError(`Failed to wait for ${this._name} to be hidden`, error);
      throw error;
    }
  }

  /**
   * Click on component
   */
  public async click(options: ActionOptions = {}): Promise<void> {
    const { timeout = this._timeout, force = false, retry = true } = options;

    try {
      if (retry) {
        await CoreUtils.safeClick(this._root, { timeout });
      } else {
        await this._root.click({ force, timeout });
      }
    } catch (error) {
      logger.logError(`Failed to click ${this._name}`, error);
      throw error;
    }
  }

  /**
   * Get component text
   */
  public async getText(): Promise<string> {
    try {
      return await CoreUtils.getText(this._root);
    } catch (error) {
      logger.logError(`Failed to get text from ${this._name}`, error);
      throw error;
    }
  }

  /**
   * Get component attribute
   */
  public async getAttribute(name: string): Promise<string | null> {
    try {
      return await this._root.getAttribute(name);
    } catch (error) {
      logger.logError(`Failed to get attribute ${name} from ${this._name}`, error);
      throw error;
    }
  }

  /**
   * Check if component exists
   */
  public async exists(): Promise<boolean> {
    try {
      return await CoreUtils.exists(this._root);
    } catch (error) {
      logger.logError(`Failed to check existence of ${this._name}`, error);
      return false;
    }
  }

  /**
   * Hover over component
   */
  public async hover(options: ActionOptions = {}): Promise<void> {
    const { timeout = this._timeout, force = false } = options;

    try {
      await this._root.hover({ force, timeout });
    } catch (error) {
      logger.logError(`Failed to hover over ${this._name}`, error);
      throw error;
    }
  }

  /**
   * Focus component
   */
  public async focus(): Promise<void> {
    try {
      await this._root.focus();
    } catch (error) {
      logger.logError(`Failed to focus ${this._name}`, error);
      throw error;
    }
  }

  /**
   * Get computed style
   */
  public async getComputedStyle(property: string): Promise<string> {
    try {
      return await this._root.evaluate(
        (element, prop) => window.getComputedStyle(element).getPropertyValue(prop),
        property,
      );
    } catch (error) {
      logger.logError(`Failed to get computed style ${property} from ${this._name}`, error);
      throw error;
    }
  }

  /**
   * Get bounding box
   */
  public async getBoundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    try {
      return await this._root.boundingBox();
    } catch (error) {
      logger.logError(`Failed to get bounding box of ${this._name}`, error);
      return null;
    }
  }

  /**
   * Take screenshot of component
   */
  public async screenshot(path?: string): Promise<string | null> {
    try {
      if (path) {
        await this._root.screenshot({ path });
        return path;
      }
      return null;
    } catch (error) {
      logger.logError(`Failed to take screenshot of ${this._name}`, error);
      return null;
    }
  }

  /**
   * Check if component is enabled
   */
  public async isEnabled(): Promise<boolean> {
    try {
      return await this._root.isEnabled();
    } catch (error) {
      logger.logError(`Failed to check if ${this._name} is enabled`, error);
      return false;
    }
  }

  /**
   * Check if component is disabled
   */
  public async isDisabled(): Promise<boolean> {
    try {
      return !(await this.isEnabled());
    } catch (error) {
      logger.logError(`Failed to check if ${this._name} is disabled`, error);
      return false;
    }
  }

  /**
   * Wait for component to be stable
   */
  protected async waitForStable(timeout?: number): Promise<void> {
    try {
      await CoreUtils.waitForElement(this._root, {
        state: 'stable',
        timeout: timeout || this._timeout,
      });
    } catch (error) {
      logger.logError(`Failed to wait for ${this._name} to be stable`, error);
      throw error;
    }
  }
}
