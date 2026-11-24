---
name: releaser
description: >-
  Writes client-facing release notes and feature announcements in a support-team house style, turning a
  technical draft, a harvester inventory or closed tracker tickets into short, benefit-led client notes, and
  decides what to announce versus suppress. Produces one variant per client-facing brand. Use when the user
  wants to write, draft, prep, review or finalize release notes, a feature announcement, a What's New or
  in-app announcement post, or a knowledge-base announcement, or says things like "turn this into release
  notes", "draft the announcement for clients", "what do we tell clients about this release", or pastes a
  technical draft, changelog or ticket list and asks for client notes. Also use when deciding whether
  something is worth announcing or which shipped items to include or exclude.
---

# Release-Notes Authoring

Turn engineering reality (a technical draft, a spec or flow doc, a `harvester` inventory, a pasted changelog, or a window of closed tracker tickets) into a **finalized client-facing release note** in the voice the support team publishes to clients, and make the editorial calls about what clients see.

**The core skill is suppression, not prose.** Anyone can write cheerful copy. In a typical feature release, ~40 items close on the delivery board the day before ship (analytics-field bugs, a broken safeguard, partner-parity fixes, display duplicates, a CSV export, plus internal stories like an API-source swap and a mobile build) and the client note announces **one** feature. Your job is to find the one thing clients can *do* with this release, say it well, and quietly drop everything else. When in doubt about whether something belongs, it probably doesn't.

**Before drafting anything non-trivial, read `references/exemplars.md`.** It holds four full finalized notes, the annotated draft->final deltas with the editorial reasoning for each cut, and the module-ROI microcopy pattern. That file is the source of truth for voice and judgment; this file summarizes the rules.

## The pipeline you are automating

The **drafter** (`roles.drafter`, usually QA/BA) writes the exhaustive technical draft: every behavior, constraint, per-partner quirk and edge case. The **editorial owner** (`roles.editorialOwner`) rewrites it into a client benefit story and decides what to include. The **copy editor** (`roles.copyEditor`) makes presentation edits. The **release owner** (`roles.releaseOwner`) owns timing and plan/partner scoping; their approval gates publish. **This skill performs the drafter -> editorial-owner transform**: keep the drafter's accuracy, discard their exhaustiveness, produce the editorial owner's note.

## Step 0 — Workspace profile

Read `references/workspace-profile.md`, then load `.claude/workspace-profile.json` from the user's project. This skill needs:
`product.name`, `product.modules`, `tracker.*` and `boards.*` (Mode B only), `variants`, `plans`, `brands`, `roles`.
If any are missing, run discovery for those keys only, confirm with the user, save, then continue. Mode A (transforming pasted material) needs only `variants`, `plans` and `brands`; ask for those rather than scanning when no tracker is connected.

What the profile gives you:
- **Boards:** the delivery board (`boards.delivery.areaPath`) is **the only real source for release-note candidates**. The support board (`boards.support.areaPath`) is production firefighting and per-client support: **essentially never client-announcement material**; omit by default.
- **Integration partners and plans:** `variants` (labelled `variants.label`: ERP, POS, PMS…) and `plans` (tiers/editions). Feature availability often differs by partner and by plan. Getting the availability line right matters more to clients than the feature copy.
- **Product surface:** `product.modules`, the names clients see in the UI.
- **Brands:** `brands[]`, one profile per client-facing brand of the same product (see **Brand variants**).
- **Tools:** use the connected tracker MCP tools. If a tool returns "not found" or hangs after a reconnect, the connector hasn't re-registered: tell the user to toggle the connector off and on.

## Workflow

Two entry modes. Detect which from the request.

**Mode A — Transform (user pastes material).** A technical draft, a spec/flow doc, a changelog, a ticket, or a `harvester` inventory. Skip straight to Triage -> Draft.

**Mode B — Pull from the tracker (user says "what shipped since last notes" / "prep this week's release notes" / gives a date window).**
1. Query **closed delivery-board** items in the window (WIQL below; translate for other trackers). Ignore the support board unless the user explicitly says a production fix is broadly client-relevant. For a complete picture including non-ticketed deployments, offer to run `harvester` first.
2. Batch-fetch titles + type + tags; group by feature area.
3. Run **Triage** on the grouped list. Collapse a feature + its supporting bug pile into a single announce candidate.
4. Present the triage table (announce / fold-in / omit / defer, with one-line reasons) **before drafting**. This is where the editorial owner's judgment gets confirmed and where you flag "is there even enough to announce?"
5. Draft the note from the announce set only.

```
# closed delivery-board items in a release window (Mode B, Azure DevOps)
SELECT [System.Id],[System.Title],[System.WorkItemType],[System.State],[System.Tags],[Microsoft.VSTS.Common.ClosedDate]
FROM WorkItems
WHERE [System.TeamProject] = '<tracker.project>'
  AND [System.AreaPath] UNDER '<boards.delivery.areaPath>'
  AND [System.State] IN ('Closed','Done','Resolved')
  AND [Microsoft.VSTS.Common.ClosedDate] >= '<from>' AND [Microsoft.VSTS.Common.ClosedDate] < '<to>'
ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC
```

Always draft, show the user, and get sign-off **before** anything is treated as publish-ready. Notes go to real clients: accuracy and scoping are reviewed by the editorial owner, copy editor and release owner, never auto-published.

## Triage — the include/exclude engine (the heart of the skill)

Classify every item into one of four buckets. The reasoning behind each rule matters more than the rule: apply the spirit, not a keyword match.

**ANNOUNCE** — a net-new thing a client can *do*, or a change they will visibly feel.
- New capability with a user-facing action: campaigns to secondary contacts, a new messaging channel in the inbox, deposits or overpayments on payment links, a payment feature reaching a new integration partner, camera switching in video calls, a mobile number shown in pipeline search.
- A major redesign the client will notice. Pair it with reassurance (see Voice).
- Name it by **client benefit, not the internal capability name.** "Preference Center" meant nothing to anyone until it was reframed as "Send Campaigns to Secondary Contacts": clients buy the verb, not the subsystem. Lead every feature with what they can now accomplish.

**FOLD-IN / SOFTEN** — real work, no crisp new client action.
- Performance/refactor with no visible change -> one vague, upbeat paragraph ("behind-the-scenes improvements... faster, steadier, more dependable"), never the mechanism. (An "improve the messaging hook" story becomes exactly this.)
- Highlighting *existing* UI positively is allowed even if it isn't new ("even if the tree design was always there, it doesn't hurt to remind clients").

**OMIT** — never reaches the client note.
- **Bug fixes that merely make the announced feature work.** They are the *cost* of the feature, not the feature. A pile of ~40 bugs (analytics fields, partner parity, duplicate contacts, tree dupes, export gaps, unsubscribe-toggle behavior) gets absorbed silently into one feature line.
- **Anything clients already assume still works.** A long-standing safeguard (say, a send-frequency cap) is deliberately not mentioned: "customers will assume it continues to apply as it always has". Announcing it invites doubt that it ever did.
- **"Not a functional change from what they had before."** An existing daily limit that is now merely shown on screen; opt-in toggles on the primary contact ("not a new feature in a way that substantially changes the customer experience").
- **Small reformatting/polish**: an analytics column rename, a missing filter chip -> defer to "a small addition in the next release," don't headline it.
- **Pure internal / plumbing**: API-source swaps, build numbers, endpoint config, app-store publishing tasks, role-retrieval or partner API work, user-sync internals. "Nothing new for clients, just keeping everyone informed."
- **Rare edge cases**: an account double-merge scenario ("infrequent enough that this should not be an issue"). Don't teach clients to fear corners they'll rarely hit.
- **Narrow fixes in lightly-used features, especially ones nobody noticed.** A fix that touches only a feature a small minority uses stays out of the note. Example: a whole "add your own links to messages" section (an email-only fix) was cut because maybe 1 in 10 clients send email campaigns at all: for the majority it changes nothing, and announcing it only alerts people to a problem they never knew existed. Weigh usage share, not just whether the fix is real.
- **The entire support board**: per-client support (number setup, spam blocking, adding users) and production defects (a campaign sent at 2am, a message stuck In Progress). Firefighting is not a feature.

**DEFER TO KB** — true and useful, but too deep or too niche for the note.
- Workflow depth and lightly-used paths (e.g. a secondary filter): "I discuss that in the KB. I'm trying not to let the notes get too long." Notes stay short and screenshot-scannable because **clients mostly skim shared screenshots to see what changed.** Put the detail in the brand's knowledge base (`brands[].kbUrl`) and keep the note to the headline.

When triage leaves nothing but omit/defer items, say so plainly: "there isn't enough net-new client value here to warrant a note this week" is a valid, expected output. The editorial owner asks exactly this ("are there enough new features to be worth announcing?").

## Note structure — house template

Not every section every time; scale to the release. The arc is consistent:

1. **Headline + hook**: emoji + benefit framing. Big items get excitement ("It's Finally Here: Social Messaging Is Now in Your Inbox!"); routine ones stay plain ("Release Notes — Video Call Improvements").
2. **One-sentence "what this lets you do"** intro, in client terms.
3. **What's New**: one block per ANNOUNCE item; emoji subheads; 1-3 short benefit bullets each.
4. **How it works / How to set it up**: numbered steps; gate admin-only setup clearly ("Admins Only"). Keep to the happy path.
5. **Availability callout**: partner/plan scope, loud, especially exclusions (see below).
6. **Why this matters**: 3-4 outcome bullets (respond faster, fewer missed leads, get paid sooner).
7. **Close**: "That's It!" + webinar CTA (`brands[].webinarCta`, framed as the team's, never an individual's) + KB link (`brands[].kbUrl`) + the brand's support pointer (`brands[].supportPointer`; never assume every brand has the same one). Optional forward hook ("more is coming") only when pre-cleared with the copy editor.
8. **[SCREENSHOT: ...]** placeholders where the editorial owner will drop images; add an icon legend if the feature introduces new icons.

## Voice rules (what makes it read as the support team's client copy)

- **Second person, warm, enthusiastic, plain.** Short sentences. Light emoji as section markers, not decoration. Contractions. Exclamation points in moderation.
- **Benefit before mechanism.** Every feature answers "what can I now do / why do I care," then how.
- **Reassure on change.** Redesigns open with "you're not losing anything: every tool you use today is still there." Client anxiety about a moved button outweighs delight at a new one.
- **Confident, never hedged.** No "should," no caveats stacked in the body. A single true limitation, stated calmly, is fine; a list of edge cases is not.
- **Scannable.** Assume the client reads the headline, the bold bits, and the screenshots. Front-load meaning.
- **Short beats complete.** If it's getting long, the depth belongs in the KB. Don't over-document a minority channel's path in the note.
- **Go easy on em-dashes.** In the *finished client note*, a pile of em-dashes reads as "obviously AI-generated" (a dozen in a single note were counted and cut). Prefer a period, a comma, or a labeled sub-header; rewrite em-dash-joined clauses into separate sentences. (This restraint is for the client copy, not for this skill's own prose.)
- **Don't tell clients how to feel.** Never prescribe a subjective reaction ("feeling more polished with every release"). State what *we're doing* instead: "we're constantly optimizing for best performance." Clients decide how they feel; you report what changed.
- **Delineate separate screens.** When one bullet list mixes features from two distinct screens (e.g., an open Order vs. adding Quotes to a pipeline card), split it with a labeled sub-header ("Adding Quotes to Deals:") so clients don't read two screens as one.
- **One "we keep improving" paragraph, never two.** The vague behind-the-scenes / always-improving note appears at most once.

This is the inverse of internal QA voice (precise, "shall"-driven, exhaustive, ALL-CAPS domain keywords). Release notes are benefit-led, forgiving, client-plain. Do **not** carry QA voice into a client note. (One shared habit survives: ALL-CAPS the integration-partner names in availability callouts.)

## Availability callouts (clients care most about this)

State partner/plan scope explicitly, and make **exclusions unmissable**. Inclusions can be a checklist; exclusions get shouted:

```
PARTNER-A & PARTNER-C Clients Only
(Yes — this feature is ONLY available for PARTNER-A and PARTNER-C. It is NOT AVAILABLE for PARTNER-B or PARTNER-D.)
```
```
Availability:  PARTNER-A (yes)   PARTNER-C (yes)   PARTNER-B / PARTNER-D (not at this time)
```
Use the real names from `variants.values` (and `plans` when the gate is a tier). A client discovering after the fact that a feature isn't on their integration or plan is the #1 support complaint the callout prevents. If availability is uncertain, make it an open question (below), not a guess.

## Accuracy layer (the drafter's contribution — keep it)

Discard the drafter's exhaustiveness, but **carry the true constraints** they would insist on, and never announce something false or misattributed:

- Fold in the real gotcha in one plain line: a **completed order** is required before a secondary location's number is used; a balance merge field reflects the last partner sync (may lag if not real-time); a connected social account's login can expire after a period of no use; a platform's reply window.
- **Kill anything that isn't real or isn't this feature.** A whole notifications section was once removed from a social-messaging doc because it had nothing to do with that feature. Verify a claimed behavior exists before writing it.
- **Describe the exact action, never a bigger flow it implies.** "Grab an existing quote and attach it right to their deal card," *not* "move a customer from quote to paid". The second implies you can complete the deal and take payment on that screen, which you can't. Claim only what the feature literally does.
- **Match the verb to whether a step is required or optional.** Don't write "you *can*" for something mandatory: if reference numbers are required, it's "you add a reference number," not "you can add one." "Must," "can," and "may" each make a factual promise; get it right.
- **State prerequisites precisely.** "Payment links must be enabled with one of our payment partners," not the vaguer "payments must be turned on." Name what a feature actually depends on.
- **Name the exact screen or location.** "See list price on the **Catalog screen**," not a general "in the catalog." Point clients to where the change actually appears.
- **Anchor references to past releases in concrete time.** "Here's what's new since the fresh look arrived **back in June**," not a vague "recently." Give clients a real time marker.
- Surface unresolved facts as **Open Questions for the editorial owner / drafter / release owner to confirm before publish**, with an owner: availability/plan scope, exact partner support, whether a limit is new, real-time vs. delayed data. A note published with a wrong availability line is worse than one held a day for confirmation.

## Brand variants — one note per client-facing brand

Many products ship under more than one client-facing brand (a primary brand plus partner-facing or white-label editions). Same product: the client note usually needs one version per brand. Branding is a **profile you apply at draft time, not a rewrite**: the body stays identical unless a feature genuinely differs by brand/partner (that is an availability call, handled above, not a wording change).

A **brand profile** (`brands[]`) = { product name used throughout the prose; audience; KB URL; webinar CTA; **support pointer**; any renamed UI terms }. Typical shape:
- **Primary brand**: product name = the primary brand name; general client audience; its KB and webinar; its support pointer (e.g. an in-app chat button).
- **Partner-facing brand(s)**: product name = that brand's name; audience = the clients of the partner it serves; its own KB/webinar destinations **if different** (confirm: Open Question if unknown); **its own support pointer, which may not be the same mechanism** (a partner edition may have no in-app chat and route clients to the partner's support instead). Never tell a brand's clients to use a support channel that brand doesn't have.

How to apply:
- When a release includes work aimed at a partner-facing brand's audience, **produce every brand's variant by default**: the same release reaches each audience under a different name. Otherwise produce the brand the user names. If `brands` has one entry, produce one note.
- Swap only the profile fields; keep structure, voice, feature copy, and availability logic **identical** across variants.
- **Keep the variants in sync.** They should differ ONLY by the profile. If you catch yourself changing the substance between them, that is a real feature/partner difference: express it in the Availability callout and flag it, don't let the notes quietly drift apart.
- If a brand's KB/webinar link or in-UI product name isn't confirmed, list it as an Open Question rather than guessing.

**Brand-name isolation (hard rule).** A note for one brand must never contain another brand's name or brand-specific URLs. Leaking across is the single most common failure. **Before delivering any note, scan the finished draft for every other brand's name and URL and replace each occurrence**, headlines included, since that is where it slips through.

## Output & handoff

- Produce the note as clean Markdown by default; offer a `.docx` when the user wants a reviewable/attachable artifact, or a block ready for the in-app announcement tool when they're about to publish.
- Include `[SCREENSHOT: description]` placeholders and, if new icons appear, an icon legend. Real images are added by hand.
- End your delivery with: the **triage summary** (what you announced vs. omitted/deferred and why), any **Open Questions** blocking publish, and the **suggested timing** note (below). Do not represent the note as published: it goes through editorial review and approval.

**Timing guidance to surface, not decide:** avoid Monday holidays; release big/setup-heavy features **Monday morning** so support is available and clients don't self-serve over the weekend; publish notes only **after** the release is confirmed live on production without rollback; small items can ride "with the next batch." The release owner sets the actual schedule.

## Bonus pattern — module ROI microcopy

Client-facing upgrade/paywall copy (the "module blocked" popup: a one-line module pitch + four ROIs per module) is the same voice, compressed: **each ROI <= 60 characters, benefit/outcome-led, concrete, grounded.** "10,000 texts in 7 minutes. SMS, MMS, or email." / "Promoters go public. Detractors stay internal." See `references/exemplars.md` for the full set and rules; reuse when asked for tier/upgrade or module-pitch copy.

## Hard rules

- **Suppress aggressively.** The default for any given shipped item is *omit*. Announce only what earns it. A short note that says one true thing beats a long one that dumps the sprint.
- **Never announce a bug fix as a feature**, never announce internal/plumbing work, never pull from the support board by default.
- **Name features by client benefit**, not internal/subsystem names.
- **Get the availability line right or flag it**: never guess partner/plan scope.
- **Never auto-publish or imply published.** Draft -> user/editorial review -> approval. Screenshots and live webinar/KB links are added by hand.
- **Never leak another brand's name.** Scan every finished note for the other brands' names and URLs, headline included, before delivering.
- **Team framing, never an individual.** In client-facing copy, attribute webinars, training, and support to the team ("our webinars," "our support team"), never to a person.
- **Get each brand's support pointer right.** Use `brands[].supportPointer`; never assume a channel a brand doesn't have.
- **Go easy on em-dashes in the note.** Prefer periods, commas, or labeled sub-headers in the finished client copy.
- **Don't invent behavior.** If it isn't confirmed real, it's an Open Question, not a sentence in the note.
- **Scope.** This skill writes client release notes and announcements only; the exhaustive internal inventory is `harvester`. Anything else (stories, test cases, bugs, ticket comments) is out of scope for this plugin: say so rather than improvising.
