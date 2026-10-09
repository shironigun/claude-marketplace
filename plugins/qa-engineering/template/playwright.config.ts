import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env (base URLs, credentials, webhooks). Never committed — see .gitignore.
dotenv.config({ path: path.resolve(__dirname, '.env') });

// One id per run, shared by every worker (workers inherit the runner's environment).
// CI should set AUTOMATION_RUN_ID (e.g. the build id). Seed names carry it so `sweep`
// can find exactly this run's leftovers.
process.env.AUTOMATION_RUN_ID ??= `local${Date.now()}`;

// Active profile — set via AUTOMATION_PROFILE (default: 'default').
const profile = process.env.AUTOMATION_PROFILE ?? 'default';

// playwright.dev/docs/ci: 1 worker on CI for stability; auto-detect locally. Override with PW_WORKERS.
const workers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : process.env.CI ? 1 : undefined;

// Per-profile storageState file for UI browser auth (written by the auth-setup project).
// Pointing `storageState` at a file that does not exist is a hard error, so an API-only
// workspace (where auth-setup skips) falls back to no stored state.
const authFile = path.resolve(__dirname, `playwright/.auth/${profile}.json`);
const storageState = fs.existsSync(authFile) ? authFile : undefined;

export default defineConfig({
  testDir: path.resolve(__dirname, 'modules'),
  outputDir: path.resolve(__dirname, 'reports/test-results'),

  fullyParallel: true,                       // every test creates and cleans its own data
  forbidOnly: !!process.env.CI,              // a stray test.only must never pass CI
  retries: process.env.CI ? 2 : 0,           // 2 retries → flaky and broken are distinguishable
  workers,                                   // CI: 1 (or PW_WORKERS); local: auto-detect
  timeout: 30_000,

  use: {
    trace: 'on-first-retry',                 // the only way to debug a CI-only failure
  },

  reporter: [
    ['list'],
    ['html',  { outputFolder: path.resolve(__dirname, 'reports/html'), open: 'never' }],
    ['junit', { outputFile:   path.resolve(__dirname, 'reports/junit.xml') }],
    ['json',  { outputFile:   path.resolve(__dirname, 'reports/results.json') }],
    // Allure is optional: producing results needs no Java, only `npm run report:allure` does.
    // Drop this line and the three allure-* devDependencies if you do not want it.
    ['allure-playwright', {
      detail: true,
      resultsDir: path.resolve(__dirname, 'reports/allure-results'),
      suiteTitle: true,
      environmentInfo: {
        Profile:    profile,
        ApiBaseUrl: process.env.API_BASE_URL ?? '',
        WebAppUrl:  process.env.WEB_APP_URL ?? '',
        Branch:     process.env.BUILD_SOURCEBRANCH ?? process.env.GITHUB_REF ?? 'local',
        BuildId:    process.env.BUILD_BUILDID ?? process.env.GITHUB_RUN_ID ?? 'local',
      },
    }],
  ],

  projects: [
    // ── Run-level setup/teardown (playwright.dev/docs/test-global-setup-teardown) ──
    // auth-check mints the API token once and fails fast with a readable error if login
    // is broken. Its teardown, `sweep`, removes seed resources from THIS run that worker
    // teardown missed (crash, kill, timeout). Shared seed data itself is created lazily by
    // worker fixtures in modules/<m>/fixtures.ts — only when a test asks for it.
    {
      name: 'auth-check',
      testDir: path.resolve(__dirname, 'common/setup'),
      testMatch: 'auth-check.setup.ts',
      teardown: 'sweep',
    },
    {
      name: 'sweep',
      testDir: path.resolve(__dirname, 'common/setup'),
      testMatch: 'sweep.teardown.ts',
      timeout: 120_000,
    },
    {
      name: 'auth-setup',
      testDir: path.resolve(__dirname, 'common/setup'),
      testMatch: 'auth.setup.ts',
      timeout: 90_000,                       // an SPA login form needs time to render
      use: { ...devices['Desktop Chrome'] },
    },

    // ── API projects (request-only, no browser) ──────────────────────────────
    {
      name: 'contracts',                     // response shape vs Zod schema
      testMatch: '**/api/tests/contracts/**/*.spec.ts',
      dependencies: ['auth-check'],
      timeout: 30_000,
    },
    {
      name: 'endpoints',                     // one operation, one condition
      testMatch: '**/api/tests/endpoints/**/*.spec.ts',
      dependencies: ['auth-check'],
      timeout: 30_000,
    },
    {
      name: 'workflows',                     // multi-step business journeys
      testMatch: '**/api/tests/workflows/**/*.spec.ts',
      dependencies: ['auth-check'],
      timeout: 60_000,
    },

    // ── UI projects (Chromium, pre-authenticated via storageState) ───────────
    // Scaffolded and ready. They match zero specs until you add files under
    // modules/<module>/ui/tests/<level>/ — the folder IS the level.
    {
      name: 'ui-smoke',
      testMatch: '**/ui/tests/smoke/**/*.spec.ts',
      dependencies: ['auth-setup'],
      timeout: 60_000,
      use: {
        ...devices['Desktop Chrome'],
        storageState,
        baseURL: process.env.WEB_APP_URL,
      },
    },
    {
      name: 'ui-regression',
      testMatch: '**/ui/tests/regression/**/*.spec.ts',
      dependencies: ['auth-setup'],
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        storageState,
        baseURL: process.env.WEB_APP_URL,
      },
    },
    {
      name: 'ui-e2e',
      testMatch: '**/ui/tests/e2e/**/*.spec.ts',
      dependencies: ['auth-setup'],
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        storageState,
        baseURL: process.env.WEB_APP_URL,
      },
    },
  ],
});
