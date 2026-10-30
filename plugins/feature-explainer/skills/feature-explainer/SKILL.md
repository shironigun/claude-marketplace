---
name: feature-explainer
description: "Builds a visual explainer page (a published artifact) for one product feature, from nothing more than the feature's name or a one-line direction, aimed at one audience: product, QA, design, development, or sales and operations (or everyone). It researches the feature itself (code, branches, tickets, docs, live calls when allowed), then draws it for that reader: journeys, who does what, rules as grids, annotated screens and states, what to test, architecture, or a customer-facing overview, with dated issues and the right detail collapsed or left out. Use this skill whenever someone wants to understand, explain, document, onboard to, hand over, test, design for or sell a feature and a page would help: \"explain feature X to QA\", \"a handover page for the devs\", \"so the designers understand the flow\", \"something sales can show customers\", \"I need to understand how campaigns work\", \"do the same page for feature Y\", even when they don't say artifact, page or visual."
---

# Feature explainer

The user names a feature, or gives one line of direction ("explain the refund flow", "how does the
AI reply suggestion work"). You do the rest: research it, decide what the page needs, draw it, check it,
publish it. The result is a multi-page artifact where **pictures carry the facts** and the words are
short, so a QA analyst or a product owner understands the feature in minutes, and a developer still
finds every technical detail one click deeper.

This style came from real feedback on earlier pages, so it is worth knowing why it looks the way it does:
- "Too developer-centric" → the first page is written for QA and product; developer prose moves into a
  collapsed **For developers** block and the later pages. Nothing technical is deleted.
- "Too much text, use visuals" → each concept becomes a picture (a flow, a grid, an annotated mock), with
  one short sentence at most around it. Converting prose into a picture is the job; dropping facts is not.
- Reviewers trusted the pages because every number was real and dated, and every issue was one they could
  reproduce. Keep it that way.

## What you produce

One artifact page (HTML built by `scripts/build.js`) with a sidebar of pages, typically:

| Page | For | What it holds |
|---|---|---|
| **How it works** (always first) | product, QA | the picture story: journey, who does what, rules as grids, annotated screens, what to test, issues found, then the collapsed developer block |
| On screen | QA, product | what the user sees, as a faithful mock |
| Fields / Request / Rules / Examples / Checks | QA, developers | the contract, each page opening with an "In plain words" note |
| Try it / Tests / Test in ‹env› | QA | how to run it, every test case, which login works where |
| Glossary | everyone | every term in plain words, searchable |
| To confirm | the team | open questions, each with options and a recommended answer; nothing is decided there |

Pick only the pages the feature actually has. A feature with no API needs no Request page.
`references/page-recipe.md` has the full menu, the content-module format and the writing rules.

That table is the **everyone** edition. Each audience gets its own edition built from the same research
(`references/audiences.md`):

| Audience | Leads with | Detail |
|---|---|---|
| `product` | the journey, value, rules as decisions, open questions | developer detail collapsed; issues as risks |
| `qa` | rules as grids with exact numbers, what to test, test cases, logins per environment | developer detail collapsed; issues in full |
| `design` | journeys per role, screen flow, annotated screens, every state, exact copy | no API or test detail |
| `dev` | architecture, sequence, contract, storage, errors, versions, code map | technical detail is the main content |
| `sales` | the customer's problem, 3 benefits, 3 steps, availability, FAQs, what not to say | no code, no internal issues, 1-3 pages |
| `all` (default) | the table above | developer detail collapsed |

## Workflow

Work through these in order. Keep a short checklist so nothing is skipped.

### 1. Take the direction and pick the audience

Don't send the user a questionnaire. Their one line is enough to begin. Read the audience from it ("for
QA", "for the designers", "a dev handover", "something sales can use"). If it names none, ask once, with
the six options and `all` recommended; that is a real choice only the user can make. If they want several
audiences, research once and build one page per audience.

Otherwise ask only when a real product choice blocks you, for example two branches disagree and you
can't tell which one is the truth, or the user hasn't said which environment you may call. When you ask,
offer the options and your recommendation. Technical and design choices are yours: make them and explain
them briefly.

### 2. Research, read-only

Read `references/research.md` first. In short:
- Find the feature in the code (search the repo; read other branches with `git show`/`git grep`, never by
  switching or committing), in tickets and in docs. Note which branch or environment each fact is from.
- Prefer what you can **measure** over what documents say: a live response's version number beats a
  README. When they disagree, show both and say which is live.
- Call live systems only if the user allowed it. Credentials come from files the user points to, are
  never printed, never written into the page, and test files holding them are deleted afterwards.
- Write every fact into a research-notes file with its source and date, in your scratch folder, not the
  user's repo. The page is built from these notes, so anything not in them doesn't go on the page.

### 3. Plan the page

From the notes and the audience, choose the pages and, for the first page, the sections. Each section
answers one question that reader asks ("what happens, in order?", "who does what?", "what do I test?",
"what state is this screen in?", "what do I tell the customer?"). `references/audiences.md` lists each
audience's pages and sections; `references/page-recipe.md` maps questions to the blocks that draw them.

### 4. Write the content module

Create `content.js` in your scratch folder, modelled on `examples/example-content.js`, with
`audience` set. It uses the
blocks in `assets/vzkit.js`; `references/visual-catalog.md` says what each block is for and how to call
it. Write in plain words (rules in the recipe): name things the way users see them, give AI helpers plain
names ("the Drafter", "the Planner"), use real numbers and real examples from the notes, and date findings.
Mark invented sample data as examples.

### 5. Build and check

```bash
node <skill>/scripts/build.js content.js out/<name>.html
node <skill>/scripts/phone-copy.js out/<name>.html out/_phone.html
python <skill>/scripts/serve.py out <any free port>   # in the background
```

`build.js` first runs `scripts/lint-content.js` against the audience's rules (pictures on the first page,
a prose budget, plain notes, the developer block kept or banned, dated issues, no secrets) and stops on a
FAIL. Fix the content, not the rule. Then follow `references/checks.md`: open the page in the browser at desktop width and on the phone copy,
in light and dark, run `scripts/page-check.js` on each, read the console, and click the role buttons. Fix,
rebuild, recheck. Delete `_phone.html` when done.

### 6. Publish

Publish the built file with the Artifact tool (load the artifact-design skill first if your environment
asks for it; the shell already follows its page contract). Give it a two-to-four-word name, a one-word
icon and a one-sentence description. Updating a page that already exists: read it first, then publish to
its URL. Pages start private, so tell the user to share them from the page's Share menu.

### 7. Report back

In a few lines: the link, what the first page shows, the issues found (with dates), and anything you
could not verify and why. Don't claim checks you didn't run.

## Ground rules

- **Read-only.** Never commit, push, switch branches, write to trackers or change data while researching.
  The page is the only thing you create, plus scratch files.
- **No secrets.** Tokens, passwords and keys never appear in the page, in commands you show, or in notes.
- **Only confirmed facts.** An issue goes on the page only if you saw it happen, or the code shows it
  plainly (then it is labelled "found in the code"), with the date and where. No "might break if…"
  speculation; that becomes a question on To confirm.
- **Never invent.** If a detail isn't in the notes, leave it out or put it on To confirm as a question.
  Watch sample data too: an example reply that names a product the conversation never mentions is an
  invented fact.
- **Keep the developer detail.** Move it, collapse it, never delete it.
- **Filled icons only** (the kit's icon set already is).

## Files in this skill

- `assets/vzkit.js`: the drawing kit (icons, SVG flow helpers, and every block)
- `assets/shell.css`: the page styles, light and dark, phone-safe
- `scripts/build.js`: content module → page (runs the lint first); `scripts/lint-content.js`: the house
  style per audience; `scripts/serve.py`: UTF-8 preview server; `scripts/phone-copy.js`: phone-test copy;
  `scripts/page-check.js`: in-browser layout check
- `examples/example-content.js`: a complete small example (made-up feature) to copy from
- `references/audiences.md`, `references/research.md`, `references/page-recipe.md`,
  `references/visual-catalog.md`, `references/checks.md`: read each when its step comes up
