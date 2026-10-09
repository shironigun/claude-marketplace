# Isolation and parallelism

> Every test is fully independent — own data, own session, no shared mutable state, no ordering dependency — so the suite runs in parallel by default.

## Purpose
Isolation is the property the whole framework is built to preserve. Each test creates its own data, uses
its own session, shares no mutable state, and depends on no other test's order or outcome. That
independence is what lets Playwright run the suite in parallel across workers, and it is what makes a
failure mean "this behaviour broke" rather than "a test earlier in the file left a mess." Parallelism is
the payoff; isolation is the discipline that earns it.

## When to use it (and when NOT)
- **Always** — isolation is not optional. Every test owns its data (create + clean up, or a read-only
  seed), its own session, and asserts only what it set up.
- **Derive unique data** from test/worker identity so parallel tests never collide.
- **Full parallelism by default** (`fullyParallel: true`); tests in one file run in order in one worker,
  so opt a file into in-file parallelism when its tests are independent.
- **Serial mode only** for genuinely inter-dependent tests — and it is "not recommended"; prefer making
  them independent.
- **A named lock** for a shared resource that truly cannot take concurrent access, keeping everything
  else parallel.
- **Do NOT** share mutable state through module-level variables, a mutated seed, or a fixed record two
  tests both edit.

## Official guidance
- "Each test should be completely isolated from another test and should run independently" — with its own
  storage, cookies, and data; isolation "improves reproducibility, makes debugging easier and prevents
  cascading test failures." — https://playwright.dev/docs/best-practices
- "By default, test files are run in parallel. Tests in a single file are run in order, in the same worker
  process." Workers "cannot share any state or global variables." — https://playwright.dev/docs/test-parallel
- "Above all, keep your tests isolated from one another"; a state-leaking test "works when tests run in
  order, but breaks the moment they run in parallel or in a different order." —
  https://playwright.dev/docs/test-parallel
- Serial mode exists but "Using serial is not recommended. It is usually better to make your tests
  isolated." — https://playwright.dev/docs/test-parallel
- Tension to surface: the CI page recommends `workers: 1` for stability while the parallel page's example
  uses `process.env.CI ? 2 : undefined` — treat the number as a tuning decision (stability first, then
  scale via sharding), not a contradiction — https://playwright.dev/docs/ci · https://playwright.dev/docs/test-parallel

## Code shape (product-neutral)
```ts
// playwright.config.ts — parallel by default; CI worker count is a tuning decision (see the tension).
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,     // CI: stability first; scale out via sharding
});
```
```ts
// unique data per test keeps parallel runs from colliding (derive from test/worker identity)
test('creates an order', async ({ api }, testInfo) => {
  const name = `AUTOMATION_ORDER_${testInfo.testId}`;    // no two tests share it
  const { res } = await api.post('orders', { data: { name } });
  await expect(res).toHaveStatus(201);
});

// a shared resource that cannot take concurrent access — a named lock, everything else stays parallel
test('updates the single settings record', { lock: 'app-settings' }, async ({ api }) => { /* … */ });
```

## Anti-patterns
- Module-level variables or a mutated seed shared between tests — passes in order, breaks under
  parallelism or reordering.
- A test that depends on another test having run first — each must stand alone.
- Serial mode as a default convenience instead of making tests independent.
- Two tests editing the same fixed record concurrently with no lock — a race that flakes intermittently.
- Treating `workers: 1` as a correctness fix for a flaky suite — the flake is shared state; fix the
  isolation, then scale with sharding.

## Related standards
- `cleanup-and-sweepers.md` — owning and removing data is what keeps tests isolated.
- `worker-seeds.md` — shared data is read-only and per-worker, never mutated.
- `ci.md` — the worker-count tension and sharding for scale.
- `test-levels.md` — every level's tests follow the same independence rule.
