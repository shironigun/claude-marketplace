---
description: Write API + UI test cases from the story or module you just analyzed. Stops so you can approve them.
argument-hint: (uses the analyzed story/module; add a note to steer scope)
---

Route this through the **qa-engineering orchestrator**, which reads the house-profile + `qa-context` and
keeps the gates.

**Intent:** author test cases. **From:** the `story`/`module` + `review` slices already in `qa-context`
(if I added a note — `$ARGUMENTS` — use it to steer scope). If no analysis exists yet, say so and point me at
`/analyze-story` or `/analyze-module` first.

Hand it to `author-api-cases` / `author-ui-cases`: author the cases in the house voice, write the `cases`
slice of `qa-context`, and **stop at the approval seam** — `approved` stays false until I explicitly sign off.
Show me the set and ask me to review it (`/review-cases`) or approve. Do not publish anything to the tracker.
