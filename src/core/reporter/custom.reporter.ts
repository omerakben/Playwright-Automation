import {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import logger from '../logger';
import {
  EnhancedTestResult,
  ReporterConfig,
  TestRunStats,
  TestSuiteResult,
} from './reporter.types';

/**
 * Custom test reporter implementation
 */
export class CustomReporter implements Reporter {
  private stats: TestRunStats;
  private suites: Map<string, TestSuiteResult>;
  private config: ReporterConfig;

  constructor(config: ReporterConfig) {
    this.config = config;
    this.stats = this.initializeStats();
    this.suites = new Map();
    this.createOutputDirectory();
  }

  private initializeStats(): TestRunStats {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime: new Date(),
      endTime: new Date(),
      browsers: [],
      retries: 0,
    };
  }

  private createOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  onBegin(config: FullConfig<{}, {}>, suite: Suite): void {
    logger.info('Test execution started', {
      workers: config.workers,
      projects: config.projects.length,
    });

    this.stats.startTime = new Date();
  }

  onTestBegin(test: TestCase): void {
    const suiteName = test.parent.title || path.basename(test.location.file);

    if (!this.suites.has(suiteName)) {
      this.suites.set(suiteName, {
        name: suiteName,
        file: test.location.file,
        tests: [],
        duration: 0,
        status: 'passed',
        startTime: new Date(),
        endTime: new Date(),
      });
    }

    logger.info(`Starting test: ${test.title}`, {
      suite: suiteName,
      file: test.location.file,
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const suiteName = test.parent.title || path.basename(test.location.file);
    const suite = this.suites.get(suiteName)!;

    const enhancedResult: EnhancedTestResult = {
      ...result,
      testName: test.title,
      duration: result.duration,
      retries: result.retry,
      error: result.error ? new Error(result.error.message) : undefined,
    };

    // Collect attachments if enabled
    if (this.config.attachments.screenshots && result.attachments) {
      const screenshots = result.attachments.filter((a) => a.name === 'screenshot');
      if (screenshots.length > 0) {
        enhancedResult.screenshot = screenshots[screenshots.length - 1].path;
      }
    }

    suite.tests.push(enhancedResult);
    suite.duration += result.duration;

    // Update suite status
    if (result.status === 'failed' && suite.status !== 'failed') {
      suite.status = 'failed';
    }

    // Update global stats
    this.updateStats(result);

    // Log test result
    logger.logTest({
      testName: test.title,
      testFile: test.location.file,
      status: result.status,
      duration: result.duration,
      error: result.error ? new Error(result.error.message) : undefined,
    });
  }

  private updateStats(result: TestResult): void {
    this.stats.total++;
    switch (result.status) {
      case 'passed':
        this.stats.passed++;
        break;
      case 'failed':
        this.stats.failed++;
        break;
      case 'skipped':
        this.stats.skipped++;
        break;
    }
    this.stats.duration += result.duration;
    this.stats.retries += result.retry;
  }

  async onEnd(result: FullResult): Promise<void> {
    this.stats.endTime = new Date();

    // Generate summary report
    const summary = {
      stats: this.stats,
      suites: Array.from(this.suites.values()),
    };

    // Save report to file
    const reportPath = path.join(this.config.outputDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    // Log final results
    logger.info('Test execution completed', {
      result: result.status,
      stats: this.stats,
      reportPath,
    });

    // Send notifications if configured
    await this.sendNotifications(summary);
  }

  private async sendNotifications(summary: any): Promise<void> {
    if (this.config.notifications.slack) {
      await this.sendSlackNotification(summary);
    }
    if (this.config.notifications.email) {
      await this.sendEmailNotification(summary);
    }
  }

  private async sendSlackNotification(summary: any): Promise<void> {
    // Implementation for Slack notifications
    logger.info('Sending Slack notification');
    // TODO: Implement Slack notification
  }

  private async sendEmailNotification(summary: any): Promise<void> {
    // Implementation for email notifications
    logger.info('Sending email notification');
    // TODO: Implement email notification
  }
}
