# SP14 — QA-friendly command surface (slash commands)

Status: in progress (2026-10-10). Phase 4 (ease-of-use). Depends on SP5 (qa-orchestrator + qa-context),
and on every engine the commands front (SP6 story-intelligence, SP7 ado-publish, SP8 authoring, SP9
automation-engine, SP10 failure-to-bug, SP12 run-suite, SP13 code-intelligence, plus scan-and-confirm /
kit-builder / automation-tutor). **Adds a discoverable slash-command layer so a manual QA can drive the
whole loop without knowing the orchestrator or how to phrase intent.**

## 1. Why
Today the plugin has one entry point: invoke the `qa-orchestrator` agent and describe the intent in words.
That is flexible but it is the complexity a manual QA hits first — they must know the agent exists and
phrase the ask. [Slash commands](https://code.claude.com/docs/en/slash-commands) show up in the `/` menu
with a description + argument hint, so the QA sees exactly what to type. The plugin ships **no `commands/`
directory yet**; SP14 adds one.

## 2. Goal
A `commands/` directory of thin, product-neutral slash commands in two tiers:
- **Easy-buttons (journeys):** one command walks the QA through a whole sequence of the loop, pausing at
  every human gate in plain language. The "take over everything in sequence, make it EASY" ask.
- **Single steps:** one command per engine, for a QA who wants just that step.

**Every command is a thin wrapper that routes through the `qa-orchestrator`** — it hands a clean intent +
the typed argument to the orchestrator, which keeps house-profile reading, qa-context threading, and all
human gates centralized. A command never bypasses the orchestrator or its gates, and never re-implements an
engine. Each body stays short so it cannot drift out of sync with the skills.

## 3. Deliverable — `commands/*.md`

Each file: frontmatter (`description` = a plain, jargon-light one-liner shown in the menu; `argument-hint`
where it takes input) + a body that routes the intent through the orchestrator. Product-neutral; the
tracker/product specifics come from the house-profile at run time, never hard-coded.

**Tier 1 — Easy-buttons (journeys):**
| Command | Does |
|---|---|
| `/qa` | Concierge / front door. Reads qa-context, says where you are, asks the one question "what have you got?", points at the easy-buttons and steps. For a QA who doesn't know where to start. |
| `/test-story <id>` | Test a story end to end: analyze → cases → approve → publish → automate → run → bugs, **pausing at every gate** in plain language. The flagship easy-button. |
| `/test-module <path\|name>` | The same end-to-end journey starting from existing **code** (code-intelligence first). The codebase → QA easy-button. |
| `/resume` | Pick up where the last session left off — reads qa-context, says what's done, offers the single next step. |

**Tier 2 — Single steps (one engine each):**
| Command | Routes to |
|---|---|
| `/analyze-story <id>` | story-intelligence (read-only) |
| `/analyze-module <path\|name>` | code-intelligence (read-only) |
| `/make-cases` | author-api-cases / author-ui-cases (→ cases slice; approval seam) |
| `/review-cases` | the approval seam — show the set, set `approved` only on explicit yes |
| `/push-cases` | ado-publish (gated: dry-run + confirm) |
| `/automate` | automation-engine (approved / ADO cases → specs) |
| `/run <scope>` | run-suite (honest result; offers file-bug) |
| `/file-bug` | failure-to-bug (gated) |
| `/build-framework` | scan-and-confirm → kit-builder (phase by phase) |
| `/learn <topic>` | automation-tutor |

**Design rules (stated so the review can check them):**
- **Route through the orchestrator**, never around it; the gates stay where they are.
- **Plain language, jargon-light** descriptions + bodies — the audience is manual QAs.
- **Gates preserved** — no command performs or implies an un-gated tracker write, auto-file, or
  fabricated run result; the journeys explicitly pause at each gate and wait for a yes.
- **Thin** — a command states intent + target + the gate expectation and hands off; it never restates an
  engine's procedure or coordinates (no drift).
- **Product-neutral + secret-free** — no real product/org/URL/account/credential; specifics via the
  house-profile.

## 4. Wiring
- `commands/` is auto-discovered by Claude Code (the plugin.json uses default component paths), namespaced
  `/qa-engineering:<name>`.
- Plugin `README.md` gains a **Commands** quick-start grouped as easy-buttons vs single steps.
- `docs/enhancement/README.md` gains a Phase-4 (SP14) entry.
- No engine or orchestrator behavior changes — SP14 is a front door onto the existing loop. (A one-line
  note may be added to the orchestrator saying a slash command is a valid entry; optional.)

## 5. Out of scope
Changing any engine, gate, or qa-context contract · headless/CI scheduling (that was the parked "SP-CI"
idea; these commands happen to be the clean headless entry points, but SP14 does not build any pipeline) ·
new tracker capabilities.

## 6. Acceptance criteria
1. `commands/` exists with the Tier-1 (4) + Tier-2 (10) commands; each has a plain-language `description`
   and an `argument-hint` where it takes input; all are product-neutral + secret-free.
2. Every command **routes through the qa-orchestrator** and preserves the human gates — no command
   bypasses the orchestrator, performs an un-gated tracker write/auto-file, or claims a run result.
3. The journeys (`/test-story`, `/test-module`) walk the whole loop **in sequence, pausing at each gate**
   in plain language; `/qa` and `/resume` orient a QA with no prior knowledge.
4. Commands are thin (intent + target + gate), restating no engine procedure — nothing to drift.
5. README + roadmap updated; committed to `dev`.
6. **Independent adversarial review passes** — thin wrappers, real routing-through-orchestrator, gates
   intact, plain language, neutral, valid frontmatter, no drift/overclaim.

## 7. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product
scan before the push. Full independent review (over-claiming a gate or bypassing the orchestrator is the key
risk).
