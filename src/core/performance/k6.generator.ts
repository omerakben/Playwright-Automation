import { writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../logger';

/**
 * K6 script options
 */
export interface K6ScriptOptions {
  vus?: number;
  duration?: string;
  rampUp?: string;
  rampDown?: string;
  stages?: { duration: string; target: number }[];
  thresholds?: Record<string, string[]>;
  tags?: Record<string, string>;
  scenarios?: Record<string, K6Scenario>;
}

/**
 * K6 scenario configuration
 */
export interface K6Scenario {
  executor: string;
  vus?: number;
  duration?: string;
  startVUs?: number;
  stages?: { duration: string; target: number }[];
  maxVUs?: number;
  tags?: Record<string, string>;
  env?: Record<string, string>;
}

/**
 * K6 script generator class
 */
export class K6ScriptGenerator {
  private static instance: K6ScriptGenerator;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): K6ScriptGenerator {
    if (!K6ScriptGenerator.instance) {
      K6ScriptGenerator.instance = new K6ScriptGenerator();
    }
    return K6ScriptGenerator.instance;
  }

  /**
   * Generate k6 script
   */
  public generateScript(
    testFunction: string,
    options: K6ScriptOptions = {},
    outputPath: string,
  ): string {
    try {
      const script = this.buildScript(testFunction, options);
      const filePath = join(process.cwd(), outputPath);
      writeFileSync(filePath, script);
      logger.info('K6 script generated successfully', { filePath });
      return filePath;
    } catch (error) {
      logger.logError('Failed to generate k6 script', error);
      throw error;
    }
  }

  /**
   * Build k6 script content
   */
  private buildScript(testFunction: string, options: K6ScriptOptions): string {
    const { vus = 1, duration = '30s', thresholds = {}, tags = {}, scenarios = {} } = options;

    const defaultScenario = {
      executor: 'constant-vus',
      vus,
      duration,
    };

    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('success_rate');
const requestDuration = new Trend('request_duration');

// Options
export const options = {
  thresholds: ${JSON.stringify(thresholds, null, 2)},
  tags: ${JSON.stringify(tags, null, 2)},
  scenarios: ${
    Object.keys(scenarios).length > 0
      ? JSON.stringify(scenarios, null, 2)
      : JSON.stringify({ default: defaultScenario }, null, 2)
  },
};

// Test function
${testFunction}

// Helper functions
function recordMetrics(response) {
  const duration = response.timings.duration;
  requestDuration.add(duration);
  successRate.add(response.status === 200);
}
    `.trim();

    return script;
  }

  /**
   * Generate common load test scenarios
   */
  public generateLoadTestScenarios(baseUrl: string): string {
    return `
export default function() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Make HTTP request
  const response = http.get(\`\${__ENV.BASE_URL || '${baseUrl}'}\`, params);

  // Check response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // Record metrics
  recordMetrics(response);

  // Sleep between iterations
  sleep(1);
}
    `.trim();
  }

  /**
   * Generate stress test scenarios
   */
  public generateStressTestScenarios(baseUrl: string): string {
    return `
export default function() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Batch requests
  const responses = http.batch([
    ['GET', \`\${__ENV.BASE_URL || '${baseUrl}'}/api/users\`, null, params],
    ['GET', \`\${__ENV.BASE_URL || '${baseUrl}'}/api/products\`, null, params],
    ['GET', \`\${__ENV.BASE_URL || '${baseUrl}'}/api/orders\`, null, params],
  ]);

  // Check responses
  responses.forEach((response, index) => {
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    recordMetrics(response);
  });

  // Sleep between iterations
  sleep(2);
}
    `.trim();
  }

  /**
   * Generate spike test scenarios
   */
  public generateSpikeTestScenarios(baseUrl: string): string {
    return `
export default function() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Simulate heavy load
  for (let i = 0; i < 5; i++) {
    const response = http.get(\`\${__ENV.BASE_URL || '${baseUrl}'}/api/heavy\`, params);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 5000ms': (r) => r.timings.duration < 5000,
    });

    recordMetrics(response);
  }

  // Sleep between spikes
  sleep(3);
}
    `.trim();
  }
}
