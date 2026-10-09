# SP8 — Consolidate case authoring + wire the approval seam (spec)

Status: in progress (2026-10-08). Phase 2. Depends on SP5 (qa-context + house-profile) and SP7 (ado-publish,
which consumes `cases.approved`). **This is the sub-project that closes the loop from authoring to the gated
write path.**

## 1. Goal
Make test-case authoring **one coherent surface** that (a) shares a single house-style core instead of
duplicating it across three skills, (b) reads the team's voice from the **house-profile** `caseAuthoring`
slot, and (c) **writes the `qa-context` `cases` slice and sets `approved` only on an explicit QA sign-off** —
so `ado-publish` (SP7) finally has something upstream to publish. Today nothing sets `approved`, so the
gated write path can never fire; SP8 fixes that.

## 2. What exists now (grounded)
- `author-api-cases` — authors API cases at three levels (Contract / Endpoint / Workflow). ~116 lines.
- `author-ui-cases` — authors click-by-click UI cases, atomic step + explicit expected. ~114 lines, with
  `references/format-and-voice.md` + `references/example-from-story.md`.
- `file-to-tracker` — **re-authors** in the same house style **and** files to the tracker. ~101 lines.
- The house-style/voice rules are **duplicated inline** across all three (no `knowledge/authoring/` core).
- None of the three write the `qa-context` `cases` slice or set `approved`. The `caseAuthoring` profile slot
  (voice, stepFormat, titleConvention, tags) **already exists** and names author-* as its consumers, but the
  engines don't actually read it.

## 3. Design decisions (expert calls — recommendation taken)
1. **Keep two authoring engines by domain, not one.** API (contract/endpoint/workflow) and UI (click-by-click
   atomic steps) are genuinely different disciplines with different triggers; fusing them would bloat one
   SKILL and blur routing. Instead **extract the shared core** so they stop duplicating it.
2. **One shared authoring core** — `knowledge/authoring/house-style.md`: the behavior-driven rules, the
   atomic-step + explicit-expected discipline, how title/tags/step-format resolve from the `caseAuthoring`
   profile slot (neutral fallback), and the **qa-context `cases` output contract** incl. the approval seam.
   Both author-* consume it; the duplicated prose in each is replaced by a pointer.
3. **Retire `file-to-tracker`'s duplication; keep it as a thin router.** Its two halves are now both owned —
   authoring by author-*, gated filing by `ado-publish`. Reduce it to a short routing skill ("author via
   author-api/ui-cases → publish via ado-publish, which is gated") and **strip** the duplicated authoring
   prose and the now-false "add them to the suite in the UI" manual-filing claim. Keep its trigger
   description so a bare "write tests for #123456 and add them" still lands and routes to the two-step
   author → gated-publish pipeline. (Lower-risk than deleting the trigger surface outright.)
4. **House voice stays in the profile (neutrality preserved).** The team's real voice/title/tags/format live
   in the git-ignored `house-profile.json` `caseAuthoring` slot — never committed. SP8 adds only a worked,
   **neutral** note on encoding a house voice; the example profile already carries a `caseAuthoring` block.

## 4. The approval seam (the load-bearing part)
An authoring engine writes the `cases` slice as it drafts, but **`approved` stays `false` until the QA
explicitly signs off** on the shown set ("approve these" / "yes, these are good"). Rules:
- Drafting writes `cases.items[]` + `mdPath` + `coverage` with `approved: false` (or absent).
- `approved: true` is set **only** on an explicit QA sign-off on the previewed cases — never inferred from
  "ok", silence, or the mere act of drafting. Changing the set resets `approved` to `false`.
- This mirrors `ado-publish`'s gate-2 discipline: authoring approval and publish confirm are two distinct,
  explicit human acts. The engine says plainly when it sets `approved`.

## 5. Deliverables
- **D1** `knowledge/authoring/house-style.md` — the shared neutral core (rules + profile resolution + the
  qa-context.cases contract + approval seam).
- **D2** Refactor `author-api-cases` + `author-ui-cases`: consume D1, read the `caseAuthoring` profile slot,
  write the `cases` slice, set `approved` only on explicit sign-off. De-duplicate their inline house-style.
- **D3** Reduce `file-to-tracker` to a thin author→ado-publish router; strip duplicated authoring + the
  manual-suite claim; keep the trigger surface.
- **D4** House-profile: a short worked note (neutral) on the `caseAuthoring` voice slot in `house-profile.md`.
- **D5** `qa-orchestrator` routing: author-* is the single authoring surface by domain; "write + add" =
  author → ado-publish.

## 6. Out of scope
Automation generation (SP9), failure→bug (SP10), the end-to-end rehearsal (SP11). SP8 does not change
`ado-publish`'s write logic — it only feeds it approved cases.

## 7. Acceptance criteria
1. A single `knowledge/authoring/house-style.md` is the one source of the house style; author-* reference it
   and no longer duplicate the voice/format rules inline.
2. Both author-* engines **read the `caseAuthoring` profile slot** (neutral fallback, flagged) and **write
   the `qa-context` `cases` slice**; `approved` is set **only** on an explicit QA sign-off, never inferred.
3. `file-to-tracker` no longer re-authors or claims manual suite-filing; it routes author → `ado-publish`
   and keeps its trigger surface. The orchestrator routes the combined "write + add" intent as the two-step.
4. House voice specifics stay in the git-ignored profile; only neutral placeholders/notes are committed.
   Product-neutral + secret-free (scan); committed + pushed to `dev`.
5. **Independent adversarial review passes** — neutrality, no leftover duplicated house-style, the approval
   seam is fail-safe (never auto-approves), file-to-tracker no longer double-authors or mis-states filing.

## 8. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product scan
before every push. No PR. Full independent review (this touches the most-used authoring surface and the
approval seam that unlocks SP7).
