---
name: api-test-cases
description: Act as a senior SQA analyst doing API testing and author API test cases in a rigorous, behavior-driven house style at three levels — Contract (response/request shape against a schema), Endpoints (happy path plus the full negative matrix per endpoint), and Workflows (chained end-to-end across calls). Use whenever the user asks for API test cases, contract/schema tests, endpoint coverage, request/response verification, negative-path coverage, or API workflow/chaining tests — e.g. "write API tests for POST /orders", "what should I test on this endpoint?", "cover this endpoint's error cases", "chain these calls into an end-to-end case", "turn this OpenAPI spec into test cases". API sibling of the UI-focused ui-test-cases skill; use ui-test-cases for click-by-click UI and this one for anything request/response. Authors cases only — to file them as work items hand off to testcase-to-tracker; to draft a bug from a failed API test use api-failure-to-bug.
---

# API Test Cases — Senior SQA Analyst

Reason about API behavior once — the contract, every happy and failure path, the chained flow — and express it as a house-style test case: the human-readable spec a reviewer signs off on and a tester or automation engineer executes. This skill **authors cases**; it does not generate automation code and does not write to any tracker.

Coverage spans three levels — **Contract**, **Endpoints**, **Workflows**. Same coverage discipline, voice, and title convention as the `ui-test-cases` skill.

> Example resources below (orders, customers) are illustrative. Use the real endpoints, methods, fields, and status codes of the API under test. The format and voice are fixed; the domain is the user's.

## The three levels

1. **Contract** — verify response (and request) *shape* against a schema: correct types, required fields present, nullability honoured, enums constrained, formats valid, no surprises in the documented fields. Guards the interface, not the business logic — green means "well-formed", not "value is right". The schema may be expressed as JSON Schema, an OpenAPI component, a zod/pydantic model, or any equivalent — assert conformance and that every documented field matches its declared type and nullability.
2. **Endpoints** — each endpoint/method for **happy and negative** scenarios. Happy = valid auth + valid payload -> correct 2xx + body. Negative = the full matrix: no/invalid auth (401), wrong role (403), missing required field (400/422), invalid value (400/422), nonexistent id (404), duplicate/conflict (409), method not allowed (405), unsupported media type (415), payload too large (413), rate limit (429). One scenario = one case.
3. **Workflows** — the API equivalent of a UI end-to-end: chain calls, capturing an id from one response to feed the next, assert state transitions, confirm final state with a `GET`, and **tear down** whatever was created.

## Phase 1: Read and analyze

Extract before writing anything:

1. **Module and Feature** — the first two title segments: `[Module] - [Feature]`. Module = product area; Feature = the sub-area/resource.
2. **Every endpoint + method** — path, verb, path/query params, request body. From the story, an OpenAPI doc, or the route definitions.
3. **The schema** — every field, type, required vs optional/nullable, enum values, formats. If not given, reconstruct from a sample response and flag assumptions.
4. **Auth and roles** — how the endpoint authenticates and which roles may call it. Each role restriction = a 403 case.
5. **Business rules** — limits, uniqueness, state prerequisites, time windows, value ranges. Each rule = one pass case + one violation case.
6. **Status-code map** — the documented success code and every plausible error code -> drives the endpoint negative matrix.
7. **Dependencies / chaining** — what must exist first (a customer before an order; a parent before a child). Drives the workflow level.
8. **Cross-flow impact** — resources sharing state with this endpoint. Each = a regression guard.

## Phase 2: Plan coverage

List the cases per level before drafting. Show this plan when scope is ambiguous:

```
Coverage plan
Contract:
- <Feature> response schema (valid) — parse succeeds
- <Feature> response schema (violation) — wrong type / missing required -> parse fails
Endpoints — <METHOD> <path>:
- Happy: valid auth + valid payload -> <2xx> + correct body
- Negative: no token -> 401 | wrong role -> 403 | missing <field> -> 400/422 | bad <field> -> 400/422 | nonexistent id -> 404 | duplicate -> 409
- Business rule — <rule>: violation -> <expected error>
Workflows:
- <flow>: create -> chain -> transition -> verify final state (+ teardown)
- Cross-flow: <resource A> change surfaces in <resource B>
```

Proceed without asking when scope is clear. Ask one focused question only for genuine ambiguity (which environment/base URL, which account, whether a schema is authoritative).

## Title convention (same shape as the UI skill, molded for API)

Two fixed segments then a `Verify that...` behavior segment naming the **endpoint** and its action:

```
[Module] - [Feature] - Verify that <endpoint> <performs the action> successfully.
```

- Third segment is always "Verify that ..." — specific, observable, tied to one behavior; period at the end.
- Name the method + path (or a readable endpoint name) in the behavior segment.
- The **level is NOT in the title** — track it separately (a tag, a folder, or a note). This keeps the case title clean and portable.

Good titles:
- `Orders - Orders - Verify that GET orders returns the order list successfully.`
- `Orders - Orders - Verify that POST orders creates an order successfully.`
- `Orders - Orders - Verify that GET orders returns 401 when the bearer token is omitted.`
- `Orders - Orders - Verify that the GET orders response conforms to the orderList schema.`
- `Orders - Orders - Verify that an order is created, staged, and marked fulfilled successfully through chained API calls.`

## Preconditions

```
Preconditions: Environment: <QA/Staging/Prod> | Account/Tenant: <id> | Auth: <default bearer / role-specific / none> | Seed data: <required IDs> | Schema under test: <name>
```

Auth and seed data live in Preconditions — not in the steps — **unless the test is about that setup** (the 401 case omits the token, so that omission is a step).

## Steps table — atomic, one assertion per row

```
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | <one request OR one assertion> | <concrete status / body / schema outcome> |
...
| N | Verify that <behavior from title> | <definitive outcome> |

Actual Result:
```

**API atomicity rule** (the analogue of "every click is its own step"): one HTTP request per row; one assertion per row (status is one row, schema parse another, each field check its own); header/auth/payload setup lives in Preconditions unless the test is about it; end on a `Verify that <title behavior>` row; `Actual Result:` always left blank for the tester.

See `references/api-examples.md` for worked Contract, Endpoint (negative), and Workflow cases.

## Voice and style rules (mandatory)

Atomic granularity (one request or one assertion per row); one assertion per row; imperative third-person declarative ("Send a POST request...", "Assert the response status code"); exact strings verbatim (real method, path, field, header, enum, status, schema name); every row has a concrete expected result — never "responds correctly"; definitive, no hedging ("Status code is 401", not "should be"); title always `[Module] - [Feature] - Verify that <endpoint> ... successfully.`; end a case on a `Verify that <title>` row; no ceremony (no intro, no emojis, no trailing summary).

## Coverage checklist

- **Contract** — one case per resource schema: the valid-response pass, plus targeted negatives (a wrong-typed or missing required field fails the parse). Assert status + documented fields.
- **Endpoints** — happy per method, then the negative matrix (401, 403, 400/422, 404, 409, and any others that apply). One case each; each changes exactly one thing from the happy call.
- **Workflows** — the primary lifecycle chained with id capture, state-transition assertions, a final `GET`, and teardown; a cross-flow guard per shared-state dependency.

## After drafting

Present the cases grouped by level (Contract -> Endpoints -> Workflows). Ask: "Does this coverage look right — anything to add or cut?" Adjust before finalizing.

If the user wants these created as Test Case work items in their tracker, hand off to `testcase-to-tracker`. If an authored case later fails during execution and the user wants a bug written up, hand off to `api-failure-to-bug`.

## Reference files

- `references/api-examples.md` — worked Contract, Endpoint (negative), and Workflow cases in full house style
