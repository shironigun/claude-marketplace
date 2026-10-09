---
name: releaser
description: Write client-facing Acme CRM (Acme) RELEASE NOTES and feature announcements in the support lead and the support team's house style — turning the team's technical drafts or closed Azure DevOps tickets into short, benefit-led client notes, and deciding what to announce vs. suppress. Use this skill WHENEVER the user wants to write, draft, prep, review, or finalize release notes, a feature announcement, a "What's New" / the in-app announcements tool post, or a KB announcement — or says things like "turn this into release notes", "draft the announcement for clients", "what do we tell clients about this release", or pastes a technical draft / changelog / ticket list and asks for client notes. Also trigger when deciding whether something is worth announcing or which shipped items to include vs. exclude. Sibling of storyteller, buggy, bugger, defector, commentor — use THIS one for client release notes / announcements.
---

# Acme CRM Release-Notes Authoring

Turn engineering reality (the team's technical draft, an spec docs/flow doc, a pasted changelog, or a window of closed Azure DevOps tickets) into a **finalized client-facing release note** in the voice the support lead and the support team publish to clients — and make the editorial calls about what clients see.

**The core skill is suppression, not prose.** Anyone can write cheerful copy. In the Feb '26 Related Contacts release, ~40 items closed on the CRM Team board the day before ship (analytics-field bugs, over-sending-control breakage, DMS-B parity fixes, tree-display dupes, CSV export, plus internal stories like a Wholegoods API swap and an Android build) — and the client note announced **one** feature. Your job is to find the one thing clients can *do* with this release, say it well, and quietly drop everything else. When in doubt about whether something belongs, it probably doesn't.

**Before drafting anything non-trivial, read `references/exemplars.md`** — it holds four full finalized notes (Related Contacts, Facebook Messenger, Text-to-Pay 3.0, MUI), the annotated draft->final deltas with the support lead's own reasoning for each cut, and the module-ROI microcopy pattern. That file is the source of truth for voice and judgment; this file summarizes the rules.

## The pipeline you are automating

the QA analyst (QA->BA) writes the exhaustive technical draft — every behavior, constraint, per-DMS quirk, and edge case ("buggy mindset"). the support lead rewrites it into a client benefit story and decides what to include. the editor does presentation edits. the release manager owns timing and tier/DMS scoping; managerial approval gates publish. **This skill performs the QA analyst -> the support lead transform**: keep the team's accuracy, discard his exhaustiveness, produce the support lead's note. Draft as the support lead would; preserve the true constraints the QA analyst would insist on.

## Context you can assume (from project memory)

- **Org:** acme-org · **Project:** Agile Project (GUID `00000000-0000-0000-0000-000000000000`).
- **Boards / area paths:** `Agile Project\CRM Team` (sprint/feature work — **the only real source for release-note candidates**) and `Agile Project\SWAT` (production firefighting + per-client support — **essentially never client-announcement material**; treat as omit-by-default).
- **DMS / plans:** `DMS-A`, `DMS-C` (a.k.a. DMS-C/DMS-C), `DMS-B`, `DMS-A`, `DMS-D`. Feature availability differs by DMS and by tier (`Connect` / `Engage` / `Complete`). Getting the availability line right matters more to clients than the feature copy.
- **Product surface:** Acme CRM / Acme Notify — Messenger, Broadcasts, Surveys, Feedback, Customers, Customer Groups, Tasks, Automations, Deals, Payments (Text-to-Pay), Inventory, Settings, Dashboard, Website Widget.
- **People:** the QA analyst (`qa@example.com`, QA->BA, drafts + accuracy), the support lead (support/training lead, owns client notes + webinars, final editorial authority — "you're the expert here"), the editor (presentation edits/approval), the release manager (timing, tiers, approval), a developer / a developer (dev).
- **Publishing:** notes ship through **the in-app announcements tool** (and the "What's New" panel); depth lives in the Knowledgebase at **learn.example.com**; every note closes with a **webinar CTA** (the team's the scheduling tool — always framed as *our* webinars, never one person's; see Voice) and a **support pointer**. The support pointer is brand-specific: Acme CRM notes point to the in-app **chat button** (bottom-left); **Acme Notify has NO chat button — point Acme Notify/DMS-A clients to DMS-A support instead.** Screenshots are added by the support lead by hand — leave clearly-labeled placeholders.
- **Auth:** use the connected Azure DevOps MCP tools (`ado:wit_*`). If a tool returns "not found" or hangs after a reconnect, the connector hasn't re-registered — tell the user to toggle the Azure DevOps connector off/on; there is no bash fallback (ADO domains are off the network allowlist).

## Workflow

Two entry modes — detect which from the request.

**Mode A — Transform (user pastes material).** They give you a technical draft, an spec docs/flow doc, a changelog, or a ticket. Skip straight to Triage -> Draft.

**Mode B — Pull from ADO (user says "what shipped since last notes" / "prep this week's release notes" / gives a date window).**
1. Query **closed CRM Team** items in the window (WIQL below). Ignore SWAT unless the user explicitly says a production fix is broadly client-relevant.
2. Batch-fetch titles + type + tags; group by feature area.
3. Run **Triage** on the grouped list. Collapse a feature + its supporting bug pile into a single announce candidate.
4. Present the triage table (announce / fold-in / omit / defer, with one-line reasons) **before drafting** — this is where the support lead's judgment gets confirmed and where you flag "is there even enough to announce?"
5. Draft the note from the announce set only.

```
# closed CRM Team items in a release window (Mode B)
SELECT [System.Id],[System.Title],[System.WorkItemType],[System.State],[System.Tags],[Microsoft.VSTS.Common.ClosedDate]
FROM WorkItems
WHERE [System.TeamProject] = 'Agile Project'
  AND [System.AreaPath] UNDER 'Agile Project\CRM Team'
  AND [System.State] IN ('Closed','Done','Resolved')
  AND [Microsoft.VSTS.Common.ClosedDate] >= '<from>' AND [Microsoft.VSTS.Common.ClosedDate] < '<to>'
ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC
```

Always draft, show the user, and get sign-off **before** anything is treated as publish-ready. Notes go to real clients — accuracy and scoping are reviewed by the support lead/the editor/the release manager, never auto-published.

## Triage — the include/exclude engine (the heart of the skill)

Classify every item into one of four buckets. The reasoning behind each rule matters more than the rule — apply the spirit, not a keyword match.

**ANNOUNCE** — a net-new thing a client can *do*, or a change they will visibly feel.
- New capability with a user-facing action: broadcast to related contacts, Facebook Messenger, Text-to-Pay overpayment/deposit, Text-to-Pay reaching a new DMS, camera switching in video calls, cellphone shown on deal search.
- A major redesign the client will notice (MUI). Pair it with reassurance (see Voice).
- Name it by **client benefit, not the internal capability name.** "Consent Management" meant nothing to anyone until it was reframed as "Send Broadcasts to Related Contacts" — clients buy the verb, not the subsystem. Lead every feature with what they can now accomplish.

**FOLD-IN / SOFTEN** — real work, no crisp new client action.
- Performance/refactor with no visible change -> one vague, upbeat paragraph ("behind-the-scenes improvements... faster, steadier, more dependable"), never the mechanism. (The May '26 "Improve Messaging Hook" story became exactly this.)
- Highlighting *existing* UI positively is allowed even if it isn't new ("even if the tree design was always there, it doesn't hurt to remind clients").

**OMIT** — never reaches the client note.
- **Bug fixes that merely make the announced feature work.** They are the *cost* of the feature, not the feature. The ~40 Feb bugs (analytics name/cellphone fields, DMS-B parity, duplicate contacts, tree dupes, CSV/export gaps, unsubscribe-toggle behavior) were all absorbed silently into one feature line.
- **Anything clients already assume still works.** Over-sending control was deliberately dropped: "customers will assume OSC continues to apply as it always has" — announcing it invites doubt that it ever did.
- **"Not a functional change from what they had before."** The 10-test-messages/day limit (now just shown on screen), primary-contact opt-in toggles ("not a new feature in a way that substantially changes the customer experience").
- **Small reformatting/polish** — an analytics column rename, a missing filter chip -> defer to "a small addition in the next release," don't headline it.
- **Pure internal / plumbing** — API-source swaps (Wholegoods from DMS-E), build numbers, endpoint config, iOS/Android publishing tasks, role-retrieval/DMS-D API work, user-sync internals. "Nothing new for clients — just keeping everyone informed."
- **Rare edge cases** — the Facebook double-account-merge scenario ("infrequent enough that this should not be an issue"). Don't teach clients to fear corners they'll rarely hit.
- **Narrow fixes in lightly-used features — especially ones nobody noticed.** A bug fix that touches only a feature a small minority uses stays out of the note. the support lead cut the whole "Add your own links to messages" section (embedding links in *email* broadcasts) because maybe 1 in 10 clients use email broadcasts at all: for the majority it changes nothing, and announcing it only alerts people to a problem they never knew existed. Weigh usage share, not just whether the fix is real.
- **The entire SWAT board** — per-client support (phone validation, add number, block spam, add users) and production defects (broadcast at 2am, MMS stuck). Firefighting is not a feature.

**DEFER TO KB** — true and useful, but too deep or too niche for the note.
- Workflow depth and lightly-used paths (e.g. the Email Type filter): "I discuss that in the KB. I'm trying not to let the notes get too long." Notes stay short and screenshot-scannable because **clients mostly skim shared screenshots to see what changed.** Put the detail in learn.example.com and keep the note to the headline.

When triage leaves nothing but omit/defer items, say so plainly: "there isn't enough net-new client value here to warrant a note this week" is a valid, expected output — the support lead asks exactly this ("are there enough new features to be worth announcing?").

## Note structure — house template

Not every section every time; scale to the release. The arc is consistent:

1. **Headline + hook** — emoji + benefit framing. Big items get excitement ("It's Finally Here: Facebook Messenger Is Now Inside Acme CRM!"); routine ones stay plain ("Release Notes — Video Call Improvements").
2. **One-sentence "what this lets you do"** intro, in client terms.
3. **What's New** — one block per ANNOUNCE item; emoji subheads; 1-3 short benefit bullets each.
4. **How it works / How to set it up** — numbered steps; gate admin-only setup clearly ("Admins Only"). Keep to the happy path.
5. **Availability callout** — DMS/tier scope, loud, especially exclusions (see below).
6. **Why this matters** — 3-4 outcome bullets (respond faster, fewer missed leads, get paid sooner).
7. **Close** — "That's It!" + webinar CTA (our webinar, the scheduling tool — framed as the team's, never an individual's) + KB link (learn.example.com) + the brand's support pointer (Acme CRM: in-app chat button, bottom-left; **Acme Notify: DMS-A support — it has no chat button**). Optional forward hook ("AI is coming") only when pre-cleared with the editor.
8. **[SCREENSHOT: ...]** placeholders where the support lead will drop images; add an icon legend if the feature introduces new icons.

## Voice rules (what makes it read as the support lead's client copy)

- **Second person, warm, enthusiastic, plain.** Short sentences. Light emoji as section markers, not decoration. Contractions. Exclamation points in moderation.
- **Benefit before mechanism.** Every feature answers "what can I now do / why do I care," then how.
- **Reassure on change.** Redesigns open with "you're not losing anything — every tool you use today is still there." Client anxiety about a moved button outweighs delight at a new one.
- **Confident, never hedged.** No "should," no caveats stacked in the body — a single true limitation, stated calmly, is fine; a list of edge cases is not.
- **Scannable.** Assume the client reads the headline, the bold bits, and the screenshots. Front-load meaning.
- **Short beats complete.** If it's getting long, the depth belongs in the KB. ~90% of broadcasts are SMS — don't over-document email-only paths in the note.
- **Go easy on em-dashes.** In the *finished client note*, a pile of em-dashes reads as "obviously AI-generated" (the support lead counted a dozen in a single note and cut them). Prefer a period, a comma, or a labeled sub-header; rewrite em-dash-joined clauses into separate sentences. (This restraint is for the client copy — not for this skill's own prose.)
- **Don't tell clients how to feel.** Never prescribe a subjective reaction ("feeling more polished with every release"). State what *we're doing* instead — "we're constantly optimizing for best performance." Clients decide how they feel; you report what changed.
- **Delineate separate screens.** When one bullet list mixes features from two distinct screens (e.g., an open Order vs. adding Quotes to Deals), split it with a labeled sub-header ("Adding Quotes to Deals:") so clients don't read two screens as one. Don't lump distinct areas under an undifferentiated list.
- **One "we keep improving" paragraph, never two.** The vague behind-the-scenes / always-improving note appears at most once. If you already have a "your workspace keeps getting better" line, don't also stack a separate "faster behind the scenes" paragraph on top of it — it's redundant.

This is the inverse of the `storyteller`/`buggy` voice. Those are precise, "shall"-driven, exhaustive, ALL-CAPS-domain-keyword internal artifacts. Release notes are the opposite: benefit-led, forgiving, client-plain. Do **not** carry QA voice into a client note. (One shared habit survives: ALL-CAPS the DMS names in availability callouts.)

## Availability callouts (clients care most about this)

State DMS/tier scope explicitly, and make **exclusions unmissable**. Inclusions can be a checklist; exclusions get shouted:

```
DMS-A & DMS-C Clients Only
(Yes — this feature is ONLY available for DMS-A and DMS-C. It is NOT AVAILABLE for DMS-A or DMS-B.)
```
```
Availability:  DMS-A (yes)   DMS-C (yes)   DMS-B / DMS-A (not at this time)
```
A client discovering after the fact that a feature isn't on their DMS is the #1 support complaint the callout prevents. If availability is uncertain, make it an open question (below), not a guess.

## Accuracy layer (the team's contribution — keep it)

Discard the team's exhaustiveness, but **carry the true constraints** he would insist on, and never announce something false or misattributed:

- Fold in the real gotcha in one plain line: a **closed invoice** is required to receive a broadcast from a non-primary location; `@amountOwed` reflects the last DMS/DMS-E sync (may lag if not real-time); Facebook credentials can expire after ~65 days of no login; the Facebook 7-day reply window.
- **Kill anything that isn't real or isn't this feature** — the QA analyst removed a whole "Unassigned Conversation notifications" section from the FB doc because it had nothing to do with Facebook. Verify a claimed behavior exists before writing it.
- **Describe the exact action, never a bigger flow it implies.** "Grab an existing quote and attach it right to their deal card," *not* "move a customer from quote to paid" — the second implies you can complete the deal and take payment on the Deals screen, which you can't. Claim only what the feature literally does.
- **Match the verb to whether a step is required or optional.** Don't write "you *can*" for something mandatory — reference numbers are required for Text-to-Pay, so it's "you add a reference number," not "you can add one." "Must," "can," and "may" each make a factual promise; get it right.
- **State prerequisites precisely.** "Text-to-Pay must be enabled with one of our payment partners," not the vaguer "Text-to-Pay must be turned on." Name what a feature actually depends on.
- **Name the exact screen or location.** "See MSRP on the **Inventory Screen**," not a general "in inventory." Point clients to where the change actually appears.
- **Anchor references to past releases in concrete time.** "Here's what's new since the fresh look arrived **back in June**," not a vague "recently" or an undated "since the fresh look arrived." Give clients a real time marker.
- Surface unresolved facts as **Open Questions for the support lead/the QA analyst/the release manager to confirm before publish**, with an owner — availability/tier scope, exact DMS support, whether a limit is new, real-time vs. delayed data. A note published with a wrong availability line is worse than one held a day for confirmation.

## Brand variants — Acme Notify (DMS-A) and Acme CRM

The platform ships under two client-facing brands: **Acme CRM** (the general brand) and **Acme Notify / Acme Notify** (the brand DMS-A clients see). Same product — the client note usually needs one version per brand. Branding is a **profile you apply at draft time, not a rewrite**: the body stays identical unless a feature genuinely differs by brand/DMS (that is an availability call, handled above — not a wording change).

A **brand profile** = { product name used throughout the prose; audience/DMS emphasis; KB URL; webinar CTA; **support/help pointer**; any renamed UI terms }. Defaults:
- **Acme CRM** — product name "Acme CRM"; general client audience; KB `learn.example.com`; our Acme CRM webinar (the scheduling tool, framed as *our* webinar); **support pointer = in-app chat button (bottom-left)**; standard UI terms.
- **Acme Notify (Acme Notify)** — product name "Acme Notify"; DMS-A-client audience (DMS-A-facing work usually lands here); its own KB/webinar destinations **if different** (confirm — Open Question if unknown); **support pointer = DMS-A support, NOT a chat button** — Acme Notify has no bottom-left chat button, so never tell Acme Notify clients to use one.

How to apply:
- When a release includes **DMS-A-facing work, produce both variants by default** (Acme CRM + Acme Notify) — the same release reaches both audiences under different names. Otherwise produce the brand the user names.
- Swap only the profile fields; keep structure, voice, feature copy, and availability logic **identical** across variants.
- **Keep the two in sync.** They should differ ONLY by the profile. If you catch yourself changing the substance between them, that is a real feature/DMS difference — express it in the Availability callout and flag it, don't let the two notes quietly drift apart.
- If a brand's KB/webinar link or in-UI product name isn't confirmed, list it as an Open Question rather than guessing.

**Brand-name isolation (hard rule).** A Acme Notify note must never contain the word "Acme CRM," and an Acme CRM note must never contain "Acme Notify." The other brand’s name (and brand-specific URLs) leaking across is the single most common failure. **Before delivering any note, scan the finished draft for the opposite brand’s name and replace every occurrence** — headlines included, since that is where it slips through.

## Output & handoff

- Produce the note as clean Markdown by default; offer a `.docx` (via the `docx` skill) when the user wants the reviewable/attachable artifact the support lead circulates, or a the in-app announcements tool-ready block when they're about to publish.
- Include `[SCREENSHOT: description]` placeholders and, if new icons appear, an icon legend — the support lead adds real images by hand.
- End your delivery with: the **triage summary** (what you announced vs. omitted/deferred and why), any **Open Questions** blocking publish, and the **suggested timing** note (below). Do not represent the note as published — it goes through the support lead/the editor/the release manager review and managerial approval.

**Timing guidance to surface, not decide:** avoid Monday holidays; release big/setup-heavy features **Monday morning** so support is available and clients don't self-serve over the weekend; publish notes only **after** the release is confirmed live on production without rollback; small items can ride "with the next batch." the support lead/the release manager set the actual schedule.

## Bonus pattern — module ROI microcopy

Client-facing upgrade/paywall copy (the "module blocked" popup: a one-line module pitch + four ROIs per module) is the same voice, compressed: **each ROI <= 60 characters, benefit/outcome-led, concrete, grounded.** "10,000 texts in 7 minutes. SMS, MMS, or email." / "Promoters go to Google. Detractors stay internal." See `references/exemplars.md` for the full set and rules; reuse when asked for tier/upgrade or module-pitch copy.

## Hard rules

- **Suppress aggressively.** The default for any given shipped item is *omit*. Announce only what earns it. A short note that says one true thing beats a long one that dumps the sprint.
- **Never announce a bug fix as a feature**, never announce internal/plumbing work, never pull from SWAT by default.
- **Name features by client benefit**, not internal/subsystem names.
- **Get the availability line right or flag it** — never guess DMS/tier scope.
- **Never auto-publish or imply published.** Draft -> user/the support lead review -> approval. Screenshots and the live webinar/KB links are added by the support lead.
- **Never leak the other brand name.** Scan every finished note for the opposite brand (an Acme Notify note says only "Acme Notify"; an Acme CRM note says only "Acme CRM"), headline included, before delivering.
- **Team framing, never an individual.** In client-facing copy, attribute webinars, training, and support to the team ("our webinars," "our support team") — never to a person ("the support lead's webinar"). Support tiers handle clients, not one named expert.
- **Get the brand's support pointer right.** Acme CRM closes with the in-app chat button (bottom-left); Acme Notify has none — send Acme Notify/DMS-A clients to DMS-A support. Never tell an Acme Notify client to use a chat button.
- **Go easy on em-dashes in the note.** A cluster of em-dashes reads as AI-generated; prefer periods, commas, or labeled sub-headers in the finished client copy.
- **Don't invent behavior.** If it isn't confirmed real, it's an Open Question, not a sentence in the note.
- If the ask is a **user story** use `storyteller`; **test cases** `buggy`; a **bug/defect** `bugger`/`defector`; a **comment** `commentor`. This skill is for **client release notes / announcements** only.
