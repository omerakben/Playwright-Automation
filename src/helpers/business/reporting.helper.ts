import { Page } from '@playwright/test';
import { logger } from '../../core/logger';
import { ReportFormat, ReportType } from '../types/business.types';

/**
 * Business reporting helper
 */
export class ReportingHelper {
  constructor(private page: Page) {}

  /**
   * Generate business report
   */
  async generateReport(
    type: ReportType,
    options: {
      startDate: string;
      endDate: string;
      format: ReportFormat;
      filters?: Record<string, any>;
    },
  ): Promise<string> {
    try {
      // Navigate to reports
      await this.page.click('[data-testid="reports-menu"]');

      // Select report type
      await this.page.selectOption('[data-testid="report-type"]', type);

      // Set date range
      await this.page.fill('[data-testid="start-date"]', options.startDate);
      await this.page.fill('[data-testid="end-date"]', options.endDate);

      // Apply filters
      if (options.filters) {
        await this.applyReportFilters(options.filters);
      }

      // Select format
      await this.page.selectOption('[data-testid="report-format"]', options.format);

      // Generate report
      await this.page.click('[data-testid="generate-report"]');

      // Wait for and get report URL
      const reportUrl = await this.waitForReportGeneration();

      logger.info(`Generated ${type} report`, { format: options.format });
      return reportUrl;
    } catch (error) {
      logger.logError(`Failed to generate ${type} report`, error);
      throw error;
    }
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(
    type: ReportType,
    options: {
      schedule: string;
      recipients: string[];
      format: ReportFormat;
      filters?: Record<string, any>;
    },
  ): Promise<string> {
    try {
      // Navigate to report scheduling
      await this.page.click('[data-testid="reports-menu"]');
      await this.page.click('[data-testid="schedule-report"]');

      // Set report details
      await this.page.selectOption('[data-testid="report-type"]', type);
      await this.page.fill('[data-testid="schedule-cron"]', options.schedule);

      // Add recipients
      for (const recipient of options.recipients) {
        await this.page.click('[data-testid="add-recipient"]');
        await this.page.fill('[data-testid="recipient-email"]', recipient);
      }

      // Set format and filters
      await this.page.selectOption('[data-testid="report-format"]', options.format);
      if (options.filters) {
        await this.applyReportFilters(options.filters);
      }

      // Save schedule
      await this.page.click('[data-testid="save-schedule"]');

      // Get schedule ID
      const scheduleId = await this.getScheduleId();

      logger.info(`Scheduled ${type} report`, { scheduleId });
      return scheduleId;
    } catch (error) {
      logger.logError(`Failed to schedule ${type} report`, error);
      throw error;
    }
  }

  /**
   * Download report
   */
  async downloadReport(reportId: string): Promise<string> {
    try {
      // Navigate to report
      await this.page.goto(`/reports/${reportId}`);

      // Click download
      const [download] = await Promise.all([
        this.page.waitForEvent('download'),
        this.page.click('[data-testid="download-report"]'),
      ]);

      // Save file
      const path = await download.path();
      if (!path) throw new Error('Download failed');

      logger.info(`Downloaded report ${reportId}`, { path });
      return path;
    } catch (error) {
      logger.logError(`Failed to download report ${reportId}`, error);
      throw error;
    }
  }

  /**
   * Get report history
   */
  async getReportHistory(type: ReportType): Promise<any[]> {
    try {
      // Navigate to report history
      await this.page.click('[data-testid="reports-menu"]');
      await this.page.click('[data-testid="report-history"]');

      // Filter by type
      await this.page.selectOption('[data-testid="filter-type"]', type);

      // Extract history
      const history = await this.extractReportHistory();

      logger.info(`Retrieved ${type} report history`, { count: history.length });
      return history;
    } catch (error) {
      logger.logError(`Failed to get ${type} report history`, error);
      throw error;
    }
  }

  /**
   * Apply report filters
   */
  private async applyReportFilters(filters: Record<string, any>): Promise<void> {
    // Open filters panel
    await this.page.click('[data-testid="show-filters"]');

    // Apply each filter
    for (const [key, value] of Object.entries(filters)) {
      await this.page.fill(`[data-testid="filter-${key}"]`, value.toString());
    }

    // Apply filters
    await this.page.click('[data-testid="apply-filters"]');
  }

  /**
   * Wait for report generation
   */
  private async waitForReportGeneration(): Promise<string> {
    // Wait for progress indicator to disappear
    await this.page.waitForSelector('[data-testid="report-progress"]', { state: 'hidden' });

    // Get report URL
    const downloadLink = this.page.locator('[data-testid="report-download"]');
    await downloadLink.waitFor({ state: 'visible' });
    return downloadLink.getAttribute('href') || '';
  }

  /**
   * Get schedule ID
   */
  private async getScheduleId(): Promise<string> {
    await this.page.waitForURL(/\/reports\/schedules\/(\d+)$/);
    const url = this.page.url();
    return url.split('/').pop() || '';
  }

  /**
   * Extract report history
   */
  private async extractReportHistory(): Promise<any[]> {
    const history: any[] = [];
    const rows = await this.page.locator('[data-testid="history-row"]').all();

    for (const row of rows) {
      history.push({
        id: await row.getAttribute('data-report-id'),
        type: await row.getAttribute('data-report-type'),
        format: await row.getAttribute('data-format'),
        generatedAt: await row.getAttribute('data-generated'),
        status: await row.getAttribute('data-status'),
        url: await row.locator('[data-testid="report-url"]').getAttribute('href'),
      });
    }

    return history;
  }
}
