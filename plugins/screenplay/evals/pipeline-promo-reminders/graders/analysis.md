---
type: llm
---

The assistant ran screenplay on a copy of example-desk. PASS if its final summary:

- names two brands, Harbor and Lumen, and says that partner workspaces (or paths under /partner) show Lumen and
  everyone else Harbor;
- lists, among the truth ledger's entries for the Reminders feature, that a reminder goes out only when a user
  presses Send (manual-only), that a snoozed reminder never comes back by itself (does not), and that sending does not
  email or text the customer (does not);
- lists a limit of 280 characters for a note, or that only an open reminder can be sent or snoozed.

FAIL if a brand is missing, if the summary says reminders are sent on a schedule or that sending emails or texts the
customer, or if it lists no does-not entry.
