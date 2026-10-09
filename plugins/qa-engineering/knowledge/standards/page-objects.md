# Page objects

> One class per screen; controls named by role/label (user-facing locators); actions as methods; no `expect()` inside.

## Purpose
A page object is the UI's equivalent of a service: one class per screen that captures its locators and
wraps its interactions as methods, so a UI spec reads as intent (`await widgetsPage.createWidget(name)`)
and selectors live in one place. Locators are user-facing (role, label, text) so they survive a CSS
refactor. Page objects *act* and *wait*; they never assert — `expect()` stays in the spec so the report
shows exactly what was verified.

## When to use it (and when NOT)
- **One page object per screen.** Give it a field per control and a method per action.
- **Name controls by role/label first** (`getByRole('button', { name: 'Save' })`,
  `getByLabel('Name')`) — the priority order is role → label → placeholder → text → test id → id → CSS →
  XPath.
- **Waits are allowed** (`waitFor`, `waitForURL`) because they record no pass/fail; assertions are not.
- **Reuse methods** across specs; extract a repeated widget into a component object (see `components.md`).
- **Do NOT** put `expect()` in a page object — assertions belong in the spec.
- **Do NOT** build a giant god-POM or duplicate the same selector/action across classes.

## Official guidance
- Page objects "simplify authoring by creating a higher-level API," "simplify maintenance by capturing
  element selectors in one place," and "create reusable code to avoid repetition" —
  https://playwright.dev/docs/pom
- Prefer user-facing locators over XPath/CSS tied to structure, and let the test instantiate the POM (or
  receive it via a fixture) — https://playwright.dev/docs/best-practices · https://playwright.dev/docs/test-fixtures
- Tension to keep visible: the POM page's own example uses a `page.locator(...)` CSS/text selector, while
  Best Practices says to prefer role/text/test-id — the Best-Practices/Locators rule wins —
  https://playwright.dev/docs/pom · https://playwright.dev/docs/locators

## Code shape (product-neutral)
```ts
import { type Locator, type Page } from '@playwright/test';
import { ToastComponent } from '../../../../common/components/toast.component';

export class WidgetsPage {
  readonly toast: ToastComponent;              // composed component object
  readonly heading: Locator;
  readonly newButton: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly rows: Locator;

  constructor(readonly page: Page) {
    this.toast = new ToastComponent(page);
    this.heading   = page.getByRole('heading', { name: 'Widgets' });       // role-first
    this.newButton = page.getByRole('button', { name: /new widget/i });
    this.nameInput = page.getByLabel('Name');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.rows = page.getByRole('row');
  }

  // Actions — waits only, NEVER expect()
  async navigate(): Promise<void> {
    await this.page.goto('/widgets');
    await this.page.waitForURL(/widgets/);      // a wait, not an assertion
  }
  async createWidget(name: string): Promise<void> {
    await this.newButton.click();
    await this.nameInput.fill(name);
    await this.saveButton.click();
    await this.toast.container.waitFor();        // wait for the UI to settle
  }
}
```

## Anti-patterns
- `expect()` inside a page object — it moves verification out of the spec and the report stops reflecting
  what was tested.
- Class-name or deep-CSS selectors (`button.buttonIcon.episode-actions-later`) — they break the moment a
  designer changes styling; use role/label.
- A single enormous page object covering many screens, or the same selector/action copy-pasted across
  classes — split by screen and extract shared widgets into components.
- Clicking through the UI to build a precondition that an API service could create in under a second.

## Related standards
- `components.md` — reusable widget objects (nav, dialogs, tables) composed into pages.
- `services.md` — build UI preconditions over the API, then assert in the UI.
- `auth-and-storage-state.md` — the page arrives authenticated via the setup project.
- `test-levels.md` — which UI level (smoke / regression / e2e) a page object's methods serve.
