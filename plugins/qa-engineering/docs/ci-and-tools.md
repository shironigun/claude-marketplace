# CI, local tools, and docs — phase 5

How `kit-builder` runs **phase 5** (`${CLAUDE_PLUGIN_ROOT}/docs/phases.md`): put the finished suite on a **schedule**,
make a **red run loud and legible**, give the team the **local tools** that keep the suite cheap to
run, and leave a **README / runbook** the next person can use. There is no generic skill for this,
so the kit owns it (decision D11): two ready pipelines in `template/pipelines/`, one local tool, and
this guide. Everything is written product-neutrally.

> **Product-agnostic by rule.** No product, org, URL, token, or account appears here or in any file
> this phase writes. Every value a pipeline needs comes from the QA's git-ignored `.env` (locally)
> or from a **variable group / repo secrets** (in CI), never from source. The pipeline files carry
> variable *names* only.

**Producer → consumer.** Consumes the whole workspace (phases 0-4) and the QA's chosen CI host.
Produces a registered pipeline with a schedule, secrets wired from a store, a tuned
`resources/impact-map.json`, and a filled-in `docs/RUNBOOK.md`.

---

## 1. What phase 5 ships

| File | What it is | You change |
|---|---|---|
| `pipelines/azure-pipelines.automation.yml` | Azure DevOps pipeline: scheduled, red on failure, publishes always | cron, branch, variable-group name, env block |
| `pipelines/github-actions.automation.yml` | GitHub Actions equivalent | cron, secrets, env block; move it under `.github/workflows/` |
| `pipelines/run-impacted.ts` + `resources/impact-map.json` | Local tool: changed files to the tags that cover them | the map's rows |
| `scripts/summarize.ts`, `scripts/notify.ts`, `config/notify.config.ts` | Results to a one-screen summary, then to Teams or Slack | nothing; set the channel and webhook |
| `docs/RUNBOOK.md` | Operational notes: environments, accounts, red-run checklist, quirks, CI | fill every `_fill in_` |

Ship **one** CI file, the one that matches the repo's host. Delete or ignore the other.

---

## 2. Choosing the CI host and registering it

**Recommended: match the repo's host.** Azure Repos or Azure DevOps Pipelines → the Azure file;
a GitHub repo → the GitHub file. The reason: each host runs only its own YAML natively, and a
cross-host setup adds a connection to maintain for no gain.

**Register it as a new, standalone pipeline.** Never edit the product's existing build or deploy
pipelines. The reason is two-way: the automation suite must be able to go red without blocking a
deploy, and a deploy must be able to change without breaking the suite.

- **Azure DevOps:** Pipelines, New pipeline, existing YAML file, pick
  `pipelines/azure-pipelines.automation.yml`. If the framework sits in a subfolder of a bigger repo,
  set the `workingDir` variable to that subfolder (the folder holding `package.json`).
- **GitHub Actions:** GitHub only reads workflows from `.github/workflows/` at the **repo root**.
  Move the file to `.github/workflows/automation.yml`. If the framework is nested, set
  `defaults.run.working-directory` and the artifact paths to that subfolder.

---

## 3. The three properties of the pipeline

The shipped YAML is built around three properties. Keep all three when you edit it.

### 3.1 Scheduled, and manual first

Both files start with `trigger: none` (Azure) or a manual dispatch (GitHub) plus a **schedule**.
The default is **06:00 UTC on weekdays**: overnight for the Americas, so results are waiting when the
team starts. Edit the cron for your timezone (`0 6 * * *` includes weekends). Add path triggers only
after the suite has proven stable, because a new suite earns its triggers.

| Host | Where | Detail |
|---|---|---|
| Azure | `schedules:` block | `always: true`, so it runs even when the repo has not changed (the environment under test can change without a commit). `branches.include` must name the branch that holds the file. |
| GitHub | `on.schedule` | Runs from the **default branch** only. In a public repo, GitHub disables scheduled workflows after about 60 days with no repo activity. |

> **Azure gotcha:** a schedule set in the pipeline's web **settings UI overrides** a schedule in the
> YAML. If you have ever set one there and the YAML schedule never fires, remove the UI schedule.

### 3.2 Red on failure

A suite that cannot go red is decoration. The pipeline must fail when tests fail **and** when the run
crashes before producing any results.

| Host | How red happens |
|---|---|
| Azure | The test step uses `continueOnError: true` (so the publish steps still run). `PublishTestResults@2` then sets `failTaskOnFailedTests: true` (red on failed tests) and `failTaskOnMissingResultsFile: true` (red when a crash left no `junit.xml`). |
| GitHub | The test step fails the job on any failed test. No `continue-on-error`. |

**Why not `|| true`?** It swallows the exit code, so an out-of-memory kill, a missing env var, or a
wrong working directory looks like a pass. `continueOnError` marks only that step and leaves the
decision to the results publisher, which can tell "tests failed" from "nothing ran".

### 3.3 Publish on success or failure, not on cancel

Reports matter most when the run is red. The publish and notify steps run after a pass **or** a
fail, but not after a manual cancel:

- **Azure:** `condition: succeededOrFailed()` on the publish and notify steps.
- **GitHub:** `if: success() || failure()` on the same steps.

**Why not `always()`?** It also runs after a cancel, which can hang a cancelled run trying to upload
from a half-written folder. `succeededOrFailed()` is the same intent without that trap.

---

## 4. The steps, in order

| # | Step | Why it is there |
|---|---|---|
| 1 | Checkout, **depth 2** | depth 2 lets `npm run impacted` diff `HEAD~1`; depth 1 would make the diff empty |
| 2 | Node 20 | matches `engines.node` and `.nvmrc` |
| 3 | `npm ci` | reproducible install from the committed `package-lock.json` (commit the lockfile or this step fails) |
| 4 | Install Chromium | the `auth-setup` project and any UI project need it; **drop this step for a strictly API-only suite** |
| 5 | `npm run verify:setup` | fail fast and legibly if the environment is unreachable, instead of 300 identical 401s later |
| 6 | Run the API projects | `--project=contracts --project=endpoints --project=workflows` |
| 7 | Publish JUnit results | the pipeline's pass/fail record and test tab |
| 8 | Publish the HTML report | the artifact a human opens to see traces (`playwright-report`) |
| 9 | `report:summarize` then `notify` | one-screen summary to chat; `continueOnError`, so a broken notification never turns a green build red |

`retries: 2` on CI (set in `playwright.config.ts`) makes a flaky test distinguishable from a broken
one: it passes on retry and shows as flaky, rather than red.

### Adding the UI suite

The shipped run step covers the API projects. When phase 3 produced a green UI suite, add the three
UI projects to the run command (`--project=ui-smoke --project=ui-regression --project=ui-e2e`) and
add the UI keys to the env block (`WEB_APP_URL`, `WEB_APP_LOGIN_URL`, `WEB_APP_POST_LOGIN_HEADING`).
**Recommended:** run them in the same job at first; split into a second job once you want API and UI
failures reported separately.

---

## 5. Where each value comes from

One rule: **a value the suite reads locally from `.env` must be supplied to CI by name**, because the
git-ignored `.env` does not exist on the agent. The pipeline's `env:` blocks are the bridge.

| Key | Local source | Azure source | GitHub source | Secret? |
|---|---|---|---|---|
| `API_BASE_URL` (and any `<SERVICE>_API_BASE_URL`) | `.env` | variable group `automation-qa` | repo secret | treat as secret (hides internal hosts) |
| `AUTH_BASE_URL` | `.env` | variable group | repo secret | treat as secret |
| `AUTH_USERNAME` | `.env` | variable group | repo secret | treat as secret |
| `AUTH_PASSWORD` | `.env` | variable group, **marked secret** | repo secret | **yes** |
| `AUTH_TENANT_ID` | `.env` | variable group | repo secret | no, but keep with the rest |
| `CROSS_TENANT_ID` | `.env` (optional) | variable group | repo secret | no |
| `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_STATIC_TOKEN`, `DEFAULT_HEADERS` | `.env` (strategy-dependent) | variable group, **secret** | repo secret | **yes** |
| `NOTIFY_WEBHOOK_URL` | `.env` | variable group, **secret** | repo secret | **yes** (a webhook URL is a credential) |
| `WEB_APP_URL`, `WEB_APP_LOGIN_URL`, `WEB_APP_POST_LOGIN_HEADING` | `.env` | variable group | repo secret | no |
| `AUTOMATION_PROFILE`, `CI`, `AUTOMATION_ENV`, `NOTIFY_CHANNEL`, `NOTIFY_WHEN` | defaults | set in the YAML | set in the YAML | no (not sensitive, safe in source) |
| `REPORT_URL` | n/a | built from `System.CollectionUri`, `System.TeamProject`, `Build.BuildId` | built from `github.server_url`, `github.repository`, `github.run_id` | no |

**The checklist that prevents the most common CI-only failure** (do it once, at phase 5):

1. List the key **names** in the QA's `.env` (not the values).
2. Make sure every key the suite needs appears in the pipeline's `env:` block for **both**
   `verify:setup` and the test step. The shipped blocks list only the default keys; a second host,
   a client-credentials strategy, or a default header needs its keys added.
3. Create each as a variable in the group (Azure) or secret (GitHub), with the secret ones marked.
4. Compare the CI env block with the local `.env` one more time before the first run.

**Azure specifics that bite:**

- **Secret variables are not exposed to scripts automatically.** They must be mapped through `env:`,
  which the shipped YAML does. Non-secret group variables are exposed by name, and the mapping is
  then redundant but harmless.
- **An undefined `$(NAME)` is passed through as the literal text `$(NAME)`**, not as an empty
  string. A mapped key that is missing from the group (commonly the optional `CROSS_TENANT_ID`)
  reaches the suite as that literal. Either define it in the group (an empty value is fine) or delete
  the line.
- **Authorize the group on first run.** Azure pauses the first run with "needs permission to access
  a resource"; approve it once.
- Create the group named in the YAML (`automation-qa`) under Pipelines, Library, or change the name
  in the file. Optionally link it to a key vault so secrets are never typed into the UI.

---

## 6. Local tools

### 6.1 `impacted` / `test:impacted` (ships)

Running the whole suite on every commit is how a suite becomes something people skip. `impacted`
maps the diff to the tags it can affect and runs only those. It is a **local and path-trigger** tool;
the shipped schedule still runs everything.

```bash
npm run impacted          # prints just the grep expression, e.g.  @orders|@smoke
npm run test:impacted     # runs the API projects filtered by that expression
```

How it decides, from `resources/impact-map.json`:

| Key | Meaning |
|---|---|
| `pathMap` | a source path **prefix** → the tags that cover it |
| `contractSources` | paths whose change cascades through type → schema → contract → endpoint → workflow (reported on stderr) |
| `smokeTag` | the fallback when nothing matches (never "everything", never "nothing") |

Inputs, in order of preference: `CHANGED_FILES` (a list handed in by CI; the most reliable on a
shallow clone), else `git diff --name-only <base>...HEAD` with `IMPACT_BASE_REF` (default `HEAD~1`),
else the working-tree diff. It asks git for the repo root, so it works whether the framework **is**
the repo or sits in a subfolder of a bigger one.

**Phase 5 task: replace the example rows.** The shipped map has placeholder rows. Add one per
module: `modules/<module>` → `@<module>`, plus `common` → `@smoke`. If the framework sits beside the
code under test, add that code's source prefixes too, so a change there selects the module that
covers it. **Keep the map honest:** an unmapped path silently falls back to `smokeTag`, which hides
coverage rather than reporting a gap.

To use it in CI, switch the run step's command to `npm run test:impacted` once you add path
triggers (the YAML carries a comment at that step). Keep the **scheduled** run on the full suite.

### 6.2 `report:summarize` and `notify` (ship)

`npm run report:summarize` turns Playwright's `reports/results.json` into
`reports/summary.json`: totals, failures, and a per-project breakdown (`levels`: contracts,
endpoints, workflows, ui-*). `npm run notify` posts that to Teams or Slack.

- Choose the channel with `NOTIFY_CHANNEL` (`teams`, `slack`, `none`); `NOTIFY_WHEN` is `always` or
  `failures-only`.
- With **no webhook set**, it writes `reports/notification.json` instead of posting. A broken
  notification never fails the build.
- The failure list is size-capped (`NOTIFY_MAX_FAILURES`, default 10) because chat webhooks reject
  large bodies; it links out to the full report.

### 6.3 Not shipped (patterns you can add once the suite is trusted)

The reference pipeline the kit was derived from also had a **blame** step (map a red test's tag back
to the recent commits that touched its source paths, using the impact map in reverse) and a
**cross-profile flakiness** report. The template does not ship them. Add them only after the suite is
stable; do not add tooling to an unproven suite.

---

## 7. Documentation to leave behind

Fill in `docs/RUNBOOK.md` (the template ships it with `_fill in_` markers) from what the build
established. This is what the next person reads when the suite is red.

| Section | Fill from |
|---|---|
| Environments | the profiles in `config/profiles.index.ts`: name, purpose, who owns the environment |
| Test accounts | role and tenant of each account, and **where the password lives** (variable group name, password manager). **Never the password itself.** |
| Data hygiene | the `AUTOMATION_` prefix convention, and how orphans are swept |
| Known API quirks | every product surprise found in phases 2-3 (the `knownBug` markers are the seed) |
| CI | the pipeline path, the variable-group or secret names, the schedule, the report artifact name (`playwright-report`) |

Update the workspace `README.md` for anything module-specific. Do not paste values, URLs, or org
names into either file; refer to the `.env` key or the secret store by name.

---

## 8. The phase 5 procedure

`kit-builder` runs the usual loop (state, ask + recommend, act, verify, report). The questions, with
the recommended option and its reason:

1. **CI platform.** "Wire up Azure DevOps Pipelines or GitHub Actions?" **Recommended: match the
   repo's host** (section 2).
2. **Trigger.** "Start manual plus scheduled, and add path triggers once trusted?" **Recommended:
   yes**: a new suite earns its path triggers after it is proven stable.
3. **Secrets.** "Take secrets from a variable group or repo secrets, never inline?" **Recommended:
   yes**: inline secrets fail the secret scan and leak into history.
4. **UI in CI.** (Only if phase 3 produced a UI suite.) "Run the UI projects in this pipeline?"
   **Recommended: yes, in the same job first** (section 4).
5. **Notifications.** "Post a summary to Teams or Slack?" **Recommended: yes, with a webhook from the
   secret store**; with none set, the summary lands in `reports/notification.json`, which is harmless.

**Act:** copy the right pipeline file; apply section 5's checklist to its `env:` blocks; tune
`resources/impact-map.json`; fill in `docs/RUNBOOK.md`.

**Verify** (report real results):

| Check | How |
|---|---|
| The YAML parses | load it with any YAML parser, e.g. `node -e "require('yaml').parse(require('fs').readFileSync('<file>','utf8'))"` (install `yaml` in a scratch folder), or the host's own validator (Azure: the pipeline editor's Validate) |
| The schedule is set | `schedules:` (Azure) or `on.schedule` (GitHub) is present with a cron you chose |
| No inline secrets | every credential is a `$(NAME)` / `${{ secrets.NAME }}` reference; the secret scan returns **0** |
| It goes red when it should | break one test on purpose, run the pipeline, and confirm it ends **red** and still **publishes** the report and results; then revert |
| It goes green when it should | run it on the unbroken suite and confirm a green run with results published |
| The local tool selects | change a file under a mapped module, run `npm run impacted`, and confirm it prints that module's tag rather than the smoke fallback |

**Produces:** a registered, scheduled pipeline with secrets from a store, a tuned impact map, and a
filled-in runbook.

---

## 9. When the pipeline misbehaves

| Symptom | Likely cause |
|---|---|
| Green, but tests failed | `failTaskOnFailedTests` was removed, or a suffix that swallows the exit code (the `or true` idiom) was added to the test command |
| Red with 401s in CI, green locally | a key present in `.env` is missing from the `env:` block, or an undefined `$(NAME)` passed through as literal text |
| `npm ci` fails | `package-lock.json` is not committed |
| Scheduled run never fires | Azure: a UI-defined schedule overrides the YAML, or `branches.include` names the wrong branch. GitHub: the file is not on the default branch, or the repo went quiet and the schedule was disabled |
| `impacted` always prints the smoke tag | shallow clone at depth 1 (use 2 or pass `CHANGED_FILES`), or the changed paths are not in `pathMap` |
| No chat message arrives | no webhook is set (it wrote `reports/notification.json` instead), or the webhook URL was not mapped into the notify step's `env:` |
| Publish step fails after a verify failure | expected: there were no reports to publish; fix the verify failure first |

---

## Done when

- [ ] One CI file is registered as a **new** pipeline (Azure) or placed under `.github/workflows/` (GitHub)
- [ ] The schedule is set, and the first run was started manually
- [ ] Every credential comes from a variable group or repo secrets; the pipeline carries names only
- [ ] The `env:` blocks cover every key the suite reads locally
- [ ] Break-one-test proved the pipeline is red **and** publishes; the unbroken suite is green
- [ ] `resources/impact-map.json` has the module's real rows
- [ ] `docs/RUNBOOK.md` is filled in with no values, URLs, or org names
- [ ] The secret scan returned 0
