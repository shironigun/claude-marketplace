---
description: Publish your approved cases to the Test Plan/Suite. Shows a preview and asks before any tracker write.
argument-hint: (uses the approved cases; optional plan/suite note)
---

Route this through the **qa-engineering orchestrator**, which reads the house-profile + `qa-context` and
keeps the gates.

**Intent:** publish approved cases to the tracker. **From:** the `cases` slice in `qa-context`.

Hand it to `ado-publish` (the gated write path): it **refuses unless `cases.approved` is true**, picks the
Test Plan + Suite (from the house-profile default or what I name in `$ARGUMENTS`), shows a **dry-run preview**
of exactly what will be created/linked, and **waits for my explicit confirm** before any tracker write. One
confirm covers only the items shown. It writes each created case's id back to `qa-context`. If the tracker
isn't signed in, say so plainly and take the draft path. Never create, link, or comment without my yes. Once
the cases are published, `/automate` is the next step.
