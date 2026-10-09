# house-profile — the product-specific config seam (contract)

The committed plugin — the `qa-orchestrator`, every engine, and every example — is **product-neutral**:
it ships no product name, org, tracker, board, URL, account or voice. But a real QA loop needs those
specifics to author cases in the team's voice, file defects in the team's format, and push to the
team's tracker. The **house profile** is the one place all of that lives: a single user-supplied,
git-ignored file the orchestrator reads and hands to engines as the slice they need.

One file to fill; nothing to fork. The engines read **slots**; they never hard-code a slot's value.
A specific product on a specific tracker (say an Azure DevOps project) is simply **one instance** of this
contract — the plugin ships none of its values; a different team fills the same slots for Jira and their
own product.

> **Product-neutral by rule.** This contract and the committed `house-profile.example.json` use generic
> placeholders only (`Orders`, `widgets`, `YOUR_ORG`, `Team A`, `Plan Name`, `Suite Name`). The only
> place real values ever live is the git-ignored `house-profile.json`. No secret belongs in the profile
> at all — tokens, passwords and keys stay in the framework's `.env`; the profile carries names,
> formats, handles and pointers, never credentials.

## Where it lives and how it is used

| | |
|---|---|
| **File** | `house-profile.json` at the **framework root** — beside `.env`, `flow-map.json`, `qa-context.json` |
| **Git** | **git-ignored** (added to the plugin + template `.gitignore`). The neutral `house-profile.example.json` stays **tracked**. |
| **Created** | the team copies `house-profile.example.json` → `house-profile.json` and fills the slots for their product and tracker. |
| **Read by** | the `qa-orchestrator`, which reads the slots and hands each engine the slice it needs. |
| **Absent** | the orchestrator falls back to the **neutral defaults** (the example's placeholders / generic voice) and tells the QA exactly which slot to fill before a product-specific step (a push, a house-voice draft). It never invents a real value. |

## The slots

| Slot | What it configures | Read by |
|---|---|---|
| `product` | the product's display name and its domain nouns (so examples and titles read in the team's language) | all engines, for wording only |
| `caseAuthoring` | the **voice/format** for test cases: tone, the step/expected shape, the title convention, the tags | `author-api-cases` / `author-ui-cases` |
| `defectFormat` | the **bug/defect house format**: the work-item type, title convention, required fields, the severity scale, the repro-steps shape | `failure-to-bug` (drafts + the gated bug file) |
| `tracker` | the tracker **kind** (`azure-devops` / `jira` / …) + **org/project**, team, and the **board / area / iteration** paths work items land on | **ado-publish** (SP7) and the build's `file-to-tracker` |
| `testPlan` | the **default test plan + suite** (names and, if known, ids) new cases are added to | **ado-publish** (SP7) |
| `identity` | the **handles** for authorship, assignment and CC (display names, never secrets) | the publish / file engines |
| `env` | **pointers** into the framework's own config — which `.env` keys and which build profile — not the values; the target system stays "whatever `.env` points at" | the orchestrator + build engines |

Each slot is read, never hard-coded. An engine that needs a product specific asks the orchestrator for
the slot; if the slot is blank it degrades to the neutral default and says so — it does **not** reach
for a remembered real value.

## Encoding your house voice (`caseAuthoring`)

The `caseAuthoring` slot is how a team makes authored cases read in **its** voice without touching a
committed engine. The shared authoring core (`knowledge/authoring/house-style.md`), consumed by both
`author-api-cases` and `author-ui-cases`, reads these sub-fields and falls back to the neutral default for
any left blank:

| Sub-field | What it sets | Neutral default when blank |
|---|---|---|
| `titleConvention` | the test-case title shape | `[Module] - [Feature] - Verify that <behavior>.` |
| `stepFormat` | the step/expected shape | a `# / Action / Expected Result` table, one atomic action per row |
| `tags` | tags stamped on every case | none beyond the case's own domain tags (`@api` / `@ui`) |
| `voice` | tone / phrasing rules | behavior-driven, imperative third-person, one explicit expected per step |

Fill only what differs from the default; a blank sub-field keeps the neutral house style, and the engine
says when a default is in use. These are **formats and wording** — never a real product name, account or
secret (those are other slots, or `.env`). A neutral worked block lives in the `caseAuthoring` section of
`house-profile.example.json`.

## Why the seam matters

- **Engines stay neutral and committable.** Because every product specific is a slot read at run time,
  the engines, the orchestrator and the examples contain nothing that names a product — so the plugin
  passes the product/secret scan and ships clean.
- **One instance among many.** The example is generic on purpose. A team using Jira + their own product
  fills the identical slots; nothing in the committed plugin assumes Azure DevOps or any one product.
- **Secrets never enter it.** The profile is names and formats. Anything secret (tokens, passwords,
  keys) lives in `.env`; the tracker signs in interactively. The profile is safe to keep locally but is
  still git-ignored because it carries the team's real org/board/identity values.

## Done when

- [ ] `house-profile.json` lives at the framework root and is **git-ignored** (plugin + template)
- [ ] A neutral `house-profile.example.json` is **tracked** and uses generic placeholders only
- [ ] Every product-, tracker-, voice- and identity-specific value is a **slot**, read by the engines, never hard-coded
- [ ] The orchestrator falls back to neutral defaults when the profile is absent and names the slot to fill
- [ ] No secret appears in the profile or this contract; credentials stay in `.env`
- [ ] Nothing in the committed plugin names a real product, org, board, URL or account
