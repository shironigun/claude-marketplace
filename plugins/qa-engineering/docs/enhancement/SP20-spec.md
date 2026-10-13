# SP20 — Guided UI-automation setup & VS Code extension mastery

Make the plugin **actively set up** the Playwright UI toolchain during a framework build, and give the QA a
**dedicated, hands-on path to master the Playwright VS Code extension** — closing the gap that today the plugin
only *ships* `.vscode/` config, *documents* the extension (`knowledge/standards/vscode-playwright.md`), and
*mentions* it in one tutor topic, but never installs the browsers/extension, never verifies them, and offers no
focused "learn the extension end to end" experience.

## Why (the gap)

A QA who runs `/qa` or `/build` to set up a UI framework hits a **blank toolchain**: `@playwright/test` is a
dependency but the **browsers are not installed** (`npx playwright install` was never run), the **VS Code
extension** is only *recommended* by `template/.vscode/extensions.json` (passive — VS Code may or may not offer
it), and the only way to learn the extension's real power (codegen/Record, Pick-locator, Trace Viewer, in-editor
debug) is to read the standard. The live-test log (`plugin-gaps-from-crm-live-test.md`, §H/§P) corroborates: the
UI tier works on Playwright's bundled Chromium, but browser install is not a guided step, and the extension
know-how is reference-and-teach only, never an active setup + practice loop.

## Goal

Two **additive** deliverables, both gated on the product being UI-automatable (SP19's `automation`):

- **A — UI toolchain setup folded into the framework build** (no new command). When the build sets up a
  UI-automatable framework, it detects, installs (gated), and verifies the Playwright **browsers** and the
  **VS Code extension**, and wires `.vscode/` additively.
- **B — a dedicated `/learn-extension` command** + an **`extension` learning track** that teaches the VS Code
  Playwright extension end to end, hands-on, with resumable progress.

## Guiding invariants (every change)

1. **Additive-only / non-regressive.** An **API-only** or **non-UI** build (`api`, `desktop`, or `web`/`mixed`
   with no UI suite in scope) reaches **none** of the new setup behaviour and behaves exactly as before SP20.
   The new work sits behind a UI-automatability + UI-in-scope check.
2. **Gated.** Every install or tool launch is confirmed first (state → ask+recommend → act → verify → report),
   like every other build phase.
3. **Honest-outcome.** Never claim a browser/extension is installed without **verifying** the real result. A
   failed or skipped install is reported as such, not smoothed over.
4. **Non-destructive.** Never overwrite an existing `.vscode/*` or `.env` — fill/append missing files only
   (same rule as `flow-map.json`/`.env`).
5. **No password typing into remote forms.** Any login during verification uses the framework's own
   `auth.setup`/storageState (programmatic, `.env` creds) — never the assistant typing a password into the app.
6. **Reuse over duplication.** Lean on `vscode-playwright.md`, `template/.vscode/`, the `automation-tutor`, and
   the existing `learning` slice; do not restate the extension's mechanics in a second place.
7. **Product-neutral + secret-free + cross-platform.** No product/org/URL/credential; graceful when the `code`
   CLI is absent; browser install works per-OS.

## Deliverables

### 4.1 — `ui-automation-setup` skill (the setup engine; no command)

A new **native skill** `ui-automation-setup`, invoked by `kit-builder` during the build (and available to the
orchestrator), that runs the five-beat phase loop:

1. **Detect (read-only checklist):**
   - UI-automatable **with a browser UI in scope**? (`system-map.automation` ∈ {`applicable`, `partial`} **and
     `WEB_APP_URL` is set** — the one sound signal of a browser UI, the same one Phase 3 keys on; **not** gated on
     `productKind`, since a `mixed` product's UI is a desktop client with no `WEB_APP_URL`). If not → **skip**
     with a one-line reason, no-op.
   - Browsers installed? (probe the Playwright browser cache / `npx playwright install --dry-run`).
   - VS Code extension installed? (`code --list-extensions | grep ms-playwright.playwright`, **only if** the
     `code` CLI is on `PATH`).
   - `.vscode/` present? (`extensions.json` / `settings.json` / `launch.json`).
   - Report a `✓ / ✗` checklist before doing anything.
2. **Install browsers (gated):** confirm, then `npx playwright install chromium` (offer all engines), then
   **re-probe to verify** real success.
3. **VS Code extension (gated, hybrid):** if the `code` CLI is present →
   `code --install-extension ms-playwright.playwright` (+ `dbaeumer.vscode-eslint`); else **guide** (Command
   Palette → "Test: Install Playwright", per `vscode-playwright.md`). Confirm the outcome.
4. **Wire `.vscode/` (additive only):** ensure `extensions.json`/`settings.json`/`launch.json` exist from
   `template/.vscode/`; **never overwrite** an existing file.
5. **Verify the toolchain:** discover tests and run one small UI check via the framework's **own**
   `auth.setup`/storageState; report the real pass/fail; optionally open the Trace Viewer once
   (`npx playwright show-trace`). A start-up/env error is reported as such, not as a pass.

Guardrails: gated, honest-outcome, non-destructive, cross-platform (no `code` CLI → guide, never fail the
build), product-neutral, secret-free.

### 4.2 — Fold the setup into `kit-builder` Phase 1 (Foundation)

`kit-builder` **Phase 1 (Foundation)** gains a **UI toolchain** sub-step that invokes `ui-automation-setup`
**after** the scaffold/auth probe, **only** when the trigger condition in 4.1 holds. It runs as its own gated
beat and **degrades gracefully** (a missing `code` CLI, a declined install) rather than failing the build.
Because `/qa` (first-run arc) and `/build` both route through `kit-builder`, they inherit this automatically —
**no new command for setup**, keeping the lean menu. `docs/phases.md` Phase 1 documents the new step + its
verify; `docs/reuse.md` maps the capability → the `ui-automation-setup` skill.

### 4.3 — `/learn-extension` command + the `extension` learning track

- **New command** `commands/learn-extension.md` (namespaced `qa-engineering:learn-extension`): a thin wrapper
  that routes through the `qa-orchestrator` to the `automation-tutor`, exactly like `/learn`. Takes optional
  context to jump to a topic.
- **Extension mini-track** in `knowledge/curriculum/learning-path.md` (a focused topic cluster, tagged
  `extension`): install & test discovery → run & **debug from the editor** (breakpoints, live locator
  highlight, expected-vs-received) → **Record new / Record at cursor / Pick locator** → **refactor codegen
  output into page objects** (never commit verbatim) → **Trace Viewer** on a real failure → multi-config
  switching → best practices. Grounded in `vscode-playwright.md` + official `playwright.dev` links.
- **Hands-on:** the tutor may *launch* the CLI-launchable tools so the learner practises immediately —
  `npx playwright codegen <url>` (recorder/Inspector), `npx playwright show-trace`, `npx playwright
  show-report` — each announced/gated — while teaching the in-editor equivalents it cannot drive.
- **Resumable progress:** reuse the existing **`learning` slice** as an **`extension` track** (same shape:
  `goal`/`depth`/`current`/`path[]`/`studyPlanPath`); `/learn-extension` and `/resume` pick up where the
  learner left off. The tutor teaches **read-only**; the **orchestrator persists** the slice (the SP15
  P-learn split). `/learn-extension` complements `/learn` (the broad course) — it is the focused extension
  deep-dive.

### 4.4 — Orchestrator, contract, docs

- `agents/qa-orchestrator.md`: route `/learn-extension` (and the "teach me the extension / codegen / trace
  viewer / pick locator" intents) to the tutor's extension track; note the Phase-1 UI-toolchain step in the
  build routing.
- `knowledge/orchestration/qa-context.md`: note the `extension` track in the `learning` slice (no new slice —
  reuse the existing shape).
- `knowledge/standards/vscode-playwright.md`: add a short **"Automated setup"** cross-reference pointing at
  the `ui-automation-setup` behaviour (so the standard and the engine agree; the standard stays the mechanics
  source of truth).
- `.claude-plugin/plugin.json`: widen the description (UI toolchain setup during the build + extension
  mastery) and add keywords (`vscode`, `codegen`, `trace-viewer`); `README.md` + `docs/enhancement/README.md`:
  SP20 entry.

## Out of scope

- **Driving the VS Code extension's GUI** (Record/Pick-locator/Trace Viewer *inside the editor*) — the plugin
  teaches these and launches the CLI-equivalents; it cannot operate the editor UI.
- **Installing VS Code itself**, or supporting non-VS-Code editors (the standard is VS Code-specific).
- **Desktop UI automation** (SP19's out-of-scope stands).
- Changing how the framework's projects/auth/reporters are defined (those live in `playwright.config.ts`).

## Acceptance criteria

1. On a build with a browser UI in scope (`automation` ∈ {`applicable`, `partial`} **and `WEB_APP_URL` set** —
   in practice a `web` product), Phase 1 runs the UI-toolchain step: it **detects** the state, **installs
   browsers** (gated + verified), **installs or guides** the VS Code extension (hybrid on the `code` CLI),
   **wires `.vscode/` additively**, and **verifies** — all honestly (no claimed install without a real check).
2. Whenever `WEB_APP_URL` is **blank** — a pure `api` product, an `api`/`desktop` product, an API-only
   automatable build, or a `mixed` product (desktop UI, no browser) — the step is **skipped** with a one-line
   reason and the build is **byte-equivalent** to pre-SP20 (hard non-regression gate).
3. `/learn-extension` exists, routes through the orchestrator to the tutor, teaches the `extension` track
   grounded in `vscode-playwright.md` + official docs, **launches** `codegen`/`show-trace`/`show-report`
   hands-on (gated), and **persists** progress in the `learning` slice (resumable via `/learn-extension` /
   `/resume`).
4. Nothing overwrites an existing `.vscode/*` or `.env`; the `code` CLI being absent degrades to guidance and
   never fails the build.
5. Exactly **one** new command (`/learn-extension`); the **setup adds no command** (folded into the build).
6. Product-neutral, secret-free; all new/edited frontmatter + `plugin.json` are valid.
7. Reuse holds: no duplication of the extension mechanics (one source: `vscode-playwright.md`) and no new
   `qa-context` slice (the `learning` slice is reused).

## Version

`0.7.0 → 0.8.0` (new feature surface, additive).
