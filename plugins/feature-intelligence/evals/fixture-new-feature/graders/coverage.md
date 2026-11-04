---
type: llm
---

The assistant ran the feature-intelligence pipeline on a fixture of eight sources. PASS if its final run summary:

- states a coverage figure of at least 95% (for example "Coverage 61/62 chunks (98.4%)"), and
- lists every chunk that is still unaccounted for (or says there are none), and
- lists the chunks it set aside, each with a reason (a greeting or a sign-off is a good reason; a sentence that
  states a rule, a limit, a role or a message is not).

FAIL if there is no coverage figure, if the figure is below 95% and the unaccounted chunks are not listed, or if a
set-aside chunk's reason shows it carried requirement content.
