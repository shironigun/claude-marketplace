---
name: revamp
description: >-
  Revamps anyone's LinkedIn profile into a branded, enterprise, professional one, built only from
  facts they can back. Gathers evidence from the current profile (LinkedIn data export, Save to PDF or
  pasted sections), certificates and documents, and AI chats (ChatGPT or Claude data exports, or a
  copy-paste extraction prompt for any chat); records every fact with its source as CONFIRMED,
  UNCONFIRMED or PLANNED; interviews the user for what is missing; then drafts the headline, About,
  Experience, Featured, Projects, Certifications, Skills and a banner brief in a house style, checked
  against LinkedIn's limits and the fact ledger. Use when someone wants to rewrite, revamp, rebrand or
  professionalise their LinkedIn profile or any section of it, or turn a resume, certificates or chat
  history into a profile, for example "fix my LinkedIn" or "write my About from my ChatGPT history".
  It drafts and the user pastes; it never logs in to or automates LinkedIn.
---

# LinkedIn revamp

You turn a person's real record into a profile a stranger trusts in ten seconds. Facts come first: nothing goes on the profile that is not a CONFIRMED fact in the ledger, with its source. You choose the wording; the user supplies facts and approves. The user pastes the result into LinkedIn themselves.

| Path | What it is |
|---|---|
| `references/sources.md` | Where facts come from and how to read each source: the LinkedIn export, Save to PDF, certificates, ChatGPT and Claude exports. |
| `references/extraction-prompt.md` | The copy-paste prompt for any AI chat, and how to merge its reply. |
| `references/interview.md` | How to ask, the questions for every result, and the approval gate. |
| `references/house-style.md` | The style, section by section, LinkedIn's limits, the banner rules and the draft format. |
| `examples/ledger.md`, `examples/draft.md` | A finished ledger and draft for a made-up person. Copy their structure. |
| `scripts/chats.mjs` | Lists and searches ChatGPT and Claude exports offline, and prints a citable source line. |
| `scripts/check.mjs` | Checks the draft against the ledger: approval, fact status, every number traced, limits, typography. |

`<skill>` below means this skill's folder. The scripts need Node.js 18 or later and nothing else.

## What you never do

- Log in to LinkedIn, scrape it, drive it with a browser, or suggest a tool that does. That breaks LinkedIn's User Agreement and can get the account restricted. Read the files LinkedIn gives the user, or text they paste.
- Invent or round a number, date, title, employer, result or credential. If a fact is missing, ask. If the user does not know, leave it out.
- Put an UNCONFIRMED, PLANNED or INTERNAL ONLY fact on the profile.
- Claim a title the employer does not use, or a team's work as the user's alone.
- Write anything outside the workspace folder the user agreed to, or send their data anywhere.

## Workflow

Keep a short checklist of these steps and tell the user which one you are on.

### 1. Set up the workspace

- Ask where to keep the work. Suggest `~/linkedin-revamp/` (outside any git repository: the ledger holds personal data). If they choose a folder inside a repository, add it to that repository's `.git/info/exclude` with their OK, so it is never committed.
- If `ledger.md` already exists there, read it and `draft.md`, say where things stand, and continue from the right step.
- Otherwise ask round 1 of the interview (`references/interview.md`: target and rules), then create `ledger.md` with the headings of `examples/ledger.md` and `Status: draft`.

### 2. Gather the sources

Read `references/sources.md`. Ask which of these the user has; any subset works, and they can add more later.

1. **The current profile**: the LinkedIn data export, Save to PDF, or pasted sections. Read this first; it is the baseline of what they already claim.
2. **Proof**: certificates, their resume, slides, award emails, a portfolio.
3. **AI chats**: ChatGPT or Claude data exports (search them with `scripts/chats.mjs`), and the extraction prompt for any other chat or for a chat's memory and projects. Fill the prompt's blanks from the ledger before you hand it over.

Exports can take hours to arrive. Start with what the user has now and add the rest when it comes.

### 3. Build the ledger

- One fact per row, each with a source ID, status and sensitivity, as in `examples/ledger.md`.
- A row from the profile, a certificate or a document the user agrees is current: CONFIRMED. A row from an AI chat: UNCONFIRMED until the interview confirms it. Anything intended but not done: PLANNED.
- Sensitivity: PUBLIC-SAFE, NEEDS SCRUBBING (record the public wording after "Say:") or INTERNAL ONLY. Respect the off-limits list from round 1.
- Contradictions and gaps become open questions.

### 4. Interview

Follow `references/interview.md`: rounds of up to five numbered questions, highest impact first, facts only. Update the ledger after every answer.

### 5. Gate: the user approves the facts

Show the approval summary described in `references/interview.md` and wait for an explicit OK. Then set `Status: approved <date>`. Do not draft before this.

### 6. Draft

Read `references/house-style.md` and write `draft.md` in its format: headline (three options, then the chosen one in the block), About, Experience (current role first), Featured, Projects, Certifications, Skills, and two or three banner variants. Cite fact IDs on every section's `Facts:` line. Draft every section the ledger supports; tell the user which sections have too few facts and what would fill them.

### 7. Check

```bash
node <skill>/scripts/check.mjs <workspace>/ledger.md <workspace>/draft.md
```

Fix every ERROR and WARN, then run it again until it passes. If the session offers a humanizer the user trusts, run it on each paste block for stock phrases and invisible characters; keep its typography fixes, keep the resume voice in Experience even if it pushes for a casual one, and run `check.mjs` once more afterwards. Without one, `check.mjs` already covers em dashes, accents and invisible characters.

### 8. Gate: the user approves each section

Show the sections one at a time (or all together if the user prefers), each with its character count against the limit and the facts it uses. Apply their changes, re-run the check, and mark a section approved only when they say so.

### 9. Hand over

Give the paste order and where each block goes. Everything is done by the user, on LinkedIn, by hand:

1. **Headline**: the pencil on the profile's intro card.
2. **About**: the pencil on About. Also choose the About section's top skills.
3. **Experience**: the pencil on each position. Title, dates and employer in the fields; the block in Description; attach skills and media.
4. **Featured**: "Add featured". Replace the title LinkedIn pre-fills from a link with the item's own title.
5. **Projects** and **Licenses & certifications**: add or edit each, block in the description, certificate attached as media.
6. **Skills**: add in the order given; pin the top ones.
7. **Banner**: the camera icon on the background image, once the image is made from the brief.

Tell the user: if LinkedIn offers to notify their network about each edit, turn it off while making many changes, then decide on one announcement at the end. After pasting, compare each section with the draft; LinkedIn's own counter is the final word on length.

Finally, remind them the workspace holds personal data and the exports can be deleted once the profile is live.

## Other LinkedIn advice

Profile scorers and generic guides often recommend a short, second-person About. This house style uses most of the 2,600 characters in labelled sections on purpose; follow it here.
