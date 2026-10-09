# CI

> A scheduled/PR pipeline that goes red on failure, runs a matrix per environment, and publishes one combined result — with the worker-count tension kept visible.

## Purpose
CI is where the suite earns its keep: it runs on a schedule (and on PRs), fails loudly when tests fail or
the run crashes, and publishes a result a human can read. The kit registers the automation suite as its
own standalone pipeline — never bolted onto a product build — so the suite can go red without blocking a
deploy, and a deploy can change without breaking the suite. Secrets come from a variable group or repo
secrets by name, never from source, because the git-ignored `.env` does not exist on the agent.

## When to use it (and when NOT)
- **Run on a schedule** (overnight for the team's timezone) and manually; add path triggers only once the
  suite is proven stable.
- **Make red mean red:** fail on failed tests AND on a crash that produced no results file — never a
  suffix that swallows the exit code.
- **Publish on pass or fail** (not on cancel) so the report is there when the run is red.
- **Supply every `.env` key to CI by name** — the git-ignored file is absent on the agent.
- **Matrix per environment/shard** when you need breadth or speed.
- **Do NOT** inline a secret, URL, or org name in the YAML — it fails the secret scan and leaks into
  history.
- **Do NOT** cache browser binaries — the docs advise against it.

## Official guidance
- Three steps: ensure the agent can run browsers, install (`npm ci`, `npx playwright install --with-deps`),
  run the tests — https://playwright.dev/docs/ci
- "We recommend setting workers to '1' in CI environments to prioritize stability and reproducibility,"
  with a self-hosted exception and sharding for scale — https://playwright.dev/docs/ci
- "Caching browser binaries is not recommended" — restore time is comparable to download —
  https://playwright.dev/docs/ci
- Use the trace on first retry for CI debugging (`retries: process.env.CI ? 2 : 0`, `trace:
  'on-first-retry'`) and run on Linux as "it is cheaper" — https://playwright.dev/docs/best-practices ·
  https://playwright.dev/docs/trace-viewer-intro
- Across machines, shard with `--shard=x/y`, emit the `blob` reporter, and merge into one report —
  https://playwright.dev/docs/test-sharding
- Tension to keep visible: the CI page says `workers: 1`; the parallel page's example uses
  `process.env.CI ? 2 : undefined`. Treat the number as tuning (stability first, scale via sharding) —
  https://playwright.dev/docs/ci · https://playwright.dev/docs/test-parallel

## Code shape (product-neutral)
```ts
// playwright.config.ts — the CI-relevant knobs
export default defineConfig({
  forbidOnly: !!process.env.CI,              // a stray test.only must never pass CI
  retries: process.env.CI ? 2 : 0,           // 2 retries → flaky and broken are distinguishable
  workers: process.env.CI ? 1 : undefined,   // stability first; scale out via sharding (see tension)
  use: { trace: 'on-first-retry' },
});
```
```yaml
# a scheduled pipeline (host-neutral shape)
on:
  schedule: [{ cron: '0 6 * * 1-5' }]        # overnight for the team; edit for your timezone
  workflow_dispatch: {}                      # manual first
steps:
  - checkout (depth 2)                        # depth 2 lets an impacted-tests diff see HEAD~1
  - setup Node 20
  - npm ci                                    # reproducible install; commit the lockfile
  - npx playwright install --with-deps chromium   # drop for a strictly API-only suite
  - npm run verify:setup                      # fail fast if the environment is unreachable
  - run the tests                             # red on failed tests AND on a missing results file
  - publish results + report (on pass OR fail, not on cancel)
env:
  API_BASE_URL: ${{ secrets.API_BASE_URL }}  # every .env key supplied BY NAME; never inline
  AUTH_PASSWORD: ${{ secrets.AUTH_PASSWORD }}
```

## Anti-patterns
- A `|| true` (or any exit-code-swallowing suffix) on the test step — an out-of-memory kill or a missing
  env var then looks like a pass.
- Secrets, URLs, or org names written into the YAML — they fail the secret scan and persist in history.
- Caching browser binaries, or over-provisioning workers on a small agent (timeouts and failures).
- Editing the product's existing build/deploy pipeline instead of registering a standalone one.
- A key present in `.env` but missing from the CI `env:` block — the classic green-locally / 401-in-CI
  failure.

## Related standards
- `reporting-allure.md` — the artifact CI publishes for humans to read.
- `isolation-and-parallelism.md` — the worker-count tension and why sharding is the scale lever.
- `config-and-profiles.md` — the `.env` keys CI must supply by name.
- `tooling-and-commands.md` — `verify:setup`, `test:*`, and the impacted-tests selector CI calls.
- `auth-and-storage-state.md` — providing `AUTH_*` to the agent.
