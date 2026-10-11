# Example
**Purpose:** Manage widgets (list/search, add/edit, view detail, archive). Replace this whole file with a real
module; this is the shipped format demonstration.
**Slug:** example   **Do not confuse with:** example-templates (reusable widget templates, a different module)
**Atlas:** [atlas/example.md](../atlas/example.md)

> Route(s): /widgets
> Touches: Another Module (illustrative; a widget can attach to a deal). Link to the real related module's doc when present.
> Key rules: [ex-name-required](../RULES.md#ex-name-required) · [ex-quantity-range](../RULES.md#ex-quantity-range) · [ex-delete-soft](../RULES.md#ex-delete-soft)

## Keyword pack (disambiguation)
### Exclusive (resolve ONLY here)
widget detail, add widget, archive widget, widget quantity
### Shared / ambiguous (never resolve a module alone)
widget, item, list
### Reject (if the query is dominated by these, it belongs elsewhere)
widget template, reusable template (→ example-templates)
### Negative examples
- "create a widget template" → example-templates (NOT example)
- "archive a widget" → example

## Flows
### Flow: Add a widget
- **Trigger:** Click "+ New" on /widgets.
- **Steps:** 1 open the drawer form → 2 enter name + quantity → 3 Save.
- **Rules:** [ex-name-required](../RULES.md#ex-name-required) · [ex-quantity-range](../RULES.md#ex-quantity-range)
- **Breaks:** empty name → "Name is required"; quantity out of range → "Quantity must be between 1 and 9999"; save fails → "Unable to save widget".
- **UI anchors:** button "New", textbox "Name", spinbutton "Quantity", button "Save".
- **API behind it:** POST /api/widgets (name, quantity) → 201 {id}.
- **Negative / edge:** empty name; quantity 0 / 10000; duplicate name.

### Flow: Archive a widget
- **Trigger:** Open a widget's detail → "Archive".
- **Steps:** 1 open detail → 2 Archive → 3 confirm.
- **Rules:** [ex-delete-soft](../RULES.md#ex-delete-soft)
- **Breaks:** archive fails → "Unable to archive widget".
- **UI anchors:** button "Archive", button "Confirm".
- **API behind it:** DELETE /api/widgets/{id} → 204 (soft: status becomes `archived`).
- **Negative / edge:** archive an already-archived widget.

## States
- Widget: Draft → Active → Archived (archive is reversible via Restore).

## Variants
- `[ASSUMED]` This example module is variant-agnostic. In a real module, list each flow/rule that changes by
  the variant axis here, citing the `file:line` branch (see `knowledge/standards/variants-and-user-types.md`).

## Gaps
- `[UNCLEAR: whether a widget name must be unique per account; no validator seen in the example.]`
