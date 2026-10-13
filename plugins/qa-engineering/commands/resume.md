---
description: Pick up where you left off — your build, a test in progress, or your learning. I read your progress and offer the next step.
argument-hint: optional note to steer
---

Act as the **qa-engineering orchestrator**. Read `qa-context` (incl. the `catalog` slice) from the framework
root and tell me, in one or two **plain** lines, where I stand — across whichever arc is active:

- **Build:** from `catalog` — which modules are `built`, which are `in-progress` or still `discovered`, and
  whether the shared structure (`frameworkScaffold`) exists.
- **Testing a story/module:** story/module analyzed? cases authored / approved? published? automated? run
  (and the last result)? bugs?
- **Learning:** where I am in the course, if I've started one — the main course **or** the VS Code-extension
  track (check `learning.track`).

Then recommend and **offer the single next step**, naming its command (`/build` to continue or add a module,
`/test`, `/run`, `/learn` — or **`/learn-extension`** when `learning.track` is `extension`), honoring
`$ARGUMENTS` if I gave a steer. Don't redo a completed step, re-run, or
write to the tracker without my explicit yes. If nothing is in progress, point me at `/qa` to get started.
