import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['node_modules/', '.features-gen/', 'playwright-report/', 'test-results/', '.auth/'],
  },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Playwright plugin rules — scoped to test files
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Prevent fixed waits — Salesforce tests must use element-based waits
      'playwright/no-wait-for-timeout': 'error',
      // playwright-bdd steps use expect() outside test() blocks — this is expected
      'playwright/no-standalone-expect': 'off',
    },
  },

  // Relax rules for auth.setup.ts — conditionals and page.pause() are deliberate
  {
    files: ['tests/auth.setup.ts'],
    rules: {
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/no-page-pause': 'off',
    },
  },

  // Custom rules for TypeScript files
  {
    files: ['**/*.ts'],
    rules: {
      // Allow unused vars prefixed with _ (common in Playwright fixtures)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Allow non-null assertions (common with process.env.VAR!)
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Warn on explicit any — push toward typed code
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow require() — project uses "type": "commonjs"
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Prettier must be last — disables conflicting formatting rules
  prettier,
);
