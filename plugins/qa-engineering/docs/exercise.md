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

Everyone starts with **one command — `/qa`** — which sets you up, reads your codebase, shows your
modules, and guides the first steps. What you do next depends on the product you test, so the
workshop runs in **three tracks**. Pick the one that matches your product:

| Track | For | What you do | Scored on |
|---|---|---|---|
| **A · Build** | a **web / API** product you can automate | the full brick-by-brick build (phases 0-5 in section 4): a Playwright framework for the **Customer** module, from the shared story | coverage (API + UI) + issues found |
| **B · Analyze & author** | **any** product — and the gentlest start if automation is new to you | `/qa` → analyze the shared story → author + review test cases → (preview) publish to ADO; run `/learn` alongside to pick up automation | case coverage + issues/gaps raised |
| **C · Manual / desktop** | a **legacy or desktop** app (VB.NET, Delphi, WinForms/WPF) you can't automate | the **manual track** — analyze → knowledge base → author **manual** cases → publish to ADO → test by hand → file bugs (no Playwright) | case coverage + issues found |

Most of the room (the manual-QA majority) will be on **Track B or C**: you get the whole QA
discipline — story analysis, a feature knowledge base, house-style cases, gated ADO writes, bug
filing — **without writing Playwright**. **Track A** is for QAs who want the automation build. The
plugin confirms your **product kind** on the first `/qa` and routes you to the right track; you don't
choose it blind.

| | |
|---|---|
| **Who** | each QA, individually |
| **Where** | their **own branch**, their **own `.env`** (Tracks A/B); no shared state between QAs |
| **Entry** | **`/qa`** (the front door). Shortcuts: `/analyze`, `/test`, `/build`, `/run`, `/status`, `/learn`, `/learn-extension`, `/resume` |
| **Input** | the shared story; for Tracks A/B also the target system's address + a test account |
| **Output** | Track A: a framework that builds + runs green + surfaces issues · Tracks B/C: reviewed cases (+ ADO), a knowledge base, and real issues raised |

The kit is the inverse of a tool that decides for you: **it asks at every step**, always with a
recommended option and the reason. Your judgement is part of what is being exercised.

---

## 2. Before the session

**Facilitator checklist**

- [ ] The `qa-engineering` plugin is installed + enabled for every QA on a **current, mods-capable**
      Claude Code; `claude plugin list` shows it **✔ loaded** and the **`/qa-engineering:qa` command**
      + the `qa-orchestrator` agent appear (do this per-attendee — an older engine fails to load the
      whole plugin)
- [ ] No other plugin is needed — the kit is self-contained; its `author-api-cases`,
      `author-ui-cases`, `file-to-tracker` and `failure-to-bug` skills ship with it
- [ ] Each QA has the **target system's address** and **a dedicated test account** (never a
      personal one), handed over outside the repo
- [ ] The **story** and the **rubric** are distributed (see section 5 and section 7)
- [ ] There is a place for each QA's branch (see below)

**Each QA needs**

- A **current, mods-capable Claude Code** (desktop app or a current CLI). On an older engine the
  plugin won't load at all — confirm `claude --version` and that **`/qa` appears** before the session.
- Node 20 or later and git. For Tracks A/B, network access to the target system; for **Track C** you
  only need the app's **codebase** (read-only) + Azure DevOps — no target URL, auth, or `.env`.
- **Azure DevOps**, for the two gated write steps (publish cases / file bugs): set **`ADO_ORG`** — in
  the **desktop app**, via the environment dropdown → **Local** → gear → add `ADO_ORG`, then restart;
  in a **terminal**, export it in the shell that launches Claude Code (Claude Code does **not** read
  `.env` for MCP variables). Sign-in is interactive in the browser on first use. No ADO → the two
  write steps **draft locally** and the QA is still scored.
- **A branch of their own**. **Suggested:** `exercise/<their-name>`, cut from the shared base. `/qa`
  checks the branch and recommends one if you're on the default branch.
- A place to work: for Tracks A/B an **empty framework folder** (it holds `.env`, `flow-map.json`,
  `package.json`); for **Track C**, the **product repo** itself (the knowledge base is written into it).

---

## 3. Starting

Open Claude Code in your working folder and run **`/qa`**. On the first run it confirms your
**product kind**, reads your codebase, shows your modules, and recommends a next step — then routes
you to your track.

```text
/qa
```

Then say what you're doing, in your own words, with the shared story:

- **Track A (build):** "Build a test-automation framework for the Customer module, brick by brick.
  Here's the shared story: `<paste it or give its path>`."
- **Track B (analyze & author):** "Analyze this story and get me ready to test it: `<paste / path>`"
  (or `/analyze <id>`), then "write the test cases." Run `/learn` alongside to pick up automation.
- **Track C (manual / desktop):** "This is a desktop app I can't automate — analyze the `<module>`,
  build its knowledge base, and write manual test cases I can run by hand and publish to ADO."

`/qa` checks where you stand and which branch you're on, tells you in two lines, and asks you to
confirm before it does anything. It **pauses at every human gate** — you approve the case set before
it's published and each bug before it's filed; nothing reaches the tracker without your yes.

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

*This is **Track A** (the full build). On a **web/UI** build, phase 1 also sets up the Playwright
**browsers + VS Code extension** for you (gated) — `/learn-extension` goes deeper. **Tracks B and C
don't run these phases**: Track B is `/qa` → analyze → author → (preview) publish; Track C is the
manual track (analyze → KB → manual cases → publish → test by hand → file bugs). Both skip to
section 6 for scoring.*

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

**By track:** Track A produces the evidence below (a green suite + coverage). **Tracks B/C** are
scored on **authored-case coverage** (the `cases` the plugin wrote/approved, and for Track C the
committed **knowledge base**) and **issues/gaps found** — there's no green suite to show, so the
evidence is the case set (in `.md` / ADO), the KB, and each issue with its story contradiction.

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
| `/qa` / the plugin is not listed | the engine may be too old (an older Claude Code fails to load the **whole** plugin, not just the pane) — use a current, mods-capable build; otherwise the plugin isn't enabled. Enable it, restart, and confirm `claude plugin list` shows it **✔ loaded** |
| `verify:setup` is red | the first thing to check is `.env`: the right URL, a login that returns a token, the token field name. Fix it before anything else |
| ADO calls fail or are skipped | `ADO_ORG` isn't set, or sign-in is incomplete. Set `ADO_ORG` — desktop: environment dropdown → **Local** → gear; terminal: export in the launching shell — then **restart** and complete the browser sign-in. Or carry on with local drafts |
| An MCP server won't start on **Windows** (`npx` ENOENT) | the shipped `.mcp.json` calls `npx` **directly** (works on macOS / Linux / WSL out of the box); on native Windows, wrap each command with `cmd /c` (see the plugin README's Platforms section) |
| `.env` shows in `git status` | it must not; check the root `.gitignore`, and unstage it before any commit |
| A test passes alone but fails with others | shared data between tests; give each test its own uniquely named data |
| You cannot tell a bug from a bad test | go back to the triage list in section 6.2, step 1 |

---

## Done when

- [ ] You started with `/qa`, on your own branch (Tracks A/B: your own untracked `.env`)
- [ ] Analysis confirmed the Customer module against the shared story
- [ ] **Track A:** the framework builds, `verify:setup` is green, the API suite runs green (phases 0-2 min) · **Tracks B/C:** the case set is authored + approved (and for C, the knowledge base is written)
- [ ] Every issue you report passed triage and has its evidence (test/case + the story line it contradicts)
- [ ] The secret scan returned 0, and you pushed your branch yourself
