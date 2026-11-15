import { type Locator } from '@playwright/test';
import { FioriPage } from './FioriPage';

export class CreateSalesOrderPage extends FioriPage {
  get soldToParty(): Locator { return this.byId('createSO--soldToParty-inner'); }
  get soldToValueHelp(): Locator { return this.byId('createSO--soldToParty-vhi'); }
  get customerRef(): Locator { return this.byId('createSO--po-inner'); }
  get salesOrg(): Locator { return this.byId('createSO--salesOrg-inner'); }
  get addItem(): Locator { return this.byId('createSO--addItem'); }
  get save(): Locator { return this.byId('createSO--save'); }
  get messageButton(): Locator { return this.byId('createSO--messagePopoverBtn'); }
  get messages(): Locator { return this.byId('createSO--messageList').locator('li'); }

  async open() {
    await this.page.goto('/sap/create.html');
  }

  async addLine(material: string, quantity: number) {
    await this.addItem.click();
    const row = this.byId('createSO--itemsTable').locator('tbody tr').last();
    await row.locator('select').selectOption(material);
    await row.locator('input').fill(String(quantity));
  }
}
