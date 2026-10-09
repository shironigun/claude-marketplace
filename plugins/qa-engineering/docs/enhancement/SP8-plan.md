# SP8 — Implementation plan

Executes [`SP8-spec.md`](./SP8-spec.md). Branch `dev`. Build → self-verify → commit → push → **independent
adversarial review** → close. Consolidate authoring and wire the approval seam that unlocks SP7.

- [x] **P0 — Setup.** SP5 + SP7 in place. Grounded survey done: 3 authoring skills, no shared core, none write
      qa-context/approved, `caseAuthoring` slot already exists. Spec + plan written.
- [ ] **P1 — Shared authoring core (D1).**
  - `knowledge/authoring/house-style.md` — behavior-driven rules, atomic step + explicit expected, API levels
    (contract/endpoint/workflow) + UI click-by-click, title/tags/step-format resolved from the `caseAuthoring`
    profile slot (neutral fallback), the **qa-context `cases` output contract**, and the **approval seam**
    (approved only on explicit sign-off). Product-neutral.
  - Verify: neutral; names the profile slot + qa-context slice precisely; approval seam is explicit + fail-safe.
  - Commit `feat(qa-engineering): shared authoring house-style core + approval seam [SP8]`; push.
- [ ] **P2 — Wire the author-* engines (D2).**
  - `author-api-cases` + `author-ui-cases`: point to D1 (drop duplicated voice/format prose); read the
    `caseAuthoring` profile slot; write the `cases` slice (`items[]`, `mdPath`, `coverage`) as they draft;
    set `approved: true` **only** on explicit QA sign-off; reset on a changed set. De-dup `format-and-voice.md`
    against D1 (keep only UI-specific detail; point to the core for shared rules).
  - Verify: both reference D1; both write qa-context; approval never auto-set; neutral.
  - Commit `feat(qa-engineering): author-* read profile voice + write qa-context cases w/ approval seam [SP8]`; push.
- [ ] **P3 — Retire file-to-tracker duplication + routing (D3, D5).**
  - Reduce `file-to-tracker/SKILL.md` to a thin router (author via author-* → publish via `ado-publish`,
    gated); strip the duplicated authoring prose and the manual-suite-filing claim; keep its trigger
    description so "write tests for #X and add them" still lands. Update `qa-orchestrator` routing (author-* =
    single authoring surface; "write + add" = author → ado-publish). Point its field-mapping ref at
    ado-publish's.
  - Verify: no re-authoring, no manual-filing claim, trigger surface intact, neutral.
  - Commit `refactor(qa-engineering): file-to-tracker → thin author→ado-publish router [SP8]`; push.
- [ ] **P4 — House-profile note (D4).**
  - `house-profile.md`: a short worked, neutral note on the `caseAuthoring` voice slot (how a team encodes
    its house voice locally). Example JSON already carries the block — trim/confirm only.
  - Commit with P3 or its own small commit; push.
- [x] **P5 — Independent adversarial review + close.**
  - Adversarial review (opus): **NEEDS-FIX, 0 Critical.** Verified clean: approval seam fail-safe (never
    inferred, resets on change; ado-publish fail-closes), slice contracts agree exactly, file-to-tracker a
    genuine thin router, no dead refs. Fix round applied: **#1** author-ui-cases stopped restating the
    title/step format inline (points to the core — AC#1 now met); **#2** format-and-voice "Common mistakes"
    reframed as the core's rules shown UI-side; **#3** approval prompt split into a single unambiguous gate
    (core + both author-*); **#4** dropped the dead `id` field from the authored item + anchored the
    traceability thread on `adoCaseId` (qa-context + ado-publish aligned); **#5** neutralized the pilot
    product name in the enhancement docs. README status → SP8 complete. SP9 (automation engine) next.

## Notes
- The seam is the point: `approved` is the one bit that lets SP7 fire. Keep it fail-safe — authoring sets it
  only on an explicit human "approve", exactly as ado-publish's gate 2 needs an explicit human "yes".
- Don't fuse API+UI authoring — share the core, keep the two domain skills.
