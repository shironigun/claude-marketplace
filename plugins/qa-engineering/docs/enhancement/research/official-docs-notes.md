# Official Docs Research Notes (grounding source for "Framework Standards")

Researched: 2026-10-07. Playwright docs observed at the version shown on playwright.dev on that date (the CI page references `v1.63.0`).

## How to read this file

- Every section lists (1) the exact URL, (2) headline guidance in the docs' words (short quotes, attributed), (3) canonical code idioms, (4) anti-patterns the docs warn against.
- **Verification tag** per section:
  - `[raw]` = the page was fetched with WebFetch **and** its raw HTML/markdown was re-read to confirm the wording and code shown here.
  - `[summary]` = fetched with WebFetch only. That tool returns a model-generated summary of the page, so treat quotes as faithful-but-unverified against the raw page.
- Code is kept product-neutral. Where a snippet is a **generic adaptation** of the docs' shape (placeholder names such as `orders`, `widgets`, `User`), it is labelled so. Do not cite an adapted snippet as verbatim Playwright text.
- Anything not stated in these pages is marked "not stated in docs". Nothing here is an invented best practice.

---

## 1. Best Practices `[raw]`
URL: https://playwright.dev/docs/best-practices

Page structure: *Testing philosophy* (test user-visible behavior; isolate tests; avoid testing third-party dependencies; testing with a database) -> *Best Practices* (use locators; chaining and filtering; prefer user-facing attributes to XPath/CSS; generate locators; web-first assertions; don't use manual assertions; configure debugging; use Playwright's tooling; test across all browsers; keep Playwright up to date; run tests on CI; optimize browser downloads on CI; lint your tests; use parallelism and sharding) -> *Productivity tips* (soft assertions).

Headline guidance, in the docs' words:
- Test user-visible behavior: tests should "avoid relying on implementation details" (function names, whether something is an array, CSS class of an element).
- Isolation: "Each test should be completely isolated from another test and should run independently" with its own local storage, session storage, data, cookies. Benefits stated: "improves reproducibility, makes debugging easier and prevents cascading test failures."
- Repetition: use before/after hooks (`beforeEach`) to avoid repetition; the page also says you can reuse signed-in state with a **setup project** "so you can log in only once."
- Third parties: "Only test what you control." Mock with the Network API (`page.route` + `route.fulfill`).
- Database: "make sure you control the data"; test against a staging environment that doesn't change. For visual-regression tests keep OS and browser versions the same.
- Locators: built-in locators "come with auto waiting and retry-ability"; prefer user-facing attributes over DOM structure.
- Web-first assertions: "Playwright will wait until the expected condition is met."
- CI debugging: use the trace viewer instead of videos/screenshots; traces run "on the first retry of a failed test"; "We don't recommend setting this to on" because it is "very performance heavy."
- CI: run on every commit/PR; "Use Linux when running your tests on CI as it is cheaper"; "Consider setting up Sharding"; install only the browsers you need (`npx playwright install chromium --with-deps`).
- Lint: TypeScript + ESLint; use the `@typescript-eslint/no-floating-promises` rule "to make sure there are no missing awaits"; run `tsc --noEmit` on CI.
- Parallelism: tests in one file run in order in the same worker; opt in to in-file parallelism with `test.describe.configure({ mode: 'parallel' })`; shard with `--shard=1/3`.
- Keep `@playwright/test` up to date to catch failures against new browser versions early.

Canonical idioms (docs shapes):
```ts
// locator: user-facing
page.getByRole('button', { name: 'submit' });

// chaining + filtering
await page
  .getByRole('listitem')
  .filter({ hasText: 'Product 2' })
  .getByRole('button', { name: 'Add to cart' })
  .click();

// web-first assertion
await expect(page.getByText('welcome')).toBeVisible();

// mock a dependency you don't control
await page.route('**/api/third_party_dependency', route =>
  route.fulfill({ status: 200, body: testData }),
);

// soft assertion (productivity tip)
await expect.soft(page.getByTestId('status')).toHaveText('Success');
```
Config shape for cross-browser: `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }, ...]`.

Anti-patterns the page flags (docs marks these with a thumbs-down):
- `page.locator('button.buttonIcon.episode-actions-later')` (CSS-class coupling: "Should the designer change something then the class might change").
- `expect(await page.getByText('welcome').isVisible()).toBe(true)` (manual, non-waiting assertion: "the test won't wait a single second").
- Running traces on every test on CI.
- Testing links/servers you don't control; shared mutable state between tests; un-awaited Playwright calls (hence the lint rule).

---

## 2. Writing tests and test isolation `[summary]`
URL: https://playwright.dev/docs/writing-tests

- Pattern: "perform actions and assert state against expectations" (paraphrase of the page intro). Playwright "automatically waits for actionability checks."
- Isolation: "Every test gets a fresh environment, even when multiple tests run in a single browser" (as returned by fetch). Each test gets its own `BrowserContext` via the built-in `page`/`context` fixtures. (The raw-verified auth page repeats the same idea: "Playwright executes tests in isolated environments called browser contexts.")
- Hooks: `test.describe()` plus `beforeEach`, `afterEach`, `beforeAll`, `afterAll`.
- Async matchers wait; synchronous matchers such as `toBeTruthy()` check an immediate value.

Canonical idiom:
```ts
import { test, expect } from '@playwright/test';

test.describe('widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/widgets');
  });

  test('lists widgets', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Widgets' })).toBeVisible();
  });
});
```
(generic adaptation)

Anti-patterns: not stated as a list on this page; see Best Practices (isolation) and Parallelism (serial mode).

---

## 3. Parallelism, workers, test isolation at scale `[raw]`
URL: https://playwright.dev/docs/test-parallel

- Default: "Playwright Test runs tests in parallel" using several worker processes. "By default, test files are run in parallel. Tests in a single file are run in order, in the same worker process."
- Workers are OS processes with identical environments, each starting its own browser. "parallel tests are executed in separate worker processes and cannot share any state or global variables." Every test runs its own hooks, including `beforeAll`/`afterAll`.
- Opt-in full parallelism: `test.describe.configure({ mode: 'parallel' })` (per file) or `fullyParallel: true` (config/project).
- Serial mode exists for inter-dependent tests (if one fails, the rest are skipped; the group retries together) but: "Using serial is not recommended. It is usually better to make your tests isolated."
- Test locks (named): `test('x', { lock: 'user-settings' }, ...)` makes tests sharing a lock name never run at the same time, across files, workers and projects, while everything else stays parallel. This is the docs' answer for a shared resource that "does not support concurrent access."
- "Avoiding shared state in parallel tests" recipes:
  - per-test backend data: derive unique ids from `testInfo.testId`;
  - per-test files: `testInfo.outputPath()`;
  - per-worker data: `testInfo.workerIndex` / `TEST_WORKER_INDEX`; `parallelIndex` / `TEST_PARALLEL_INDEX` is 0..workers-1.
- Keep tests independent: "Above all, keep your tests isolated from one another." A test that leaks state "works when tests run in order, but breaks the moment they run in parallel or in a different order."
- Limits: `--workers`, `workers` in config; `maxFailures` / `--max-failures` to stop early.

Canonical idioms:
```ts
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,   // docs example value
});

// unique data per test (docs shape, with generic names)
test('creates an order', async ({ page }, testInfo) => {
  const orderId = `order-${testInfo.testId}`;
  await page.goto(`/orders/new?id=${orderId}`);
  await expect(page.getByText(orderId)).toBeVisible();
});

// opt a describe out of fullyParallel
test.describe('in order', () => {
  test.describe.configure({ mode: 'default' });
});
```
Anti-patterns: serial mode as a default; module-level variables or cross-test side effects; tests writing the same file path or editing the same record concurrently.

(Note: the CI page recommends `workers: 1` on CI; this parallel page uses `workers: process.env.CI ? 2 : undefined` only as an example. Both are in the docs; see section 11.)

---

## 4. Locators `[summary]` + `[raw]` for the Best-Practices overlap
URLs: https://playwright.dev/docs/locators , https://playwright.dev/docs/other-locators

Built-in, user-facing locators the docs list (in this order): `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`.
- `getByRole`: locates by ARIA role / accessible name. `getByLabel`: form control by label text. `getByTestId`: `data-testid` (or a configured attribute).
- "Locators are the central piece of Playwright's auto-waiting and retry-ability" (as returned by fetch). Each action re-queries the DOM.
- Strictness: operations on a locator that matches more than one element throw. `.first()`, `.last()`, `.nth()` opt out, but the page discourages positional selection.
- Filtering/chaining: `.filter({ hasText })`, `.filter({ hasNotText })`, `.filter({ has: locator })`, and chaining `getByRole(...).getByRole(...)`.
- other-locators page: CSS (`page.locator('css=button')`) and XPath (`page.locator('xpath=//button')`) are supported but carry a warning that they are "tied to the implementation" and "easily break when the page changes" (as returned by fetch); the page steers readers to user-visible locators (text or accessible role).
- Best Practices page (raw) separately says codegen/"Generate locators" prioritizes "role, text and test id."

Canonical idioms:
```ts
await page.getByLabel('User Name').fill('Jane');
await page.getByRole('button', { name: 'Sign in' }).click();

const row = page.getByRole('listitem').filter({ hasText: 'Widget 2' });
await row.getByRole('button', { name: 'Add to cart' }).click();
```
Anti-patterns the docs warn against: long CSS chains such as `#tsf > div:nth-child(2)`; XPath tied to structure; `.nth()` as the primary strategy; class-name selectors.

---

## 5. Assertions (web-first, auto-retrying) `[raw]`
URL: https://playwright.dev/docs/test-assertions

- Default assertion timeout: "5 seconds."
- Auto-retrying assertions wait for the condition (e.g. `toBeVisible`, `toHaveText`, `toBeChecked`, `toHaveAttribute`, `toHaveURL`, `toHaveTitle`).
- Non-retrying assertions "do not auto-retry... using non-retrying assertions can lead to a flaky test." The page says: "Prefer auto-retrying assertions whenever possible."
- When you need retrying beyond built-in matchers: `expect.poll` (converts a synchronous expect into polling; default timeout 5 s, `0` disables) and `expect.toPass` (retries a whole block).
- Soft assertions: "failed soft assertions do not terminate test execution, but mark the test as failed." Only works in the Playwright test runner. `expect.configure({ soft: true })` creates a pre-configured instance.
- Custom matchers via `expect.extend()`; `mergeExpects()` combines them (fetch summary).

Canonical idioms:
```ts
await expect(page.getByTestId('status')).toHaveText('Submitted');

await expect.soft(page.getByTestId('status')).toHaveText('Success');
await expect.soft(page.getByTestId('eta')).toHaveText('1 day');

// polling an API-backed eventual state (generic adaptation of the docs' expect.poll)
await expect.poll(async () => {
  const res = await request.get(`/orders/${orderId}`);
  return (await res.json()).status;
}, { timeout: 10_000 }).toBe('shipped');
```
Anti-patterns: `expect(await locator.isVisible()).toBe(true)`; `expect(page.isVisible()).toBeTruthy()`-style immediate checks; missing `await` on async matchers.

---

## 6. Page Object Model `[raw]`
URL: https://playwright.dev/docs/pom

- Purpose (docs): page objects "simplify authoring by creating a higher-level API" and "simplify maintenance by capturing element selectors in one place" and "create reusable code to avoid repetition."
- Docs shape: a class holding the `Page`, `Locator` fields assigned in the constructor, and async methods that wrap interactions; the test instantiates it with `new PageObject(page)`.
- The fixtures page shows the **same POM delivered as a fixture** (see section 7), which is the docs' recommended way to hand a page object to a test.
- No explicit warnings on the POM page. Note a docs tension: the POM page's own example uses `page.locator('a', { hasText })` whereas Best Practices says to prefer role/text/test-id locators; the Best-Practices guidance is the explicit rule.

Docs shape (generic adaptation):
```ts
import { expect, type Locator, type Page } from '@playwright/test';

export class OrdersPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.getByRole('button', { name: 'Add order' });
    this.rows = page.getByRole('row');
  }

  async goto() {
    await this.page.goto('/orders');
  }

  async add(name: string) {
    await this.addButton.click();
    await this.page.getByLabel('Name').fill(name);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await expect(this.rows.filter({ hasText: name })).toBeVisible();
  }
}
```

---

## 7. Test fixtures (why fixtures over hooks) `[raw]`
URL: https://playwright.dev/docs/test-fixtures

The page states "Fixtures have a number of advantages over before/after hooks":
1. Encapsulate setup and teardown in the same place ("if you have an after hook that tears down what was created in a before hook, consider turning them into a fixture").
2. Reusable between test files; "define them once and use them in all your tests" (the built-in `page` is the model).
3. On-demand: only the fixtures a test names are set up.
4. Composable: they "can depend on each other."
5. Flexible: any combination per test "without affecting other tests."
6. Simplify grouping: you "no longer need to wrap tests in describes that set up their environment."

Also stated:
- Mention a fixture in the test's argument list and the runner provisions it; fixtures are type-safe in TypeScript and are available in hooks and other fixtures.
- Worker-scoped fixtures: `{ scope: 'worker' }`. Automatic fixtures: `{ auto: true }` (set up for every test, before `beforeEach` hooks). Options: `{ option: true }`. Override built-ins (e.g. `page`). Combine with `mergeTests`. Hide helper fixtures from reports with `{ box: true }`; custom report title with `{ title }`.
- Global hooks: "If you want to declare hooks that run before/after each test globally, you can declare them as auto fixtures" (same for `beforeAll`/`afterAll` with `scope: 'worker'`).

Canonical idiom (docs shape, generic names):
```ts
import { test as base } from '@playwright/test';
import { OrdersPage } from './orders-page';

export const test = base.extend<{ ordersPage: OrdersPage }>({
  ordersPage: async ({ page }, use) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.goto();
    await use(ordersPage);        // test body runs here
    // teardown goes after use()
  },
});

// worker-scoped
export const testWithAccount = base.extend<{}, { account: Account }>({
  account: [async ({}, use, workerInfo) => {
    const username = 'user' + workerInfo.workerIndex;
    // ...create account...
    await use({ username, password: '...' });
  }, { scope: 'worker' }],
});
```
Anti-pattern implied: repeated before/after pairs and helper functions copy-pasted across files (the docs' reasons to convert them to fixtures). The docs do not call hooks "wrong"; Best Practices still shows `beforeEach` as an acceptable way to avoid repetition.

---

## 8. API testing (`request` / APIRequestContext) `[summary]`
URL: https://playwright.dev/docs/api-testing

- `APIRequestContext` lets you hit server APIs from Node.js without a browser. Uses named by the docs: test the server API directly; set up server-side state before a browser test; validate server-side postconditions after browser actions.
- The built-in `request` fixture honours config `use: { baseURL, extraHTTPHeaders }`.
- Setup/teardown via API uses `beforeAll`/`afterAll` in the docs' example.
- Storage state is interchangeable between `BrowserContext` and `APIRequestContext`: authenticate via API, call `storageState()`, reuse in browser contexts.
- Distinction (fetch summary): requests through `page.request` / `context.request` share cookies with the browser context; a context created with `playwright.request.newContext()` has its own isolated cookie storage.

Canonical idioms (generic adaptation of the docs' shapes):
```ts
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.API_BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    },
  },
});

// api test
test('creates an order', async ({ request }) => {
  const res = await request.post('/orders', { data: { sku: 'W-1', qty: 2 } });
  expect(res.ok()).toBeTruthy();   // docs' example
});

// API-driven setup before a UI test
test.beforeAll(async ({ request }) => {
  await request.post('/widgets', { data: { name: 'seed-widget' } });
});
```
Anti-patterns: not stated in a warnings list. (Not stated in docs: how to validate response schemas; schema validation is a team choice, not Playwright guidance.)

---

## 9. Authentication and storage state `[raw]`
URL: https://playwright.dev/docs/auth

- Intro: browser contexts give isolation; tests "can load existing authenticated state," so you do not authenticate in every test.
- Core: store state in `playwright/.auth` and add it to `.gitignore`. Danger note: the state file "may contain sensitive cookies and headers that could be used to impersonate you or your test account. We strongly discourage checking them into private or public repositories."
- Strategy 1, **shared account** (recommended for tests without server-side state): authenticate once in a `setup` project; other projects declare `dependencies: ['setup']` and `use.storageState`. Use when "all your tests [could run] at the same time with the same account, without affecting each other." Do not use when tests modify server-side state or auth is browser-specific.
- Strategy 2, **one account per parallel worker** (recommended for tests that modify server-side state): override the `storageState` fixture with a worker-scoped fixture keyed by `test.info().parallelIndex`; each worker authenticates once with its own account.
- Also covered: API-based login then `storageState()`; multiple roles via separate state files and `test.use({ storageState })`; multiple `BrowserContext`s for multi-role scenarios; `sessionStorage` is not saved automatically (persist it manually); unauthenticated tests via `test.use({ storageState: { cookies: [], origins: [] } })`.
- State goes stale: "you need to delete the stored state when it expires." If state need not persist between runs, write it under `testProject.outputDir`.
- UI mode does not run the setup project by default.

Canonical idioms (docs shape, generic):
```ts
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(process.env.TEST_USER!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');          // docs: wait until cookies are actually set
  await page.context().storageState({ path: authFile });
});

// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```
(Env-var credentials are a generic adaptation; the docs example uses literal placeholder strings.)

Anti-patterns: committing auth state files; sharing one account when tests mutate server state; assuming the saved state never expires; assuming `sessionStorage` is persisted.

---

## 10. Parallelism and sharding `[summary]`
URLs: https://playwright.dev/docs/test-parallel (section 3 above) and https://playwright.dev/docs/test-sharding

- `--shard=x/y` splits the suite across machines.
- With `fullyParallel: true`, individual tests are distributed across shards ("optimal load balancing" per fetch); without it, sharding is **file-level**, so uneven files give unbalanced shards. Docs recommendation: enable `fullyParallel: true`, or keep file sizes consistent.
- Reporting across shards: use the `blob` reporter on CI, then merge: `npx playwright merge-reports --reporter html ./all-blob-reports`. Merged output includes attachments such as traces and screenshots.
- GitHub Actions: matrix over `shardIndex`/`shardTotal`, upload blob reports as artifacts, a dependent merge job with `if: ${{ !cancelled() }}` so partial results survive shard failures.

```bash
npx playwright test --shard=1/4
npx playwright merge-reports --reporter html ./all-blob-reports
```
```ts
reporter: process.env.CI ? 'blob' : 'html',
```
Anti-patterns: not stated explicitly beyond the file-level imbalance caveat.

---

## 11. CI `[raw]`
URL: https://playwright.dev/docs/ci

- 3 steps: ensure the CI agent can run browsers (Docker or CLI-installed OS deps); install (`npm ci`, `npx playwright install --with-deps`); run `npx playwright test`.
- Workers: "We recommend setting workers to '1' in CI environments to prioritize stability and reproducibility." Allowed exception: "if you have a powerful self-hosted CI system, you may enable parallel tests"; for wider parallelism "consider sharding."
- Caching browsers: "Caching browser binaries is not recommended" because restore time is "comparable to the time it takes to download the binaries," and Linux OS dependencies are not cacheable.
- Docker image reference at the time of research: `mcr.microsoft.com/playwright:v1.63.0-noble`.
- CircleCI note: with the medium Docker tier, setting workers above the detected core count (2) "will cause unnecessary timeouts and failures."
- Debugging browser launch failures: `DEBUG=pw:browser npx playwright test`. Linux headed runs: `xvfb-run npx playwright test`.
- Best Practices adds: Linux on CI is cheaper; install only needed browsers; shard to speed up; use trace on first retry.

Canonical idioms:
```ts
// playwright.config.ts (docs shape)
export default defineConfig({
  workers: process.env.CI ? 1 : undefined,
});
```
```yaml
# GitHub Actions (docs shape, trimmed)
name: Playwright Tests
on:
  push: { branches: [main, master] }
  pull_request: { branches: [main, master] }
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: lts/* }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v5
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```
Anti-patterns: caching browser binaries; over-provisioning workers on small agents. The CI page's trimmed snippet above omits `retries`/`forbidOnly`; those are not covered in the fetched CI text, so do not attribute them to this page. (The trace-viewer page's example does show `retries: process.env.CI ? 2 : 0`.)

---

## 12. Debugging and Trace Viewer `[summary]`
URLs: https://playwright.dev/docs/debug , https://playwright.dev/docs/trace-viewer-intro

Debugging (`debug`):
- VS Code extension is the documented primary route (breakpoints, live locator highlighting, error detail).
- Playwright Inspector: `npx playwright test --debug` (step through, edit locators live, view actionability logs); `page.pause()` pauses at a point.
- Browser DevTools console: `PWDEBUG=console npx playwright test` exposes a `playwright` object (`playwright.locator(...)`, `.inspect(...)`).
- Verbose API logs: `DEBUG=pw:api npx playwright test`. Also headed mode and `slowMo` for launch options.
- Best Practices (raw) adds: debug a single test by file and line: `npx playwright test example.spec.ts:9 --debug`.

Trace Viewer (`trace-viewer-intro`):
- Values named by the page: `on-first-retry`, `on`, `off`, `retain-on-failure`, `on-all-retries`, `retain-on-first-failure`.
- Recommended config is `on-first-retry` with `retries: process.env.CI ? 2 : 0`. Locally: `npx playwright test --trace on`. View via `npx playwright show-report`.
- The viewer shows a timeline with DOM snapshots before/after each action, plus logs, source, network requests, errors and console (fetch summary).
- Best Practices (raw): "use the Playwright trace viewer instead of videos and screenshots" for CI failures; avoid `trace: 'on'` on CI.

```ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: { trace: 'on-first-retry' },
});
```
Anti-patterns: tracing every test on CI (performance cost); relying on videos/screenshots when a trace is available.

---

## 13. Test generator (codegen) `[summary]`
URL: https://playwright.dev/docs/codegen

- Launch: `npx playwright codegen [URL]`.
- Locator strategy: it "prioritiz[es] role, text and test id locators" and refines the locator when several elements match (same sentence appears in raw-verified Best Practices).
- Features: record actions; "Record at cursor" inserts into an existing test; assertion tools for visibility, text and value; **Pick locator**.
- Emulation flags: `--viewport-size`, `--device="iPhone 13"`, `--color-scheme=dark`, `--timezone`, `--geolocation`, `--lang`.
- Auth: `--save-storage=auth.json` and `--load-storage=auth.json` (keep the file out of git; docs say it contains sensitive data).
- VS Code: "Record new" and "Record at cursor" produce code live in the editor.

Anti-patterns: committing the saved storage file. (Not stated in docs: codegen output should be treated as a draft to refactor into page objects/fixtures; that is team policy, not Playwright text.)

---

## 14. Test Agents (planner / generator / healer) `[raw]`
URL: https://playwright.dev/docs/test-agents

- Three built-in agents that "can be used independently, sequentially, or as the chained calls in the agentic loop."
  - planner: "explores the app and produces a Markdown test plan."
  - generator: "transforms the Markdown plan into the Playwright Test files."
  - healer: "executes the test suite and automatically repairs failing tests."
- Setup: `npx playwright init-agents --loop=vscode | claude | codex | opencode`. Definitions "should be regenerated whenever Playwright is updated." VS Code v1.105 (released 2025-10-09) is needed for the VS Code agentic experience.
- Planner input: a clear request, a **seed test** that sets up the environment, optionally a PRD. Output: Markdown in `specs/` (steps, expected results, data). The planner runs the seed test, which runs global setup, project dependencies, fixtures and hooks, and uses it as the example for generated tests.
- Generator input: the Markdown plan from `specs/`. Output: a test suite under `tests/`; it "verifies selectors and assertions live." Generated tests "may include initial errors that can be healed automatically." Generated files carry traceability comments (`// spec: specs/<plan>.md`, `// seed: tests/seed.spec.ts`) and use role-based locators and web-first assertions.
- Healer input: failing test name. Behaviour: replays failing steps, inspects the UI for equivalent elements, suggests a patch (locator update, wait adjustment, data fix), re-runs "until it passes or until guardrails stop the loop." Output: a passing test, "or a skipped test if the healer believes that functionality is broken."
- Conventions: `.github/` (agent definitions, as printed on the page's layout diagram), `specs/` (human-readable plans), `tests/` (generated tests "aligned one-to-one with specs wherever feasible"), `tests/seed.spec.ts` (bootstrap).
- Docs oddity to flag: under "Agent Definitions" the page labels an example "for Claude Code subagents" but prints the `--loop=vscode` command; it does not state the on-disk folder for the `claude` loop. Do not cite a Claude-specific directory from this page.

Canonical idiom (docs shape, generic):
```ts
// tests/seed.spec.ts
import { test } from './fixtures';
test('seed', async ({ page }) => {
  // uses custom fixtures; sets up whatever the app needs
});
```
```md
<!-- specs/orders-basic.md (docs-style plan shape) -->
## 1. Adding orders
**Seed:** `tests/seed.spec.ts`
#### 1.1 Add valid order
**Steps:** 1. Click the "Order name" field  2. Type "Test order"  3. Press Enter
**Expected Results:** - Order appears in the list  - Input is cleared
```
Anti-patterns: not a warnings list; the only caution is that generated tests can need healing and definitions must be regenerated on upgrade.

---

## 15. Playwright Test for VS Code `[summary]`
URLs: https://playwright.dev/docs/getting-started-vscode , https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright

- Install the official Microsoft extension, then run **Test: Install Playwright** from the Command Palette and pick browsers.
- Run: play icons beside tests; tick the projects (browsers) to run against; "Show Browsers" toggles headed/headless.
- Debug: breakpoints plus **Debug Test**; click a locator in code to highlight the element live; detailed expected-vs-received errors; optional "Show Trace Viewer".
- Generate: **Record new**, **Record at cursor**, **Pick locator** ("determine[s] the best locator and copy it to your clipboard").
- Also: project dependencies (setup tests), manual global setup/teardown triggers, switch between multiple `playwright.config.ts` files.
- Marketplace page (publisher shown as Microsoft): features listed are run, watch mode, show browsers, debug with breakpoints, pick/inspect locators, record tests, trace viewer. Stated requirement: "works with Playwright version v1.38+ or newer." Install count and rating on the page were not recorded here as they are volatile.
- Best Practices (raw) also recommends the VS Code extension for local debugging and for generating locators.

Anti-patterns: not stated.

---

## 16. Allure reporter for Playwright `[raw]`
Canonical page: https://allurereport.org/docs/playwright/ (WebFetch). Raw markdown of the same page read from https://allurereport.org/docs/playwright.md. Package: `allure-playwright` on npm (https://npmjs.com/package/allure-playwright, seen in search results, not fetched).

- Setup (page steps): Node.js (tested on 18+), Allure Report installed ("Note that Allure Report requires Java" per this page, which links to the v2 install guide), then `npm install --save-dev @playwright/test allure-playwright`.
- Register the reporter in the Playwright config. Results land in `allure-results` by default (additive if the directory exists). Convert with `allure generate` (writes `allure-report`; view with `allure open`) or `allure serve` (generate and open).
- Two ways to add data: **Runtime API** (call Allure functions "as close to the beginning of the test as possible" so data survives an early failure) and **Metadata API** (`@allure.label.*` tags in the test title; "guaranteed to be added regardless of how the test itself runs").
- Capabilities: metadata (displayName, owner, tags, severity, links), hierarchy (epic/feature/story or parentSuite/suite/subSuite), steps (`allure.step`, `allure.logStep`; Playwright's `test.step` is also supported), parameters, attachments (`allure.attachment`, `allure.attachmentPath`; `TestInfo.attach` supported), global labels via `ALLURE_LABEL_<name>` env vars, `ALLURE_TESTPLAN_PATH` test selection, environment info.
- Traces: if Playwright tracing is enabled, Allure "automatically recognizes the resulting trace file and attaches it" so it opens in Trace Viewer from the report.
- By default Allure also lists auto-generated steps, including hook steps; the `detail` setting disables that.

Canonical idioms (docs shape):
```ts
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['line'],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
});
```
```ts
import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('orders: create', async () => {
  await allure.epic('Orders');
  await allure.feature('Create');
  await allure.severity('critical');
  await allure.step('open form', async () => { /* ... */ });
});

// Metadata API form
test('orders: create @allure.label.severity:critical', async () => { /* ... */ });
```
```bash
npx playwright test
allure generate        # -> allure-report/
allure serve           # generate + open
```
Anti-patterns: the page does not list any. It does advise calling Runtime API functions early in the test.

---

## Methodology sources (one line each; not Playwright docs)

- **Test Pyramid.** Ham Vocke, "The Practical Test Pyramid", martinfowler.com. https://martinfowler.com/articles/practical-test-pyramid.html `[summary]`. Layers discussed: unit, integration, contract, UI, end-to-end. Guidance (as returned by fetch, attributed to the article): "Write lots of small and fast unit tests"; "Push your tests as far down the test pyramid as you can"; if a higher-level test finds a bug with no failing lower-level test, "write one"; "Don't become too attached to the names of the individual layers"; E2E tests are "notoriously flaky" so keep them to critical journeys.
- **Agile Testing Quadrants.** Originated by Brian Marick (the Crispin post credits him; the "2003" date comes only from a web-search snippet, not a fetched page); popularized by Lisa Crispin and Janet Gregory in the book *Agile Testing*. Fetched: https://lisacrispin.com/2011/11/08/using-the-agile-testing-quadrants/ `[summary]`. Q1 technology-facing/supports the team (unit, component); Q2 business-facing/supports the team (acceptance, story tests); Q3 business-facing/critiques the product (exploratory, usability); Q4 technology-facing/critiques the product (performance, load, security). Crispin: "The quadrant numbering system does NOT imply any order." (not seen raw; the same fetch also says most projects start at Q2.) The book itself was not fetched.
- **Consumer-driven contract testing.** Pact docs: https://docs.pact.io/ `[summary]`. Definition quoted by the fetch: "Contract testing is a technique for testing an integration point by checking each application in isolation"; the contract "is generated during the execution of the automated consumer tests"; the provider verifies it; the Pact Broker shares contracts. Scope guidance from https://docs.pact.io/getting_started/what_is_pact_good_for : good when one party controls both consumer and provider; not good for public APIs with unidentifiable consumers, performance/load testing, or functional testing of the provider.
- **Testing vs Checking.** Michael Bolton, 2009 original: https://www.developsense.com/blog/2009/08/testing-vs-checking (superseded by the refined version). Refined: James Bach and Michael Bolton, "Testing and Checking Refined", https://www.satisfice.com/blog/archives/856 `[summary]` (fetch showed an updated date of 2024-08-10 on a 2013 post). Refined definitions per the fetch: testing is "evaluating a product by learning about it through experiencing, exploring, and experimenting"; checking is "the mechanistic process of verifying propositions about the product"; testing encompasses checking, not vice versa. Implication for an automation kit (inference, not a quote): automated suites are machine checking, which is valuable but is not all of testing.

---

## Cross-topic tensions worth keeping visible (so the KB does not flatten them)

1. **Hooks vs fixtures.** Best Practices shows `beforeEach` login as acceptable for isolation; the fixtures page lists six reasons to prefer fixtures and says global hooks can be written as auto fixtures. Both are official.
2. **CI workers.** CI page: "setting workers to '1'" for stability, with a self-hosted exception and sharding for scale. Parallel page example uses `process.env.CI ? 2 : undefined`. Treat the number as a tuning decision; the principle is stability first, then scale via sharding.
3. **POM locator style.** The POM page's example uses `page.locator(...)` with CSS/text; Best Practices says user-facing locators first. The explicit rule is Best Practices/Locators.
4. **Serial mode.** Exists and is documented, but marked "not recommended."
5. **Traces.** `on-first-retry` is the documented CI default; `on` locally; not `on` for every CI test.

## Pages that failed or were not fully verified

- No page failed to load. `playwright.dev` pages marked `[summary]` were not re-read raw; their quotes come from the fetch tool's summary.
- Not fetched: the Pearson/Mountain Goat pages for the *Agile Testing* book, npm page for `allure-playwright`, Brian Marick's original posts, the Allure `playwright-configuration` / `playwright-reference` sub-pages (referenced from the main page but not opened).
- The Playwright VS Code Marketplace install counts/ratings were returned but intentionally omitted (volatile).

## Source URLs (pages actually fetched)

Playwright (WebFetch; * = raw HTML also re-read):
- https://playwright.dev/docs/best-practices *
- https://playwright.dev/docs/writing-tests
- https://playwright.dev/docs/test-parallel *
- https://playwright.dev/docs/locators
- https://playwright.dev/docs/other-locators
- https://playwright.dev/docs/test-assertions *
- https://playwright.dev/docs/pom * (raw re-read of intro and class example only)
- https://playwright.dev/docs/test-fixtures *
- https://playwright.dev/docs/api-testing
- https://playwright.dev/docs/auth *
- https://playwright.dev/docs/test-sharding
- https://playwright.dev/docs/debug
- https://playwright.dev/docs/trace-viewer-intro
- https://playwright.dev/docs/ci *
- https://playwright.dev/docs/codegen
- https://playwright.dev/docs/test-agents *
- https://playwright.dev/docs/getting-started-vscode
- https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright

Allure:
- https://allurereport.org/docs/playwright/ (WebFetch)
- https://allurereport.org/docs/playwright.md (raw)

Methodology:
- https://martinfowler.com/articles/practical-test-pyramid.html
- https://docs.pact.io/
- https://docs.pact.io/getting_started/what_is_pact_good_for
- https://lisacrispin.com/2011/11/08/using-the-agile-testing-quadrants/
- https://www.developsense.com/blog/2009/08/testing-vs-checking
- https://www.satisfice.com/blog/archives/856

Web-search only (result titles/snippets used for orientation, pages not fetched): the Agile Testing Quadrants origin (Brian Marick 2003) and Bolton/Bach background snippets.
