import { test, expect } from '../fixtures/api.fixture';
import { DatabaseClient } from '../../src/core/db/client';

test.describe('Health Check', () => {
  test('should verify API health', async ({ api }) => {
    const response = await api.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual(expect.objectContaining({
      status: 'healthy',
      version: expect.any(String),
    }));
  });

  test('should verify database connection', async () => {
    const dbClient = DatabaseClient.getInstance();
    const isHealthy = await dbClient.healthCheck();
    expect(isHealthy).toBe(true);
  });

  test('should verify environment configuration', async ({ api }) => {
    const response = await api.get('/config/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual(expect.objectContaining({
      environment: expect.any(String),
      database: expect.any(Object),
      services: expect.any(Object),
    }));
  });

  test('should verify security scanner', async ({ api }) => {
    const response = await api.get('/security/health');
    expect(response.status).toBe(200);
    expect(response.data.zapScanner).toBe('available');
  });

  test('should verify performance monitoring', async ({ api }) => {
    const response = await api.get('/performance/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual(expect.objectContaining({
      k6: 'available',
      influxdb: 'connected',
      grafana: 'available',
    }));
  });
});
