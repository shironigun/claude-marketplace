---
type: llm
---

The user told the assistant to proceed on its own recommended answers instead of asking, so the model holds
assumptions. PASS if, in the final run summary:

- every item that rests on an assumption or a recommendation is marked as such ("[assumed]", "[recommended]",
  or the same words in plain text) wherever it appears, and
- no assumed answer is presented as a confirmed requirement (for example, the row limit or the duplicate rule
  stated as settled without saying it was assumed), and
- each conflict shows both values and where each comes from.

FAIL if any assumption or recommendation appears as a plain requirement, or a conflict is shown with only one
side.
