# Knowledge Base

The product's features, written as testable knowledge. This folder is **your team's** durable map of what the
product does, and it is **committable** (unlike `.env`, `qa-context.json` and `house-profile.json`, which stay
git-ignored). The QA engineering plugin generates and reads it; it grounds story and module analysis so test
output is anchored in documented behaviour instead of re-derived from raw code every time.

> Format and rules: `knowledge/standards/knowledge-base.md` in the plugin. This README + the example files
> below are the shipped scaffold; the plugin fills them in for your product.

## Layout
```
knowledge-base/
├── README.md         this index
├── CONVENTIONS.md    slug rules, evidence-tag grammar, FE/BE separation, the depth legend
├── RULES.md          one anchored, testable rule per heading (the case backbone)
├── modules/<slug>.md behavior brief per module (product + QA view)
└── atlas/<slug>.md   thin code map per module (FE/BE globs + FE↔BE link table)
```

## How it is built (frontend-first, lazy)
- **Modules are what users see.** They are discovered from the app's route table / nav (not backend
  controllers); each screen's API calls are resolved into backend handlers.
- **First `/qa`** scaffolds this folder and writes a thin **stub** per discovered module (fast breadth).
- **A module is deepened** (`kb-builder`) when you are about to analyze, build, or test it (depth on demand).

## Which engine reads which file first
| Engine | Reads |
|---|---|
| `story-intelligence` / `code-intelligence` | `modules/<slug>.md` + its `RULES.md` anchors, to ground analysis |
| `author-api-cases` / `author-ui-cases` | `RULES.md` anchors; each rule seeds at least one case (`tracesRule`) |
| `automation-engine` / `kit-builder` | `atlas/<slug>.md` globs + link table, to scope which files back a feature |

## Example files
`modules/example.md` and `atlas/example.md` show the full format on a generic module. Replace them with your
real modules (keep or delete the examples).
