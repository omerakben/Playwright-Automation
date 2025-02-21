import { Locator, Page } from '@playwright/test';
import logger from '../../logger';
import { CoreUtils } from '../../utils';
import { BaseComponentObject } from '../base.component';
import { ComponentOptions, FormData, FormField } from '../types';

/**
 * Form component for handling form interactions
 */
export class FormComponent extends BaseComponentObject {
  private fields: Map<string, FormField>;

  constructor(page: Page, root: Locator, options: ComponentOptions = {}) {
    super(page, root, options);
    this.fields = new Map();
  }

  /**
   * Add form field
   */
  public addField(field: FormField): void {
    this.fields.set(field.name, field);
  }

  /**
   * Fill form with data
   */
  public async fill(data: FormData): Promise<void> {
    try {
      for (const [name, value] of Object.entries(data)) {
        const field = this.fields.get(name);
        if (!field) {
          logger.warn(`Field not found: ${name}`);
          continue;
        }

        await this.fillField(field, value);
      }
    } catch (error) {
      logger.logError('Failed to fill form', error);
      throw error;
    }
  }

  /**
   * Get form data
   */
  public async getData(): Promise<FormData> {
    const data: FormData = {};

    try {
      for (const [name, field] of this.fields.entries()) {
        data[name] = await this.getFieldValue(field);
      }
    } catch (error) {
      logger.logError('Failed to get form data', error);
      throw error;
    }

    return data;
  }

  /**
   * Submit form
   */
  public async submit(): Promise<void> {
    try {
      await this._root.evaluate((form) => {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
          (submitButton as HTMLButtonElement).click();
        } else {
          (form as HTMLFormElement).submit();
        }
      });
      await this._page.waitForLoadState('networkidle');
    } catch (error) {
      logger.logError('Failed to submit form', error);
      throw error;
    }
  }

  /**
   * Reset form
   */
  public async reset(): Promise<void> {
    try {
      const form = await this._root.evaluate((el) => el);
      (form as HTMLFormElement).reset();
    } catch (error) {
      logger.logError('Failed to reset form', error);
      throw error;
    }
  }

  /**
   * Validate form
   */
  public async validate(): Promise<boolean> {
    try {
      const form = await this._root.evaluate((el) => el);
      return (form as HTMLFormElement).checkValidity();
    } catch (error) {
      logger.logError('Failed to validate form', error);
      return false;
    }
  }

  /**
   * Get validation errors
   */
  public async getValidationErrors(): Promise<Record<string, string>> {
    const errors: Record<string, string> = {};

    try {
      for (const [name, field] of this.fields.entries()) {
        const fieldLocator = this.getFieldLocator(field);
        const isValid = await fieldLocator.evaluate((el) => (el as HTMLFormElement).validity.valid);

        if (!isValid) {
          const errorMessage = await fieldLocator.evaluate(
            (el) => (el as HTMLFormElement).validationMessage,
          );
          errors[name] = errorMessage;
        }
      }
    } catch (error) {
      logger.logError('Failed to get validation errors', error);
    }

    return errors;
  }

  /**
   * Fill a specific field
   */
  private async fillField(field: FormField, value: string | boolean | number): Promise<void> {
    const fieldLocator = this.getFieldLocator(field);

    try {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'password':
        case 'number':
          await CoreUtils.safeType(fieldLocator, String(value));
          break;
        case 'checkbox':
          if ((await fieldLocator.isChecked()) !== Boolean(value)) {
            await CoreUtils.safeClick(fieldLocator);
          }
          break;
        case 'radio':
          await CoreUtils.safeClick(fieldLocator);
          break;
        case 'select':
          await fieldLocator.selectOption({ value: String(value) });
          break;
      }

      // Validate field if validation is defined
      if (field.validation) {
        const isValid =
          typeof field.validation === 'function'
            ? field.validation(value)
            : field.validation.test(String(value));

        if (!isValid) {
          throw new Error(field.errorMessage || `Invalid value for field: ${field.name}`);
        }
      }
    } catch (error) {
      logger.logError(`Failed to fill field: ${field.name}`, error);
      throw error;
    }
  }

  /**
   * Get field value
   */
  private async getFieldValue(field: FormField): Promise<string | boolean | number> {
    const fieldLocator = this.getFieldLocator(field);

    try {
      switch (field.type) {
        case 'checkbox':
          return await fieldLocator.isChecked();
        case 'radio':
          return await fieldLocator.isChecked();
        case 'number':
          const value = await fieldLocator.inputValue();
          return value ? Number(value) : 0;
        default:
          return await fieldLocator.inputValue();
      }
    } catch (error) {
      logger.logError(`Failed to get field value: ${field.name}`, error);
      throw error;
    }
  }

  /**
   * Get field locator
   */
  private getFieldLocator(field: FormField): Locator {
    return this._root.locator(`[name="${field.name}"]`);
  }
}
