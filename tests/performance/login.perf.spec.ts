import { expect, test } from '../fixtures/performance.fixture';

test.describe('Login Performance', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test('should handle login load test', async ({ performanceUtils }) => {
    // Generate load test script
    const scriptPath = await performanceUtils.generateLoadTest(baseUrl, {
      vus: 50,
      duration: '5m',
      thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests should be under 1s
        http_req_failed: ['rate<0.01'], // Less than 1% failure rate
      },
    });

    // Run test
    await performanceUtils.runTest(scriptPath, {
      env: {
        USERNAME: 'testuser',
        PASSWORD: 'testpass123',
      },
    });

    // Collect and verify metrics
    const metrics = await performanceUtils.collectMetrics('test-results/performance');
    expect(metrics.http_req_duration.p95).toBeLessThan(1000);
    expect(metrics.http_req_failed.rate).toBeLessThan(0.01);
  });

  test('should handle login stress test', async ({ performanceUtils }) => {
    // Generate stress test script
    const scriptPath = await performanceUtils.generateStressTest(baseUrl, {
      stages: [
        { duration: '2m', target: 50 }, // Ramp up to 50 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 200 }, // Spike to 200 users
        { duration: '1m', target: 0 }, // Scale down to 0
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests under 2s during stress
        http_req_failed: ['rate<0.05'], // Less than 5% failure rate
      },
    });

    // Run test
    await performanceUtils.runTest(scriptPath, {
      env: {
        USERNAME: 'testuser',
        PASSWORD: 'testpass123',
      },
    });

    // Collect and verify metrics
    const metrics = await performanceUtils.collectMetrics('test-results/performance');
    expect(metrics.http_req_duration.p95).toBeLessThan(2000);
    expect(metrics.http_req_failed.rate).toBeLessThan(0.05);
  });

  test('should handle login spike test', async ({ performanceUtils }) => {
    // Generate spike test script
    const scriptPath = await performanceUtils.generateSpikeTest(baseUrl, {
      stages: [
        { duration: '1m', target: 10 }, // Normal load
        { duration: '1m', target: 500 }, // Spike to 500 users
        { duration: '1m', target: 10 }, // Back to normal
      ],
      thresholds: {
        http_req_duration: ['p(95)<5000'], // 95% of requests under 5s during spike
        http_req_failed: ['rate<0.1'], // Less than 10% failure rate
      },
    });

    // Run test
    await performanceUtils.runTest(scriptPath, {
      env: {
        USERNAME: 'testuser',
        PASSWORD: 'testpass123',
      },
    });

    // Collect and verify metrics
    const metrics = await performanceUtils.collectMetrics('test-results/performance');
    expect(metrics.http_req_duration.p95).toBeLessThan(5000);
    expect(metrics.http_req_failed.rate).toBeLessThan(0.1);
  });

  test('should measure login response time distribution', async ({ performanceUtils }) => {
    // Generate load test script with response time focus
    const scriptPath = await performanceUtils.generateLoadTest(baseUrl, {
      vus: 20,
      duration: '3m',
      thresholds: {
        http_req_duration: [
          'p(50)<500', // 50% under 500ms
          'p(90)<1000', // 90% under 1s
          'p(95)<1500', // 95% under 1.5s
          'p(99)<2000', // 99% under 2s
        ],
      },
    });

    // Run test
    await performanceUtils.runTest(scriptPath);

    // Collect and analyze metrics
    const metrics = await performanceUtils.collectMetrics('test-results/performance');
    expect(metrics.http_req_duration.p50).toBeLessThan(500);
    expect(metrics.http_req_duration.p90).toBeLessThan(1000);
    expect(metrics.http_req_duration.p95).toBeLessThan(1500);
    expect(metrics.http_req_duration.p99).toBeLessThan(2000);
  });

  test('should measure login resource utilization', async ({ performanceUtils }) => {
    // Generate load test script with resource metrics
    const scriptPath = await performanceUtils.generateLoadTest(baseUrl, {
      vus: 30,
      duration: '3m',
      thresholds: {
        http_req_duration: ['p(95)<1000'],
        memory_used: ['max<100MB'], // Memory usage under 100MB
        cpu_usage: ['max<80'], // CPU usage under 80%
      },
    });

    // Run test
    await performanceUtils.runTest(scriptPath);

    // Collect and verify resource metrics
    const metrics = await performanceUtils.collectMetrics('test-results/performance');
    expect(metrics.memory_used.max).toBeLessThan(100 * 1024 * 1024); // Convert MB to bytes
    expect(metrics.cpu_usage.max).toBeLessThan(80);
  });
});
