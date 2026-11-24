# Release-Notes Exemplars, Deltas & Reasoning

This file is the voice-and-judgment source of truth. It has three parts:
1. **Full finalized notes**: the published client copy, to match register.
2. **Draft→final deltas**: what the copy editor and editorial owner cut or changed, with their reasoning. This is where the judgment lives.
3. **Tracker calibration + ROI microcopy pattern.**

Read the deltas closely: the finished notes teach the *voice*, the deltas teach *what never makes it in and why*.

> **All examples below are fictional mock data** for an imaginary customer-engagement product called
> **Product** (with a partner-facing edition called **Partner Edition**). Roles (drafter, editorial owner,
> copy editor, release owner) are roles, not people. Features, quotes, partner labels (PARTNER-A…PARTNER-D),
> URLs and numbers are illustrative. They demonstrate the voice and the cut/keep judgment; nothing here is
> a real release. At run time, product, brand, partner and plan names come from the workspace profile.

---

## EXEMPLAR 1 — "Send Campaigns to Secondary Contacts"

Internal name: **Preference Center**. The richest example of the transform.

### 1a. The drafter's technical draft (condensed): the input
Titled "Preference Center & Secondary-Contact Campaigns." Exhaustive and precise: contacts gain a Birthday column and per-channel opt-in toggles; an "Include Secondary Contacts" switch in Segment filters (hidden for PARTNER-A), filtering accounts first then nesting contacts in a tree; a mobile-number filter with AND logic for pinpoint targeting; contacts included in campaign segments but auto-excluded from surveys; send-frequency-cap logs now created for contacts; location rule (secondary contacts always receive from the primary location's number); a unified tree UI with the name columns collapsed to a single **Name** column and contacts in exports.

### 1b. The finalized client note (published, editor-trimmed): the output
> **New Feature Update: Send Campaigns to Secondary Contacts!**
> You can now send text and email campaigns not only to an account's main contact, but also to any secondary contacts (office managers, billing department, family members, etc.). Easier ways to reach your customers.
>
> **Updates to Contacts**: a Birthday column, and Phone/Email opt-in toggles when editing a contact. *Note: Only campaigns can be sent to secondary contacts at this time. Surveys are planned for a future release.*
>
> **Add Secondary Contacts to Segments**: an Include Secondary Contacts switch lets you include or exclude secondary contacts when building Segments; when on, secondary contacts display under the main account in a tree-style list.
>
> **Targeting a Specific Secondary Contact**: make sure the contact has a phone number and is opted in; apply the phone number as a filter; turn on Include Secondary Contacts; search by contact phone number.
>
> **Which Number Sends the Message?** If an account has a completed order at a secondary location, the main contact receives from that location's marketing number; secondary contacts always receive from the primary location's number.
>
> **UI & Analytics Improvements**: a clearer tree structure; delivery info for contacts on campaign cards; a simplified Name field; analytics stats for secondary contacts when included.
>
> **That's It!** We hope you love these updates. To attend a free webinar, click here to register! Questions? Use the chat button in the bottom-left corner of Product.

### 1c. The deltas: what changed and why (the lesson)
- **Renamed the whole feature.** "Preference Center" → "Send Campaigns to Secondary Contacts." Nobody could tell what "Preference Center" *did*; once it was clear the only preference managed was campaign opt-in, the note was named for the client action. **Lesson: name by the verb the client performs, not the subsystem.**
- **Cut the send-frequency cap entirely.** Reasoning: "customers will assume the cap still applies as it always has." **Lesson: don't announce what clients already assume is true; it plants doubt.**
- **Cut primary-contact opt-in toggles.** "Not a new feature that substantially changes the experience, so it doesn't bear mentioning."
- **Cut the analytics/export reformatting as its own item.** "Relatively small; doesn't bear specific announcement." (The column collapse is mentioned in passing, not headlined.)
- **Kept the tree design even though it wasn't new everywhere.** "It doesn't hurt to highlight it to clients." **Lesson: positively re-surfacing existing UI is fine.**
- **Deferred a live bug to the next release.** A missing filter chip when the toggle is active → "add it as a small follow-up that goes out next release."
- **Added the drafter's true constraint.** The account "needs a completed order to receive a campaign from that non-primary location" → "order" became "completed order" in the final.
- **Suppressed ~40 bug fixes silently.** Everything that made the feature work (analytics fields showing N/A, PARTNER-B parity, duplicate contacts, export gaps) never appears. They are the cost of the feature, not the feature.
- **Presentation edits.** Reworded the relatable examples and simplified phrasing: softer, more client-relatable.

---

## EXEMPLAR 2 — "Social Messaging Is Now in Your Inbox!"

Input: a multi-page flow doc (account linking, page→team mapping, filters, contact creation, merge, sync, limitations, "What If" scenarios). Output note:

> **It's Finally Here: Social Messaging Is Now in Your Inbox!**
> Customers have asked for this for a long time, and it's finally live. Connect your social inbox directly to Product so your team can manage messages without leaving Product. Faster replies, better tracking, fewer missed leads.
>
> **What's New?** Social messages show up in the Inbox; reply right away; conversations stay tied to the correct team (each page connects to one team); conversations are clearly marked with an icon, and you can filter the inbox by channel.
>
> **How to Set It Up (Admins Only)**: Settings → Teams, pick the location, click Link, log in with the account credentials and approve access; then choose the page and link it. When connected the icon turns blue; one page = one team.
>
> **New Contacts & Records**: a record is created automatically and marked with the connected account. If the contact already exists, merge; if not, use Sync on the Review tab. Keeps data clean and avoids duplicates.
>
> **Important Rules to Know**: *Login expiration (low risk):* the connection may expire after about two months with no login; for most clients not a concern since users log in daily. *7-day messaging window (very important):* if 7 days pass since the last message received, the conversation times out, so check at least once a week. *Other limits:* conversations can't be reassigned or archived.
>
> **Why This Matters**: respond faster, keep conversations in one place, prevent dropped conversations.

### Deltas & reasoning
- **Removed a misattributed section.** The drafter: "the doc holds an unwanted section about email notifications; that has nothing to do with this feature." → cut. **Lesson: never announce behavior that isn't part of this feature; verify it's real.**
- **Cut a double-merge edge case.** After merging, replies still go to two separate threads (the platform can't merge identities). "Infrequent enough that this shouldn't be an issue." → omitted.
- **Kept two limitations, framed calmly.** The login expiry ("low risk for most clients") and the 7-day reply window ("very important"): real constraints clients must know, stated without alarm.
- **Reframed a technical fact as reassurance.** The expiry only triggers with no *login* for the whole period; daily activity keeps it alive → "for most clients, this should not be a concern."
- **Suppressed the spec depth.** Attachment formats, voice-note limits, review-queue routing, permission-scope choices: all live in the KB, none in the note.
- **Timing call captured.** Big/setup-heavy feature → released Monday morning ("so clients don't set it up over the weekend while support is unavailable"), notes published only after prod confirmed stable.

---

## EXEMPLAR 3 — "Pay-by-Link 3.0 Is Here for More Clients!"

Note the **loud availability handling**: the pattern to copy whenever a feature is integration-gated.

> **Big News: Pay-by-Link 3.0 Is Here for More Clients!** Now both PARTNER-C and PARTNER-D clients can use Pay-by-Link 3.0: faster payments, clearer requests, fewer mistakes, no matter which system you use.
>
> **Three Easy Ways to Request Payment**: *Balance:* pick the order, click send, the customer pays via link, auto-applied to the correct invoice. *Deposit:* request a fixed amount or percentage. *Manual:* send a link for any amount and apply it manually.

And the companion **Overpayment** update shows the shouted-exclusion style:

> **Request Overpayments on Pay-by-Link Deposits**: *PARTNER-C & PARTNER-D Clients Only* (Yes, this is ONLY for PARTNER-C and PARTNER-D. It is NOT AVAILABLE for PARTNER-A or PARTNER-B.) You can now request an overpayment up to $1,000 extra, perfect for special orders.

### Deltas & reasoning
- **Availability is the loudest thing on the page**, repeated top and bottom, exclusions in caps. Clients on the wrong integration discovering this later is the support cost this prevents.
- **Omitted the "What's Fixed" list.** The draft had validation fixes (blocked letters in a percentage field, prevented empty percentage) → none announced; only the positive capability.
- **Simplified the mechanic.** The $1,000 cap stayed as a benefit; the exact error strings went to the KB.

---

## EXEMPLAR 4 — "Product Has a Brand-New Look"

The redesign playbook: reassure first, tease the future, push depth to KB.

> **Product Has a Brand-New Look, and a Lot of New Features!** Here's the most important thing up front: **you're not losing anything.** Every tool you use today is still there. Some buttons moved, some screens look different, but everything still works, in most cases better than before. … [docked panels; "My Items" filters; collapsible menu; smarter Dashboard; five-tab Contact Details; rebuilt Pipeline with tabs, products, quotes] …
> **Getting Ready for What's Next**: new capabilities are coming to Product. We're not ready to share details yet, but this new structure makes room for them. Stay tuned.
> **Watch the Walkthrough Webinars** … Or visit our knowledge base: learn.example.com.

### Deltas & reasoning
- **Reassurance leads**, because client anxiety about a redesign ("where did my button go?") is the real risk, not the features.
- **Forward-looking tease** only went in after management sign-off. **Lesson: forward teases only with sign-off.**
- **Cut a usage limit note.** "Not a functional change from what they had; we just put a note on screen."
- **Deferred a niche filter to the KB.** "Trying not to let the release notes get too long": most clients scan for what changed.
- **Publish discipline.** Release through the in-app announcement tool once the update is confirmed live and not needing a rollback.

---

## EXEMPLAR 5 — Copy editor's edit pass (primary brand + partner-facing brand)

Not a full note: a batch of small, deliberate edits made to a finalized draft, each a standing rule now. Grouped by brand.

### Primary brand ("Product")
- **Added a concrete time anchor.** Appended "Here's what's new since the fresh look arrived" with a dated reference. **Lesson: date past-release references; never leave "since the fresh look" undated.**
- **Fixed an implied capability.** Rewrote "move a customer from quote to paid without jumping between screens" to the literal action ("grab an existing quote and attach it to the deal card") because the original implied a flow the product can't do. **Lesson: describe the literal action, not a bigger flow it suggests.**
- **Delineated two screens with a labeled separator.** Added an "Adding Quotes to Deals:" sub-header because orders and quotes are separate screens. **Lesson: split a bullet list that spans distinct screens with a sub-header.**
- **Cut the em-dashes.** "A dozen em-dashes read as 'obviously AI-generated.'" **Lesson: em-dash restraint in the finished note.**
- **Made a prerequisite precise.** "Pay-by-Link must be turned on" → "must be enabled with one of our payment partners." **Lesson: name what a feature actually depends on.**
- **Stopped prescribing a feeling.** "feeling more polished with every release" → "we are constantly optimizing for best performance." **Lesson: report what we're doing, not how clients should feel.**
- **Removed a redundant improvement paragraph.** **Lesson: one vague-improvement paragraph, never two.**
- **De-personalized the webinars.** "my live webinars" → "our live webinars." **Lesson: team framing, never an individual, in client copy.**

### Partner-facing brand ("Partner Edition")
- **Same time anchor** as the primary brand.
- **Named the exact screen.** "See list price" → specified the Catalog screen. **Lesson: point clients to where the change appears.**
- **Fixed the modality.** Reference numbers are mandatory, so "can" was removed. **Lesson: match the verb (must/can/may) to whether the step is required.**
- **Suppressed a narrow bug fix.** Removed an "add your own links to messages" section (an email-campaign fix): "maybe 1 in 10 clients use email campaigns; for most this changes nothing, and announcing it just alerts people who hadn't noticed." **Lesson: weigh usage share; don't announce a fix most never noticed.**
- **Same "our webinars"** de-personalization.
- **Different support pointer.** Partner Edition has no in-app chat button, so its support pointer is the partner's support desk. **Lesson: the support pointer is a brand-profile field, not a wording tweak.**

---

## Tracker calibration (what the boards prove)

Use this to gut-check how ruthless the suppression is.

- **Secondary-contacts window, delivery board:** ~40 items closed the day before release, almost all Bugs about the feature's internals (analytics fields, PARTNER-B parity, the frequency cap breaking segments, tree dupes, export), plus User Stories that were pure plumbing (a catalog screen now fetching from a new API, a mobile build, test endpoints). **Client note announced: one feature.**
- **Later window, delivery board:** announced overpayment + mobile video + a messaging-performance paragraph. Shipped same window but **not announced:** widget search + its bugs, a "privacy policy shown twice" fix, user-sync plumbing, app-publishing tasks, a per-client survey defect.
- **Support board (any window):** number setup, add a text-enabled number, block a spam number, add users, remove a location, "campaign sent at 2am," "message stuck In Progress," "user cannot log in." **Zero of these are release-note material.** The support board is firefighting.

Ratio to internalize: **one client-facing feature can sit on top of dozens of closed items.** The note names the one; the rest stay invisible.

---

## Module ROI microcopy pattern (tier/upgrade copy)

Same voice, maximally compressed. Used for the "module blocked" upgrade popup: a one-line module pitch + exactly **four** ROIs chosen per module. Rules: **≤ 60 characters each, outcome/benefit-led, concrete, grounded (no vague adjectives).**

Samples that hit the mark:
- Campaigns: "10,000 texts in 7 minutes. SMS, MMS, or email." / "Insert names so mass texts feel one-to-one."
- Surveys: "Every completed order triggers a survey, hands-free." / "Promoters go public. Detractors stay internal."
- Inbox: "SMS, email, and social: one inbox, zero tabs." / "Send a pay link. Get paid from their phone."
- Payments: "No more waiting for checks. Paid same day."
- Automations: "Status changes in your system → auto-text to customer." / "PARTNER-A, PARTNER-B, PARTNER-C: works with all three."
- Pipeline: "Drag-and-drop deals across custom stages." / "Value, rep, days in stage: stalled deals in red."

Pick the four that best sell the module; lead with the most visceral outcome; keep integration-partner names ALL-CAPS.
