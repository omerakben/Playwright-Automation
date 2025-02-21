import { PrismaClient } from '@prisma/client';
import logger from '../logger';

/**
 * Database client manager class
 */
export class DatabaseClient {
  private static instance: DatabaseClient;
  private client: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.setupLogging();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.client;
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.$connect();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.logError('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.logError('Failed to disconnect from database', error);
      throw error;
    }
  }

  /**
   * Setup logging for database events
   */
  private setupLogging(): void {
    this.client.$on('query', (e: { query: string; params: unknown; duration: number }) => {
      logger.debug('Query', { query: e.query, params: e.params, duration: e.duration });
    });

    this.client.$on('error', (e: { message: string }) => {
      logger.logError('Database error', e);
    });

    this.client.$on('info', (e: { message: string }) => {
      logger.info('Database info', { message: e.message });
    });

    this.client.$on('warn', (e: { message: string }) => {
      logger.warn('Database warning', { message: e.message });
    });
  }

  /**
   * Execute in transaction
   */
  public async transaction<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    try {
      return await this.client.$transaction(async (tx: PrismaClient) => {
        return await callback(tx);
      });
    } catch (error) {
      logger.logError('Transaction failed', error);
      throw error;
    }
  }

  /**
   * Check database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.logError('Database health check failed', error);
      return false;
    }
  }
}
