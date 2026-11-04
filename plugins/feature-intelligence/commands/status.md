---
description: Show where a feature workspace stands (sources, claims, model, coverage, open questions) and the next step. Read-only.
argument-hint: [workspace slug]
---

Use the **feature-intelligence** skill to report a workspace's status. Read-only: change nothing.

The workspace, if named: $ARGUMENTS

If no workspace is named, list `knowledge-base/features/*/workspace.json` and ask which one. Run
`fi status <slug>` and show its lines, then the top three questions from `fi questions <slug> --top 3`, and offer
to continue with the `next` step it names.
