import accessibility from '../../src/core/accessibility';
import logger from '../../src/core/logger';
import { test as baseTest } from './base.fixture';

/**
 * Accessibility test info interface
 */
export interface AccessibilityTestInfo {
  checker: typeof accessibility.AccessibilityChecker;
  reportGenerator: typeof accessibility.AccessibilityReportGenerator;
  a11yUtils: {
    checkAccessibility: (selector?: string) => Promise<any>;
    checkWCAG: (level?: 'A' | 'AA' | 'AAA') => Promise<any>;
    checkSection508: () => Promise<any>;
    generateReport: (results: any[], outputDir: string) => Promise<string>;
  };
}

/**
 * Accessibility test fixture
 */
export const test = baseTest.extend<AccessibilityTestInfo>({
  // Make accessibility checker available in all tests
  checker: async ({}, use) => {
    await use(accessibility.AccessibilityChecker);
  },

  // Make report generator available in all tests
  reportGenerator: async ({}, use) => {
    await use(accessibility.AccessibilityReportGenerator);
  },

  // Make accessibility utilities available in all tests
  a11yUtils: async ({ page, checker, reportGenerator }, use) => {
    if (!page) return;

    await use({
      /**
       * Check accessibility for element or page
       */
      checkAccessibility: async (selector?: string) => {
        try {
          if (selector) {
            return await checker.checkElement(page, selector);
          }
          return await checker.check(page);
        } catch (error) {
          logger.logError('Failed to check accessibility', error);
          throw error;
        }
      },

      /**
       * Check WCAG compliance
       */
      checkWCAG: async (level: 'A' | 'AA' | 'AAA' = 'AA') => {
        try {
          return await checker.checkWCAG(page, level);
        } catch (error) {
          logger.logError('Failed to check WCAG compliance', error);
          throw error;
        }
      },

      /**
       * Check Section 508 compliance
       */
      checkSection508: async () => {
        try {
          return await checker.checkSection508(page);
        } catch (error) {
          logger.logError('Failed to check Section 508 compliance', error);
          throw error;
        }
      },

      /**
       * Generate accessibility report
       */
      generateReport: async (results: any[], outputDir: string) => {
        try {
          return reportGenerator.generateReport(results, outputDir, {
            includeScreenshots: true,
            includeHelpUrls: true,
            includeHtml: true,
            groupByImpact: true,
          });
        } catch (error) {
          logger.logError('Failed to generate accessibility report', error);
          throw error;
        }
      },
    });
  },
});

/**
 * Accessibility test utilities
 */
export const a11yUtils = {
  /**
   * Get violation summary
   */
  getViolationSummary: (violations: any[]): Record<string, number> => {
    return violations.reduce((summary: Record<string, number>, violation) => {
      const impact = violation.impact || 'minor';
      summary[impact] = (summary[impact] || 0) + 1;
      return summary;
    }, {});
  },

  /**
   * Get violations by impact
   */
  getViolationsByImpact: (violations: any[]): Record<string, any[]> => {
    return violations.reduce((groups: Record<string, any[]>, violation) => {
      const impact = violation.impact || 'minor';
      if (!groups[impact]) {
        groups[impact] = [];
      }
      groups[impact].push(violation);
      return groups;
    }, {});
  },

  /**
   * Filter violations
   */
  filterViolations: (
    violations: any[],
    options: {
      minImpact?: 'minor' | 'moderate' | 'serious' | 'critical';
      rules?: string[];
      excludeRules?: string[];
    },
  ): any[] => {
    const impactLevels = ['minor', 'moderate', 'serious', 'critical'];
    const minImpactIndex = options.minImpact ? impactLevels.indexOf(options.minImpact) : 0;

    return violations.filter((violation) => {
      const impactIndex = impactLevels.indexOf(violation.impact || 'minor');
      const matchesImpact = impactIndex >= minImpactIndex;

      const matchesRule = !options.rules || options.rules.includes(violation.id);
      const notExcluded = !options.excludeRules || !options.excludeRules.includes(violation.id);

      return matchesImpact && matchesRule && notExcluded;
    });
  },
};
