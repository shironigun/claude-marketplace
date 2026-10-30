# feature-explainer

Name a feature; get a page that explains it.

You give one line of direction ("explain the refund flow", "build a page for the AI reply suggestions").
The `feature-explainer` skill researches the feature itself, read-only, and publishes a multi-page
artifact written for QA analysts and product owners, with the developer detail kept one click deeper.

## Pick the reader

The same research becomes a different page for each audience. Say who it's for ("for QA", "for the
designers", "a dev handover", "something sales can use"), or the skill asks once.

| Audience | The page leads with |
|---|---|
| Product | the journey, what it does for users, rules as decisions, open questions to settle |
| QA | rules as grids with exact numbers, what to test, every test case, which login works where |
| Design | journeys per role, screen-to-screen flow, annotated screens, every state, the exact copy |
| Development | architecture, a request end to end, the contract, storage, errors, versions, a code map |
| Sales / operations | the customer's problem, 3 benefits, 3 steps, availability, FAQs, what not to say (no internals) |
| Everyone (default) | a How it works page for product and QA, reference pages, developer detail collapsed |

A lint step checks each page against its audience's rules before it is built (for example: pictures
first, a prose budget, dated issues, no secrets anywhere, and no code or internal issues on a sales page).

## What the page looks like

- **How it works** comes first and is mostly pictures: a numbered journey, a who-does-what grid, the
  promises the feature keeps, the moving parts with small input-to-output drawings, the rules as grids
  with worked examples, an annotated screen, a decision flow for when things go wrong, what to test
  (real inputs with their expected verdicts and test ids), and the issues found, each dated, with a small
  visual and who catches it.
- **Reference pages** follow only when the feature has them: On screen, Fields, Request, Rules, Examples,
  Checks, Try it, Tests, Test in ‹environment›, Glossary, To confirm. Each opens with an "In plain words"
  note.
- **Nothing technical is dropped.** Developer prose is moved into a collapsed "For developers" block and
  the reference pages.
- Light and dark themes, works on a phone, one page at a time with a sidebar, links to any section.

## How it works

1. **Research, read-only**: code and other branches (via `git show`/`git grep`), tickets, docs, existing
   pages, and live calls or read-only data only when you allow it. Every fact is recorded with its source
   and date; issues are only things it saw.
2. **Plan**: picks the pages and the sections the feature actually has.
3. **Write** a small content file using the bundled drawing kit (`assets/vzkit.js`).
4. **Build and check**: `scripts/build.js` assembles the page; `scripts/page-check.js` checks every page
   for overflow and overlapping or clipped labels at desktop and phone width.
5. **Publish** with the Artifact tool, private until you share it.

## Install

```text
/plugin install feature-explainer --marketplace shironigun/claude-marketplace
```

## Use

```text
/feature-explainer:feature-explainer explain how order refunds work
```

or just ask: "I need to understand the subscription upgrade flow, make me a page for QA."

## Requirements

- Claude Code with the Artifact tool (to publish) and a browser tool (for the checks).
- Node.js (build, kit) and Python 3 (local preview server).
- Optional: your tracker's MCP server, for reading tickets.

## Safety

- Research is read-only: no commits, pushes, branch switches, tracker writes or data changes.
- Credentials are read only from files you point to, never printed and never written into the page.
- Pages start private; you share them.

## Files

```
skills/feature-explainer/
  SKILL.md                    the workflow
  references/                 audiences.md, research.md, page-recipe.md, visual-catalog.md, checks.md
  scripts/lint-content.js     house-style rules per audience (build.js runs it first)
  assets/vzkit.js             drawing kit: icons, SVG flow helpers, every block
  assets/shell.css            page styles (light/dark, phone-safe)
  scripts/build.js            content module -> page
  scripts/serve.py            UTF-8 local preview server
  scripts/phone-copy.js       phone-test copy with the publisher's viewport tag
  scripts/page-check.js       in-browser layout check
  examples/example-content.js a complete small example (made-up feature)
```
