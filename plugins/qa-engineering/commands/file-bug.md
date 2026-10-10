---
description: Turn a failing test into a bug — investigates first, then drafts, and asks before filing.
argument-hint: (uses the last red run; or paste a failing .spec.ts / stack trace)
---

Route this through the **qa-engineering orchestrator**, which reads the house-profile + `qa-context` and
keeps the gates.

**Intent:** turn a failure into a bug. **From:** the `failures` slice in `qa-context`, or what I paste
(`$ARGUMENTS` — a failing `.spec.ts`, a stack trace, a red run).

Hand it to `failure-to-bug`: **investigate** the failure from the real evidence (the API response/log, or the
UI trace/screenshot) and **decide** whether it's a genuine product bug or a flake / environment / test
problem — **fail-safe** (if uncertain, don't draft or file). Only for a genuine bug: draft in the house defect
format,
show a dry-run preview, and **wait for my explicit confirm before filing**; on file, link the bug to its case
(and story) and write the `bugs` slice. Never auto-file, never file a flake/env/test-defect as a product bug,
and don't double-file a re-run. If the tracker isn't signed in, draft only and say so.
