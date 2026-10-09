---
name: scan-and-confirm
description: Phase 0 of building a test-automation framework — scan the target repo or live API, PROPOSE how the chosen module's flows work, and ASK the QA to confirm or correct each one (one question at a time, each with a recommended answer and the reason) before any test is written. Selects the target module, collects the API base URL(s), auth flow and credentials into the QA's git-ignored `.env`, and writes a confirmed flow map (`flow-map.json` with module, hosts, authKind, endpoints, flows) for the kit-builder. Use whenever the user asks to "scan the repo/API before building tests", "confirm the flow before writing tests", "scan and confirm", "propose the flows and let me correct them", "pick the module to automate", or is starting phase 0 of the qa-engineering / a brick-by-brick framework build — also when kit-builder reaches phase 0. It asks instead of assuming — the inverse of automation-setup, which scans but never asks.
---

# Scan and Confirm — phase 0

Read the code, form a view of how the module works, then **put that view in front of the QA and ask them to confirm or correct it** — before a single test is designed. The code tells you what the system *does*; only the QA can tell you what it is *meant* to do, which flows matter, and what the real environment looks like. A flow map built from code alone is a guess with line numbers.

This is phase 0 of the `qa-engineering`. It produces three things for `kit-builder` (phases 1-5): a **target module**, a populated **`.env`**, and a **confirmed flow map written to `flow-map.json`** (see [Output](#output)). It writes no tests and scaffolds no framework.

> The examples below (orders, widgets) are illustrative. Use the real modules, paths, hosts and field names of the system under test. Nothing product-specific belongs in this skill, in the flow map's key names, or in anything committed.

## This skill ASKS (unlike `automation-setup`, which assumes)

`automation-setup` scans a backend and then decides everything itself — its opening instruction is "Do not ask the user anything.", and an unknown value is recorded and reported at the end. **This skill keeps the scan and inverts that rule: that skill does not ask; this one must.**

| | `automation-setup` | `scan-and-confirm` |
|---|---|---|
| Uncertain about a value | decides from evidence, labels it inferred | **asks now**, with a recommended answer |
| What the code evidence is | the decision | the *proposal* — the QA's answer is the decision |
| Questions | none, ever | **one at a time**, each with a recommendation and its reason |
| Scope | whole bootstrap, end to end | scan + confirm only — no scaffolding, no tests |
| A flow the code and the QA disagree on | not possible — nobody is asked | QA wins; the disagreement is logged |
| Emits | configuration, then a built module | `.env` and `flow-map.json` |

Code evidence earns a *recommended answer*. It never earns the right to skip the question.

### The phase-0 questions (ask them in this order, one per turn)

Skip a question only when its precondition is false (marked below). Never merge two questions into one message — the one-line stack check that opens question 2 is the only exception.

1. **Scan target** — Where do I look: a repo path, a live API / OpenAPI URL, or both? *(Recommend the repo when available — code is exact; a live API shows only what is reachable.)*
2. **Stack and module** — Open with one line confirming the stack you detected ("I read this backend as <stack> — right?"), then ask which module we automate. *(Recommend the stack as detected, and one detected module with the reason — see [Module selection](#2-select-the-module).)*
3. **Flows, one by one** — For each flow I propose: "Is this how it works — am I missing a step, a prerequisite, or a state rule?" *(Recommend "confirm" only if the code and any docs agree; otherwise recommend the corrected version and say what disagreed.)*
4. **Out of scope** — Which endpoints of this module should we leave out (internal, deprecated, destructive, third-party-backed)? *(Recommend excluding anything that cannot be cleaned up through the API.)*
5. **Hosts** — How many API hosts does this module call, and what is each base URL? *(Recommend the count the code shows; the QA supplies the URLs for the environment under test.)*
6. **Auth kind** — `password`, `client-credentials`, `static` or `none`? *(Recommend what the auth handler or the real client shows.)*
7. **Auth details** *(only if kind is `password` or `client-credentials`)* — Login/token path, request field names, where the token sits in the response, how it is sent (header name + scheme). *(Recommend values read from the login DTOs and the frontend's API client.)*
8. **Tenancy** — Is every route scoped to a tenant/account id? Is there a second one for isolation tests? *(Recommend "tenant-scoped" if the routes or claims show it; ask for the second id because isolation tests are skipped without it.)*
9. **Constant headers** — Does the real client send a header on every request besides the token (gateway key, API version, tenant header)? *(Recommend mirroring the real client exactly and adding nothing it does not send.)*
10. **Credentials** — Which test account do the tests authenticate as? *(Recommend a dedicated test account, never a personal one; secrets are typed by the QA into `.env`, not into chat — see [Collect connection details](#4-collect-connection-details-into-env).)*
11. **Verify path** — What is one cheap authenticated `GET` that proves the setup works? *(Recommend a health route, else a list endpoint with a small page size.)*
12. **UI app URL** *(optional)* — What URL does the web app live at, if we will also cover the UI? *(Recommend giving it now because phase 3 needs it; blank is fine for API-only.)*
13. **Sign-off** — "Here is the flow map. Anything wrong before I hand it to `kit-builder`?" *(Recommend "approve" only after questions 1-12 are answered.)*

If the QA answers "you decide" or "whatever you think", take your recommendation, **say that you did**, and record it as QA-delegated in the confirmation log. Do not silently convert a non-answer into a confirmation.

## Rules

1. **One question at a time.** Ask, stop, wait. Do not stack questions or pre-answer the next one.
2. **Every question carries a recommendation and its reason.** Format below. No bare "what do you want?".
3. **Propose before you ask.** Show what you found and what you believe, so the QA reacts instead of authoring from scratch.
4. **The QA overrules the code.** If they correct you, record their version, note the disagreement in the confirmation log, and do not argue.
5. **Read-only during the scan.** Every request you send to a live system is a `GET` — no `POST`/`PUT`/`PATCH`/`DELETE` that you (the agent) send in phase 0; the suite's own tests create and clean up data later. Requests the QA's own browser sends, such as the login `POST` when they sign in through the Playwright MCP window, are theirs and are fine.
6. **Secrets never travel through chat or git.** Never commit `.env`; never echo a password, secret or token back; never type the QA's credentials into a browser form yourself.
7. **Label evidence.** Every claim you show carries its source: a `file:line`, an OpenAPI path, or an observed request. No source means it is a guess — say so.

### Question format

```
Question 3 of 13 — Flow: create an order
What I found:      POST /orders (OrdersController:41) -> 201 + {id}; GET /orders/{id}
                   reads it back; DELETE /orders/{id} -> 204 (soft delete).
My proposal:       create -> read back -> update status -> delete; delete is a soft delete,
                   so a deleted order still exists in list results with status "cancelled".
Recommended:       Confirm as written — the controller, the OpenAPI doc and the frontend
                   client all agree.
Your call:         confirm, correct, or tell me what I cannot see from here.
```

## 1. Scan the target

Ask question 1 first. Then scan whichever of these exist, in this order — each answers something the others cannot:

| Read | Tells you |
|---|---|
| OpenAPI / Swagger document (file in the repo, or served by the API) | the route inventory, schemas, documented status codes, security schemes |
| Controllers / route files / URL conf / handler registrations | the real routes and methods, route templates, role/policy attributes, the status each handler returns |
| The auth/login handler and its request + response types | auth kind, field names, token location, tenancy |
| The frontend's API client and env files | base URLs, and exactly how the real client authenticates and what headers it always sends |
| Any existing e2e suite, seed script or Postman collection | a working, proven token flow and sample payloads — the biggest shortcut available |
| CI config, `appsettings`/`application-*`/`.env.example` files, README, QA docs | environment names, account names (never values you should copy), conventions and gotchas |

Detect the stack from the routing style you find (attribute-routed controllers, decorator-based routers, annotation-mapped controllers, URL confs, route tables) and state what you detected — the QA confirms it in question 2. Group route prefixes into modules by **what the product calls things**, not how the code is organised — QA and developers must be able to name the same module.

**No repo, or the repo has no routes you can read?** Explore the live API instead, read-only, with the Playwright MCP (`browser_navigate`, `browser_network_requests`):

- open the API's OpenAPI/Swagger URL if one is served; the route inventory is usually all there;
- otherwise open the web app and observe the requests it makes while the **QA signs in and clicks through the module themselves in that browser window** — you read the network log, you do not type credentials;
- if neither works, ask the QA for a Postman collection or two or three sample responses and say that the map is thinner as a result.

Record what you could not determine; those become questions, not assumptions.

## 2. Select the module

Ask question 2: first the one-line stack confirmation, then the module. List every module you detected with a one-line description and an endpoint count, then recommend one:

```
Detected stack: attribute-routed REST controllers — confirm?
Detected modules
  1. orders      34 routes   full create/read/update/delete, no cross-module prerequisites
  2. billing     28 routes   depends on orders (an invoice needs an order)
  3. reports     11 routes   read-only
Recommended: orders — clearest create/read/update/delete surface and nothing to set up first,
so every test layer can be proven end to end.
```

- Recommend the **most provable** module — clear CRUD surface, fewest cross-module prerequisites — not the most important one.
- **Workshop default:** when the QA is running the workshop exercise, the default module is the Customer module, because the workshop exercise's shared story targets it. If a detected module matches that name, recommend it and say the exercise is why; otherwise ask which detected module corresponds to it.
- Confirm the stack and exactly one module. Record the confirmed stack, and the other detected modules as "later" in the confirmation log — they are not lost, just not this run.

## 3. Propose the flows and ask the QA to confirm or correct

For the chosen module, draft the endpoint list and the flows, then walk the flows with question 3 **one flow per turn**. Typical flows to propose:

- the entity **lifecycle** — create, read back, update, delete (and whether delete is hard or soft);
- **prerequisites** — what must exist before the entity can be created (a parent record, a lookup value, a user);
- **state transitions** — status changes and which are allowed;
- **business rules** — uniqueness, required fields, ranges, who may do what;
- **cross-flow impact** — other resources that change when this one does;
- **clean-up** — whether everything a test creates can be removed through the API, or only deactivated.

For each flow state the exact steps in order, what is captured from one response to feed the next call, and what you do not know. Then ask. After the QA corrects a flow, restate the corrected version in one line before moving on, so the correction is visibly understood. Run question 4 (out of scope) once the flows are agreed.

## 4. Collect connection details into `.env`

Questions 5-12. Write each answer into the QA's `.env`, using the key names in the template's `.env.example` so `kit-builder` phase 1 and the template's `config/` read them with no translation:

| Answer | `.env` key(s) |
|---|---|
| Each host's base URL | `API_BASE_URL` (primary); `<NAME>_API_BASE_URL` for each further host |
| Auth kind | `AUTH_STRATEGY` — `password` / `client-credentials` / `static` / `none` |
| Token host and path | `AUTH_BASE_URL`, `AUTH_LOGIN_PATH` |
| Request / response shape | `AUTH_USERNAME_FIELD`, `AUTH_PASSWORD_FIELD`, `AUTH_TENANT_FIELD`, `AUTH_EXTRA_BODY`, `AUTH_TOKEN_FIELD`, `AUTH_IDENTITY_TENANT_FIELD` |
| How the token is sent | `AUTH_HEADER_NAME`, `AUTH_SCHEME` |
| Client-credentials values | `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_SCOPE`, `AUTH_AUDIENCE`, `AUTH_GRANT_TYPE` |
| Static token | `AUTH_STATIC_TOKEN` |
| Constant headers | `DEFAULT_HEADERS` (JSON) |
| Test account | `AUTH_TENANT_ID`, `AUTH_USERNAME`, `AUTH_PASSWORD`; second tenant in `CROSS_TENANT_ID` |
| Verify path | `VERIFY_PATH` |
| UI app URL | `WEB_APP_URL`, `WEB_APP_LOGIN_URL` |

How to handle it:

- **Check the ignore first.** Before creating or editing `.env`, confirm it is git-ignored (`git check-ignore .env`). If it is not, stop and fix the ignore rule with the QA before writing anything.
- **Where it lives.** At the framework root — the folder the template is, or will be, scaffolded into; `flow-map.json` (section 5) goes in the same root. If phase 1 has not run yet, create that folder's `.env` from the template's `.env.example` and tell `kit-builder` that `.env` and `flow-map.json` exist so phase 1 does not overwrite either.
- **Secrets are the QA's to type.** You write the non-secret keys (URLs, field names, strategy, paths). For `AUTH_PASSWORD`, `AUTH_CLIENT_SECRET`, `AUTH_STATIC_TOKEN` and secret-bearing `DEFAULT_HEADERS` values, leave the key blank and ask the QA to fill it in themselves. Recommended, because it keeps secrets out of the chat transcript. If the QA pastes a secret anyway, write it to `.env` and do not repeat it in any later message or in the flow map.
- **Blank beats invented.** A blank key produces a precise "missing config" error later; an invented value produces a confusing 401.
- **Light reachability check** (read-only): an unauthenticated `GET` to each base URL. A response of any kind — even 401 or 403 — proves the host resolves; a network failure or a "site stopped/unavailable" page means the URL or environment is wrong, so ask the QA to correct it. The authenticated probe belongs to phase 1.
- `.env.example` stays secret-free. Never write a real URL, account name or value into it, into the flow map, or into any file you will commit.

## 5. Emit the flow map

Ask question 13 and apply the QA's final corrections. Then do both of these:

1. **Write the flow map to `flow-map.json` at the framework root** — the same root as `.env`. The file holds the five fields below as pretty-printed JSON and nothing else (no confirmation log, no comments).
2. **Print the same JSON** in a fenced `json` block, followed by a short confirmation log, so the QA sees exactly what was saved.

**The file is the handoff.** `kit-builder` reads `flow-map.json`; a map that exists only in chat is lost across a subagent handoff or a context compaction. If the QA corrects anything after sign-off, re-write the file and re-print it — the file and the printed block must never differ.

Before writing, self-check the JSON: it parses; it has exactly the five top-level fields; `authKind` is one of the four allowed values; every `baseUrlEnvKey` is a key name that exists in `.env`; and it contains no secret, token, account name or URL value.

**Commit policy.** `flow-map.json` is a build artifact: phase 0 produces it and a re-run regenerates it, so do not hand-edit it. It **may be committed** — it holds only env key *names*, route templates and flow steps, never a secret or a URL value — and committing it gives the team a reviewable record of what the QA confirmed. It is therefore deliberately **not** added to the template's `.gitignore` (which covers `.env`, reports and auth state only).

### Output

**The flow map has exactly these five fields — use these names, no others, no renames.**

| Field | Type | Meaning |
|---|---|---|
| `module` | string | The one confirmed target module, in lowercase kebab-case as the product names it; becomes `modules/<module>/`. |
| `hosts` | array of `{ name, baseUrlEnvKey }` | One entry per API host the module calls. `name` is the service key (lowercase identifier, e.g. `api`) that goes in `config/services.ts`; `baseUrlEnvKey` is the **name** of the `.env` key holding its URL (e.g. `API_BASE_URL`) — never the URL itself. The **first** entry is the primary host. |
| `authKind` | string | Exactly one of `password`, `client-credentials`, `static`, `none` — the same values `AUTH_STRATEGY` accepts. |
| `endpoints` | array of `{ method, path, purpose }` | `method` is the upper-case HTTP verb. `path` is the route template relative to the host's base URL, `{param}` placeholders, no scheme/host, no query values, no real ids. `purpose` is one plain sentence; when `hosts` has more than one entry, begin it with `[<host name>]` to say which host serves it. In-scope endpoints only. |
| `flows` | array of `{ name, steps }` | `name` is a short behavioural title. `steps` is an ordered array of strings, one action or assertion per string, each naming the call (`METHOD path`) and what it captures or checks; the final step is the clean-up. |

Rules that keep it consumable:

- Field values come from the **confirmed** answers, not from the raw scan.
- Everything about *how* to authenticate (login path, field names, token location, header scheme) lives in `.env`, not in the map — the map carries only `authKind`.
- No secret, token, account name or real URL appears anywhere in the map. Env key **names** only.
- Every endpoint a flow step calls appears in `endpoints`.

Example (illustrative values):

```json
{
  "module": "orders",
  "hosts": [
    { "name": "api", "baseUrlEnvKey": "API_BASE_URL" }
  ],
  "authKind": "password",
  "endpoints": [
    { "method": "POST",   "path": "/orders",        "purpose": "Create an order." },
    { "method": "GET",    "path": "/orders/{id}",   "purpose": "Read one order back." },
    { "method": "PATCH",  "path": "/orders/{id}",   "purpose": "Change an order's status." },
    { "method": "DELETE", "path": "/orders/{id}",   "purpose": "Soft-delete an order." }
  ],
  "flows": [
    {
      "name": "Order lifecycle",
      "steps": [
        "POST /orders with a valid payload; capture id",
        "GET /orders/{id}; assert it matches what was created",
        "PATCH /orders/{id} to status 'fulfilled'; assert the transition is accepted",
        "GET /orders/{id}; assert status is 'fulfilled'",
        "DELETE /orders/{id} (clean-up); assert it no longer appears as active"
      ]
    }
  ]
}
```

The **confirmation log** (human-readable prose or a table, printed after the JSON — *not* written into `flow-map.json`, not consumed by `kit-builder`):

- the confirmed stack;
- each QA correction to the code-derived proposal (what the code said / what the QA said);
- every answer you took by QA delegation;
- evidence gaps still open (what could not be determined);
- other detected modules, parked for a later run;
- the `.env` keys still blank and who must fill them (the secrets).

### How `kit-builder` uses it

`kit-builder` reads `flow-map.json` from the framework root and maps it as follows.

| Flow-map field | Becomes |
|---|---|
| `module` | `modules/<module>/` and the `@<module>` test tag |
| `hosts` | entries in `config/services.ts` + the matching URL keys in `.env` |
| `authKind` | `AUTH_STRATEGY` — and which auth keys phase 1's probe needs |
| `endpoints` | route constants and the module's service layer |
| `flows` | the workflow tests, and the seed for the API test cases |

## Done when

- [ ] Every question 1-13 was asked (or skipped for a stated reason) — one per turn, each with a recommendation and reason
- [ ] Stack confirmed and exactly one module confirmed; the rest parked
- [ ] Each proposed flow confirmed or corrected by the QA, not assumed
- [ ] `.env` written under a confirmed git-ignore; secrets typed by the QA, never echoed
- [ ] Reachability check done (read-only) and its result reported
- [ ] `flow-map.json` written at the framework root with exactly `module`, `hosts`, `authKind`, `endpoints`, `flows`, and the same JSON printed for the QA
- [ ] The confirmation log names every correction, delegated answer, gap and still-blank key
- [ ] Nothing product-specific, secret or real-URL in anything that could be committed

Next: hand off to `kit-builder` — it reads `flow-map.json` and `.env` from the framework root and starts phase 1 (foundation).
