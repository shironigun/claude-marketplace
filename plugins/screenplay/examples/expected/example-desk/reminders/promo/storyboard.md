# Storyboard: Reminders, promo

A promo of Reminders (a feature), 32.0 s of the 30-60 s a promo runs. Approving it passes gate 2.

## Mods

| Mod | Choice |
|---|---|
| Format | Promo |
| Look | Floating desk |
| Ground | Light |
| Callouts | Focus-pop with chip and leader |
| Pointer | Cursor with click ripple, pinned |
| Transitions | Glide between shots |
| Pacing | Standard |
| Intro | Boom |
| End card status chip | New |
| Demo-data note | On |
| Sound | Score on the beat |
| Product polish | As is |
| Walkthrough patterns | Dialog step-through on Reminders queue (SCR-01); Focused typing on Reminders queue (SCR-01) |
| Brands | Harbor, Lumen |

## Personas

- Maya Okafor, Account manager (P-01)

## Scenes

### S-01 Title card, 3.0 s

**Reminders**: Follow-ups slip when they live in inboxes

### S-02 Reminders queue (SCR-01), populated, 9.8 s

Persona: Maya Okafor. Pattern: dialog step-through.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the Open queue | Open: soonest due first | T-08 does | 3.0 s |
| 2 | Point at Elena Ruiz's reminder |  |  | 1.4 s |
| 3 | Click Elena Ruiz's reminder (drawer: Details) |  |  | 1.2 s |
| 4 | Hold on the reminder drawer | Details: subject, due date, owner, channel and status | T-15 does | 3.0 s |
| 5 | Click Send reminder (dialog: Send reminder) |  |  | 1.2 s |

### S-03 Reminders queue (SCR-01), populated, 4.8 s

Persona: Maya Okafor. Pattern: focused typing.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Type "Follow up by phone on Thursday." in the note | Note: up to 280 characters | T-06 limit | 3.6 s |
| 2 | Click Send |  |  | 1.2 s |

### S-04 Reminders queue (SCR-01), populated, 11.4 s

Persona: Maya Okafor.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the toast (toast: Reminder sent to \<customer>) | Toast: names the customer | T-09 does | 3.0 s |
| 2 | Click the Sent tab (tab: Sent) |  |  | 1.2 s |
| 3 | Hold on the Sent tab | Sent: the reminders that went out | T-08 does | 3.0 s |
| 4 | Click the Notifications bell (drawer: Notifications) |  |  | 1.2 s |
| 5 | Hold on the notifications panel | Notifications: one line for each reminder sent | T-10 does | 3.0 s |

### S-05 End card, 3.0 s

**Reminders**: Every follow-up, on time

## Demo data

| Call | Answers |
|---|---|
| API-01 GET /api/reminders | status=open, 3 items; status=open, from S-04, 2 items; status=snoozed, 1 item; status=sent, 1 item; status=sent, from S-04, 2 items |
| API-02 GET /api/reminders/:id | id=R-201 |
| API-03 POST /api/reminders/:id/send | id=R-201 |
| API-04 POST /api/reminders/:id/snooze | id=R-201 |
| API-05 GET /api/session | any request |
| API-06 GET /api/notifications | any request, 1 item; any request, from S-04, 2 items |

## Must not show

- T-02 does-not: A snoozed reminder never comes back by itself: nothing sets it open again.
- T-03 does-not: Sending does not email or text the customer, whatever the channel says; it only marks the reminder sent and adds a notification.
- T-04 never-populated: The dashboard's average response time is never filled in; the page always shows a dash.
- T-05 hidden: The reminder drawer's History tab is hidden.
