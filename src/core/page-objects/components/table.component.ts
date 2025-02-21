import { Locator, Page } from '@playwright/test';
import logger from '../../logger';
import { BaseComponentObject } from '../base.component';
import { ComponentOptions, TableColumn } from '../types';

/**
 * Table component for handling table interactions
 */
export class TableComponent extends BaseComponentObject {
  private columns: TableColumn[];
  private readonly headerSelector: string;
  private readonly rowSelector: string;
  private readonly cellSelector: string;

  constructor(
    page: Page,
    root: Locator,
    columns: TableColumn[],
    options: ComponentOptions & {
      headerSelector?: string;
      rowSelector?: string;
      cellSelector?: string;
    } = {},
  ) {
    super(page, root, options);
    this.columns = columns;
    this.headerSelector = options.headerSelector || 'thead tr';
    this.rowSelector = options.rowSelector || 'tbody tr';
    this.cellSelector = options.cellSelector || 'td';
  }

  /**
   * Get total number of rows
   */
  public async getRowCount(): Promise<number> {
    try {
      return await this._root.locator(this.rowSelector).count();
    } catch (error) {
      logger.logError('Failed to get row count', error);
      return 0;
    }
  }

  /**
   * Get row data by index
   */
  public async getRowData(index: number): Promise<Record<string, string>> {
    const data: Record<string, string> = {};

    try {
      const row = this._root.locator(this.rowSelector).nth(index);
      for (const column of this.columns) {
        const cell = row.locator(column.selector);
        data[column.name] = (await cell.textContent()) || '';
      }
    } catch (error) {
      logger.logError(`Failed to get row data at index ${index}`, error);
    }

    return data;
  }

  /**
   * Get all rows data
   */
  public async getAllData(): Promise<Record<string, string>[]> {
    const data: Record<string, string>[] = [];
    const rowCount = await this.getRowCount();

    for (let i = 0; i < rowCount; i++) {
      const rowData = await this.getRowData(i);
      data.push(rowData);
    }

    return data;
  }

  /**
   * Sort table by column
   */
  public async sortBy(columnName: string): Promise<void> {
    try {
      const column = this.columns.find((col) => col.name === columnName);
      if (!column || !column.sortable) {
        throw new Error(`Column ${columnName} is not sortable`);
      }

      const headerCell = this._root.locator(this.headerSelector).locator(column.selector);
      await headerCell.click();
      await this._page.waitForLoadState('networkidle');
    } catch (error) {
      logger.logError(`Failed to sort by column ${columnName}`, error);
      throw error;
    }
  }

  /**
   * Filter table by column
   */
  public async filterBy(columnName: string, value: string): Promise<void> {
    try {
      const column = this.columns.find((col) => col.name === columnName);
      if (!column || !column.filterable) {
        throw new Error(`Column ${columnName} is not filterable`);
      }

      // Implement filter logic based on your table structure
      await this._root.evaluate(
        (table, { columnSelector, filterValue }) => {
          // Custom filter implementation
          const cells = table.querySelectorAll(columnSelector);
          cells.forEach((cell) => {
            const row = cell.closest('tr');
            if (row) {
              row.style.display = cell.textContent?.includes(filterValue) ? '' : 'none';
            }
          });
        },
        { columnSelector: column.selector, filterValue: value },
      );
    } catch (error) {
      logger.logError(`Failed to filter by column ${columnName}`, error);
      throw error;
    }
  }

  /**
   * Clear all filters
   */
  public async clearFilters(): Promise<void> {
    try {
      await this._root.evaluate((table) => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row) => {
          (row as HTMLElement).style.display = '';
        });
      });
    } catch (error) {
      logger.logError('Failed to clear filters', error);
      throw error;
    }
  }

  /**
   * Get cell value
   */
  public async getCellValue(rowIndex: number, columnName: string): Promise<string> {
    try {
      const column = this.columns.find((col) => col.name === columnName);
      if (!column) {
        throw new Error(`Column ${columnName} not found`);
      }

      const row = this._root.locator(this.rowSelector).nth(rowIndex);
      const cell = row.locator(column.selector);
      return (await cell.textContent()) || '';
    } catch (error) {
      logger.logError(`Failed to get cell value at row ${rowIndex}, column ${columnName}`, error);
      return '';
    }
  }

  /**
   * Click cell
   */
  public async clickCell(rowIndex: number, columnName: string): Promise<void> {
    try {
      const column = this.columns.find((col) => col.name === columnName);
      if (!column) {
        throw new Error(`Column ${columnName} not found`);
      }

      const row = this._root.locator(this.rowSelector).nth(rowIndex);
      const cell = row.locator(column.selector);
      await cell.click();
    } catch (error) {
      logger.logError(`Failed to click cell at row ${rowIndex}, column ${columnName}`, error);
      throw error;
    }
  }

  /**
   * Get selected rows
   */
  public async getSelectedRows(): Promise<number[]> {
    try {
      const selectedRows: number[] = [];
      const rows = this._root.locator(this.rowSelector);
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const isSelected = await row.evaluate((el) => el.classList.contains('selected'));
        if (isSelected) {
          selectedRows.push(i);
        }
      }

      return selectedRows;
    } catch (error) {
      logger.logError('Failed to get selected rows', error);
      return [];
    }
  }

  /**
   * Select row
   */
  public async selectRow(index: number): Promise<void> {
    try {
      const row = this._root.locator(this.rowSelector).nth(index);
      await row.evaluate((el) => {
        el.classList.add('selected');
        el.dispatchEvent(new Event('select'));
      });
    } catch (error) {
      logger.logError(`Failed to select row ${index}`, error);
      throw error;
    }
  }

  /**
   * Deselect row
   */
  public async deselectRow(index: number): Promise<void> {
    try {
      const row = this._root.locator(this.rowSelector).nth(index);
      await row.evaluate((el) => {
        el.classList.remove('selected');
        el.dispatchEvent(new Event('deselect'));
      });
    } catch (error) {
      logger.logError(`Failed to deselect row ${index}`, error);
      throw error;
    }
  }
}
