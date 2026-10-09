# Workshop exercise — runbook

How the hands-on workshop runs. Every QA uses the `qa-engineering` to build an **API + UI
test-automation framework** for one module, from **one shared user story**, then is scored on
**coverage** and **issues found**. This is the runbook for the facilitator and the QAs. The
**story** and the **rubric** are separate deliverables that live beside these docs; this file
points at them and never reproduces their contents.

> **Product-agnostic by rule.** The kit ships clean: no product, org, URL, token, or account is
> committed anywhere in it. The system under test is simply **the target system the QAs point at**.
> The facilitator hands out its address and a test account at the session, and each QA types them
> into their own git-ignored `.env`. Nothing about the target is ever committed.

---

## 1. At a glance

| | |
|---|---|
| **Who** | each QA, individually |
| **Where** | their **own branch**, their **own `.env`**; no shared state between QAs |
| **Module** | the **Customer** module (phase 0 recommends it as the workshop default) |
| **Input** | the shared story, plus the target system's address and a test account |
| **Driver** | the `qa-orchestrator` agent, which runs the `kit-builder` skill phase by phase |
| **Output** | a framework that builds, runs green, and surfaces real issues |
| **Scored on** | (a) coverage of the API + UI surface, (b) issues found, per the rubric |

The kit is the inverse of a tool that decides for you: **it asks at every phase**, always with a
recommended option and the reason. The QA's judgement is part of what is being exercised.

---

## 2. Before the session

**Facilitator checklist**

- [ ] The `qa-engineering` plugin is installed and enabled for every QA; the agent
      `qa-engineering:qa-orchestrator` and the skills `kit-builder` and `scan-and-confirm`
      show up
- [ ] No other plugin is needed — the kit is self-contained; its `author-api-cases`,
      `author-ui-cases`, `file-to-tracker` and `failure-to-bug` skills ship with it
- [ ] Each QA has the **target system's address** and **a dedicated test account** (never a
      personal one), handed over outside the repo
- [ ] The **story** and the **rubric** are distributed (see section 5 and section 7)
- [ ] There is a place for each QA's branch (see below)

**Each QA needs**

- Node 20 or later and git, plus network access to the target system.
- Claude Code (desktop app, VS Code extension, or CLI).
- `ADO_ORG` exported in the **shell that launches Claude Code**, with a browser sign-in available.
  Claude Code does not read `.env` for MCP variables. If ADO sign-in cannot be completed, phase 4
  degrades to local drafts and the QA is still scored on phases 0-3.
- **A branch of their own**, created before phase 0. **Suggested** naming: `exercise/<their-name>`,
  cut from the shared base. The agent will check the branch and recommend one if you are on the
  default branch.
- An empty framework folder on that branch (the folder that will hold `.env`, `flow-map.json`, and
  `package.json`).

---

## 3. Starting

Open Claude Code in the framework folder and give the orchestrator the job, with the story:

```text
Use the qa-orchestrator agent to build a test-automation framework for the Customer module,
brick by brick. Here is the shared story: <paste it, or give its path>.
```

The agent first checks where the build stands and which branch you are on, tells you in two lines,
and asks you to confirm before it starts. Then it runs phase 0.

**Rules of the room**

1. **Answer the questions.** You may say "you decide"; the agent will take its recommendation, say
   that it did, and record it as QA-delegated. Be careful where you delegate: if you hand phase 0's
   flows to the agent, the framework covers what the code *does*, not what the story *intends*, and
   that gap is where coverage is lost.
2. **Type secrets into `.env` yourself.** Never paste a password, token, or key into the chat; the
   agent will tell you which key to fill in.
3. **Your branch, your `.env`.** Never commit `.env`. Never touch another QA's branch.
4. **The target is shared.** Many QAs hit the same system at once. Every test creates its own
   uniquely named data and cleans it up; never delete anything you did not create.
5. **Do not edit the system under test.** Everything you build stays in your framework folder.
6. **The agent never pushes.** You push your own branch at the end (section 6).

---

## 4. The run, phase by phase

| # | Phase | What you will be asked (headline) | Workshop guidance | Checkpoint to show |
|---|---|---|---|---|
| 0 | Scan and confirm | scan target, module, each flow one at a time, hosts, auth, credentials | pick **Customer**; confirm or correct **each flow against the story**; fill `.env` yourself | `flow-map.json` with the module's endpoints and flows |
| 1 | Foundation | scaffold location, hosts, run the auth probe | accept the same-folder scaffold; the probe must be green | `npm run verify:setup` green |
| 2 | Module: API | depth, scope, draft a bug on red | take **all three levels** (contract, endpoint with its negative matrix, workflow) | `npm run test:api` green, plus any bug drafts |
| 3 | Module: UI | cover the UI, which levels | all three (smoke, regression, e2e); skipped, and said so, if `WEB_APP_URL` is blank | `npm run test:ui` green |
| 4 | ADO integration | tracker sign-in, one Test Case per case, file bugs | sign in; approve the list of items before the agent creates anything | each script links to its Test Case, or drafts exist |
| 5 | CI, tools, docs | CI host, trigger, secrets, UI in CI, notifications | follow `docs/ci-and-tools.md`; wire secrets by name only | pipeline YAML parses and the secret scan returns 0 |

Between phases the agent reports what it built and what it verified, and **waits for your go**.
A red check is a stop: it is fixed or consciously accepted, not skipped.

**If time runs short, stop after phase 2.** The spine (phases 0-2) always runs and is enough for a
real score on API coverage and issues. Phases 3-5 degrade or skip cleanly and never invalidate what
already landed. Commit a checkpoint at the end of each phase you finish; the agent offers one and
commits only when you agree.

---

## 5. The shared story

Everyone works from the **same user story** for the Customer module, with acceptance criteria that
span the API (contract, endpoint, workflow) and the UI (smoke, regression, e2e). It is a separate
deliverable, distributed by the facilitator and kept beside these docs. **This runbook does not
restate it.**

How it is used:

- **Phase 0** is where the story matters most. Treat it as the statement of *intended* behaviour:
  confirm each flow the agent proposes against it, and correct the agent where the code and the
  story disagree. The agent records your version and notes the disagreement.
- **Phases 2-3** turn the story's acceptance criteria and your confirmed flows into test cases.
- Keep the story **out of the framework repo** unless the facilitator says otherwise; it is an input,
  not a deliverable.

---

## 6. Scoring: coverage and issues found

The **rubric** is the authority on weights and points. This section explains what each dimension
measures and how to produce the evidence; it adds no dimensions of its own.

### 6.1 Coverage

How much of the module's **API surface** and **UI surface** your framework actually exercises,
measured against the module's reference surface that the facilitator holds with the rubric.

| Surface | Levels | What good looks like |
|---|---|---|
| API | contract, endpoint, workflow | every in-scope endpoint has a contract test, a happy path, and its **negative matrix** (one exact status code per assertion); every confirmed flow has a workflow test |
| UI | smoke, regression, e2e | the same flows are covered through the screen: the screen loads and its core action works, each feature behaves, and one journey crosses modules |

**Produce the evidence** (commands run from the framework root):

```bash
npm run test:api -- --list      # every API test, grouped by project (the level)
npm run test:ui  -- --list      # every UI test
npm run test:api                # a green run
npm run report:summarize        # writes reports/summary.json, with per-level counts
```

Show `flow-map.json` (the surface you confirmed) next to those lists so the match between the two is
visible. Each test should carry the module tag and its level, so coverage can be counted by tag.

### 6.2 Issues found

Whether your framework surfaces **real** defects in the target system. The rubric gives credit for
confirmed, previously known defects and for new real ones, and **penalises false positives**.

A **real** issue is the target system behaving differently from the story, with a test that proves it. A
**false positive** is a failing test that is wrong: it asserts something the story does not say, or
loosens or tightens an assertion until it fails for the wrong reason.

**Triage every red test before you call it a bug:**

1. **Re-run it twice.** A test that fails once and passes once is flaky, not a defect.
2. **Check it against the story and your confirmed flow**, not against what the code currently
   does. The story is the oracle.
3. **Reproduce it outside the framework** (a direct call, or in the browser, e.g. through the
   Playwright MCP).
4. **If the target system is wrong:** mark the test with `knownBug(id, summary)` on the line **immediately
   before** the assertion it explains (placement rule in `docs/script-generation.md`), so the suite
   stays green while the defect stays visible, and draft the bug with `failure-to-bug`.
5. **If the test is wrong:** fix the test.
6. **Never widen an assertion to make red go away.** An assertion that accepts several status codes
   passes whichever one the API returns, and has stopped testing anything.

**Produce the evidence**, per issue: the failing test (file and title), the drafted bug with exact
steps and expected versus actual, and the line of the story it contradicts. If the ADO MCP is
signed in, the filed work item id as well.

Anything else the kit builds, such as ADO traceability or the CI pipeline, is good evidence of the
later phases. Whether it is scored is the rubric's call.

---

## 7. Handing in

1. Run the secret scan over the whole tree and confirm it returns **0**; confirm `.env` is not
   tracked.
2. Commit your last checkpoint. The agent does not push; **push your own branch** when you are done.
3. Write the branch so it can be run from a **clean checkout with someone else's `.env`**: `npm ci`,
   fill a `.env` shaped like `.env.example`, `npm run verify:setup`, `npm run test:api`. Nothing may
   depend on a value only on your machine.

---

## 8. When something is stuck

| Symptom | Likely cause and fix |
|---|---|
| The agent is not listed | the plugin is not enabled; enable it and restart the session |
| `verify:setup` is red | the first thing to check is `.env`: the right URL, a login that returns a token, the token field name. Fix it before anything else |
| ADO calls fail or are skipped | `ADO_ORG` was not set in the shell that launched Claude Code, or sign-in is incomplete; set it, restart, sign in, or carry on with drafts |
| An MCP server will not start on macOS or Linux | the plugin's MCP config ships Windows `cmd /c npx` commands; use `npx` directly as the command, with the same arguments |
| `.env` shows in `git status` | it must not; check the root `.gitignore`, and unstage it before any commit |
| A test passes alone but fails with others | shared data between tests; give each test its own uniquely named data |
| You cannot tell a bug from a bad test | go back to the triage list in section 6.2, step 1 |

---

## Done when

- [ ] You are on your own branch with your own `.env`, untracked
- [ ] Phase 0 confirmed the Customer module's flows against the shared story
- [ ] The framework builds, `verify:setup` is green, and the API suite runs green (phases 0-2 at minimum)
- [ ] Every issue you report passed triage and has its evidence
- [ ] The secret scan returned 0, and you pushed your branch yourself
