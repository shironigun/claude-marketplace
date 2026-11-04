<!-- forked-from: qa-engineering/skills/story-intelligence/references/review-brief-format.md @ 8d1cf6e; forked-on: 2026-11-04; local-changes: kept the test-type list and the worked example; labels mapped to evidence statuses; the context-file mapping replaced by the model nodes each section feeds -->
# Review brief format

The shape of a QA review brief for one story or one feature. The brief helps a reader **think** about the
requirement; it is not a test-case list. Every line carries an evidence status (`confirmed`, `inferred`,
`assumed`, `open`), and **no requirement is invented**: an unstated behaviour is `assumed` or an `open`
question, never a `confirmed` line.

> The worked example below uses generic placeholders (Orders, widgets, a User role, an epic). Use the real
> feature's modules, roles and nouns, read from the profile, never hard-coded.

## The sections (in order)

1. **Understanding**: the requirement in two or three lines, each with its status: what is changing, why, and
   the expected observable behaviour.
2. **Scope**: what is in scope, what is explicitly out of scope, and what is unclear (as an `open` question).
3. **Risks**: the highest-risk areas to break, ordered most risky first; each with a one-line reason.
4. **Questions and gaps**: the numbered `open` questions to resolve with Product, BA or Dev.
5. **Regression impact**: the existing flows or modules to re-check because they share surface with the change.
6. **Test strategy**: which test types apply **and why**, and which do not apply and why. Cover: functional,
   regression, API, UI, integration, permissions, validation, negative, cross-browser, mobile,
   external integration, performance.

End the brief with a **testability verdict** (`testable`, `testable-with-assumptions` or `blocked`).

## Worked example (neutral placeholders)

> Story: "As a User I want to delete an order so the list only shows active orders." Parent: an epic that scopes
> Orders management to the User role. One linked bug references stale list counts.

**Understanding**
- *confirmed (AC):* Deleting an order removes it from the active-orders list.
- *inferred (parent epic):* The action is available to the User role only.
- *assumed (delete semantics not stated):* Delete is a **soft** delete: the order is kept with status
  `cancelled` rather than physically removed.

**Scope**
- In: delete an order from the list; the active list no longer shows it.
- Out (not stated, treat as out): bulk delete; undo or restore. *(open, if the reader expects them)*
- Unclear: whether reports and counts that include orders should exclude a cancelled one. *(open)*

**Risks** (most risky first)
1. Stale list **counts or caches** after a delete: a prior linked bug already hit this area. *(regression)*
2. **Soft vs hard delete** ambiguity: reports and totals behave differently under each. *(data and state)*
3. **Permission bypass**: a non-User role deleting through the API even if the UI hides the control.

**Questions and gaps** (3)
1. Is delete soft or hard? If soft, what status, and does the order still count in reports and totals?
2. What happens on a **failed** delete (partial or timed out): what state, and what does the user see?
3. Which roles may delete: is permission enforced at the API, not just in the UI?

**Regression impact**
- The active-orders **list and its count** (shared with the linked stale-count bug).
- Any **report or total** that aggregates orders.
- The **Orders permission** check shared by create, read and update.

**Test strategy**
- **Functional**: yes, the core delete-then-not-listed behaviour.
- **Negative**: yes, delete a nonexistent or already deleted order; the failed-delete path once defined.
- **Permissions**: yes, each role allowed and denied, at the **API** level, not just the UI.
- **Regression**: yes, the list count and cache, and order totals and reports.
- **API**: yes, the delete endpoint's status codes and the read-back state.
- **Integration**: yes if an external system mirrors order state; confirm whether it does.
- **Validation**: limited; the id is the only field to validate.
- **UI**: yes, the control's presence or absence per role and the list update.
- **Data and state**: yes, the soft-delete status, count consistency, read-after-write.
- **Mobile**: yes if Orders ships a mobile or responsive surface; else not applicable.
- **Cross-browser**: light; a standard list action, smoke on the primary browsers only.
- **Performance**: not applicable; a single-record action on an existing path, no new heavy query.

**Verdict:** `testable-with-assumptions`: the happy path is testable now; the 3 questions gate full coverage.

## What each section feeds in the Feature Model

| Brief section | Model nodes |
|---|---|
| Understanding | the `STORY`, `FR`, `RULE` and `AC` nodes it rests on (no new nodes) |
| Questions and gaps | `Q` nodes with `blocks` links |
| Risks | `RISK` nodes |
| Regression impact | `RISK` nodes with `category: "regression"` |
| Test strategy | the techniques the scenario designer picks for `TS` nodes |
| Verdict | a `FND` node with `category: "readiness"` when the verdict is not `testable` |
