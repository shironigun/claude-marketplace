# Defaults and the deviation protocol

> The opinionated default stack, stated once, plus the four-step protocol for the rare case that earns a change.

## Purpose
So that skills, generators, and reviewers do not re-litigate settled choices on every test, this
standard fixes the kit's **default stack** and encodes a single **deviation protocol**. The defaults
are opinions the kit holds — most are grounded in official docs, a few are the kit's own engineering
convention (labeled as such). The protocol is how you depart from a default honestly when a specific
case justifies it, instead of either blindly following or silently diverging.

## When to use it (and when NOT)
- **Use it** whenever a choice the default already covers comes up ("should this be a fixture or a
  hook?", "zod or hand-rolled checks?", "POM or inline selectors?"). Cite the default; do not re-ask.
- **Use the protocol** only when a concrete constraint pushes against a default (a provider that needs
  mTLS, a singleton resource that cannot be created per-test). Deviation is allowed — unargued deviation
  is not.
- **Not** for product decisions. The default stack is about engineering; what to test is elsewhere.

## Official guidance
- Default to Playwright's built-in locators, web-first assertions, and test isolation —
  https://playwright.dev/docs/best-practices
- Default to fixtures for setup/teardown; the fixtures page gives six reasons to prefer them over hooks
  (kept as a live tension — `beforeEach` is still shown as acceptable) — https://playwright.dev/docs/test-fixtures
- Default to `storageState` auth (log in once) and APIRequestContext for API work —
  https://playwright.dev/docs/auth · https://playwright.dev/docs/api-testing

## Code shape (product-neutral)
```text
THE DEFAULT STACK (do not re-ask these; cite this file)

  Language        TypeScript
  Browser driver  Playwright
  Test runner     Playwright Test
  UI pattern      Page Object Model
  API layer       APIRequestContext, wrapped in one api-client
  Contracts       Zod schemas
  Reporting       Allure (optional to generate; results cost nothing)   ← kit default
  Editor          VS Code + "Playwright Test for VS Code"
  Config          env / profile files; secrets in a git-ignored .env    ← kit convention
  Auth            storageState for UI; a minted token for API
  Architecture    POM + services + builders + fixtures + schemas + utilities  ← kit convention

Grounded defaults cite official docs in their own standard. The three marked
"kit convention / kit default" are the kit's own opinion, NOT an official Playwright
recommendation — a deviation needs no official blessing, only the protocol below.
```
```text
THE DEVIATION PROTOCOL (four steps, in order)

  1. Why the default is normally preferred
     State what the default buys (isolation, one-file change, honest reporting).
  2. Why THIS case may justify a change
     Name the concrete constraint — not a taste, a constraint the default cannot meet.
  3. Trade-offs
     What you lose by deviating, and how you contain the loss (scope it to one module,
     one file, one marker).
  4. Recommended decision
     Pick one and say so plainly, with the smallest blast radius. Record it where the
     next person will see it (the module's subsystem note), not only in a commit.

Worked example — a provider needing a signed (HMAC) request:
  1. Default: the api-client attaches a bearer token; every test inherits it unchanged.
  2. This case: the provider rejects bearer auth and requires a per-request signature.
  3. Trade-off: signing logic is bespoke; contain it to the ONE place every request passes
     through (the client's option builder) so no service or spec learns about it.
  4. Decision: compute the signature in the api-client, keep the public surface identical.
```

## Anti-patterns
- Re-asking a settled default on every new test or module instead of citing this file.
- Deviating silently — changing a default in one corner with no recorded reason, so the next person
  cannot tell intent from accident.
- Treating a kit convention as an official rule (or vice versa). The three marked conventions are the
  kit's opinion; departing from them needs the protocol, not a doc link.
- Using the protocol to justify a taste ("I prefer hooks"). Step 2 must be a constraint the default
  genuinely cannot meet.

## Related standards
- `overview.md` — the blocks the default architecture is made of.
- `fixtures.md` — the fixtures-vs-hooks default and its documented tension.
- `schemas.md` · `matchers.md` — the zod/contract and exact-status defaults.
- `auth-and-storage-state.md` — the login-once default and its two official strategies.
