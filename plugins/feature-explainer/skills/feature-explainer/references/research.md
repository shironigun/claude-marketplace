# Researching a feature

The page is only as good as the notes behind it. The aim is a short file of facts, each with where it
came from and when, that you can build every section from without guessing.

## Where to look (in roughly this order)

1. **What already exists.** A previous page or handover about this feature (list the user's artifacts and
   read any that match, if the Artifact tool is available to you; if it isn't, skip this and say so in
   the report), the repo's docs folder, a README, design notes, ADRs, and your own memory notes about the
   feature. These tell you the vocabulary and the intended behaviour. Treat all of them, memory included,
   as claims to check against the code, not as truth: they go stale.
2. **The code.** Search the repo for the feature's names, routes, table names and UI labels. Find:
   - the entry points (the screen, the endpoint, the scheduled job or trigger)
   - the data it reads and writes
   - the rules it enforces (validators, limits, enums, thresholds) — these become grids and checks
   - any outside call (an AI model, a payment provider, an email service) and what goes in and out
   - the statuses or states something moves through — these become a flow
3. **Other branches.** If the feature lives on a branch, read it without switching:
   `git log --oneline <branch> -- <path>`, `git show <branch>:<path>`, `git grep <term> <branch>`.
   Note which branch each fact is from; branches often disagree.
4. **Tickets.** Stories, bugs and test cases (through the tracker's tools if connected). They give the
   "why", the acceptance criteria, known defects and open questions.
5. **The live system, if the user allowed it.** One real call or screen beats any document. Capture the
   response, note the environment, the time and any version the response reports. Credentials come only
   from files the user named; never print them; delete any temporary file that holds them.
6. **Data, if allowed and read-only.** Counts and shares (e.g. "64% of messages are broadcasts") make the
   page concrete. Use SELECT only, on the copy the user allows, and sample if it is slow.

## Recording facts

Keep `research-notes.md` in your scratch folder:

```markdown
# <Feature> research notes — <date>

## Facts
- Drafts over 600 characters are trimmed, not rejected. (src: services/DraftValidator.cs L88, branch qa, 2026-03-03)
- TEST answers report promptVersion 1.2; the repo prompt says 1.3. (src: live call TEST 2026-03-03 10:12; prompts/reply.md)

## Issues seen
- T04: a 4-day-old ticket came back High; the rule says Urgent. (src: TEST run 2026-03-03, capture t04.json)

## Open questions (for To confirm)
- Should holding replies name a time outside office hours? Options: always / office hours / never.

## Vocabulary
- "holding reply": a reply that says when the real answer comes (term used by the support team)
```

Rules for the notes:
- One fact per line, with its source. If you can't name a source, it isn't a fact yet.
- **Measure over document.** When a document and a live response disagree, record both and mark which is
  live. Version numbers drift; read them from responses, not from descriptions.
- **Issues are things you saw**, with the date and the place. "Might fail if…" is not an issue; leave it
  out, or turn it into an open question.
- **Seen live vs read in code.** A defect the code shows plainly (a button commented out, a message that
  names the wrong field) counts, but label it as read in code: the section heading becomes "Issues found in
  the code · ‹date›" (or "Issues found on ‹env› · ‹date›" when you saw them happen), and each card's text
  says "in the code" with the file. Anything that needs a live run to know (what the provider really
  sends, a date a library formats) is an open question, not an issue.
- **Branches.** Record which branch the page reflects and whether the others agree ("identical on qa,
  release/5.0, release/5.1"). Say it once on the page: a hero chip (`['branch', 'qa']`) and a line in the
  developer block.
- Keep sample conversations and payloads you capture; real examples make the best pictures. Strip
  personal data before anything goes on the page.

## When to stop

You have enough when you can answer, from the notes alone: what starts it, what happens step by step,
who or what does each step, what the rules and limits are, what the user sees, how to test it, and what
is currently wrong. Missing answers become questions on To confirm, not guesses.
