import { FullConfig } from '@playwright/test';
import { DatabaseSeeder } from '../src/core/db/database.seeder';
import logger from '../src/core/logger';

/**
 * Global teardown for all tests
 */
async function globalTeardown(config: FullConfig) {
  try {
    logger.info('Starting global test teardown');

    // Clean up database
    const seeder = new DatabaseSeeder();
    await seeder.cleanup();

    logger.info('Global test teardown completed');
  } catch (error) {
    logger.logError('Global teardown failed', error);
    throw error;
  }
}

export default globalTeardown;
