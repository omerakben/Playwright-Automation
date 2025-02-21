import { Page } from '@playwright/test';
import logger from '../../src/core/logger';
import { BasePageObject } from '../../src/core/page-objects/base.page';
import { FormComponent } from '../../src/core/page-objects/components/form.component';
import { MenuComponent } from '../../src/core/page-objects/components/menu.component';
import { ModalComponent } from '../../src/core/page-objects/components/modal.component';
import { TableComponent } from '../../src/core/page-objects/components/table.component';
import { test as baseTest } from './base.fixture';

/**
 * E2E test info interface
 */
export interface E2ETestInfo {
  currentPage?: BasePageObject;
  components: {
    createForm: (selector: string) => FormComponent;
    createTable: (selector: string, columns: any[]) => TableComponent;
    createModal: (selector: string) => ModalComponent;
    createMenu: (selector: string, items: any[]) => MenuComponent;
  };
}

/**
 * E2E test fixture
 */
export const test = baseTest.extend<E2ETestInfo>({
  // Make components available in all tests
  components: async ({ page }, use) => {
    if (!page) return;

    await use({
      createForm: (selector: string) => {
        return new FormComponent(page, page.locator(selector));
      },
      createTable: (selector: string, columns: any[]) => {
        return new TableComponent(page, page.locator(selector), columns);
      },
      createModal: (selector: string) => {
        return new ModalComponent(page, page.locator(selector));
      },
      createMenu: (selector: string, items: any[]) => {
        return new MenuComponent(page, page.locator(selector), items);
      },
    });
  },

  // Track current page object
  currentPage: async ({ page }, use) => {
    await use(undefined);
  },
});

/**
 * Navigate to page
 */
export async function navigateToPage<T extends BasePageObject>(
  page: Page,
  PageObjectClass: new (page: Page) => T,
): Promise<T> {
  try {
    const pageObject = new PageObjectClass(page);
    await pageObject.goto();
    return pageObject;
  } catch (error) {
    logger.logError('Failed to navigate to page', error);
    throw error;
  }
}

/**
 * E2E test utilities
 */
export const e2eUtils = {
  /**
   * Fill form with data
   */
  fillForm: async (form: FormComponent, data: Record<string, any>) => {
    await form.fill(data);
  },

  /**
   * Verify table data
   */
  verifyTableData: async (table: TableComponent, expectedData: any[]) => {
    const actualData = await table.getAllData();
    expect(actualData).toEqual(expectedData);
  },

  /**
   * Handle modal dialog
   */
  handleModal: async (modal: ModalComponent, action: 'confirm' | 'cancel') => {
    if (action === 'confirm') {
      await modal.clickPrimaryAction();
    } else {
      await modal.clickSecondaryAction();
    }
  },

  /**
   * Navigate menu
   */
  navigateMenu: async (menu: MenuComponent, path: string[]) => {
    await menu.navigateTo(path);
  },
};
