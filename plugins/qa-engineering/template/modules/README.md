# modules/

One folder per bounded context in your backend. Mirror how the product is
organised, not how the code is organised — QA and developers should be able to
name the same module.

```
modules/<module>/
├── fixtures.ts           ← extends the base fixture with this module's seed + sweeper
├── api/
│   ├── schemas/<module>.schemas.ts
│   └── tests/
│       ├── contracts/      ← response shape vs schema. No data created.
│       ├── endpoints/      ← one operation, one condition. Creates + cleans up.
│       └── workflows/      ← multi-step journeys. CleanupRegistry + test.step().
└── ui/
    ├── pages/<name>.page.ts
    └── tests/
        ├── smoke/          ← the screen loads and its core action works
        ├── regression/     ← per-feature behaviour — the bulk
        └── e2e/            ← cross-module journeys
```

**The folder is the level.** `playwright.config.ts` maps each folder to a project
with its own timeout; put a spec in the wrong folder and it runs under the wrong
budget and gets reported under the wrong level.

`modules/example/fixtures.ts` is the one-file pattern to copy. There are no example
specs — the copy-ready examples for every artifact type live in `AGENTS.md`.

## Adding a module

```bash
mkdir -p modules/orders/api/{schemas,tests/{contracts,endpoints,workflows}} \
         modules/orders/ui/{pages,tests/{smoke,regression,e2e}}
cp modules/example/fixtures.ts modules/orders/fixtures.ts
```

Then, in order (see `AGENTS.md` §6 for copy-ready code of each):

1. `common/routes/routes.orders.ts` — the route templates, from the backend source
2. `common/builders/order-builder.ts` — valid default payloads
3. `common/services/orders.service.ts` — create/read/update/cleanup, exported from
   `common/services/index.ts`
4. `modules/orders/fixtures.ts` — a worker-scoped seed (read-only) and a `sweep*`
   function; register the sweeper in `common/setup/sweepers.ts`
5. `modules/orders/api/schemas/orders.schemas.ts` — confirmed against real
   responses, not documentation
6. specs, in this order: contracts → endpoints → workflows (then UI)

`npm run typecheck` after each step.

## Seeding and cleanup

- A test that **mutates** data creates and cleans up its own (use `CleanupRegistry`).
- A module's `fixtures.ts` provides a worker-scoped **seed** for cheap, **read-only**
  reuse across the suite. Every seed id is nullable — dependent tests `test.skip`
  with a reason rather than fail when a resource could not be created.
- Name seed resources with `seedName('…')` so the run-level `sweep` teardown can find
  and remove this run's leftovers if a worker crashed. Register the module's sweeper in
  `common/setup/sweepers.ts`.

## Tags

Every test carries a module tag and a level tag, passed through Playwright's `{ tag: [...] }`
option — never typed into the title string:

```
@orders  @contract | @endpoint | @workflow | @smoke | @regression | @e2e | @security
```

```ts
test('Orders - List - Verify that GET orders conforms to orderListSchema.', { tag: ['@orders', '@contract'] }, async ({ api }) => { /* … */ });
```

Tags are what `--grep` and impact selection run on. A test without them can only
ever be run as part of everything.
