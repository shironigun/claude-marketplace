---
name: harvester
description: >-
  Builds the complete engineering release inventory for a product: everything that shipped in a date
  window or for an initiative, meaning User Stories, Bugs and Defects across both the delivery and the
  support boards, plus the git layer (merged PRs, commits, deployments), including work that shipped with
  no linked work item. Groups it into a house inventory format of numbered themes, each item with ID, date,
  PRs, code touchpoints and a one-liner. Use when the user wants to know what shipped, released or deployed,
  wants a release inventory or changelog, or says things like "what did we ship since the last notes",
  "get every release for this integration including deployments with no ticket", or "round up everything
  released for X between these dates". Upstream of releaser, which turns the inventory into the client note.
---

# Release Inventory (harvester)

Produce the **complete, grouped engineering inventory** of everything that shipped for a window or an initiative: the internal artifact that feeds client release notes. This is the **opposite discipline to `releaser`**: `releaser` suppresses ~90% to write a lean client note; `harvester` misses nothing. Completeness is the whole value. If something shipped, it belongs here, including work that has no ticket.

**Before drafting the output, read `references/inventory-format.md`.** It holds the exact house format and a full worked example. Match that format.

## Pairing

`harvester` (this) gathers everything -> `releaser` curates and writes the client note (one variant per client-facing brand). When you finish an inventory, offer to run `releaser` on it.

## Step 0 — Workspace profile

Read `references/workspace-profile.md`, then load `.claude/workspace-profile.json` from the user's project. This skill needs:
`tracker.*`, `boards.delivery`, `boards.support`, `variants`, `repos`, `codeTouchpoints` (optional; it grows as you harvest), and `environments`.
If any are missing, run discovery for those keys only, confirm with the user, save, then continue. Every org fact below comes from the profile; nothing is assumed.

- **Boards:** the delivery board (`boards.delivery.areaPath`: sprint/feature work) and the support board (`boards.support.areaPath`: production/support). **harvester pulls BOTH.** The inventory is exhaustive; this is where it differs from `releaser`, which ignores the support board by default.
- **Integration partners:** `variants.values`, labelled by `variants.label` (ERP, POS, PMS…). The inventory itself is brand-neutral; branding is applied downstream by `releaser`.
- **Repos:** `repos`, or list them under the tracker project. Signature files/services per theme live in `codeTouchpoints`; when a harvest teaches you a new one, offer to add it to the profile.
- **Tools:** use the connected tracker MCP tools. For Azure DevOps (the official `@azure-devops/mcp` 2.11.0 server, usually `mcp__ado__<tool>`): `wit_query`, `wit_work_item`, `search_workitem`, `repo_repository`, `repo_search_commits`, `repo_pull_request` and `search_code`, all read-only. If a tool returns "not found", hangs after a reconnect, or a permission prompt is declined, that capability isn't available. See **Graceful degradation**.
- **Read-only:** harvester only *reads* the tracker and repos. It never creates or modifies work items.

## Scope the harvest first

Pin down three things before querying:
1. **Window**: explicit `from`/`to` dates, or "since the last release notes" (find the last notes' date; default to the last major release if unknown).
2. **Theme(s) / initiative**: e.g. "PARTNER-A Two-Way Sync", or "everything" for a time-boxed sweep. Derive **keywords** (partner name, feature terms, a signature symbol) and **code touchpoints** (from `codeTouchpoints`, or by searching the code for the keywords).
3. **Variant / area filter**: one integration partner (a `variants.values` item), one module, or none.

## Step 1 — Work items (BOTH boards)

- Query by tag/title/area plus closed or changed in the window (Azure DevOps WIQL shown, run with `wit_query` action `wiql`; set `top` above the expected count, since it defaults to 50; translate for other trackers):

```
SELECT [System.Id],[System.Title],[System.WorkItemType],[System.State],[System.Tags],
       [System.AreaPath],[Microsoft.VSTS.Common.ClosedDate],[System.IterationPath]
FROM WorkItems
WHERE [System.TeamProject] = '<tracker.project>'
  AND ( [System.Tags] CONTAINS '<theme>' OR [System.Title] CONTAINS '<theme>' )
  AND [System.ChangedDate] >= '<from>' AND [System.ChangedDate] < '<to>'
ORDER BY [System.ChangedDate] DESC
```

- For an initiative, also run the tracker's full-text work-item search on the keywords (`search_workitem`), and **follow parent/child and related links** (`wit_work_item` action `get`, `expand: "Relations"`) from the anchor stories so you catch bugs/defects that don't repeat the keyword in their title.
- Batch-fetch the fields above (`wit_work_item` action `get_batch` with `ids` and `fields`). Substring matches are noisy (a short partner code can match unrelated words): read titles and drop false positives.
- Capture per item: **ID, type, state, title, closed/iteration date, board, tags.**

## Step 2 — Git layer (the differentiator: deployments with no ticket)

This is why harvester exists: code ships that never gets a work item. Find it.

- List the repos (`repos`, or list by project: `repo_repository` action `list`).
- Search commits with the theme term and the window (`repo_search_commits`: `searchText`, `commitStartDate`/`commitEndDate`), then get their **work-item references**: this separates commits that reference a work item from those that don't. On Azure DevOps 2.11.0 the commit search returns no work-item refs, so map the commits to their PRs (`repo_pull_request` action `list_by_commits`) and read the refs from each PR.
- List PRs with status **Completed** (`repo_pull_request` action `list`, `status: "Completed"`; filter to the window by close date), then fetch each with **work-item refs and changed files included** (action `get`, `includeWorkItemRefs: true`, `includeChangedFiles: true`). A completed PR touching theme code with **empty work-item refs = a deployment with no ticket**. Capture PR id, title, merge date, files/services.
- Code-search a signature symbol (`search_code`) to confirm the files/paths that mark a change as theme-relevant.
- **Dedupe:** map each PR/commit to its work item; PRs already tied to a captured work item fold under that item (list the PR numbers there). The leftover PRs/commits are the **non-ticketed** set: list them as their own entries.

## Step 3 — Graceful degradation (never fake completeness)

If repo/PR/commit tools are blocked (permission declined, connector down):
- Still gather work items **and** their linked PRs by fetching each work item with its relations expanded. That recovers PRs attached to tickets.
- Then add an explicit banner in the output: `⚠ Git-layer sweep not run (repo access unavailable) — deployments with no work item may be missing. Re-run with repo access to complete.`
- Never imply the inventory is complete when the git sweep didn't run. A flagged gap is the deliverable; a silent one is a failure.

## Step 4 — Group, delineate, format

- Group by **theme/initiative**; lead with the major initiative, then supporting themes, then bug-fix clusters, then generalization/adjacent work.
- **Delineate core vs. generalization**: e.g. PARTNER-A-core work vs. "reused the PARTNER-A foundation for PARTNER-B/PARTNER-C". Keep adjacent work, but label it so it isn't mistaken for the initiative itself.
- Note **environment** (from `environments`, e.g. Staging/Prod) and any PR that **deliberately held or limited scope** (e.g. "held two-way sync to the review screen pending sign-off"). These matter for the eventual note and for QA.
- Emit in the **house format** (see `references/inventory-format.md`). Keep every **ID, PR number, file/service, date, environment**. ALL-CAPS the integration-partner names.

## Hand off to releaser

Close with one line: this inventory is exhaustive on purpose; `releaser` will suppress most of it for the client note and produce one variant per brand in `brands`. Offer to run it.

## Hard rules

- **Exhaustive, not curated.** Curation is `releaser`'s job. Include the support board here (releaser excludes it). When unsure whether something shipped in-window, include it and mark the date/uncertainty.
- **Never claim completeness the git sweep didn't achieve.** Flag the gap (Step 3).
- **Verify against the tracker. Don't invent PR numbers, IDs, or dates.** If you assert a PR touched a file, it must come from the PR's changed files, not a guess.
- **Internal/technical voice**: IDs, PRs, file paths, dates, environments. No client framing, no benefit copy, no emojis. (That transformation is `releaser`.)
- **Read-only.** Query and read; never create or modify work items.
- **Scope.** This skill builds inventories only. The client-facing note is `releaser`. Anything else (filing tickets, writing stories or test cases) is out of scope for this plugin: say so rather than improvising.
