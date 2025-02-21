import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Common timeouts
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_NAVIGATION_TIMEOUT = 30000;

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory and files pattern
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // Maximum time one test can run
  timeout: DEFAULT_TIMEOUT,

  // Test runner options
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright'],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Maximum time each navigation can take
    navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video for failed tests
    video: 'retain-on-failure',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Browser options
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Context options
    contextOptions: {
      reducedMotion: 'reduce',
      strictSelectors: true,
    },

    // Action options
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Configure projects for different test types
  projects: [
    {
      name: 'e2e-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.e2e\.spec\.ts/,
    },
    {
      name: 'e2e-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.e2e\.spec\.ts/,
    },
    {
      name: 'e2e-webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.e2e\.spec\.ts/,
    },
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
    },
    {
      name: 'performance',
      testMatch: /.*\.perf\.spec\.ts/,
    },
    {
      name: 'security',
      testMatch: /.*\.security\.spec\.ts/,
    },
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Global setup and teardown
  globalSetup: path.join(__dirname, 'tests/global.setup.ts'),
  globalTeardown: path.join(__dirname, 'tests/global.teardown.ts'),

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Preserve test output
  preserveOutput: 'failures-only',

  // Expect options
  expect: {
    timeout: 10000,
    toMatchSnapshot: { threshold: 0.2 },
  },
});
