import { PrismaClient } from '@prisma/client';
import logger from '../logger';
import { DatabaseClient } from './client';

/**
 * Transaction options
 */
export interface TransactionOptions {
  timeout?: number;
  maxRetries?: number;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

/**
 * Transaction manager class
 */
export class TransactionManager {
  private static instance: TransactionManager;
  private client: DatabaseClient;

  private constructor() {
    this.client = DatabaseClient.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Execute in transaction with retries
   */
  public async executeInTransaction<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const { maxRetries = 3, timeout = 5000 } = options;
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxRetries) {
      try {
        return await Promise.race([
          this.client.transaction(callback),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout')), timeout),
          ),
        ]);
      } catch (error) {
        lastError = error as Error;
        attempts++;
        if (attempts < maxRetries) {
          logger.warn(`Transaction attempt ${attempts} failed, retrying...`, { error });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    logger.logError('Transaction failed after max retries', lastError);
    throw lastError;
  }

  /**
   * Execute multiple operations in transaction
   */
  public async executeBatch<T>(
    operations: ((tx: PrismaClient) => Promise<T>)[],
    options: TransactionOptions = {},
  ): Promise<T[]> {
    return this.executeInTransaction(async (tx) => {
      const results: T[] = [];
      for (const operation of operations) {
        results.push(await operation(tx));
      }
      return results;
    }, options);
  }

  /**
   * Execute with savepoint
   */
  public async executeWithSavepoint<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    savepointName: string,
  ): Promise<T> {
    return this.executeInTransaction(async (tx) => {
      try {
        await tx.$executeRaw`SAVEPOINT ${savepointName}`;
        const result = await callback(tx);
        await tx.$executeRaw`RELEASE SAVEPOINT ${savepointName}`;
        return result;
      } catch (error) {
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT ${savepointName}`;
        throw error;
      }
    });
  }

  /**
   * Execute with isolation level
   */
  public async executeWithIsolation<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    isolationLevel: TransactionOptions['isolationLevel'],
  ): Promise<T> {
    return this.executeInTransaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`;
      return await callback(tx);
    });
  }

  /**
   * Execute read-only transaction
   */
  public async executeReadOnly<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.executeInTransaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return await callback(tx);
    });
  }
}
