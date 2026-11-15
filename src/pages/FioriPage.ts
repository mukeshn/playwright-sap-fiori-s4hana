import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Base for Fiori apps. UI5 apps fire many OData calls and show a busy
 * indicator; `waitForUI5()` polls the app's pending-request counter, the same
 * idea as wdi5/UIVeri5's synchronisation with the UI5 core.
 */
export class FioriPage {
  readonly shellTitle: Locator;
  readonly busy: Locator;
  readonly toast: Locator;

  constructor(readonly page: Page) {
    this.shellTitle = page.locator('#shellAppTitle');
    this.busy = page.locator('#sapUiBusyIndicator');
    this.toast = page.locator('.sapMMessageToast');
  }

  async waitForUI5() {
    await this.page.waitForFunction(() => (window as unknown as { __pendingRequests: number }).__pendingRequests === 0);
    await expect(this.busy).toBeHidden();
  }

  /** Stable UI5 ids look like "<view>--<control>"; generated ones like "__xmlview3--..." should be avoided. */
  byId(id: string) {
    return this.page.locator(`[id="${id}"]`);
  }

  async expectToast(text: string | RegExp) {
    await expect(this.toast).toBeVisible();
    await expect(this.toast).toHaveText(text);
  }

  async chooseFromValueHelp(trigger: Locator, key: string) {
    await trigger.click();
    const dialog = this.page.locator('#soldToPartyValueHelp');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Search').fill(key);
    await dialog.locator(`tr[data-key="${key}"]`).click();
    await expect(dialog).toBeHidden();
  }
}
