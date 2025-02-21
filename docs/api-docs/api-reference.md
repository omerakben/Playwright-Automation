# API Reference Documentation

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Documentation](https://img.shields.io/badge/documentation-complete-green.svg)

[← Back to Documentation Index](../README.md)

**Last Updated:** 2024-02-20
**Document Version:** 0.1.0
**Framework Version:** 0.1.0

**Quick Links:**
- [Architecture Guide](../architecture/framework-architecture.md)
- [Getting Started Guide](../setup/getting-started.md)
- [Best Practices](../best-practices/coding-standards.md)

**Table of Contents:**
- [Core Components](#core-components)
  - [Page Objects](#page-objects)
  - [API Testing](#api-testing)
  - [Database Integration](#database-integration)
  - [Performance Testing](#performance-testing)
  - [Security Testing](#security-testing)
  - [Reporting](#reporting)
  - [Utilities](#utilities)
- [Common Use Cases](#common-use-cases)
  - [Authentication Flows](#authentication-flows)
  - [Data Management](#data-management)
  - [Test Execution](#test-execution)
  - [Reporting & Analysis](#reporting-and-analysis)
- [Error Handling Patterns](#error-handling-patterns)
  - [Common Errors](#common-errors)
  - [Retry Strategies](#retry-strategies)
  - [Error Recovery](#error-recovery)
  - [Logging & Reporting](#logging-and-reporting)
- [Best Practices](#best-practices)
  - [Code Organization](#code-organization)
  - [Performance Optimization](#performance-optimization)
  - [Security Considerations](#security-considerations)
  - [Maintenance Tips](#maintenance-tips)

## Core Components

### Page Objects

#### BasePageObject
Base class for all page objects providing common functionality.

```typescript
import { BasePageObject } from '@core/page-objects';

class LoginPage extends BasePageObject {
  constructor(page: Page) {
    super(page);
  }

  // Methods
  async goto(): Promise<void>;
  async waitForLoad(): Promise<void>;
  async isVisible(): Promise<boolean>;
  async screenshot(name: string): Promise<void>;
}
```

**Error Handling Example:**
```typescript
class LoginPage extends BasePageObject {
  async login(username: string, password: string): Promise<void> {
    try {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.loginButton.click();
      await this.waitForNavigation();
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new LoginTimeoutError('Login operation timed out');
      }
      if (error instanceof ElementNotFoundError) {
        throw new LoginFormError('Login form elements not found');
      }
      throw new LoginError('Failed to perform login', { cause: error });
    }
  }

  async waitForNavigation(): Promise<void> {
    try {
      await Promise.race([
        this.page.waitForURL('/dashboard'),
        this.page.waitForSelector('.error-message'),
      ]);

      if (await this.hasError()) {
        throw new LoginFailedError(await this.getErrorMessage());
      }
    } catch (error) {
      throw new NavigationError('Failed to verify login result', { cause: error });
    }
  }
}
```

**Usage Example:**
```typescript
const loginPage = new LoginPage(page);

try {
  await loginPage.goto();
  await loginPage.login(username, password);
  expect(await loginPage.isDashboardVisible()).toBe(true);
} catch (error) {
  if (error instanceof LoginFailedError) {
    logger.warn('Login failed:', error.message);
    // Handle invalid credentials
  } else if (error instanceof LoginTimeoutError) {
    logger.error('Login timed out:', error.message);
    // Handle timeout scenario
  } else {
    logger.error('Unexpected error during login:', error);
    throw error;
  }
}
```

### API Testing

#### BaseApiClient
Base class for API clients with request handling and interceptors.

```typescript
import { BaseApiClient } from '@core/api';

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

class UserApiClient extends BaseApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }

  // Methods
  async get<T>(url: string, config?: RequestConfig): Promise<T>;
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  async delete<T>(url: string, config?: RequestConfig): Promise<T>;
}
```

**Error Handling Example:**
```typescript
class UserApiClient extends BaseApiClient {
  async createUser(data: CreateUserDto): Promise<User> {
    try {
      const response = await this.post<User>('/users', data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.statusCode) {
          case 400:
            throw new ValidationError('Invalid user data', error.details);
          case 409:
            throw new DuplicateError('User already exists', { email: data.email });
          case 403:
            throw new PermissionError('Not authorized to create users');
          default:
            throw new ApiError(`Failed to create user: ${error.message}`, error.statusCode);
        }
      }
      throw new UnexpectedError('User creation failed', { cause: error });
    }
  }

  async getUser(id: string): Promise<User> {
    return this.withRetry(
      async () => {
        const response = await this.get<User>(`/users/${id}`);
        return response;
      },
      {
        maxRetries: 3,
        retryCondition: (error) => error instanceof NetworkError,
        onRetry: (error, attempt) => {
          logger.warn(`Retrying getUser (${attempt}/3)`, { error, userId: id });
        },
      }
    );
  }
}
```

**Usage Example:**
```typescript
const userApi = new UserApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
});

try {
  const user = await userApi.createUser({
    name: 'John Doe',
    email: 'john@example.com',
  });
  logger.info('User created:', user);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Invalid user data:', error.details);
    // Handle validation failure
  } else if (error instanceof DuplicateError) {
    logger.warn('User already exists:', error.details);
    // Handle duplicate user
  } else {
    logger.error('Failed to create user:', error);
    throw error;
  }
}
```

### Common Use Cases

#### Authentication Flows

1. **Basic Authentication**
```typescript
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: AuthType.Basic,
    username: 'user',
    password: 'pass',
  },
});
```

2. **OAuth Authentication**
```typescript
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: AuthType.OAuth,
    tokenProvider: async () => {
      const token = await getOAuthToken();
      return token;
    },
    onTokenExpired: async () => {
      await refreshToken();
    },
  },
});
```

3. **API Key Authentication**
```typescript
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: AuthType.ApiKey,
    keyName: 'X-API-Key',
    keyValue: process.env.API_KEY,
    keyLocation: 'header',
  },
});
```

#### Data Management

1. **Creating Test Data**
```typescript
const userFactory = new TestDataFactory<User>({
  entity: 'User',
  defaultData: {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    role: 'user',
  },
  cleanup: 'afterTest',
});

const user = await userFactory.create();
const users = await userFactory.createMany(5);
```

2. **Database Operations**
```typescript
const db = new DatabaseClient();

await db.transaction(async (tx) => {
  const user = await tx.users.create({
    data: userData,
  });

  await tx.profiles.create({
    data: {
      userId: user.id,
      ...profileData,
    },
  });
});
```

3. **Data Cleanup**
```typescript
const cleanup = new CleanupUtility();

await cleanup.register([
  {
    table: 'users',
    strategy: 'soft-delete',
    condition: { createdAt: { lt: oneHourAgo } },
  },
  {
    table: 'profiles',
    strategy: 'cascade',
    reference: 'users',
  },
]);

await cleanup.execute();
```

### 4. Performance Testing

#### PerformanceTestRunner
Executes k6 performance tests.

```typescript
import { PerformanceTestRunner } from '@core/performance';

interface PerformanceTestConfig {
  script: string;
  vus?: number;
  duration?: string;
  thresholds?: Record<string, string>;
}

class PerformanceTestRunner {
  // Methods
  async run(config: PerformanceTestConfig): Promise<TestResult>;
  async generateReport(result: TestResult): Promise<void>;
  async validateThresholds(result: TestResult): Promise<boolean>;
}
```

#### K6ScriptGenerator
Generates k6 test scripts.

```typescript
import { K6ScriptGenerator } from '@core/performance';

interface K6ScriptOptions {
  vus?: number;
  duration?: string;
  thresholds?: Record<string, string>;
  scenarios?: Record<string, any>;
}

class K6ScriptGenerator {
  // Methods
  generateScript(options: K6ScriptOptions): string;
  addScenario(name: string, config: ScenarioConfig): void;
  addThreshold(metric: string, condition: string): void;
}
```

### 5. Security Testing

#### SecurityScanner
Integrates with OWASP ZAP for security testing.

```typescript
import { SecurityScanner } from '@core/security';

interface ScanConfig {
  target: string;
  policy?: string;
  maxDuration?: number;
  authentication?: AuthConfig;
}

class SecurityScanner {
  // Methods
  async runBaseline(config: ScanConfig): Promise<ScanResult>;
  async runFullScan(config: ScanConfig): Promise<ScanResult>;
  async generateReport(result: ScanResult): Promise<void>;
  async validateFindings(result: ScanResult): Promise<boolean>;
}
```

### 6. Reporting

#### ReportGenerator
Generates test execution reports.

```typescript
import { ReportGenerator } from '@core/reporter';

interface ReportConfig {
  title: string;
  outputDir: string;
  attachments?: {
    screenshots?: boolean;
    videos?: boolean;
    traces?: boolean;
  };
}

class ReportGenerator {
  // Methods
  async generate(results: TestResult[], config: ReportConfig): Promise<void>;
  async attachScreenshot(testId: string, path: string): Promise<void>;
  async attachVideo(testId: string, path: string): Promise<void>;
}
```

### 7. Utilities

#### Logger
Centralized logging utility.

```typescript
import { logger } from '@core/utils';

interface LogConfig {
  level: string;
  file?: string;
  console?: boolean;
}

class Logger {
  // Methods
  error(message: string, error?: Error): void;
  warn(message: string, data?: any): void;
  info(message: string, data?: any): void;
  debug(message: string, data?: any): void;
  trace(message: string, data?: any): void;
}
```

#### TestDataFactory
Creates test data using factories.

```typescript
import { TestDataFactory } from '@core/utils';

interface FactoryConfig<T> {
  entity: string;
  attributes: () => Partial<T>;
  afterCreate?: (entity: T) => Promise<void>;
}

class TestDataFactory {
  // Methods
  define<T>(config: FactoryConfig<T>): Factory<T>;
  createMany<T>(factory: Factory<T>, count: number): Promise<T[]>;
  cleanup(): Promise<void>;
}
```

#### ConfigManager
Manages test configuration.

```typescript
import { ConfigManager } from '@core/utils';

interface Config {
  env: string;
  baseUrl: string;
  timeout: number;
  retries: number;
}

class ConfigManager {
  // Methods
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  load(path: string): void;
  validate(): boolean;
}
```

## Common Use Cases

### Authentication Flows

1. **Basic Authentication**
```typescript
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: AuthType.Basic,
    username: 'user',
    password: 'pass',
  },
});
```

2. **OAuth Authentication**
```typescript
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: AuthType.OAuth,
    tokenProvider: async () => {
      const token = await getOAuthToken();
      return token;
    },
    onTokenExpired: async () => {
      await refreshToken();
    },
  },
});
```

3. **API Key Authentication**
```typescript
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: AuthType.ApiKey,
    keyName: 'X-API-Key',
    keyValue: process.env.API_KEY,
    keyLocation: 'header',
  },
});
```

### Data Management

export class LoginPage extends BasePageObject {
  // Locators
  private usernameInput = this.page.getByLabel('Username');
  private passwordInput = this.page.getByLabel('Password');
  private loginButton = this.page.getByRole('button', { name: 'Login' });

  // Actions
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  // Assertions
  async expectLoginError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
```

### 2. Making API Requests

```typescript
import { BaseApiClient } from '@core/api';

export class UserApi extends BaseApiClient {
  async getUser(id: string) {
    return this.get<User>(`/users/${id}`);
  }

  async createUser(data: CreateUserDto) {
    return this.post<User>('/users', data);
  }

  async updateUser(id: string, data: UpdateUserDto) {
    return this.put<User>(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.delete<void>(`/users/${id}`);
  }
}
```

### 3. Database Operations

```typescript
import { DatabaseClient, TransactionManager } from '@core/db';

async function createUserWithProfile(userData: UserData, profileData: ProfileData) {
  const tx = await TransactionManager.getInstance();

  try {
    await tx.executeInTransaction(async (client) => {
      const user = await client.executeQuery(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
        [userData.name, userData.email]
      );

      await client.executeQuery(
        'INSERT INTO profiles (user_id, bio) VALUES ($1, $2)',
        [user.id, profileData.bio]
      );
    });
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
```

### 4. Performance Testing

```typescript
import { PerformanceTestRunner, K6ScriptGenerator } from '@core/performance';

async function runLoadTest() {
  const generator = new K6ScriptGenerator();
  const script = generator.generateScript({
    vus: 10,
    duration: '30s',
    thresholds: {
      'http_req_duration': ['p(95)<500'],
      'http_req_failed': ['rate<0.01'],
    },
  });

  const runner = new PerformanceTestRunner();
  const result = await runner.run({
    script,
    outputDir: './performance-results',
  });

  await runner.generateReport(result);
}
```

### 5. Security Testing

```typescript
import { SecurityScanner } from '@core/security';

async function runSecurityScan() {
  const scanner = new SecurityScanner();
  const result = await scanner.runBaseline({
    target: 'https://your-app.com',
    authentication: {
      type: 'bearer',
      token: 'your-auth-token',
    },
  });

  await scanner.generateReport(result);
  const isSecure = await scanner.validateFindings(result);
}
```

### 6. Generating Reports

```typescript
import { ReportGenerator } from '@core/reporter';

async function generateTestReport(results: TestResult[]) {
  const generator = new ReportGenerator();
  await generator.generate(results, {
    title: 'Test Execution Report',
    outputDir: './reports',
    attachments: {
      screenshots: true,
      videos: true,
      traces: false,
    },
  });
}
```

## Best Practices

1. **Error Handling**
   - Always use try-catch blocks
   - Log errors with context
   - Implement proper cleanup
   - Use custom error classes

2. **Performance**
   - Implement caching where appropriate
   - Use connection pooling
   - Optimize database queries
   - Monitor resource usage

3. **Security**
   - Validate input data
   - Sanitize output
   - Use secure credentials
   - Implement proper authentication

4. **Maintainability**
   - Follow naming conventions
   - Document public APIs
   - Write unit tests
   - Keep components focused
