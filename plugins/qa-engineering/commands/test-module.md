---
description: Test existing code end to end — I'll read the module, raise what to test, then cases → publish → automate → run → bugs, pausing for your OK.
argument-hint: <module path or name>
---

Act as the **qa-engineering orchestrator** and take me through testing the module **$ARGUMENTS** end to end,
starting from its **code** (the codebase → QA direction). Run the loop **in sequence**, but **stop at every
human gate and wait for my yes**.

1. **Understand the code** — route to `code-intelligence` (read-only): read the module (reuse a confirmed
   `flow-map.json` if one exists), and show me what it does, the gaps, and especially **what the code can't
   confirm** (intended rules, expected errors — these need the story or the product owner). **Gate:** resolve
   those with me, or proceed on the stated assumptions.
2. **Write the cases** — route to `author-api-cases` / `author-ui-cases` from the understood module; show me
   the set. **Gate:** I approve the set before anything is published.
3. **Publish** — route to `ado-publish` (gated: show the exact items, get my yes before any tracker write).
4. **Automate** — route to `automation-engine` for the approved cases.
5. **Run** — route to `run-suite`: run the impacted tests, show the **real** result; confirm a broad run first.
6. **Bugs** — for real failures, route to `failure-to-bug` (gated: confirm before filing).

Explain each step in plain language, keep me oriented ("step 3 of 6"), and if something's missing (no
house-profile, tracker not signed in, no framework yet) say so simply and take the safe path. Read the
house-profile and `qa-context` from the framework root; invent nothing.
