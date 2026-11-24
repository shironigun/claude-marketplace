# Fact ledger: Alex Example

Illustrative example: a made-up person and company, to show the format. Start a real ledger with these headings and tables.

Status: approved 2026-11-24 by Alex
Target: Head of Support Operations roles at mid-size logistics and retail companies.
Off limits: client names (say "a national grocery chain"), the internal escalation policy, colleagues' names unless they agree, years of experience.

## Sources

| ID | Source | Read |
|---|---|---|
| S1 | LinkedIn data export: Positions.csv, Skills.csv, Certifications.csv (requested 2026-11-20) | 2026-11-24 |
| S2 | Current profile, Save to PDF (Profile.pdf) | 2026-11-24 |
| S3 | ChatGPT export: chat "Q4 support review", 2025-12-18, user message | 2026-11-24 |
| S4 | Claude chat, extraction prompt reply saved as chats/claude-no-project.md | 2026-11-24 |
| S5 | Interview with Alex | 2026-11-24 |
| S6 | Award email from the Head of Customer Experience, forwarded by Alex | 2026-11-24 |
| S7 | Certificate PDF: CXP Certificate of Completion | 2026-11-24 |

## Facts

One fact per row. Status: CONFIRMED (a document says it, or the user stated it in the interview), UNCONFIRMED (found, not yet checked), PLANNED (not done yet). Sensitivity: PUBLIC-SAFE, NEEDS SCRUBBING (write "Say:" with the public wording), INTERNAL ONLY. Don't use the "|" character inside a cell.

| ID | Fact | Source | Status | Sensitivity |
|---|---|---|---|---|
| F1 | Official title: Support Operations Lead, Contoso Logistics, Mar 2023 to now | S1 | CONFIRMED | PUBLIC-SAFE |
| F2 | Earlier role: Support Specialist, Contoso Retail, Jun 2019 to Feb 2023 | S1 | CONFIRMED | PUBLIC-SAFE |
| F3 | Leads a team of 9 support agents across 2 shifts | S5 | CONFIRMED | PUBLIC-SAFE |
| F4 | Queue redesign by ticket type and urgency cut median first-response time from 11 hours to 3 hours, Q1 to Q4 2025, per the help desk's own report | S3, confirmed in S5 | CONFIRMED | PUBLIC-SAFE |
| F5 | Customer satisfaction rose from 81% to 92% over 2025, Alex's own tracking from the survey tool | S4, confirmed in S5 | CONFIRMED | PUBLIC-SAFE |
| F6 | Designed an AI triage assistant that drafts a first reply for the 4 most common ticket types; an agent reviews every draft before it is sent; the engineering team built it; Alex specified the rules and reviewed every release | S4, confirmed in S5 | CONFIRMED | PUBLIC-SAFE |
| F7 | The triage assistant drafts replies for 35% of incoming tickets | S4 | UNCONFIRMED | PUBLIC-SAFE |
| F8 | Wrote 40 knowledge base articles so customers can solve routine questions alone | S2, S5 | CONFIRMED | PUBLIC-SAFE |
| F9 | Kept the largest client through its contract renewal. Say: "a national grocery chain" | S3 | CONFIRMED | NEEDS SCRUBBING |
| F10 | Details of the internal escalation policy | S5 | CONFIRMED | INTERNAL ONLY |
| F11 | Roll the triage assistant out to the returns team in 2027 | S5 | PLANNED | PUBLIC-SAFE |
| F12 | Customer Experience Professional (CXP), Contoso Academy, Certificate of Completion, issued May 2024 | S7 | CONFIRMED | PUBLIC-SAFE |
| F13 | CXP covered queue design and service levels, quality scoring, and workforce planning | S7 | CONFIRMED | PUBLIC-SAFE |
| F14 | Customer Champion award, Q3 2025, from the Head of Customer Experience | S6 | CONFIRMED | PUBLIC-SAFE |
| F15 | Talk "Triage before you automate" at Example Support Summit 2025, on fixing the support queue before adding AI; slides are public | S2, S5 | CONFIRMED | PUBLIC-SAFE |
| F16 | Wants to be known as a support operations leader who uses AI to make support faster and calmer | S5 | CONFIRMED | PUBLIC-SAFE |
| F17 | Skills to be found for: Support Operations, Customer Experience, Workforce Planning, Knowledge Management, AI Triage, Help Desk Software | S1, S5 | CONFIRMED | PUBLIC-SAFE |
| F18 | Designed the triage rules with a support analyst, who agreed to be credited by role, not by name | S5 | CONFIRMED | PUBLIC-SAFE |
| F19 | Resume PDF on Alex's own site, 2 pages, always the latest version | S2 | CONFIRMED | PUBLIC-SAFE |
| F20 | Trained 6 new agents in 2025 to work the queue alone within their first month | S5 | CONFIRMED | PUBLIC-SAFE |
| F21 | Before triage, each shift started with the same 4 question types, so urgent tickets waited | S5 | CONFIRMED | PUBLIC-SAFE |

## Open questions

| ID | Question | Blocks |
|---|---|---|
| Q1 | What share of incoming tickets does the triage assistant draft for? A chat said 35%; Alex wasn't sure. Where could you check? | F7 |
