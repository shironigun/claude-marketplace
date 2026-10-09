---
name: harvester
description: Build the complete ENGINEERING RELEASE INVENTORY for Acme CRM / Acme Notify (Acme) — pull everything that shipped in a date window or for an initiative: User Stories, Bugs, and Defects across BOTH the CRM Team and SWAT boards, PLUS the git layer (merged PRs, commits, deployments), catching work that shipped with NO linked work item, then group it into the house inventory format (numbered themes -> items with ID, date, PRs, code touchpoints, one-liner). Use this skill WHENEVER the user wants to know what shipped / released / deployed, build a release inventory or changelog, round up everything for an initiative, or says things like "what did we ship since the last notes", "get all the DMS-A releases including deployments not tracked as tickets", "round up everything released for X between these dates". Upstream feeder to `releaser` (which turns the inventory into the client note). Sibling of releaser, storyteller, buggy, bugger, defector, commentor.
---

# Acme CRM / Acme Notify Release Inventory (harvester)

Produce the **complete, grouped engineering inventory** of everything that shipped for a window or an initiative — the internal artifact that feeds client release notes. This is the **opposite discipline to `releaser`**: `releaser` suppresses ~90% to write a lean client note; `harvester` misses nothing. Completeness is the whole value. If something shipped, it belongs here — including work that has no ticket.

**Before drafting the output, read `references/inventory-format.md`** — it holds the exact house format and a full worked example (the DMS-A Two-Way Sync inventory). Match that format.

## Pairing

`harvester` (this) gathers everything -> `releaser` curates + writes the client note (Acme Notify + Acme CRM brand variants). When you finish an inventory, offer to run `releaser` on it.

## Context you can assume (project memory)

- **Org:** acme-org · **Project:** Agile Project (GUID `00000000-0000-0000-0000-000000000000`).
- **Boards / area paths:** `Agile Project\CRM Team` (sprint/feature work) and `Agile Project\SWAT` (production/support). **harvester pulls BOTH** — the inventory is exhaustive (this is where it differs from `releaser`, which ignores SWAT).
- **DMS / brands:** `DMS-A`, `DMS-C`, `DMS-B`, `DMS-A`, `DMS-D`. Two client-facing brands: **Acme CRM** (general) and **Acme Notify / Acme Notify** (the brand DMS-A clients see) — same platform. The inventory itself is brand-neutral; branding is applied downstream by `releaser`.
- **Repos:** under the Agile Project project — list with `ado:repo_list_repos_by_project`. Core sync code lives in services like `DisService`/`IDisService`, `CustomerApi`, `CustomerReviewHubApi`, `DealWebhookService`/`DealWebhookApi`, `PhoneValidationApi`.
- **Auth:** use the connected Azure DevOps MCP tools (`ado:wit_*`, `ado:repo_*`, `ado:search_*`). If a tool returns "not found", hangs after reconnect, or a permission prompt is declined, the connector/permission isn't available — see **Graceful degradation**. There is no bash fallback (ADO is off the network allowlist).
- **Read-only:** harvester only *reads* ADO. Never create or modify work items — that's `storyteller`/`bugger`/`defector`.

## Scope the harvest first

Pin down three things before querying:
1. **Window** — explicit `from`/`to` dates, or "since the last release notes" (find the last notes' date; default to the last major release if unknown).
2. **Theme(s) / initiative** — e.g. "DMS-A Two-Way Sync", or "everything" for a time-boxed sweep. Derive **keywords** (DMS-A, webhook, two-way sync, PhoneValidation, merge tag) and **code touchpoints** (`DisService.cs`, `PhoneValidationApi`, `DealWebhookService`).
3. **DMS / area filter** — a single DMS (DMS-A), a module, or none.

## Step 1 — Work items (BOTH boards)

- Query by tag/title/area + closed or changed in the window:

```
SELECT [System.Id],[System.Title],[System.WorkItemType],[System.State],[System.Tags],
       [System.AreaPath],[Microsoft.VSTS.Common.ClosedDate],[System.IterationPath]
FROM WorkItems
WHERE [System.TeamProject] = 'Agile Project'
  AND ( [System.Tags] CONTAINS '<theme>' OR [System.Title] CONTAINS '<theme>' )
  AND [System.ChangedDate] >= '<from>' AND [System.ChangedDate] < '<to>'
ORDER BY [System.ChangedDate] DESC
```

- For an initiative, also run `ado:search_workitem` (full-text) on the keywords, and **follow parent/child + related links** from the anchor stories so you catch bugs/defects that don't repeat the keyword in their title.
- Batch-fetch (`ado:wit_get_work_items_batch_by_ids`) the fields above. Substring matches are noisy ("DMS-A" matches "display") — read titles and drop false positives.
- Capture per item: **ID, type, state, title, closed/iteration date, board, tags.**

## Step 2 — Git layer (the differentiator: deployments with no ticket)

This is why harvester exists — code ships that never gets a work item. Find it.

- `ado:repo_list_repos_by_project` to get the repo(s).
- `ado:repo_search_commits` with `searchText=<theme term>`, `fromDate`/`toDate`, and **`includeWorkItems: true`** — commits that reference a work item vs. those that don't.
- `ado:repo_list_pull_requests_by_repo_or_project` with `status: "Completed"`, then `ado:repo_get_pull_request_by_id` with **`includeWorkItemRefs: true`** and `includeChangedFiles: true` for PRs merged in the window. A completed PR touching theme code with **empty `workItemRefs` = a deployment with no ticket** — capture PR id, title, merge date, files/services.
- `ado:search_code` on a signature symbol (e.g. `DisService`) to confirm the files/paths that mark a change as theme-relevant.
- **Dedupe:** map each PR/commit to its work item; PRs already tied to a captured work item fold under that item (list the PR numbers there). The leftover PRs/commits are the **non-ticketed** set — list them as their own entries.

## Step 3 — Graceful degradation (never fake completeness)

If repo/PR/commit tools are blocked (permission declined, connector down):
- Still gather work items **and** their linked PRs via `ado:wit_get_work_item` (expand `relations`) — that recovers PRs attached to tickets.
- Then add an explicit banner in the output: `⚠ Git-layer sweep not run (repo access unavailable) — deployments with no work item may be missing. Re-run with repo access to complete.`
- Never imply the inventory is complete when the git sweep didn't run. A flagged gap is the deliverable; a silent one is a failure.

## Step 4 — Group, delineate, format

- Group by **theme/initiative**; lead with the major initiative, then supporting themes, then bug-fix clusters, then generalization/adjacent work.
- **Delineate core vs. generalization** — e.g. DMS-A-core work vs. "reused the DMS-A foundation for DMS-B/DMS-C". Keep adjacent work, but label it so it isn't mistaken for the initiative itself.
- Note **environment** (Staging/Prod) and any PR that **deliberately held/limited scope** (e.g. "held two-way sync to the Data Review screen pending review") — these matter for the eventual note and for QA.
- Emit in the **house format** (see `references/inventory-format.md`). Keep every **ID, PR number, file/service, date, environment**. ALL-CAPS the DMS names.

## Hand off to releaser

Close with one line: this inventory is exhaustive on purpose; `releaser` will suppress most of it for the client note and produce the **Acme Notify** (DMS-A-facing) and **Acme CRM** variants. Offer to run it.

## Hard rules

- **Exhaustive, not curated.** Curation is `releaser`'s job. Include SWAT here (releaser excludes it). When unsure whether something shipped in-window, include it and mark the date/uncertainty.
- **Never claim completeness the git sweep didn't achieve** — flag the gap (Step 3).
- **Verify against ADO. Don't invent PR numbers, IDs, or dates.** If you assert a PR touched a file, it must come from the PR's changed-files, not a guess.
- **Internal/technical voice** — IDs, PRs, file paths, dates, environments. No client framing, no benefit copy, no emojis. (That transformation is `releaser`.)
- **Read-only.** Query and read ADO; never create/modify work items.
- For the client note use `releaser`; a user story `storyteller`; test cases `buggy`; a bug/defect `bugger`/`defector`; a comment `commentor`.
