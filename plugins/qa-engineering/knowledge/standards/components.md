# Components

> Reusable component objects for repeated widgets (nav, dialogs, tables, toasts), composed into pages.

## Purpose
Some UI pieces appear on many screens — the navigation bar, a confirmation modal, a toast, a data table.
A component object captures one such piece once (its locators and its interactions) and is composed into
every page object that shows it, so a change to the shared widget is one edit instead of many. Like page
objects, components *act* and *wait* but never assert.

## When to use it (and when NOT)
- **Use a component object** for any widget that repeats across screens, or any self-contained
  interaction worth naming (open a dialog and confirm, wait for a success toast, read a table row).
- **Compose it into pages** as a field (`this.toast = new ToastComponent(page)`), not by copying its
  locators into each page.
- **Keep waits in, assertions out** — a `waitForSuccess()` is a wait; the spec asserts the outcome.
- **Do NOT** make a component for a one-off control that lives on a single screen — that belongs on its
  page object.
- **Do NOT** let a component reach into another screen's internals; it owns only its own widget.

## Official guidance
- The POM rationale — a higher-level API, selectors in one place, reusable code to avoid repetition —
  applies to any reusable UI object, components included — https://playwright.dev/docs/pom
- Prefer user-facing locators (role/label/text) for a component's controls, same as for pages —
  https://playwright.dev/docs/best-practices
- (Kit convention) splitting reusable widgets into component objects composed into pages is the kit's own
  structuring of the POM idea; Playwright documents the pattern, not this specific split.

## Code shape (product-neutral)
```ts
import { type Locator, type Page } from '@playwright/test';

/** A reusable widget: the toast notification, used by many screens. */
export class ToastComponent {
  readonly container: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.container = page.getByRole('alert');                                   // role-first
    this.successMessage = this.container.filter({ hasText: /success|saved|created/i });
  }

  async waitForSuccess(timeout = 10_000): Promise<void> {
    await this.successMessage.waitFor({ state: 'visible', timeout });           // a wait, not expect()
  }
}
```
```ts
// Composed into a page object as a field — defined once, reused everywhere it appears.
export class WidgetsPage {
  readonly toast = new ToastComponent(this.page);
  readonly modal = new ModalComponent(this.page);
  constructor(readonly page: Page) {}
  async activate(): Promise<void> {
    await this.page.getByRole('button', { name: /activate/i }).click();
    await this.modal.confirm();          // reuse the shared dialog interaction
    await this.toast.waitForSuccess();   // reuse the shared toast wait
  }
}
```

## Anti-patterns
- Re-declaring a shared widget's locators inside every page object instead of composing one component.
- `expect()` inside a component — assertions belong in the spec.
- A "component" that is really page-specific — if it only appears on one screen, it is part of that page
  object.
- A component that drives other screens or asserts navigation — it should own only its own widget's
  behaviour.

## Related standards
- `page-objects.md` — the screens that compose components.
- `isolation-and-parallelism.md` — shared component objects hold no cross-test state.
- `test-levels.md` — components serve the UI levels (smoke / regression / e2e).
