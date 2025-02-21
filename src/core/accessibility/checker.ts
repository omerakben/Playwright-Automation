import { Page } from '@playwright/test';
import logger from '../logger';

/**
 * Accessibility rule configuration
 */
export interface AccessibilityRuleConfig {
  enabled?: boolean;
  options?: Record<string, any>;
}

/**
 * Accessibility check options
 */
export interface AccessibilityCheckOptions {
  rules?: Record<string, AccessibilityRuleConfig>;
  runOnly?: {
    type: 'tag' | 'rule';
    values: string[];
  };
  context?: {
    include?: string[];
    exclude?: string[];
  };
}

/**
 * Accessibility violation
 */
export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: {
    html: string;
    target: string[];
    failureSummary: string;
  }[];
}

/**
 * Accessibility check result
 */
export interface AccessibilityCheckResult {
  url: string;
  timestamp: string;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

/**
 * Accessibility checker class
 */
export class AccessibilityChecker {
  private static instance: AccessibilityChecker;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AccessibilityChecker {
    if (!AccessibilityChecker.instance) {
      AccessibilityChecker.instance = new AccessibilityChecker();
    }
    return AccessibilityChecker.instance;
  }

  /**
   * Run accessibility check
   */
  public async check(
    page: Page,
    options: AccessibilityCheckOptions = {},
  ): Promise<AccessibilityCheckResult> {
    try {
      // Inject axe-core
      await this.injectAxe(page);

      // Run axe analysis
      const violations = await this.runAxe(page, options);

      // Create check result
      const result = this.createCheckResult(page, violations);

      logger.info('Accessibility check completed', { summary: result.summary });
      return result;
    } catch (error) {
      logger.logError('Accessibility check failed', error);
      throw error;
    }
  }

  /**
   * Inject axe-core into page
   */
  private async injectAxe(page: Page): Promise<void> {
    try {
      await page.addScriptTag({
        path: require.resolve('axe-core/axe.min.js'),
      });
    } catch (error) {
      logger.logError('Failed to inject axe-core', error);
      throw error;
    }
  }

  /**
   * Run axe analysis
   */
  private async runAxe(
    page: Page,
    options: AccessibilityCheckOptions,
  ): Promise<AccessibilityViolation[]> {
    try {
      const axeOptions = this.buildAxeOptions(options);
      const results = await page.evaluate((opts) => {
        return new Promise<{ violations: AccessibilityViolation[] }>((resolve) => {
          // @ts-ignore
          window.axe.run(document, opts, (err, results) => {
            if (err) throw err;
            resolve(results);
          });
        });
      }, axeOptions);

      return results.violations;
    } catch (error) {
      logger.logError('Failed to run axe analysis', error);
      throw error;
    }
  }

  /**
   * Build axe options
   */
  private buildAxeOptions(options: AccessibilityCheckOptions): Record<string, any> {
    const axeOptions: Record<string, any> = {
      resultTypes: ['violations'],
      rules: options.rules || {},
    };

    if (options.runOnly) {
      axeOptions.runOnly = options.runOnly;
    }

    if (options.context) {
      axeOptions.include = options.context.include;
      axeOptions.exclude = options.context.exclude;
    }

    return axeOptions;
  }

  /**
   * Create check result
   */
  private createCheckResult(
    page: Page,
    violations: AccessibilityViolation[],
  ): AccessibilityCheckResult {
    const result: AccessibilityCheckResult = {
      url: page.url(),
      timestamp: new Date().toISOString(),
      violations,
      passes: 0,
      incomplete: 0,
      inapplicable: 0,
      summary: {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      },
    };

    // Count violations by impact
    violations.forEach((violation) => {
      result.summary[violation.impact]++;
    });

    return result;
  }

  /**
   * Check specific element
   */
  public async checkElement(
    page: Page,
    selector: string,
    options: AccessibilityCheckOptions = {},
  ): Promise<AccessibilityCheckResult> {
    try {
      const elementOptions = {
        ...options,
        context: { include: [selector] },
      };
      return await this.check(page, elementOptions);
    } catch (error) {
      logger.logError('Failed to check element accessibility', error);
      throw error;
    }
  }

  /**
   * Check multiple elements
   */
  public async checkElements(
    page: Page,
    selectors: string[],
    options: AccessibilityCheckOptions = {},
  ): Promise<AccessibilityCheckResult[]> {
    const results: AccessibilityCheckResult[] = [];
    for (const selector of selectors) {
      try {
        const result = await this.checkElement(page, selector, options);
        results.push(result);
      } catch (error) {
        logger.logError('Failed to check element accessibility', error);
      }
    }
    return results;
  }

  /**
   * Check against WCAG guidelines
   */
  public async checkWCAG(
    page: Page,
    level: 'A' | 'AA' | 'AAA' = 'AA',
  ): Promise<AccessibilityCheckResult> {
    const options: AccessibilityCheckOptions = {
      runOnly: {
        type: 'tag',
        values: [`wcag${level.toLowerCase()}`],
      },
    };

    return await this.check(page, options);
  }

  /**
   * Check against section 508 guidelines
   */
  public async checkSection508(page: Page): Promise<AccessibilityCheckResult> {
    const options: AccessibilityCheckOptions = {
      runOnly: {
        type: 'tag',
        values: ['section508'],
      },
    };

    return await this.check(page, options);
  }
}
