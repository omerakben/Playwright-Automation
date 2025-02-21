# Test Fixtures

This directory contains test fixtures that can be used across different test types.

## Structure

```
fixtures/
├── api/            # API test fixtures
├── e2e/            # End-to-end test fixtures
├── performance/    # Performance test fixtures
└── common/         # Common fixtures used across test types
```

## Usage

Fixtures should be imported and used in test files:

```typescript
import { test } from '../fixtures/api.fixture';

test('example test', async ({ api }) => {
  // Test implementation
});
```

## Guidelines

1. Keep fixtures focused and single-purpose
2. Document fixture parameters and usage
3. Handle cleanup in fixture teardown
4. Use TypeScript for type safety
5. Follow naming conventions
