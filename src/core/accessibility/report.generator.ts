import { writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../logger';
import { AccessibilityCheckResult, AccessibilityViolation } from './checker';

/**
 * Report format options
 */
export interface ReportFormatOptions {
  includeScreenshots?: boolean;
  includeHelpUrls?: boolean;
  includeHtml?: boolean;
  groupByImpact?: boolean;
}

/**
 * Accessibility report generator class
 */
export class AccessibilityReportGenerator {
  private static instance: AccessibilityReportGenerator;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AccessibilityReportGenerator {
    if (!AccessibilityReportGenerator.instance) {
      AccessibilityReportGenerator.instance = new AccessibilityReportGenerator();
    }
    return AccessibilityReportGenerator.instance;
  }

  /**
   * Generate HTML report
   */
  public generateReport(
    results: AccessibilityCheckResult[],
    outputDir: string,
    options: ReportFormatOptions = {},
  ): string {
    try {
      const reportPath = join(outputDir, `accessibility-report-${Date.now()}.html`);
      const html = this.generateHtmlReport(results, options);
      writeFileSync(reportPath, html);
      logger.info('Accessibility report generated', { reportPath });
      return reportPath;
    } catch (error) {
      logger.logError('Failed to generate accessibility report', error);
      throw error;
    }
  }

  /**
   * Generate HTML report content
   */
  private generateHtmlReport(
    results: AccessibilityCheckResult[],
    options: ReportFormatOptions,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Accessibility Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2, h3 { color: #333; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .impact-critical { color: #d9534f; }
    .impact-serious { color: #f0ad4e; }
    .impact-moderate { color: #5bc0de; }
    .impact-minor { color: #5cb85c; }
    .violation { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
    .violation-header { margin-bottom: 10px; }
    .violation-details { margin-left: 20px; }
    .help-url { color: #337ab7; text-decoration: none; }
    .help-url:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; }
    code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Accessibility Test Report</h1>

  ${this.generateSummarySection(results)}

  ${this.generateViolationsSection(results, options)}
</body>
</html>
    `.trim();
  }

  /**
   * Generate summary section
   */
  private generateSummarySection(results: AccessibilityCheckResult[]): string {
    const totalSummary = this.calculateTotalSummary(results);

    return `
<div class="summary">
  <h2>Summary</h2>
  <p>Total Pages Tested: ${results.length}</p>
  <p>Total Violations: ${this.calculateTotalViolations(results)}</p>
  <div>
    <p class="impact-critical">Critical Issues: ${totalSummary.critical}</p>
    <p class="impact-serious">Serious Issues: ${totalSummary.serious}</p>
    <p class="impact-moderate">Moderate Issues: ${totalSummary.moderate}</p>
    <p class="impact-minor">Minor Issues: ${totalSummary.minor}</p>
  </div>
</div>
    `.trim();
  }

  /**
   * Generate violations section
   */
  private generateViolationsSection(
    results: AccessibilityCheckResult[],
    options: ReportFormatOptions,
  ): string {
    if (options.groupByImpact) {
      return this.generateViolationsByImpact(results, options);
    }
    return this.generateViolationsByPage(results, options);
  }

  /**
   * Generate violations grouped by impact
   */
  private generateViolationsByImpact(
    results: AccessibilityCheckResult[],
    options: ReportFormatOptions,
  ): string {
    const violationsByImpact = this.groupViolationsByImpact(results);

    return Object.entries(violationsByImpact)
      .map(
        ([impact, violations]) => `
<div class="violations-group">
  <h2 class="impact-${impact.toLowerCase()}">${impact} Impact Violations</h2>
  ${violations.map((v) => this.generateViolationCard(v, options)).join('')}
</div>
      `,
      )
      .join('');
  }

  /**
   * Generate violations grouped by page
   */
  private generateViolationsByPage(
    results: AccessibilityCheckResult[],
    options: ReportFormatOptions,
  ): string {
    return results
      .map(
        (result) => `
<div class="page-section">
  <h2>Page: ${result.url}</h2>
  <p>Timestamp: ${result.timestamp}</p>
  ${result.violations.map((v) => this.generateViolationCard(v, options)).join('')}
</div>
      `,
      )
      .join('');
  }

  /**
   * Generate violation card
   */
  private generateViolationCard(
    violation: AccessibilityViolation,
    options: ReportFormatOptions,
  ): string {
    return `
<div class="violation">
  <div class="violation-header">
    <h3 class="impact-${violation.impact}">${violation.id}: ${violation.description}</h3>
    <p>Impact: ${violation.impact}</p>
    ${options.includeHelpUrls ? `<p><a href="${violation.helpUrl}" class="help-url" target="_blank">Learn More</a></p>` : ''}
  </div>
  <div class="violation-details">
    <p>${violation.help}</p>
    ${this.generateViolationNodes(violation, options)}
  </div>
</div>
    `.trim();
  }

  /**
   * Generate violation nodes
   */
  private generateViolationNodes(
    violation: AccessibilityViolation,
    options: ReportFormatOptions,
  ): string {
    return `
<div class="violation-nodes">
  <h4>Affected Elements (${violation.nodes.length})</h4>
  <table>
    <tr>
      <th>Element</th>
      <th>Issue</th>
      ${options.includeHtml ? '<th>HTML</th>' : ''}
    </tr>
    ${violation.nodes
      .map(
        (node) => `
    <tr>
      <td><code>${node.target.join(' ')}</code></td>
      <td>${node.failureSummary}</td>
      ${options.includeHtml ? `<td><code>${this.escapeHtml(node.html)}</code></td>` : ''}
    </tr>
    `,
      )
      .join('')}
  </table>
</div>
    `.trim();
  }

  /**
   * Calculate total violations
   */
  private calculateTotalViolations(results: AccessibilityCheckResult[]): number {
    return results.reduce((total, result) => total + result.violations.length, 0);
  }

  /**
   * Calculate total summary
   */
  private calculateTotalSummary(results: AccessibilityCheckResult[]): {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  } {
    return results.reduce(
      (total, result) => ({
        critical: total.critical + result.summary.critical,
        serious: total.serious + result.summary.serious,
        moderate: total.moderate + result.summary.moderate,
        minor: total.minor + result.summary.minor,
      }),
      { critical: 0, serious: 0, moderate: 0, minor: 0 },
    );
  }

  /**
   * Group violations by impact
   */
  private groupViolationsByImpact(
    results: AccessibilityCheckResult[],
  ): Record<string, AccessibilityViolation[]> {
    const groups: Record<string, AccessibilityViolation[]> = {
      Critical: [],
      Serious: [],
      Moderate: [],
      Minor: [],
    };

    results.forEach((result) => {
      result.violations.forEach((violation) => {
        const impact = violation.impact.charAt(0).toUpperCase() + violation.impact.slice(1);
        groups[impact].push(violation);
      });
    });

    return groups;
  }

  /**
   * Escape HTML
   */
  private escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
