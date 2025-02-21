import { faker } from '@faker-js/faker';
import { AuthHelper } from '../../src/helpers/business/auth.helper';
import { ReportingHelper } from '../../src/helpers/business/reporting.helper';
import { ReportFormat, ReportType, UserRole } from '../../src/helpers/types/business.types';
import { test } from '../fixtures/e2e.fixture';

test.describe('Business Reporting', () => {
  let authHelper: AuthHelper;
  let reportingHelper: ReportingHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    reportingHelper = new ReportingHelper(page);

    // Login as admin
    await authHelper.loginAs(UserRole.ADMIN);
  });

  test('should generate workflow summary report', async () => {
    const startDate = faker.date.past().toISOString().split('T')[0];
    const endDate = faker.date.recent().toISOString().split('T')[0];

    // Generate report
    const reportUrl = await reportingHelper.generateReport(ReportType.WORKFLOW_SUMMARY, {
      startDate,
      endDate,
      format: ReportFormat.PDF,
      filters: {
        status: 'COMPLETED',
        department: 'Sales',
      },
    });

    // Verify report URL
    expect(reportUrl).toContain('/reports/download');
  });

  test('should schedule recurring performance report', async () => {
    // Schedule report
    const scheduleId = await reportingHelper.scheduleReport(ReportType.PERFORMANCE_METRICS, {
      schedule: '0 9 * * 1', // Every Monday at 9 AM
      recipients: [faker.internet.email(), faker.internet.email()],
      format: ReportFormat.EXCEL,
      filters: {
        team: 'Engineering',
        metrics: ['response_time', 'error_rate'],
      },
    });

    // Verify schedule created
    const history = await reportingHelper.getReportHistory(ReportType.PERFORMANCE_METRICS);
    expect(history.some((h) => h.id === scheduleId)).toBeTruthy();
  });

  test('should handle report permissions', async () => {
    // Generate report as admin
    const reportUrl = await reportingHelper.generateReport(ReportType.AUDIT_LOG, {
      startDate: faker.date.past().toISOString().split('T')[0],
      endDate: faker.date.recent().toISOString().split('T')[0],
      format: ReportFormat.PDF,
    });

    // Switch to regular user
    await authHelper.switchRole(UserRole.USER);

    // Attempt to access report (should fail)
    await expect(reportingHelper.downloadReport(reportUrl)).rejects.toThrow();
  });

  test('should generate reports in different formats', async () => {
    const reportTypes = [
      { type: ReportType.WORKFLOW_SUMMARY, format: ReportFormat.PDF },
      { type: ReportType.USER_ACTIVITY, format: ReportFormat.EXCEL },
      { type: ReportType.PERFORMANCE_METRICS, format: ReportFormat.CSV },
    ];

    for (const { type, format } of reportTypes) {
      const reportUrl = await reportingHelper.generateReport(type, {
        startDate: faker.date.past().toISOString().split('T')[0],
        endDate: faker.date.recent().toISOString().split('T')[0],
        format,
      });

      expect(reportUrl).toContain(format.toLowerCase());
    }
  });

  test('should handle custom report generation', async () => {
    // Generate custom report
    const reportUrl = await reportingHelper.generateReport(ReportType.CUSTOM, {
      startDate: faker.date.past().toISOString().split('T')[0],
      endDate: faker.date.recent().toISOString().split('T')[0],
      format: ReportFormat.PDF,
      filters: {
        metrics: ['custom_metric_1', 'custom_metric_2'],
        dimensions: ['dimension_1', 'dimension_2'],
        conditions: {
          metric_1_threshold: 100,
          dimension_1_value: 'value_1',
        },
      },
    });

    // Download and verify report
    const filePath = await reportingHelper.downloadReport(reportUrl);
    expect(filePath).toBeTruthy();
  });

  test('should manage report schedules', async () => {
    // Create multiple schedules
    const schedules = await Promise.all([
      reportingHelper.scheduleReport(ReportType.WORKFLOW_SUMMARY, {
        schedule: '0 9 * * 1',
        recipients: [faker.internet.email()],
        format: ReportFormat.PDF,
      }),
      reportingHelper.scheduleReport(ReportType.USER_ACTIVITY, {
        schedule: '0 0 1 * *',
        recipients: [faker.internet.email()],
        format: ReportFormat.EXCEL,
      }),
    ]);

    // Verify all schedules
    const history = await reportingHelper.getReportHistory(ReportType.WORKFLOW_SUMMARY);
    for (const scheduleId of schedules) {
      expect(history.some((h) => h.id === scheduleId)).toBeTruthy();
    }
  });
});
