import { test, expect, uniquePO } from '../../src/fixtures/test';

const SRV = '/sap/opu/odata/sap/API_SALES_ORDER_SRV';

test.describe('API_SALES_ORDER_SRV (OData V2)', { tag: '@api' }, () => {
  test('requires authentication', async ({ odata }) => {
    const res = await odata.raw(`${SRV}/A_SalesOrder`, { withAuth: false });
    expect(res.status()).toBe(401);
    expect(res.headers()['www-authenticate']).toContain('Basic');
  });

  test('$metadata describes the entity sets', async ({ odata }) => {
    const res = await odata.raw(`${SRV}/$metadata`);
    const xml = await res.text();
    expect(res.headers()['content-type']).toContain('application/xml');
    expect(xml).toContain('<EntitySet Name="A_SalesOrder"');
    expect(xml).toContain('<PropertyRef Name="SalesOrder"/>');
  });

  test('$select returns only the requested properties (plus __metadata)', async ({ odata }) => {
    const { results } = await odata.list({ $select: 'SalesOrder,SoldToParty', $top: '3' });
    expect(results).toHaveLength(3);
    for (const r of results) expect(Object.keys(r).sort()).toEqual(['SalesOrder', 'SoldToParty', '__metadata']);
  });

  test('$top and $skip page consistently', async ({ odata }) => {
    const all = (await odata.list({ $orderby: 'SalesOrder asc', $select: 'SalesOrder' })).results.map((r) => r.SalesOrder);
    const page2 = (await odata.list({ $orderby: 'SalesOrder asc', $select: 'SalesOrder', $top: '4', $skip: '4' })).results.map((r) => r.SalesOrder);
    expect(page2).toEqual(all.slice(4, 8));
  });

  test('$expand=to_Item includes items, without it they are omitted', async ({ odata }) => {
    const withItems = await odata.get('1001');
    expect(withItems.to_Item!.results.length).toBeGreaterThan(0);
    const res = await odata.raw(`${SRV}/A_SalesOrder('1001')?$format=json`);
    expect((await res.json()).d.to_Item).toBeUndefined();
  });

  test('unknown key returns an SAP error payload', async ({ odata }) => {
    const res = await odata.raw(`${SRV}/A_SalesOrder('9999999')`);
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toMatchObject({ code: 'V1/302', message: { lang: 'en', value: 'Sales order 9999999 does not exist' } });
  });

  test('POST without CSRF token is refused', async ({ odata }) => {
    const res = await odata.raw(`${SRV}/A_SalesOrder`, { method: 'POST', data: {} });
    expect(res.status()).toBe(403);
    expect(res.headers()['x-csrf-token']).toBe('Required');
    expect(await res.text()).toBe('CSRF token validation failed');
  });

  test('deep insert creates header and items and returns sap-message', async ({ odata }) => {
    const res = await odata.create('17100003', [{ Material: 'TG11', RequestedQuantity: '4' }], uniquePO('API'));
    expect(res.status()).toBe(201);
    const { d } = await res.json();
    expect(res.headers()['location']).toBe(`${SRV}/A_SalesOrder('${d.SalesOrder}')`);
    expect(JSON.parse(res.headers()['sap-message'])).toMatchObject({ code: 'V1/311', severity: 'success' });
    expect(d.to_Item.results[0]).toMatchObject({ SalesOrderItem: '10', NetAmount: '482.00' });
  });

  test('only open orders without follow-on documents can be deleted', async ({ odata }) => {
    expect((await odata.remove('1002')).status()).toBe(400); // seeded with status B
    const so = await odata.createOrThrow('17100001', [{ Material: 'TG12', RequestedQuantity: '1' }]);
    expect((await odata.remove(so.SalesOrder)).status()).toBe(204);
  });

  test('PATCH rejects read-only properties', async ({ odata }) => {
    const so = await odata.createOrThrow('17100001', [{ Material: 'TG12', RequestedQuantity: '1' }]);
    const res = await odata.patch(so.SalesOrder, { SoldToParty: '17100002' });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.message.value).toBe('Property SoldToParty cannot be changed');
  });
});
