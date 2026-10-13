# SP19 — Product kind + a manual/automation-optional track (web, api, desktop) (spec)

Status: in progress (2026-10-13). Phase 12+ (post-audit extension). Depends on SP5 (qa-context), SP6/SP13
(story-/code-intelligence), SP8 (authoring), SP7 (ado-publish), SP10 (failure-to-bug), SP18 (Knowledge Base),
and the variant axis. **Extends the plugin to serve QAs on products Playwright can't automate — legacy/desktop
thick clients (VB.NET, Delphi, WinForms/WPF) — delivering story analysis, the KB/atlas, test-case authoring,
and the full Azure DevOps round-trip, while the Playwright automation pillar becomes cleanly optional.**

> **Additive, non-regressive by rule.** This is purely an *extension*. The existing **web** behaviour — the
> frontend-first / route-based discovery, the web KB/atlas, UI cases with semantic Playwright anchors, the
> framework build/generate/run — is **unchanged** and stays the default. Desktop is a **new branch keyed on a
> `productKind` flag**; a web product reaches none of the new code paths. Every acceptance criterion includes a
> web non-regression check.

## 1. Why
The plugin is built loop-and-automation-first and assumes a **web SPA**: discovery is frontend-route-first,
the KB/atlas maps routes→controllers→API, UI cases use Playwright web locators, and the loop assumes a
framework build + run. But a real cohort of QAs test **legacy/desktop apps that Playwright cannot drive** — and
for them most of the plugin's value still applies: analyzing an ADO story, building a feature **Knowledge Base
+ atlas** (they have the source), writing **test cases**, publishing them to **ADO Test Plans/Suites**, and
filing **bugs** to the SWAT/bug boards. Today those QAs hit web/automation assumptions that don't fit. SP19
makes the plugin **assist everyone to the extent their product allows**: automation where a surface can be
automated, the full manual-QA + ADO loop everywhere else.

## 2. Goal
A **`productKind`** dimension (`web | api | desktop | mixed`) that, confirmed once at phase 0, routes the right
discovery, the right KB/atlas shape, and the right loop — gating the Playwright automation pillar on whether an
**automatable surface** exists. For a desktop/thick-client product the loop is **analyze → KB → author cases →
publish to ADO → (test manually) → file bugs**, reusing every existing analysis/cases/publish/bug engine, with
**no framework build/generate/run**. The web (route) path is untouched. Desktop *UI* automation is **out of
scope**.

## 3. The `productKind` dimension (the one flag that drives it all)
Added to `system-map.json` (and surfaced in the house-profile), confirmed by `scan-and-confirm` phase 0:

| `productKind` | What it is | `automation` (derived) | Automatable surface |
|---|---|---|---|
| `web` (default) | a web app / SPA | **applicable** | UI (Playwright browser) + any API |
| `api` | an API-only backend | **applicable** | API (Playwright request) |
| `desktop` | a thick client, no separable API (VB.NET/Delphi/WinForms/WPF) | **manual** | none the plugin automates today |
| `mixed` | a **desktop/thick-client UI** **plus** a separable backend API/DB | **partial** | the **API** surface only (the desktop UI stays manual) |

(A web app that also has an API is just `web` — both its UI and API are automatable, so it needs no separate
kind. `mixed` exists specifically for a **non-web UI that the plugin can't automate, sitting over an API it
can**.)

- **`automation`** is *derived*, never asked separately: `web`/`api` → applicable; `desktop` → manual;
  `mixed` → partial (API automatable, UI manual).
- When no `productKind` is detected, **default to `web`** (today's behaviour) — never infer `desktop`
  silently; ask if the signal is ambiguous.

## 4. Deliverables

### 4.1 `scan-and-confirm` — detect/confirm `productKind`, branch discovery
- **New phase-0 question** (before module discovery): confirm the product kind, recommending what the scan
  shows (a web router / SPA → `web`; only an API/OpenAPI, no frontend → `api`; a desktop solution
  — `.vbproj`/`.csproj` WinForms/WPF, a Delphi `.dpr`/`.dproj`, no web host — → `desktop`; a desktop UI
  **plus** a backend API/service → `mixed`).
- **Discovery, generalized** (the existing rule, widened — web path byte-unchanged):
  - `web` → **frontend-route-first** (today, unchanged).
  - `desktop` → **screen/form-first**: modules from the app's forms/windows/menu structure; resolve each
    screen's controls/events to its **code-behind/event handlers** and the **business-logic/data-access** they
    call. (Source-grounded — the QAs have it.)
  - `api` → backend route-prefix grouping (today's API-only fallback).
  - `mixed` → **screen/form-first** for the desktop UI modules (as `desktop`) **plus** the backend API mapped
    as an automatable surface (its base URL / auth / `.env` collected, as `api`).
- **Connection collection is gated:** for `desktop` (no automatable surface), **skip** the API base-URL / auth
  / `.env` collection and the reachability probe — there is nothing to authenticate to for automation. For
  `mixed`, collect them **only for the API** surface. `web`/`api` unchanged.
- Writes `productKind` + `automation` into `system-map.json`; seeds `catalog` + the KB stubs as today.

### 4.2 Knowledge Base — a desktop/thick-client variant (`knowledge-base.md` + `kb-builder`)
Same KB artifact (`modules/<slug>.md` + `RULES.md` + `atlas/<slug>.md`, keyword packs, evidence rails,
`absent→stub→deep`, deepen-on-engage) — **remapped by `productKind`**:

| KB element | `web` (unchanged) | `desktop` |
|---|---|---|
| module brief header | `Route: /orders` | **`Screen / Window / Menu: <path>`** (e.g. `Customers form → Edit tab`) |
| Flow trigger / steps | open route, click (web) | **open form / click control / menu action** |
| Breaks | toast / error page | **error dialog / message box / disabled control** |
| "API behind it" | METHOD path | **code-behind handler → service/business-logic method** (+ METHOD path if `mixed`) |
| atlas frontmatter | `routes`, `frontend_path_*`, `api_prefixes`, `backend_path_*` | **`screens`, `ui_layer_path_*` (forms/`.xaml`/`.vb`/`.pas`), `logic_layer_path_*` (services/data)**; `api_prefixes` only if `mixed` |
| atlas link table | feature → route/component → API → handler | **feature → screen/form → event handler → service/DB** |

**Unchanged for every kind:** RULES (Condition → Result), Variants, keyword packs, evidence rails,
deepen-on-engage, committable-in-the-QA's-repo-never-in-the-plugin. `kb-builder`'s investigation protocol
gains a desktop branch (map the form surface → trace event handlers → resolve into business-logic/data →
extract rules) alongside the web branch it keeps.

### 4.3 The automation pillar becomes optional (gated on `automation`)
- For `automation: manual` (`desktop`): `kit-builder` / `automation-engine` / `run-suite` are **not offered**.
  `/build` and `/run` **explain** ("automation isn't applicable for a desktop product — here's the manual
  flow") instead of failing. The loop is **analyze → KB → author cases → publish to ADO → (manual test) → file
  bugs**.
- For `automation: partial` (`mixed`): the **API** surface is automatable — `author-api-cases` +
  `automation-engine` + `run-suite` work for it; the **UI** stays manual.
- For `automation: applicable` (`web`/`api`): **unchanged** — the full build/generate/run loop as today.
- `code-intelligence` reads a desktop module (screens → handlers → logic) the same read-only way it reads a
  web module; its endpoint/API framing becomes "the code behind the screen" for `desktop`.

### 4.4 Manual modes — `author-ui-cases` + `failure-to-bug`
- **`author-ui-cases` manual mode** (when `automation` is `manual`/the UI surface of `mixed`): cases are
  **manual steps that name desktop controls by their label** ("click **Save** on the Customer form", "the
  **Email** field shows a red 'required' message"), **not** Playwright/web locators. The house case format
  (`Verify that …`, numbered steps, expected) already fits; the change is dropping the web-locator requirement
  and not implying automation. (Web mode unchanged.)
- **`failure-to-bug` manual-input mode:** draft + gated-file an ADO bug from a **QA-observed failure** — the
  QA supplies steps/expected/actual (+ optional screenshot) — not only from a parsed Playwright red run. Same
  investigate→classify→draft→**gated** file, same house format, same idempotency. (The red-run path is
  unchanged.)

### 4.5 Orchestrator / commands — route the manual track
- `qa-orchestrator` + `/qa`: the first-run arc confirms `productKind`; for a manual/desktop product it runs
  the **manual track** (set up → scan screen surface → KB → one module's cases → publish → manual test → bug),
  **skipping the framework-build and run phases**. Web first-run unchanged.
- `/test <module>` for a manual product = **analyze → cases → publish → (manual) → bug** (skips automate/run).
  `/build`, `/run` are automation-only and degrade with a clear message for a manual product.
- `/analyze`, `/status`, `/learn`, `ado-publish`, `story-intelligence` are already product-neutral — a routing
  table note + the honest "automation not applicable" messaging is all they need.

### 4.6 Template + docs
- `template/.env.example` + the `config/` note that `.env` auth/URL keys are **not needed for a `desktop`
  product** (only `mixed` needs them, for its API).
- `knowledge-base.md` + `kb-builder` + `scan-and-confirm` docs carry the desktop variant; `README` +
  `docs/phases.md` note the three product kinds and the manual track; `plugin.json` description widened from
  "the whole loop" to "the loop that applies to your product — full automation for web/API, manual + ADO for
  desktop".

## 5. Out of scope
**Desktop UI automation** (WinAppDriver, FlaUI, Appium-for-Windows, Playwright-can't-drive-it) — **not today**.
Mobile. Any change to the **web/route** behaviour (it is untouched by rule). Non-ADO tracker writes (still the
SP18 seam). Deep VB.NET/Delphi semantic analysis beyond what the KB/atlas needs (map the surface + the rules,
not a full call-graph).

## 6. Acceptance criteria
1. `scan-and-confirm` confirms a **`productKind`** at phase 0 (default `web`; `desktop`/`mixed` recognised from
   a desktop solution; never silently inferred) and writes `productKind` + derived `automation` to
   `system-map.json`.
2. For a `desktop` product, discovery is **screen/form-first**, the **API/auth/`.env` collection is skipped**,
   and the KB/atlas use the **desktop variant** (Screen path, form→handler→service link table) — RULES /
   variants / keyword packs / deepen-on-engage identical to web.
3. The **automation pillar is gated**: `desktop` → build/generate/run not offered (clear "manual flow"
   message), `mixed` → API surface automatable + UI manual, `web`/`api` → **unchanged full loop**.
4. **Manual modes** work: `author-ui-cases` emits manual control-by-label cases; `failure-to-bug` files an ADO
   bug from a QA-described failure — both through the existing gates.
5. The manual loop **analyze → KB → cases → ADO publish → file bug** runs end-to-end for a desktop product
   reusing the existing engines, with no framework build.
6. **Web non-regression (hard):** a `web` product reaches none of the new branches — discovery, KB/atlas, UI
   cases, and the build/run loop behave exactly as before SP19. Verified explicitly.
7. Product-neutral + secret-free; independent adversarial review passes (the non-regression of the web path +
   the clean `productKind` gating are the key risks).

## 7. Logistics
Repo `claude-marketplace`, branch `dev`, mirrored to cache. Conventional commits scoped `qa-engineering`.
Secret + product scan before every push. Full independent review. Version bump on ship (new capability).
