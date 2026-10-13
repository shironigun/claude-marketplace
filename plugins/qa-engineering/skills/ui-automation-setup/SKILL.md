---
name: ui-automation-setup
description: Native engine of the qa-engineering — set up the Playwright UI-automation toolchain for a UI-automatable product: DETECT the current state, then (each step GATED) install the Playwright browsers and the "Playwright Test for VS Code" extension, wire the committed `.vscode/` additively, and VERIFY the toolchain works via the framework's own auth — honest-outcome (never claim an install without verifying), non-destructive (never overwrite an existing `.vscode`/`.env`), cross-platform (graceful when the `code` CLI is absent), product-neutral and secret-free. Invoked by `kit-builder` during a UI framework build (Phase 1 Foundation) and callable by the orchestrator. Use when the user wants to "set up Playwright", "install the browsers", "install/set up the VS Code Playwright extension", "get my UI automation environment ready", "why are my UI tests not finding a browser", or when a UI framework build reaches the foundation step. It installs + verifies the toolchain ONLY — it does not author cases (author-ui-cases), generate specs (automation-engine), run the suite (run-suite), or TEACH the extension (that is the `/learn-extension` command / the tutor). Runs only for a UI-automatable product with a UI suite in scope; skips cleanly otherwise.
---

# UI automation setup — browsers + the VS Code extension, set up and verified

A UI framework is useless until the **browsers are installed** and the QA's editor can **discover, run, and
debug** the tests. This engine makes that setup an **active, gated, verified** step of the build instead of
leaving the QA with a blank toolchain. It installs the Playwright browsers and the "Playwright Test for VS
Code" extension, wires the committed `.vscode/`, and proves the toolchain works — then hands off the *mastery*
of the extension (codegen / Pick-locator / Trace Viewer) to the **`/learn-extension`** course.

> **Mechanics live in one place.** The extension's behaviour, the `.vscode/` file shapes, and the official-doc
> links are owned by **`knowledge/standards/vscode-playwright.md`** — read it; this skill *drives* that setup,
> it does not restate it.

## When this runs (the gate — check first, skip cleanly)

Run **only** when a **browser UI actually exists to drive** — both conditions must hold:

- **Automatable:** `system-map.automation` ∈ {`applicable`, `partial`}. A pure **`desktop`** product
  (`automation: manual`) never reaches here — the build routes it to the manual track — and has no browser UI
  anyway.
- **A web UI is in scope — `WEB_APP_URL` is set** in `.env`. This is the **one sound signal** that there is a
  browser UI to drive; it is exactly what Phase 3 keys its UI suite on. (Do **not** gate on `productKind`: a
  `web` product with a real UI already has `WEB_APP_URL` set, and a `mixed` product's UI is a **desktop** client,
  not a browser, so it has no `WEB_APP_URL`.)

**Skip cleanly** (one-line reason, no-op) whenever `WEB_APP_URL` is blank — a pure **`api`** product, an
**API-only** automatable product, or a **`mixed`** product (its API automates without a browser; its desktop UI
is tested by hand). Never install a browser for a product that will not run **browser** UI tests. (It can run
later once a web-app URL is added.)

## The five beats (state → ask+recommend → act → verify → report)

Run each beat in order. Nothing installs before the QA confirms; nothing is claimed installed without a real
re-check.

### 1. Detect (read-only) — show a checklist before doing anything
Probe and report `✓ / ✗` for each, with no side effects:

- **Browsers installed?** — `npx playwright install --dry-run` (or inspect the Playwright browser cache). A
  dry-run that lists downloads needed → not installed.
- **VS Code extension installed?** — **only if** the `code` CLI is on `PATH`:
  `code --list-extensions` and look for `ms-playwright.playwright`. **No `code` CLI → report "can't detect
  (no `code` CLI) — will guide"**, never a false ✗.
- **`.vscode/` present?** — `extensions.json` / `settings.json` / `launch.json` at the framework root.
- **Node / `@playwright/test`** present (the framework scaffold) — a sanity check; if the scaffold is missing,
  say so and stop (foundation must exist first).

Report the checklist, then propose the actions for the ✗ items.

### 2. Install the browsers (GATED)
> **"Install the Playwright browsers now? (`npx playwright install chromium` — add Firefox/WebKit if you want
> cross-browser.)"**

On confirm, run it from the framework root, then **verify**: re-run `--dry-run` (nothing left to download) or
re-probe the cache. Report the **real** result — a failed/partial download is reported as such, not as success.
Recommend **chromium** by default (the kit's UI projects use Desktop Chrome); offer all engines if the QA
tests cross-browser.

### 3. The VS Code extension (GATED, hybrid)
- **If the `code` CLI is present:**
  > **"Install the VS Code Playwright extension now? (`code --install-extension ms-playwright.playwright`, plus
  > `dbaeumer.vscode-eslint`.)"**

  On confirm, run it and **verify** with `code --list-extensions`. Report the real result.
- **If the `code` CLI is absent:** do **not** fail — **guide** the QA (per `vscode-playwright.md`): open the
  project in VS Code → accept the recommended-extensions prompt (the committed `.vscode/extensions.json` offers
  it) **or** run **"Test: Install Playwright"** from the Command Palette (which also installs browsers + picks
  them). Say plainly that this step is manual on this machine.

### 4. Wire `.vscode/` (additive — never overwrite)
Ensure `extensions.json` / `settings.json` / `launch.json` exist from `template/.vscode/`. For each file that
is **missing**, create it from the template; for each that **already exists**, **leave it untouched** and say
so (same non-destructive rule as `.env` / `flow-map.json`). Never write a secret or a machine path into
`settings.json` (those stay in `.env`, which `playwright.config.ts` loads).

### 5. Verify the toolchain works (GATED — confirm before the run)
Prove the chain end to end, honestly:

- Discover tests (the framework's config is read by Playwright) and run **one** small UI check — e.g. the
  module's `ui-smoke` — through the framework's **own** `auth.setup` / storageState. **Never type a password
  into the app**: login is the framework's programmatic job (`.env` creds), not this skill's.
- If it runs green, say so. If it fails to **start** (no browser, bad `.env`, host down), that is an
  **environment** problem — report the cause and the fix, not a pass. A real test failure is a real result,
  reported as-is (and routed to `failure-to-bug` only through the normal gated flow, never auto-filed here).
- Optionally open the **Trace Viewer** once (`npx playwright show-trace`) so the QA sees the debugging surface.

Then point the QA at **`/learn-extension`** to master the extension (Record / Pick-locator / Trace Viewer /
in-editor debug) — this skill sets the toolchain up; the course teaches using it.

## Safety rules (load-bearing — state and obey)
1. **Gate every install/run.** No `npx playwright install`, no `code --install-extension`, no verify run before
   the QA confirms that beat.
2. **Honest-outcome.** Claim a browser/extension installed only after a real re-check; a failed/partial/declined
   step is reported as such.
3. **Non-destructive.** Never overwrite an existing `.vscode/*` or `.env`; fill only what's missing.
4. **Cross-platform.** No `code` CLI → guide, never fail the build. Browser install works per-OS.
5. **No password into a remote form.** Verification logs in via the framework's `auth.setup`, never by typing
   the password into the app.
6. **Scope.** Skip cleanly for `api` / `desktop` / API-only; this skill never runs for a product with no
   browser UI to automate.
7. **Product-neutral + secret-free.** No product/org/URL/credential in this skill or anything it writes.

## Done when
- [ ] The gate was checked: ran only for a UI-automatable product with a UI suite in scope; skipped cleanly
      (with a reason) otherwise.
- [ ] A read-only **detection checklist** was shown before any action.
- [ ] Browsers were installed **(gated)** and **verified** by a real re-check — or already present.
- [ ] The VS Code extension was installed via the `code` CLI **(gated + verified)**, or the QA was **guided**
      when no `code` CLI exists — never a false "installed".
- [ ] `.vscode/` was wired **additively** — nothing existing was overwritten.
- [ ] The toolchain was **verified** by one real UI check via the framework's own auth; an env/start-up error
      was reported as such, not as a pass.
- [ ] The QA was pointed at `/learn-extension` for extension mastery.
- [ ] Nothing product-specific, secret, or destructive happened.

## Reference
- `knowledge/standards/vscode-playwright.md` — the extension mechanics, the `.vscode/` file shapes, the
  official-doc links (the single source of truth this skill drives).
- `knowledge/standards/auth-and-storage-state.md` — how the framework's `auth.setup` / storageState works
  (the verify step uses it).
- `knowledge/standards/tooling-and-commands.md` — the terminal commands behind run/verify.
