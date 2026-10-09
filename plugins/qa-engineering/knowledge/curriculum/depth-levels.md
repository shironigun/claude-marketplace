# Teaching depth levels

> The four depths the tutor teaches at, defined **once**. Both SP2 skills (`teach-automation` and
> `playwright-topic`) read this file — it is the single source of truth for depth. Default is **L2**.

## Why this file exists
A manual QA new to automation and a QA who already writes specs need the *same* topic explained at
different altitudes. Rather than each skill inventing its own notion of "deeper", every teaching surface
in the kit picks a depth from the four below and adjusts on request. Depth is **altitude only** — it
changes how much of a topic is unpacked, never *what is true*. The content itself always comes from the
mapped standard in `knowledge/standards/` plus the official docs; this file only sets how far to open it.

## The four levels

| Level | Name | Budget | What the answer includes | Reach for it when |
|---|---|---|---|---|
| **L1** | Quick | ~2–3 min | The concept in one or two sentences — what it is and the single reason it matters. No code, or one tiny line. | A quick orientation, a "remind me what X is", or the first pass of a brand-new topic. |
| **L2** | Practical *(default)* | short | Concept + one worked example + when to use it (and when not). | The default for teaching a curriculum topic — enough to use the thing correctly. |
| **L3** | Deep | longer | Underlying concepts, how the pieces fit (architecture), trade-offs, example(s), the anti-patterns, and how it's implemented in the kit. | The QA wants to really understand it, is about to build it, or asks "why is it done this way". |
| **L4** | Expert | longest | Internals, the design decisions behind it, alternatives that were rejected, scalability, failure modes, and what it implies for the framework's architecture. | The QA is designing or extending the framework, debugging a subtle failure, or weighing an architectural change. |

Each level **contains** the one below it: L3 includes L2's example and "when to use", L2 includes L1's
one-line concept. Going deeper adds layers; it never contradicts the shallower answer.

## Default and dynamic adjustment

- **Default to L2** on every topic unless the QA has set a different depth.
- The QA can re-aim the **same topic** mid-explanation; the tutor adjusts **without restarting** the
  topic — it continues from where it is, at the new altitude:

  | The QA says… | Do this |
  |---|---|
  | "go deeper", "more detail", "why though?" | Step **up one level** (L2 → L3 → L4) on the current topic, adding the next layer only. |
  | "keep it high level", "too much", "shorter" | Step **down one level** on the current topic. |
  | "explain like I'm completely new", "I'm a manual QA, no automation background" | Switch to the **L1 + plain-language + analogy** mode below (see special case). |
  | "give me an example" / "when would I use this?" | Stay at the level but surface L2's example / "when to use" slice. |

- Adjusting depth re-opens the **same** mapped standard and official docs at the new altitude — it does
  not jump to a different topic or reset progress.

### Special case — "explain like I'm new"
This is **L1 with two additions**: plain language (no unexplained jargon — name a term, then define it in
a few words) and **one everyday analogy** for the concept. It is the gentlest on-ramp; follow it by
offering to move up to L2 once the idea has landed.

## Worked illustration — one topic at all four depths
Neutral topic: **locators** (mapped standard: `locators` → `page-objects.md`; official:
https://playwright.dev/docs/locators). The point is the *altitude*, not the words — each level pulls from
the same standard, opened wider:

- **L1 (Quick):** "A locator is how a test points at an element on the page. Prefer the ones that match
  what a user sees." One sentence; no code.
- **L1 "like I'm new":** same one sentence, plus an analogy — "it's like giving directions by a landmark
  people can see ('the red door'), not by the builder's blueprint coordinates" — then an offer to go to L2.
- **L2 (Practical):** the concept, one example of a user-facing locator, and the rule of thumb for when to
  use each kind — drawn from the standard's "When to use it" section.
- **L3 (Deep):** adds *why* user-facing locators win (auto-waiting and retry-ability, resilience to CSS
  refactors), the strictness behaviour, the trade-offs against CSS/XPath, and the anti-patterns from the
  standard.
- **L4 (Expert):** adds how auto-waiting/retry re-queries the DOM, the accessibility-tree coupling and its
  failure modes, and what a locator strategy implies for page-object and component design across the suite.

The L1 answer and the L4 answer never disagree — L4 is L1 with every layer unpacked.

## How the skills use this file
- `teach-automation` picks a level per curriculum topic (default L2) and applies the adjustment table as
  the QA reacts, re-reading the mapped standard at the chosen depth.
- `playwright-topic` runs its explainer template at the chosen level and applies the same adjustment table.
- Neither skill restates a standard's body to "go deeper" — depth is reached by opening more of the
  mapped standard and the official docs, not by copying them here.
