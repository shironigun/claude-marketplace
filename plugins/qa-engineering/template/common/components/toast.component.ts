/**
 * ToastComponent — success/error notifications.
 *
 * `waitForSuccess()` is a WAIT, not an assertion — page objects may wait for UI
 * stability, but `expect()` stays in the spec so the report shows what was verified.
 */
import { type Locator, type Page } from '@playwright/test';

export class ToastComponent {
  readonly container: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.container = page.getByRole('alert');
    this.successMessage = this.container.filter({ hasText: /success|saved|created|updated/i });
    this.errorMessage = this.container.filter({ hasText: /error|failed|invalid/i });
  }

  async waitForSuccess(timeout = 10_000): Promise<void> {
    await this.successMessage.waitFor({ state: 'visible', timeout });
  }
}
