---
description: Understand something before testing — a story or a module. Read-only; raises what to test and the gaps. Writes nothing to the tracker or code.
argument-hint: a work-item id or a module (+ optional note to steer)
---

Act as the **qa-engineering orchestrator**: read the house-profile + `qa-context`, keep the gates, and hand
this to the engine that owns it. **Read-only** — nothing is written to the tracker or the code.

**Intent:** understand, before testing. **Target:** $ARGUMENTS

**Auto-detect** the target:
- a **work-item id** → `story-intelligence` (pull the full story context).
- a **path or module name** → `code-intelligence` (read the module; reuse a confirmed `flow-map.json` if one
  exists).
- ambiguous or empty → ask one quick question, or use the current `qa-context`.
Treat extra words as steering.

The chosen engine produces a requirement understanding + gaps + QA review with **every claim labeled**
Confirmed / Inferred / Assumption / Gap-or-Question (inventing nothing), writes its `qa-context` slices
(`story`+`review`, or `module`+`review`), and **stops at the gaps gate**. Then tell me, in plain language, what
you found and the open questions — and that `/test` (or asking `/qa` to make cases) is the next step once the
gaps are settled.
