---
description: Build an API + UI test framework brick by brick — one phase at a time, you confirm each step.
argument-hint: (no input needed; or "continue" to resume a build)
---

Route this through the **qa-engineering orchestrator**, which owns the build path and keeps the gates.

**Intent:** build (or continue) a test-automation framework brick by brick.

First look at the framework root and work out which phase is next (don't guess); tell me in two lines where
the build stands and which phase you propose, and **confirm before starting**. Then run the phases — phase 0
`scan-and-confirm`, then `kit-builder` (phases 1–5) — **one phase at a time**, each with the five beats:
state → ask (with a recommended option + the reason) → act → verify (report the real result) → report, waiting
for my go between phases. Confirm a branch of my own if I'm on the default branch, run the secret scan before
any commit, and never push unless I say so. If I said "continue" (`$ARGUMENTS`), resume from the next phase.
