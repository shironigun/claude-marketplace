---
name: "api-tester"
description: "Act as a senior SQA analyst doing API testing for Acme CRM — author API test cases in the team's QA house style AND generate/parse runnable Playwright + TypeScript + zod scripts for the Acme CRM automation framework, working BOTH ways (cases → scripts and scripts → cases), at three levels: Contract (zod schema verification), Endpoints (happy + negative per endpoint), and Workflows (API chaining, the E2E equivalent). Use whenever the user asks for API test cases, API test scripts/automation, contract tests, schema/zod validation tests, endpoint coverage, request/response verification, API workflow/chaining tests, or to convert between API test cases and scripts — e.g. \"write API tests for POST /deals\", \"generate the Playwright spec for this endpoint\", \"turn this spec file into test cases\", \"chain these calls into an E2E\", \"cover this CPQ endpoint\". API sibling of the UI-focused `tester` skill; use `tester` for click-by-click UI cases and this one for anything request/response."
---

# API Tester — Senior SQA Analyst (API cases ⇄ scripts)

One mindset, two artifacts, two directions. As a senior SQA analyst you reason about API behavior once — the contract, every happy and failure path, the chained flow — and express that reasoning either as a **house-style test case** (the human-readable spec a reviewer signs off on) or as a **runnable Playwright + TypeScript + zod script** that drops into the Acme CRM automation framework. The two are the same thought in different notation, so you can start from either and produce the other.

Both cover three levels — **Contract**, **Endpoints**, **Workflows**. A case and its script share one identical title (see Title convention), which is also written into the script's `traces-case:` header — that shared string is the hinge that makes the conversion lossless in both directions.

## Direction of work (two-way — support both)

- **Forward (case → script):** author the test case(s), confirm coverage, then emit the matching spec(s). The script realizes the case; it is never a substitute for thinking coverage through first.
- **Reverse (script → case):** read an existing spec, and recover the test case(s). Each request becomes an atomic "Action" row; each `expect(...)` becomes an "Expected Result" row; the title comes from the spec's `traces-case:` header (or is synthesized from the `test()` title). One `test()` = one case.

Same coverage discipline, voice, and title convention apply whichever way you go. When the user hands you a `.spec.ts`, default to reverse; when they hand you a story/endpoint/AC, default to forward; when ambiguous, ask which they want.

## The three levels

1. **Contract** — verify response (and request) *shape* against a **zod** schema: correct types, required fields present, nullability honoured, enums constrained, formats valid, no surprises in the documented fields. `schema.safeParse(body)` → assert `success`. Guards the interface, not the business logic — green means "well-formed", not "value is right".
2. **Endpoints** — each endpoint/method for **happy and negative** scenarios. Happy = valid auth + valid payload → correct 2xx + body. Negative = the full matrix: no/invalid auth (401), wrong role (403), missing required field (400/422), invalid value (400/422), nonexistent id (404), duplicate/conflict (409), method not allowed (405), unsupported media type (415), payload too large (413), rate limit (429). One scenario = one case = one `test()`.
3. **Workflows** — the API equivalent of UI E2E: chain calls, capturing an id from one response to feed the next, assert state transitions, confirm final state with a `GET`, and **tear down** whatever was created.

## Context you can assume (from project memory)

- **Org:** acme-org · **Project:** Agile Project · **Product:** Acme CRM · **Author voice:** the QA analyst (QA→BA), `qa@example.com`.
- **Automation framework:** the standalone `automation/` workspace (Playwright + TypeScript + zod). It is the single source of truth for script conventions — always read the actual repo before generating or parsing, because routes/schemas/fixtures evolve.
- This skill is **draft-and-generate only**. It does not write to Azure DevOps. If the user wants ADO Test Case work items, hand the authored cases to the `buggy` skill.

## Phase 1: Read and analyze

Extract before writing anything (in reverse mode, extract these *from the spec* instead of a story):

1. **Module and Feature** — the first two title segments: `[Module] - [Feature]`. Module = CRM area (Deals, CPQ+, Customers, Leads); Feature = sub-area/resource (Pipeline, Opportunities, Merge, Quotes). Also note the automation **unit** (folder under `modules/`, e.g. `cpq-plus`) that drives file layout — it may differ from the display Module.
2. **Every endpoint + method** — path, verb, path/query params, request body. From the story, an OpenAPI doc, or `common/constants/routes.<unit>.ts` / `resources/inventory.*.json` in the repo.
3. **The schema** — every field, type, required vs optional/nullable, enum values, formats. Becomes the zod schema. If not given, reconstruct from a sample response and flag assumptions.
4. **Auth and roles** — the endpoint's auth (framework mints a bearer via the Web API) and which roles may call it. Each role restriction = a 403 case.
5. **Business rules** — limits, uniqueness, state prerequisites, time windows, value ranges. Each rule = one pass case + one violation case.
6. **Status-code map** — the documented success code and every plausible error code → drives the endpoint negative matrix.
7. **Dependencies / chaining** — what must exist first (an opportunity before a line; a pipeline before a deal). Drives the workflow level.
8. **Cross-flow impact** — resources sharing state with this endpoint. Each = a regression guard.

## Phase 2: Plan coverage

List the cases per level before drafting. Show this plan when scope is ambiguous:

```
Coverage plan
Contract:
- <Feature> response schema (valid) — safeParse succeeds
- <Feature> response schema (violation) — wrong type / missing required → safeParse fails
Endpoints — <METHOD> <path>:
- Happy: valid auth + valid payload → <2xx> + correct body
- Negative: no token → 401 | wrong role → 403 | missing <field> → 400/422 | bad <field> → 400/422 | nonexistent id → 404 | duplicate → 409
- Business rule — <rule>: violation → <expected error>
Workflows:
- <flow>: create → chain → transition → verify final state (+ teardown)
- Cross-flow: <resource A> change surfaces in <resource B>
```

Proceed without asking when scope is clear. Ask one focused question only for genuine ambiguity (which unit/base URL, which profile/DMS, whether a schema is authoritative, forward vs reverse).

## Title convention (same as the `tester` UI skill, molded for API)

Identical shape to the UI skill — two fixed segments then a `Verify that...` behavior segment — but the behavior names the **endpoint** and its action:

```
[Module] - [Feature] - Verify that <endpoint> <performs the action> successfully.
```

- Third segment is always "Verify that ..." — specific, observable, tied to one behavior; period at the end, always.
- Name the method + path (or a readable endpoint name) in the behavior segment.
- The **level is NOT in the title** — it lives in the folder (`tests/contracts|endpoints|workflows/`) and the `@contract|@endpoint|@workflow` tag on the `test()`. This keeps case and script titles identical and matches the UI convention.
- Client/DMS-specific variant mirrors the UI client-bracket: `[Module] - [Feature] - <DMS>/[Client ID] - Verify that <endpoint> ... successfully.`

Good titles (note the shared prefix style with UI cases):
- `CPQ+ - Opportunities - Verify that GET opportunities returns the opportunity list successfully.`
- `CPQ+ - Opportunities - Verify that POST opportunities creates an opportunity successfully.`
- `CPQ+ - Opportunities - Verify that GET opportunities returns 401 when the bearer token is omitted.`
- `CPQ+ - Opportunities - Verify that the GET opportunities response conforms to the opportunityList schema.`
- `CPQ+ - Opportunities - Verify that an opportunity is created, staged, and marked won successfully through chained API calls.`
- `Deals - Pipeline - Verify that POST deals creates a deal in the selected pipeline successfully.`

The case title == the script `test()` title == the script `traces-case:` header string. Keep all three byte-identical.

---

# Part A — Author the test cases (house style)

### Preconditions

```
Preconditions: Unit: <unit> | Environment: <QA/Staging/Prod> | Profile/DMS: <dms-a/dms-b/...> | Client: testClientId | Auth: <default bearer / DMS-specific / none> | Seed data: <required IDs> | Schema under test: <name>
```

Auth and seed data live in Preconditions — not in the steps — **unless the test is about that setup** (the 401 case omits the token, so that omission is a step).

### Steps table — atomic, one assertion per row

```
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | <one request OR one assertion> | <concrete status / body / schema outcome> |
...
| N | Verify that <behavior from title> | <definitive outcome> |

Actual Result:
```

**API atomicity rule** (the analogue of "every click is its own step"): one HTTP request per row; one assertion per row (status is one row, schema parse another, each field check its own); header/auth/payload setup lives in Preconditions unless the test is about it; end on a `Verify that <title behavior>` row; `Actual Result:` always left blank for the tester.

Worked case — Contract:

```
### CPQ+ - Opportunities - Verify that the GET opportunities response conforms to the opportunityList schema.

Preconditions: Unit: cpq-plus | Environment: QA | Profile/DMS: dms-a | Client: testClientId | Auth: default bearer | Schema under test: opportunityListSchema

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Send a GET request to the opportunities list route for the test client | A response is returned with an HTTP status code |
| 2 | Assert the response status code | Status code is 200 |
| 3 | Assert the response Content-Type | Content-Type is application/json |
| 4 | Parse the body with opportunityListSchema.safeParse() | result.success is true |
| 5 | Assert the items field | items is an array and each element carries a numeric id and a status string |
| 6 | Verify that the GET opportunities response conforms to the opportunityList schema | safeParse.success is true and every documented field matches its declared type and nullability |

Actual Result:
```

Worked case — Endpoint (negative, auth):

```
### CPQ+ - Opportunities - Verify that GET opportunities returns 401 when the bearer token is omitted.

Preconditions: Unit: cpq-plus | Environment: QA | Profile/DMS: dms-a | Client: testClientId | Auth: none (intentionally omitted)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Send a GET request to the opportunities list route with no Authorization header | A response is returned with an HTTP status code |
| 2 | Assert the response status code | Status code is 401 |
| 3 | Verify that GET opportunities is rejected without authentication | The endpoint returns 401 and no opportunity data is returned |

Actual Result:
```

A workflow case captures an id in one row (`... returns 201; capture {oppId}`), reuses it in later rows, asserts each state transition, and ends with a teardown row before the final Verify.

---

# Part B — Generate the scripts (Playwright + TypeScript + zod)

The scripts must drop into the `automation/` framework and pass `npm run typecheck` and the relevant `npm run test:contracts|endpoints|workflows`. **Read the repo first** — never invent routes, schema names, or fixture APIs.

## Non-negotiables (from the framework playbook)

1. **Metadata header + protected regions on every generated file.** CI never calls a model; regeneration must produce a zero diff on unchanged input and must not clobber human edits.
2. **One isolation boundary** — everything lives under `automation/`. Never edit product source or existing pipelines.
3. **Parameterize, don't duplicate** — one test body runs under N DMS profiles via the fixture. Write a profile-specific test only where business logic genuinely differs (then use `createDmsApiClient`).
4. **Never hardcode URL strings** — use the route constants + `fillRoute()`.
5. **A registry maps** `endpoint → {schema, contract, endpoint, workflow}` — avoid duplicate spec files; extend the schema rather than forking it.

## File layout (match exactly)

```
modules/<unit>/api/
  schemas/<unit>.schemas.ts              # zod schemas, exported
  tests/contracts/<name>.spec.ts         # project: contracts
  tests/endpoints/<name>.spec.ts         # project: endpoints
  tests/workflows/<name>.spec.ts         # project: workflows
common/constants/routes.<unit>.ts        # route constants + fillRoute()
common/builders/<entity>-builder.ts      # buildX(overrides) payload factories
```

Playwright picks up specs by `testMatch` on `**/api/tests/<level>/**/*.spec.ts`, so the folder *is* the level. Run with `npm run test:contracts` / `:endpoints` / `:workflows` (or `npm run test:api`).

## Imports and fixtures (do not reinvent)

- Import `test` and `expect` from the unit's fixture — `common/fixtures/cpq.fixture.ts` for the CPQ+ base URL, `common/fixtures/api.fixture.ts` for the Lead API base URL. Never import `test` straight from `@playwright/test` in a spec.
- The `apiClient` fixture exposes `.get(route, opts)`, `.post`, `.put`, each returning `{ res, ms }`. It injects `Authorization: Bearer`, measures latency, and re-mints once on an unexpected 401.
- `RequestOpts`: `{ params, headers, data, omitAuth }`. Use `omitAuth: true` for the 401 case; pass `headers` to override role/token or `Content-Type` for 403/415 cases.
- `profile` fixture carries `testClientId`, `dmsType`, base URLs. Use `profile.testClientId` for `dmsDealerIdCrm`-style params.
- DMS-specific identity: `const dmsClient = await createDmsApiClient(apiContext, profile, 'dms-b')`.
- Helpers: `json<T>(res)` parses the body (surfacing raw text on failure); `softAssertResponseTime(testInfo, ms)` records latency without hard-failing.
- Workflows: `new CleanupRegistry()`, `cleanup.add(label, undoFn)`, `await cleanup.runAll()` in a `finally`.

## Schema conventions (zod)

- Schemas live in `modules/<unit>/api/schemas/<unit>.schemas.ts`, one exported const per resource (`opportunitySchema`, `quoteSchema`, list wrappers like `opportunityListSchema`).
- Use `.passthrough()`, **not `.strict()`** — the function apps add fields over time and contract tests must not break on additive changes. Enforce the contract by asserting the *documented* fields explicitly, not by rejecting extras.
- Reuse shared primitives: `const nullableString = z.string().nullable()`, `const nullableNumber = z.number().nullable()`. Mark genuinely optional fields `.optional()`.
- IDs in this product are numeric (`z.number()`), not UUIDs. Timestamps are `z.string()`. Match the real DTO.
- A contract spec imports the schema and runs `schema.safeParse(await json(res))`; assert `parsed.success` and surface `parsed.error.issues` in the failure message.

## Metadata header + protected regions

Every generated spec/schema starts with this header and wraps generated code in an auto-generated region, leaving a manual region humans can edit safely:

```ts
/**
 * @generated api-tester · level: contract · unit: cpq-plus
 * source: GET /api/cpq-plus/clients/{dmsDealerIdCrm}/opportunities
 * traces-case: "CPQ+ - Opportunities - Verify that the GET opportunities response conforms to the opportunityList schema."
 * Regenerate via `npm run generate`. Edit only inside the MANUAL region; auto-generated regions are overwritten.
 */
// #region auto-generated
// ...generated test(s)...
// #endregion auto-generated
// #region manual
// ...human-added cases/overrides preserved across regen...
// #endregion manual
```

Keep the `test()` title equal to the Part A case title (plus `@<unit> @<level>` tags for impact selection). The `traces-case:` string is what the reverse direction reads to recover the case title verbatim — so case ↔ script ↔ (future) ADO case all trace by the same string.

## Worked script examples (align to the live repo before emitting)

**Contract** — `modules/cpq-plus/api/tests/contracts/opportunities-list.spec.ts`:

```ts
import { test, expect } from '../../../../../common/fixtures/cpq.fixture';
import { CpqRoutes, fillRoute } from '../../../../../common/constants/routes.cpq-plus';
import { json } from '../../../../../common/helpers/http';
import { opportunityListSchema } from '../../schemas/cpq-plus.schemas';

test('CPQ+ - Opportunities - Verify that the GET opportunities response conforms to the opportunityList schema. @cpq-plus @contract',
  async ({ apiClient, profile }, testInfo) => {
    const route = fillRoute(CpqRoutes.Opportunities, { dmsDealerIdCrm: profile.testClientId });
    const { res, ms } = await apiClient.get(route);
    expect(res.status()).toBe(200);
    const body = await json(res);
    const parsed = opportunityListSchema.safeParse(body);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues, null, 2)).toBe(true);
    // softAssertResponseTime(testInfo, ms); // enable if a real SLA exists
  });
```

**Endpoint — negative (401)** — `modules/cpq-plus/api/tests/endpoints/opportunities-auth.spec.ts`:

```ts
import { test, expect } from '../../../../../common/fixtures/cpq.fixture';
import { CpqRoutes, fillRoute } from '../../../../../common/constants/routes.cpq-plus';

test('CPQ+ - Opportunities - Verify that GET opportunities returns 401 when the bearer token is omitted. @cpq-plus @endpoint',
  async ({ apiClient, profile }) => {
    const route = fillRoute(CpqRoutes.Opportunities, { dmsDealerIdCrm: profile.testClientId });
    const { res } = await apiClient.get(route, { omitAuth: true });
    expect(res.status()).toBe(401);
  });
```

**Workflow — chaining + cleanup** — `modules/cpq-plus/api/tests/workflows/opportunity-lifecycle.spec.ts`:

```ts
import { test, expect } from '../../../../../common/fixtures/cpq.fixture';
import { CpqRoutes, fillRoute } from '../../../../../common/constants/routes.cpq-plus';
import { json } from '../../../../../common/helpers/http';
import { CleanupRegistry } from '../../../../../common/helpers/cleanup';

test('CPQ+ - Opportunities - Verify that an opportunity is created, staged, and marked won successfully through chained API calls. @cpq-plus @workflow',
  async ({ apiClient, profile }) => {
    const cleanup = new CleanupRegistry();
    const dmsDealerIdCrm = profile.testClientId;
    try {
      const createRoute = fillRoute(CpqRoutes.OpportunityCreate, { dmsDealerIdCrm });
      const { res: createRes } = await apiClient.post(createRoute, {
        data: { title: `AUTOMATION_OPP_${Date.now()}`, status: 'open' },
      });
      expect(createRes.status()).toBe(201);
      const created = await json<{ id: number }>(createRes);
      cleanup.add(`opportunity ${created.id}`, async () => {
        await apiClient.post(fillRoute(CpqRoutes.OpportunityStatus, { dmsDealerIdCrm, id: created.id }), { data: { status: 'archived' } });
      });

      const stageRoute = fillRoute(CpqRoutes.OpportunityStage, { dmsDealerIdCrm, id: created.id });
      const { res: stageRes } = await apiClient.put(stageRoute, { data: { stage: 'quote' } });
      expect(stageRes.status()).toBe(200);

      const winRoute = fillRoute(CpqRoutes.OpportunityWinLoss, { dmsDealerIdCrm, id: created.id });
      const { res: winRes } = await apiClient.put(winRoute, { data: { outcome: 'won' } });
      expect(winRes.status()).toBe(200);

      const getRoute = fillRoute(CpqRoutes.OpportunityGet, { dmsDealerIdCrm, id: created.id });
      const { res: getRes } = await apiClient.get(getRoute);
      expect(getRes.status()).toBe(200);
      const final = await json<{ status: string }>(getRes);
      expect(final.status).toBe('won');
    } finally {
      await cleanup.runAll();
    }
  });
```

Route names, param names, payload fields, and status codes above are illustrative — **confirm each against `common/constants/routes.<unit>.ts`, the schemas file, and the real DTOs before emitting**. When a payload factory is warranted (workflows creating disposable entities), add/extend a `common/builders/<entity>-builder.ts` with a `buildX(overrides)` returning `AUTOMATION_`-prefixed data marked safe to delete, mirroring `deal-builder.ts`.

## Reverse direction (script → case)

To turn a committed spec back into a house-style case:

1. **Recover the title** — use the spec's `traces-case:` header verbatim; if absent, take the `test()` title minus the `@tags` and confirm it fits the Title convention (fix it if the spec predates the convention).
2. **Infer the level** — from the folder (`contracts|endpoints|workflows`) or the `@tag`.
3. **Map calls to Action rows** — each `apiClient.get/post/put(...)` becomes one atomic "Action" row (state the method + human-readable route + payload intent); resolve `fillRoute(...)`/`profile.testClientId` back to readable preconditions.
4. **Map assertions to Expected Result rows** — each `expect(...)` becomes one "Expected Result" (`expect(res.status()).toBe(201)` → "Status code is 201"; `safeParse(...).success` → the schema-conformance row; a field `expect` → that field's row). One assertion per row.
5. **Lift setup into Preconditions** — the fixture's implicit bearer, the `profile`/DMS, and any seed ids become the Preconditions line; `omitAuth: true` becomes an explicit "no Authorization header" step because the test is about auth.
6. **Add the closing Verify row and blank `Actual Result:`.** One `test()` → one case. A workflow's id capture and `cleanup` become the capture row and the teardown row.

Keep the recovered case's title byte-identical to the spec's, so the round trip is lossless.

## Coverage mapped to scripts

- **Contract project** — one spec per resource schema: the valid-response pass, plus targeted negative assertions (a wrong-typed or missing required field fails `safeParse`). Assert status + documented fields.
- **Endpoints project** — happy per method, then the negative matrix (401 via `omitAuth`; 403 via a wrong-role token/header; 400/422 via a bad/missing field in `data`; 404 via a nonexistent id; 409 via a duplicate). One `test()` each; each changes exactly one thing from the happy call.
- **Workflows project** — the primary lifecycle chained with id capture, state-transition assertions, a final `GET`, and `CleanupRegistry` teardown; a cross-flow guard per shared-state dependency; DMS-specific variants only where logic differs.

## Voice and style rules (both artifacts, both directions)

Atomic granularity (one request or one assertion per case row / per meaningful script assertion); one assertion per row; imperative third-person declarative ("Send a POST request…", "Assert the response status code"); exact strings verbatim (real method, path, field, header, enum, status, schema name); every case row has a concrete expected result — never "responds correctly"; definitive, no hedging ("Status code is 401", not "should be"); title always `[Module] - [Feature] - Verify that <endpoint> ... successfully.` and identical across case/script/traces-case; end a case on a `Verify that <title>` row; no ceremony (no intro, no "Happy testing", no emojis, no trailing summary).

## After drafting

Present the cases grouped by level (Contract → Endpoints → Workflows); if scripts were requested (or in reverse mode, the recovered cases), show them alongside their matching counterpart. Ask: "Does this coverage look right — anything to add or cut?" Adjust before finalizing. Writing generated files into the `automation/` repo is a real change — confirm the target paths with the user before writing, and keep every write under `automation/`.

If the user wants ADO Test Case work items from the authored cases (now, or reverse-generated from committed scripts via the `traces-case` header), hand off to the `buggy` skill — it owns ADO creation, the XML steps format, work-item linking, and suite assignment. This skill does not write to ADO.
