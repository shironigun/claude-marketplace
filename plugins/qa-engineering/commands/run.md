---
description: Run the tests and show the real result. Scope it — "smoke", "the Orders tests", "impacted", "yesterday's failures" — or leave blank for a recommendation.
argument-hint: scope / context (optional) — e.g. smoke, a module, impacted
---

Act as the **qa-engineering orchestrator**: read `qa-context`, keep the gates, and hand this to the run engine.

**Intent:** run the suite (or a scoped subset). **Scope:** $ARGUMENTS (blank → recommend one, e.g. smoke first
for a fast signal; "the failures" → re-run the last red set from `qa-context`).

Hand it to `run-suite`: resolve the scope to the kit's **own** script (never a reinvented runner), **confirm
first before a broad/slow run**, execute, and report the **real** pass/fail/flaky/skipped — never a fabricated
green; a flaky/retried pass is reported as flaky; a start-up/env error is an environment problem, not a pass or
a bug. It writes the `failures` slice. If there are real failures, **offer** to turn them into bugs (the gated
`failure-to-bug` flow — just say yes, or run `/test`'s bug step); don't file anything here. If there's no
framework yet, say so and point me at `/build`.
