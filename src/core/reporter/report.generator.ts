import fs from 'fs';
import path from 'path';
import logger from '../logger';
import { EnhancedTestResult, TestRunStats, TestSuiteResult } from './reporter.types';

/**
 * Report generator for creating HTML test reports
 */
export class ReportGenerator {
  private readonly outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Generate HTML report from test results
   */
  public generateReport(stats: TestRunStats, suites: TestSuiteResult[]): string {
    const reportPath = path.join(this.outputDir, 'test-report.html');
    const html = this.generateHtml(stats, suites);

    fs.writeFileSync(reportPath, html);
    logger.info(`HTML report generated at: ${reportPath}`);

    return reportPath;
  }

  /**
   * Generate HTML content
   */
  private generateHtml(stats: TestRunStats, suites: TestSuiteResult[]): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Execution Report</title>
          <style>
            ${this.getStyles()}
          </style>
        </head>
        <body>
          ${this.generateSummarySection(stats)}
          ${this.generateSuitesSection(suites)}
          <script>
            ${this.getScripts()}
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Generate summary section
   */
  private generateSummarySection(stats: TestRunStats): string {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(2);
    const duration = (stats.duration / 1000).toFixed(2);

    return `
      <div class="summary">
        <h1>Test Execution Summary</h1>
        <div class="stats">
          <div class="stat-item">
            <span class="label">Total Tests:</span>
            <span class="value">${stats.total}</span>
          </div>
          <div class="stat-item passed">
            <span class="label">Passed:</span>
            <span class="value">${stats.passed}</span>
          </div>
          <div class="stat-item failed">
            <span class="label">Failed:</span>
            <span class="value">${stats.failed}</span>
          </div>
          <div class="stat-item skipped">
            <span class="label">Skipped:</span>
            <span class="value">${stats.skipped}</span>
          </div>
          <div class="stat-item">
            <span class="label">Pass Rate:</span>
            <span class="value">${passRate}%</span>
          </div>
          <div class="stat-item">
            <span class="label">Duration:</span>
            <span class="value">${duration}s</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate test suites section
   */
  private generateSuitesSection(suites: TestSuiteResult[]): string {
    return `
      <div class="suites">
        <h2>Test Suites</h2>
        ${suites.map((suite) => this.generateSuiteSection(suite)).join('')}
      </div>
    `;
  }

  /**
   * Generate individual suite section
   */
  private generateSuiteSection(suite: TestSuiteResult): string {
    return `
      <div class="suite">
        <div class="suite-header ${suite.status}">
          <h3>${suite.name}</h3>
          <span class="duration">Duration: ${(suite.duration / 1000).toFixed(2)}s</span>
        </div>
        <div class="tests">
          ${suite.tests.map((test) => this.generateTestSection(test)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate individual test section
   */
  private generateTestSection(test: EnhancedTestResult): string {
    return `
      <div class="test ${test.status}">
        <div class="test-header">
          <h4>${test.testName || 'Unnamed Test'}</h4>
          <span class="duration">Duration: ${(test.duration / 1000).toFixed(2)}s</span>
        </div>
        ${test.error ? this.generateErrorSection(test.error) : ''}
        ${test.screenshot ? this.generateScreenshotSection(test.screenshot) : ''}
      </div>
    `;
  }

  /**
   * Generate error section
   */
  private generateErrorSection(error: Error): string {
    return `
      <div class="error">
        <pre>${error.message}\n${error.stack}</pre>
      </div>
    `;
  }

  /**
   * Generate screenshot section
   */
  private generateScreenshotSection(screenshotPath: string): string {
    return `
      <div class="screenshot">
        <img src="${screenshotPath}" alt="Test failure screenshot" />
      </div>
    `;
  }

  /**
   * Get CSS styles
   */
  private getStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
      }

      .summary {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }

      .stat-item {
        padding: 15px;
        border-radius: 6px;
        background: #f8f9fa;
      }

      .passed { color: #28a745; }
      .failed { color: #dc3545; }
      .skipped { color: #ffc107; }

      .suite {
        background: white;
        margin-bottom: 20px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .suite-header {
        padding: 15px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
      }

      .test {
        padding: 15px 20px;
        border-bottom: 1px solid #dee2e6;
      }

      .error {
        background: #fff5f5;
        padding: 15px;
        margin-top: 10px;
        border-radius: 4px;
        overflow-x: auto;
      }

      .screenshot {
        margin-top: 15px;
      }

      .screenshot img {
        max-width: 100%;
        border: 1px solid #dee2e6;
        border-radius: 4px;
      }
    `;
  }

  /**
   * Get JavaScript for interactivity
   */
  private getScripts(): string {
    return `
      document.addEventListener('DOMContentLoaded', () => {
        // Add any interactive features here
      });
    `;
  }
}
