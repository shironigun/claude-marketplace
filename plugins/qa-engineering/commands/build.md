---
description: Build your automation framework, or add another module to it. Structure is built once; then one module at a time, resuming where you left off.
argument-hint: a module to add, or "continue" / "API only" (optional)
---

Act as the **qa-engineering orchestrator** for the build path. Read `qa-context` (incl. `catalog`) and the
house-profile from the framework root. Orchestrate the existing engines (`scan-and-confirm` → `kit-builder`) —
never reimplement them — and run **one gated phase at a time** (state → ask with a recommendation → act →
verify the real result → report, then wait for my go).

Use `$ARGUMENTS` to steer if I gave it (a module name to add, "continue" to resume, "API only", etc.).

Decide from `catalog.frameworkScaffold`:

- **No scaffold yet (`absent` / no `catalog`)** — this is the first build. If there's no module list yet, run
  `scan-and-confirm`'s scan first and write `catalog`. Then: confirm the chosen (or recommended) module's flows
  → `flow-map.json`; build the **shared structure once** (`kit-builder` phase 1) and mark
  `frameworkScaffold: built`; then build that module (`kit-builder` phases 2-3) and mark it `built`.
- **Scaffold present (`built`)** — this is an **expand**. Don't rebuild the structure. If a module is
  `in-progress`, offer to **resume** it from where it stopped. Otherwise show the modules still `discovered`
  (not yet built), recommend the next most provable one, let me pick, confirm its flows, and build **just that
  module** (reusing the scaffold). Mark it `in-progress` while building, `built` when done.

Update `catalog` as modules move `discovered → in-progress → built`. Run the secret scan before any commit;
never push unless I say so. When a module is done, tell me what's built, what's left, and that I can add the
next one anytime. If the chosen target isn't a real detected module, say so rather than guessing.
