import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import unicorn from 'eslint-plugin-unicorn';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        globalThis: 'readonly',
        abort: 'readonly',
        require: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unicorn': unicorn
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-debugger': 'warn',
      
      // Unicorn rules - using recommended config with customizations for Node.js project
      ...unicorn.configs.recommended.rules,
      'unicorn/filename-case': 'off',
      'unicorn/no-console-spaces': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/prefer-modern-dom-apis': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/import-style': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/no-unnecessary-array-flat-depth': 'off',
      'unicorn/consistent-function-scoping': 'off'
    }
  },
  {
    files: ['src/**/*.test.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.test.json'
      },
              globals: {
          console: 'readonly',
          process: 'readonly',
          Buffer: 'readonly',
          globalThis: 'readonly',
          abort: 'readonly',
          require: 'readonly',
          jest: 'readonly',
          describe: 'readonly',
          it: 'readonly',
          test: 'readonly',
          expect: 'readonly',
          beforeEach: 'readonly',
          afterEach: 'readonly',
          beforeAll: 'readonly',
          afterAll: 'readonly',
          setTimeout: 'readonly',
          clearTimeout: 'readonly',
          setInterval: 'readonly',
          clearInterval: 'readonly'
        }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unicorn': unicorn
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-debugger': 'warn',
      
      // Unicorn rules - using recommended config with customizations for Node.js project
      ...unicorn.configs.recommended.rules,
      'unicorn/filename-case': 'off',
      'unicorn/no-console-spaces': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/prefer-modern-dom-apis': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/import-style': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/no-unnecessary-array-flat-depth': 'off',
      'unicorn/consistent-function-scoping': 'off'
    }
  },
  {
    ignores: [
      'dist/',
      'dist-package/',
      'node_modules/',
      '*.js'
    ]
  }
]; 