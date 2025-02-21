import logger from '../../src/core/logger';
import security from '../../src/core/security';
import { ZAPConfig } from '../../src/core/security/zap.client';
import { test as baseTest } from './base.fixture';

/**
 * Security test info interface
 */
export interface SecurityTestInfo {
  securityScanner: ReturnType<typeof security.createSecurityTesting>['SecurityScanner'];
  vulnerabilityAnalyzer: ReturnType<typeof security.createSecurityTesting>['VulnerabilityAnalyzer'];
  securityUtils: {
    runSecurityScan: (target: string, options?: any) => Promise<any>;
    analyzeVulnerabilities: (scanResult: any, options?: any) => Promise<any>;
    generateReport: (report: any, outputDir: string) => Promise<string>;
  };
}

/**
 * Security test fixture
 */
export const test = baseTest.extend<SecurityTestInfo>({
  // Make security scanner available in all tests
  securityScanner: async ({}, use) => {
    const zapConfig: ZAPConfig = {
      apiKey: process.env.ZAP_API_KEY || '',
      proxyUrl: process.env.ZAP_PROXY_URL || 'http://localhost:8080',
      apiUrl: process.env.ZAP_API_URL || 'http://localhost:8080/JSON',
    };

    const { SecurityScanner } = security.createSecurityTesting(zapConfig);
    await use(SecurityScanner);
  },

  // Make vulnerability analyzer available in all tests
  vulnerabilityAnalyzer: async ({}, use) => {
    const zapConfig: ZAPConfig = {
      apiKey: process.env.ZAP_API_KEY || '',
      proxyUrl: process.env.ZAP_PROXY_URL || 'http://localhost:8080',
      apiUrl: process.env.ZAP_API_URL || 'http://localhost:8080/JSON',
    };

    const { VulnerabilityAnalyzer } = security.createSecurityTesting(zapConfig);
    await use(VulnerabilityAnalyzer);
  },

  // Make security utilities available in all tests
  securityUtils: async ({ securityScanner, vulnerabilityAnalyzer }, use) => {
    await use({
      /**
       * Run security scan
       */
      runSecurityScan: async (target: string, options?: any) => {
        try {
          const config = {
            target,
            outputDir: options?.outputDir || 'test-results/security',
            contextFile: options?.contextFile,
            spiderScan: options?.spiderScan ?? true,
            activeScan: options?.activeScan ?? true,
            maxDuration: options?.maxDuration || 3600000,
            recurse: options?.recurse ?? true,
            inScopeOnly: options?.inScopeOnly ?? true,
            alertThreshold: options?.alertThreshold || {
              high: 0,
              medium: 5,
              low: 10,
            },
          };

          return await securityScanner.runScan(config);
        } catch (error) {
          logger.logError('Failed to run security scan', error);
          throw error;
        }
      },

      /**
       * Analyze vulnerabilities
       */
      analyzeVulnerabilities: async (scanResult: any, options?: any) => {
        try {
          return vulnerabilityAnalyzer.analyzeScanResult(scanResult, {
            includeEvidence: options?.includeEvidence ?? true,
            includeSolution: options?.includeSolution ?? true,
            includeReference: options?.includeReference ?? true,
            groupByRisk: options?.groupByRisk ?? true,
            ...options,
          });
        } catch (error) {
          logger.logError('Failed to analyze vulnerabilities', error);
          throw error;
        }
      },

      /**
       * Generate security report
       */
      generateReport: async (report: any, outputDir: string) => {
        try {
          return vulnerabilityAnalyzer.generateReport(report, outputDir);
        } catch (error) {
          logger.logError('Failed to generate security report', error);
          throw error;
        }
      },
    });
  },
});

/**
 * Security test utilities
 */
export const securityUtils = {
  /**
   * Calculate risk score
   */
  calculateRiskScore: (vulnerabilities: any[]): number => {
    const weights = {
      high: 10,
      medium: 5,
      low: 1,
      info: 0,
    };

    return vulnerabilities.reduce((score, vuln) => {
      const weight = weights[vuln.risk.toLowerCase() as keyof typeof weights] || 0;
      return score + weight;
    }, 0);
  },

  /**
   * Group vulnerabilities by risk
   */
  groupByRisk: (vulnerabilities: any[]): Record<string, any[]> => {
    return vulnerabilities.reduce((groups, vuln) => {
      const risk = vuln.risk.toLowerCase();
      if (!groups[risk]) {
        groups[risk] = [];
      }
      groups[risk].push(vuln);
      return groups;
    }, {});
  },

  /**
   * Filter vulnerabilities
   */
  filterVulnerabilities: (
    vulnerabilities: any[],
    options: {
      minRisk?: string;
      maxRisk?: string;
      categories?: string[];
      excludeCategories?: string[];
    },
  ): any[] => {
    const riskLevels = ['info', 'low', 'medium', 'high'];
    const minRiskIndex = options.minRisk ? riskLevels.indexOf(options.minRisk.toLowerCase()) : 0;
    const maxRiskIndex = options.maxRisk
      ? riskLevels.indexOf(options.maxRisk.toLowerCase())
      : riskLevels.length - 1;

    return vulnerabilities.filter((vuln) => {
      const riskIndex = riskLevels.indexOf(vuln.risk.toLowerCase());
      const matchesRiskLevel = riskIndex >= minRiskIndex && riskIndex <= maxRiskIndex;

      const matchesCategory = !options.categories || options.categories.includes(vuln.category);
      const notExcluded =
        !options.excludeCategories || !options.excludeCategories.includes(vuln.category);

      return matchesRiskLevel && matchesCategory && notExcluded;
    });
  },
};
