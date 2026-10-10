---
description: Understand a story before testing — pulls its full context and raises the gaps. Read-only; writes nothing to the tracker.
argument-hint: <work-item-id>
---

Route this through the **qa-engineering orchestrator**, which reads the house-profile + `qa-context` and
keeps the gates.

**Intent:** analyze a story. **Work item:** $ARGUMENTS

Hand it to `story-intelligence` (read-only): pull the full work-item graph, produce the requirement
understanding + gaps + QA review with every claim labeled Confirmed / Inferred / Assumption / Gap-or-Question
(invent nothing), write the `story` + `review` slices of `qa-context`, and **stop at the gaps gate**. Do not
author cases and do not write to the tracker. Then tell me, in plain language, what you found and the open
questions — and that `/make-cases` is the next step once the gaps are settled.
