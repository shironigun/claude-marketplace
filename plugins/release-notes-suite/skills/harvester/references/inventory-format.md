# Inventory Format + Worked Example

The harvester output is an **internal, exhaustive, grouped** list. Match this format exactly.

## Format rules

- **Numbered themes**, major initiative first:
  `N. <Theme title> — <one-line what-it-is> (<date range>)` then a sentence of context.
- **Items** under a theme, one bullet each:
  `* <ID> — <title> (<date>), <what/where it touched>. incl. <sub-variant/tests>. PRs (<nums>). Touched <files/services>.`
  Keep it dense: work-item ID, human title, date, code area, PR numbers, and any noteworthy behavior (e.g. a PR that "deliberately held" scope).
- **Non-ticketed deployments** (the whole point of the git sweep) get their own bullets, clearly marked:
  `* <PR #NNNNN / commit sha> — <title> (<date>) — no work item. Touched <files>.`
- **Delineate core vs. generalization.** Put adjacent/reused work in its own theme and say so ("Not the PARTNER-A integration itself, but extends its pattern to other integration types — worth knowing since it reused that foundation.").
- Note **environment** (Staging/Prod) and the **integration partner** in ALL-CAPS (`PARTNER-A`, `PARTNER-B`).
- If the git-layer sweep didn't run, put the `⚠ Git-layer sweep not run …` banner at the top.
- End with a one-line hand-off to `releaser` and name the brand variants it will produce (one per entry in the profile's `brands`).

## Worked example — "PARTNER-A Two-Way Sync" inventory (the gold standard for shape)

> Illustrative only. The product, partners, ids, PR numbers, code names, dates and features below are
> **fictional mock data** that demonstrate the shape. At run time every value comes from the tracker and
> the workspace profile.

This is the target shape: themes, dense items with IDs + dates + PRs + code touchpoints, core-vs-generalization delineation.

1. **PARTNER-A Two-Way Sync — the major initiative (May 11 – Jun 3).** Syncing contact data in both directions between the product and PARTNER-A, plus an inbound webhook.
   * #1001 — PARTNER-A Two-Way Sync implementation (May 29), incl. a review-screen variant and unit tests (PRs 5010/5011/5012/5017). Touched `ContactSyncApi`, the contacts service `Startup`, and the shared sync layer. One PR deliberately held the two-way sync to the review screen only, pending sign-off.
   * #1002 — PARTNER-A Webhook (merged Jun 3). Inbound contact webhook: `ContactsApi`, `UpsertContactFromJson`, the sync search query, plus config (`PartnerAWebhook`). The shared `SyncService`/`ISyncService` is the core (webhook fires when `integration == Integration.PartnerA`).
   * #1003 — Two-way sync for web leads on the Pipeline screen (May 18–20). `LeadWebhookService`/`LeadWebhookApi`, `ReceiveInboundMessageHook` (Inbox), and +91 lines to `SyncService.cs`.
   * #1004 — No sync for contacts created by inbound messages/widget (fix, May 11–13).
   * #1005 — Mobile numbers not syncing from the partner-facing edition correctly (fix, May 11–13).
   * #1006 — Website widget saving a new phone as a secondary contact (fix, bundled with above).

2. **Phone-number validation for PARTNER-A (May 30 & Jul 9).**
   * #1010 — Validate PARTNER-A mobile numbers via the phone-lookup API (May 30). New `PhoneLookupApi` endpoint + request/response DTOs (~164 new lines).
   * #1011 — Additional validation on PARTNER-A numbers (Jul 9). `ContactPhoneService` (+99), `PhoneLookupApi` (+232), a new `PhoneLookupJob` table, and the `UpdateValidatedPhones` query.

3. **PARTNER-A merge tags / automation (May 27).**
   * #1020 — New merge tags for PARTNER-A contacts, refactored to be generic for all integration types. Large rewrite of the automation data layer (email/task/message automations, scheduled sends), ~612 insertions / 781 deletions.

4. **PARTNER-A-specific features (Jun 15 – Jul 14).**
   * #1030 — Catalog: show list price for PARTNER-A clients (Jun 15).
   * #1031 — Add a transaction reference for PARTNER-A clients (Jul 14), surfaced in the conversation panel (final touch in `conversation-panel.tsx`; landed across PRs 5120/5121/5122/5123).

5. **PARTNER-A bug fixes, mostly post-launch on staging/prod (Jun 17–18).**
   * #1040 — Order detail drawer returns 500 for a PARTNER-A client (Staging), fixed (Jun 17).
   * #1041 — Order details APIs fixed for PARTNER-A on Prod (Jun 18).
   * #1042 — PARTNER-A clients can no longer see payments, fixed in `paymentsPage.tsx` (Jun 18).
   * #1043 — User context failing for PARTNER-A clients, fixed (PR 5130).
   * PR #5133 — Retry policy for the PARTNER-A token refresh (Jun 18) — no work item. Touched `PartnerAuthClient.cs`.

6. **Supporting / generalization work built on the PARTNER-A sync (Jun 17–25).** Not PARTNER-A itself, but extends the two-way-sync pattern to other integration types. Worth knowing since it reused and generalized the PARTNER-A foundation.
   * Support dynamic default location IDs for clients (Jun 18): infrastructure the PARTNER-A sync depends on.
   * PARTNER-B/PARTNER-C integration hooks + "unify hosted client logic" and #1050 PARTNER-B Two-Way Sync (Jun 17–25).

### What to notice in this example
- Fix-type items (#1004/#1005/#1006, and theme 5) are captured in full here even though `releaser` will almost certainly suppress them. Completeness is harvester's job.
- PR numbers are carried on every item that has them; the non-ticketed PR #5133 appears as its own `— no work item` bullet.
- Theme 6 is explicitly fenced off as generalization, not the PARTNER-A initiative.
- Environments (Staging/Prod) and "deliberately held" scope notes are preserved.
