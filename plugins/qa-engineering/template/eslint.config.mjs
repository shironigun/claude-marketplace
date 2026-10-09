// @ts-check
import tseslint from 'typescript-eslint';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // The two rules that actually matter for Playwright — an unawaited assertion
      // silently passes, which is the worst possible failure mode for a test suite.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Typed code — no silent `any` bypass in fixtures, services or builders.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Deliberate patterns in test infrastructure.
      '@typescript-eslint/no-empty-function': 'off',     // empty catch in best-effort teardown
      '@typescript-eslint/no-require-imports': 'off',    // optional-dependency require()
      '@typescript-eslint/no-non-null-assertion': 'off', // `created!.id` after an expect()

      // Response bodies are `unknown` by nature; the schemas are what type them.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    // Config, setup projects and CLI scripts print to the console on purpose —
    // that output is the diagnostic. Explicit `off` so enabling `no-console`
    // repo-wide later does not turn them all red.
    files: [
      'playwright.config.ts',
      'config/**/*.ts',
      'common/setup/**/*.ts',
      'scripts/**/*.ts',
      'pipelines/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'reports/**', 'playwright/.auth/**'],
  },
);
