# Business Rules

One rule per `## anchor-slug` (the heading is the anchor, stable forever so module flows and test cases can
link to it). Format: `**Title** (see [Module](modules/<slug>.md)) - Condition → Result`, with the exact
message/status when known. Grouped by module, a blank line between groups. Cover auth, validation, variant,
permission, money/credit, and destructive-action rules (the high-value negatives).

Each rule is the unit a test case traces to (`cases.items[].tracesRule` → the anchor), so KB-rule coverage is
visible end to end: rule → case → script → defect.

---

## Example (generic; replace with your product's rules)

## ex-name-required
**Widget name required** (see [Example](modules/example.md)) - Save a widget with an empty name → the form
shows "Name is required" and no widget is created.

## ex-quantity-range
**Quantity within range** (see [Example](modules/example.md)) - Quantity must be 1 to 9999 → outside the
range the API returns 400 "Quantity must be between 1 and 9999".

## ex-delete-soft
**Delete is soft** (see [Example](modules/example.md)) - Deleting a widget sets status to `archived`; it still
appears in an unfiltered list with that status (not a row delete).
