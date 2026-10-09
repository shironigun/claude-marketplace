# Reporting (Allure)

> Configure the Allure reporter, attach useful metadata, generate/open the report, and read failures from it.

## Purpose
A run's result becomes legible through reporting — what passed, what failed, and why. The kit uses Allure
alongside Playwright's own reporters: it registers as a reporter, collects metadata and attachments
(including the Playwright trace), and renders a browsable view of suites, steps, and failures. Producing
Allure results costs nothing at run time; generating the HTML is a separate command, so the reporter can
stay wired in even when you do not always open it.

## When to use it (and when NOT)
- **Keep the reporter configured** so every run emits results; generate the HTML when you need to read it.
- **Add metadata** (feature/story hierarchy, severity, owner, links) to make failures findable — call the
  runtime API early in the test, or use the metadata-in-title form for labels that must survive any
  failure.
- **Let traces attach automatically** — with tracing on, Allure recognizes and attaches the trace so it
  opens in the Trace Viewer from the view.
- **Do NOT** treat Allure as the pass/fail gate — CI's results publisher is the gate (see `ci.md`); Allure
  is for humans reading the failure.
- **Do NOT** hand-write pass/fail status; it reflects the run.

## Official guidance
- Install `allure-playwright`, register it in the Playwright config, and convert results with
  `allure generate` / open with `allure open` (or `allure serve`) —
  https://allurereport.org/docs/playwright/
- Two ways to add data: the Runtime API, called "as close to the beginning of the test as possible" so
  data survives an early failure; and the Metadata API, "guaranteed to be added regardless of how the test
  itself runs" — https://allurereport.org/docs/playwright/
- With Playwright tracing enabled, Allure "automatically recognizes the resulting trace file and attaches
  it" — https://allurereport.org/docs/playwright/
- Note: generating the HTML requires Java per the Allure docs; emitting results does not —
  https://allurereport.org/docs/playwright/

## Code shape (product-neutral)
```ts
// playwright.config.ts — register the reporter (emitting results is free at run time).
export default defineConfig({
  reporter: [
    ['list'],
    ['allure-playwright', {
      detail: true,
      resultsDir: 'reports/allure-results',  // generate reads from here
      suiteTitle: true,
      environmentInfo: { Profile: '…', ApiBaseUrl: '…' },  // shown on the report's overview
    }],
  ],
  use: { trace: 'on-first-retry' },        // the trace Allure will attach
});
```
```ts
// Runtime API — call metadata early so it survives an early failure.
import * as allure from 'allure-js-commons';

test('Orders - Create - Verify that an order is created.', async () => {
  await allure.feature('Orders');
  await allure.severity('critical');
  await allure.step('submit the order', async () => { /* ... */ });
});
```
```bash
npm run report:allure         # allure generate reports/allure-results --clean -o reports/allure-html
npm run report:allure:open    # allure open reports/allure-html
```
The `allure` binary comes from the `allure-commandline` devDependency; generating the HTML needs Java,
emitting results does not.

## Anti-patterns
- Calling the runtime metadata API late in the test, so an early failure drops the labels — call it first.
- Using Allure as the CI gate instead of the JUnit/results publisher — the HTML is for reading, not
  gating.
- Turning tracing fully `on` just to populate the view — that is performance-heavy on CI; `on-first-retry`
  is the default (see `ci.md`).
- Committing generated output folders instead of publishing them as CI artifacts.

## Related standards
- `ci.md` — publishes the output as an artifact and gates on the results file.
- `tooling-and-commands.md` — the `report:*` scripts that generate and open it.
- `vscode-playwright.md` — opening the Trace Viewer for a single failure during local debugging.
- `matchers.md` — the failure messages that surface here.
