# Mini CRM fixture

A tiny, product-neutral React + MUI app used to test design-studio. It is never built or run; the
engine reads it statically. Planted problems (tests depend on them, so change them only with the
tests):

- StatusChip is defined twice (`settings/`, `deals/`); `deals/StatusChip.tsx` says it was copied.
- `messenger/Inbox.tsx` and `messenger-v2/Inbox.tsx` are identical.
- `HEADER_CELL_SX` is the same style block in three files.
- Three separate status-to-colour maps (`LeadRow`, `settings/StatusChip`, `deals/StatusChip`).
- `deals/DealsPanel.tsx` imports from inside the `settings` module.
- `common/components/unused-card.tsx` has no consumers.
- Off-scale and raw values: `p: 0.6`, `padding: 5`, `fontSize: 11.5`, `#fff`, an unlabelled icon button,
  a placeholder-only text field.
