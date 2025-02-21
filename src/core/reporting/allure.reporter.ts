import { TestInfo } from '@playwright/test';
import { TestResult, TestStatus } from '@playwright/test/reporter';
import {
  AllureRuntime,
  AllureStep,
  AllureTest,
  ContentType,
  Stage,
  Status,
} from 'allure-js-commons';
import logger from '../logger';

/**
 * Allure attachment options
 */
export interface AllureAttachmentOptions {
  screenshots?: boolean;
  videos?: boolean;
  traces?: boolean;
  logs?: boolean;
  networkLogs?: boolean;
  performanceData?: boolean;
}

/**
 * Allure test metadata
 */
export interface AllureTestMetadata {
  feature?: string;
  story?: string;
  severity?: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
  owner?: string;
  tags?: string[];
  description?: string;
  parameters?: Record<string, string>;
  epic?: string;
}

/**
 * Custom Allure reporter class
 */
export class AllureReporter {
  private static instance: AllureReporter;
  private runtime: AllureRuntime;
  private currentTest?: AllureTest;
  private currentStep?: AllureStep;
  private attachmentOptions: AllureAttachmentOptions;

  private constructor(options: AllureAttachmentOptions = {}) {
    this.runtime = new AllureRuntime({ resultsDir: 'allure-results' });
    this.attachmentOptions = options;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: AllureAttachmentOptions): AllureReporter {
    if (!AllureReporter.instance) {
      AllureReporter.instance = new AllureReporter(options);
    }
    return AllureReporter.instance;
  }

  /**
   * Start test case
   */
  public startTest(testInfo: TestInfo, metadata?: AllureTestMetadata): void {
    try {
      const test = new AllureTest(this.runtime);
      test.name = testInfo.title;
      test.fullName = testInfo.titlePath.join(' > ');
      test.historyId = testInfo.titlePath.join(' > ');
      test.stage = Stage.RUNNING;

      this.currentTest = test;

      // Add test metadata
      if (metadata?.epic) {
        this.currentTest.addLabel('epic', metadata.epic);
      }

      if (metadata) {
        this.addTestMetadata(metadata);
      }

      // Add test info
      this.currentTest.fullName = testInfo.title;
      this.currentTest.historyId = testInfo.titlePath.join(' > ');
      this.currentTest.stage = Stage.RUNNING;

      logger.debug('Started Allure test case', { title: testInfo.title });
    } catch (error) {
      logger.logError('Failed to start Allure test case', error);
    }
  }

  /**
   * End test case
   */
  public endTest(result: TestResult): void {
    try {
      if (!this.currentTest) {
        return;
      }

      this.currentTest.stage = Stage.FINISHED;
      this.currentTest.status = this.mapStatus(result.status);

      if (result.error) {
        this.currentTest.statusDetails = {
          message: result.error.message,
          trace: result.error.stack,
        };
      }

      this.currentTest.endTest();

      // Add attachments
      this.addTestAttachments(result);

      logger.debug('Ended Allure test case', { status: result.status });
    } catch (error) {
      logger.warn('Failed to end test in Allure', { error });
    }
  }

  /**
   * Start test step
   */
  public startStep(name: string): void {
    try {
      if (!this.currentTest) return;

      this.currentStep = this.currentTest.startStep(name);
      logger.debug('Started Allure step', { name });
    } catch (error) {
      logger.logError('Failed to start Allure step', error);
    }
  }

  /**
   * End test step
   */
  public endStep(status: Status = Status.PASSED): void {
    try {
      if (!this.currentStep) return;

      this.currentStep.status = status;
      this.currentStep.endStep();
      this.currentStep = undefined;

      logger.debug('Ended Allure step', { status });
    } catch (error) {
      logger.logError('Failed to end Allure step', error);
    }
  }

  /**
   * Add test metadata
   */
  private addTestMetadata(metadata: AllureTestMetadata): void {
    if (!this.currentTest) return;

    if (metadata.feature) {
      this.currentTest.addLabel('feature', metadata.feature);
    }

    if (metadata.story) {
      this.currentTest.addLabel('story', metadata.story);
    }

    if (metadata.severity) {
      this.currentTest.addLabel('severity', metadata.severity);
    }

    if (metadata.owner) {
      this.currentTest.addLabel('owner', metadata.owner);
    }

    if (metadata.tags) {
      metadata.tags.forEach((tag) => this.currentTest?.addLabel('tag', tag));
    }

    if (metadata.description) {
      this.currentTest.description = metadata.description;
    }

    if (metadata.parameters) {
      Object.entries(metadata.parameters).forEach(([name, value]) => {
        this.currentTest?.addParameter(name, value);
      });
    }
  }

  /**
   * Add test attachments
   */
  private addTestAttachments(result: TestResult): void {
    if (!this.currentTest) return;

    // Add screenshot
    if (this.attachmentOptions.screenshots && result.attachments) {
      const screenshots = result.attachments.filter((a) => a.name === 'screenshot');
      screenshots.forEach((screenshot) => {
        if (screenshot.body) {
          this.currentTest?.addAttachment(
            'Screenshot',
            ContentType.PNG,
            screenshot.body.toString('base64'),
          );
        }
      });
    }

    // Add video
    if (this.attachmentOptions.videos && result.attachments) {
      const videos = result.attachments.filter((a) => a.name === 'video');
      videos.forEach((video) => {
        if (video.body) {
          this.currentTest?.addAttachment('Video', ContentType.WEBM, video.body.toString('base64'));
        }
      });
    }

    // Add trace
    if (this.attachmentOptions.traces && result.attachments) {
      const traces = result.attachments.filter((a) => a.name === 'trace');
      traces.forEach((trace) => {
        if (trace.body) {
          this.currentTest?.addAttachment('Trace', ContentType.ZIP, trace.body.toString('base64'));
        }
      });
    }

    // Add console logs
    if (this.attachmentOptions.logs && result.stdout.length > 0) {
      this.currentTest.addAttachment('Console Logs', ContentType.TEXT, result.stdout.join('\n'));
    }
  }

  /**
   * Map Playwright status to Allure status
   */
  private mapStatus(status: TestStatus): Status {
    switch (status) {
      case 'passed':
        return Status.PASSED;
      case 'failed':
        return Status.FAILED;
      case 'timedOut':
        return Status.BROKEN;
      case 'skipped':
        return Status.SKIPPED;
      default:
        return Status.BROKEN;
    }
  }

  /**
   * Add environment info
   */
  public addEnvironmentInfo(info: Record<string, string>): void {
    try {
      this.runtime.writeEnvironmentInfo(info);
    } catch (error) {
      logger.logError('Failed to add environment info', error);
    }
  }

  /**
   * Add categories
   */
  public addCategories(categories: any[]): void {
    try {
      this.runtime.writeCategoriesDefinitions(categories);
    } catch (error) {
      logger.logError('Failed to add categories', error);
    }
  }
}
