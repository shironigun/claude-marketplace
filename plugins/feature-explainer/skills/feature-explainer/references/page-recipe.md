# Page recipe

## Contents
1. The content module (what build.js expects)
2. Choosing the pages
3. How it works: questions → sections → blocks
4. The other pages
5. Writing rules

## 1. The content module

`content.js` is a CommonJS module that requires the kit and exports one object:

```js
const K = require('<skill>/assets/vzkit.js');
module.exports = {
  audience: 'all',                         // all | product | qa | design | dev | sales — see audiences.md; the lint checks it
  title: 'Reply Assist',                 // 2-4 word name: browser tab and gallery. Not "X: explainer".
  brand: 'Reply Assist',                  // short name in the top bar
  meta: '<b>reply-draft</b> v1.3',        // optional sidebar footer: skill/service names, versions
  hero: {                                  // shown on the first page only
    eyebrow: 'Helpdesk &middot; for product, QA and developers',
    h1: 'Reply Assist: a first draft of every reply',
    lede: 'One or two plain sentences: what it does, the one safety fact, and where to find it.',
    links: 'New to the terms? Start with the <a href="#terms">Glossary</a>.',
    chips: [['where', 'Tickets &rsaquo; Reply'], ['AI helper', 'Drafter'], ['status', 'live on TEST', true]]
  },
  pages: [ { id: 'how', group: 'Overview', label: 'How it works', icon: 'bulb', html: '...' }, ... ],
  glossary: [ ['Group', [ ['Term', 'meaning in plain words', 'where you meet it'] ]] ],   // fills page id 'terms'
  footer: 'one line',
  css: ''                                   // optional extra CSS for a feature-specific mock
};
```

- `id`: lowercase letters, digits, hyphens. Avoid `settings`, `sidebar`, `customize`, `upgrade`,
  `downloads` (the viewer keeps those). Each page is reachable as `#id`; any element id inside a page also
  works as a link (`#how-qa` opens How it works and scrolls there).
- `icon`: a name from `K.P` (see the catalog). `group`: the sidebar heading; pages of one group sit together.
- `html`: a string (or a function returning one). Start with `K.head(...)`, then `K.plain(...)` on every
  page except the first, then the blocks.

## 2. Choosing the pages

This section and the next describe the **everyone** (`all`) edition. For a single audience, start from
its list in `audiences.md` (the sales edition, for example, is 1-3 pages with no developer block) and use
the tables below only to find the block that draws each section.

Always: **How it works** (first), **Glossary** (`terms`), and **To confirm** if any open questions exist.
Add the others only when the feature has them:

| The feature has… | Add |
|---|---|
| a screen | On screen: a faithful mock with numbered callouts (keys) |
| an API, an AI call, a message format | Request, Fields, Examples |
| validation, limits, enums | Rules, Checks |
| test cases | Tests (one card per case: what it checks, expected result) |
| more than one environment or login | Test in ‹env›: routes + `pairs` of which login works where |
| an AI prompt or skill text | The skill: the text, its versions, which version runs where |
| a second helper or follow-up flow | its own group of pages |

## 3. How it works: questions → sections → blocks

Order the sections as a newcomer's questions come. Use only the ones the notes can fill.

| Question | Section title | Block(s) |
|---|---|---|
| Where do I start? | (top of page) | `roles` with Product / QA / Developers buttons |
| What happens, in order? | The journey | `journey` (4-6 steps; a `loop` for what repeats) |
| What kinds of thing does it handle? | Two kinds of … | `compare` with real examples (chat bubbles via `msg`) |
| Who does what? | Who does what | `matrix` (3 actors × 4-6 jobs, icons + 2-4 words per cell) |
| What will it never do? | The promises it keeps | `tiles` (3-6 one-line promises) |
| What are the moving parts? | The AI helpers / The parts | `helper` cards with a `mini` drawing of input → output |
| When does each thing run? | When things happen | an SVG timeline (`svg` + `big`) |
| How is X decided? | How urgent is it? / How X is chosen | `levels` grid + a worked example, `chips` with test ids |
| What does the user see? | What the ‹role› sees | an annotated mock with `num` callouts + `keys`, `actions` |
| What if it goes wrong? | When the ‹AI/system› gets it wrong | an SVG decision flow with `gbox` + `big` |
| What do I test? | What to test (id `how-qa`) | `verdicts` (real inputs → expected verdict + test id), `checklist`, annotated mocks |
| What's broken today? | Issues found on ‹env› · ‹date›, or Issues found in the code · ‹date› (id `how-issues`) | `issues` cards, each with a small visual and who catches it |
| Where's the technical detail? | (bottom) | `devDetails` holding the original prose, tables, code |

A section is one picture plus at most one sentence (a caption, a `foot` note). If you need a paragraph,
the picture isn't doing its job yet.

## 4. The other pages

Every page after the first starts with `K.head(eyebrow, title, intro)` and `K.plain(text)`. The plain
note says, in one or two sentences, what the page is and who it is for, e.g. "Every piece of information
the AI sends back and where it shows. **QA:** check an answer field by field. **Developers:** this is the
contract." Then a plain picture if one fits (a decision flow on Checks, routes on Test in ‹env›), then the
reference material: tables, code blocks (`.codewrap` + `pre.code`), test cards. These pages may be dense;
that is what they are for.

To confirm: one `.qrow` per question (number, the question, the options found, a recommended answer).
Never decide there; the team decides.

## 5. Writing rules

- Write from the user's side: "the Inbox list", not `InboxBoardView`; "the AI", not the skill id. Put
  code names in `code` tags only where a developer needs them, or in the developer block.
- Give AI helpers and services plain names once ("the Drafter (reply-draft)") and use them everywhere
  after.
- Short, active sentences. No "not X, but Y", no em-dash asides, no "worth noting". Numbers as digits.
- Real examples from the notes beat invented ones. Invented sample data is labelled as an example.
- Dates are absolute (29 October 2026), never "yesterday" or "last week".
- Every issue says what happened, the limit it broke, and who catches it (Not caught / Caught by ‹app› /
  Reported to ‹team›).
- Headings are plain questions or statements ("How urgent is it?"), not labels like "Urgency model".
