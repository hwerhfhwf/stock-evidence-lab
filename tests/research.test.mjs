import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchBundle, calculateMarketSignals, reportFromPeriodEnd } from '../worker/research.js';

test('calculateMarketSignals computes returns, moving averages and max drawdown deterministically', () => {
  const bars = Array.from({ length: 130 }, (_, index) => ({
    date_ms: Date.UTC(2026, 0, index + 1),
    close_price: index < 80 ? 100 + index : 180 - (index - 79) * 0.5,
    turnover: 1_000_000 + index,
  }));
  const result = calculateMarketSignals(bars);
  assert.equal(result.points, 130);
  assert.ok(Number.isFinite(result.ma20));
  assert.ok(Number.isFinite(result.ma60));
  assert.ok(Number.isFinite(result.ma120));
  assert.ok(result.maxDrawdown60 < 0);
  assert.equal(result.series.length, 130);
});

test('calculateMarketSignals preserves unknowns for short or empty histories', () => {
  assert.equal(calculateMarketSignals([]).ma20, null);
  assert.equal(calculateMarketSignals([{ close_price: 10, date_ms: 1 }]).ma20, null);
  assert.equal(calculateMarketSignals([{ close_price: 10, date_ms: 1 }]).return60, null);
});

test('calculateMarketSignals records its trading range and forward-adjusted basis',()=>{
  const bars=[{date_ms:Date.UTC(2026,0,2),close_price:10},{date_ms:Date.UTC(2026,0,5),close_price:11}];
  const result=calculateMarketSignals(bars);
  assert.deepEqual(result.range,{start:'2026-01-02',end:'2026-01-05'});
  assert.equal(result.adjustment,'forward_adjusted');
});

test('reportFromPeriodEnd maps quarter ends to Fuyao report identifiers', () => {
  assert.equal(reportFromPeriodEnd(Date.UTC(2026, 5, 30)), '2026-2');
  assert.equal(reportFromPeriodEnd(Date.UTC(2025, 11, 31)), '2025-4');
  assert.equal(reportFromPeriodEnd(null), null);
});

test('buildResearchBundle keeps successful modules when one upstream request fails', async () => {
  const ok = (data) => Promise.resolve({ data, requestId: 'ok-id' });
  const client = {
    snapshot: () => ok({ timestamp: 10, item: [{ thscode: '000333.SZ', last_price: 80 }] }),
    historical: () => ok({ timestamp: 10, item: Array.from({ length: 121 }, (_, i) => ({ date_ms: i + 1, close_price: 60 + i })) }),
    incomeStatements: () => ok({ item: [{ period_end_ms: Date.UTC(2026, 5, 30), operating_income: 100, net_profit_parent_company: 10 }] }),
    balanceSheets: () => Promise.reject(Object.assign(new Error('denied'), { code: 'permission_denied', requestId: 'deny-id' })),
    cashFlowStatements: () => ok({ item: [{ period_end_ms: Date.UTC(2026, 5, 30), net_cash_flow_operating: 12 }] }),
    indicators: () => ok({ report: '2026-2', abilities: [] }),
  };
  const bundle = await buildResearchBundle(client, '000333.SZ', Date.UTC(2026, 9, 28));
  assert.equal(bundle.modules.market.status, 'ok');
  assert.equal(bundle.modules.financials.status, 'partial');
  assert.equal(bundle.modules.financials.errors[0].code, 'permission_denied');
  assert.equal(bundle.modules.indicators.status, 'ok');
  assert.equal(bundle.modules.market.signals.points, 121);
});
