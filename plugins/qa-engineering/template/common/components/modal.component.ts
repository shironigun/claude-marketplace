/**
 * ModalComponent — confirmation and form dialogs.
 *
 * Scoped to `role="dialog"`, so the buttons inside a modal never collide with
 * same-named buttons on the page behind it.
 */
import { type Locator, type Page } from '@playwright/test';

export class ModalComponent {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog');
    this.title = this.dialog.getByRole('heading');
    this.confirmButton = this.dialog.getByRole('button', { name: /confirm|yes|save|delete|ok/i });
    this.cancelButton = this.dialog.getByRole('button', { name: /cancel|no|close/i });
  }

  async waitForOpen(): Promise<void> {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async dismiss(): Promise<void> {
    await this.cancelButton.click();
  }
}
