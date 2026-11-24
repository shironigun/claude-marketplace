# Plugin Capabilities (composed — NOT skills)

These three capabilities are **plugin-level tooling**, not `SKILL.md` skills. They
compose the outputs of the frozen skill pipeline and read the org's design system:
the local, git-ignored overlay (`.claude/design-intelligence/` in the project you
run from) first, then the bundled `_shared` knowledge/config it does not override
(bundled values are an illustrative example; see
`../_shared/config/org-design-system.md`). No capability generates UI, issues a compliance verdict, or
invents design values — those remain the authorities of the existing skills.

| Capability | Tool | Composes | Output |
|---|---|---|---|
| Documentation Generation | `documentation/gen_docs.py` | analysis + `implementation_request` + manifest + review (a run record) | evidence-tagged Markdown doc + a run index under `<workspace>/runs/` |
| Knowledge-Base Search | `knowledge-search/kb_search.py` | overlay `knowledge/` + `config/`, then `_shared/knowledge` + `_shared/config` | source file + section + snippet + relevance, or `NO_KNOWLEDGE_FOUND` |
| Impact Analysis | `impact-analysis/impact.py` | overlay + `_shared` + skill knowledge + `<workspace>/runs/*` | DIRECT / INDIRECT / POTENTIAL / UNKNOWN references with citations |

`<workspace>` is the overlay folder: `--workspace DIR`, else
`$DESIGN_INTELLIGENCE_HOME`, else `./.claude/design-intelligence`. Keep it
git-ignored in your project; run records and org values never go into the plugin.

## Documentation Generation

```
python3 capabilities/documentation/gen_docs.py <run-record.json>
python3 capabilities/documentation/gen_docs.py capabilities/documentation/examples/orders-list-mobile.json
```
`<run-record.json>` holds the outputs the pipeline already produced for one screen
(screen, figma_node, platform, components, tokens, typography, states,
accessibility, responsive, design_decisions, assumptions, unresolved, conflicts,
review_findings, corrections, final_verdict). Missing fields render as UNKNOWN.
`documentation/examples/orders-list-mobile.json` is a fictional example record.
The tool also saves the record to `<workspace>/runs/<id>.json` so Impact
Analysis can trace screen/artifact relationships. It does **not** re-run
generation — it only formats existing evidence.

## Knowledge-Base Search

```
python3 capabilities/knowledge-search/kb_search.py "your question"
python3 capabilities/knowledge-search/kb_search.py --json "your question"
```
Deterministic term-overlap search over heading-delimited sections of the overlay's
`knowledge/` + `config/` and the bundled `_shared/knowledge` + `_shared/config`
files they do not override. Heading matches weighted higher.
Returns top matches with evidence; returns `NO_KNOWLEDGE_FOUND` when nothing
clears the threshold. No embeddings/vectors. Never fabricates an answer.

## Impact Analysis

```
python3 capabilities/impact-analysis/impact.py --token "#2F5DA8"
python3 capabilities/impact-analysis/impact.py --component Button
python3 capabilities/impact-analysis/impact.py --rule "8px radius" --json
```
Evidence-only. DIRECT = verbatim reference (file:line). INDIRECT = a file's
consumers (the two skills that read `_shared`). POTENTIAL = known conflict
cluster (the org's from `<workspace>/conflict-aliases.json`; the bundled example is
the three primaries `#2F5DA8`/`#2E5BA6`/`#1D4E89`). Screen/artifact
impact resolves only from indexed run records; with none it reports
`UNKNOWN / INSUFFICIENT INDEX DATA`. Never fabricates a dependency graph.

## Boundary

Capabilities compose; they do not replace or duplicate the skills. Adding a
capability here is the correct way to extend the plugin — creating a new
`SKILL.md` is not, unless a capability genuinely needs its own
input/workflow/output/authority that no skill or tool can provide.
