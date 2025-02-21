import { spawn } from 'child_process';
import { join } from 'path';
import logger from '../logger';
import { K6ScriptGenerator, K6ScriptOptions } from './k6.generator';

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  baseUrl: string;
  outputDir: string;
  thresholds?: Record<string, string[]>;
  tags?: Record<string, string>;
  env?: Record<string, string>;
}

/**
 * Performance test type
 */
export type PerformanceTestType = 'load' | 'stress' | 'spike';

/**
 * Performance test runner class
 */
export class PerformanceTestRunner {
  private static instance: PerformanceTestRunner;
  private scriptGenerator: K6ScriptGenerator;

  private constructor() {
    this.scriptGenerator = K6ScriptGenerator.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceTestRunner {
    if (!PerformanceTestRunner.instance) {
      PerformanceTestRunner.instance = new PerformanceTestRunner();
    }
    return PerformanceTestRunner.instance;
  }

  /**
   * Run performance test
   */
  public async runTest(
    type: PerformanceTestType,
    config: PerformanceTestConfig,
    options: K6ScriptOptions = {},
  ): Promise<void> {
    try {
      // Generate test script
      const scriptPath = this.generateTestScript(type, config, options);

      // Build k6 command
      const k6Args = this.buildK6Arguments(config);

      // Execute test
      await this.executeK6Test(scriptPath, k6Args);

      logger.info('Performance test completed successfully', { type, config });
    } catch (error) {
      logger.logError('Performance test failed', error);
      throw error;
    }
  }

  /**
   * Generate test script based on type
   */
  private generateTestScript(
    type: PerformanceTestType,
    config: PerformanceTestConfig,
    options: K6ScriptOptions,
  ): string {
    const { baseUrl, outputDir } = config;
    let testFunction: string;

    switch (type) {
      case 'load':
        testFunction = this.scriptGenerator.generateLoadTestScenarios(baseUrl);
        break;
      case 'stress':
        testFunction = this.scriptGenerator.generateStressTestScenarios(baseUrl);
        break;
      case 'spike':
        testFunction = this.scriptGenerator.generateSpikeTestScenarios(baseUrl);
        break;
      default:
        throw new Error(`Unsupported test type: ${type}`);
    }

    const scriptPath = join(outputDir, `${type}-test.js`);
    return this.scriptGenerator.generateScript(testFunction, options, scriptPath);
  }

  /**
   * Build k6 command arguments
   */
  private buildK6Arguments(config: PerformanceTestConfig): string[] {
    const args: string[] = ['run'];

    // Add environment variables
    if (config.env) {
      Object.entries(config.env).forEach(([key, value]) => {
        args.push('--env', `${key}=${value}`);
      });
    }

    // Add output options
    args.push('--out', `json=${join(config.outputDir, 'results.json')}`);
    args.push('--summary-export', join(config.outputDir, 'summary.json'));

    return args;
  }

  /**
   * Execute k6 test
   */
  private executeK6Test(scriptPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const k6Process = spawn('k6', [...args, scriptPath], {
        stdio: 'inherit',
      });

      k6Process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`k6 process exited with code ${code}`));
        }
      });

      k6Process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run load test
   */
  public async runLoadTest(config: PerformanceTestConfig): Promise<void> {
    const options: K6ScriptOptions = {
      vus: 10,
      duration: '5m',
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
      },
    };

    await this.runTest('load', config, options);
  }

  /**
   * Run stress test
   */
  public async runStressTest(config: PerformanceTestConfig): Promise<void> {
    const options: K6ScriptOptions = {
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
      },
    };

    await this.runTest('stress', config, options);
  }

  /**
   * Run spike test
   */
  public async runSpikeTest(config: PerformanceTestConfig): Promise<void> {
    const options: K6ScriptOptions = {
      stages: [
        { duration: '1m', target: 10 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 10 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<5000'],
        http_req_failed: ['rate<0.1'],
      },
    };

    await this.runTest('spike', config, options);
  }
}
