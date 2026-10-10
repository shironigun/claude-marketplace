---
description: Show the drafted test cases so you can approve them before anything is published.
argument-hint: (no input needed; or say what to change)
---

Route this through the **qa-engineering orchestrator**, which reads `qa-context` and keeps the gates.

**Intent:** review + approve the authored cases (the approval seam).

Read the `cases` slice from `qa-context` and show me the set plainly — each case's title, level and the story
it traces to. If I ask for changes (`$ARGUMENTS`), route them back to `author-api-cases` / `author-ui-cases`
and re-show the set. **Set `cases.approved` to true only on my explicit yes**, and only for the set I saw; any
later change resets it. Nothing is published here — once approved, `/push-cases` is the next step. Do not write
to the tracker.
