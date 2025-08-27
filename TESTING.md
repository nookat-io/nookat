# Testing Infrastructure

This document describes the comprehensive testing infrastructure implemented for the Nookat application.

## Overview

The testing infrastructure includes:

- **Unit Testing**: Jest + React Testing Library for component and utility testing
- **Integration Testing**: Playwright for end-to-end testing
- **Visual Regression Testing**: Automated screenshot comparison
- **CI/CD Integration**: Automated testing in GitHub Actions
- **Test Coverage**: 80%+ coverage requirements with reporting

## Quick Start

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all tests (unit + E2E)
npm run test:all
```

### Installing Dependencies

```bash
# Install testing dependencies
npm install

# Install Playwright browsers
npm run test:e2e:install
```

## Test Structure

```
src/
├── __tests__/           # App-level tests
├── components/
│   └── ui/
│       └── __tests__/  # Component tests
├── hooks/
│   └── __tests__/      # Hook tests
├── lib/
│   └── __tests__/      # Utility tests
└── test/               # Test utilities and setup
    ├── setup.ts        # Jest setup
    ├── test-utils.tsx  # Custom render functions
    └── test-config.ts  # Test configuration

e2e/                    # End-to-end tests
├── global-setup.ts     # Playwright global setup
├── global-teardown.ts  # Playwright global teardown
├── navigation.spec.ts  # Navigation tests
├── containers.spec.ts  # Container page tests
└── visual.spec.ts      # Visual regression tests
```

## Unit Testing

### Jest Configuration

The Jest configuration (`jest.config.ts`) includes:

- TypeScript support with `ts-jest`
- React Testing Library setup
- Coverage thresholds (80% minimum)
- Custom module mapping for `@/` imports
- Test environment configuration

### Test Utilities

Custom test utilities (`src/test/test-utils.tsx`) provide:

- Wrapped render function with all providers
- Mock implementations for external dependencies
- Test data factories
- Custom matchers and helpers

### Writing Unit Tests

```tsx
import { render, screen } from '@/test/test-utils';
import { Button } from '../button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Hooks

```tsx
import { renderHook, act } from '@testing-library/react';
import { useThemeContext } from '../use-theme-context';
import { ThemeProvider } from '@/contexts/theme-context';

describe('useThemeContext', () => {
  it('should return theme context', () => {
    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBeDefined();
  });
});
```

## End-to-End Testing

### Playwright Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device testing
- CI/CD optimization
- Global setup/teardown
- Screenshot and video capture

### Writing E2E Tests

```tsx
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('text=Images');
    await expect(page.locator('h1')).toContainText(/images/i);
  });
});
```

### Visual Regression Testing

Visual tests automatically capture screenshots and compare them:

- Full page screenshots
- Component-specific screenshots
- Responsive design testing
- Theme variation testing

## Test Coverage

### Coverage Requirements

- **Global Coverage**: 80% minimum
- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Statements**: 80% minimum

### Coverage Reports

Coverage reports are generated in multiple formats:

- HTML report in `coverage/` directory
- LCOV format for CI/CD integration
- Console output with summary

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test.yml` workflow:

- Runs on push to main/develop branches
- Executes unit tests, E2E tests, and visual tests
- Uploads coverage reports to Codecov
- Provides test result summaries
- Stores test artifacts

### CI/CD Pipeline

1. **Unit Tests**: Jest tests with coverage
2. **E2E Tests**: Playwright tests across browsers
3. **Visual Tests**: Screenshot comparison tests
4. **Test Summary**: Consolidated results

## Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### Mocking

- Mock external dependencies (APIs, services)
- Use test data factories for consistent data
- Mock browser APIs (ResizeObserver, IntersectionObserver)
- Avoid mocking implementation details

### Accessibility Testing

- Test with screen readers
- Verify ARIA attributes
- Test keyboard navigation
- Ensure proper landmarks and roles

### Performance Testing

- Monitor test execution time
- Use test timeouts appropriately
- Optimize slow tests
- Parallel test execution where possible

## Troubleshooting

### Common Issues

1. **Module Resolution**: Ensure `@/` imports are properly mapped
2. **Provider Wrapping**: Use custom render function for components with context
3. **Async Operations**: Use `waitFor` for asynchronous operations
4. **Mock Setup**: Verify mocks are properly configured

### Debug Mode

```bash
# Debug Jest tests
npm run test:watch -- --verbose

# Debug Playwright tests
npm run test:e2e:debug

# Run specific test files
npm test -- --testPathPattern=button
```

## Future Enhancements

- [ ] Test generation tools
- [ ] Performance benchmarking
- [ ] Accessibility testing automation
- [ ] Cross-browser visual testing
- [ ] Test data management system
- [ ] Test result analytics

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
