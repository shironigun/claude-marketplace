# Knowledge Base conventions

How every file in this folder is written, so the KB stays consistent and machine-readable. Full standard:
`knowledge/standards/knowledge-base.md`.

## Slugs
- One kebab-case slug per module: `modules/<slug>.md` pairs with `atlas/<slug>.md`.
- **Never merge two modules because they share a word** (orders vs order-templates, customers vs
  customer-groups). Keep them separate slugs; the keyword pack is what prevents the confusion.

## Evidence-tag grammar (never invent)
- **Code wins** for technical facts: method, path, DTO field, status code, exact message, auth attribute.
- **Docs/help pages are cited vocabulary**, not code truth; use them for module names and flow wording.
- If a fact is not in the code (or a cited doc), mark it: `[UNCLEAR: ...]`, `[ASSUMED: ...]`,
  `[TODO: confirm ...]`. A confident wrong fact poisons every analysis that reads it.
- Prefer exact strings copied from code (labels, toasts, validation messages, routes, methods).
- **No em or en dashes** in prose. Use comma, colon, hyphen, or parentheses. (Arrows `→` / `↔` and the
  hyphen `-` separator in the RULES format are structural tokens, not prose dashes, so they are fine.)

## Frontend / backend separation
- FE and BE path globs are **always separate** (`frontend_path_*` vs `backend_path_*`), never one mixed list,
  so scoped work can prefer UI files for a UI story and controllers for an API story.
- A screen's API calls connect to their handlers **only** through the atlas FE↔BE link table.
- **Desktop product?** The same rule holds with the **UI-layer / logic-layer** glob pair
  (`ui_layer_path_*` vs `logic_layer_path_*`) in place of `frontend_*`/`backend_*`, and the link table runs
  **screen → code-behind/handler → service**. `knowledge/standards/knowledge-base.md` (the desktop atlas
  variant) is authoritative where it and this file differ.

## Depth legend (lazy generation)
| Depth | Means |
|---|---|
| `absent` | no entry for this module yet |
| `stub` | `modules/<slug>.md` skeleton only: Purpose + Route + keyword-pack placeholder (written on first `/qa`) |
| `deep` | full module brief + trimmed atlas + RULES patch, coverage-self-audited (written by `kb-builder` on demand) |

Depth is tracked on `catalog.modules[].kb` in `qa-context.json`; the files here are the source of truth.

## Variants
Where behaviour changes by the product's variant axis (account type / role / tier; see
`knowledge/standards/variants-and-user-types.md`), record it in the module's `Variants` section and as a
variant `RULES` anchor, **citing the `file:line` branch**. A module with no branch is variant-agnostic; say so.
