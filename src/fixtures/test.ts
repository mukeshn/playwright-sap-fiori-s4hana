import { test as base, expect } from '@playwright/test';
import { ODataClient, S4_USER } from '../api/ODataClient';
import { ListReportPage } from '../pages/ListReportPage';
import { CreateSalesOrderPage } from '../pages/CreateSalesOrderPage';
import { FioriPage } from '../pages/FioriPage';

type Fixtures = { odata: ODataClient; fiori: FioriPage; listReport: ListReportPage; createSO: CreateSalesOrderPage };
type Worker = { sessionCookie: { name: string; value: string } };

export const test = base.extend<Fixtures, Worker>({
  // Log on once per worker and share the SAP session cookie.
  sessionCookie: [async ({ playwright }, use, workerInfo) => {
    const baseURL = workerInfo.project.use.baseURL!;
    const ctx = await playwright.request.newContext({ baseURL });
    const res = await ctx.post('/sap/bc/ui2/login', { data: S4_USER });
    const cookie = /SAP_SESSIONID_QA=([^;]+)/.exec(res.headers()['set-cookie'] ?? '')![1];
    await ctx.dispose();
    await use({ name: 'SAP_SESSIONID_QA', value: cookie });
  }, { scope: 'worker' }],

  page: async ({ page, sessionCookie, baseURL }, use) => {
    await page.context().addCookies([{ ...sessionCookie, url: baseURL! }]);
    await use(page);
  },
  odata: async ({ request }, use) => use(new ODataClient(request)),
  fiori: async ({ page }, use) => use(new FioriPage(page)),
  listReport: async ({ page }, use) => use(new ListReportPage(page)),
  createSO: async ({ page }, use) => use(new CreateSalesOrderPage(page)),
});

export { expect };
export const uniquePO = (prefix = 'PW') => `${prefix}-${Date.now().toString(36).toUpperCase()}`;
