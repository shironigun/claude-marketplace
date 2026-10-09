# Working in this workspace

House rules for anyone — human or agent — writing tests in this workspace.

**This file is self-sufficient.** Everything needed to write a correct test is
here: the fixture surface, exact import paths, complete copy-ready examples for
every artifact type, the commands, and the failure modes.

Stack: Playwright + TypeScript + Zod. API-first; the UI tier is scaffolded.

---

## 0. Orientation — 60 seconds

```
config/services.ts        the API hosts. Adding one is an entry here + a key in .env
config/profiles.index.ts  environments/tenants; validates config loudly at startup
common/api/client.ts      the one HTTP client — auth, latency, 401 re-mint, host-down
common/auth/token.ts      the ONLY file that knows your identity provider
common/fixtures/           base → api.fixture / ui.fixture; matchers + helpers
common/routes/            route templates + fillRoute()
common/builders/          request payload factories
common/services/          API service classes — the API's Page Object
common/schemas/           shared Zod primitives
common/helpers/           http · cleanup · schema · unique
common/setup/             auth-check + sweep + browser auth (Playwright projects)
modules/<module>/fixtures.ts                            module seed + sweeper
modules/<module>/api/tests/{contracts,endpoints,workflows}/
modules/<module>/ui/tests/{smoke,regression,e2e}/
```

**The folder is the level.** `playwright.config.ts` maps each folder to a project
with its own timeout, and the report groups by it. A spec in the wrong folder
runs under the wrong budget and is reported under the wrong level.

Each layer knows only the one below it: a spec never builds a header, a service
never reads env, a builder never makes a network call. That is what keeps any
single change local.

---

## 1. Before you write anything

1. **`npm run verify:setup`.** If it is red, fix that first — every other symptom
   is downstream of it. The output names the cause and the fix.
2. **Read `docs/subsystems/<module>.md`** for the module you are touching. It
   holds confirmed domain knowledge — API quirks, state machines, cross-module
   prerequisites. Treat it as top-rank evidence rather than rediscovering the
   same things differently.
3. **Derive from the backend source**, never from assumption: routes from the
   controllers, validation from the validators, business rules from the services,
   status codes from the handlers. Where you must infer, verify against a real
   response before it becomes an assertion.

---

## 2. The fixture surface

Every API spec starts with exactly this import:

```ts
import { test, expect } from '../../../../../common/fixtures/api.fixture';
```

That gives these fixtures:

| Fixture | Type | What it is |
| --- | --- | --- |
| `api` | `ApiClient` | the **primary** service's client (`primary: true` in `config/services.ts`) |
| `apis` | `Record<ServiceKey, ApiClient>` | every registered service — `apis.api`, `apis.orders` |
| `profile` | `Profile` | the active environment/tenant config |
| `cleanup` | `CleanupRegistry` | per-test undo stack; failures become annotations |

A **module** adds its own worker-scoped `seed` by extending the base fixture in
`modules/<module>/fixtures.ts` (see modules/README.md). Specs in that module import
`test`/`expect` from their module `fixtures.ts` to get `seed`; specs that need no seed
import the shared `api.fixture` shown above.

Two custom matchers (`common/fixtures/matchers.ts`) ship on `expect`:

```ts
await expect(res).toHaveStatus(400);        // exact status, prints url + body on failure
await expect(res).toMatchContract(schema);  // 200 + Zod shape, readable issue list
```

And test-body helpers (`common/fixtures/helpers.ts`): `knownBug(id, summary)`,
`onlyFor`/`skipFor(profile, variants, reason)`, `authGuardTests(host, routes, tags)`.

### `ApiClient`

```ts
const { res, ms } = await api.get(route, opts);
// also: .post .put .patch .delete — all return { res: APIResponse; ms: number }
```

`opts` (all optional):

```ts
{
  params?:    Record<string, string | number | boolean>;  // query string
  headers?:   Record<string, string>;                     // overrides
  data?:      unknown;                                    // JSON body
  form?:      Record<string, string | number | boolean>;  // urlencoded body
  multipart?: Record<string, … | { name, mimeType, buffer }>;  // file upload
  omitAuth?:  boolean;   // send no token — the only way to assert the 401 path
  timeout?:   number;    // ms, per request
}
```

The client injects auth, measures latency, and re-mints the token once on an
unexpected 401. Never build an Authorization header yourself.

`api.userId` holds the authenticated user's id when the token carries one.

**Headers every request needs** — a gateway subscription key, a static API key
alongside the bearer, a required API-version header — go in `DEFAULT_HEADERS`
(JSON) in `.env`, not in each call:

```bash
DEFAULT_HEADERS={"Ocp-Apim-Subscription-Key":"…","Api-Version":"2024-01-01"}
```

They are merged before the caller's headers, so a test can still override one.
**A signed request** (HMAC, a per-request nonce, an idempotency key) is computed
in `ApiClient.buildOptions()` — every request passes through that one method.

### `profile`

```ts
profile.testTenantId    // number — the tenant/account the tests run inside
profile.crossTenantId   // number | undefined — a DIFFERENT tenant, for isolation tests
profile.name            // 'default' | 'staging' | …
profile.variant         // number | undefined — product-variant discriminator
profile.services        // Record<ServiceKey, string | undefined> — base URLs
profile.auth.strategy   // 'password' | 'client-credentials' | 'static' | 'none'
profile.credentials     // { tenantId, userName, password }
profile.webAppUrl       // '' when the UI tier is not configured
```

### `seed` (per-module)

Defined in `modules/<module>/fixtures.ts`, not globally — a worker-scoped fixture that
creates shared **read-only** data once per run (named with `seedName()` so the `sweep`
teardown can find leftovers). Anything a test mutates, it creates itself. Every id is
nullable — guard, do not assume.

```ts
import { test, expect } from '../../../fixtures';   // the module's own fixtures.ts
test('...', async ({ api, seed }) => {
  test.skip(seed.exampleId === null, 'Seed resource unavailable');
  // ...
});
```

### UI specs

```ts
import { test, expect } from '../../../../../common/fixtures/ui.fixture';
// gives: page (pre-authenticated) · loginPage · dashboardPage · profile · api · cleanup
```

---

## 3. Import paths — the thing that is easiest to get wrong

Depth is counted from the file you are writing.

| From | To `common/` or `config/` | To module-local |
| --- | --- | --- |
| `modules/<m>/api/tests/<level>/x.spec.ts` | `../../../../../common/…` | `../../schemas/<m>.schemas` |
| `modules/<m>/api/schemas/x.schemas.ts` | `../../../../common/…` | — |
| `modules/<m>/ui/tests/<level>/x.spec.ts` | `../../../../../common/…` | `../../pages/x.page` |
| `modules/<m>/ui/pages/x.page.ts` | `../../../../common/…` | — |
| `common/services/x.service.ts` | `../fixtures/…`, `../builders/…` | — |

A spec that is five levels deep uses **five** `../`. Copy the import depths from the
worked examples in §6 if unsure; they are correct.

---

## 4. Helpers, protocols and time

```ts
import { json, softAssertResponseTime, skipIfRateLimited, bodyPreview }
  from '../../../../../common/helpers/http';
import { CleanupRegistry } from '../../../../../common/helpers/cleanup';
import { formatZodError }  from '../../../../../common/helpers/schema';
import { uniqueName, uniqueEmail, isoDaysFromNow, seedName }
  from '../../../../../common/helpers/unique';
import { fillRoute } from '../../../../../common/routes/fill-route';
```

| Helper | Use |
| --- | --- |
| `json<T>(res)` | parse a body; on non-JSON it reports the status + first 500 chars instead of `Unexpected token <` |
| `formatZodError(err)` | readable schema failure message — always pass it to `expect` |
| `softAssertResponseTime(testInfo, ms)` | annotates slow responses, never fails |
| `skipIfRateLimited(res)` | 429 is infra, not a defect — skip and let the retry pick it up |
| `CleanupRegistry` | ordered, error-isolated teardown for >1 resource |
| `uniqueName('ORDER')` | `AUTOMATION_ORDER_1754922000123_k3f9a` |
| `fillRoute(tpl, params)` | `orders/{orderId}` → `orders/7`; throws on a missing param |

Shared Zod primitives in `common/schemas/shared.schemas.ts`: `looseString`,
`nullableString`, `idSchema`, `isoDateString`, `auditFields`, `paginated()`,
`arrayOrEnvelope()`, `problemDetails`.

### 4a. When the API is not REST + JSON

The framework assumes REST + JSON because most APIs are. The other shapes work
with the same client — only the route file and the assertions change.

**GraphQL.** One endpoint, one route constant, the query in the body:

```ts
export const GraphRoutes = { Endpoint: 'graphql' } as const;

const { res } = await api.post(GraphRoutes.Endpoint, {
  data: {
    query: `query Order($id: ID!) { order(id: $id) { id status amount } }`,
    variables: { id: orderId },
  },
});
expect(res.status()).toBe(200);
const body = await json<{ data?: { order?: unknown }; errors?: Array<{ message: string }> }>(res);

// GraphQL returns 200 for business errors. Asserting only the status tests nothing.
expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
const parsed = orderSchema.safeParse(body.data?.order);
expect(parsed.success, formatZodError(parsed.error)).toBe(true);
```

Group by operation name rather than by path: `modules/orders/…` still holds, and
tags still work.

**XML / SOAP.** `json()` will throw — use the raw text:

```ts
const { res } = await api.post(SoapRoutes.Endpoint, {
  headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'GetOrder' },
  data: envelopeXml,
});
expect(res.status()).toBe(200);
const xml = await res.text();
expect(xml).toContain('<Status>Submitted</Status>');
```

Zod does not parse XML. Either assert on specific extracted values, or add an XML
parser and validate the converted object — decide once per module and write it
down in `docs/subsystems/<module>.md`.

**Binary responses** (PDF, CSV, images): assert on `res.headers()['content-type']`
and `(await res.body()).length`, never on the body text.

### 4b. Dates, times and timezones

A quiet, recurring source of flakes.

```ts
✅ isoDaysFromNow(7)                      // always in the future, relative
✅ expect(Date.parse(order.createdAt)).not.toBeNaN();
✅ expect(new Date(order.dueDate).toISOString().slice(0, 10)).toBe(expectedDay);

❌ dueDate: '2026-08-12'                  // passes today, fails next week
❌ expect(order.createdAt).toBe('2026-08-12T09:00:00Z');   // to-the-second equality
❌ expect(order.createdAt.startsWith(today))               // breaks across midnight
                                                          // and across server timezones
```

Rules: relative dates only, never a literal. Compare instants, not strings — the
API may return `+00:00` where you wrote `Z`. Assume the server is in a different
timezone from you and from CI. If a test depends on "today", it will fail at
midnight in some timezone; assert a range instead.

---

## 5. The ten rules

1. **One exact status code per assertion.**
   ```ts
   expect(res.status()).toBe(403);                 // ✅
   expect([400, 403]).toContain(res.status());     // ❌ passes either way
   ```
   `toContain` passes whichever the API does, so it can no longer detect the API
   changing — it is a test that has stopped testing. If the code is not confirmed
   against the handler, write `test.skip` with a `[status: confirm]` note rather
   than a plausible guess. A guessed code that happens to pass today reads like
   coverage and behaves like a landmine.
2. **Every test creates its own data and cleans up in `finally`.** More than one
   resource → `CleanupRegistry`.
3. **Assertions only in `*.spec.ts`.** Services and page objects act and wait.
   `waitFor()` is a wait; `expect()` is an assertion.
4. **Route constants + `fillRoute()`.** Relative paths, no leading slash — a
   leading slash discards the service's base path and you get a mystifying 404.
5. **Builders, never inline payloads.** The test overrides only the field it is
   testing.
6. **`uniqueName()` for every created resource.** A bare `Date.now()` collides
   across parallel workers.
7. **`test.step()` in every workflow.** Without it, a failed 10-call test is a
   trace of 200 undifferentiated requests.
8. **Schemas from real responses**, not documentation. Not everything
   `.optional()` — an all-optional schema parses `{}` and catches nothing. Every
   object gets `.passthrough()`.
9. **`test.skip(condition, reason)`** for environment conditions only, never to
   hide a broken test. An unconditional `test.skip` is a broken test in disguise.
10. **Never edit product source** to make a test pass. Everything lives in this
    automation workspace, separate from the application under test.

---

## 6. Worked examples — copy these

### 6a. Route constants — `common/routes/routes.orders.ts`

```ts
export const OrderRoutes = {
  List:     'orders',
  Create:   'orders',
  GetById:  'orders/{orderId}',
  Update:   'orders/{orderId}',
  Delete:   'orders/{orderId}',
  Submit:   'orders/{orderId}/submit',
  Timeline: 'orders/{orderId}/timeline',
} as const;

export { fillRoute } from './fill-route';
```

### 6b. Builder — `common/builders/order-builder.ts`

```ts
import { uniqueName } from '../helpers/unique';

export interface OrderPayload {
  name: string;
  tenantId: number;
  amount: number;
  status: string;
  lines: Array<{ sku: string; quantity: number }>;
}

export function buildOrder(tenantId: number, overrides: Partial<OrderPayload> = {}): OrderPayload {
  return {
    name: uniqueName('ORDER'),      // parallel-safe and greppable
    tenantId,
    amount: 100,
    status: 'Draft',
    lines: [],
    ...overrides,                   // defaults must be VALID; tests break validity
  };
}
```

### 6c. Service — `common/services/orders.service.ts`

```ts
import { type ApiClient } from '../fixtures/api.fixture';
import { OrderRoutes, fillRoute } from '../routes/routes.orders';
import { buildOrder, type OrderPayload } from '../builders/order-builder';
import { json } from '../helpers/http';

export interface OrderRef {
  orderId: number;
  name: string;
  cleanup: () => Promise<void>;
}

export interface OrderRecord {
  id: number;
  name: string;
  status: string;
  [key: string]: unknown;
}

export class OrderService {
  constructor(
    private readonly client: ApiClient,     // typed — never `any`
    private readonly tenantId: number,
  ) {}

  /** Read: returns [] on a non-OK response — but LOGS the status first. */
  async list(params: Record<string, string | number> = {}): Promise<OrderRecord[]> {
    const { res } = await this.client.get(OrderRoutes.List, {
      params: { tenantId: this.tenantId, ...params },
    });
    if (!res.ok()) {
      console.warn(`[OrderService.list] API returned ${res.status()}`);
      return [];
    }
    return json<OrderRecord[]>(res);
  }

  async getById(orderId: number): Promise<OrderRecord> {
    const { res } = await this.client.get(fillRoute(OrderRoutes.GetById, { orderId }));
    if (!res.ok()) throw new Error(`getById(${orderId}): ${res.status()} ${await res.text()}`);
    return json<OrderRecord>(res);
  }

  /** Write: returns the ref plus its undo. Throws with status + body on failure. */
  async create(overrides: Partial<OrderPayload> = {}): Promise<OrderRef> {
    const payload = buildOrder(this.tenantId, overrides);
    const { res } = await this.client.post(OrderRoutes.Create, { data: payload });
    if (!res.ok()) throw new Error(`create: ${res.status()} ${await res.text()}`);

    const body = await json<{ id: number }>(res);
    if (typeof body.id !== 'number') {
      throw new Error(`create: no id in response — ${JSON.stringify(body).slice(0, 300)}`);
    }
    return { orderId: body.id, name: payload.name, cleanup: () => this.delete(body.id) };
  }

  async update(orderId: number, updates: Partial<OrderPayload>) {
    const { res } = await this.client.put(fillRoute(OrderRoutes.Update, { orderId }), { data: updates });
    return res;
  }

  /** Teardown: never throws. A throwing teardown masks the real failure. */
  async delete(orderId: number): Promise<void> {
    await this.client.delete(fillRoute(OrderRoutes.Delete, { orderId })).catch(() => {});
  }
}
```

Export it from `common/services/index.ts`:

```ts
export { OrderService } from './orders.service';
export type { OrderRef, OrderRecord } from './orders.service';
```

**No DELETE endpoint?** Archive instead. Neither? Rename to an
`AUTOMATION_`-prefixed value so orphans stay identifiable. Never leave a resource
untracked.

### 6d. Schema — `modules/orders/api/schemas/orders.schemas.ts`

```ts
import { z } from 'zod';
import { auditFields, looseString } from '../../../../common/schemas/shared.schemas';

export const orderSchema = z.object({
  id:         z.number(),                                   // required: always present
  name:       z.string(),
  status:     z.enum(['Draft', 'Submitted', 'Approved', 'Cancelled']),
  amount:     z.number(),
  customerId: z.number().nullable(),                        // present, may be null
  lines:      z.array(z.object({ id: z.number(), sku: z.string() }).passthrough()).optional(),
}).merge(auditFields).passthrough();                        // extra fields are not a break

export const orderListSchema = z.array(orderSchema);
```

```
required  — present in EVERY valid state
optional  — legitimately absent in SOME valid state
nullable  — present but explicitly null
```

### 6e. Contract spec — `modules/orders/api/tests/contracts/orders.contract.spec.ts`

Shape verification only. **Creates no data** — reads the module's read-only seed, so it
imports `test`/`expect` from the module's own `fixtures.ts` (which adds `seed` on top of
the base). A contract spec that needs no seed can import the shared `api.fixture` instead.

```ts
import { test, expect } from '../../../fixtures';    // modules/orders/fixtures.ts — adds `seed`
import { json, softAssertResponseTime } from '../../../../../common/helpers/http';
import { formatZodError } from '../../../../../common/helpers/schema';
import { OrderRoutes, fillRoute } from '../../../../../common/routes/routes.orders';
import { orderSchema, orderListSchema } from '../../schemas/orders.schemas';

test('Orders - List - Verify that GET orders conforms to orderListSchema.',
  { tag: ['@orders', '@contract', '@smoke'] },
  async ({ api, profile }, testInfo) => {
    const { res, ms } = await api.get(OrderRoutes.List, {
      params: { tenantId: profile.testTenantId },
    });
    expect(res.status(), await res.text()).toBe(200);

    const parsed = orderListSchema.safeParse(await json(res));
    expect(parsed.success, formatZodError(parsed.error)).toBe(true);

    softAssertResponseTime(testInfo, ms);
  });

test('Orders - Detail - Verify that GET orders/{id} conforms to orderSchema.',
  { tag: ['@orders', '@contract'] },
  async ({ api, seed }) => {
    test.skip(seed.orderId === null, 'Seed order unavailable');   // environment, not a defect

    const { res } = await api.get(
      fillRoute(OrderRoutes.GetById, { orderId: seed.orderId as number }),
    );
    expect(res.status(), await res.text()).toBe(200);

    const parsed = orderSchema.safeParse(await json(res));
    expect(parsed.success, formatZodError(parsed.error)).toBe(true);
  });

test('Orders - List - Verify that GET orders returns 401 without a token.',
  { tag: ['@orders', '@contract', '@security'] },
  async ({ api, profile }) => {
    test.skip(profile.auth.strategy === 'none', 'This deployment is unauthenticated.');
    const { res } = await api.get(OrderRoutes.List, { omitAuth: true });
    expect(res.status()).toBe(401);
  });

// Pure unit test — no network, no environment. Proves the schema constrains
// something, which is the guard against an all-`.optional()` schema.
test('Orders - Detail - Verify that orderSchema rejects a body missing the required id field.',
  { tag: ['@orders', '@contract'] },
  () => {
    const parsed = orderSchema.safeParse({ name: 'no id' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some(i => i.path.includes('id'))).toBe(true);
  });
```

### 6f. Endpoint spec — `modules/orders/api/tests/endpoints/orders.endpoint.spec.ts`

One operation, one condition, one `test()`.

```ts
import { test, expect } from '../../../../../common/fixtures/api.fixture';
import { json, skipIfRateLimited } from '../../../../../common/helpers/http';
import { OrderRoutes, fillRoute } from '../../../../../common/routes/routes.orders';
import { buildOrder } from '../../../../../common/builders/order-builder';
import { OrderService } from '../../../../../common/services';

test('Orders - Create - Verify that POST orders creates an order successfully.',
  { tag: ['@orders', '@endpoint', '@smoke'] },
  async ({ api, profile }) => {
    const orders = new OrderService(api, profile.testTenantId);
    const { orderId, cleanup } = await orders.create();
    try {
      expect(orderId).toBeGreaterThan(0);
      // Created means retrievable — a 201 alone does not prove persistence.
      const order = await orders.getById(orderId);
      expect(order.status).toBe('Draft');
    } finally {
      await cleanup();
    }
  });

test('Orders - Create - Verify that POST orders returns 400 when name is missing.',
  { tag: ['@orders', '@endpoint'] },
  async ({ api, profile }) => {
    // Builder gives a valid payload; the test breaks exactly one thing, visibly.
    const { name: _omitted, ...withoutName } = buildOrder(profile.testTenantId);
    const { res } = await api.post(OrderRoutes.Create, { data: withoutName });
    skipIfRateLimited(res);
    expect(res.status()).toBe(400);
  });

test('Orders - Detail - Verify that GET orders/{id} returns 404 for an unknown id.',
  { tag: ['@orders', '@endpoint'] },
  async ({ api }) => {
    const { res } = await api.get(fillRoute(OrderRoutes.GetById, { orderId: 999_999_999 }));
    expect(res.status()).toBe(404);
  });

test('Orders - List - Verify that GET orders returns 200 and an empty array when nothing matches.',
  { tag: ['@orders', '@endpoint'] },
  async ({ api, profile }) => {
    const { res } = await api.get(OrderRoutes.List, {
      params: { tenantId: profile.testTenantId, name: 'AUTOMATION_NO_SUCH_NAME' },
    });
    expect(res.status()).toBe(200);          // an empty result is a successful query
    const body = await json<unknown>(res);
    const items = Array.isArray(body) ? body : (body as { data?: unknown[] }).data ?? [];
    expect(items).toHaveLength(0);
  });

// P0 on every data-returning endpoint of a multi-tenant API.
test('Orders - Security - Verify that a tenant A token cannot read tenant B orders.',
  { tag: ['@orders', '@endpoint', '@security'] },
  async ({ api, profile }) => {
    test.skip(!profile.crossTenantId, 'CROSS_TENANT_ID is not set');
    const { res } = await api.get(OrderRoutes.List, { params: { tenantId: profile.crossTenantId! } });
    expect(res.status()).toBe(403);   // confirm against your authorization policy
  });
```

**Per-operation coverage to work through:**

```
POST/PUT  happy · each required field missing (one at a time) · each field at and
          one over its boundary · duplicate · missing related entity · no auth
          (401) · wrong role (403) · wrong entity state
GET       valid id · no auth · unknown id · empty result (200 + [], not 404) ·
          each query param valid and invalid
DELETE    happy + follow-up GET proving it is gone · no auth · unknown id ·
          system record · still referenced elsewhere
```

### 6g. Workflow spec — `modules/orders/api/tests/workflows/order-lifecycle.workflow.spec.ts`

```ts
import { test, expect } from '../../../../../common/fixtures/api.fixture';
import { CleanupRegistry } from '../../../../../common/helpers/cleanup';
import { OrderService } from '../../../../../common/services';

test('Orders - Lifecycle - Verify that an order can be created, submitted and approved.',
  { tag: ['@orders', '@workflow', '@smoke'] },
  async ({ api, profile }) => {
    const orders = new OrderService(api, profile.testTenantId);
    const cleanup = new CleanupRegistry();
    let orderId = 0;

    try {
      await test.step('1 — create the order', async () => {
        const created = await orders.create();
        orderId = created.orderId;
        cleanup.add(`order ${orderId}`, created.cleanup);
        expect(orderId).toBeGreaterThan(0);
      });

      await test.step('2 — it appears in the list', async () => {
        const orderList = await orders.list();      // NEVER shadow the service variable
        expect(orderList.some(o => o.id === orderId)).toBe(true);
      });

      await test.step('3 — submit it', async () => {
        const res = await orders.submit(orderId);
        expect(res.status(), await res.text()).toBe(200);
      });

      await test.step('4 — the transition persisted (follow-up GET)', async () => {
        // Assert against a fresh read, never the response of the call that changed
        // it — plenty of APIs echo a request back without having committed it.
        const order = await orders.getById(orderId);
        expect(order.status).toBe('Submitted');
      });

      await test.step('5 — a submitted order cannot be edited', async () => {
        const res = await orders.update(orderId, { amount: 999 });
        expect(res.status()).toBe(409);             // blocked transitions matter too
      });

      await test.step('6 — the timeline records the submission', async () => {
        const timeline = await orders.timeline(orderId);
        expect(timeline.some(e => e.type === 'Submitted')).toBe(true);
      });
    } finally {
      await cleanup.runAll();     // reverse order; one failure never abandons the rest
    }
  });
```

A workflow earns the name at ≥5 meaningful steps, with at least one transition
verified by a follow-up GET, at least one blocked operation asserted, and
teardown in `finally`.

### 6h. Resources you cannot isolate — settings, config, singletons

"Every test creates its own data" is impossible for a resource there is only ONE
of per tenant: settings pages, feature flags, org/account configuration, quotas.
Two tests that both PUT the same settings object will interfere, and the failure
looks random.

Three rules for these, in order of preference:

**1. Read-only where you can.** A contract test on `GET settings` needs no
mutation at all. Most settings coverage is shape verification.

**2. Snapshot → mutate → restore, in `finally`.**

```ts
test('Settings - Email - Verify that PUT email settings persists the reply-to address.',
  { tag: ['@settings', '@endpoint'] },
  async ({ api, profile }) => {
    const settings = new SettingsService(api, profile.testTenantId);
    const original = await settings.getEmail();       // snapshot FIRST
    try {
      await settings.updateEmail({ ...original, replyTo: 'automation@example.test' });
      const after = await settings.getEmail();
      expect(after.replyTo).toBe('automation@example.test');
    } finally {
      await settings.updateEmail(original);           // restore, always
    }
  });
```

**3. Serialise the whole file.** Snapshot/restore still races if two tests run
concurrently. Put every test that mutates the same singleton in ONE file and put
this at the top:

```ts
import { test, expect } from '../../../../../common/fixtures/api.fixture';

// These tests mutate tenant-level settings — a singleton. Running them in
// parallel makes them interfere with each other, so this file runs serially.
test.describe.configure({ mode: 'serial' });
```

Do not scatter singleton mutations across files: `mode: 'serial'` orders tests
*within a file*, not across them.

**Never** leave a singleton mutated. The next run — and every manual tester on
that environment — inherits whatever you left behind.

### 6i. File upload

```ts
test('Orders - Attachments - Verify that POST attachments accepts a PDF.',
  { tag: ['@orders', '@endpoint'] },
  async ({ api }) => {
    const { res } = await api.post(fillRoute(OrderRoutes.Attachments, { orderId }), {
      multipart: {
        // A real file is not needed — a Buffer with the right mime type is.
        file: {
          name: `${uniqueName('DOC')}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n%automation placeholder\n'),
        },
        description: 'automation upload',    // plain fields alongside the file
      },
    });
    expect(res.status()).toBe(200);
  });
```

Do **not** set `Content-Type` yourself with `multipart` or `form` — Playwright
sets it, including the multipart boundary. The client already skips its JSON
default for those bodies.

### 6j. Cross-module data

Call the owning module's service. Never re-implement it — a second,
slightly-wrong creation path is a bug factory.

```ts
const customers = new CustomerService(apis.customers, profile.testTenantId);
const orders    = new OrderService(api, profile.testTenantId);

const customer = await customers.create();
cleanup.add('customer', customer.cleanup);

const order = await orders.create({ customerId: customer.customerId });
cleanup.add('order', order.cleanup);
// teardown runs in reverse: order, then customer
```

### 6k. UI spec

```ts
import { test, expect } from '../../../../../common/fixtures/ui.fixture';
import { OrdersPage } from '../../pages/orders.page';
import { OrderService } from '../../../../../common/services';

test('Orders - List - Verify that a newly created order appears in the list.',
  { tag: ['@orders', '@ui', '@regression'] },
  async ({ page, api, profile }) => {
    test.skip(!profile.webAppUrl, 'WEB_APP_URL is not set — the UI tier is off.');

    // API precondition — under a second. The same setup clicked through the UI is
    // 30+ seconds and can fail for reasons unrelated to what you are testing.
    const orders = new OrderService(api, profile.testTenantId);
    const { name, cleanup } = await orders.create();
    try {
      const ordersPage = new OrdersPage(page);
      await ordersPage.navigate();
      await expect(page.getByText(name)).toBeVisible();   // assertions live HERE
    } finally {
      await cleanup();
    }
  });
```

Page objects: one class, `readonly Locator` properties **and** action methods
together. No `expect()` inside. Locator priority: `getByRole` → `getByLabel` →
`getByPlaceholder` → `getByText` → `getByTestId` → `#id` → CSS → XPath.

---

## 7. Naming

```
title    [Module] - [Feature] - Verify that <specific observable behaviour>.
tags     { tag: ['@<module>', '@contract'|'@endpoint'|'@workflow'|'@smoke'|'@regression'|'@e2e'] }
         (+ '@security' where relevant)
files    <feature>.<level>.spec.ts · <module>.service.ts · <entity>-builder.ts
         routes.<module>.ts · <module>.schemas.ts · <name>.page.ts
```

The level is the folder and the tag, **never** the title. Tags go in Playwright's
`{ tag: [...] }` option — the standard — not into the title string. The title stays the
exact case title (the string the tracker and a `traces-case:` header carry), and
`--grep "@orders"` still matches because Playwright greps tags as well as titles.

```ts
✅ 'Orders - Create - Verify that POST orders returns 400 when name is empty.'
❌ 'test create order'
❌ 'Orders - Create - Verify that POST orders works correctly.'   ← what does correctly mean?
```

Before and after — same title, the tags move out of the string and into the option:

```ts
// ❌ before — the tags ride inside the title string
test(
  'Orders - Create - Verify that POST orders returns 400 when name is empty. @orders @endpoint',
  async ({ api }) => { /* … */ });

// ✅ after — same title, tags in the option
test('Orders - Create - Verify that POST orders returns 400 when name is empty.',
  { tag: ['@orders', '@endpoint'] },
  async ({ api }) => { /* … */ });
```

Service variables use the plural domain noun, never `svc`. Never shadow a service
with its own list result:

```ts
const orders    = new OrderService(api, profile.testTenantId);
const orderList = await orders.list();      // ✅
const orders    = await orders.list();      // ❌
```

---

## 8. Banned patterns

```ts
❌ expect([400, 403]).toContain(res.status());     ✅ expect(res.status()).toBe(403);
❌ async function helper(client: any, …)           ✅ (client: ApiClient, …)
❌ await page.waitForTimeout(2000);                ✅ await expect(locator).toBeVisible();
❌ expect(await locator.isVisible()).toBe(true);   ✅ await expect(locator).toBeVisible();
❌ api.get(route);            // floating promise  ✅ await api.get(route);
❌ await api.get('/orders');  // leading slash     ✅ await api.get('orders');
❌ await api.get('https://qa.example.com/orders'); ✅ route constants + fillRoute()
❌ expect(orderList.length).toBe(5);               ✅ expect(orderList.some(o => o.id === id)).toBe(true);
❌ test.skip('not working yet');                   ✅ test.skip(seed.x === null, 'Seed unavailable');
❌ expect() inside a service or page object        ✅ assertions only in *.spec.ts
❌ a local async function doing raw HTTP           ✅ a method on the service class
```

The floating promise is the dangerous one: an unawaited assertion silently
passes. `npm run lint` catches it — run it.

---

## 9. Commands

```bash
npm run verify:setup                       # auth + connectivity. Run first, always.
npm run scan                               # read the backend repo → reports/scan.md
npm run typecheck                          # tsc --noEmit
npm run lint                               # eslint, incl. no-floating-promises
npm test                                   # everything
npm run test:api                           # contracts + endpoints + workflows
npm run test:contracts | :endpoints | :workflows
npm run test:ui
npm run test:smoke                         # everything tagged @smoke
npm run auth:refresh                       # redo the browser login (UI tier)
npm run report:open                        # open the last HTML report

npx playwright test --grep "@orders"
npx playwright test --grep "@orders" --grep "@smoke"        # AND
npx playwright test modules/orders/api/tests/endpoints/orders.endpoint.spec.ts
npx playwright test --no-deps --project=endpoints           # skip the auth-check dependency
npx playwright test --headed --project=ui-smoke             # watch it run
npx playwright test <spec> --debug                          # step through
```

---

## 10. Definition of done

```bash
npm run typecheck                          # clean
npm run lint                               # clean
npx playwright test --grep "@<module>"
npx playwright test --grep "@<module>"     # again — flaky shows on the second run
```

- [ ] the test passes twice
- [ ] **break the thing on purpose once and confirm it fails for the right
      reason** — a test that has never failed is a test you have no evidence works
- [ ] it creates its own data and cleans up
- [ ] one exact status code per assertion
- [ ] module tag + level tag via the `{ tag: [...] }` option — not in the title
- [ ] no hardcoded URL, id, or timestamp
- [ ] `test.step()` in every workflow
- [ ] anything surprising written into `docs/subsystems/<module>.md`

---

## 11. When something is red

| Symptom | Cause |
| --- | --- |
| `Profile 'default' is missing required config` | `.env` — the message names the exact keys |
| every request 404s but works in Postman | a leading slash on the route |
| `Cannot read property 'x' of undefined` | a service returned `[]` after a non-OK response — its warning is just above |
| everything skips: "Seed unavailable" | the module's seed fixture could not create its data — check the auth-check output and the module `fixtures.ts` |
| API login fails once, before any test | the `auth-check` project caught a broken login — read its message; run `npm run verify:setup` |
| passes alone, fails in the suite | shared mutable state — create your own data |
| passes locally, fails on CI | a missing CI env var; a committed `test.only` (`forbidOnly`); parallelism exposing a shared resource |
| passes on retry | a count assertion, a race, or a colliding fixed name |
| `Floating promises are not allowed` | a missing `await`, usually on `expect()` or `api.get()` |
| 401s partway through a long run | token expiry — the client re-mints once; check the API returns exactly 401 |
| `Error reading storage state` | `npm run auth:refresh` |
| `HostStoppedError` | the API host returned an "app stopped / unavailable" page — the environment is down, not your test |

---

## 12. Write down what you learned

Every quirk you had to read source code to discover goes into
`docs/subsystems/<module>.md` **the day you find it** — API surprises, state
machines, cross-module prerequisites, which validations are frontend-only, which
resources cannot be deleted.

Ten minutes there saves an hour every time anyone touches that module again, and
it is what the authoring passes treat as top-rank evidence the next time around.

Environments, accounts and data hygiene go in `docs/RUNBOOK.md`.

---

## 13. Deeper reference

This file is self-sufficient — everything needed to write a correct test is above.

- `modules/README.md` — the "add a module" walkthrough and folder layout
- `docs/RUNBOOK.md` — environments, accounts, data hygiene
- `docs/subsystems/_template.md` — the per-module domain-knowledge template

The phased build (scan → foundation → API → UI → tracker → CI) is driven by the
**qa-engineering** plugin's skills and orchestrator, which call the generic
QA authoring skills; this template is the foundation they build on.
