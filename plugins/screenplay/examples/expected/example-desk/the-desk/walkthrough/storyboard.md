# Storyboard: The Desk, walkthrough

A walkthrough of The Desk (a module), 64.2 s; its length follows the content. Approving it passes gate 2.

## Mods

| Mod | Choice |
|---|---|
| Format | Walkthrough |
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
| Walkthrough patterns | Section tour on Dashboard (SCR-01); Tab tour on Reminders queue (SCR-02); Dialog step-through on Reminders queue (SCR-02); Column sweep on Customers (SCR-03) |
| Brands | Harbor, Lumen |

## Personas

- Maya Okafor, Account manager (P-01)

## Scenes

### S-01 Title card, 3.0 s

**The Desk**: Every follow-up, from the dashboard to the customer

### S-02 Act card, 3.0 s

**Dashboard**

### S-03 Dashboard (SCR-01), populated, 7.6 s

Persona: Maya Okafor. Pattern: section tour.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the dashboard |  |  | 2.0 s |
| 2 | Hold on the three counters | Counters: open, due today and sent this week | T-14 does | 3.0 s |
| 3 | Point at Reminders in the side rail |  |  | 1.4 s |
| 4 | Click Reminders in the side rail |  |  | 1.2 s |

### S-04 Act card, 3.0 s

**Reminders**

### S-05 Reminders queue (SCR-02), populated, 15.6 s

Persona: Maya Okafor. Pattern: tab tour.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the Open tab | Open: soonest due first | T-08 does | 4.0 s |
| 2 | Click the Snoozed tab (tab: Snoozed) |  |  | 1.2 s |
| 3 | Hold on the Snoozed tab | Snoozed: set aside with Snooze | T-16 does | 4.0 s |
| 4 | Click the Sent tab (tab: Sent) |  |  | 1.2 s |
| 5 | Hold on the Sent tab | Sent: the reminders that went out | T-08 does | 4.0 s |
| 6 | Click the Open tab (tab: Open) |  |  | 1.2 s |

### S-06 Reminders queue (SCR-02), populated, 10.2 s

Persona: Maya Okafor. Pattern: dialog step-through.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Click Elena Ruiz's reminder (drawer: Details) |  |  | 1.2 s |
| 2 | Hold on the reminder drawer | Details: subject, due date, owner, channel and status | T-15 does | 3.0 s |
| 3 | Click Send reminder (dialog: Send reminder) |  |  | 1.2 s |
| 4 | Type "Follow up by phone on Thursday." in the note | Note: up to 280 characters | T-06 limit | 3.6 s |
| 5 | Click Send |  |  | 1.2 s |

### S-07 Reminders queue (SCR-02), populated, 9.8 s

Persona: Maya Okafor.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the toast (toast: Reminder sent to \<customer>) | Sending: only when someone presses Send | T-01 manual-only | 3.0 s |
| 2 | Click the Notifications bell (drawer: Notifications) |  |  | 1.2 s |
| 3 | Hold on the notifications panel | Notifications: one line for each reminder sent | T-10 does | 3.0 s |
| 4 | Point at Customers in the side rail |  |  | 1.4 s |
| 5 | Click Customers in the side rail |  |  | 1.2 s |

### S-08 Act card, 3.0 s

**Customers**

### S-09 Customers (SCR-03), populated, 6.0 s

Persona: Maya Okafor. Pattern: column sweep.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the customers list | Customers: name, company and city | T-17 does | 3.0 s |
| 2 | Hold on the Reminder tag on Tomas Berg | Reminder tag: on customers with an open reminder | T-12 does | 3.0 s |

### S-10 End card, 3.0 s

**The Desk**: One send, seen across the desk

## Demo data

| Call | Answers |
|---|---|
| API-01 GET /api/session | any request |
| API-02 GET /api/notifications | any request, 1 item; any request, from S-07, 2 items |
| API-03 GET /api/dashboard | any request |
| API-04 GET /api/reminders | status=open, 3 items; status=open, from S-07, 2 items; status=snoozed, 1 item; status=sent, 1 item; status=sent, from S-07, 2 items |
| API-05 GET /api/reminders/:id | id=R-201 |
| API-06 POST /api/reminders/:id/send | id=R-201 |
| API-07 POST /api/reminders/:id/snooze | id=R-201 |
| API-08 GET /api/customers | any request, 5 items |

## Must not show

- T-02 does-not: A snoozed reminder never comes back by itself: nothing sets it open again.
- T-03 does-not: Sending does not email or text the customer, whatever the channel says; it only marks the reminder sent and adds a notification.
- T-04 never-populated: The dashboard's average response time is never filled in; the page always shows a dash.
- T-05 hidden: The reminder drawer's History tab is hidden.
