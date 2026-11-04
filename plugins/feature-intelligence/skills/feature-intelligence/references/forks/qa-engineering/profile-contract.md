<!-- forked-from: qa-engineering/knowledge/orchestration/house-profile.md @ 8d1cf6e; forked-on: 2026-11-04; local-changes: rewritten for .feature-intelligence/profile.json and its slots (spec 5.11); the test-authoring, defect, test-plan and environment slots dropped -->
# The profile: the product-specific seam

The plugin is **product-neutral**: it ships no product name, organization, project, board, URL, account or
voice. A real workspace needs those specifics to read the team's tracker, write stories in the team's format and
create tickets on the team's board. The **profile** is the one place they live: a single git-ignored file the
orchestrator reads and hands to subagents as the slice they need.

> **No secrets, ever.** The profile carries names, formats and paths. Tokens, passwords and keys never belong in
> it; the Azure DevOps server signs in interactively with the organization in `ADO_ORG`.

## Where it lives

| | |
|---|---|
| **File** | `.feature-intelligence/profile.json` in the user's repository |
| **Git** | git-ignored: `fi init` adds `.feature-intelligence/` to `.gitignore` |
| **Created** | `fi init` writes a stub with neutral defaults when the file is missing, and never overwrites it |
| **Read by** | the orchestrator, which passes each subagent the slots it needs |
| **Blank slot** | fall back to the neutral default, and tell the user exactly which slot to fill before a step that needs it (reading a tracker project, writing stories in the house format, creating tickets). Never invent a real value. |

## The slots

| Slot | What it configures | Neutral default | Used by |
|---|---|---|---|
| `product.name`, `product.domainNouns` | the product's name and its nouns, so titles and statements read in the team's language | empty: use the sources' own words | every stage, for wording only |
| `tracker.kind`, `org`, `project`, `team`, `areaPath`, `iterationPath` | where work items are read from and, in plan 4's tickets flow, created | `ado` and empty: ask before reading a project | reading work items; tickets |
| `story.format`, `story.acStyle` | the story statement shape and the acceptance-criteria style | `As a <role>, I want <goal>, so that <benefit>`; `given-when-then` | requirements, tickets |
| `tasks.disciplines`, `tasks.estimates` | which tasks a story gets, and whether estimates are written | design-content, frontend, backend, data, qa; no estimates | tickets |
| `board.categories` | the flag categories readers choose from | question, unclear, missing, risk, conflict, content, testability | the board (plan 3) |
| `lenses.default` | the lens a new workspace opens with | `all` | intake |

Each slot is read, never hard-coded in a playbook. Fill only what differs from the default.

## Why the seam matters

- **The plugin stays neutral and committable.** Every product specific is a slot read at run time, so nothing
  committed names a product and the lint's product and secret checks stay clean.
- **One instance among many.** A team on another project fills the same slots; nothing assumes one product.
- **Secrets never enter it.** The profile is names and formats only.
