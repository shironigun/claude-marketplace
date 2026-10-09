# Runbook

Operational notes for this workspace. Keep it current — it is what the next
person reads at 3am.

---

## Environments

| Profile | Purpose | Notes |
| --- | --- | --- |
| `default` | QA | _fill in: URL, who owns it, when it resets_ |

Add a row per profile you register in `config/profiles.index.ts`.

---

## Test accounts

| Account | Role | Tenant | Where the password lives |
| --- | --- | --- | --- |
| _fill in_ | admin | _fill in_ | CI variable group / password manager |

Never put a real credential in this file.

---

## Data hygiene

- Everything the suite creates is prefixed `AUTOMATION_` (`uniqueName()`).
- Resources that cannot be deleted are renamed with that prefix instead — that
  is what makes orphans findable.
- Orphan sweep: _fill in the query or script, and who runs it_.

---

## When the suite goes red

Work down this list; it is ordered by how often each one is the answer.

1. `npm run verify:setup` — is it auth or connectivity? Nine times in ten, yes.
2. Open the HTML report (`npm run report:open`) and look at the trace on the
   retry. `test.step()` names the stage that broke.
3. Did `auth-check` fail, or a module's seed fixture? Everything downstream skips
   with "seed unavailable" or fails the login once up front.
4. Is it one module or all of them? One module → a deploy. All → environment.
5. Failing only on CI? Compare the CI env block against your local `.env` — a
   missing variable is the usual cause.
6. Flaky (passes on retry)? Look for a shared resource two tests both mutate, or
   an assertion on a count rather than a shape.

---

## Known API quirks

Record every surprise here the day you find it. This section is the highest-value
part of the file.

| Endpoint | Quirk | Workaround |
| --- | --- | --- |
| _e.g. POST /orders_ | _returns 200 with an error body instead of 4xx_ | _assert on the body, not only the status_ |

---

## CI

- Pipeline: `pipelines/azure-pipelines.automation.yml` (or the GitHub Actions
  equivalent), registered as a standalone pipeline.
- Secrets: _variable group / secret store name_.
- Schedule: _fill in_.
- Report artifact: `playwright-report`.
