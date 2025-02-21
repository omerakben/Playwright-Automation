import { ConnectionPool, IResult, Request, config as SQLConfig } from 'mssql';
import logger from '../logger';

/**
 * MSSQL configuration interface
 */
export interface MSSQLConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  trustServerCertificate?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
  pool?: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

/**
 * MSSQL Client Manager
 */
export class MSSQLClient {
  private static instance: MSSQLClient;
  private pool: ConnectionPool | null = null;
  private config: SQLConfig;

  private constructor(config: MSSQLConfig) {
    this.config = {
      server: config.server,
      database: config.database,
      user: config.user,
      password: config.password,
      port: config.port || 1433,
      options: {
        trustServerCertificate: config.trustServerCertificate || true,
        enableArithAbort: true,
      },
      connectionTimeout: config.connectionTimeout || 30000,
      requestTimeout: config.requestTimeout || 30000,
      pool: {
        max: config.pool?.max || 10,
        min: config.pool?.min || 0,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000,
      },
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: MSSQLConfig): MSSQLClient {
    if (!MSSQLClient.instance) {
      MSSQLClient.instance = new MSSQLClient(config);
    }
    return MSSQLClient.instance;
  }

  /**
   * Initialize connection pool
   */
  public async connect(): Promise<void> {
    try {
      if (!this.pool) {
        this.pool = await new ConnectionPool(this.config).connect();
        logger.info('Connected to MSSQL database');

        // Handle pool errors
        this.pool.on('error', (err: Error) => {
          logger.logError('MSSQL Pool Error', err);
        });
      }
    } catch (error) {
      logger.logError('Failed to connect to MSSQL', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        logger.info('Disconnected from MSSQL database');
      }
    } catch (error) {
      logger.logError('Failed to disconnect from MSSQL', error);
      throw error;
    }
  }

  /**
   * Execute query with parameters
   */
  public async query<T>(sql: string, params?: Record<string, any>): Promise<IResult<T>> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      const request = new Request(this.pool!);

      // Add parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      const result = await request.query<T>(sql);
      return result;
    } catch (error) {
      logger.logError('Failed to execute MSSQL query', error);
      throw error;
    }
  }

  /**
   * Execute stored procedure
   */
  public async executeProcedure<T>(
    procedureName: string,
    params?: Record<string, any>,
  ): Promise<IResult<T>> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      const request = new Request(this.pool!);

      // Add parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      const result = await request.execute<T>(procedureName);
      return result;
    } catch (error) {
      logger.logError(`Failed to execute procedure ${procedureName}`, error);
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  public async executeTransaction<T>(callback: (request: Request) => Promise<T>): Promise<T> {
    if (!this.pool) {
      await this.connect();
    }

    const transaction = this.pool!.transaction();
    try {
      await transaction.begin();
      const result = await callback(transaction.request());
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      logger.logError('Transaction failed', error);
      throw error;
    }
  }

  /**
   * Check database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
