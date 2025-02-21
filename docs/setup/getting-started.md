# Getting Started Guide

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Documentation](https://img.shields.io/badge/documentation-complete-green.svg)

[← Back to Documentation Index](../README.md)

**Last Updated:** 2024-02-20
**Document Version:** 0.1.0
**Framework Version:** 0.1.0

**Quick Links:**
- [Architecture Guide](../architecture/framework-architecture.md)
- [API Reference](../api-docs/api-reference.md)
- [Best Practices](../best-practices/coding-standards.md)

**Table of Contents:**
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Setup](#environment-setup)
  - [Test Configuration](#test-configuration)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
  - [E2E Tests](#e2e-tests)
  - [API Tests](#api-tests)
  - [Performance Tests](#performance-tests)
  - [Security Tests](#security-tests)
- [Viewing Reports](#viewing-reports)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Prerequisites

### System Requirements

| Component | Minimum  | Recommended |
| --------- | -------- | ----------- |
| CPU       | 2 cores  | 4+ cores    |
| RAM       | 4GB      | 8GB+        |
| Storage   | 1GB free | 5GB+ free   |
| Display   | 1366x768 | 1920x1080   |

### Required Software

| Software     | Version | Notes                                 |
| ------------ | ------- | ------------------------------------- |
| Node.js      | v20.x+  | LTS version recommended               |
| npm          | v10.x+  | Included with Node.js                 |
| Git          | v2.x+   | Latest stable version                 |
| Docker       | v24.x+  | Optional, for containerized execution |
| Java Runtime | v11+    | Required for Allure reporting         |

### Browser Support

| Browser  | Version           | Headless Support |
| -------- | ----------------- | ---------------- |
| Chromium | Latest            | ✅                |
| Firefox  | Latest            | ✅                |
| WebKit   | Latest            | ✅                |
| Chrome   | Latest 3 versions | ✅                |
| Edge     | Latest 3 versions | ✅                |
| Safari   | Latest 2 versions | ✅                |

### Operating System Compatibility

| OS          | Version              | Support Level |
| ----------- | -------------------- | ------------- |
| Windows     | 10, 11               | Full          |
| macOS       | 12+ (Intel)          | Full          |
| macOS       | 12+ (Apple Silicon)  | Full          |
| Ubuntu      | 20.04, 22.04         | Full          |
| Other Linux | Modern distributions | Partial       |

### IDE Recommendations

| IDE      | Extensions                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| VS Code  | - Playwright Test for VSCode<br>- ESLint<br>- Prettier<br>- TypeScript Tooling |
| WebStorm | - Playwright<br>- ESLint<br>- Prettier                                         |

### Network Requirements

- Stable internet connection (5+ Mbps)
- Access to npm registry (registry.npmjs.org)
- Access to Playwright browser downloads
- Access to Docker Hub (if using Docker)
- Access to target application environment

### Additional Tools

#### Required
- **Git**: Version control
- **Node.js**: Runtime environment
- **npm**: Package management

#### Optional
- **Docker**: Containerized execution
- **k6**: Performance testing
- **OWASP ZAP**: Security testing
- **Allure**: Test reporting

### Environment Variables

Ensure your system has the following environment variables set:

```bash
# Path Configuration
PATH should include:
- Node.js installation directory
- npm global packages directory
- Java installation directory (for Allure)
- Docker installation directory (if using)

# Proxy Configuration (if behind corporate proxy)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1

# Optional Performance Testing
K6_CLOUD_TOKEN=your-k6-cloud-token

# Optional Security Testing
ZAP_API_KEY=your-zap-api-key
```

### Firewall Requirements

Ensure the following ports are open:

| Port | Protocol | Usage                           |
| ---- | -------- | ------------------------------- |
| 443  | HTTPS    | npm registry, browser downloads |
| 80   | HTTP     | Fallback for downloads          |
| 3000 | TCP      | Default local development       |
| 9323 | TCP      | Allure reporting                |
| 8080 | TCP      | OWASP ZAP proxy                 |

### System Preparation Checklist

1. **System Updates**
   - [ ] Operating system up to date
   - [ ] Development tools updated
   - [ ] Security patches installed

2. **Software Installation**
   - [ ] Node.js and npm installed
   - [ ] Git installed and configured
   - [ ] Docker installed (if using)
   - [ ] Java Runtime installed

3. **Network Configuration**
   - [ ] Internet access verified
   - [ ] Proxy settings configured (if needed)
   - [ ] Firewall rules updated

4. **IDE Setup**
   - [ ] IDE installed and configured
   - [ ] Required extensions installed
   - [ ] Code formatting rules applied

5. **Security Configuration**
   - [ ] Git credentials configured
   - [ ] npm registry access verified
   - [ ] Docker registry access verified

### Troubleshooting Prerequisites

#### Common Issues

1. **Node.js Installation**
   ```bash
   # Verify installation
   node --version
   npm --version

   # Common fix for permission issues
   sudo chown -R $USER ~/.npm
   ```

2. **Docker Issues**
   ```bash
   # Verify Docker installation
   docker --version
   docker run hello-world

   # Common fix for permission issues
   sudo usermod -aG docker $USER
   ```

3. **Java Installation**
   ```bash
   # Verify Java installation
   java -version

   # Set JAVA_HOME
   export JAVA_HOME=/path/to/java
   ```

#### Support Resources

- [Node.js Documentation](https://nodejs.org/docs)
- [Docker Documentation](https://docs.docker.com)
- [Playwright Documentation](https://playwright.dev/docs)
- [Framework Issues](https://github.com/your-repo/issues)

## Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright Browsers**
   ```bash
   npx playwright install --with-deps
   ```

4. **Install Additional Tools**
   ```bash
   # Install Allure CLI
   npm install -g allure-commandline

   # Install k6 (for performance testing)
   npm install -g k6

   # Pull OWASP ZAP Docker image (for security testing)
   docker pull owasp/zap2docker-stable:2.14.0
   ```

## Configuration

### Environment Setup

1. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Configure Environment Variables**
   ```env
   # Base URLs
   BASE_URL=https://your-app.com
   API_BASE_URL=https://api.your-app.com

   # Authentication
   AUTH_USERNAME=your-username
   AUTH_PASSWORD=your-password
   AUTH_TOKEN=your-auth-token

   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname

   # Test Configuration
   HEADLESS=true
   BROWSER=chromium
   VIEWPORT_WIDTH=1920
   VIEWPORT_HEIGHT=1080

   # Reporting
   ALLURE_RESULTS_DIR=allure-results
   SCREENSHOT_ON_FAILURE=true
   VIDEO_ON_FAILURE=true

   # Logging
   LOG_LEVEL=info
   LOG_TO_FILE=true
   LOG_FILE_PATH=logs/test-automation.log

   # Performance Testing
   K6_CLOUD_TOKEN=your-k6-cloud-token
   VUS=10
   DURATION=30s

   # Security Testing
   ZAP_API_KEY=your-zap-api-key
   ```

### Test Configuration

1. **Configure Browser Settings** (`playwright.config.ts`)
   ```typescript
   import { PlaywrightTestConfig } from '@playwright/test';

   const config: PlaywrightTestConfig = {
     testDir: './tests',
     timeout: 30000,
     retries: 2,
     workers: 4,
     use: {
       baseURL: process.env.BASE_URL,
       screenshot: 'only-on-failure',
       video: 'retain-on-failure',
       trace: 'retain-on-failure',
     },
     reporter: [
       ['list'],
       ['allure-playwright'],
       ['html'],
     ],
   };

   export default config;
   ```

2. **Configure Test Data** (`test-data.config.ts`)
   ```typescript
   export const testData = {
     users: {
       admin: {
         username: process.env.AUTH_USERNAME,
         password: process.env.AUTH_PASSWORD,
       },
     },
     api: {
       baseUrl: process.env.API_BASE_URL,
       timeout: 30000,
     },
   };
   ```

## Project Structure

```
├── src/
│   ├── core/           # Framework core
│   ├── pages/          # Page objects
│   ├── api/            # API clients
│   └── utils/          # Utilities
├── tests/
│   ├── e2e/           # E2E tests
│   ├── api/           # API tests
│   └── performance/   # Performance tests
├── config/            # Configuration files
├── docs/             # Documentation
└── reports/          # Test reports
```

## Running Tests

### E2E Tests

1. **Run All Tests**
   ```bash
   npm run test
   ```

2. **Run Specific Test File**
   ```bash
   npm run test tests/e2e/login.spec.ts
   ```

3. **Run Tests in Specific Browser**
   ```bash
   npm run test:chrome
   npm run test:firefox
   npm run test:safari
   ```

4. **Run Tests in Parallel**
   ```bash
   npm run test:parallel
   ```

### API Tests

1. **Run API Tests**
   ```bash
   npm run test:api
   ```

2. **Run API Tests with Tags**
   ```bash
   npm run test:api -- --grep @smoke
   ```

### Performance Tests

1. **Run k6 Tests**
   ```bash
   npm run test:performance
   ```

2. **Run Load Test Scenario**
   ```bash
   npm run test:load
   ```

### Security Tests

1. **Run Security Scan**
   ```bash
   npm run test:security
   ```

2. **Generate Security Report**
   ```bash
   npm run security:report
   ```

## Viewing Reports

### Allure Reports

1. **Generate Report**
   ```bash
   npm run report:generate
   ```

2. **Open Report**
   ```bash
   npm run report:open
   ```

### HTML Reports

1. **View Playwright HTML Report**
   ```bash
   npm run report:html
   ```

## Writing Tests

### Page Object Example

```typescript
import { BasePageObject } from '@core/page-objects';

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

### Test Example

```typescript
import { test } from '@playwright/test';
import { LoginPage } from '@pages/login.page';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('successful login', async () => {
    await loginPage.login('user', 'password');
    await loginPage.expectDashboard();
  });
});
```

## Best Practices

1. **Test Organization**
   - Group related tests in describe blocks
   - Use meaningful test names
   - Keep tests independent
   - Clean up test data

2. **Page Objects**
   - Follow single responsibility principle
   - Use meaningful names for elements
   - Implement reusable actions
   - Add proper error handling

3. **Test Data**
   - Use factories for test data
   - Clean up after tests
   - Don't share state between tests
   - Use meaningful test data

4. **Assertions**
   - Use explicit assertions
   - Add meaningful error messages
   - Check for positive and negative cases
   - Verify state changes

## Troubleshooting

### Common Issues

1. **Tests are Flaky**
   - Increase timeouts
   - Add proper waits
   - Check element stability
   - Use retry mechanisms

2. **Browser Launch Fails**
   - Update Playwright
   - Reinstall browsers
   - Check system requirements
   - Verify dependencies

3. **Reports Not Generating**
   - Check Allure installation
   - Verify results directory
   - Update report configuration
   - Check file permissions

### Getting Help

1. **Documentation**
   - Check framework documentation
   - Review Playwright docs
   - Search known issues
   - Read troubleshooting guides

2. **Support**
   - Open GitHub issues
   - Contact team leads
   - Check discussion forums
   - Review pull requests

## Next Steps

1. **Learn More**
   - Review architecture docs
   - Study example tests
   - Explore advanced features
   - Practice writing tests

2. **Contribute**
   - Follow coding standards
   - Write documentation
   - Add test coverage
   - Submit pull requests
