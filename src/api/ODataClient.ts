import { type APIRequestContext, expect } from '@playwright/test';

export const S4_USER = { username: 'S4_QA_USER', password: 'Welcome1!' };
const SRV = '/sap/opu/odata/sap/API_SALES_ORDER_SRV';

export interface SalesOrder {
  SalesOrder: string;
  SoldToParty: string;
  PurchaseOrderByCustomer: string;
  TotalNetAmount: string;
  OverallSDProcessStatus: 'A' | 'B' | 'C';
  to_Item?: { results: Array<{ Material: string; RequestedQuantity: string; NetAmount: string }> };
}

/**
 * OData V2 client for the S/4HANA Sales Order API (A2X).
 * Handles Basic auth and the CSRF token dance required for modifying requests.
 */
export class ODataClient {
  private csrf?: string;
  private readonly auth = { authorization: 'Basic ' + Buffer.from(`${S4_USER.username}:${S4_USER.password}`).toString('base64') };

  constructor(private readonly request: APIRequestContext) {}

  async fetchCsrfToken(): Promise<string> {
    const res = await this.request.get(`${SRV}/`, { headers: { ...this.auth, 'x-csrf-token': 'Fetch' } });
    expect(res).toBeOK();
    this.csrf = res.headers()['x-csrf-token'];
    expect(this.csrf, 'server must return a CSRF token').toBeTruthy();
    return this.csrf!;
  }

  async list(options: Record<string, string> = {}): Promise<{ results: SalesOrder[]; count?: number }> {
    const res = await this.request.get(`${SRV}/A_SalesOrder`, { headers: this.auth, params: { $format: 'json', ...options } });
    expect(res, await res.text()).toBeOK();
    const { d } = await res.json();
    return { results: d.results, count: d.__count ? Number(d.__count) : undefined };
  }

  async get(id: string, expand = 'to_Item'): Promise<SalesOrder> {
    const res = await this.request.get(`${SRV}/A_SalesOrder('${id}')`, { headers: this.auth, params: { $expand: expand, $format: 'json' } });
    expect(res).toBeOK();
    return (await res.json()).d;
  }

  async create(soldTo: string, items: Array<{ Material: string; RequestedQuantity: string }>, po = `PW-${Date.now()}`) {
    if (!this.csrf) await this.fetchCsrfToken();
    return this.request.post(`${SRV}/A_SalesOrder`, {
      headers: { ...this.auth, 'x-csrf-token': this.csrf! },
      data: { SalesOrderType: 'OR', SalesOrganization: '1710', DistributionChannel: '10', OrganizationDivision: '00', SoldToParty: soldTo, PurchaseOrderByCustomer: po, to_Item: { results: items } },
    });
  }

  async createOrThrow(soldTo: string, items: Array<{ Material: string; RequestedQuantity: string }>, po?: string): Promise<SalesOrder> {
    const res = await this.create(soldTo, items, po);
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()).d;
  }

  async patch(id: string, body: Record<string, string>) {
    if (!this.csrf) await this.fetchCsrfToken();
    return this.request.patch(`${SRV}/A_SalesOrder('${id}')`, { headers: { ...this.auth, 'x-csrf-token': this.csrf! }, data: body });
  }

  async remove(id: string) {
    if (!this.csrf) await this.fetchCsrfToken();
    return this.request.delete(`${SRV}/A_SalesOrder('${id}')`, { headers: { ...this.auth, 'x-csrf-token': this.csrf! } });
  }

  raw(path: string, init: { method?: 'GET' | 'POST'; headers?: Record<string, string>; data?: unknown; withAuth?: boolean } = {}) {
    const headers = { ...(init.withAuth === false ? {} : this.auth), ...init.headers };
    return init.method === 'POST' ? this.request.post(path, { headers, data: init.data }) : this.request.get(path, { headers });
  }
}
