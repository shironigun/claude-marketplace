# The extraction prompt

A prompt the user pastes into any AI chat (ChatGPT, Claude, Gemini, Copilot or another) so that chat exports what it knows about their work in a format you can merge into the ledger. Use it for any chat without an official export, and for what an export misses: the chat's memory of the user, a Project's or custom assistant's files, and their instructions.

## Before you hand it over

Fill in the four blanks from the ledger. Keep each short.

| Blank | Fill with |
|---|---|
| `<<TARGET>>` | Who the profile is for, from the ledger's Target line. |
| `<<ALREADY KNOWN>>` | A compact list of what the ledger already holds: roles with dates, projects, certifications, awards. One line each, no detail. The chat then reports only what is new, adds detail or disagrees. |
| `<<TOPICS>>` | 20 to 60 search words from the ledger: employers, teams, project and product names, tools, certifications, events, plus generic ones (promotion, award, launched, cut, saved, trained, presented, certified, feedback). |
| `<<OPEN QUESTIONS>>` | The ledger's open questions, numbered. |

The filled prompt holds the user's own facts. Give it to them in the chat or save it in the workspace. It never goes in a repo.

## Tell the user how to run it

1. Turn on the chat's memory and its search of past chats in its settings, if it has them and they are off.
2. Paste the prompt into a new chat outside any project, then again inside each project, custom GPT, Gem or space that holds work. Each has its own files and memory.
3. If a reply stops with "CONTINUE", type `continue` until it says "END OF EXPORT".
4. Paste each full reply back here, or save it as `chats/<tool>-<project>.md` in the workspace and say so.

## The prompt

```text
I'm updating my LinkedIn profile with another AI assistant. It can read my files but not this chat history, this project's files or your memory of me. Your job is to export everything you know about my professional work so that assistant can check it and use it. The profile is for: <<TARGET>>.

Use your memory of me, this project's instructions and files (if we're in a project), and past conversations. Search them many times with different keywords, and don't stop at the first results. Search at least these topics, plus anything else you find: <<TOPICS>>.

WHAT THE OTHER ASSISTANT ALREADY HAS (compare against this; report only what is new, adds detail, or disagrees):
<<ALREADY KNOWN>>

OPEN QUESTIONS (answer each one if you know anything):
<<OPEN QUESTIONS>>

RULES
- Facts only, never guesses. Mark each item CONFIRMED (I stated it as done, or a document shows it), UNCONFIRMED (mentioned but not clearly done or not clearly mine) or PLANNED (intended, not done).
- Give a source for every item: chat title and date, a project file name, or "memory".
- Use exact ownership words: led, built, designed, wrote, specified, organised, presented, trained, assisted, contributed to. If my role isn't clear, write "role unclear". Name who else did the work if I said so.
- Quote numbers exactly as they appeared, each with its source, and say how it was measured if I said so.
- Label each item PUBLIC-SAFE, NEEDS SCRUBBING (internal names or details, but the idea can be told generically) or INTERNAL ONLY.
- Never include passwords, tokens, keys, hostnames, internal URLs, customer or client names, colleagues' personal details, ticket numbers, or anything about my health, family or finances.

OUTPUT FORMAT (exactly this, so it can be merged):

# EXPORT: <project name, or "No project">

## About me
Bullets: how I describe my roles, positioning, goals and ways of working. Each with a source.

## Items
One block per item, newest first:

### ITEM: <short name>
- Type: role | project | result | talk or workshop | course | certification | award | publication | tool I built | other
- Versus what the other assistant has: NEW | ADDS DETAIL TO "<item>" | CONFLICTS WITH "<item>"
- Dates:
- My role:
- Problem:
- What I did:
- Outcome and numbers:
- Who else did the work:
- Proof I could show (document, link, deck, certificate; where it lives; is it shareable?):
- Sensitivity: PUBLIC-SAFE | NEEDS SCRUBBING | INTERNAL ONLY
- Status: CONFIRMED | UNCONFIRMED | PLANNED
- Source:

## Answers to the open questions
Numbered, with sources, or "nothing found".

## Recognition and quotes
Awards, certificates and feedback about me. Quote feedback word for word, with who said it, their role and the date, and whether it was public or private.

## Timeline
Every dated milestone above, oldest first, one line each.

## Gaps and contradictions
Numbers or claims that differ between conversations, and things I said I'd do with no record that I did them.

End with the line "END OF EXPORT". If you run out of space, stop at the end of a whole item, write "CONTINUE", and carry on when I say continue.
```

## Merging a reply

- Every ITEM becomes one or more ledger facts. Status starts at UNCONFIRMED whatever the chat said, because a chat is memory, not proof. The interview promotes it.
- Keep the chat's ownership word. If it says "assisted", the profile never says "led".
- "Gaps and contradictions" become open questions.
- Quotes from other people go on the profile only word for word, with the person's agreement if they were private.
