import { PrismaClient } from '@prisma/client';
import logger from '../logger';
import { SeederConfig } from './data.types';

/**
 * Database Seeder for managing test data in the database
 */
export class DatabaseSeeder {
  private static instance: DatabaseSeeder;
  private prisma: PrismaClient;
  private seeders: Map<string, (prisma: PrismaClient) => Promise<void>>;
  private config: Map<string, SeederConfig>;

  private constructor() {
    this.prisma = new PrismaClient();
    this.seeders = new Map();
    this.config = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder();
    }
    return DatabaseSeeder.instance;
  }

  /**
   * Register a seeder function
   */
  public register(
    name: string,
    seeder: (prisma: PrismaClient) => Promise<void>,
    config: SeederConfig = {}
  ): void {
    this.seeders.set(name, seeder);
    this.config.set(name, config);
  }

  /**
   * Run specific seeders
   */
  public async seed(names: string[]): Promise<void> {
    const sortedNames = this.sortByDependencies(names);

    for (const name of sortedNames) {
      await this.runSeeder(name);
    }
  }

  /**
   * Run all registered seeders
   */
  public async seedAll(): Promise<void> {
    const names = Array.from(this.seeders.keys());
    await this.seed(names);
  }

  /**
   * Run a specific seeder
   */
  private async runSeeder(name: string): Promise<void> {
    const seeder = this.seeders.get(name);
    const config = this.config.get(name);

    if (!seeder) {
      throw new Error(`Seeder not found: ${name}`);
    }

    try {
      logger.info(`Running seeder: ${name}`);

      // Check environment constraints
      if (config?.environment && !config.environment.includes(process.env.NODE_ENV || 'development')) {
        logger.debug(`Skipping seeder ${name} in environment ${process.env.NODE_ENV}`);
        return;
      }

      // Truncate if configured
      if (config?.truncate) {
        await this.truncateTable(name);
      }

      // Run the seeder
      await seeder(this.prisma);

      logger.info(`Seeder completed successfully: ${name}`);
    } catch (error) {
      logger.logError(`Failed to run seeder: ${name}`, error);
      throw error;
    }
  }

  /**
   * Sort seeders by dependencies
   */
  private sortByDependencies(names: string[]): string[] {
    const visited = new Set<string>();
    const sorted: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;

      visited.add(name);

      const config = this.config.get(name);
      if (config?.dependencies) {
        for (const dep of config.dependencies) {
          if (!this.seeders.has(dep)) {
            throw new Error(`Dependency not found: ${dep} (required by ${name})`);
          }
          visit(dep);
        }
      }

      sorted.push(name);
    };

    for (const name of names) {
      visit(name);
    }

    return sorted;
  }

  /**
   * Truncate a table
   */
  private async truncateTable(name: string): Promise<void> {
    try {
      // Implement truncate logic here based on your database
      logger.debug(`Truncating table for seeder: ${name}`);
    } catch (error) {
      logger.logError(`Failed to truncate table for seeder: ${name}`, error);
      throw error;
    }
  }

  /**
   * Clean up the database
   */
  public async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      logger.logError('Failed to cleanup database connection', error);
      throw error;
    }
  }
}
