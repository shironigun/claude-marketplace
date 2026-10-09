# Release-Notes Exemplars, Deltas & Reasoning

This file is the voice-and-judgment source of truth. It has three parts:
1. **Full finalized notes** — the published client copy, to match register.
2. **Draft→final deltas** — what the editor and the support lead cut or changed, with their reasoning. This is where the judgment lives.
3. **ADO calibration + ROI microcopy pattern.**

Read the deltas closely: the finished notes teach the *voice*, the deltas teach *what never makes it in and why*.

> **All examples below are fictional mock data.** Names (the editor, the support lead, the QA analyst) are
> roles, not people; features, quotes, DMS labels (DMS-A…DMS-D), URLs and numbers are illustrative. They
> demonstrate the voice and the cut/keep judgment — nothing here is a real release.

---

## EXEMPLAR 1 — "Send Broadcasts to Related Contacts"

Internal name: **Consent Management**. The richest example of the transform.

### 1a. the team's technical draft (condensed) — the input
Titled "Consent Management & Related Contacts Broadcasting." Exhaustive and precise: contacts gain a Birthday column and per-channel opt-in toggles; an "Include Related Contacts" switch in Customer Group filters (hidden for DMS-A), filtering customers first then nesting contacts in a tree; a cellphone filter with AND logic for pinpoint targeting; contacts included in broadcast segments but auto-excluded from surveys; over-sending-control logs now created for contacts; location rule (related contacts always receive from the primary location's number); a unified tree UI with the name columns collapsed to a single **Name** column and contacts in exports.

### 1b. The finalized client note (published, editor-trimmed) — the output
> **New Feature Update: Send Broadcasts to Related Contacts!**
> You can now send text and email broadcasts not only to a customer's main contact, but also to any related contacts (business managers, billing department, close family, etc.). Easier ways to reach your customers.
>
> **Updates to Contacts** — a Birthday column, and Phone/Email opt-in toggles when editing a contact. *Note: Only broadcasts can be sent to related contacts at this time. Surveys are planned for a future release.*
>
> **Add Related Contacts to Customer Groups** — an Include Related Contacts switch lets you include/exclude related contacts when building Customer Groups; when on, related contacts display under the main customer in a tree-style list.
>
> **Targeting a Specific Related Contact** — make sure the contact has a phone number and is opted in; apply the phone number as a filter; turn on Include Related Contacts; search by contact phone number.
>
> **Which Number Sends the Message?** — if a customer record has a closed invoice at a secondary location, the primary record receives from that location's marketing number; related contacts always receive from the primary location's number.
>
> **UI & Analytics Improvements** — a clearer tree structure; delivery info for contacts on broadcast cards; a simplified Name field; analytics stats for related contacts when included.
>
> **That's It!** We hope you love these updates. To attend a free webinar, click here to register! Questions? Use the chat button in the bottom-left corner of your Acme CRM.

### 1c. The deltas — what changed and why (the lesson)
- **Renamed the whole feature.** "Consent Management" → "Send Broadcasts to Related Contacts." Nobody could tell what "Consent Management" *did*; once it was clear the only consent managed was broadcast opt-in, the note was named for the client action. **Lesson: name by the verb the client performs, not the subsystem.**
- **Cut over-sending control entirely.** Reasoning: "customers will assume over-sending control still applies as it always has." **Lesson: don't announce what clients already assume is true — it plants doubt.**
- **Cut primary-contact opt-in toggles.** "Not a new feature that substantially changes the experience, so it doesn't bear mentioning."
- **Cut the analytics/export reformatting as its own item.** "Relatively small; doesn't bear specific announcement." (The column collapse is mentioned in passing, not headlined.)
- **Kept the tree design even though it wasn't new everywhere.** "It doesn't hurt to highlight it to clients." **Lesson: positively re-surfacing existing UI is fine.**
- **Deferred a live bug to the next release.** A missing filter chip when the toggle is active → "add it as a small follow-up that goes out next release."
- **Added the team's true constraint.** The QA analyst: the customer "needs a closed invoice (payment done) to receive a broadcast from that non-primary location" → "invoice" became "closed invoice" in the final.
- **Suppressed ~40 bug fixes silently.** Everything that made the feature work (analytics fields showing N/A, DMS-B parity, duplicate contacts, export gaps) never appears. They are the cost of the feature, not the feature.
- **Presentation edits.** Reworded the relatable examples and simplified phrasing — softer, more client-relatable.

---

## EXEMPLAR 2 — "Social Messaging Is Now Inside Acme CRM!"

Input: a multi-page flow doc (account linking, page→department mapping, filters, customer creation, merge, sync, limitations, "What If" scenarios). Output note:

> **It's Finally Here: Social Messaging Is Now Inside Acme CRM!**
> Customers have asked for this for a long time, and it's finally live. Connect your social inbox directly to Acme CRM so your team can manage messages without leaving the CRM. Faster replies, better tracking, fewer missed leads.
>
> **What's New?** Social messages show up in Acme CRM Messenger; reply right away; conversations stay tied to the correct department (each page connects to one department); conversations are clearly marked with an icon, and you can filter the inbox by channel.
>
> **How to Set It Up (Admins Only)** — Settings → Departments, pick the location, click Link, log in with the account credentials and approve access; then choose the page and link it. When connected the icon turns blue; one page = one department.
>
> **New Customers & Records** — a record is created automatically and marked with the connected account. If the customer already exists, merge; if not, use Sync on the Customer Review tab. Keeps data clean and avoids duplicates.
>
> **Important Rules to Know** — *Login expiration (low risk):* credentials may expire after 65 days with no login; for most clients not a concern since users log in daily. *7-day messaging window (very important):* if 7 days pass since the last message received, the conversation times out — check at least once a week. *Other limits:* conversations can't be reassigned or archived.
>
> **Why This Matters** — respond faster, keep conversations in one place, prevent dropped conversations.

### Deltas & reasoning
- **Removed a misattributed section.** The QA analyst: "the doc holds an unwanted section about email notifications — that has nothing to do with this feature." → cut. **Lesson: never announce behavior that isn't part of this feature; verify it's real.**
- **Cut a double-merge edge case.** After merging, replies still go to two separate threads (the platform can't merge identities). "Infrequent enough that this shouldn't be an issue." → omitted.
- **Kept two limitations, framed calmly.** The 65-day expiry ("low risk for most clients") and the 7-day reply window ("very important") — real constraints clients must know, stated without alarm.
- **Reframed a technical fact as reassurance.** The 65-day expiry only triggers with no *login* for 65 days; daily activity keeps it alive → "for most clients, this should not be a concern."
- **Suppressed the spec depth.** Attachment formats, voice-note limits, Data Review routing, permission-scope choices — all live in the KB, none in the note.
- **Timing call captured.** Big/setup-heavy feature → released Monday morning ("so clients don't set it up over the weekend while support is unavailable"), notes published only after prod confirmed stable.

---

## EXEMPLAR 3 — "Pay-by-Text 3.0 Is Here for More Clients!"

Note the **loud availability handling** — the pattern to copy whenever a feature is integration-gated.

> **Big News: Pay-by-Text 3.0 Is Here for More Clients!** Now both DMS-C clients and DMS-D can use Pay-by-Text 3.0 — faster payments, clearer requests, fewer mistakes, no matter which system you use.
>
> **Three Easy Ways to Request Payment** — *Balance:* pick the order, click send, customer pays via link, auto-applied to the correct invoice. *Deposit:* request a fixed amount or percentage. *Manual:* send a link for any amount and apply it manually.

And the companion **Overpayment** update shows the shouted-exclusion style:

> **Request Overpayments on Pay-by-Text Deposits** — *DMS-C & DMS-D Clients Only* (Yes — this is ONLY for DMS-C and DMS-D. It is NOT AVAILABLE for DMS-A or DMS-B.) You can now request an overpayment up to $1,000 extra — perfect for special orders.

### Deltas & reasoning
- **Availability is the loudest thing on the page**, repeated top and bottom, exclusions in caps. Clients on the wrong integration discovering this later is the support cost this prevents.
- **Omitted the "What's Fixed" list.** The draft had validation fixes (blocked letters in a percentage field, prevented empty percentage) → none announced; only the positive capability.
- **Simplified the mechanic.** The $1,000 cap stayed as a benefit; the exact error strings went to the KB.

---

## EXEMPLAR 4 — "Acme CRM Has a Brand-New Look"

The redesign playbook: reassure first, tease the future, push depth to KB.

> **Acme CRM Has a Brand-New Look — and a Lot of New Features!** Here's the most important thing up front: **you're not losing anything.** Every tool you use today is still there. Some buttons moved, some screens look different, but everything still works — in most cases better than before. … [docked panels; "My Items" filters; collapsible menu; smarter Dashboard; five-tab Customer Details; rebuilt Deals with tabs, products, quotes] …
> **Getting Ready for What's Next** — new capabilities are coming to Acme CRM. We're not ready to share details yet, but this new structure makes room for them. Stay tuned.
> **Watch the Walkthrough Webinars** … Or visit our knowledge base: learn.example.com.

### Deltas & reasoning
- **Reassurance leads**, because client anxiety about a redesign ("where did my button go?") is the real risk, not the features.
- **Forward-looking tease** only went in after management sign-off. **Lesson: forward teases only with sign-off.**
- **Cut a usage limit note.** "Not a functional change from what they had; we just put a note on screen."
- **Deferred a niche filter to the KB.** "Trying not to let the release notes get too long" — most clients scan for what changed.
- **Publish discipline.** Release through the in-app announcements tool once the update is confirmed live and not needing a rollback.

---

## EXEMPLAR 5 — Editor's edit pass (Acme CRM + Acme Notify)

Not a full note — a batch of small, deliberate edits made to a finalized draft, each a standing rule now. Grouped by brand.

### Acme CRM
- **Added a concrete time anchor.** Appended "Here's what's new since the fresh look arrived" with a dated reference. **Lesson: date past-release references; never leave "since the fresh look" undated.**
- **Fixed an implied capability.** Rewrote "move a customer from quote to paid without jumping between screens" to the literal action ("grab an existing quote and attach it to the deal card") because the original implied a flow the product can't do. **Lesson: describe the literal action, not a bigger flow it suggests.**
- **Delineated two screens with a labeled separator.** Added an "Adding Quotes to Deals:" sub-header because orders and quotes are separate screens. **Lesson: split a bullet list that spans distinct screens with a sub-header.**
- **Cut the em-dashes.** "A dozen em-dashes read as 'obviously AI-generated.'" **Lesson: em-dash restraint in the finished note.**
- **Made a prerequisite precise.** "Pay-by-Text must be turned on" → "must be enabled with one of our payment partners." **Lesson: name what a feature actually depends on.**
- **Stopped prescribing a feeling.** "feeling more polished with every release" → "we are constantly optimizing for best performance." **Lesson: report what we're doing, not how clients should feel.**
- **Removed a redundant improvement paragraph.** **Lesson: one vague-improvement paragraph, never two.**
- **De-personalized the webinars.** "my live webinars" → "our live webinars." **Lesson: team framing, never an individual, in client copy.**

### Acme Notify
- **Same time anchor** as Acme CRM.
- **Named the exact screen.** "See MSRP" → specified the Inventory Screen. **Lesson: point clients to where the change appears.**
- **Fixed the modality.** Reference numbers are mandatory, so "can" was removed. **Lesson: match the verb (must/can/may) to whether the step is required.**
- **Suppressed a narrow bug fix.** Removed an "add your own links to messages" section (an email-broadcast fix) — "maybe 1 in 10 clients use email broadcasts; for most this changes nothing, and announcing it just alerts people who hadn't noticed." **Lesson: weigh usage share; don't announce a fix most never noticed.**
- **Same "our webinars"** de-personalization.
- **Different support pointer.** Acme Notify has no in-app chat button, so its support pointer is DMS-A support. **Lesson: the support pointer is a brand-profile field, not a wording tweak.**

---

## ADO calibration (what the boards prove)

Use this to gut-check how ruthless the suppression is.

- **Related-Contacts window, CRM Team board:** ~40 items closed the day before release — almost all Bugs about the feature's internals (analytics fields, DMS-B parity, over-sending control breaking customer groups, tree dupes, export), plus User Stories that were pure plumbing (an inventory screen now fetching from a new API, a mobile build, test endpoints). **Client note announced: one feature.**
- **Later window, CRM Team board:** announced overpayment + mobile video + a messaging-performance paragraph. Shipped same window but **not announced:** widget search + its bugs, a "privacy policy shown twice" fix, user-sync plumbing, publishing-details tasks, a per-client survey defect.
- **SWAT board (any window):** phone validation, add a text-enabled number, block a spam number, add users, remove a location, "broadcast sent at 2am," "message stuck In Progress," "user cannot login." **Zero of these are release-note material.** SWAT = firefighting.

Ratio to internalize: **one client-facing feature can sit on top of dozens of closed items.** The note names the one; the rest stay invisible.

---

## Module ROI microcopy pattern (tier/upgrade copy)

Same voice, maximally compressed. Used for the "module blocked" upgrade popup: a one-line module pitch + exactly **four** ROIs chosen per module. Rules: **≤ 60 characters each, outcome/benefit-led, concrete, grounded (no vague adjectives).**

Samples that hit the mark:
- Broadcasts: "10,000 texts in 7 minutes. SMS, MMS, or email." / "Insert names so mass texts feel one-to-one."
- Surveys: "Every closed invoice triggers a survey — hands-free." / "Promoters go public. Detractors stay internal."
- Messenger: "SMS, email, and social — one inbox, zero tabs." / "Send a pay link. Get paid from their phone."
- Payments: "No more waiting for checks. Paid same day."
- Automations: "Status changes in the DMS → auto-text to customer." / "DMS-A, DMS-B, DMS-C — works with all three."
- Deals: "Drag-and-drop deals across custom stages." / "Value, rep, days in stage — stalled deals in red."

Pick the four that best sell the module; lead with the most visceral outcome; keep integration names ALL-CAPS.
