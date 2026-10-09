---
name: file-to-tracker
description: Router of the qa-engineering for the combined "write test cases for a ticket AND file them in the tracker" intent. It authors nothing and writes nothing itself — it sequences the two native engines: author the cases (author-ui-cases for UI, author-api-cases for API), which record them in qa-context with an approval seam, then file the approved set with the gated ado-publish (which picks the Test Plan/Suite, creates, adds-to-suite and links — nothing written until the QA confirms a dry-run). Product-neutral and tracker-agnostic (Azure DevOps is the implemented filing path; the same gated flow applies to Jira/any via that tracker's connector). Use whenever the user wants to write, draft, generate, or create test cases for a ticket, story, defect, or bug AND get them into their tracker — or mentions a work item ID together with testing, a Test Plan/Suite, test steps, expected/actual results, or QA verification. Trigger even on a bare "write tests for #123456 and add them", "I need test cases for this story in the tracker", or a pasted ticket to turn into filed cases. For authoring only, use author-ui-cases / author-api-cases; for publishing already-approved cases, use ado-publish directly.
---

# File to Tracker — author → publish (router)

"Write the cases for this ticket and file them" is **two native steps**, not one skill. This router sequences
them so the combined request has a home, while each half stays single-sourced and the write stays gated. It
is a native routing skill of the `qa-engineering` — it **authors nothing and writes nothing itself**; it
hands off.

## The two steps

1. **Author** — hand the ticket to the right authoring engine:
   - UI / click-by-click → **`author-ui-cases`**
   - API / request-response → **`author-api-cases`**

   They read the ticket, draft cases in the house style (resolved from the house-profile `caseAuthoring`
   slot — see `knowledge/authoring/house-style.md`), **write the `qa-context` `cases` slice**, and set
   `approved: true` **only on an explicit QA sign-off** on the drafted set.

2. **File the approved set** — hand off to the gated **`ado-publish`**. It loads the approved cases from
   qa-context, lets the QA pick a Test Plan + Suite, shows a **dry-run** of exactly what will be written,
   and only on an explicit confirm creates the Test Cases, adds them to the suite, and links each back to
   its source ticket — reporting each outcome from the API response. **Nothing is written before that
   confirm.**

The split is deliberate: **authoring approval and the publish confirm are two distinct human acts**.
Approving the cases is not permission to write them to the tracker — that is the publish dry-run + confirm.

## Picking the authoring engine

- The ticket is about screens, clicks, forms, navigation → `author-ui-cases`.
- The ticket is about endpoints, requests, responses, status codes, schemas → `author-api-cases`.
- Both apply (a feature with a UI and an API) → run both; each writes its own cases into the same
  qa-context `cases` slice, and one publish files the approved set.

## Trackers other than Azure DevOps

`ado-publish` implements the **Azure DevOps** filing path (the plugin's ADO MCP, incl.
`testplan_add_test_cases_to_suite`). For another tracker (Jira, Linear, …) the **same gated flow** applies via
that tracker's connector — author → approve → dry-run → confirm → create + link. `references/tracker-field-mapping.md`
covers how the house step table renders in **Jira** (Xray/Zephyr step APIs, or a formatted description) and a
**generic** fallback. The Azure DevOps field mapping, the Steps-XML shape, and the create/add/link ops live
with `ado-publish` (`skills/ado-publish/references/test-case-field-mapping.md`).

## This router never

- re-authors cases itself (that is `author-ui-cases` / `author-api-cases`),
- writes to the tracker itself, or claims a create/add/link succeeded (that is `ado-publish`, from the API
  response),
- treats "write and file" as a single auto-run — the author sign-off and the publish confirm are both
  required, in that order.

## Reference files

- `references/tracker-field-mapping.md` — rendering the house step table + links for **non-ADO** trackers
  (Jira, generic). For Azure DevOps, see `skills/ado-publish/references/test-case-field-mapping.md`.
