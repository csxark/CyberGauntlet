# Testing Infrastructure Documentation

## Overview

CyberGauntlet uses **Vitest** as the testing framework along with **React Testing Library** for component testing. This provides a fast, modern testing experience that integrates seamlessly with Vite.

## Running Tests

### Available Commands

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
src/
├── __tests__/              # General utility tests
│   ├── challengeLogic.test.ts
│   └── utils.test.ts
├── components/
│   └── __tests__/          # Component tests
│       ├── AuthPage.test.tsx
│       └── GlitchText.test.tsx
├── data/
│   └── __tests__/          # Data layer tests
│       └── teamData.test.ts
└── test/
    ├── setup.ts            # Test setup and configuration
    └── utils/
        └── testUtils.tsx   # Shared test utilities
```

## Writing Tests

### Component Testing Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Unit Testing Example

```typescript
import { describe, it, expect } from "vitest";
import { validateTeam } from "../teamData";

describe("validateTeam", () => {
  it("should validate correct credentials", () => {
    const result = validateTeam("Parallax", "Madhav Agarwal");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("Parallax");
  });

  it("should return null for invalid credentials", () => {
    const result = validateTeam("Invalid", "Invalid");
    expect(result).toBeNull();
  });
});
```

## Test Coverage

Generate a coverage report:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory:

- `coverage/index.html` - HTML report (open in browser)
- `coverage/lcov.info` - LCOV format (for CI tools)

### Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `feature-and-fixes` branches
- Pull requests to `main`

See `.github/workflows/ci.yml` for configuration.

## Testing Best Practices

### 1. Test Behavior, Not Implementation

✅ **Good:**

```typescript
it("should show error for invalid credentials", async () => {
  // ...
  expect(screen.getByText(/invalid/i)).toBeInTheDocument();
});
```

❌ **Bad:**

```typescript
it("should set error state to true", () => {
  // Testing internal state
});
```

### 2. Use Descriptive Test Names

✅ **Good:**

```typescript
it("should disable submit button during loading");
```

❌ **Bad:**

```typescript
it("test button");
```

### 3. Follow AAA Pattern

- **Arrange**: Set up test data
- **Act**: Perform action
- **Assert**: Verify result

```typescript
it("should validate team credentials", () => {
  // Arrange
  const teamName = "Parallax";
  const leaderName = "Madhav Agarwal";

  // Act
  const result = validateTeam(teamName, leaderName);

  // Assert
  expect(result).not.toBeNull();
});
```

### 4. Test Edge Cases

- Empty inputs
- Null/undefined values
- Boundary conditions
- Error states
- Loading states

### 5. Keep Tests Fast

- Mock external dependencies (Supabase, API calls)
- Avoid unnecessary waits
- Use `vi.mock()` for heavy imports

## Mocking

### Mock Functions

```typescript
import { vi } from "vitest";

const mockCallback = vi.fn();
```

### Mock Modules

```typescript
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));
```

### Mock localStorage

localStorage is automatically mocked in `src/test/setup.ts`.

## Debugging Tests

### Run a Single Test

```bash
npm test -- teamData.test.ts
```

### Run Tests in UI Mode

```bash
npm run test:ui
```

This opens an interactive UI where you can:

- View test results
- Debug failing tests
- See coverage in real-time

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:run"],
  "console": "integratedTerminal"
}
```

## Common Issues

### Issue: `toBeInTheDocument` not found

**Solution**: Ensure `@testing-library/jest-dom` is imported in setup:

```typescript
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);
```

### Issue: Tests timeout

**Solution**: Increase timeout in test:

```typescript
it(
  "slow test",
  async () => {
    // ...
  },
  { timeout: 10000 },
);
```

### Issue: Async operations not completing

**Solution**: Use `waitFor`:

```typescript
import { waitFor } from "@testing-library/react";

await waitFor(() => {
  expect(screen.getByText("Done")).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Aim for 80%+ coverage
3. Test edge cases
4. Update this documentation if needed
