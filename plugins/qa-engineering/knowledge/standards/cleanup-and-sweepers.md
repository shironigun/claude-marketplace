# Cleanup and sweepers

> A per-test cleanup registry (register each created entity, tear down in reverse, tolerate failures) plus a prefix-based sweeper that reclaims leftover `AUTOMATION_*` data at run end.

## Purpose
Every test that creates data must remove it, so the suite stays isolated and the environment stays clean.
Two mechanisms cover it. The **cleanup registry** records an undo for each entity a test creates and runs
them in reverse at test end, isolating individual failures so one bad teardown does not abandon the rest.
The **run-level sweeper** is the safety net: when a run crashes, is killed, or times out before teardown,
a prefix-based sweep finds this run's leftover `AUTOMATION_`-named resources and deletes them. Together
they guarantee that created data does not accumulate.

## When to use it (and when NOT)
- **One created resource:** `try { … } finally { await cleanup(); }` using the ref the service returned.
- **More than one:** a `CleanupRegistry` — `add(label, undo)` per resource, `runAll()` in `finally`.
- **Shared read-only data:** the worker seed cleans itself up; the sweeper reclaims its prefix at run end.
- **Teardown tolerates failure:** a failed undo is logged and collected, never thrown — it must not mask
  the test's real result.
- **Do NOT** rely on the run-level sweep for spec-created resources — it only reclaims seed-prefixed
  names; register an undo for anything a spec creates.
- **Do NOT** hard-delete anything outside the suite's own `AUTOMATION_`-named data.

## Official guidance
- Keep each test isolated with its own data; cleaning up what a test created is part of "prevents
  cascading test failures" — https://playwright.dev/docs/best-practices
- Encapsulate setup and teardown together (a fixture that creates also tears down) rather than split
  across hooks — https://playwright.dev/docs/test-fixtures
- (Kit convention) the reverse-order registry, the failure isolation, and the `AUTOMATION_` prefix sweep
  are the kit's own data-hygiene engineering.

## Code shape (product-neutral)
```ts
export class CleanupRegistry {
  private readonly items: Array<{ label: string; fn: () => Promise<void> }> = [];
  add(label: string, fn: () => Promise<void>): void { this.items.push({ label, fn }); }

  /** Runs every undo in REVERSE; isolates failures so one does not abandon the rest. */
  async runAll(): Promise<Array<{ label: string; message: string }>> {
    const failures = [];
    for (const { label, fn } of [...this.items].reverse()) {
      try { await fn(); }
      catch (err) { failures.push({ label, message: (err as Error).message }); }  // collect, never throw
    }
    return failures;
  }
}
```
```ts
// one resource → finally; many → the registry
const { widgetId, cleanup } = await widgets.create();
try { /* … assertions … */ } finally { await cleanup(); }

// run-level sweeper: reclaims THIS run's seed leftovers by name prefix (crash/kill/timeout safety net)
export const sweepWidgets: Sweeper = async ({ apis, prefix }) => {
  const { res } = await apis.api.get('widgets', { params: { nameStartsWith: prefix } });
  if (!res.ok()) return [];
  const items = await json<Array<{ id: number }>>(res);
  for (const item of items) await apis.api.delete(`widgets/${item.id}`).catch(() => {});
  return items.map((i) => `widget ${i.id}`);
};
```

## Anti-patterns
- A test that creates data and never registers an undo — it leaks, and the sweep only catches
  seed-prefixed names.
- A teardown that throws — one failed undo then abandons the remaining ones and masks the real failure.
- Running undos in creation order when later resources depend on earlier ones — tear down in reverse.
- Hard-deleting data the suite did not create, or anything outside the `AUTOMATION_` namespace.
- Leaning on the run-level sweep as the primary cleanup — it is the safety net, not the plan.

## Related standards
- `services.md` — returns the ref whose `cleanup` the registry runs.
- `builders.md` — the `AUTOMATION_`/unique naming that makes orphans sweepable.
- `worker-seeds.md` — the seed-prefixed resources the run-level sweep reclaims.
- `isolation-and-parallelism.md` — cleanup is what keeps parallel tests from colliding.
