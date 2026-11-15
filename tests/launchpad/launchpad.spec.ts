import { test as base, expect } from '@playwright/test';
import { test } from '../../src/fixtures/test';

base.describe('SAP logon', () => {
  base('logon with valid user opens the launchpad', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/sap/login.html');
    await page.getByLabel('User').fill('S4_QA_USER');
    await page.getByLabel('Password').fill('Welcome1!');
    await page.getByRole('button', { name: 'Log On' }).click();
    await expect(page).toHaveURL(/flp\.html#Shell-home/);
    await expect(page.getByRole('link', { name: 'Manage Sales Orders' })).toBeVisible();
  });

  base('wrong password shows the logon error', async ({ page }) => {
    await page.goto('/sap/login.html');
    await page.getByLabel('User').fill('S4_QA_USER');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Log On' }).click();
    await expect(page.getByRole('alert')).toHaveText('Name or password is incorrect (repeat logon)');
  });
});

test.describe('Fiori launchpad', () => {
  test('KPI tiles match the OData $count of open and completed orders', async ({ page, fiori, odata }) => {
    await page.goto('/sap/flp.html#Shell-home');
    await fiori.waitForUI5();
    const open = (await odata.list({ $filter: "OverallSDProcessStatus ne 'C'", $inlinecount: 'allpages', $top: '0' })).count;
    const done = (await odata.list({ $filter: "OverallSDProcessStatus eq 'C'", $inlinecount: 'allpages', $top: '0' })).count;
    await expect(fiori.byId('__tile0-kpi')).toHaveText(String(open));
    await expect(fiori.byId('__tile2-kpi')).toHaveText(String(done));
  });

  test('tile navigation opens the app with the shell title', async ({ page, fiori }) => {
    await page.goto('/sap/flp.html#Shell-home');
    await page.getByRole('link', { name: 'Manage Sales Orders' }).click();
    await expect(fiori.shellTitle).toHaveText('Manage Sales Orders');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/flp\.html/);
  });
});
