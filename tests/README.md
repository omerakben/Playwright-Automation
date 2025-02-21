# Tests

This directory contains all test files organized by type and functionality.

## Structure

```
tests/
├── e2e/           # End-to-end UI tests
├── api/           # API integration tests
├── performance/   # Performance and load tests
├── security/      # Security and penetration tests
├── accessibility/ # Accessibility compliance tests
├── factories/     # Test data factories
├── fixtures/      # Test fixtures and utilities
├── global.setup.ts    # Global test setup
└── global.teardown.ts # Global test teardown
```

## Test Types

### E2E Tests
End-to-end tests using page objects and UI interactions.
```bash
npm run test:e2e
```

### API Tests
API integration tests using the API client.
```bash
npm run test:api
```

### Performance Tests
Load and stress tests using k6.
```bash
npm run test:perf
```

### Security Tests
Security tests using OWASP ZAP.
```bash
npm run test:security
```

### Accessibility Tests
Accessibility compliance tests.
```bash
npm run test:a11y
```

## Guidelines

1. Organize tests by type and feature
2. Use appropriate fixtures for each test type
3. Follow naming conventions:
   - `*.e2e.spec.ts` for E2E tests
   - `*.api.spec.ts` for API tests
   - `*.perf.spec.ts` for performance tests
   - `*.security.spec.ts` for security tests
   - `*.a11y.spec.ts` for accessibility tests
4. Include proper test documentation
5. Use data factories for test data
6. Clean up test data after tests
