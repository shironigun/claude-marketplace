---
description: Test one thing end to end — a story or a module. I'll go understand → cases → publish → automate → run → bugs, pausing for your OK at each step.
argument-hint: a work-item id or a module (+ optional note to steer)
---

Act as the **qa-engineering orchestrator** and take me through testing **$ARGUMENTS** end to end. Read the
house-profile + `qa-context` from the framework root. Run the loop **in sequence**, but **stop at every human
gate and wait for my yes** — never skip one. Orchestrate the existing engines; reimplement nothing.

**Auto-detect the target** from what I gave:
- looks like a **work-item id** (digits / a tracker id) → start from the story (`story-intelligence`).
- looks like a **path or module name** → start from the code (`code-intelligence`, read-only).
- ambiguous or empty → ask me one quick question (which story or module?), or read the current `qa-context`.
Treat any extra words as steering (e.g. "API only", "focus on negative cases").

Then, each step gated and explained in plain language, keeping me oriented ("step 2 of 6"):
1. **Understand it** → understanding + gaps. **Gate:** resolve gaps or proceed on stated assumptions.
2. **Write the cases** (`author-api-cases` / `author-ui-cases`). **Gate:** I approve the set.
3. **Publish** (`ado-publish`, gated preview + confirm before any tracker write).
4. **Automate** (`automation-engine`) for the approved cases.
5. **Run** (`run-suite`): real pass/fail, never a fabricated green; confirm before a broad run.
6. **Bugs**: for real failures (`failure-to-bug`, gated — confirm before filing).

**Product kind decides the shape** (read `system-map.automation`): for an **automatable** product (`web`/`api`,
or a `mixed` product's API surface) run all 6 steps. For a **`desktop`** product (`automation: manual` — a thick
client the plugin can't UI-automate), **replace steps 4-5 (Automate + Run) with "I test by hand"**: author the
UI cases as **manual steps** (`author-ui-cases` manual mode), publish them to ADO for manual execution, I run
them, and step 6 files a bug from the failure **I describe** (`failure-to-bug`, no run needed). So the manual
loop is **understand → cases → publish → *I test manually* → file bugs**.

If something's missing (no house-profile, tracker not signed in, no framework yet), say so simply and take the
safe path (draft-only, skip, or point me at the step that comes first — e.g. `/build`). Invent nothing.
