# Audiences

One feature, six possible pages. The research is the same for all of them; what changes is which facts
lead, which pictures carry them, what is collapsed and what is left out. Set the choice in the content
module as `audience: 'qa'` (or `product`, `design`, `dev`, `sales`, `all`). `lint-content.js` checks the
page against that audience's rules, and `build.js` stops on a fail.

## Contents
1. Choosing the audience
2. At a glance
3. Product team (`product`)
4. QA team (`qa`)
5. Design team (`design`)
6. Development team (`dev`)
7. Sales and operations (`sales`)
8. Everyone (`all`, the default)

## 1. Choosing the audience

Read it from the request when it is there: "for QA", "so the designers understand the flow", "a dev
handover", "something sales can use", "for the product team". If the request names none, and the user
hasn't told you before, ask once, offering the six options with `all` recommended. If the user wants
several audiences, build one page per audience from the same notes; don't blend two into one page.

## 2. At a glance

| | Product | QA | Design | Development | Sales / ops |
|---|---|---|---|---|---|
| Their question | What does it do for users, and what's still undecided? | What must be true, and how do I prove it? | How does it flow, and what does the user see at each step? | How is it built, and where do I change it? | What do I tell a customer? |
| First page leads with | the journey, the value, the decisions | the rules as grids, what to test | user journeys, screens and states | architecture and data flow | the problem, the benefit, 3 steps |
| Tone | plain, business words | plain, precise, testable | plain, visual, user's words | technical, exact names | customer words, benefits, no jargon |
| Developer detail | collapsed | collapsed | optional, collapsed | the main content | **left out** |
| Issues found | as risks to decide | in full, with test ids | only those a user would see | in full, with code pointers | **left out** |
| Pages | 3-6 | 6-10 | 3-6 | 6-10 | 1-3 |

## 3. Product team (`product`)

**Who:** product owners, managers, BAs. They decide scope and priorities and answer "should it do X?".

**Lead with:** what the feature does for each kind of user and why it matters, the end-to-end journey,
who does what, the promises it keeps, the rules that are product decisions (limits, thresholds, who can
do what), what is out of scope, and the open questions.

**How it works sections:** journey · two kinds of … (if the feature handles variants) · who does what ·
the promises it keeps · how X is decided (levels grid, framed as "the rule today") · what the user sees ·
known gaps as **risks** (an `issues` card per risk, badge "To decide" or "Known gap") · collapsed developer
block.

**Pages:** How it works, On screen, Rules, To confirm (prominent: each question with options and a
recommended answer), Glossary. Add Examples if real examples help a decision.

**Leave out or shrink:** test case detail, environment and login tables, raw payloads (keep them in the
developer block).

## 4. QA team (`qa`)

**Who:** manual and automation testers. They need every rule stated so it can be tested, every input that
matters, the expected result, and how to run it.

**Lead with:** the rules as grids (limits, enums, thresholds with their exact numbers), how the system
reads each kind of input (`verdicts` with test ids), the checks on every answer (`checklist`), annotated
screens with numbered test points, what goes wrong and who catches it, issues found with dates.

**How it works sections:** journey · two kinds of … · who does what · how X is decided (with the test ids
under the grid) · what the user sees (annotated, with `keys`) · when it goes wrong (decision flow) · what
to test (id `how-qa`) · issues found (id `how-issues`) · collapsed developer block.

**Pages:** How it works, On screen, Fields, Rules, Checks, Examples, Tests (every case: input, expected,
what it checks, priority), Test in ‹env› (routes, which login works where), Try it if a call can be made,
Glossary, To confirm.

**Required:** a What to test section; every issue dated, with the environment and the test id.

## 5. Design team (`design`)

**Who:** product designers and UX writers. They want the functional and business flow, like QA, but seen
through the screens: what the user does, sees and reads at every step, and every state a screen can be in.

**Lead with:** a journey per user role, a screen flow (screen → action → next screen), each screen as an
annotated mock, a states grid per screen (empty, loading, success, partial, error, no access), the rules
that shape the UI (limits that need a counter, values that need a picker, actions only some roles see),
and the copy the user reads (labels, messages, errors), quoted exactly.

**How it works sections:** journey (one per role if they differ) · who does what · screen flow (an SVG
flow of screens with the action on each arrow) · what the user sees (annotated mocks with `num` and `keys`)
· states (a `levels`-style grid or a `matrix` of screen × state) · the rules that shape the screen · the
words on screen (a table of exact copy and where it appears) · open design questions.

**Pages:** How it works, Screens & states (one block per screen: mock, states, copy, edge cases), Rules
(only the ones that change what's on screen), Copy (every message and error), Glossary, To confirm.

**Leave out:** request and response formats, storage, test case lists, environments. Mention an API only
if a delay or failure shows on screen (then it is a loading or error state).

**Mocks:** follow the real product's layout and labels where they exist (read the components); mark
anything not built yet as "proposed".

## 6. Development team (`dev`)

**Who:** engineers who will build, change or debug it.

**Lead with:** the architecture (components and the calls between them, as an SVG with labelled arrows),
a sequence of one request end to end, the contract (request, response, every field with type and
meaning), storage (tables, columns, keys), validation and error handling, configuration and feature
flags, environments and versions (what runs where, measured), and a code map (the files that matter, with
paths, one line each).

**How it works sections:** a short plain summary (3 sentences and the journey, so a newcomer has the
story) · architecture diagram · sequence diagram · the contract at a glance (a `matrix` or table of fields)
· where state lives · when it goes wrong (errors and retries as a flow) · versions and drift
(`issues`-style cards: "DEV runs 1.10, repo has 1.9") · code map.

**Pages:** Architecture, Request, Fields, Rules & validation, Examples (full payloads), Errors & ops (codes,
limits, retries, logs), Environments, Code map, Tests, To confirm.

**Different from the others:** plain-words notes are optional and the developer detail is the main content,
not collapsed. Exact names (`ClassName`, `table.column`, `POST /api/...`) are welcome. Pictures still lead
each concept; prose can be longer. Never print secrets, even here.

## 7. Sales and operations (`sales`)

**Who:** sales, account managers, support and operations. They explain the feature to customers and need
to be right without knowing how it is built.

**Lead with:** the customer's problem in one sentence, what the feature does about it, 3 benefits, how it
works in 3 steps the customer would recognise, what the customer sees (one simple mock), who can have it
(plans, tiers, regions, integrations, prerequisites), and the limits a customer will hit.

**How it works sections:** the problem and the promise (hero) · 3-step journey (`journey` with 3 nodes,
no internal actors) · 3 benefits (`tiles`) · what the customer sees (one mock, few callouts) · who it's for
and availability (a `matrix` of plan × available) · limits worth knowing (`chips`) · FAQs and objections
(question → short answer) · a short talk track (3 sentences a salesperson can say) · what not to say
(`tiles` with `block` icons: no promises of unreleased features, no dates, no internal names).

**Pages:** 1 to 3: Overview, FAQ, and optionally What the customer sees.

**Leave out entirely (lint fails on these):** the developer block, code, payloads, internal issues and
test results. Only describe what is shipped and available; mark beta or limited features plainly. If
availability can't be confirmed, say "check with product" rather than guess.

## 8. Everyone (`all`, the default)

The mixed page this skill started with: How it works for product and QA (with Product / QA / Developers
buttons at the top), reference pages for QA and developers, and the developer detail collapsed. Use it
when one page has to serve a whole team.
