# Script generation — authored case → runnable spec

How `kit-builder` turns an **authored test case** into a **runnable Playwright + TypeScript +
Zod spec** against the kit's `template/`. This is the detail behind **phase 2 (Module — API)**
and **phase 3 (Module — UI)** in `docs/phases.md`: the authoring skills
(`author-api-cases`, `author-ui-cases`) say *what* to verify; this doc says
*how to emit the code* that verifies it. It is the one capability no generic skill owns, so the
kit carries it itself (decision D11) — written product-neutrally, derived from the cleaned
automation patterns.

> **Product-agnostic by rule.** No product, tenant, org, URL, token, account, or module name
> appears in this doc or in any file it tells `kit-builder` to emit. The examples use a generic
> **`widgets`** resource, mirroring `template/modules/example/`. The QA's real module name and
> environment come from `flow-map.json` and the git-ignored `.env`.

**Producer → consumer.** This doc consumes the authored cases plus the `flow-map.json` endpoints
and flows; it produces files under `common/` and `modules/<module>/` that compile against the
template's fixtures. Every authored case it emits traces back via its own `traces-case:` line, so
phase 4 can link each script to its ADO Test Case.

The generated workspace also ships its own self-sufficient house guide at `template/AGENTS.md`;
this doc is the *orchestrator's* translation procedure and is consistent with it. Where they
overlap, `AGENTS.md` is the in-workspace reference a QA reads; this is what `kit-builder` follows
while generating.

---

## 0. Generate to the Standards

Everything this doc emits is **generated to the Standards** in `knowledge/standards/` — they are the
single source of truth, and this procedure is those standards turned into emit code, not a
substitute for them. The opinionated stack and settled defaults (TypeScript · Playwright Test · POM ·
`APIRequestContext` wrapped in one client · Zod contracts · fixtures) come from
`knowledge/standards/defaults-and-deviation.md`: do **not** re-ask a choice the default already
covers, and deviate only through that file's four-step protocol, recorded in the module's subsystem
note. When a "when to choose what" question comes up mid-build — which test level, POM vs raw
selectors, builder vs inline data, how to reuse another module — route it through the
**`framework-standards`** skill rather than deciding ad hoc; it returns the governing standard.

Each block this doc emits conforms to its standard. The detailed rules in §2 and the worked examples
remain the authoritative emit procedure; this table just names the canon each one implements, so a
reviewer — and the per-phase self-check in `skills/kit-builder/SKILL.md` — can trace an emitted block
back to the standard it must satisfy:

| Emitted block | Governing standard |
|---|---|
| Route constants (§3a) | `knowledge/standards/routes.md` |
| Builders (§3b) | `knowledge/standards/builders.md` |
| Services (§3c) | `knowledge/standards/services.md` |
| Schemas (§3d) | `knowledge/standards/schemas.md` |
| Module fixture + seed + sweeper (§3e) | `knowledge/standards/fixtures.md` · `knowledge/standards/worker-seeds.md` |
| Status + contract matchers (§2.2, §4–6) | `knowledge/standards/matchers.md` |
| Own-data + cleanup isolation (§2.5, §6, §8) | `knowledge/standards/cleanup-and-sweepers.md` · `knowledge/standards/isolation-and-parallelism.md` |
| Page objects + components (§7a) | `knowledge/standards/page-objects.md` · `knowledge/standards/components.md` |
| Test level ↔ folder/tag (§1, §7) | `knowledge/standards/test-levels.md` |
| Cross-module reuse (§8a) | `knowledge/standards/cross-module-reuse.md` |

---

## 1. The emit order (API)

A case never becomes a lone spec file. It becomes a thin spec sitting on four layers underneath,
each of which knows only the one below it. Emit them bottom-up so every `npm run typecheck` on the
way is green:

```
flow-map endpoint + authored case
        │
        ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ 1. route constants   common/routes/routes.<module>.ts          │  the paths, with {params}
  │ 2. builder           common/builders/<entity>-builder.ts       │  one VALID default payload
  │ 3. service           common/services/<module>.service.ts       │  create/read/update/cleanup
  │ 4. schema            modules/<m>/api/schemas/<m>.schemas.ts    │  Zod shape from a real body
  └───────────────────────────────────────────────────────────────┘
        │
        ▼
  spec   modules/<m>/api/tests/{contracts,endpoints,workflows}/<f>.<level>.spec.ts
```

**The folder is the level.** `playwright.config.ts` maps `contracts/`, `endpoints/`, `workflows/`
each to a project with its own timeout and report group. A spec in the wrong folder runs under the
wrong budget. Never encode the level in the title — only in the folder and the tag.

Import depth is counted from the file being written. A spec five directories deep uses **five**
`../`. The worked examples below carry the correct depths; copy them verbatim.

| From | To `common/` / `config/` | To module-local |
|---|---|---|
| `modules/<m>/api/tests/<level>/x.spec.ts` | `../../../../../common/…` | `../../schemas/<m>.schemas` |
| `modules/<m>/api/schemas/x.schemas.ts` | `../../../../common/…` | — |
| `modules/<m>/fixtures.ts` | `../../common/…` | — |
| `modules/<m>/ui/tests/<level>/x.spec.ts` | `../../../../../common/…` | `../../pages/x.page` |
| `modules/<m>/ui/pages/x.page.ts` | `../../../../common/…` | — |
| `common/services/x.service.ts` | `../routes/…`, `../builders/…`, `../helpers/…` | — |

---

## 2. The non-negotiable translation rules

These are what make a generated spec correct rather than merely compiling. Each is enforced in the
worked examples.

1. **Import `test`/`expect` from the fixtures, never from `@playwright/test`.**
   - A spec that needs the module's read-only **seed** imports its module file:
     `import { test, expect } from '../../../fixtures';`
   - A spec that needs no seed imports the shared wrapper:
     `import { test, expect } from '../../../../../common/fixtures/api.fixture';`
   - A UI spec imports `.../common/fixtures/ui.fixture` (adds `loginPage`, `dashboardPage`; `page` is Playwright's own built-in).

2. **One exact status per assertion.** Use the custom matchers (both are `async` — always `await`):

   | Matcher | Use when |
   |---|---|
   | `await expect(res).toHaveStatus(400)` | you assert a specific status (prints url + body on failure) |
   | `await expect(res).toMatchContract(schema)` | you assert 200 **and** the Zod shape together |
   | `await expect(res).toBeOK()` | any 2xx is genuinely correct (rare) |

   Both custom matchers accept either an `APIResponse` or the `{ res }` the client returns. **Never**
   `expect([400, 403]).toContain(res.status())` — a test that passes either way has stopped testing.
   If the case did not confirm the code against the handler, emit `test.skip(true, '[status: confirm]')`
   rather than a plausible guess.

3. **Schema: required by default, `.passthrough()` always.** A field present in every valid state is
   `z.string()` / `z.number()`; legitimately-absent is `.optional()`; present-but-null is `.nullable()`.
   Every object ends in `.passthrough()` — an unknown extra field is the backend adding something, not
   a contract break; a missing or wrong-typed **known** field is. Never an all-`.optional()` schema: it
   parses `{}` and catches nothing. Build the shape from a **real** response body, not from docs.

4. **`knownBug(id, summary)` goes on the line IMMEDIATELY BEFORE the assertion it explains** — never
   as the first line of the test. `knownBug` calls `test.fail(true)`, which turns *every* later failure
   into an expected one; placed too early it would swallow a stopped host, an auth failure, or a failed
   setup and report the suite green. The test still asserts the **correct** behaviour, so it stays green
   while the bug is open and turns red the day it is fixed — telling you to delete the marker.

5. **Mutating tests create their own data and clean up; read-only tests use the worker seed.**
   - One created resource → `try { … } finally { await cleanup(); }` using the ref the service returns.
   - More than one → `CleanupRegistry`; `runAll()` undoes in reverse and isolates failures.
   - Read-only shape/filter checks → the module's worker-scoped `seed` (created once per run, named with
     `seedName()` so the run-level sweep can find leftovers). Every seed id is **nullable**:
     `test.skip(seed.<id> === null, 'Seed unavailable')` — an environment condition, never a hidden bug.

6. **Route constants + `fillRoute()`, relative paths, no leading slash.** A leading slash discards the
   service base path and yields a mystifying 404. **Builders, never inline payloads** — the test
   overrides only the one field it is testing. **`uniqueName()` for every created resource** — a bare
   `Date.now()` collides across parallel workers.

7. **Assertions live only in `*.spec.ts`.** Services and page objects *act* and *wait* (`waitFor`);
   they never `expect()`. That keeps the report honest about what was verified.

8. **Naming + tracing.** Title: `[Module] - [Feature] - Verify that <specific observable behaviour>.`
   Tags go in Playwright's `{ tag: [...] }` option, never in the title string: `@<module>` + exactly
   one level tag (`@contract|@endpoint|@workflow|@smoke|@regression|@e2e`), plus `@security` where
   relevant. Emit **one `traces-case:` line per authored case / `test()` block** — in a JSDoc directly
   above that block, not one per file — and make the header title **equal the test title minus tags**
   (with the `tag` option the title string carries no tags, so the two are byte-identical). A file with
   five tests carries five lines. That one-to-one match is what lets phase 4 link each script to its
   Test Case almost automatically (`docs/ado-integration.md`). `authGuardTests(...)` registers one
   `test()` per route entry, so list one `traces-case:` line per entry in the JSDoc directly above the call.

---

## 3. API scaffolding — shared by the three API examples

Emitted once per module (layers 1–4), then reused by every spec. Shown here for the generic
`widgets` resource; `kit-builder` substitutes the real module name and the real fields.

### 3a. Route constants — `common/routes/routes.widgets.ts`

```ts
export const WidgetRoutes = {
  List:     'widgets',
  Create:   'widgets',
  GetById:  'widgets/{widgetId}',
  Update:   'widgets/{widgetId}',
  Delete:   'widgets/{widgetId}',
  Activate: 'widgets/{widgetId}/activate',
  History:  'widgets/{widgetId}/history',
} as const;

export { fillRoute } from './fill-route';
```

### 3b. Builder — `common/builders/widget-builder.ts`

```ts
import { uniqueName } from '../helpers/unique';

export interface WidgetPayload {
  name: string;
  tenantId: number;
  quantity: number;
  status: string;
  tags: string[];
}

/** A VALID default payload. Tests spread it and break exactly one field. */
export function buildWidget(tenantId: number, overrides: Partial<WidgetPayload> = {}): WidgetPayload {
  return {
    name: uniqueName('WIDGET'),   // parallel-safe and greppable
    tenantId,
    quantity: 1,
    status: 'Draft',
    tags: [],
    ...overrides,
  };
}
```

### 3c. Service — `common/services/widgets.service.ts`

The API's Page Object: every create/read/update/transition/cleanup for the resource lives here, so
no spec builds a payload or a route by hand. Returns a ref carrying its own undo.

```ts
import type { APIResponse } from '@playwright/test';
import { type ApiClient } from '../fixtures/api.fixture';
import { WidgetRoutes, fillRoute } from '../routes/routes.widgets';
import { buildWidget, type WidgetPayload } from '../builders/widget-builder';
import { json } from '../helpers/http';

export interface WidgetRef {
  widgetId: number;
  name: string;
  cleanup: () => Promise<void>;
}

export interface WidgetRecord {
  id: number;
  name: string;
  status: string;
  [key: string]: unknown;
}

export interface WidgetHistoryEntry {
  type: string;
  [key: string]: unknown;
}

export class WidgetService {
  constructor(
    private readonly client: ApiClient,     // typed — never `any`
    private readonly tenantId: number,
  ) {}

  /** Read: returns [] on a non-OK response — but LOGS the status first. */
  async list(params: Record<string, string | number> = {}): Promise<WidgetRecord[]> {
    const { res } = await this.client.get(WidgetRoutes.List, {
      params: { tenantId: this.tenantId, ...params },
    });
    if (!res.ok()) {
      console.warn(`[WidgetService.list] API returned ${res.status()}`);
      return [];
    }
    return json<WidgetRecord[]>(res);
  }

  async getById(widgetId: number): Promise<WidgetRecord> {
    const { res } = await this.client.get(fillRoute(WidgetRoutes.GetById, { widgetId }));
    if (!res.ok()) throw new Error(`getById(${widgetId}): ${res.status()} ${await res.text()}`);
    return json<WidgetRecord>(res);
  }

  /** Write: returns the ref plus its undo. Throws with status + body on failure. */
  async create(overrides: Partial<WidgetPayload> = {}): Promise<WidgetRef> {
    const payload = buildWidget(this.tenantId, overrides);
    const { res } = await this.client.post(WidgetRoutes.Create, { data: payload });
    if (!res.ok()) throw new Error(`create: ${res.status()} ${await res.text()}`);

    const body = await json<{ id: number }>(res);
    if (typeof body.id !== 'number') {
      throw new Error(`create: no id in response — ${JSON.stringify(body).slice(0, 300)}`);
    }
    return { widgetId: body.id, name: payload.name, cleanup: () => this.delete(body.id) };
  }

  async update(widgetId: number, updates: Partial<WidgetPayload>): Promise<APIResponse> {
    const { res } = await this.client.put(fillRoute(WidgetRoutes.Update, { widgetId }), { data: updates });
    return res;
  }

  /** A state transition — returns the raw response so the spec asserts the status. */
  async activate(widgetId: number): Promise<APIResponse> {
    const { res } = await this.client.put(fillRoute(WidgetRoutes.Activate, { widgetId }));
    return res;
  }

  async history(widgetId: number): Promise<WidgetHistoryEntry[]> {
    const { res } = await this.client.get(fillRoute(WidgetRoutes.History, { widgetId }));
    if (!res.ok()) return [];
    return json<WidgetHistoryEntry[]>(res);
  }

  /** Teardown: never throws. A throwing teardown masks the real failure. */
  async delete(widgetId: number): Promise<void> {
    await this.client.delete(fillRoute(WidgetRoutes.Delete, { widgetId })).catch(() => {});
  }
}
```

Export it from the barrel so specs import one path (`common/services/index.ts`):

```ts
export { WidgetService } from './widgets.service';
export type { WidgetRef, WidgetRecord, WidgetHistoryEntry } from './widgets.service';
```

> **No DELETE endpoint?** Archive instead. Neither? Rename the resource to an
> `AUTOMATION_`-prefixed value so orphans stay identifiable. Never leave a resource untracked.

### 3d. Schema — `modules/widgets/api/schemas/widgets.schemas.ts`

```ts
import { z } from 'zod';
import { auditFields } from '../../../../common/schemas/shared.schemas';

export const widgetSchema = z.object({
  id:         z.number(),                                // required: present in every valid state
  name:       z.string(),
  status:     z.enum(['Draft', 'Active', 'Retired']),
  quantity:   z.number(),
  categoryId: z.number().nullable(),                     // present, may be null
  tags:       z.array(z.string()).optional(),            // legitimately absent in some states
}).merge(auditFields).passthrough();                     // extra fields are not a break

export const widgetListSchema = z.array(widgetSchema);
```

### 3e. Module fixture + sweeper — `modules/widgets/fixtures.ts`

Copied from `modules/example/fixtures.ts`: a worker-scoped **read-only** `seed` plus a run-level
`sweep*`. Contract and read-only tests import `test`/`expect` from here to get `seed`.

```ts
import { test as base } from '../../common/fixtures/base';
import { json } from '../../common/helpers/http';
import { seedName } from '../../common/helpers/unique';
import type { Sweeper } from '../../common/setup/sweepers';

/** Ids created once per run, for READ-ONLY tests. Null when seeding was skipped/failed. */
export interface WidgetSeed {
  widgetId: number | null;
}

export const test = base.extend<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  { seed: WidgetSeed }
>({
  seed: [
    async ({ api }, use) => {
      let widgetId: number | null = null;
      try {
        const { res } = await api.post('widgets', { data: { name: seedName('WIDGET') } });
        if (res.ok()) widgetId = (await json<{ id: number }>(res)).id;
      } catch {
        // Best-effort: leave the id null so dependent tests skip rather than fail en masse.
      }
      await use({ widgetId });
      if (widgetId !== null) {
        await api.delete(`widgets/${widgetId}`).catch(() => {});
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '../../common/fixtures/base';

/** Register in `common/setup/sweepers.ts`: finds this run's seed widgets by name prefix. */
export const sweepWidgets: Sweeper = async ({ apis, prefix }) => {
  const removed: string[] = [];
  try {
    const { res } = await apis.api.get('widgets', { params: { nameStartsWith: prefix } });
    if (!res.ok()) return removed;
    const items = await json<Array<{ id: number }>>(res);
    for (const item of items) {
      await apis.api.delete(`widgets/${item.id}`).catch(() => {});
      removed.push(`widget ${item.id}`);
    }
  } catch {
    /* best-effort — the sweep never fails the run */
  }
  return removed;
};
```

---

## 4. Worked example — Contract spec

`modules/widgets/api/tests/contracts/widgets.contract.spec.ts`

Shape verification only — **creates no data**. Reads the worker seed, so it imports `test`/`expect`
from the module `fixtures.ts`. `authGuardTests` registers one `401-without-a-token` test per route
(tagged `@security`). `toMatchContract` asserts 200 + the Zod shape in one step. The last test is a
pure unit check that the schema actually constrains something — the guard against an
all-`.optional()` schema.

**Imports:** module `fixtures` · `common/helpers/http` · `common/fixtures/helpers` ·
`common/routes/routes.widgets` · `../../schemas/widgets.schemas`.

```ts
/**
 * @generated-by docs/script-generation.md · level: contract · module: widgets
 *
 * Read-only: uses the worker seed. Creates no data. Each case carries its own traces-case
 * line directly above its test() — one line per case, never one per file.
 */
import { test, expect } from '../../../fixtures';
import { softAssertResponseTime } from '../../../../../common/helpers/http';
import { authGuardTests } from '../../../../../common/fixtures/helpers';
import { WidgetRoutes, fillRoute } from '../../../../../common/routes/routes.widgets';
import { widgetSchema, widgetListSchema } from '../../schemas/widgets.schemas';

/** Route params are irrelevant to a 401: the token is rejected before they are used. */
const ANY_ID = 1;

/**
 * authGuardTests registers one test() per route entry, so one traces-case line per entry.
 * traces-case: "Widgets - List - Verify that GET widgets returns 401 without a token."
 * traces-case: "Widgets - Detail - Verify that GET widgets/{id} returns 401 without a token."
 */
authGuardTests('api', [
  { title: 'Widgets - List - Verify that GET widgets returns 401 without a token.', method: 'get', route: WidgetRoutes.List },
  { title: 'Widgets - Detail - Verify that GET widgets/{id} returns 401 without a token.', method: 'get', route: fillRoute(WidgetRoutes.GetById, { widgetId: ANY_ID }) },
], ['@widgets', '@contract']);

/**
 * traces-case: "Widgets - List - Verify that GET widgets conforms to widgetListSchema."
 */
test('Widgets - List - Verify that GET widgets conforms to widgetListSchema.',
  { tag: ['@widgets', '@contract', '@smoke'] },
  async ({ api, profile }, testInfo) => {
    const { res, ms } = await api.get(WidgetRoutes.List, { params: { tenantId: profile.testTenantId } });
    await expect(res).toMatchContract(widgetListSchema);
    softAssertResponseTime(testInfo, ms);
  });

/**
 * traces-case: "Widgets - Detail - Verify that GET widgets/{id} conforms to widgetSchema."
 */
test('Widgets - Detail - Verify that GET widgets/{id} conforms to widgetSchema.',
  { tag: ['@widgets', '@contract'] },
  async ({ api, seed }) => {
    test.skip(seed.widgetId === null, 'Seed widget unavailable');   // environment, not a defect
    const { res } = await api.get(fillRoute(WidgetRoutes.GetById, { widgetId: seed.widgetId as number }));
    await expect(res).toMatchContract(widgetSchema);
  });

/**
 * Pure unit test — no network, no environment. Proves the schema constrains something.
 * traces-case: "Widgets - Detail - Verify that widgetSchema rejects a body missing the required id field."
 */
test('Widgets - Detail - Verify that widgetSchema rejects a body missing the required id field.',
  { tag: ['@widgets', '@contract'] },
  () => {
    const parsed = widgetSchema.safeParse({ name: 'no id' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((i) => i.path.includes('id'))).toBe(true);
  });
```

---

## 5. Worked example — Endpoint spec

`modules/widgets/api/tests/endpoints/widgets.endpoint.spec.ts`

One operation, one condition, one `test()`. The happy path proves the create *persists* (a follow-up
read, not the create response). The negative tests break exactly one field via the builder. The third
test is the **`knownBug` placement** demonstration: the marker sits on the line immediately before the
`toHaveStatus(400)` it explains, so only that assertion is treated as expected-to-fail.

**Imports:** `common/fixtures/api.fixture` · `common/helpers/http` · `common/fixtures/helpers` ·
`common/routes/routes.widgets` · `common/builders/widget-builder` · `common/services`.

```ts
/**
 * @generated-by docs/script-generation.md · level: endpoint · module: widgets
 *
 * Mutating tests create their own data and clean up in finally; read-only checks use the seed.
 * Each test() carries its own traces-case line directly above it.
 */
import { test, expect } from '../../../../../common/fixtures/api.fixture';
import { json, skipIfRateLimited } from '../../../../../common/helpers/http';
import { knownBug } from '../../../../../common/fixtures/helpers';
import { WidgetRoutes, fillRoute } from '../../../../../common/routes/routes.widgets';
import { buildWidget } from '../../../../../common/builders/widget-builder';
import { WidgetService } from '../../../../../common/services';

/**
 * traces-case: "Widgets - Create - Verify that POST widgets creates a widget successfully."
 */
test('Widgets - Create - Verify that POST widgets creates a widget successfully.',
  { tag: ['@widgets', '@endpoint', '@smoke'] },
  async ({ api, profile }) => {
    const widgets = new WidgetService(api, profile.testTenantId);
    const { widgetId, cleanup } = await widgets.create();
    try {
      expect(widgetId).toBeGreaterThan(0);
      // Created means retrievable — a 201 alone does not prove persistence.
      const widget = await widgets.getById(widgetId);
      expect(widget.status).toBe('Draft');
    } finally {
      await cleanup();
    }
  });

/**
 * traces-case: "Widgets - Create - Verify that POST widgets returns 400 when name is missing."
 */
test('Widgets - Create - Verify that POST widgets returns 400 when name is missing.',
  { tag: ['@widgets', '@endpoint'] },
  async ({ api, profile }) => {
    // Builder gives a valid payload; the test breaks exactly one thing, visibly.
    const { name: _omitted, ...withoutName } = buildWidget(profile.testTenantId);
    const { res } = await api.post(WidgetRoutes.Create, { data: withoutName });
    skipIfRateLimited(res);
    await expect(res).toHaveStatus(400);
  });

/**
 * traces-case: "Widgets - Create - Verify that POST widgets returns 400 when quantity is negative."
 */
test('Widgets - Create - Verify that POST widgets returns 400 when quantity is negative.',
  { tag: ['@widgets', '@endpoint'] },
  async ({ api, profile }) => {
    const { res } = await api.post(WidgetRoutes.Create, {
      data: buildWidget(profile.testTenantId, { quantity: -1 }),
    });
    skipIfRateLimited(res);
    // PLACEMENT RULE: knownBug on the line IMMEDIATELY BEFORE the assertion it explains.
    knownBug('BUG-API-07', 'POST widgets returns 500 (unhandled) instead of 400 for a negative quantity');
    await expect(res).toHaveStatus(400);
  });

/**
 * traces-case: "Widgets - Detail - Verify that GET widgets/{id} returns 404 for an unknown id."
 */
test('Widgets - Detail - Verify that GET widgets/{id} returns 404 for an unknown id.',
  { tag: ['@widgets', '@endpoint'] },
  async ({ api }) => {
    const { res } = await api.get(fillRoute(WidgetRoutes.GetById, { widgetId: 999_999_999 }));
    await expect(res).toHaveStatus(404);
  });

/**
 * traces-case: "Widgets - List - Verify that GET widgets returns 200 and an empty array when nothing matches."
 */
test('Widgets - List - Verify that GET widgets returns 200 and an empty array when nothing matches.',
  { tag: ['@widgets', '@endpoint'] },
  async ({ api, profile }) => {
    const { res } = await api.get(WidgetRoutes.List, {
      params: { tenantId: profile.testTenantId, name: 'AUTOMATION_NO_SUCH_NAME' },
    });
    await expect(res).toHaveStatus(200);          // an empty result is a successful query
    const body = await json<unknown>(res);
    const items = Array.isArray(body) ? body : (body as { data?: unknown[] }).data ?? [];
    expect(items).toHaveLength(0);
  });

/**
 * P0 on every data-returning endpoint of a multi-tenant API.
 * traces-case: "Widgets - Security - Verify that a tenant A token cannot read tenant B widgets."
 */
test('Widgets - Security - Verify that a tenant A token cannot read tenant B widgets.',
  { tag: ['@widgets', '@endpoint', '@security'] },
  async ({ api, profile }) => {
    test.skip(!profile.crossTenantId, 'CROSS_TENANT_ID is not set');
    const { res } = await api.get(WidgetRoutes.List, { params: { tenantId: profile.crossTenantId! } });
    await expect(res).toHaveStatus(403);   // confirm against your authorization policy
  });
```

**Per-operation coverage to work through** (hand each to `author-api-cases`; emit one `test()` per line):

```
POST/PUT  happy · each required field missing (one at a time) · each field at and one over its
          boundary · duplicate · missing related entity · no auth (401) · wrong role (403) · wrong state
GET       valid id · no auth · unknown id · empty result (200 + [], not 404) · each query param valid/invalid
DELETE    happy + follow-up GET proving it is gone · no auth · unknown id · system record · still referenced
```

---

## 6. Worked example — Workflow spec

`modules/widgets/api/tests/workflows/widget-lifecycle.workflow.spec.ts`

A workflow earns the name at **≥5 meaningful steps**, each in a `test.step()`, with **at least one
transition verified by a follow-up GET**, **at least one blocked operation asserted**, and teardown in
`finally` via `CleanupRegistry`. Without `test.step()`, a failed multi-call test is an undifferentiated
trace. This one also shows a `knownBug` inside a step.

**Imports:** `common/fixtures/api.fixture` · `common/helpers/cleanup` · `common/fixtures/helpers` ·
`common/services`.

```ts
/**
 * @generated-by docs/script-generation.md · level: workflow · module: widgets
 *
 * Chains: create → list → activate → persisted (follow-up GET) → blocked edit → history.
 * Owns everything it creates; teardown runs in reverse in finally.
 */
import { test, expect } from '../../../../../common/fixtures/api.fixture';
import { CleanupRegistry } from '../../../../../common/helpers/cleanup';
import { knownBug } from '../../../../../common/fixtures/helpers';
import { WidgetService } from '../../../../../common/services';

/**
 * traces-case: "Widgets - Lifecycle - Verify that a widget can be created, activated and retired."
 */
test('Widgets - Lifecycle - Verify that a widget can be created, activated and retired.',
  { tag: ['@widgets', '@workflow', '@smoke'] },
  async ({ api, profile }) => {
    const widgets = new WidgetService(api, profile.testTenantId);
    const cleanup = new CleanupRegistry();
    let widgetId = 0;

    try {
      await test.step('1 — create the widget', async () => {
        const created = await widgets.create();
        widgetId = created.widgetId;
        cleanup.add(`widget ${widgetId}`, created.cleanup);
        expect(widgetId).toBeGreaterThan(0);
      });

      await test.step('2 — it appears in the list', async () => {
        const widgetList = await widgets.list();            // NEVER shadow the service variable
        expect(widgetList.some((w) => w.id === widgetId)).toBe(true);
      });

      await test.step('3 — activate it', async () => {
        const res = await widgets.activate(widgetId);
        await expect(res).toHaveStatus(200);
      });

      await test.step('4 — the transition persisted (follow-up GET)', async () => {
        // Assert against a fresh read, never the response of the call that changed it —
        // plenty of APIs echo a request back without having committed it.
        const widget = await widgets.getById(widgetId);
        expect(widget.status).toBe('Active');
      });

      await test.step('5 — a retired widget cannot be edited', async () => {
        await widgets.update(widgetId, { status: 'Retired' });
        // Assert the retire persisted (follow-up GET) before asserting the blocked edit.
        expect((await widgets.getById(widgetId)).status).toBe('Retired');
        const res = await widgets.update(widgetId, { quantity: 99 });
        knownBug('BUG-API-12', 'a Retired widget still accepts edits (200) instead of being blocked (409)');
        await expect(res).toHaveStatus(409);               // blocked transitions matter too
      });

      await test.step('6 — the history records the activation', async () => {
        const history = await widgets.history(widgetId);
        expect(history.some((e) => e.type === 'Activated')).toBe(true);
      });
    } finally {
      await cleanup.runAll();     // reverse order; one failure never abandons the rest
    }
  });
```

> **Singletons (settings, config, feature flags).** When there is only ONE of a resource per tenant,
> "create your own data" is impossible. Prefer read-only coverage; else snapshot → mutate → restore in
> `finally`; and put every test that mutates the same singleton in ONE file with
> `test.describe.configure({ mode: 'serial' })` at the top. Never leave a singleton mutated.

---

## 7. The UI half

Phase 3 brings the UI tier to **parity** with the API tier: smoke / regression / e2e mirror
contract / endpoint / workflow. The emit order is two layers instead of four:

```
authored UI case (+ flow)
        │
        ▼
  page object   modules/<m>/ui/pages/<name>.page.ts    locators + action methods, NO expect()
        │
        ▼
  spec          modules/<m>/ui/tests/{smoke,regression,e2e}/<f>.<level>.spec.ts
```

Rules specific to UI:

- **The `page` arrives authenticated.** The template's `auth-setup` project logs in once per run and
  saves storage state; the UI projects load it. The spec never logs in — it starts on an authed session.
- **Build preconditions through the API service, then assert in the UI.** A resource created over HTTP
  takes under a second; the same setup clicked through the UI takes 30+ and fails for reasons unrelated
  to what you are testing. This is what keeps UI suites fast and honest.
- **Page objects hold locators AND action methods together, and contain NO `expect()`.** Waits
  (`waitFor`, `waitForURL`) are fine — they do not record pass/fail. Assertions belong in the spec.
- **Locator priority:** `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId`
  → `#id` → CSS → XPath. A role-based locator survives a CSS refactor; a class-based one does not.
- **Guard on the environment:** `test.skip(!profile.webAppUrl, 'WEB_APP_URL is not set — the UI tier is off.')`.
- **Use the Playwright MCP to discover locators**, not to generate whole specs. Drive the real screen
  (`browser_navigate`, `browser_snapshot`), read the accessibility tree, and translate each confirmed
  role/name into a `readonly Locator` on the page object. The MCP is the exploration tool; the emitted
  artifact is the typed page object + spec below. Record any surprising selector in
  `docs/subsystems/<module>.md`.

### 7a. Page object — `modules/widgets/ui/pages/widgets.page.ts`

Composes the shared `ToastComponent` and `ModalComponent` from `common/components/`.

**Imports:** `@playwright/test` · `../../../../common/components/toast.component` ·
`../../../../common/components/modal.component`.

```ts
import { type Locator, type Page } from '@playwright/test';
import { ToastComponent } from '../../../../common/components/toast.component';
import { ModalComponent } from '../../../../common/components/modal.component';

export class WidgetsPage {
  // ── Composed components ───────────────────────────────────────────────────
  readonly toast: ToastComponent;
  readonly modal: ModalComponent;

  // ── Locators (role-first) ─────────────────────────────────────────────────
  readonly heading: Locator;
  readonly newButton: Locator;
  readonly nameInput: Locator;
  readonly quantityInput: Locator;
  readonly saveButton: Locator;
  readonly searchInput: Locator;
  readonly rows: Locator;
  readonly activateButton: Locator;
  readonly statusBadge: Locator;

  constructor(readonly page: Page) {
    this.toast = new ToastComponent(page);
    this.modal = new ModalComponent(page);

    this.heading = page.getByRole('heading', { name: 'Widgets' });
    this.newButton = page.getByRole('button', { name: /new widget/i });
    this.nameInput = page.getByLabel('Name');
    this.quantityInput = page.getByLabel('Quantity');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.searchInput = page.getByRole('searchbox');
    this.rows = page.getByRole('row');
    this.activateButton = page.getByRole('button', { name: /activate/i });
    this.statusBadge = page.getByTestId('widget-status');
  }

  // ── Navigation / actions — waits only, never expect() ──────────────────────
  async navigate(): Promise<void> {
    await this.page.goto('/widgets');
    await this.page.waitForURL(/widgets/);        // a wait, not an assertion
  }

  async createWidget(name: string, quantity = 1): Promise<void> {
    await this.newButton.click();
    await this.nameInput.fill(name);
    await this.quantityInput.fill(String(quantity));
    await this.saveButton.click();
    await this.toast.container.waitFor();         // wait for the UI to settle
  }

  async open(name: string): Promise<void> {
    await this.rows.filter({ hasText: name }).getByRole('link').first().click();
  }

  async activate(): Promise<void> {
    await this.activateButton.click();
    await this.modal.waitForOpen();
    await this.modal.confirm();
    await this.toast.waitForSuccess();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.keyboard.press('Enter');
  }

  async deleteFromRow(name: string): Promise<void> {
    await this.rows.filter({ hasText: name }).getByRole('button', { name: /delete/i }).click();
    await this.modal.waitForOpen();
    await this.modal.confirm();
    await this.toast.waitForSuccess();
  }
}
```

### 7b. Worked example — UI smoke

`modules/widgets/ui/tests/smoke/widgets.smoke.spec.ts` — one or two per module: the screen loads and
its core action is available. Deeper behaviour goes in `regression/`; cross-screen journeys in `e2e/`.

**Imports:** `common/fixtures/ui.fixture` · `../../pages/widgets.page`.

```ts
/**
 * @generated-by docs/script-generation.md · level: ui-smoke · module: widgets
 */
import { test, expect } from '../../../../../common/fixtures/ui.fixture';
import { WidgetsPage } from '../../pages/widgets.page';

/**
 * traces-case: "Widgets - Screen - Verify that the Widgets screen loads and its primary action is available."
 */
test('Widgets - Screen - Verify that the Widgets screen loads and its primary action is available.',
  { tag: ['@widgets', '@ui', '@smoke'] },
  async ({ page, profile }) => {
    test.skip(!profile.webAppUrl, 'WEB_APP_URL is not set — the UI tier is off.');

    const widgets = new WidgetsPage(page);
    await widgets.navigate();

    // Every assertion lives here, in the spec — never inside the page object.
    await expect(widgets.heading).toBeVisible();
    await expect(widgets.newButton).toBeEnabled();
  });
```

### 7c. Worked example — UI regression

`modules/widgets/ui/tests/regression/widgets.regression.spec.ts` — per-feature behaviour (the bulk of
the UI suite). The precondition is built through the API service, then verified in the UI.

**Imports:** `common/fixtures/ui.fixture` · `../../pages/widgets.page` · `common/services`.

```ts
/**
 * @generated-by docs/script-generation.md · level: ui-regression · module: widgets
 */
import { test, expect } from '../../../../../common/fixtures/ui.fixture';
import { WidgetsPage } from '../../pages/widgets.page';
import { WidgetService } from '../../../../../common/services';

/**
 * traces-case: "Widgets - List - Verify that a newly created widget appears in the list."
 */
test('Widgets - List - Verify that a newly created widget appears in the list.',
  { tag: ['@widgets', '@ui', '@regression'] },
  async ({ page, api, profile }) => {
    test.skip(!profile.webAppUrl, 'WEB_APP_URL is not set — the UI tier is off.');

    // API precondition — under a second. The same setup clicked through the UI is 30+ seconds.
    const widgets = new WidgetService(api, profile.testTenantId);
    const { name, cleanup } = await widgets.create();
    try {
      const widgetsPage = new WidgetsPage(page);
      await widgetsPage.navigate();
      await widgetsPage.search(name);
      await expect(page.getByText(name)).toBeVisible();   // assertions live HERE
    } finally {
      await cleanup();
    }
  });
```

### 7d. Worked example — UI e2e

`modules/widgets/ui/tests/e2e/widget-journey.e2e.spec.ts` — a full journey through the real screens,
each leg in a `test.step()`. This one is single-module for clarity; a cross-**module** e2e composes a
second module's page object and service exactly the same way (see §8). Because the create happens
through the UI, the test reads the new widget's id back over the API and registers a `cleanup` undo, so
a failure before the UI delete leg still removes it. **Do not rely on the run-level sweep here:** the
sweep only reclaims `seedName()`-prefixed seed resources (`AUTOMATION_SEED_<runId>_…`), not an
`AUTOMATION_`-named widget created in a spec.

**Imports:** `common/fixtures/ui.fixture` · `../../pages/widgets.page` · `common/services` · `common/helpers/unique`.

```ts
/**
 * @generated-by docs/script-generation.md · level: ui-e2e · module: widgets
 */
import { test, expect } from '../../../../../common/fixtures/ui.fixture';
import { WidgetsPage } from '../../pages/widgets.page';
import { WidgetService } from '../../../../../common/services';
import { uniqueName } from '../../../../../common/helpers/unique';

/**
 * traces-case: "Widgets - Journey - Verify that a widget can be created, activated and deleted through the UI."
 */
test('Widgets - Journey - Verify that a widget can be created, activated and deleted through the UI.',
  { tag: ['@widgets', '@ui', '@e2e'] },
  async ({ page, api, profile, cleanup }) => {
    test.skip(!profile.webAppUrl, 'WEB_APP_URL is not set — the UI tier is off.');

    const widgets = new WidgetService(api, profile.testTenantId);
    const widgetsPage = new WidgetsPage(page);
    const name = uniqueName('WIDGET_E2E');

    await test.step('1 — open the Widgets screen', async () => {
      await widgetsPage.navigate();
      await expect(widgetsPage.heading).toBeVisible();
    });

    await test.step('2 — create a widget through the form', async () => {
      await widgetsPage.createWidget(name, 3);
      await widgetsPage.search(name);
      await expect(page.getByText(name)).toBeVisible();

      // Read the id back over the API and register an undo, so a failure before the UI
      // delete leg still removes the widget. delete() is idempotent, so the happy path
      // running both the UI delete and this undo is harmless.
      const created = (await widgets.list({ name })).find((w) => w.name === name);
      if (created) {
        const id = created.id;
        cleanup.add('delete e2e widget', () => widgets.delete(id));
      }
    });

    await test.step('3 — open it and activate it', async () => {
      await widgetsPage.open(name);
      await widgetsPage.activate();
      await expect(widgetsPage.statusBadge).toHaveText(/active/i);
    });

    await test.step('4 — delete it and confirm it is gone', async () => {
      await widgetsPage.navigate();
      await widgetsPage.search(name);
      await widgetsPage.deleteFromRow(name);
      await expect(page.getByText(name)).toBeHidden();
    });
  });
```

---

## 8. Cross-module data

When a flow spans two modules, call the **owning module's service** — never re-implement a second,
slightly-wrong creation path. Register each undo so teardown runs in reverse:

```ts
const categories = new CategoryService(apis.api, profile.testTenantId);
const widgets    = new WidgetService(apis.api, profile.testTenantId);

const category = await categories.create();
cleanup.add('category', category.cleanup);

const widget = await widgets.create({ categoryId: category.categoryId });
cleanup.add('widget', widget.cleanup);
// teardown runs in reverse: widget, then category
```

The same holds for a cross-module UI e2e: compose both page objects, build the shared precondition
through whichever service owns it, and assert in the UI.

### 8a. Cross-module reuse (mandatory)

**Standard:** `knowledge/standards/cross-module-reuse.md` (the kit's flagship DRY rule), resting on
`knowledge/standards/fixtures.md` (`mergeTests` composition). This is not advisory — it is a
generation rule the per-phase self-check verifies.

When a flow under test needs a resource that **another module owns**, the generated test **reuses
that module's own reusable method** — its service (API) or page object (UI) — injected through the
**merged fixtures (`mergeTests`)**, and **must not duplicate** that creation path. A second,
slightly-wrong local creator drifts from the real one and silently tests the wrong thing. The
dependent test still owns its setup end to end: it creates the prerequisite, uses it, and cleans it
up in reverse, so a **business dependency never becomes a test-ordering dependency** — the two
modules' tests stay independent.

> **Generic worked example — a deal needs a customer.** `Customer` and `Deal` here are **placeholder
> modules** standing in for *any* pair where one resource depends on another; substitute the QA's
> real modules. The Deal spec creates its OWN Customer by calling the Customer module's reusable
> method, gets the id, creates the Deal against it, asserts, and tears down in reverse. No Customer
> payload, route, or builder is re-implemented inside the Deal module.

```ts
// The merged fixture a cross-module Deal spec imports. mergeTests is the official composition
// mechanism that injects the Customer module's service/POM into Deal tests.
import { mergeTests } from '@playwright/test';
import { test as customerTest } from '../../customer/fixtures';
import { test as dealTest } from '../fixtures';
export const test = mergeTests(customerTest, dealTest);
```
```ts
// API — the Deal test REUSES customers.createCustomer(); it never posts its own customer payload.
test('Deal - Create - Verify that a deal can be created for a customer.',
  { tag: ['@deal', '@endpoint'] },
  async ({ api, profile, cleanup }) => {
    const customers = new CustomerService(api, profile.testTenantId);
    const deals     = new DealService(api, profile.testTenantId);

    const customer = await customers.createCustomer();   // REUSE — the owning module's method
    cleanup.add('customer', customer.cleanup);

    const deal = await deals.create({ customerId: customer.customerId });
    cleanup.add('deal', deal.cleanup);                   // teardown reverses: deal, then customer

    expect(deal.dealId).toBeGreaterThan(0);
  });
```
```ts
// UI — same principle: build the Customer through the owning screen's reusable method
// (or, faster, over the Customer API service), then drive the Deal screen.
const customerId = await customerPage.createCustomer();  // reuse — not a re-clicked duplicate
await dealPage.createForCustomer(customerId);
```

**Never:** a local `makeCustomer()` inside the Deal module that posts its own payload; relying on a
customer "some earlier test" created (a test-ordering dependency — create your own); or copying the
Customer module's route constants, builder, or page-object methods instead of importing them.
**Business dependency ≠ test dependency.** (§8 above is the same rule for data a service already
owns; this subsection is the mandatory, standard-cited form with the merged-fixtures composition.)

---

## 9. Non-REST shapes

The framework assumes REST + JSON because most APIs are. Other shapes use the same client — only the
route file and the assertions change.

- **GraphQL.** One route constant (`'graphql'`), the query in the body. It returns **200 for business
  errors**, so assert `body.errors` is undefined *before* validating `body.data` against the schema.
- **XML / SOAP.** `json()` throws — read `await res.text()` and assert on extracted values, or add an
  XML parser and validate the converted object. Decide once per module; record it in the subsystem doc.
- **Binary** (PDF, CSV, images): assert on `res.headers()['content-type']` and `(await res.body()).length`,
  never the body text.

---

## 10. Dates and times

A quiet, recurring source of flakes. Relative dates only (`isoDaysFromNow(7)`), never a literal. Compare
instants, not strings — the API may return `+00:00` where you wrote `Z`. Assume the server, you, and CI
are in different timezones; a test that depends on "today" fails at midnight somewhere, so assert a range.

---

## 11. Definition of done (per generated spec)

`kit-builder` does not consider a spec emitted until:

- `npm run typecheck` is clean and `npm run lint` is clean (lint catches the floating-promise — an
  unawaited `expect()` silently passes, the worst failure mode for a test suite).
- The test **passes twice** (flakiness shows on the second run).
- The thing is **broken on purpose once** and the test fails for the right reason — a test that has
  never failed is a test with no evidence it works.
- It creates its own data and cleans up (or correctly uses the read-only seed).
- One exact status per assertion; module tag + one level tag via the `{ tag: [...] }` option (not in the
  title); no hardcoded URL, id, or timestamp; `test.step()` in every workflow; one `traces-case:` line per
  `test()` block, its title equal to the test title, for phase-4 linking.
- Anything surprising is written into `docs/subsystems/<module>.md`.

---

## 12. Secret-scan gate

Before any commit `kit-builder` makes, it runs the kit's secret scan over the staged diff — the same
gate described in `docs/phases.md` and the spec's section 7 — and refuses to commit on a hit. A
generated spec must contain **no** base URL, token, credential, account id, org name, or product name:
those live only in the git-ignored `.env`, reached through `profile`. The scan looks for signature query
parameters, known host patterns, and password-shaped assignments; it must report zero matches. (Stated
as prose deliberately, so this doc does not trip its own scan.)
