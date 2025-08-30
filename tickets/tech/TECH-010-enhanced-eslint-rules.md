# [TECH-010] Implement enhanced ESLint rules and code quality

## Overview

Implement enhanced ESLint configuration with stricter rules, additional plugins, and improved code quality enforcement to catch potential bugs and enforce consistent coding standards.

## Description

The current ESLint configuration needs to be enhanced with stricter rules, additional plugins, and improved code quality enforcement. We need to implement comprehensive linting rules, TypeScript-specific rules, React-specific rules, and performance-focused rules.

## Technical Requirements

### Enhanced ESLint Rules

- Implement stricter TypeScript rules
- Add comprehensive React rules
- Implement performance-focused rules
- Add accessibility rules
- Implement security-focused rules
- Add import/export validation rules

### Additional ESLint Plugins

- Implement TypeScript ESLint plugin
- Add React Hooks plugin
- Implement React Refresh plugin
- Add Import plugin for import validation
- Implement SonarJS plugin for code quality
- Add Unicorn plugin for modern JavaScript

### Code Quality Rules

- Implement no-explicit-any rule
- Add prefer-nullish-coalescing rule
- Implement prefer-optional-chain rule
- Add no-leaked-render rule
- Implement proper key usage rules
- Add consistent return rules

### Performance and Security Rules

- Implement no-array-constructor rule
- Add prefer-const rule
- Implement no-var rule
- Add prefer-template rule
- Implement security rules
- Add performance optimization rules

## Acceptance Criteria

### Functional Requirements

- [ ] Enhanced ESLint configuration operational
- [ ] All additional plugins integrated
- [ ] Stricter rules enforced
- [ ] TypeScript-specific rules working
- [ ] React-specific rules operational
- [ ] Performance rules implemented
- [ ] Security rules enforced

### Non-Functional Requirements

- [ ] ESLint execution completes within 10 seconds
- [ ] Rule violations reported within 2 seconds
- [ ] Auto-fix operations complete within 5 seconds
- [ ] IDE integration responds within 1 second
- [ ] CI/CD linting completes within 3 minutes

### Quality Requirements

- [ ] Zero critical rule violations
- [ ] 95%+ rule compliance
- [ ] All security rules enforced
- [ ] Performance rules properly configured
- [ ] Accessibility rules implemented

## Technical Implementation

### Enhanced eslint.config.js

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactJsx from 'eslint-plugin-react/jsx';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },

  // Base JavaScript configuration
  {
    extends: [js.configs.recommended],
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // TypeScript configuration
  {
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      sonarjs: sonarjs,
      unicorn: unicorn,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // React specific rules
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/jsx-no-leaked-render': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-pascal-case': 'error',
      'react/jsx-sort-props': [
        'error',
        { callbacksLast: true, shorthandFirst: true },
      ],
      'react/no-array-index-key': 'error',
      'react/no-danger': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-props': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unknown-property': 'error',
      'react/no-unsafe-fragment': 'error',
      'react/self-closing-comp': 'error',
      'react/sort-comp': 'error',
      'react/void-dom-elements-no-children': 'error',

      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',

      // React Refresh rules
      ...reactRefresh.configs.recommended.rules,

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-relative-parent-imports': 'error',

      // SonarJS rules
      ...sonarjs.configs.recommended.rules,
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-one-iteration-loop': 'error',
      'sonarjs/prefer-while': 'error',

      // Unicorn rules
      ...unicorn.configs.recommended.rules,
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-array-every': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-reduce': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-modern-dom-apis': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-query-selector': 'error',
      'unicorn/prefer-reflect-apply': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/prefer-type-error': 'error',

      // Accessibility rules
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-onchange': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',

      // General JavaScript rules
      'no-array-constructor': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-new-object': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-template': 'error',
      'require-await': 'error',
      yoda: 'error',
    },
  },

  // React JSX specific configuration
  {
    files: ['**/*.tsx'],
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  }
);
```

### Package.json Dependencies

```json
{
  "devDependencies": {
    "@eslint/js": "^9.33.0",
    "@typescript-eslint/eslint-plugin": "^8.40.0",
    "@typescript-eslint/parser": "^8.40.0",
    "eslint": "^9.33.0",
    "eslint-plugin-import": "^2.29.1",
    "eslint-plugin-jsx-a11y": "^6.8.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "eslint-plugin-sonarjs": "^0.24.0",
    "eslint-plugin-unicorn": "^58.0.0",
    "globals": "^15.9.0",
    "typescript-eslint": "^8.40.0"
  }
}
```

### ESLint Ignore Configuration

```text
# .eslintignore
dist/
coverage/
node_modules/
build/
.next/
out/
*.min.js
*.bundle.js
```

### Pre-commit Configuration

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

## Dependencies

- Enhanced ESLint configuration
- Additional ESLint plugins
- TypeScript ESLint integration
- React-specific plugins
- Code quality plugins
- Accessibility plugins

## Definition of Done

- [ ] Enhanced ESLint configuration operational
- [ ] All additional plugins integrated
- [ ] Stricter rules enforced
- [ ] Zero critical rule violations
- [ ] Auto-fix functionality working
- [ ] CI/CD integration complete
- [ ] Team training on new rules completed

## Notes

- Implement rules incrementally to avoid overwhelming the team
- Focus on critical rules first, then add additional quality rules
- Monitor rule compliance and adjust as needed
- Consider implementing rule-specific documentation
- Establish code quality guidelines for the team
