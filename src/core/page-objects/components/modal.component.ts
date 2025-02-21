import { Locator, Page } from '@playwright/test';
import logger from '../../logger';
import { CoreUtils } from '../../utils';
import { BaseComponentObject } from '../base.component';
import { ModalOptions } from '../types';

/**
 * Modal component for handling modal dialogs
 */
export class ModalComponent extends BaseComponentObject {
  private readonly closeButton: Locator;
  private readonly overlay: Locator | null;
  private readonly animation: boolean;
  private readonly closeOnEscape: boolean;
  private readonly closeOnClickOutside: boolean;

  constructor(page: Page, root: Locator, options: ModalOptions = {}) {
    super(page, root, options);
    this.closeButton = this._root.locator('[data-testid="modal-close"]');
    this.overlay = options.closeOnClickOutside ? this._root.locator('.modal-overlay') : null;
    this.animation = options.animation ?? true;
    this.closeOnEscape = options.closeOnEscape ?? true;
    this.closeOnClickOutside = options.closeOnClickOutside ?? true;

    if (this.closeOnEscape) {
      this.setupEscapeListener();
    }

    if (this.closeOnClickOutside && this.overlay) {
      this.setupOverlayListener();
    }
  }

  /**
   * Open modal
   */
  public async open(): Promise<void> {
    try {
      if (await this.isVisible()) {
        return;
      }

      await this._root.evaluate((modal) => {
        modal.style.display = 'block';
        modal.dispatchEvent(new Event('modal:open'));
      });

      if (this.animation) {
        await this.waitForAnimation();
      }

      await this.waitForVisible();
      logger.debug('Modal opened');
    } catch (error) {
      logger.logError('Failed to open modal', error);
      throw error;
    }
  }

  /**
   * Close modal
   */
  public async close(): Promise<void> {
    try {
      if (!(await this.isVisible())) {
        return;
      }

      await this.closeButton.click();

      if (this.animation) {
        await this.waitForAnimation();
      }

      await this.waitForHidden();
      logger.debug('Modal closed');
    } catch (error) {
      logger.logError('Failed to close modal', error);
      throw error;
    }
  }

  /**
   * Get modal title
   */
  public async getTitle(): Promise<string> {
    try {
      const titleElement = this._root.locator('[data-testid="modal-title"]');
      return await CoreUtils.getText(titleElement);
    } catch (error) {
      logger.logError('Failed to get modal title', error);
      return '';
    }
  }

  /**
   * Get modal content
   */
  public async getContent(): Promise<string> {
    try {
      const contentElement = this._root.locator('[data-testid="modal-content"]');
      return await CoreUtils.getText(contentElement);
    } catch (error) {
      logger.logError('Failed to get modal content', error);
      return '';
    }
  }

  /**
   * Check if modal is open
   */
  public async isOpen(): Promise<boolean> {
    return await this.isVisible();
  }

  /**
   * Wait for modal animation
   */
  private async waitForAnimation(): Promise<void> {
    try {
      await this._root.evaluate((modal) => {
        return new Promise((resolve) => {
          const handler = () => {
            modal.removeEventListener('animationend', handler);
            resolve(undefined);
          };
          modal.addEventListener('animationend', handler);
        });
      });
    } catch (error) {
      logger.logError('Failed to wait for modal animation', error);
    }
  }

  /**
   * Setup escape key listener
   */
  private async setupEscapeListener(): Promise<void> {
    if (this.closeOnEscape) {
      await this._page.evaluate(() => {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            document.dispatchEvent(new CustomEvent('modal:close'));
          }
        });
      });

      await this._page.exposeFunction('closeModal', async () => {
        if (await this.isVisible()) {
          await this.close();
        }
      });

      await this._page.evaluate(() => {
        document.addEventListener('modal:close', () => {
          // @ts-ignore
          window.closeModal();
        });
      });
    }
  }

  /**
   * Setup overlay click listener
   */
  private async setupOverlayListener(): Promise<void> {
    if (this.overlay) {
      // Set up a click handler on the overlay
      await this.overlay.evaluate((element) => {
        element.onclick = () => {
          element.dispatchEvent(new CustomEvent('modal:overlay-click'));
        };
      });

      // Handle the custom event
      await this._page.exposeFunction('handleOverlayClick', async () => {
        if (await this.isVisible()) {
          await this.close();
        }
      });

      await this._page.evaluate(() => {
        document.addEventListener('modal:overlay-click', () => {
          // @ts-ignore
          window.handleOverlayClick();
        });
      });
    }
  }

  /**
   * Click primary action button
   */
  public async clickPrimaryAction(): Promise<void> {
    try {
      const primaryButton = this._root.locator('[data-testid="modal-primary-action"]');
      await CoreUtils.safeClick(primaryButton);
    } catch (error) {
      logger.logError('Failed to click primary action button', error);
      throw error;
    }
  }

  /**
   * Click secondary action button
   */
  public async clickSecondaryAction(): Promise<void> {
    try {
      const secondaryButton = this._root.locator('[data-testid="modal-secondary-action"]');
      await CoreUtils.safeClick(secondaryButton);
    } catch (error) {
      logger.logError('Failed to click secondary action button', error);
      throw error;
    }
  }

  /**
   * Set modal size
   */
  public async setSize(size: 'small' | 'medium' | 'large'): Promise<void> {
    try {
      await this._root.evaluate((modal, modalSize) => {
        modal.classList.remove('modal-small', 'modal-medium', 'modal-large');
        modal.classList.add(`modal-${modalSize}`);
      }, size);
    } catch (error) {
      logger.logError('Failed to set modal size', error);
      throw error;
    }
  }

  /**
   * Check if modal has specific content
   */
  public async hasContent(text: string): Promise<boolean> {
    try {
      const content = await this.getContent();
      return content.includes(text);
    } catch (error) {
      logger.logError('Failed to check modal content', error);
      return false;
    }
  }

  /**
   * Wait for modal state change
   */
  public async waitForState(state: 'open' | 'closed'): Promise<void> {
    try {
      if (state === 'open') {
        await this.waitForVisible();
      } else {
        await this.waitForHidden();
      }
    } catch (error) {
      logger.logError(`Failed to wait for modal ${state} state`, error);
      throw error;
    }
  }
}
