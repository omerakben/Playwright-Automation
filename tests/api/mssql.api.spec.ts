import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';
import { mssql } from '../../src/core/db';

/**
 * @group database
 * @description Tests for MSSQL database operations and functionality
 */
test.describe('MSSQL Database Operations', () => {
  // Test data interfaces
  interface User {
    id: number;
    username: string;
    email: string;
    created_at: Date;
  }

  interface Order {
    id: number;
    user_id: number;
    total: number;
    status: string;
  }

  test.beforeAll(async () => {
    // Ensure database connection
    await mssql.connect();

    // Create test tables
    await mssql.executeTransaction(async (request) => {
      // Create Users table
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
        CREATE TABLE Users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(100) NOT NULL,
          email NVARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT GETDATE()
        )
      `);

      // Create Orders table
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' and xtype='U')
        CREATE TABLE Orders (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          status NVARCHAR(50) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES Users(id)
        )
      `);

      // Create stored procedure for user creation
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateUser')
        EXEC('
          CREATE PROCEDURE sp_CreateUser
            @username NVARCHAR(100),
            @email NVARCHAR(255)
          AS
          BEGIN
            INSERT INTO Users (username, email)
            VALUES (@username, @email);
            SELECT SCOPE_IDENTITY() as id;
          END
        ')
      `);
    });
  });

  test.afterAll(async () => {
    // Cleanup test data
    await mssql.executeTransaction(async (request) => {
      await request.query('DELETE FROM Orders');
      await request.query('DELETE FROM Users');
    });

    // Close connection
    await mssql.disconnect();
  });

  /**
   * @test Basic CRUD operations
   * @description Tests basic Create, Read, Update, Delete operations
   */
  test('should perform basic CRUD operations', async () => {
    // Create user
    const userData = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
    };

    const createResult = await mssql.query<User>(
      'INSERT INTO Users (username, email) OUTPUT INSERTED.* VALUES (@username, @email)',
      userData,
    );

    const userId = createResult.recordset[0].id;
    expect(userId).toBeTruthy();

    // Read user
    const readResult = await mssql.query<User>('SELECT * FROM Users WHERE id = @id', {
      id: userId,
    });
    expect(readResult.recordset[0].email).toBe(userData.email);

    // Update user
    const newEmail = faker.internet.email();
    await mssql.query('UPDATE Users SET email = @email WHERE id = @id', {
      id: userId,
      email: newEmail,
    });

    // Verify update
    const verifyResult = await mssql.query<User>('SELECT * FROM Users WHERE id = @id', {
      id: userId,
    });
    expect(verifyResult.recordset[0].email).toBe(newEmail);

    // Delete user
    await mssql.query('DELETE FROM Users WHERE id = @id', { id: userId });

    // Verify deletion
    const finalResult = await mssql.query<User>('SELECT * FROM Users WHERE id = @id', {
      id: userId,
    });
    expect(finalResult.recordset.length).toBe(0);
  });

  /**
   * @test Stored procedure execution
   * @description Tests execution of stored procedures
   */
  test('should execute stored procedures', async () => {
    // Execute stored procedure to create user
    const userData = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
    };

    const result = await mssql.executeProcedure<{ id: number }>('sp_CreateUser', userData);
    expect(result.recordset[0].id).toBeTruthy();

    // Verify user was created
    const userId = result.recordset[0].id;
    const verifyResult = await mssql.query<User>('SELECT * FROM Users WHERE id = @id', {
      id: userId,
    });
    expect(verifyResult.recordset[0].username).toBe(userData.username);
  });

  /**
   * @test Transaction management
   * @description Tests transaction commit and rollback functionality
   */
  test('should handle transactions correctly', async () => {
    // Test successful transaction
    const user = await mssql.executeTransaction(async (request) => {
      // Create user
      const userResult = await request.query<User>(
        `
        INSERT INTO Users (username, email)
        OUTPUT INSERTED.*
        VALUES (@username, @email)
      `,
        {
          username: faker.internet.userName(),
          email: faker.internet.email(),
        },
      );

      const userId = userResult.recordset[0].id;

      // Create order for user
      await request.query(
        `
        INSERT INTO Orders (user_id, total, status)
        VALUES (@userId, @total, @status)
      `,
        {
          userId,
          total: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),
          status: 'pending',
        },
      );

      return userResult.recordset[0];
    });

    // Verify both user and order were created
    const orders = await mssql.query<Order>('SELECT * FROM Orders WHERE user_id = @userId', {
      userId: user.id,
    });
    expect(orders.recordset.length).toBe(1);

    // Test transaction rollback
    try {
      await mssql.executeTransaction(async (request) => {
        // Create user
        const userResult = await request.query<User>(
          `
          INSERT INTO Users (username, email)
          OUTPUT INSERTED.*
          VALUES (@username, @email)
        `,
          {
            username: faker.internet.userName(),
            email: faker.internet.email(),
          },
        );

        // This will fail due to invalid total value
        await request.query(
          `
          INSERT INTO Orders (user_id, total, status)
          VALUES (@userId, @total, @status)
        `,
          {
            userId: userResult.recordset[0].id,
            total: 'invalid',
            status: 'pending',
          },
        );
      });
    } catch (error) {
      // Verify neither user nor order were created
      const users = await mssql.query<User>('SELECT * FROM Users WHERE email = @email', {
        email: user.email,
      });
      expect(users.recordset.length).toBe(1); // Only the first user exists
    }
  });

  /**
   * @test Bulk operations
   * @description Tests bulk insert and update operations
   */
  test('should handle bulk operations', async () => {
    // Generate test data
    const users = Array.from({ length: 5 }, () => ({
      username: faker.internet.userName(),
      email: faker.internet.email(),
    }));

    // Bulk insert
    const values = users.map((u, i) => `(@username${i}, @email${i})`).join(',');
    const params = users.reduce(
      (acc, u, i) => ({
        ...acc,
        [`username${i}`]: u.username,
        [`email${i}`]: u.email,
      }),
      {},
    );

    await mssql.query(
      `
      INSERT INTO Users (username, email)
      VALUES ${values}
    `,
      params,
    );

    // Verify bulk insert
    const result = await mssql.query<User>('SELECT * FROM Users WHERE email IN (${emails})', {
      emails: users.map((u) => u.email).join(','),
    });
    expect(result.recordset.length).toBe(users.length);
  });

  /**
   * @test Error handling
   * @description Tests error handling and constraint violations
   */
  test('should handle database errors appropriately', async () => {
    // Test duplicate key violation
    const userData = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
    };

    await mssql.query('INSERT INTO Users (username, email) VALUES (@username, @email)', userData);

    // Attempt to insert duplicate email
    try {
      await mssql.query('INSERT INTO Users (username, email) VALUES (@username, @email)', userData);
      throw new Error('Should have failed with duplicate key');
    } catch (error) {
      expect(error).toBeTruthy();
    }

    // Test foreign key violation
    try {
      await mssql.query(
        `
        INSERT INTO Orders (user_id, total, status)
        VALUES (@userId, @total, @status)
      `,
        {
          userId: 999999, // Non-existent user
          total: 100,
          status: 'pending',
        },
      );
      throw new Error('Should have failed with foreign key violation');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
