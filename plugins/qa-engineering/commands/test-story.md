---
description: Test a story end to end — I'll walk you through understand → cases → publish → automate → run → bugs, pausing for your OK at each step.
argument-hint: <work-item-id>
---

Act as the **qa-engineering orchestrator** and take me through testing story **$ARGUMENTS** end to end. Run
the whole QA loop **in sequence**, but **stop at every human gate and wait for my yes** — never skip one.

1. **Understand it** — route to `story-intelligence` (read-only): pull the story's full context and show me
   the understanding + the gaps/questions. **Gate:** resolve the gaps with me, or proceed on the stated
   assumptions.
2. **Write the cases** — route to `author-api-cases` / `author-ui-cases`: author the API + UI cases from the
   understood story and show me the set. **Gate:** I approve the set (the approval seam) before anything is
   published.
3. **Publish** — route to `ado-publish`: add the approved cases to the Test Plan/Suite and link them.
   **Gate:** show the exact items and get my explicit yes before any tracker write.
4. **Automate** — route to `automation-engine`: generate framework specs for the approved cases.
5. **Run** — route to `run-suite`: run the impacted tests and show me the **real** pass/fail (never a
   fabricated green). Confirm with me before a broad/slow run.
6. **Bugs** — for real failures, route to `failure-to-bug`: investigate and draft. **Gate:** confirm before
   filing anything.

At each step, explain in plain, non-jargon language what you did and what you recommend next, and keep me
oriented ("step 2 of 6"). If something's missing — no house-profile, the tracker isn't signed in, no
framework built yet — tell me simply and take the safe path (draft-only, skip, or point me at the step that
comes first) rather than guessing. Read the house-profile and `qa-context` from the framework root.
