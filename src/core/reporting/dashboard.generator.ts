import { writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../logger';
import { TestRunMetrics } from './metrics.collector';

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  title?: string;
  theme?: 'light' | 'dark';
  refreshInterval?: number;
  showCharts?: boolean;
  showTables?: boolean;
  showErrors?: boolean;
}

/**
 * Dashboard generator class
 */
export class DashboardGenerator {
  private static instance: DashboardGenerator;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DashboardGenerator {
    if (!DashboardGenerator.instance) {
      DashboardGenerator.instance = new DashboardGenerator();
    }
    return DashboardGenerator.instance;
  }

  /**
   * Generate dashboard
   */
  public generateDashboard(
    metrics: TestRunMetrics,
    outputDir: string,
    config: DashboardConfig = {},
  ): string {
    try {
      const dashboardPath = join(outputDir, 'dashboard.html');
      const html = this.generateHtml(metrics, config);
      writeFileSync(dashboardPath, html);
      logger.info('Dashboard generated successfully', { dashboardPath });
      return dashboardPath;
    } catch (error) {
      logger.logError('Failed to generate dashboard', error);
      throw error;
    }
  }

  /**
   * Generate HTML content
   */
  private generateHtml(metrics: TestRunMetrics, config: DashboardConfig): string {
    const { title = 'Test Automation Dashboard', theme = 'light' } = config;

    return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <style>
    ${this.getStyles(theme)}
  </style>
</head>
<body class="theme-${theme}">
  <div class="dashboard">
    <header>
      <h1>${title}</h1>
      <div class="timestamp">Last Updated: ${new Date().toLocaleString()}</div>
    </header>

    <div class="metrics-grid">
      ${this.generateTestMetricsSection(metrics)}
      ${this.generatePerformanceMetricsSection(metrics)}
      ${this.generateNetworkMetricsSection(metrics)}
      ${this.generateErrorMetricsSection(metrics)}
    </div>

    ${config.showCharts ? this.generateCharts(metrics) : ''}
    ${config.showTables ? this.generateTables(metrics) : ''}
    ${config.showErrors ? this.generateErrorDetails(metrics) : ''}
  </div>

  <script>
    ${this.getScripts(config)}
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate test metrics section
   */
  private generateTestMetricsSection(metrics: TestRunMetrics): string {
    const { test } = metrics;
    const passRate = ((test.passed / test.total) * 100).toFixed(2);

    return `
<section class="metrics-card test-metrics">
  <h2>Test Results</h2>
  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-value">${test.total}</div>
      <div class="metric-label">Total Tests</div>
    </div>
    <div class="metric passed">
      <div class="metric-value">${test.passed}</div>
      <div class="metric-label">Passed</div>
    </div>
    <div class="metric failed">
      <div class="metric-value">${test.failed}</div>
      <div class="metric-label">Failed</div>
    </div>
    <div class="metric skipped">
      <div class="metric-value">${test.skipped}</div>
      <div class="metric-label">Skipped</div>
    </div>
    <div class="metric">
      <div class="metric-value">${passRate}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
    <div class="metric">
      <div class="metric-value">${(test.duration / 1000).toFixed(2)}s</div>
      <div class="metric-label">Duration</div>
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Generate performance metrics section
   */
  private generatePerformanceMetricsSection(metrics: TestRunMetrics): string {
    const { performance } = metrics;

    return `
<section class="metrics-card performance-metrics">
  <h2>Performance Metrics</h2>
  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-value">${performance.loadTime.avg.toFixed(2)}ms</div>
      <div class="metric-label">Avg Load Time</div>
    </div>
    <div class="metric">
      <div class="metric-value">${performance.firstPaint.avg.toFixed(2)}ms</div>
      <div class="metric-label">Avg First Paint</div>
    </div>
    <div class="metric">
      <div class="metric-value">${performance.domContentLoaded.avg.toFixed(2)}ms</div>
      <div class="metric-label">Avg DOM Content</div>
    </div>
    <div class="metric">
      <div class="metric-value">${performance.loadTime.p90.toFixed(2)}ms</div>
      <div class="metric-label">P90 Load Time</div>
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Generate network metrics section
   */
  private generateNetworkMetricsSection(metrics: TestRunMetrics): string {
    const { network } = metrics;
    const failureRate = ((network.failedRequests / network.requests) * 100).toFixed(2);

    return `
<section class="metrics-card network-metrics">
  <h2>Network Metrics</h2>
  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-value">${network.requests}</div>
      <div class="metric-label">Total Requests</div>
    </div>
    <div class="metric">
      <div class="metric-value">${network.failedRequests}</div>
      <div class="metric-label">Failed Requests</div>
    </div>
    <div class="metric">
      <div class="metric-value">${failureRate}%</div>
      <div class="metric-label">Failure Rate</div>
    </div>
    <div class="metric">
      <div class="metric-value">${(network.totalBytes / 1024 / 1024).toFixed(2)}MB</div>
      <div class="metric-label">Total Data</div>
    </div>
    <div class="metric">
      <div class="metric-value">${network.avgResponseTime.toFixed(2)}ms</div>
      <div class="metric-label">Avg Response Time</div>
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Generate error metrics section
   */
  private generateErrorMetricsSection(metrics: TestRunMetrics): string {
    const { error } = metrics;

    return `
<section class="metrics-card error-metrics">
  <h2>Error Metrics</h2>
  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-value">${error.totalErrors}</div>
      <div class="metric-label">Total Errors</div>
    </div>
    <div class="metric">
      <div class="metric-value">${error.uniqueErrors}</div>
      <div class="metric-label">Unique Errors</div>
    </div>
  </div>
  <div class="top-errors">
    <h3>Top Errors</h3>
    <ul>
      ${error.topErrors
        .map(
          (err) => `
        <li>
          <div class="error-message">${err.message}</div>
          <div class="error-count">Count: ${err.count}</div>
        </li>
      `,
        )
        .join('')}
    </ul>
  </div>
</section>
    `.trim();
  }

  /**
   * Generate charts
   */
  private generateCharts(metrics: TestRunMetrics): string {
    return `
<section class="charts-section">
  <div class="chart-container">
    <div id="testResultsChart"></div>
  </div>
  <div class="chart-container">
    <div id="performanceChart"></div>
  </div>
  <div class="chart-container">
    <div id="networkChart"></div>
  </div>
</section>
    `.trim();
  }

  /**
   * Generate tables
   */
  private generateTables(metrics: TestRunMetrics): string {
    return `
<section class="tables-section">
  <div class="table-container">
    <h3>Performance Details</h3>
    <table>
      <tr>
        <th>Metric</th>
        <th>Average</th>
        <th>Min</th>
        <th>Max</th>
        <th>P90</th>
      </tr>
      <tr>
        <td>Load Time</td>
        <td>${metrics.performance.loadTime.avg.toFixed(2)}ms</td>
        <td>${metrics.performance.loadTime.min.toFixed(2)}ms</td>
        <td>${metrics.performance.loadTime.max.toFixed(2)}ms</td>
        <td>${metrics.performance.loadTime.p90.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>First Paint</td>
        <td>${metrics.performance.firstPaint.avg.toFixed(2)}ms</td>
        <td>${metrics.performance.firstPaint.min.toFixed(2)}ms</td>
        <td>${metrics.performance.firstPaint.max.toFixed(2)}ms</td>
        <td>${metrics.performance.firstPaint.p90.toFixed(2)}ms</td>
      </tr>
    </table>
  </div>
</section>
    `.trim();
  }

  /**
   * Generate error details
   */
  private generateErrorDetails(metrics: TestRunMetrics): string {
    return `
<section class="error-details">
  <h3>Error Details</h3>
  <div class="error-list">
    ${metrics.error.topErrors
      .map(
        (error) => `
      <div class="error-item">
        <div class="error-header">
          <span class="error-count">${error.count}</span>
          <span class="error-message">${error.message}</span>
        </div>
        <div class="error-locations">
          ${error.locations.map((loc) => `<div class="location">${loc}</div>`).join('')}
        </div>
      </div>
    `,
      )
      .join('')}
  </div>
</section>
    `.trim();
  }

  /**
   * Get CSS styles
   */
  private getStyles(theme: string): string {
    return `
:root {
  ${theme === 'dark' ? this.getDarkTheme() : this.getLightTheme()}
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  margin: 0;
  padding: 20px;
  background: var(--background);
  color: var(--text);
}

.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

header {
  margin-bottom: 30px;
  text-align: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metrics-card {
  background: var(--card-background);
  padding: 20px;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
}

.metric {
  text-align: center;
  padding: 15px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.passed { color: var(--success); }
.failed { color: var(--error); }
.skipped { color: var(--warning); }

.chart-container {
  background: var(--card-background);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: var(--card-shadow);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  background: var(--table-header);
  font-weight: 600;
}

.error-item {
  background: var(--card-background);
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 4px;
  border-left: 4px solid var(--error);
}

.error-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.error-count {
  background: var(--error);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  margin-right: 10px;
  font-size: 14px;
}

.error-locations {
  font-size: 14px;
  color: var(--text-secondary);
  margin-left: 20px;
}

.location {
  margin: 5px 0;
}
    `.trim();
  }

  /**
   * Get light theme colors
   */
  private getLightTheme(): string {
    return `
  --background: #f5f5f5;
  --card-background: #ffffff;
  --text: #333333;
  --text-secondary: #666666;
  --border: #e0e0e0;
  --success: #28a745;
  --warning: #ffc107;
  --error: #dc3545;
  --info: #17a2b8;
  --card-shadow: 0 2px 4px rgba(0,0,0,0.1);
  --table-header: #f8f9fa;
    `.trim();
  }

  /**
   * Get dark theme colors
   */
  private getDarkTheme(): string {
    return `
  --background: #1a1a1a;
  --card-background: #2d2d2d;
  --text: #ffffff;
  --text-secondary: #a0a0a0;
  --border: #404040;
  --success: #2ecc71;
  --warning: #f1c40f;
  --error: #e74c3c;
  --info: #3498db;
  --card-shadow: 0 2px 4px rgba(0,0,0,0.2);
  --table-header: #363636;
    `.trim();
  }

  /**
   * Get JavaScript for charts
   */
  private getScripts(config: DashboardConfig): string {
    if (!config.showCharts) return '';

    return `
document.addEventListener('DOMContentLoaded', function() {
  // Add chart initialization code here using Plotly
});

${
  config.refreshInterval
    ? `
setInterval(function() {
  window.location.reload();
}, ${config.refreshInterval * 1000});
`
    : ''
}
    `.trim();
  }
}
