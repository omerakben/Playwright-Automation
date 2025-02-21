# MSSQL Database Integration Guide

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Documentation](https://img.shields.io/badge/documentation-complete-green.svg)

[← Back to Documentation Index](../README.md)

**Last Updated:** 2024-02-20
**Document Version:** 0.1.0
**Framework Version:** 0.1.0

## Table of Contents
- [Overview](#overview)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The framework provides a robust MSSQL integration through a singleton client that manages connection pooling, transactions, and query execution. The integration is built on top of the `mssql` package and provides type-safe operations.

### Key Features
- Connection pooling
- Transaction management
- Stored procedure execution
- Parameterized queries
- Error handling
- Type safety

## Configuration

### Environment Variables
```env
MSSQL_SERVER=localhost
MSSQL_DATABASE=test_db
MSSQL_USER=sa
MSSQL_PASSWORD=YourStrong@Password
MSSQL_PORT=1433
MSSQL_POOL_MAX=10
MSSQL_POOL_MIN=0
MSSQL_POOL_IDLE_TIMEOUT=30000
```

### Client Configuration Interface
```typescript
interface MSSQLConfig {
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
```

## Basic Usage

### Importing the Client
```typescript
import { mssql } from '../core/db';
```

### Simple Queries
```typescript
// Select query
const users = await mssql.query<User>('SELECT * FROM Users WHERE active = @active', {
  active: true
});

// Insert with output
const result = await mssql.query<User>(
  'INSERT INTO Users (username, email) OUTPUT INSERTED.* VALUES (@username, @email)',
  { username: 'john', email: 'john@example.com' }
);

// Update
await mssql.query(
  'UPDATE Users SET status = @status WHERE id = @id',
  { id: 1, status: 'active' }
);

// Delete
await mssql.query('DELETE FROM Users WHERE id = @id', { id: 1 });
```

### Stored Procedures
```typescript
const result = await mssql.executeProcedure<User>('sp_GetUserDetails', {
  userId: 1,
  includeOrders: true
});
```

## Advanced Features

### Transaction Management
```typescript
const result = await mssql.executeTransaction(async (request) => {
  // Multiple operations in a transaction
  const user = await request.query('INSERT INTO Users ...');
  await request.query('INSERT INTO UserProfile ...');
  return user;
});
```

### Bulk Operations
```typescript
const values = users.map((u, i) => `(@username${i}, @email${i})`).join(',');
const params = users.reduce((acc, u, i) => ({
  ...acc,
  [`username${i}`]: u.username,
  [`email${i}`]: u.email,
}), {});

await mssql.query(`
  INSERT INTO Users (username, email)
  VALUES ${values}
`, params);
```

## Best Practices

### Connection Management
- Use the singleton instance via `mssql` export
- Let the client manage connection pooling
- Always close connections in cleanup/teardown

### Query Safety
- Always use parameterized queries
- Never concatenate user input into queries
- Use strong typing for results

### Transaction Usage
- Use transactions for multiple related operations
- Handle rollback scenarios
- Keep transactions short and focused

### Error Handling
```typescript
try {
  await mssql.query('...');
} catch (error) {
  if (error.number === 2627) {
    // Handle unique constraint violation
  } else if (error.number === 547) {
    // Handle foreign key violation
  }
  throw error;
}
```

## Examples

### Complete CRUD Example
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

// Create
const createResult = await mssql.query<User>(`
  INSERT INTO Users (username, email)
  OUTPUT INSERTED.*
  VALUES (@username, @email)
`, {
  username: 'john_doe',
  email: 'john@example.com'
});

// Read
const user = await mssql.query<User>('SELECT * FROM Users WHERE id = @id', {
  id: createResult.recordset[0].id
});

// Update
await mssql.query(`
  UPDATE Users
  SET email = @newEmail
  WHERE id = @id
`, {
  id: user.recordset[0].id,
  newEmail: 'new.john@example.com'
});

// Delete
await mssql.query('DELETE FROM Users WHERE id = @id', {
  id: user.recordset[0].id
});
```

### Complex Transaction Example
```typescript
await mssql.executeTransaction(async (request) => {
  // Create user
  const userResult = await request.query<User>(`
    INSERT INTO Users (username, email)
    OUTPUT INSERTED.*
    VALUES (@username, @email)
  `, {
    username: 'john_doe',
    email: 'john@example.com'
  });

  // Create profile
  await request.query(`
    INSERT INTO UserProfiles (user_id, first_name, last_name)
    VALUES (@userId, @firstName, @lastName)
  `, {
    userId: userResult.recordset[0].id,
    firstName: 'John',
    lastName: 'Doe'
  });

  // Create initial settings
  await request.query(`
    INSERT INTO UserSettings (user_id, setting_key, setting_value)
    VALUES
      (@userId, 'theme', 'dark'),
      (@userId, 'notifications', 'enabled')
  `, {
    userId: userResult.recordset[0].id
  });
});
```

## Error Handling

### Common Error Codes
- 2627: Unique constraint violation
- 547: Foreign key violation
- 8152: String or binary data truncated
- 201: Procedure not found
- 4060: Database does not exist

### Error Handling Example
```typescript
try {
  await mssql.query('...');
} catch (error) {
  switch (error.number) {
    case 2627:
      throw new Error('Record already exists');
    case 547:
      throw new Error('Invalid reference');
    case 8152:
      throw new Error('Data too long');
    default:
      throw error;
  }
}
```

## Health Checks
```typescript
const isHealthy = await mssql.healthCheck();
if (!isHealthy) {
  // Handle unhealthy database
}
```
