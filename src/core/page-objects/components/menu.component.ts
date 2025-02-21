import { Locator, Page } from '@playwright/test';
import logger from '../../logger';
import { CoreUtils } from '../../utils';
import { BaseComponentObject } from '../base.component';
import { ComponentOptions, MenuItem } from '../types';

/**
 * Navigation menu component for handling menu interactions
 */
export class MenuComponent extends BaseComponentObject {
  private items: MenuItem[];
  private readonly itemSelector: string;
  private readonly submenuSelector: string;
  private readonly activeClass: string;

  constructor(
    page: Page,
    root: Locator,
    items: MenuItem[],
    options: ComponentOptions & {
      itemSelector?: string;
      submenuSelector?: string;
      activeClass?: string;
    } = {},
  ) {
    super(page, root, options);
    this.items = items;
    this.itemSelector = options.itemSelector || '[data-testid="menu-item"]';
    this.submenuSelector = options.submenuSelector || '[data-testid="submenu"]';
    this.activeClass = options.activeClass || 'active';
  }

  /**
   * Navigate to menu item
   */
  public async navigateTo(path: string[]): Promise<void> {
    try {
      for (const segment of path) {
        await this.clickItem(segment);
        await this._page.waitForLoadState('networkidle');
      }
    } catch (error) {
      logger.logError(`Failed to navigate to ${path.join(' > ')}`, error);
      throw error;
    }
  }

  /**
   * Click menu item
   */
  public async clickItem(text: string): Promise<void> {
    try {
      const item = this.findItem(text);
      if (!item) {
        throw new Error(`Menu item not found: ${text}`);
      }

      const itemElement = this._root.locator(item.selector);
      await CoreUtils.safeClick(itemElement);

      if (item.children) {
        await this.waitForSubmenu(item);
      }
    } catch (error) {
      logger.logError(`Failed to click menu item: ${text}`, error);
      throw error;
    }
  }

  /**
   * Hover over menu item
   */
  public async hoverItem(text: string): Promise<void> {
    try {
      const item = this.findItem(text);
      if (!item) {
        throw new Error(`Menu item not found: ${text}`);
      }

      const itemElement = this._root.locator(item.selector);
      await itemElement.hover();

      if (item.children) {
        await this.waitForSubmenu(item);
      }
    } catch (error) {
      logger.logError(`Failed to hover menu item: ${text}`, error);
      throw error;
    }
  }

  /**
   * Get active menu item
   */
  public async getActiveItem(): Promise<string | null> {
    try {
      const activeElement = this._root.locator(`${this.itemSelector}.${this.activeClass}`);
      return await CoreUtils.getText(activeElement);
    } catch (error) {
      logger.logError('Failed to get active menu item', error);
      return null;
    }
  }

  /**
   * Check if menu item is active
   */
  public async isItemActive(text: string): Promise<boolean> {
    try {
      const item = this.findItem(text);
      if (!item) {
        return false;
      }

      const itemElement = this._root.locator(item.selector);
      const classList = await itemElement.evaluate((el) => Array.from(el.classList));
      return classList.includes(this.activeClass);
    } catch (error) {
      logger.logError(`Failed to check if menu item is active: ${text}`, error);
      return false;
    }
  }

  /**
   * Get all visible menu items
   */
  public async getVisibleItems(): Promise<string[]> {
    try {
      const items: string[] = [];
      const elements = this._root.locator(this.itemSelector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible()) {
          const text = await CoreUtils.getText(element);
          items.push(text);
        }
      }

      return items;
    } catch (error) {
      logger.logError('Failed to get visible menu items', error);
      return [];
    }
  }

  /**
   * Check if menu item exists
   */
  public async itemExists(text: string): Promise<boolean> {
    return !!this.findItem(text);
  }

  /**
   * Check if menu item is enabled
   */
  public async isItemEnabled(text: string): Promise<boolean> {
    try {
      const item = this.findItem(text);
      if (!item) {
        return false;
      }

      const itemElement = this._root.locator(item.selector);
      return await itemElement.isEnabled();
    } catch (error) {
      logger.logError(`Failed to check if menu item is enabled: ${text}`, error);
      return false;
    }
  }

  /**
   * Wait for submenu to appear
   */
  private async waitForSubmenu(item: MenuItem): Promise<void> {
    try {
      const submenu = this._root.locator(`${item.selector} ${this.submenuSelector}`);
      await submenu.waitFor({ state: 'visible' });
    } catch (error) {
      logger.logError(`Failed to wait for submenu of: ${item.text}`, error);
      throw error;
    }
  }

  /**
   * Find menu item by text
   */
  private findItem(text: string, items: MenuItem[] = this.items): MenuItem | null {
    for (const item of items) {
      if (item.text === text) {
        return item;
      }
      if (item.children) {
        const found = this.findItem(text, item.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Get breadcrumb path to item
   */
  public getBreadcrumbPath(text: string): string[] {
    const path: string[] = [];
    this.findItemPath(text, this.items, path);
    return path;
  }

  /**
   * Find path to menu item
   */
  private findItemPath(text: string, items: MenuItem[], path: string[]): boolean {
    for (const item of items) {
      path.push(item.text);
      if (item.text === text) {
        return true;
      }
      if (item.children && this.findItemPath(text, item.children, path)) {
        return true;
      }
      path.pop();
    }
    return false;
  }

  /**
   * Expand all menu items
   */
  public async expandAll(): Promise<void> {
    try {
      for (const item of this.items) {
        if (item.children) {
          await this.clickItem(item.text);
        }
      }
    } catch (error) {
      logger.logError('Failed to expand all menu items', error);
      throw error;
    }
  }

  /**
   * Collapse all menu items
   */
  public async collapseAll(): Promise<void> {
    try {
      const expandedItems = this._root.locator(`${this.itemSelector}.expanded`);
      const count = await expandedItems.count();

      for (let i = 0; i < count; i++) {
        const item = expandedItems.nth(i);
        await item.click();
      }
    } catch (error) {
      logger.logError('Failed to collapse all menu items', error);
      throw error;
    }
  }
}
