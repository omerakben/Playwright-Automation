import { PrismaClient } from '@prisma/client';
import logger from '../logger';
import { DatabaseClient } from './client';
import { TransactionManager } from './transaction.manager';

/**
 * Cleanup strategy types
 */
export type CleanupStrategy = 'truncate' | 'delete' | 'soft-delete';

/**
 * Cleanup options
 */
export interface CleanupOptions {
  strategy?: CleanupStrategy;
  tables?: string[];
  where?: Record<string, any>;
  cascade?: boolean;
  timeout?: number;
}

/**
 * Database cleanup utility class
 */
export class CleanupUtility {
  private static instance: CleanupUtility;
  private client: DatabaseClient;
  private transactionManager: TransactionManager;

  private constructor() {
    this.client = DatabaseClient.getInstance();
    this.transactionManager = TransactionManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CleanupUtility {
    if (!CleanupUtility.instance) {
      CleanupUtility.instance = new CleanupUtility();
    }
    return CleanupUtility.instance;
  }

  /**
   * Clean up database tables
   */
  public async cleanup(options: CleanupOptions = {}): Promise<void> {
    const {
      strategy = 'delete',
      tables = [],
      where = {},
      cascade = false,
      timeout = 30000,
    } = options;

    try {
      await this.transactionManager.executeInTransaction(
        async (tx) => {
          if (tables.length === 0) {
            tables.push(...(await this.getAllTables(tx)));
          }

          switch (strategy) {
            case 'truncate':
              await this.truncateTables(tx, tables, cascade);
              break;
            case 'delete':
              await this.deleteTables(tx, tables, where);
              break;
            case 'soft-delete':
              await this.softDeleteTables(tx, tables, where);
              break;
          }
        },
        { timeout },
      );

      logger.info('Database cleanup completed', { strategy, tables });
    } catch (error) {
      logger.logError('Database cleanup failed', error);
      throw error;
    }
  }

  /**
   * Get all database tables
   */
  private async getAllTables(tx: PrismaClient): Promise<string[]> {
    const result = await tx.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    `;
    return result.map((r: { tablename: string }) => r.tablename);
  }

  /**
   * Truncate tables
   */
  private async truncateTables(
    tx: PrismaClient,
    tables: string[],
    cascade: boolean,
  ): Promise<void> {
    for (const table of tables) {
      await tx.$executeRaw`TRUNCATE TABLE "${table}" ${cascade ? 'CASCADE' : 'RESTRICT'}`;
    }
  }

  /**
   * Delete from tables
   */
  private async deleteTables(
    tx: PrismaClient,
    tables: string[],
    where: Record<string, any>,
  ): Promise<void> {
    for (const table of tables) {
      const whereClause = this.buildWhereClause(where);
      await tx.$executeRaw`DELETE FROM "${table}" WHERE ${whereClause}`;
    }
  }

  /**
   * Soft delete from tables
   */
  private async softDeleteTables(
    tx: PrismaClient,
    tables: string[],
    where: Record<string, any>,
  ): Promise<void> {
    const now = new Date();
    for (const table of tables) {
      const whereClause = this.buildWhereClause(where);
      await tx.$executeRaw`
        UPDATE "${table}"
        SET deleted_at = ${now}
        WHERE deleted_at IS NULL AND ${whereClause}
      `;
    }
  }

  /**
   * Build WHERE clause from conditions
   */
  private buildWhereClause(where: Record<string, any>): string {
    if (Object.keys(where).length === 0) {
      return '1=1';
    }

    return Object.entries(where)
      .map(([key, value]) => `"${key}" = '${value}'`)
      .join(' AND ');
  }

  /**
   * Reset auto-increment sequences
   */
  public async resetSequences(tables?: string[]): Promise<void> {
    try {
      const client = this.client.getClient();
      const targetTables = tables || (await this.getAllTables(client));

      for (const table of targetTables) {
        await client.$executeRaw`
          SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), 1, false)
        `;
      }

      logger.info('Sequences reset completed', { tables: targetTables });
    } catch (error) {
      logger.logError('Failed to reset sequences', error);
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  public async tableExists(tableName: string): Promise<boolean> {
    try {
      const client = this.client.getClient();
      const result = await client.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = ${tableName}
        )
      `;
      return result[0].exists;
    } catch (error) {
      logger.logError('Failed to check table existence', error);
      return false;
    }
  }
}
