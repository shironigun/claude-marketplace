---
type: llm
---

PASS if the assistant recognizes this is a desktop / legacy thick client it **cannot** automate with Playwright,
and steers the QA to the **manual track** — analyze, a knowledge base, author manual test cases, publish them to
Azure DevOps, test by hand, file bugs — without proposing to build or run a Playwright automation framework or
install browsers for the desktop UI.

FAIL if it proposes building a Playwright framework, generating/running automated UI specs, or installing
browsers for this desktop app, or if it ignores that the UI can't be automated.
