# SP20 — Implementation plan

Executes [`SP20-spec.md`](./SP20-spec.md). Branch `dev`, mirrored to cache. Build → self-verify (incl. the
**non-UI non-regression** gate) → independent adversarial review → hold for the user's ship. Adds (A) a
`ui-automation-setup` skill folded into the build and (B) a `/learn-extension` command + an `extension` learning
track.

**Depends on SP19** (`system-map.automation` = applicable/manual/partial, and the UI-automatability gate). SP19
must be present (it is, locally + cache).

**Guiding invariant (every phase):** **additive-only** — an `api`/`desktop` product, or a `web`/`mixed` build
with no UI suite in scope, reaches **none** of the new behaviour and stays byte-equivalent to pre-SP20. Every new
action sits behind a UI-automatability **and** UI-in-scope check. Exactly **one** new command (`/learn-extension`);
the setup adds **no** command.

- [ ] **P0 — Setup.** Grounded: `kit-builder` Phase 1 (Foundation), `knowledge/standards/vscode-playwright.md`,
      `template/.vscode/`, `automation-tutor` (`teach-automation` / `playwright-topic`),
      `knowledge/curriculum/learning-path.md`, the `learning` slice (`qa-context.md`), `commands/learn.md` (the
      pattern for the new command), `qa-orchestrator`, `docs/phases.md` Phase 1, `docs/reuse.md`. Spec + plan
      written + self-reviewed.
- [ ] **P1 — `ui-automation-setup` skill (the setup engine; no command).**
  - [ ] New `skills/ui-automation-setup/SKILL.md` with valid frontmatter (name + single-line description).
  - [ ] The five-beat loop: **detect** (UI-automatable + UI-in-scope gate; browsers; `code`-CLI extension check;
        `.vscode/` presence) → **install browsers** (gated → `npx playwright install chromium`, offer all → verify)
        → **extension** (hybrid: `code --install-extension ms-playwright.playwright` + eslint when the `code` CLI is
        present, else **guide** via Command Palette) → **wire `.vscode/`** additively (never overwrite) → **verify**
        (discover + one UI check via the framework's own `auth.setup`/storageState; optional `show-trace`).
  - [ ] Guardrails stated + obeyed: gated · honest-outcome (verify, never claim) · non-destructive · cross-platform
        (no `code` CLI → guide, never fail the build) · **skip path** for non-UI with a one-line reason · product-
        neutral · secret-free · no password typing into remote forms.
- [ ] **P2 — Fold the setup into `kit-builder` Phase 1 + docs.**
  - [ ] `skills/kit-builder/SKILL.md`: Phase 1 (Foundation) gains a **gated UI-toolchain sub-step** that invokes
        `ui-automation-setup` **after** the scaffold/auth probe, **only** under the trigger condition; degrades
        gracefully (no `code` CLI / declined install) rather than failing the build.
  - [ ] `docs/phases.md`: Phase 1 documents the new step, its verify, and the non-UI skip.
  - [ ] `docs/reuse.md`: capability → `ui-automation-setup` mapping row.
- [ ] **P3 — `/learn-extension` command + the `extension` track.**
  - [ ] New `commands/learn-extension.md` (namespaced `qa-engineering:learn-extension`): thin wrapper routing
        through `qa-orchestrator` → `automation-tutor`, optional context to jump to a topic (mirrors `commands/learn.md`).
  - [ ] `knowledge/curriculum/learning-path.md`: add the **`extension` mini-track** (install & discovery → run/debug
        in-editor → Record/Record-at-cursor/Pick-locator → codegen→POM refactor → Trace Viewer → multi-config →
        best practices), grounded in `vscode-playwright.md` + official `playwright.dev` links; add it to the track
        mapping so `/learn-extension` prunes deterministically.
- [ ] **P4 — Tutor hands-on + learning-slice track.**
  - [ ] `skills/teach-automation/SKILL.md` + `skills/playwright-topic/SKILL.md`: teach the `extension` track and the
        **gated hands-on launches** — `npx playwright codegen <url>`, `show-trace`, `show-report` — while teaching the
        in-editor equivalents (which the plugin can't drive). Read-only teaching; orchestrator persists.
  - [ ] `knowledge/orchestration/qa-context.md`: note the `extension` **track** in the existing `learning` slice
        (reuse the shape — **no new slice**); resumable via `/learn-extension` / `/resume`.
- [ ] **P5 — Orchestrator routing + standard cross-ref.**
  - [ ] `agents/qa-orchestrator.md`: route `/learn-extension` + "teach me the extension / codegen / trace viewer /
        pick locator" intents to the tutor's `extension` track; note the Phase-1 UI-toolchain step in the build
        routing table.
  - [ ] `knowledge/standards/vscode-playwright.md`: add a short **"Automated setup"** cross-reference to
        `ui-automation-setup` (the standard stays the mechanics source of truth — no duplication).
- [ ] **P6 — Metadata + docs.**
  - [ ] `.claude-plugin/plugin.json`: widen the description (UI-toolchain setup during the build + extension
        mastery) + keywords (`vscode`, `codegen`, `trace-viewer`); version bump at close (`0.7.0 → 0.8.0`).
  - [ ] `README.md`: short mention (setup happens in the build; `/learn-extension` for the extension deep-dive).
  - [ ] `docs/enhancement/README.md`: SP20 "Latest" entry (demote SP19 to a plain section).
- [ ] **P7 — Self-verify.**
  - [ ] **Non-UI non-regression (hard):** an `api`/`desktop` product, and a `web`/`mixed` build with **no UI in
        scope**, reach none of the new setup branches; the build output/actions are byte-equivalent to pre-SP20.
  - [ ] UI-setup path coherent end-to-end (`web`/`mixed` with UI in scope); `/learn-extension` routes to the tutor +
        persists the `extension` track; **one** new command only, setup adds **no** command; frontmatter + JSON valid;
        neutral + secret-free; **mirror to cache**.
- [ ] **P8 — Independent review + close.** An independent adversarial read on (a) non-regression of non-UI builds
      and (b) clean gating + **reuse** (no duplicated extension mechanics — one source `vscode-playwright.md`; no new
      `qa-context` slice). Fix round. README roadmap += SP20; version `0.7.0 → 0.8.0`. **Hold for the user's explicit
      ship.**
