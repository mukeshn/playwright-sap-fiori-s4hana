import { type Locator, expect } from '@playwright/test';
import { FioriPage } from './FioriPage';

export class ListReportPage extends FioriPage {
  get soldToParty(): Locator { return this.byId('listReport--soldToParty-inner'); }
  get soldToValueHelp(): Locator { return this.byId('listReport--soldToParty-vhi'); }
  get status(): Locator { return this.byId('listReport--status-inner'); }
  get customerRef(): Locator { return this.byId('listReport--po-inner'); }
  get go(): Locator { return this.byId('listReport--btnGo'); }
  get title(): Locator { return this.byId('listReport--tableTitle'); }
  get rows(): Locator { return this.byId('listReport--table-tblBody').locator('tr'); }
  get more(): Locator { return this.byId('listReport--table-trigger'); }
  get noData(): Locator { return this.byId('listReport--table-nodata'); }

  async open(query = '') {
    await this.page.goto('/sap/salesorders.html' + query);
    await this.waitForUI5();
  }

  async search() {
    await this.go.click();
    await this.waitForUI5();
  }

  async totalCount(): Promise<number> {
    const text = await this.title.innerText();
    return Number(/\((\d+)\)/.exec(text)![1]);
  }

  column(col: 'SalesOrder' | 'SoldToParty' | 'PurchaseOrderByCustomer' | 'TotalNetAmount' | 'OverallSDProcessStatus') {
    return this.rows.locator(`td[data-col="${col}"]`);
  }

  async sortBy(header: 'Sales Order' | 'Sold-To Party' | 'Customer Reference' | 'Net Value') {
    await this.page.getByRole('columnheader', { name: header }).click();
    await this.waitForUI5();
  }

  async loadAll() {
    while (await this.more.isVisible()) {
      await this.more.click();
      await this.waitForUI5();
    }
    await expect(this.more).toBeHidden();
  }
}
