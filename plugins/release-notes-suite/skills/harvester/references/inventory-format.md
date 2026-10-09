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
- **Delineate core vs. generalization.** Put adjacent/reused work in its own theme and say so ("Not the DMS-A integration itself, but extends its pattern to other integration types — worth knowing since it reused that foundation.").
- Note **environment** (Staging/Prod) and the **integration** in ALL-CAPS (`DMS-A`, `DMS-B`, `DMS-C`).
- If the git-layer sweep didn't run, put the `⚠ Git-layer sweep not run …` banner at the top.
- End with a one-line hand-off to `releaser` and note the two brand variants (Acme Notify for the DMS-A audience, Acme CRM otherwise).

## Worked example — "DMS-A Two-Way Sync" inventory (the gold standard for shape)

> Illustrative only. All ids, PR numbers, code names, dates and features below are **fictional mock data**
> that demonstrate the shape — they are not real work items.

This is the target shape: themes, dense items with IDs + dates + PRs + code touchpoints, core-vs-generalization delineation.

1. **DMS-A Two-Way Sync — the major initiative (May 11 – Jun 3).** Syncing customer/contact data in both directions between Acme CRM (Acme Notify) and DMS-A, plus an inbound webhook.
   * #1001 — DMS-A Two-Way Sync implementation (May 29), incl. a Data Review variant and unit tests (PRs 5010/5011/5012/5017). Touched `ContactSyncApi`, customer `Startup`, and the shared sync layer. One PR deliberately held the two-way sync to the Data Review screen only pending review.
   * #1002 — DMS-A Webhook (merged Jun 3). Inbound customer webhook — `CustomerApi`, `sp_UpsertContactFromJson`, sync search proc, plus config (`DmsAWebhook`). The shared `SyncService`/`ISyncService` is the core (webhook fires when `integrationType == IntegrationTypeEnum.DmsA`).
   * #1003 — 2-way sync for web Leads on the Deals screen (May 18–20). `DealWebhookService`/`DealWebhookApi` (Leads), `ReceiveInboundTextHook` (Messaging), and +91 lines to `SyncService.cs`.
   * #1004 — no sync for customers created by inbound texts/widget (fix, May 11–13).
   * #1005 — cell phones not syncing from Acme Notify correctly (fix, May 11–13).
   * #1006 — website widget saving a new phone as a related contact (fix, bundled with above).

2. **Phone-number validation for DMS-A (May 30 & Jul 9).**
   * #1010 — Validate DMS-A cell phones via the phone-lookup API (May 30). New `PhoneValidationApi` endpoint + request/response DTOs (~164 new lines).
   * #1011 — Additional validation on DMS-A numbers (Jul 9). `CustomerPhoneService` (+99), `PhoneValidationApi` (+232), a new `PhoneValidationProcess` table, and the `UpdateValidatedPhoneNumbers` proc.

3. **DMS-A customer merge tags / automation (May 27).**
   * #1020 — New merge tags for DMS-A customers, refactored to be generic for all integration types. Large rewrite of the automation data procs (Email/Task/Text/WorkOrder automation, ReadyToSend*), ~612 insertions / 781 deletions.

4. **DMS-A-specific features (Jun 15 – Jul 14).**
   * #1030 — Inventory WG: show Suggested Retail Price for DMS-A clients (Jun 15).
   * #1031 — Add Transaction Reference for DMS-A clients (Jul 14) — surfaced in the messaging conversation panel (final touch in `conversation-panel.tsx`; landed across PRs 5120/5121/5122/5123).

5. **DMS-A bug fixes, mostly post-launch on staging/prod (Jun 17–18).**
   * #1040 — Order detail drawer returns 500 for DMS-A client (Staging) — fixed (Jun 17).
   * #1041 — Order details APIs fixed for DMS-A on Prod (Jun 18).
   * #1042 — DMS-A can no longer see payments — fixed in `paymentPage.tsx` (Jun 18).
   * #1043 — User Context failing for DMS-A clients — fixed (PR 5130).

6. **Supporting / generalization work built on the DMS-A sync (Jun 17–25).** Not DMS-A itself, but extends the DMS-A two-way-sync pattern to other integration types — worth knowing since it reused/generalized the DMS-A foundation.
   * Support dynamic default location IDs for clients (Jun 18) — infra the DMS-A sync depends on.
   * DMS-B/DMS-C integration hooks + "unify hosted client logic" and #1050 DMS-B Two-Way Sync (Jun 17–25).

### What to notice in this example
- Fix-type items (#1004/#1005/#1006, and theme 5) are captured in full here even though `releaser` will almost certainly suppress them — completeness is harvester's job.
- PR numbers are carried on every item that has them; a non-ticketed PR would appear as its own `* PR #NNNNN — … — no work item` bullet.
- Theme 6 is explicitly fenced off as generalization, not the DMS-A initiative.
- Environments (Staging/Prod) and "deliberately held" scope notes are preserved.
