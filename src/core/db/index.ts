import { PrismaClient } from '@prisma/client';
import { DatabaseClient } from './client';
import { MSSQLClient, MSSQLConfig } from './mssql.client';

// Initialize Prisma client
const db: PrismaClient = DatabaseClient.getInstance().getClient();

// Initialize MSSQL client
const mssqlConfig: MSSQLConfig = {
  server: process.env.MSSQL_SERVER || 'localhost',
  database: process.env.MSSQL_DATABASE || 'test_db',
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  pool: {
    max: parseInt(process.env.MSSQL_POOL_MAX || '10', 10),
    min: parseInt(process.env.MSSQL_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.MSSQL_POOL_IDLE_TIMEOUT || '30000', 10),
  },
};

const mssql = MSSQLClient.getInstance(mssqlConfig);

export { db as default, mssql };
