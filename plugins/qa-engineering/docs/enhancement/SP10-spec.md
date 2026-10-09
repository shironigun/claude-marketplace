# SP10 — Failure → investigation → bug: one engine, API+UI, gated filing (spec)

Status: planned (2026-10-08). Phase 2. Depends on SP5 (qa-context + house-profile `defectFormat` slot), SP7
(the gated-write discipline to mirror), and SP9 (the `automation`/`failures` slices a red run produces).

## 1. Goal
Make **one** engine that takes a failing test (API **or** UI), **investigates** it from its real artifacts
(assertion/stack, logs, Playwright trace/screenshot/video/error-context), classifies it honestly
(real product bug / flake / environment / test defect), and — only for a real bug — drafts a review-ready
defect in the team's house format and **files it through a gated write** (never auto-files). It reads the
`failures` slice and writes the `bugs` slice, linking each defect to the case (and story) it proves broken.

## 2. What exists now (grounded)
- `skills/failure-to-bug/` (SKILL + `references/bug-format.md`) — good bones but **API-only** ("when an API
  test fails"), light triage, and it hands filing to the **retired `file-to-tracker`** path ("or file
  directly"). Draft-and-review only (never auto-files) — that discipline is right and stays.
- qa-context slices already defined: `failures` = `{ runs[] }` (each `{ specPath, title, assertion, status }`),
  `bugs` = `{ items[] }` (each `{ id?, title, tracesCase, tracesStory, status }`), with `investigation`
  named as the SP10 consumer.
- `defectFormat` house-profile slot already exists: `{ type, titleConvention, requiredFields, severityScale
  }` (+ repro shape). The engine must read it (neutral fallback), not hard-code the format.

## 3. Design decisions (expert calls)
1. **One engine, both domains.** Broaden `failure-to-bug` to cover **API and UI** failures (keep the name —
   it is the trigger surface). The triage + house-format + draft-and-review core is shared; the domain layer
   is which **artifacts** it reads (API: response/status/schema error, server log; UI: the Playwright trace,
   screenshot, video, error-context, console/network). The "3→1" consolidation = one failure engine instead
   of per-domain/per-product bug skills.
2. **A real investigation stage before drafting.** Insert **investigate** between capture and draft: read the
   actual evidence (not just the one-line assertion), reconstruct what the test did vs what happened, and
   reach a root-cause hypothesis + a confident classification. Only `real_bug` proceeds to a draft; flake /
   environment / test-defect are reported with the evidence and **not** filed.
3. **Gated filing, mirroring ado-publish.** Filing a bug is a tracker **write**, so it gets the same gate
   discipline as SP7: draft → QA approve the draft → **dry-run** of exactly what will be written (type,
   fields, links) → explicit confirm → `wit_create_work_item` ($Bug with the `defectFormat` fields) + link
   to the case (`adoCaseId`, relation `type: "related"` — a bug *relates to* the case, it does not "tests"
   it; "tests" is case→story, owned by `ado-publish`) and story. **Never auto-file.** The
   bug-file is NOT folded into `ado-publish` (that owns Test Cases; a $Bug is a different type/flow) — the
   failure engine owns its own gated write, referencing the shared gate principles.
4. **Profile-driven defect format.** Title convention, work-item type, required fields, severity scale and
   repro shape come from the `defectFormat` slot (neutral fallback, flagged) — never hard-coded.

## 4. Deliverables
- **D1** Broaden `skills/failure-to-bug/SKILL.md` to API+UI with the **investigate** stage, reading Playwright
  artifacts (trace/screenshot/video/error-context/console+network) and logs; keep triage + draft-and-review.
- **D2** `references/investigation-guide.md` — how to read a failure's evidence per domain and classify
  real_bug / flake / environment / test-defect (product-neutral; points at the Standards for how the kit
  runs tests, e.g. `reporting-allure.md`, `isolation-and-parallelism.md`).
- **D3** The **gated bug-file** in the skill: draft → approve → dry-run → confirm → `wit_create_work_item`
  ($Bug, `defectFormat` fields) + link to case/story; read `defectFormat` from the profile; write the `bugs`
  slice. Reference the gate principles (`ado-publish`'s `publish-gates.md`), don't restate them.
- **D4** Wire qa-context (`failures` read, `bugs` write) + `qa-orchestrator` routing (a failing `.spec.ts` /
  stack trace / red run → this engine). Retire the "hand to `file-to-tracker` to file" wording → the gated
  path. Set `references/bug-format.md`'s ADO bug→case link relation to `type: "related"` (a bug relates to
  the case it was found through; `tests` is case→story and belongs to `ado-publish`).

## 5. Out of scope
Authoring/publishing cases (SP6–8), generating specs (SP9), the end-to-end rehearsal (SP11). SP10 turns a
real failure into a filed defect; it does not fix the product or re-run the suite.

## 6. Acceptance criteria
1. `failure-to-bug` handles **API and UI** failures, with an **investigate** stage that reads the real
   artifacts (incl. Playwright trace/screenshot/video) and classifies honestly; only `real_bug` drafts.
2. Filing is **gated** (draft → approve → dry-run → confirm → write), mirroring `ado-publish`; it **never
   auto-files**; it uses `wit_create_work_item` with the `defectFormat` fields and links the bug to the case
   (`adoCaseId`) + story. Honest outcomes (claims only what the API returned).
3. Format comes from the `defectFormat` profile slot (neutral fallback). Reads `failures`, writes `bugs`;
   the story ⇄ case ⇄ defect thread holds.
4. Product-neutral + secret-free (scan); reuses the gate principles + Standards rather than restating them;
   committed + pushed to `dev`. No stale `file-to-tracker`-files-bugs wording remains.
5. **Independent adversarial review passes** — gated (no auto-file), investigation is real not cosmetic,
   classification fail-safe (a flake/env is not filed as a bug), neutral, contracts agree.

## 7. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product scan
before every push. No PR. Full independent review (a second tracker *write* path — gates must hold).
