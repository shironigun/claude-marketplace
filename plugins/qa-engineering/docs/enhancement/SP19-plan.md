# SP19 — Implementation plan

Executes [`SP19-spec.md`](./SP19-spec.md). Branch `dev`, mirrored to cache. Build → self-verify (incl. the
**web non-regression** gate) → independent adversarial review → hold for the user's ship. Adds the
`productKind` dimension + the manual/automation-optional track (web unchanged, desktop a new branch).

**Guiding invariant (every phase):** the `web` path is **additive-only** — no existing web behaviour changes.
When a phase touches a shared file, the web branch stays byte-equivalent; the new behaviour sits behind a
`productKind`/`automation` check.

- [x] **P0 — Setup.** Grounded: `scan-and-confirm` (phase-0 + system-map), `knowledge-base.md` + `kb-builder`
      (discovery + atlas), `code-intelligence`, `author-ui-cases`, `failure-to-bug`, `kit-builder` /
      `automation-engine` / `run-suite` (the automation pillar), `qa-orchestrator` + commands, the system-map
      shape. Spec + plan written + self-reviewed.
- [x] **P1 — `productKind` dimension (scan-and-confirm + system-map).**
  - [ ] New phase-0 question: detect/confirm `productKind` (web default · api · desktop · mixed), recommending
        from the scan (web router/SPA → web; API/OpenAPI only → api; a desktop solution `.vbproj`/`.csproj`
        WinForms-WPF / Delphi `.dpr`/`.dproj`, no web host → desktop; desktop UI + backend API → mixed).
        Never silently infer desktop; default web.
  - [ ] Derive `automation` (applicable | manual | partial) from `productKind`; write both to `system-map.json`
        (document the two new fields in the skill's Output section).
  - [ ] Generalize discovery: web = frontend-route-first (unchanged); desktop/mixed-UI = screen/form-first;
        api = backend-prefix.
  - [ ] Gate connection collection: skip API base-URL/auth/`.env`/reachability for `desktop`; collect for the
        API surface only on `mixed`; `web`/`api` unchanged.
- [x] **P2 — KB/atlas desktop variant (`knowledge-base.md` + `kb-builder`).**
  - [ ] `knowledge-base.md`: add the per-`productKind` remap table (Route→Screen path; API-behind→code-behind
        handler→service; atlas FE/BE globs→UI-layer/logic-layer globs; link table feature→screen→handler→
        service/DB). RULES/variants/keyword-packs/evidence/deepen-on-engage explicitly unchanged. Frontend-first
        rule generalized to "surface-first" with the web case unchanged.
  - [ ] `kb-builder`: add a desktop investigation branch (map form surface → trace event handlers → resolve to
        business-logic/data → extract rules), alongside the web branch it keeps; emit the desktop atlas shape.
- [x] **P3 — Automation pillar gated + code-intelligence framing.**
  - [ ] `kit-builder` / `automation-engine` / `run-suite`: gate on `automation` — `manual` (desktop) → not
        offered, explain + point at the manual flow; `partial` (mixed) → API surface only; `applicable`
        (web/api) → unchanged.
  - [ ] `code-intelligence`: for `desktop`, read "the code behind the screen" (forms→handlers→logic) read-only,
        same labeling; web framing unchanged.
- [x] **P4 — Manual modes (`author-ui-cases` + `failure-to-bug`).**
  - [ ] `author-ui-cases` manual mode: when `automation` is manual (or the UI of mixed), emit manual steps
        naming controls by label, no web locators, no automation implication; web mode unchanged.
  - [ ] `failure-to-bug` manual-input mode: accept a QA-described observed failure (steps/expected/actual +
        optional screenshot) → same investigate→classify→draft→gated-file; red-run path unchanged.
- [x] **P5 — Orchestrator / commands.**
  - [ ] `qa-orchestrator`: route on `productKind`/`automation` — the manual track (analyze → KB → cases →
        publish → manual test → bug, no build/run) for desktop; web routing unchanged. Routing-table note +
        "automation not applicable" messaging for `/build` + `/run`.
  - [ ] `/qa` first-run confirms product kind, runs the manual track for desktop (skip framework-build + run);
        `/test` skips automate/run for a manual product; `/build` + `/run` degrade with a clear message.
- [x] **P6 — Contract + template + docs.**
  - [ ] `qa-context.md` / system-map shape: document `productKind` + `automation` (and the desktop atlas
        fields). `catalog`/KB stubs unchanged.
  - [ ] `template/.env.example` + config note: `.env` auth/URL keys not needed for `desktop` (only `mixed`'s
        API). README (three product kinds + the manual track), `docs/phases.md` (phase-0 product kind),
        `plugin.json` description widened to "the loop that applies to your product".
- [x] **P7 — Self-verify.** Web non-regression confirmed, desktop path coherent, frontmatter + JSON valid,
      neutral + secret-free, mirrored to cache (23 files, byte-identical, v0.7.0).
  - [ ] **Web non-regression (hard):** diff the web behaviour — a `web` product reaches none of the new
        branches; discovery/KB/atlas/UI-cases/build-run read exactly as before SP19.
  - [ ] Desktop path coherent end-to-end (analyze → KB → cases → publish → bug, no build); mixed API surface
        automatable + UI manual; frontmatter + JSON valid; neutral + secret-free; mirror to cache.
- [x] **P8 — Independent review + close.** (`framework-reviewer`/`reuse-guardian` grade generated Playwright
      code — N/A here; SP19 changed instruction files only.) An **independent adversarial read** on (a) web/api
      non-regression and (b) clean `productKind` gating ran and returned **PASS after fixes**: 4 findings — 1 HIGH
      (`author-ui-cases` had no `mixed` branch → mixed desktop-UI cases mis-authored), 1 MEDIUM (stale
      `question 3/4/5` cross-references from the Q-renumbering), 2 LOW (Q14 "web only" vs the 7-14 header; the
      scaffolded `CONVENTIONS.md` documented only web globs) — **all fixed**. README roadmap += SP19; version
      `0.6.2 → 0.7.0`. **Remaining: the user's explicit ship** (commit → push `dev` → PR → merge) — NOT done
      (standing no-auto-commit).
