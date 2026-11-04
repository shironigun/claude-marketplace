# feature-intelligence: eval suite

Behavioural evals for the plugin (spec 10.3), run with **`claude plugin eval`**. Each case is a folder with a
`prompt.md` (the user's message) and one or more `graders/*.md`. A run writes `evals/results/<timestamp>/`, which
is git-ignored. The engine's own tests (`node --test` over `skills/feature-intelligence/engine/test`) check that
these cases stay consistent with the fixture.

## What it guards

| Case | Tag | Guards |
|---|---|---|
| `trigger-analyze-epic` | trigger | "analyze epic 4100 for my team" starts the skill |
| `trigger-idea-to-stories` | trigger | "break this idea into stories" starts the skill |
| `guard-quick-explainer` | guard | a quick one-page explainer does not start it |
| `guard-test-cases` | guard | a request for test cases does not start it |
| `fixture-new-feature` | pipeline | on the CSV importer fixture: coverage of at least 95% with every gap listed; at least 16 of the 17 planted faults found with quotes; every assumption badged; no other plugin's skill used |
| `fixture-formats` | pipeline | the FRD as Markdown, Word and PDF reaches coverage within 2 percentage points |

## Run it

```bash
cd plugins/feature-intelligence

# the trigger and guard cases: read-only tools, run anywhere
claude plugin eval . --tag trigger --tag guard --no-publish

# one case, one run, no ablation (cheapest)
claude plugin eval . --case "trigger-analyze-epic" --runs 1 --ablation none --no-publish

# the pipeline cases: long and costly; they need Bash, so run them on Linux or WSL2
claude plugin eval . --tag pipeline --runs 1 --ablation none --no-publish --max-cost-usd 40
```

- **`--no-publish`** always: reports hold transcripts; keep them local.
- Pin **`--model`** and **`--judge-model`** so scores do not drift.
- The **pipeline** cases grant `Bash` (to run the `fi` engine) and `Agent` (for the subagents). Cases that grant
  `Bash` need a sandbox: Linux or WSL2 with `bubblewrap` and `socat`. If the harness names the subagent tool
  differently in your version, change `allowed_tools` in the two pipeline prompts; without it, the skill does
  the subagents' work itself, more slowly.
- `fixture-formats` reads `frd.pdf` page by page with the Read tool, which needs poppler (`pdftoppm`).
- After editing `frd.md`, run `node skills/feature-intelligence/engine/tools/make-fixture.js` to regenerate
  `frd.docx` and `frd.pdf`; the engine tests fail until you do.
