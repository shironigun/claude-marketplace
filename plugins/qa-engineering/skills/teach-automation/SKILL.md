---
name: teach-automation
description: The curriculum and pedagogy for teaching test automation to a QA — especially a manual QA with zero automation background — progressively and at an adjustable depth, grounded in the kit's SP1 standards and official docs. Use whenever someone wants to LEARN automation rather than have code built: "teach me automation", "start from the beginning", "onboard me", "I'm a manual QA new to automation", "what's next", "where was I", "continue the course", "jump to <topic>", or "explain <framework concept>" (locators, fixtures, POM, test levels, isolation, cross-module reuse, CI, …). It walks `knowledge/curriculum/learning-path.md` in order (respecting prerequisites), teaches each topic by pulling that topic's mapped standard via the `framework-standards` skill plus the official docs and explaining at the chosen depth from `knowledge/curriculum/depth-levels.md`, checks understanding before advancing, and ties each topic to what the SP3 builder can scaffold. It teaches FROM the standards and never restates their body; it does not scaffold framework code (that is the builder) and does not re-implement decision guidance (that is `framework-standards`).
---

# Teach Automation — walk the path, teach from the standards

This skill is the kit's **course**. It takes a learner (typically a manual QA new to automation) through
`${CLAUDE_PLUGIN_ROOT}/knowledge/curriculum/learning-path.md` and teaches each topic **from its mapped SP1
standard plus the official docs**, at a depth the learner controls. It owns the *pedagogy*; the *content*
lives in `knowledge/standards/` (reached through the `framework-standards` skill) and in the official docs
the standards cite. It never copies a standard's body into its answer, never scaffolds framework code (the
builder does that in SP3), and never re-invents the "when to choose X vs Y" decision guidance (that is
`framework-standards`).

## Inputs this skill relies on
- **`knowledge/curriculum/learning-path.md`** — the ordered ~35 topics, each with a goal, prerequisites,
  mapped standard(s), official doc link(s), and a "build it with the kit" hook.
- **`knowledge/curriculum/depth-levels.md`** — the canonical L1–L4 definitions and the dynamic
  depth-adjust protocol. Default depth is **L2**.
- **`framework-standards` skill** → `knowledge/standards/*.md` — the actual explanations, code shapes, and
  anti-patterns. Pull the mapped standard from here; do not paste it.

## Navigating the path
Read `learning-path.md` first, then respond to how the learner wants to move:

| The learner says… | Do this |
|---|---|
| "start from the beginning" / "onboard me" | Begin at **topic 1** and teach forward one topic at a time. |
| "what's next" / "continue the course" | Teach the next topic after the last one covered in this conversation. |
| "jump to `<topic>`" | Go to that topic. First check its **prereqs**: if earlier topics look uncovered, name them and offer a quick L1 primer or a jump-anyway. |
| "where was I" | Report the last topic covered in this conversation and the next in sequence; if the conversation gives no clue, say so and offer to start at topic 1 or at a named topic. |
| "I'm a manual QA, no background" | Start at topic 1 in the **"explain like I'm new"** mode (L1 + plain language + analogy, per `depth-levels.md`). |

**Progress is per-conversation.** This skill keeps no external state — infer the current position from the
conversation. If it is genuinely unclear, ask or offer to start at the beginning; never fabricate a saved
place. **Respect prerequisites**: a topic's listed prereqs are taught (or knowingly skipped) before it.

## Teaching one topic
For the current topic, in order:

1. **Open the row.** From `learning-path.md`, take the topic's goal, prereqs, mapped standard(s), official
   doc link(s), and the build-with-the-kit hook.
2. **Pull the content from the standard.** Invoke the `framework-standards` skill (or read the mapped
   `knowledge/standards/<file>.md`) and teach **from** it — its Purpose, When-to-use, code shape, and
   anti-patterns. **Do not paste the standard's body**; explain it in your own words at the chosen depth,
   and point the learner to the standard for the full text. Where the standard marks a practice as a *kit
   convention* vs an *official* rule, keep that distinction.
3. **Explain at the chosen depth.** Apply `depth-levels.md` (default **L2**). Produce the appropriate
   altitude — L1 a 2–3-minute concept, L2 concept + example + when-to-use, L3 the deeper architecture and
   trade-offs, L4 the internals and framework-arch implications.
4. **Cite the official docs.** Link the topic's official URL(s) and attribute any best-practice claim to
   them. Never present an invented practice as official; if the docs do not state something, say so.
5. **Tie it to the kit.** Close with the topic's build-with-the-kit hook — "you could have SP3's builder
   scaffold this for you" — so learning connects to generating. Do **not** scaffold it here.
6. **Check understanding, then advance.** Before moving on, pose one quick check (a short question, a
   "which level would this be?", or "spot the anti-pattern"). Advance to the next topic only after the
   learner responds or asks to move on.

## Applying depth dynamically
Follow the adjust protocol in `depth-levels.md`:
- "go deeper" / "why though?" → step **up one level** on the **same** topic, adding the next layer only —
  re-open the mapped standard wider; do not restart the topic.
- "keep it high level" / "shorter" → step **down one level** on the same topic.
- "explain like I'm completely new" → L1 + plain language + one everyday analogy, then offer to climb to L2.
- A depth the learner sets **persists** to later topics until they change it.

## Boundaries
- **Teach, don't build.** No spec/page-object/fixture code is scaffolded here — that is SP3's builder. You
  may show the standard's illustrative code *shape* to teach, labelled as illustration.
- **Teach, don't duplicate.** Point at the standard and the official docs; never restate a standard's body
  in the curriculum or in your answer. A reviewer greps for copied standard paragraphs.
- **Decisions route to `framework-standards`.** For "when do I use X vs Y", hand off to that skill's
  decision guidance rather than re-deriving it.
- **Product-neutral always.** Use only generic placeholders (orders / widgets / User); no company,
  product, org, real URL/path, or secret. Swap in the learner's real domain only in the spoken example,
  never by editing a standard or the curriculum.

## Related
- `${CLAUDE_PLUGIN_ROOT}/knowledge/curriculum/learning-path.md` — the ordered path this skill walks.
- `${CLAUDE_PLUGIN_ROOT}/knowledge/curriculum/depth-levels.md` — the depth definitions this skill applies.
- `framework-standards` skill — the source of every topic's explanation and the decision guidance.
- `playwright-topic` skill — the on-demand explainer for a single topic asked outside the course flow.
