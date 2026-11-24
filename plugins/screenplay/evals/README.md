# screenplay: eval suite

Behavioural evals for the plugin (spec 11.3), run with **`claude plugin eval`**. Each case is a folder with a
`prompt.md` (the user's message) and one grader in `graders/`. A run writes `evals/results/<timestamp>/`, which is
git-ignored. The engine's tests (`engine/test/plugin-evals.test.js`) keep these cases consistent with the skills.

This release has the trigger and guard cases of the three skills. The pipeline case, which runs the whole workflow
on example-desk, arrives with plan 6.

| Case | Tag | Guards |
|---|---|---|
| `trigger-brand-colours` | trigger | a question about an app's brand colours and logos starts brand-profile |
| `trigger-what-module-does` | trigger | "what does the reminders module really do?" starts app-map |
| `trigger-promo-feature` | trigger | "make a promo video of the reminders feature" starts app-film |
| `trigger-walkthrough-module` | trigger | "make a walkthrough of the whole desk" starts app-film |
| `trigger-trailer-module` | trigger | "cut a trailer of this module" starts app-film |
| `trigger-rebuild-screens` | trigger | "rebuild the promo's screens from the code" starts app-film |
| `trigger-build-films` | trigger | "build the films for both brands" starts app-film |
| `guard-code-question` | guard | a question about one function starts no screenplay skill |
| `guard-explainer-page` | guard | explaining a feature as a page starts no screenplay skill |
| `guard-release-notes` | guard | release notes start no screenplay skill |
| `guard-test-cases` | guard | test cases for a screen start no screenplay skill |
| `guard-record-screen` | guard | recording the screen starts no screenplay skill |
| `guard-short-film` | guard | a screenplay for a short film starts no screenplay skill |

## Run it

```bash
cd plugins/screenplay

# every case: read-only tools, so they run anywhere
claude plugin eval . --tag trigger --tag guard --no-publish

# one case, one run, no ablation (cheapest)
claude plugin eval . --case "trigger-what-module-does" --runs 1 --ablation none --no-publish
```

- **`--no-publish`** always: reports hold transcripts; keep them local.
- Pin **`--model`** and **`--judge-model`** so scores do not drift.
