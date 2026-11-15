import { test, expect, uniquePO } from '../../src/fixtures/test';

test.describe('Create Sales Order (VA01-style)', () => {
  test('create a standard order with two items', { tag: ['@smoke', '@e2e'] }, async ({ page, createSO, odata }) => {
    const po = uniquePO();
    await createSO.open();
    await createSO.chooseFromValueHelp(createSO.soldToValueHelp, '17100001');
    await createSO.customerRef.fill(po);
    await createSO.addLine('TG11', 2);
    await createSO.addLine('RM14', 10);
    await createSO.save.click();

    await createSO.expectToast(/Standard Order \d+ has been saved/);
    await expect(page).toHaveURL(/salesorder\.html\?id=\d+/);
    const id = new URL(page.url()).searchParams.get('id')!;

    const so = await odata.get(id);
    expect(so).toMatchObject({ SoldToParty: '17100001', PurchaseOrderByCustomer: po, OverallSDProcessStatus: 'A', TotalNetAmount: '368.50' });
    expect(so.to_Item!.results.map((i) => i.Material)).toEqual(['TG11', 'RM14']);
  });

  test('backend validation errors land in the message popover', async ({ createSO }) => {
    await createSO.open();
    await createSO.soldToParty.fill('99999999');
    await createSO.addLine('XX99', 0);
    await createSO.save.click();
    await expect(createSO.messages).toHaveText([
      'Sold-to party 99999999 does not exist',
      'Material XX99 is not defined',
      'Quantity must be greater than zero',
    ]);
    await expect(createSO.messages.nth(1)).toHaveAttribute('data-target', 'to_Item[0]/Material');
    await createSO.byId('createSO--messagePopover-close').click();
    await expect(createSO.messageButton).toHaveText('⚠ 3');
  });

  test('an order without items is rejected', async ({ createSO }) => {
    await createSO.open();
    await createSO.soldToParty.fill('17100002');
    await createSO.save.click();
    await expect(createSO.messages).toHaveText(['Enter at least one item']);
  });

  test('POST carries the CSRF token fetched beforehand', async ({ page, createSO }) => {
    await createSO.open();
    await createSO.soldToParty.fill('17100004');
    await createSO.addLine('TG12', 1);
    const fetchReq = page.waitForRequest((r) => r.headers()['x-csrf-token'] === 'Fetch');
    const postReq = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/A_SalesOrder'));
    await createSO.save.click();
    await fetchReq;
    expect((await postReq).headers()['x-csrf-token']).toMatch(/^[a-f0-9]{24}==$/);
  });
});

test.describe('Sales order object page', () => {
  test('edit customer reference', async ({ fiori, odata, page }) => {
    const so = await odata.createOrThrow('17100005', [{ Material: 'FG126', RequestedQuantity: '1' }]);
    await page.goto(`/sap/salesorder.html?id=${so.SalesOrder}`);
    await fiori.waitForUI5();
    await fiori.byId('objectPage--edit').click();
    const newRef = uniquePO('EDIT');
    await fiori.byId('objectPage--po-inner').fill(newRef);
    await fiori.byId('objectPage--save').click();
    await fiori.expectToast('Your changes have been saved.');
    await expect(fiori.byId('objectPage--po-text')).toHaveText(newRef);
    expect((await odata.get(so.SalesOrder)).PurchaseOrderByCustomer).toBe(newRef);
  });

  test('completely processed orders cannot be changed', async ({ fiori, page }) => {
    await page.goto(`/sap/salesorder.html?id=1000`); // seeded with status C
    await fiori.waitForUI5();
    await fiori.byId('objectPage--edit').click();
    await fiori.byId('objectPage--po-inner').fill('CHANGE');
    await fiori.byId('objectPage--save').click();
    await expect(fiori.byId('objectPage--error')).toHaveText('Sales order 1000 is completely processed and cannot be changed');
  });

  test('delete with confirmation dialog', async ({ fiori, odata, page }) => {
    const so = await odata.createOrThrow('17100002', [{ Material: 'TG12', RequestedQuantity: '2' }]);
    await page.goto(`/sap/salesorder.html?id=${so.SalesOrder}`);
    await fiori.waitForUI5();
    await fiori.byId('objectPage--delete').click();
    await expect(fiori.byId('confirmDeleteDialog-text')).toHaveText(`Delete sales order ${so.SalesOrder}?`);
    await fiori.byId('confirmDeleteDialog-ok').click();
    await fiori.expectToast(`Sales order ${so.SalesOrder} deleted`);
    await expect(page).toHaveURL(/salesorders\.html/);
  });
});
