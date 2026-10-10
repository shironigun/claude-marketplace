---
description: Turn your approved cases into automation scripts, at the framework's real test levels.
argument-hint: (uses the approved / published cases)
---

Route this through the **qa-engineering orchestrator**, which reads the house-profile + `qa-context` and
keeps the gates.

**Intent:** generate automation from the approved cases. **From:** the `cases` slice (and published ids) in
`qa-context`.

Hand it to `automation-engine`: generate automation scripts **from the approved cases** (fail-closed on
`approved`, or from the published tracker cases), reusing the existing framework and its Standards rather than
a parallel generator, and write the `automation` slice. It needs a framework to generate into — if there
isn't one, say so and point me at `/build-framework`. Then tell me what was generated and that `/run` is next.
