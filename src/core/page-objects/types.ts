import { Locator, Page } from '@playwright/test';

/**
 * Base component interface
 */
export interface BaseComponent {
  readonly page: Page;
  readonly root: Locator;
  isVisible(): Promise<boolean>;
  waitForVisible(timeout?: number): Promise<void>;
  waitForHidden(timeout?: number): Promise<void>;
}

/**
 * Base page interface
 */
export interface BasePage {
  readonly page: Page;
  readonly url: string;
  goto(): Promise<void>;
  isCurrentPage(): Promise<boolean>;
  waitForLoad(): Promise<void>;
}

/**
 * Page navigation options
 */
export interface NavigationOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * Component options
 */
export interface ComponentOptions {
  name?: string;
  timeout?: number;
  required?: boolean;
}

/**
 * Page state
 */
export interface PageState {
  url: string;
  title: string;
  readyState: string;
  loadTime: number;
}

/**
 * Component action options
 */
export interface ActionOptions {
  timeout?: number;
  force?: boolean;
  retry?: boolean;
  waitForStable?: boolean;
}

/**
 * Form field types
 */
export type FormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'checkbox'
  | 'radio'
  | 'select';

/**
 * Form field interface
 */
export interface FormField {
  type: FormFieldType;
  name: string;
  label?: string;
  value?: string | boolean | number;
  required?: boolean;
  validation?: RegExp | ((value: any) => boolean);
  errorMessage?: string;
}

/**
 * Form data interface
 */
export interface FormData {
  [key: string]: string | boolean | number;
}

/**
 * Table column definition
 */
export interface TableColumn {
  name: string;
  selector: string;
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Modal options
 */
export interface ModalOptions extends ComponentOptions {
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
  animation?: boolean;
}

/**
 * Menu item interface
 */
export interface MenuItem {
  text: string;
  selector: string;
  parent?: string;
  children?: MenuItem[];
  isEnabled?: boolean;
}
