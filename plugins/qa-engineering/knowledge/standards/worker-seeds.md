# Worker seeds

> Worker-scoped fixtures that create shared, READ-ONLY data once per worker and tear it down at worker end — read-only tests use them; mutating tests make their own.

## Purpose
Some checks only read data (does the list schema hold? does a filter work?). Creating a fresh resource
for each of those is wasteful. A worker seed creates the shared read-only data once per worker, hands it
to every read-only test that worker runs, and removes it at worker end. The seed id is nullable: if
seeding was skipped or failed, dependent tests *skip* rather than fail en masse. Mutating tests never
touch a seed — they create and clean up their own data, so a worker's shared resource stays pristine.

## When to use it (and when NOT)
- **Use a seed** for read-only checks that need an existing resource (contract/shape tests, read filters,
  detail reads).
- **Make it worker-scoped and read-only** — created once per worker, never mutated by a test.
- **Name it with the run-scoped seed helper** so the run-level sweeper can find this run's leftovers.
- **Guard on it:** `test.skip(seed.id === null, 'Seed unavailable')` — a missing seed is an environment
  condition, never a hidden defect.
- **Do NOT** mutate a seed in a test — that leaks state to every later test sharing it.
- **Do NOT** use a seed for a test that creates/edits/deletes — those own their data (see
  `cleanup-and-sweepers.md`).

## Official guidance
- Worker-scoped fixtures (`{ scope: 'worker' }`) create data once per worker process and are the
  documented home for per-worker shared setup — https://playwright.dev/docs/test-fixtures
- Workers are isolated processes that "cannot share any state or global variables," so seed data is
  per-worker, not global — https://playwright.dev/docs/test-parallel
- Derive per-worker/per-run ids from worker and run identity so seeds never collide across workers —
  https://playwright.dev/docs/test-parallel

## Code shape (product-neutral)
```ts
export interface WidgetSeed {
  widgetId: number | null;        // null when seeding was skipped/failed → dependents skip
}

export const test = base.extend<{}, { seed: WidgetSeed }>({
  seed: [
    async ({ api }, use) => {
      let widgetId: number | null = null;
      try {
        const { res } = await api.post('widgets', { data: { name: seedName('WIDGET') } });
        if (res.ok()) widgetId = (await json<{ id: number }>(res)).id;
      } catch {
        // best-effort: leave null so dependent tests skip rather than fail en masse
      }
      await use({ widgetId });                     // every read-only test this worker runs shares it
      if (widgetId !== null) await api.delete(`widgets/${widgetId}`).catch(() => {});
    },
    { scope: 'worker' },
  ],
});
```
```ts
// A read-only test consumes the seed and guards on it.
test('Widgets - Detail - Verify that GET widgets/{id} conforms to the schema.', async ({ api, seed }) => {
  test.skip(seed.widgetId === null, 'Seed widget unavailable');   // environment, not a defect
  const { res } = await api.get(fillRoute(WidgetRoutes.GetById, { widgetId: seed.widgetId! }));
  await expect(res).toMatchContract(widgetSchema);
});
```

## Anti-patterns
- Mutating a seed inside a test — the next test on that worker inherits the change and flakes.
- A seed with no null-guard — a failed seed then fails every dependent test instead of skipping.
- Using a seed in a mutating test — those must create and clean up their own data.
- A seed name without the run id — the run-level sweeper then cannot find this run's leftovers.

## Related standards
- `fixtures.md` — the worker-scope mechanism and lifecycle.
- `cleanup-and-sweepers.md` — the run-level sweeper that reclaims seed-prefixed orphans.
- `isolation-and-parallelism.md` — why shared data must be read-only under parallel workers.
- `builders.md` — mutating tests build their own payloads instead of reusing the seed.
