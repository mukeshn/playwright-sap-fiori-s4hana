import { test, expect } from '../../src/fixtures/test';

test.describe('Manage Sales Orders - list report', () => {
  test.beforeEach(async ({ listReport }) => listReport.open());

  test('growing table loads 5 rows at a time', { tag: '@smoke' }, async ({ listReport }) => {
    await expect(listReport.rows).toHaveCount(5);
    const total = await listReport.totalCount();
    await expect(listReport.byId('listReport--table-triggerInfo')).toHaveText(`[ 5 / ${total} ]`);
    await listReport.loadAll();
    await expect(listReport.rows).toHaveCount(total);
  });

  test('filter by status uses the value of the select', async ({ listReport }) => {
    await listReport.status.selectOption('C');
    await listReport.search();
    await listReport.loadAll();
    const statuses = await listReport.column('OverallSDProcessStatus').allInnerTexts();
    expect(new Set(statuses)).toEqual(new Set(['Completely Processed']));
  });

  test('sold-to party value help fills the filter', async ({ listReport }) => {
    await listReport.chooseFromValueHelp(listReport.soldToValueHelp, '17100003');
    await expect(listReport.soldToParty).toHaveValue('17100003');
    await listReport.search();
    await listReport.loadAll();
    for (const v of await listReport.column('SoldToParty').allInnerTexts()) expect(v).toBe('17100003');
  });

  test('table count equals OData $inlinecount for the same filter', async ({ listReport, odata }) => {
    await listReport.soldToParty.fill('17100002');
    await listReport.status.selectOption('A');
    await listReport.search();
    const api = await odata.list({ $filter: "SoldToParty eq '17100002' and OverallSDProcessStatus eq 'A'", $inlinecount: 'allpages' });
    expect(await listReport.totalCount()).toBe(api.count);
  });

  test('customer reference uses substringof() and escapes quotes', async ({ page, listReport }) => {
    const req = page.waitForRequest((r) => r.url().includes('substringof'));
    await listReport.customerRef.fill("PO-47");
    await listReport.search();
    expect(decodeURIComponent((await req).url())).toContain("substringof('PO-47',PurchaseOrderByCustomer)");
    for (const v of await listReport.column('PurchaseOrderByCustomer').allInnerTexts()) expect(v).toContain('PO-47');
  });

  test('no results shows the empty-state text', async ({ listReport }) => {
    await listReport.customerRef.fill('DOES-NOT-EXIST');
    await listReport.search();
    await expect(listReport.noData).toHaveText('No data found. Try adjusting the filter settings.');
    await expect(listReport.title).toHaveText('Sales Orders (0)');
  });

  test('sorting by Net Value ascending sends $orderby', async ({ page, listReport }) => {
    const req = page.waitForRequest((r) => r.url().includes('TotalNetAmount'));
    await listReport.sortBy('Net Value');
    expect(decodeURIComponent((await req).url())).toContain('$orderby=TotalNetAmount asc');
    const values = (await listReport.rows.locator('td[data-col="TotalNetAmount"]').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.value))));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  test('clicking a row opens the object page', async ({ page, listReport }) => {
    const first = await listReport.column('SalesOrder').first().innerText();
    await listReport.rows.first().locator('td[data-col="SoldToParty"]').click();
    await expect(page).toHaveURL(new RegExp(`salesorder\\.html\\?id=${first}`));
    await expect(listReport.byId('objectPage--soNumber')).toHaveText(first);
  });
});
