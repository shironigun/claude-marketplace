# QA Review Brief — Format

The shape of the brief `story-intelligence` produces at step (e). The brief helps QA **think** about the
requirement; it is not a test-case list. Keep every claim labeled Confirmed / Inferred / Assumption /
Gap-or-Question, and **never invent a requirement** — an unstated behaviour is an Assumption or a
Gap-or-Question, never a Confirmed line.

> The worked example below uses generic placeholders (Orders, widgets, a User role, an epic). Use the
> real story's modules, roles and nouns — read from the house-profile, never hard-coded.

## The sections (in order)

1. **Understanding** — the requirement in two or three labeled lines: what is changing, why, and the
   expected observable behaviour.
2. **Scope** — what is in scope, what is explicitly out of scope, and what is unclear (as a gap).
3. **Risks** — the highest-risk areas to break, ordered most-risky first; each with a one-line reason.
   These seed `review.risks[]`.
4. **Questions / Gaps** — the numbered Gap-or-Question items to resolve with Product / BA / Dev. The
   count here is the **N** in the gate. These seed `story.gaps[]`.
5. **Regression impact** — the existing flows/modules to re-check because they share surface with the
   change. These seed `review.coverageGaps[]` where a gap in planned coverage is implied.
6. **Test strategy** — which test types apply **and why**, and which do not apply and why. Cover:
   functional · regression · API · UI · integration · permissions · validation · negative ·
   cross-browser · mobile · DMS/external-integration · performance.

End the brief with a **testability verdict** (`testable` / `testable-with-assumptions` / `blocked`)
that seeds `review.verdict`, and the gate line.

## Worked example (neutral placeholders)

> Story: "As a User I want to delete an order so the list only shows active orders." Parent: an epic
> that scopes Orders management to the User role. One linked bug references stale list counts.

**Understanding**
- *Confirmed (AC):* Deleting an order removes it from the active-orders list.
- *Inferred (parent epic):* The action is available to the User role only.
- *Assumption (delete semantics not stated):* Delete is a **soft** delete — the order is retained with
  status `cancelled` rather than physically removed.

**Scope**
- In: delete an order from the list; the active-list no longer shows it.
- Out (not stated, treat as out): bulk delete; undo/restore. *(Gap-or-Question if the QA expects them.)*
- Unclear: whether reports/counts that include orders should exclude a cancelled one. *(Gap-or-Question)*

**Risks** (most-risky first)
1. Stale list **counts/caches** after delete — a prior linked bug already hit this area. *(regression)*
2. **Soft-vs-hard delete** ambiguity — reports and totals behave differently under each. *(data/state)*
3. **Permission bypass** — a non-User role deleting via the API even if the UI hides the control.

**Questions / Gaps** (N = 3)
1. Is delete soft or hard? If soft, what status, and does the order still count in reports/totals?
2. What happens on a **failed** delete (partial/timeout) — what state and what does the user see?
3. Which roles may delete — is API-level permission enforced, not just the UI control?

**Regression impact**
- The active-orders **list and its count** (shared with the linked stale-count bug).
- Any **report or total** that aggregates orders (if cancelled orders are included/excluded).
- The **Orders permission** check shared by create/read/update.

**Test strategy**
- **Functional** — yes: the core delete-then-not-listed behaviour.
- **Negative** — yes: delete a nonexistent/already-deleted order; failed-delete path (once defined).
- **Permissions** — yes: each role allowed/denied, at the **API** level, not just the UI.
- **Regression** — yes: list count/cache, and order totals/reports (shared surface + prior bug).
- **API** — yes: the delete endpoint's status codes and the read-back state.
- **Integration** — yes if an external/DMS system mirrors order state; confirm whether it does.
- **Validation** — limited: delete carries little input; the id is the only field to validate.
- **UI** — yes: the control's presence/absence per role and the list update.
- **Data / state** — yes: soft-delete status, count consistency, read-after-write.
- **Mobile / responsive** — yes if Orders ships a mobile/responsive surface; else "not applicable".
- **Cross-browser** — light: standard list action, no exotic UI; smoke on primary browsers only.
- **Performance** — not applicable: single-record action on an existing hot path, no new heavy query.

**Verdict:** `testable-with-assumptions` — the happy path is testable now; the 3 gaps above gate full
coverage.

**Gate:** "I found 3 gaps/questions — resolve with Product/BA first, or proceed on the stated
assumptions (soft delete, User-role-only)?"

## Mapping to `qa-context`

| Brief section | `qa-context` slice/field |
|---|---|
| Understanding + concern analysis | `story.analysis` |
| Questions / Gaps | `story.gaps[]` |
| Verdict | `review.verdict` |
| Risks | `review.risks[]` |
| Regression impact / coverage holes | `review.coverageGaps[]` |

`story.id` stays the trace anchor the authored cases point back to (`cases.items[].tracesStory`).
