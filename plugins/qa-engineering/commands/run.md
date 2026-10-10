---
description: Run the tests and show the real result. Scope it — "smoke", "the Orders tests", "impacted", or leave blank for a recommendation.
argument-hint: scope — e.g. smoke, a module, impacted, or everything (optional)
---

Route this through the **qa-engineering orchestrator**, which reads `qa-context` and keeps the gates.

**Intent:** run the suite (or a scoped subset). **Scope:** $ARGUMENTS (blank → recommend one, e.g. smoke
first for a fast signal).

Hand it to `run-suite`: resolve the scope to the kit's **own** script (never a reinvented runner), **confirm
first before a broad/slow run**, execute, and report the **real** pass/fail/flaky/skipped — never a fabricated
green; a flaky/retried pass is reported as flaky; a start-up/env error is reported as an environment problem,
not a pass or a bug. It writes the `failures` slice. If there are real failures, **offer** to send them to
`/file-bug` (gated) — don't file anything here. If there's no framework yet, say so and point me at
`/build-framework` or `/automate`.
