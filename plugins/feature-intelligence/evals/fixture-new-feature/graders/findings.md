---
type: llm
---

The fixture has 17 planted faults (the plugin's examples/csv-importer/expected-findings.json). Count how many the
final run summary reports, as a finding, a conflict or a question. A fault counts only when the summary names
the problem and gives at least one quote (or a close paraphrase of a quote) from the sources that shows it.

- PF-01 conflict: row limit 10,000 (FRD) vs 5,000 (upload story).
- PF-02 conflict: a duplicate email is skipped (FRD) vs the existing customer is updated (import story).
- PF-03 conflict: file size 5 MB (FRD) vs 10 MB (meeting notes).
- PF-04 ambiguity: "Large files should import quickly" has no measure.
- PF-05 ambiguity: "Error messages must be user-friendly" is undefined.
- PF-06 ambiguity: "common date formats" does not say which.
- PF-07 ambiguity: the accepted columns end in "etc.".
- PF-08 ambiguity: "Admins are notified as appropriate" does not say who, when or how.
- PF-09 duplicate: the email format rule is stated more than once.
- PF-10 duplicate: "Name is required" is stated in the FRD and again in the validation story.
- PF-11 missing error behaviour: a file that is not UTF-8.
- PF-12 missing error behaviour: a row with more fields than the header row.
- PF-13 missing error behaviour: an import that fails halfway.
- PF-14 missing error behaviour: an upload that is interrupted or a dropped connection.
- PF-15 terminology: "contacts" in the preview story vs "customers" everywhere else.
- PF-16 permission gap: only admins may import (FRD), managers can start imports (story), no rule covers managers.
- PF-17 missing content: no message for a file with zero valid rows.

PASS if at least 16 of the 17 are reported with their evidence (at least 90%). FAIL otherwise. In your verdict,
list the fault ids you counted and the ids you did not.
