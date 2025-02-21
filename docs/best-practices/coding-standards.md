# Coding Standards & Best Practices

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Documentation](https://img.shields.io/badge/documentation-complete-green.svg)

[← Back to Documentation Index](../README.md)

**Last Updated:** 2024-02-20
**Document Version:** 0.1.0
**Framework Version:** 0.1.0

**Quick Links:**
- [Architecture Guide](../architecture/framework-architecture.md)
- [Getting Started Guide](../setup/getting-started.md)
- [API Reference](../api-docs/api-reference.md)

**Table of Contents:**
- [Code Style](#code-style)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [Naming Conventions](#naming-conventions)
- [Testing Standards](#testing-standards)
  - [Test Organization](#test-organization)
  - [Assertions](#assertions)
- [Page Objects](#page-objects)
  - [Structure](#structure)
- [API Testing](#api-testing)
  - [Request Structure](#request-structure)
- [Database Operations](#database-operations)
  - [Query Structure](#query-structure)
- [Error Handling](#error-handling)
  - [Error Structure](#error-structure)
- [Logging](#logging)
  - [Log Structure](#log-structure)
- [Performance](#performance)
  - [Optimization](#optimization)
- [Security](#security)
  - [Best Practices](#security-best-practices)
- [Documentation](#documentation)
  - [Code Documentation](#code-documentation)
- [Version Control](#version-control)
  - [Commit Messages](#commit-messages)

## Code Style

### TypeScript Guidelines

1. **Type Definitions**
   ```typescript
   // ✅ Good
   interface UserData {
     id: string;
     name: string;
     email: string;
     role?: UserRole;
   }

   // ❌ Bad
   interface user {
     id: any;
     name: any;
     email: any;
     role: any;
   }
   ```

2. **Function Signatures**
   ```typescript
   // ✅ Good
   async function getUserById(id: string): Promise<User> {
     // Implementation
   }

   // ❌ Bad
   async function getUser(id): Promise<any> {
     // Implementation
   }
   ```

3. **Async/Await**
   ```typescript
   // ✅ Good
   async function fetchData() {
     try {
       const result = await api.getData();
       return result;
     } catch (error) {
       logger.error('Failed to fetch data', error);
       throw error;
     }
   }

   // ❌ Bad
   function fetchData() {
     return api.getData()
       .then(result => result)
       .catch(error => {
         console.error(error);
         throw error;
       });
   }
   ```

### Naming Conventions

1. **Files**
   ```
   ✅ Good
   user.service.ts
   login.page.ts
   database.client.ts

   ❌ Bad
   userService.ts
   LoginPage.ts
   databaseClient.ts
   ```

2. **Classes**
   ```typescript
   // ✅ Good
   export class UserService {
     // Implementation
   }

   // ❌ Bad
   export class userService {
     // Implementation
   }
   ```

3. **Interfaces**
   ```typescript
   // ✅ Good
   interface UserConfig {
     // Properties
   }

   // ❌ Bad
   interface IUserConfig {
     // Properties
   }
   ```

4. **Constants**
   ```typescript
   // ✅ Good
   const MAX_RETRIES = 3;
   const DEFAULT_TIMEOUT = 5000;

   // ❌ Bad
   const maxRetries = 3;
   const defaultTimeout = 5000;
   ```

## Testing Standards

### Test Organization

1. **Test Structure**
   ```typescript
   // ✅ Good
   test.describe('User Authentication', () => {
     test.beforeEach(async ({ page }) => {
       // Setup
     });

     test('successful login', async ({ page }) => {
       // Test implementation
     });

     test('failed login', async ({ page }) => {
       // Test implementation
     });
   });

   // ❌ Bad
   test('test1', async ({ page }) => {
     // Setup
     // Test implementation
   });

   test('test2', async ({ page }) => {
     // Setup
     // Test implementation
   });
   ```

2. **Test Naming**
   ```typescript
   // ✅ Good
   test('should display error message when password is incorrect', async ({ page }) => {
     // Test implementation
   });

   // ❌ Bad
   test('login error', async ({ page }) => {
     // Test implementation
   });
   ```

3. **Test Independence**
   ```typescript
   // ✅ Good
   test.describe('User Management', () => {
     test.beforeEach(async ({ page }) => {
       await setupTestData();
     });

     test.afterEach(async ({ page }) => {
       await cleanupTestData();
     });

     test('create user', async ({ page }) => {
       // Test implementation
     });
   });

   // ❌ Bad
   let sharedData;

   test.describe('User Management', () => {
     test('create user', async ({ page }) => {
       sharedData = await createUser();
     });

     test('update user', async ({ page }) => {
       await updateUser(sharedData.id);
     });
   });
   ```

### Assertions

1. **Explicit Assertions**
   ```typescript
   // ✅ Good
   await expect(page.getByText('Welcome')).toBeVisible();
   await expect(response.status).toBe(200);
   await expect(database.users.count()).toBe(1);

   // ❌ Bad
   const text = await page.getByText('Welcome').textContent();
   expect(text).toBeTruthy();
   ```

2. **Custom Assertions**
   ```typescript
   // ✅ Good
   await expect(page).toHaveValidSchema(userSchema);
   await expect(response).toMatchApiContract();
   await expect(metrics).toMeetPerformanceBaseline();

   // ❌ Bad
   const schema = validateSchema(page, userSchema);
   expect(schema.isValid).toBe(true);
   ```

3. **Error Messages**
   ```typescript
   // ✅ Good
   expect(user.role).toBe('admin', 'User should have admin role after promotion');
   expect(response.status).toBe(403, 'Unauthorized users should not access admin endpoints');

   // ❌ Bad
   expect(user.role).toBe('admin');
   expect(response.status).toBe(403);
   ```

## Page Objects

### Structure

1. **Element Locators**
   ```typescript
   // ✅ Good
   export class LoginPage extends BasePageObject {
     private readonly usernameInput = this.page.getByLabel('Username');
     private readonly passwordInput = this.page.getByLabel('Password');
     private readonly submitButton = this.page.getByRole('button', { name: 'Login' });
   }

   // ❌ Bad
   export class LoginPage extends BasePageObject {
     private readonly usernameInput = this.page.locator('#username');
     private readonly passwordInput = this.page.locator('#password');
     private readonly submitButton = this.page.locator('.submit-btn');
   }
   ```

2. **Actions**
   ```typescript
   // ✅ Good
   export class LoginPage extends BasePageObject {
     async login(username: string, password: string): Promise<void> {
       await this.usernameInput.fill(username);
       await this.passwordInput.fill(password);
       await this.submitButton.click();
       await this.page.waitForURL('/dashboard');
     }
   }

   // ❌ Bad
   export class LoginPage extends BasePageObject {
     async login(username: string, password: string): Promise<void> {
       await this.page.fill('#username', username);
       await this.page.fill('#password', password);
       await this.page.click('.submit-btn');
     }
   }
   ```

3. **Assertions**
   ```typescript
   // ✅ Good
   export class LoginPage extends BasePageObject {
     async expectErrorMessage(message: string): Promise<void> {
       await expect(this.errorText).toHaveText(message);
       await expect(this.submitButton).toBeEnabled();
     }
   }

   // ❌ Bad
   export class LoginPage extends BasePageObject {
     async checkError(): Promise<boolean> {
       return await this.errorText.isVisible();
     }
   }
   ```

## API Testing

### Request Structure

1. **API Clients**
   ```typescript
   // ✅ Good
   export class UserApi extends BaseApiClient {
     async createUser(data: CreateUserDto): Promise<User> {
       return this.post<User>('/users', data);
     }
   }

   // ❌ Bad
   export class UserApi {
     async createUser(data: any): Promise<any> {
       const response = await fetch('/users', {
         method: 'POST',
         body: JSON.stringify(data),
       });
       return response.json();
     }
   }
   ```

2. **Request Configuration**
   ```typescript
   // ✅ Good
   const response = await api.get<User>('/users/1', {
     headers: { 'Accept': 'application/json' },
     timeout: 5000,
     retry: 3,
   });

   // ❌ Bad
   const response = await fetch('/users/1');
   ```

3. **Error Handling**
   ```typescript
   // ✅ Good
   try {
     const user = await api.getUser(id);
     return user;
   } catch (error) {
     if (error instanceof ApiError) {
       logger.error('API Error:', error.message);
       throw new UserNotFoundError(id);
     }
     throw error;
   }

   // ❌ Bad
   const user = await api.getUser(id).catch(console.error);
   return user;
   ```

## Database Operations

### Query Structure

1. **Transactions**
   ```typescript
   // ✅ Good
   await transactionManager.executeInTransaction(async (client) => {
     const user = await client.users.create({ data: userData });
     await client.profiles.create({ data: { ...profileData, userId: user.id } });
   });

   // ❌ Bad
   const user = await prisma.users.create({ data: userData });
   await prisma.profiles.create({ data: { ...profileData, userId: user.id } });
   ```

2. **Query Building**
   ```typescript
   // ✅ Good
   const users = await prisma.users.findMany({
     where: {
       role: 'admin',
       active: true,
     },
     select: {
       id: true,
       name: true,
       email: true,
     },
   });

   // ❌ Bad
   const users = await prisma.$queryRaw`
     SELECT id, name, email
     FROM users
     WHERE role = 'admin' AND active = true
   `;
   ```

3. **Data Cleanup**
   ```typescript
   // ✅ Good
   await cleanupUtility.cleanup({
     tables: ['users', 'profiles'],
     strategy: 'soft-delete',
     where: { createdAt: { lt: oneHourAgo } },
   });

   // ❌ Bad
   await prisma.users.deleteMany({});
   await prisma.profiles.deleteMany({});
   ```

## Error Handling

### Error Structure

1. **Custom Errors**
   ```typescript
   // ✅ Good
   export class ApiError extends Error {
     constructor(
       message: string,
       public statusCode: number,
       public details?: Record<string, any>,
     ) {
       super(message);
       this.name = 'ApiError';
     }
   }

   // ❌ Bad
   throw new Error('API request failed');
   ```

2. **Error Recovery**
   ```typescript
   // ✅ Good
   async function retryOperation<T>(
     operation: () => Promise<T>,
     maxRetries = 3,
   ): Promise<T> {
     let lastError: Error;

     for (let i = 0; i < maxRetries; i++) {
       try {
         return await operation();
       } catch (error) {
         lastError = error;
         await delay(Math.pow(2, i) * 1000);
       }
     }

     throw lastError;
   }

   // ❌ Bad
   async function retryOperation<T>(
     operation: () => Promise<T>,
   ): Promise<T> {
     try {
       return await operation();
     } catch (error) {
       return await operation();
     }
   }
   ```

## Logging

### Log Structure

1. **Log Levels**
   ```typescript
   // ✅ Good
   logger.error('Failed to process payment', {
     orderId,
     error: error.message,
     stack: error.stack,
   });

   logger.info('User logged in', {
     userId,
     timestamp: new Date().toISOString(),
   });

   // ❌ Bad
   console.error('Error:', error);
   console.log('User:', userId);
   ```

2. **Context**
   ```typescript
   // ✅ Good
   logger.debug('Processing request', {
     method: req.method,
     path: req.path,
     params: req.params,
     headers: req.headers,
   });

   // ❌ Bad
   logger.debug('Processing request');
   ```

## Performance

### Optimization

1. **Resource Management**
   ```typescript
   // ✅ Good
   const browser = await chromium.launch();
   try {
     const page = await browser.newPage();
     await runTests(page);
   } finally {
     await browser.close();
   }

   // ❌ Bad
   const browser = await chromium.launch();
   const page = await browser.newPage();
   await runTests(page);
   await browser.close();
   ```

2. **Parallel Execution**
   ```typescript
   // ✅ Good
   const results = await Promise.all(
     users.map(user => validateUser(user))
   );

   // ❌ Bad
   const results = [];
   for (const user of users) {
     results.push(await validateUser(user));
   }
   ```

## Security

### Best Practices

1. **Credential Management**
   ```typescript
   // ✅ Good
   const credentials = await secretManager.getCredentials('api-key');
   await api.authenticate(credentials);

   // ❌ Bad
   const API_KEY = 'secret-key-123';
   await api.authenticate(API_KEY);
   ```

2. **Input Validation**
   ```typescript
   // ✅ Good
   const schema = Joi.object({
     username: Joi.string().alphanum().min(3).max(30).required(),
     password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
   });

   const { error } = schema.validate(input);
   if (error) throw new ValidationError(error.details);

   // ❌ Bad
   if (input.username && input.password) {
     // Process input
   }
   ```

## Documentation

### Code Documentation

1. **Function Documentation**
   ```typescript
   // ✅ Good
   /**
    * Creates a new user in the system
    * @param data The user data to create
    * @throws {ValidationError} If the user data is invalid
    * @throws {DuplicateError} If the email already exists
    * @returns The created user
    */
   async function createUser(data: CreateUserDto): Promise<User> {
     // Implementation
   }

   // ❌ Bad
   // Creates a user
   async function createUser(data: any): Promise<any> {
     // Implementation
   }
   ```

2. **Class Documentation**
   ```typescript
   // ✅ Good
   /**
    * Manages user authentication and authorization
    * @example
    * const auth = new AuthManager(config);
    * await auth.login(username, password);
    */
   export class AuthManager {
     // Implementation
   }

   // ❌ Bad
   // Auth manager class
   export class AuthManager {
     // Implementation
   }
   ```

## Version Control

### Commit Messages

1. **Message Structure**
   ```
   ✅ Good
   feat(auth): implement OAuth2 authentication
   fix(api): handle timeout errors in user service
   docs(readme): update installation instructions

   ❌ Bad
   update code
   fix bug
   wip
   ```

2. **Branch Names**
   ```
   ✅ Good
   feature/oauth-authentication
   bugfix/api-timeout
   docs/installation-guide

   ❌ Bad
   new-feature
   fix
   update
   ```
