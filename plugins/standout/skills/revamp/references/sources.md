# Sources: where the facts come from

Every fact in the ledger names its source. Read sources in this order: the baseline first, then proof, then memory. The current profile shows what the person already claims. Documents prove it. AI chats help them remember it.

Never log in to LinkedIn for the user, scrape it, drive it with a browser, or suggest a scraping tool or extension. Automating the site breaks LinkedIn's User Agreement and can get the account restricted. Use the files LinkedIn gives the user, or text they paste.

## 1. The current LinkedIn profile (the baseline)

Ask for whichever the user has. Any one is enough to start.

| Source | How the user gets it | What is in it |
|---|---|---|
| **LinkedIn data export** | Me menu, Settings & Privacy, Data privacy, Get a copy of your data. Pick "Want something in particular?" and tick the profile parts, or take the larger archive. LinkedIn emails a download link when it is ready; the larger archive can take up to a day. Unzip it. | One CSV per section that has data: usually Profile.csv (headline, About as "Summary"), Positions.csv (experience), Education.csv, Skills.csv, Certifications.csv, Projects.csv, Honors.csv, Courses.csv, Languages.csv and others. A section with no data has no file. |
| **Save to PDF** | On their own profile: the "More" or "Resources" button, then "Save to PDF". | The main sections in one file: headline, About, experience, education, top skills and more. |
| **Pasted sections** | Copy each section from the profile page into the chat. | Exactly what they paste. |

Reading the export:
- Read each CSV's header row before using it. Column names change between exports; never assume them.
- Descriptions can span several lines inside quotes. Read the file whole, not line by line.
- Profile.csv can hold an address, birth date and similar. Take only what the profile needs.
- Every row the profile shows is a fact the person already claims. Add it to the ledger as CONFIRMED only after the user agrees it is still true; old profiles drift.

## 2. Proof: certificates and documents

- **Certificates** (PDF or image): read the exact name, issuer, issue date, expiry, credential ID and URL from the certificate itself. These are the most reliable facts in the ledger. Note whether it is a certification (an exam or assessment) or a course completion, and say so on the profile.
- **Badge pages** (Credly, Accredible and similar): the user gives the public link or a screenshot.
- **Other documents the user offers**: their resume, portfolio site, slides from a talk, award emails, a published article. Performance reviews and internal reports are INTERNAL ONLY by default; a fact from one goes public only if the user says it can and only in the wording they accept.

## 3. Memory: AI chats

People describe their work in AI chats in more detail than anywhere else, but a chat is memory, not proof. The AI may have misremembered or the person may have planned something they never did. So every fact from a chat enters the ledger as UNCONFIRMED until the user confirms it in the interview, or a document backs it.

There is no API for consumer chat history. Use one of these.

### Official exports (ChatGPT and Claude)

| Tool | How the user gets it | File |
|---|---|---|
| ChatGPT | Settings, Data controls, Export data. A download link arrives by email. | `conversations.json` in the zip |
| Claude | Settings, Privacy, Export data. A download link arrives by email. | `conversations.json` in the zip |

Menu names move; if a step is not where this says, ask the user to search the tool's help for "export data".

Search the export with the bundled script instead of reading it whole (exports run to many megabytes):

```bash
node <skill>/scripts/chats.mjs list  <unzipped export folder>
node <skill>/scripts/chats.mjs find  <folder> [<folder>...] --terms "promotion|award|launched|certified" --role user
node <skill>/scripts/chats.mjs show  <folder> --id <first characters of the id>
```

- Search with the user's own words: employer and team names, project names, tools, "promoted", "award", "launched", "cut", "saved", "certified", "presented", "trained", numbers you already have.
- Prefer `--role user`: what the person said about their own work. Assistant messages repeat it, and sometimes embellish it.
- Copy the source from the `[...]` line the script prints (tool, chat title, date, role, id) into the ledger's Sources table.
- The script is offline. It reads the files and prints to the terminal.

### The extraction prompt (any AI chat)

For Gemini, Copilot or any other chat, and for anything an export does not hold (a ChatGPT or Claude memory, a Project's files, a custom GPT's knowledge), use `extraction-prompt.md`. Fill in its blanks from the ledger, give it to the user, and have them run it in each place their work lives. They paste each reply back, or save it as `<workspace>/chats/<tool>-<project>.md`.

## Recording a source

Give every source an ID (S1, S2 and so on) in the ledger's Sources table, with what it is and the date you read it. A fact can cite several: `S3, confirmed in S5`.
