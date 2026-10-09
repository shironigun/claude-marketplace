# <Module> — Subsystem Domain Knowledge

> Copy to `docs/subsystems/<module>.md` and fill in as you discover.
>
> This file is the memory of the suite. Everything you had to read source code or
> probe an endpoint to learn belongs here — so the next person (or the next AI
> authoring pass) treats it as confirmed evidence instead of rediscovering it.

**Backend source:** `src/...`
**Automation module:** `modules/<module>/`
**Service:** `common/services/<module>.service.ts`
**Routes:** `common/routes/routes.<module>.ts`
**Fixture:** `api` (or `apis.<service>`)
**Tag:** `@<module>`

---

## Base URL and protocol

```
<SERVICE>_BASE_URL = https://...
```

Protocol: REST + JSON _(or: GraphQL — one endpoint, assert `body.errors`; SOAP —
`res.text()`, no Zod; binary — assert content-type + length)_

Extra headers every call needs: _(gateway key, API version — these live in
`DEFAULT_HEADERS`)_

## Singleton resources

Anything there is only ONE of per tenant — settings, config, quotas, feature
flags. These cannot be created and deleted per test: snapshot and restore, and
keep every test that mutates one in a single `mode: 'serial'` file.

| Resource | Endpoint | Restore method |
| --- | --- | --- |
| _e.g. email settings_ | _GET/PUT orgs/{id}/email/settings_ | _PUT the snapshot back_ |

---

## Entities and state machine

```
Draft → Submitted → Approved → Completed
  ↓         ↓
Cancelled  Rejected → Draft

BLOCKED: Completed → anything
         Cancelled → anything
```

For every state, cover: the transition itself, what is allowed in that state, and
what is blocked (with the exact confirmed status code).

---

## Known API quirks

| Quirk | Detail | Consequence for tests |
| --- | --- | --- |
| _e.g. `dealType` must be numeric_ | _backend does `Int32.Parse` with no guard_ | _`null` returns 500 — the builder always sends a number_ |

---

## Cross-module dependencies

```
Creating an <entity>
├── <prerequisite>  → <Owner>Service.create()   [created per test]
├── <reference data> → read-only, pre-seeded    [test.skip if empty]
└── <optional link>  → <Owner>Service.create()  [created per test]
```

Before writing a test that touches a dependency, answer:

1. Is there a max-count limit? (Hitting it in setup fails silently.)
2. Are there system records that cannot be modified or deleted?
3. Does it rely on reference data that may not exist in every environment?
4. Does creating it trigger a side effect elsewhere?
5. Can it be deleted, or only archived/renamed?

---

## Validation layers

| Field | Layer | Rule | Test implication |
| --- | --- | --- | --- |
| `name` | API validator | required, ≤100 | assert 400 with the field named |
| `email` | frontend only | regex | do NOT assert the API rejects it |

The distinction matters: the UI trims whitespace before sending, so a spaces-only
value may be perfectly acceptable to the API. Assert rejection only where backend
source confirms the rule.

---

## Permissions

| Role | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| admin | ✓ | ✓ | ✓ | ✓ |
| user | ✓ | ✓ | own only | ✗ |

Tenant isolation is P0 for every data-returning endpoint. Record the confirmed
response for a cross-tenant request here — 403 and 404 are both defensible, but
only one is what your API does.

---

## Open questions

- [ ] _the thing you could not confirm, and what would confirm it_
