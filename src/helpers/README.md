# Test Helpers

This directory contains helper functions and utilities specific to testing.

## Structure

```
helpers/
├── api/            # API test helpers
├── data/           # Test data generation helpers
├── validation/     # Test validation helpers
└── utils/          # General test utilities
```

## Usage

Helpers should be imported and used in test files:

```typescript
import { generateTestData } from '../helpers/data/generator';
import { validateResponse } from '../helpers/validation/api';

const testData = generateTestData();
await validateResponse(response, expectedSchema);
```

## Guidelines

1. Keep helpers simple and focused
2. Document helper functions clearly
3. Use TypeScript for type safety
4. Write unit tests for complex helpers
5. Follow functional programming principles
