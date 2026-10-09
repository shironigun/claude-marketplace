---
name: playwright-topic
description: On-demand explainer for ANY single Playwright or test-automation topic — iframes, fixtures, downloads, popups, multiple tabs, dynamic elements, waits, flaky tests, auth, API-vs-UI, test data, network interception, cross-module reuse, and the rest. Explains one named topic at an adjustable depth using a fixed template (what it is · why apps use it · how Playwright handles it · the Playwright concepts · recommended approach · product-neutral code · common mistakes · best practices · when to use it and when NOT · official docs). Use whenever the QA asks to "teach me how X works in Playwright", "how do fixtures work", "how do I handle downloads / popups / iframes / tabs / dynamic elements", "how do I avoid flaky tests", "when should I use API vs UI", or "explain <Playwright topic>". It is product-neutral, cites only official docs that this plugin has verified, and DEFERS to the matching `knowledge/standards/*.md` where one exists (links it, never restates it). It explains a topic; it does not scaffold or run framework code (that is the builder, SP3) and it does not walk the whole curriculum (that is `teach-automation`).
---

# playwright-topic — explain one topic, on demand

A QA names a Playwright or automation topic; this skill explains **that one topic** cleanly, at the
depth they want, grounded in the plugin's standards and the official Playwright docs. It is the
*on-demand* half of the tutor — the counterpart to `teach-automation`, which walks the whole ordered
path. Reach for this whenever the question is "explain X" or "how do I handle X", not "where do I start".

> **Product-neutral by rule.** Every example uses generic placeholders (`orders`, `widgets`, `User`,
> `/login`). Nothing here names a product, client, org, real URL, path, account, or secret. Swap the
> placeholders for the QA's real domain only in the answer, never by editing a standard.

## Two grounding rules (these never bend)

1. **Teach FROM the standards — do not restate them.** Where a `knowledge/standards/*.md` file already
   owns the topic, **link it and teach from it**; do not copy its body into the answer. The standards
   are the single source of truth (that is why `framework-standards` exists). The topic → standard map
   is below.
2. **Cite only official docs this plugin has verified.** Every official-docs claim must point to a URL
   from the **Source URLs list** in
   `${CLAUDE_PLUGIN_ROOT}/docs/enhancement/research/official-docs-notes.md`. If a topic has **no**
   verified page there (e.g. downloads, popups, dialogs, dedicated frames guide), say so plainly, route
   the QA to the nearest verified concept, and tell them to confirm the detail on `playwright.dev` —
   **never invent a URL** and never present an invented practice as an official one.

## Depth — adjustable, defined once elsewhere

Depth levels (**L1 Quick · L2 Practical · L3 Deep · L4 Expert**) are defined canonically in
`${CLAUDE_PLUGIN_ROOT}/knowledge/curriculum/depth-levels.md` — read that file for the definitions and the
adjustment rules; do **not** redefine them here. Default to **L2**. When the QA says "go deeper",
"keep it high level", or "explain like I'm completely new", adjust **the same topic** up or down
without restarting it. ("Explain like I'm new" = L1 with plain language and an analogy.)

## The explainer template (apply every point, in order)

Fill these ten points for the named topic, scaled to the chosen depth (L1 = the first few in a couple of
minutes; L4 = all ten with internals and trade-offs):

1. **What it is** — the topic in one or two plain sentences.
2. **Why apps use it** — the real-world reason the application does this (why a page embeds an iframe,
   opens a popup, streams a download), so the QA understands the behaviour before automating it.
3. **How Playwright handles it** — the mechanism Playwright gives you for it.
4. **The relevant Playwright concepts** — the specific APIs/ideas in play (locators, auto-waiting,
   contexts, fixtures, web-first assertions, …), named so the QA can look each up.
5. **Recommended approach** — the kit's recommended way, pointing at the owning standard where one exists.
6. **Code example(s)** — short, runnable-shaped, **product-neutral** TypeScript using generic names.
7. **Common mistakes** — the anti-patterns that make this topic flaky or brittle.
8. **Best practices** — what keeps it robust (isolation, user-facing locators, web-first assertions, …).
9. **When to use it (and when NOT)** — including the cheaper alternative where one exists (e.g. build a
   precondition over the API instead of clicking through the UI).
10. **Official Playwright docs link(s)** — the verified URL(s) from the Source URLs list. If none exists
    for this topic, say so and link the nearest verified page instead of fabricating one.

Then **check understanding**: end with one short question or a "want me to go deeper / show the kit's
standard / give you a second example?" so the QA can steer depth or move on.

## Topic → standard + verified official doc (defer here; don't restate)

Link the standard; teach from it. Cite only the verified URLs shown.

| Topic the QA names | Owning standard (link, don't restate) | Verified official doc(s) |
|---|---|---|
| Fixtures / `test.extend` / `mergeTests` | `knowledge/standards/fixtures.md` | https://playwright.dev/docs/test-fixtures |
| Page objects (POM) | `knowledge/standards/page-objects.md` | https://playwright.dev/docs/pom · https://playwright.dev/docs/best-practices |
| Reusable UI widgets (nav, dialog, toast, table) | `knowledge/standards/components.md` | https://playwright.dev/docs/pom |
| Locators / dynamic elements / user-facing selectors | `knowledge/standards/page-objects.md` | https://playwright.dev/docs/locators · https://playwright.dev/docs/other-locators |
| Waits / auto-waiting / web-first assertions | `knowledge/standards/matchers.md` | https://playwright.dev/docs/test-assertions · https://playwright.dev/docs/best-practices |
| Schema / response-shape validation | `knowledge/standards/schemas.md` | https://playwright.dev/docs/api-testing |
| Flaky tests | `knowledge/standards/isolation-and-parallelism.md` | https://playwright.dev/docs/best-practices · https://playwright.dev/docs/test-assertions · https://playwright.dev/docs/trace-viewer-intro |
| Isolation / parallelism / workers | `knowledge/standards/isolation-and-parallelism.md` | https://playwright.dev/docs/test-parallel · https://playwright.dev/docs/test-sharding |
| Auth / storage state / sign-in once | `knowledge/standards/auth-and-storage-state.md` | https://playwright.dev/docs/auth |
| API testing / `request` context | `knowledge/standards/api-client.md` · `services.md` | https://playwright.dev/docs/api-testing |
| API vs UI (which level) | `knowledge/standards/test-levels.md` | https://playwright.dev/docs/api-testing · https://martinfowler.com/articles/practical-test-pyramid.html |
| Test data / builders / unique data | `knowledge/standards/builders.md` · `worker-seeds.md` | https://playwright.dev/docs/test-parallel |
| Cross-module reuse (a deal needs a customer) | `knowledge/standards/cross-module-reuse.md` | https://playwright.dev/docs/test-fixtures |
| Cleanup / teardown / sweepers | `knowledge/standards/cleanup-and-sweepers.md` | https://playwright.dev/docs/test-fixtures |
| Network mocking / intercept | *(no single standard — see `api-client.md`)* | https://playwright.dev/docs/best-practices |
| Debugging / trace viewer | `knowledge/standards/tooling-and-commands.md` · `reporting-allure.md` | https://playwright.dev/docs/debug · https://playwright.dev/docs/trace-viewer-intro |
| CI | `knowledge/standards/ci.md` | https://playwright.dev/docs/ci |
| VS Code / codegen | `knowledge/standards/vscode-playwright.md` | https://playwright.dev/docs/getting-started-vscode · https://playwright.dev/docs/codegen |
| **iframes / frames** | *(no standard — place the frame locator in `page-objects.md` / `components.md`)* | https://playwright.dev/docs/locators *(dedicated frames page NOT in the kit's verified notes — confirm on playwright.dev before quoting it)* |
| **Downloads** | *(no standard)* | *(no verified page in the kit's notes — confirm on playwright.dev; nearest verified: https://playwright.dev/docs/best-practices)* |
| **Popups / new tabs / multiple pages** | *(no standard — a popup is a new `Page` on the same `context`)* | *(no verified page in the kit's notes — confirm on playwright.dev; isolation context behaviour: https://playwright.dev/docs/test-parallel)* |

> When a topic is not in this table, apply the same two grounding rules: find the closest owning standard
> (or say there is none), cite only a verified URL (or say none is verified and point to `playwright.dev`),
> and never fabricate either. For a pure "should I use X or Y" decision, hand off to `framework-standards`
> instead of re-deriving the decision here.

---

## Worked example A — "iframes" (L2 Practical)

*(A topic with **no** owning standard and **no** verified dedicated doc — note how the citation stays honest.)*

1. **What it is** — An iframe is a separate HTML document embedded inside the page. Its elements live in a
   nested browsing context, so a normal page-level locator can't reach inside it.
2. **Why apps use it** — Apps embed a third-party or self-contained widget this way — a payment form, a
   rich-text editor, an embedded report — so it stays isolated from the host page's styles and scripts.
3. **How Playwright handles it** — Playwright gives you a **frame locator** that scopes a search inside the
   frame; `page.frameLocator(selector)` returns locators that resolve against the frame's document, and you
   chain your usual role/label locators off it. (Confirm the exact signature on the official docs — see
   point 10.)
4. **The relevant Playwright concepts** — locators, frame-scoped locators, auto-waiting (the frame locator
   waits for the frame and the element), user-facing locators inside the frame.
5. **Recommended approach** — There is no dedicated kit standard for frames; treat the frame as part of the
   screen it lives on. Capture the frame locator **once** in the owning page object (or in a component
   object if the embedded widget repeats), name the inner controls by role/label, and keep `expect()` in
   the spec — exactly as `knowledge/standards/page-objects.md` and `components.md` prescribe for any screen.
6. **Code example(s)** (product-neutral):
   ```ts
   // In the page object: scope the frame once, name inner controls by role/label.
   export class CheckoutPage {
     constructor(readonly page: Page) {}
     private readonly paymentFrame = this.page.frameLocator('iframe[title="Payment"]');
     readonly cardField = this.paymentFrame.getByLabel('Card number');
     readonly payButton  = this.paymentFrame.getByRole('button', { name: 'Pay' });

     async pay(card: string): Promise<void> {
       await this.cardField.fill(card);   // auto-waits for the frame + field
       await this.payButton.click();
     }
   }
   ```
7. **Common mistakes** — Reaching for `page.getByRole(...)` without scoping to the frame (it never finds the
   element); coupling to the frame by brittle deep CSS instead of a stable attribute like `title`/`name`;
   adding manual `waitForTimeout` sleeps because the frame "wasn't ready" (the frame locator already waits).
8. **Best practices** — User-facing locators *inside* the frame, the frame locator captured in one place,
   web-first assertions in the spec, no fixed sleeps.
9. **When to use it (and when NOT)** — Use a frame locator only when the control genuinely lives in an
   iframe. If the embedded widget is a third-party dependency you don't control, consider whether you
   should be testing it at all (Best Practices: "only test what you control") or mocking it instead.
10. **Official Playwright docs link(s)** — Locators (the mechanism frame locators belong to):
    https://playwright.dev/docs/locators. **Note:** Playwright's dedicated frames guide is **not** in this
    plugin's verified research notes, so this skill does not quote it — confirm the frame-locator API on
    `playwright.dev` before citing a specific page.

*Check:* want this deeper (how auto-waiting resolves a slow frame), or a second example?

## Worked example B — "fixtures" (L2 Practical)

*(A topic that **does** have an owning standard — defer to it, don't restate it.)*

1. **What it is** — A fixture is how a test receives something ready-made (a client, a service, a cleanup
   registry, a seed): the test names it in its argument list and the runner sets it up before the body and
   tears it down after.
2. **Why apps use it** — Not an app behaviour; it's a *framework* building block. It replaces copy-pasted
   `beforeEach`/`afterEach` setup with one reusable, composable, type-safe provider.
3. **How Playwright handles it** — `base.extend<...>({ ... })` defines fixtures; the built-in `page` is the
   model. Teardown goes **after** the `use()` call, in the same place as setup.
4. **The relevant Playwright concepts** — `test.extend`, test-scope vs **worker-scope** (`{ scope:
   'worker' }`), automatic fixtures (`{ auto: true }`), composition via `mergeTests`, on-demand provisioning.
5. **Recommended approach** — Follow the kit standard rather than re-deriving it:
   **`knowledge/standards/fixtures.md`** — worker-scope the slow, shareable, read-only things (token,
   request context, seed); test-scope the per-test things (cleanup registry); use `mergeTests` so one
   module's fixtures can inject another's service (the backbone of cross-module reuse).
6. **Code example(s)** (product-neutral):
   ```ts
   import { test as base } from '@playwright/test';

   export const test = base.extend<{ cleanup: CleanupRegistry }, { seed: WidgetSeed }>({
     cleanup: async ({}, use) => {
       const registry = new CleanupRegistry();
       await use(registry);        // test body runs here
       await registry.runAll();    // teardown AFTER use() — same place as setup
     },
     seed: [async ({ api }, use) => {
       const created = await api.post('widgets', { data: { name: seedName('WIDGET') } });
       await use({ widgetId: (await created.json()).id });
     }, { scope: 'worker' }],      // built once per worker, shared, read-only
   });
   ```
7. **Common mistakes** — A `beforeEach` that creates + an `afterEach` that tears down (the canonical case
   for one fixture instead); **mutable** shared state in a worker fixture (breaks isolation under
   parallelism); provisioning a fixture no test names.
8. **Best practices** — Encapsulate setup *and* teardown together; keep worker-scoped seeds read-only;
   provision on demand; compose with `mergeTests`.
9. **When to use it (and when NOT)** — Use a fixture to hand a test anything it needs ready-made. The
   official docs still show `beforeEach` (e.g. login) as acceptable for simple repetition — the fixtures
   page just lists six reasons to prefer fixtures; `fixtures.md` keeps that tension visible.
10. **Official Playwright docs link(s)** — https://playwright.dev/docs/test-fixtures (fixtures and their
    advantages over hooks; worker scope; `mergeTests`); the hooks tension:
    https://playwright.dev/docs/best-practices.

*Check:* want the deep version (worker vs test scope trade-offs, `mergeTests` for cross-module reuse), or
should I point you at `cross-module-reuse.md` next?

---

## Boundary

This skill **explains**. It does not scaffold, generate, or run framework code — that is the builder
(SP3) — and it does not walk the ordered curriculum — that is `teach-automation`. For a "which should I
choose" decision, it hands off to `framework-standards` rather than re-deriving the ruling. It teaches
from the standards and the verified official docs, and it never fabricates a URL or an "official" practice.

## Done when

- [ ] The named topic was explained with every applicable template point, scaled to the chosen depth
- [ ] Depth defaulted to L2 and adjusted the **same** topic on "go deeper" / "keep it high level" / "explain like I'm new" (definitions per `depth-levels.md`, not redefined here)
- [ ] Where a standard owns the topic, it was **linked and taught from**, not restated
- [ ] Every official-docs claim cited a verified Source-URL; topics with no verified page said so and pointed to `playwright.dev`
- [ ] The example(s) were product-neutral — no product, org, real URL, path, or secret
- [ ] Understanding was checked (one steering question at the end)
