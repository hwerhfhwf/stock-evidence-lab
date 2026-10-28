import test from 'node:test';
import assert from 'node:assert/strict';
import { BYD_SNAPSHOT } from '../ui/finscope-data.js';
import { normalizeResearchView, toSingleQuarterSeries } from '../ui/research-view.js';

test('toSingleQuarterSeries converts cumulative statements without inventing missing values', () => {
  const rows = [
    { fiscal_year: 2026, fiscal_period: 'Q1', period_end_ms: 1, operating_income: 100, parent_holder_net_profit: 10 },
    { fiscal_year: 2026, fiscal_period: 'Q2', period_end_ms: 2, operating_income: 240, parent_holder_net_profit: 18 },
    { fiscal_year: 2026, fiscal_period: 'Q3', period_end_ms: 3, operating_income: null, parent_holder_net_profit: 25 },
  ];
  const series = toSingleQuarterSeries(rows);
  assert.deepEqual(series.map((row) => row.revenue), [100, 140, null]);
  assert.deepEqual(series.map((row) => row.parentProfit), [10, 8, 7]);
});

test('normalizeResearchView preserves live nulls and module-level degradation', () => {
  const bundle = {
    thscode: '002594.SZ',
    generatedAt: '2026-10-29T01:00:00.000Z',
    source: '同花顺扶摇金融数据 API',
    company: { name: '比亚迪', thscode: '002594.SZ' },
    providers: { fuyao: 'available', ifind: 'unavailable' },
    modules: {
      market: { status: 'ok', snapshot: { last_price: 82.74, price_change_ratio_pct: 0.89, turnover: 1659308200 }, signals: { range: { start: '2025-10-01', end: '2026-10-28' }, series: [{ date_ms: 1, close_price: 80 }, { date_ms: 2, close_price: 82.74 }] }, errors: [] },
      financials: { status: 'partial', income: [{ fiscal_year: 2026, fiscal_period: 'Q1', period_end_ms: 1, operating_income: 100, parent_holder_net_profit: 10 }], balance: [], cashflow: [], errors: [{ code: 'balance_missing', message: 'missing' }] },
      indicators: { status: 'ok', report: '2026-1', data: { abilities: [{ ability: 'growth', indicators: [{ index_id: 'calculate_operating_income_yoy_growth_ratio', value: '-7.12' }] }] }, errors: [] },
      valuation: { status: 'ok', data: { pe_ttm: null, pb_mrq: 4.2, ps_ttm: 1.1, pcf_ttm: null }, timestamp: 2, errors: [] },
      industry: { status: 'unavailable', data: null, errors: [{ code: 'industry_mapping_unavailable', message: 'missing' }] },
      context: { status: 'unavailable', data: null, errors: [{ code: 'ifind_not_configured', message: 'not configured' }] },
    },
  };
  const view = normalizeResearchView(bundle, bundle.company, BYD_SNAPSHOT);
  assert.equal(view.sourceState.mode, 'live');
  assert.equal(view.quote.lastPrice, 82.74);
  assert.equal(view.valuation.peTtm, null);
  assert.equal(view.valuation.pbMrq, 4.2);
  assert.equal(view.context.status, 'unavailable');
  assert.equal(view.financials.status, 'partial');
  assert.equal(view.revenueComposition.status, 'ok');
  assert.equal(view.revenueComposition.sourceMode, 'disclosure');
});

test('normalizeResearchView labels the BYD disclosure fallback and never presents it as live', () => {
  const view = normalizeResearchView(null, { name: '比亚迪', thscode: '002594.SZ' }, BYD_SNAPSHOT);
  assert.equal(view.sourceState.mode, 'fallback');
  assert.equal(view.sourceState.label, '公开披露快照');
  assert.equal(view.quote.lastPrice, null);
  assert.equal(view.market.status, 'unavailable');
  assert.equal(view.revenueComposition.items.length, 3);
  assert.equal(Number(view.indicators.values.calculate_operating_income_yoy_growth_ratio.toFixed(2)), -7.13);
  assert.equal(Number(view.indicators.values.calculate_parent_holder_net_profit_yoy_growth_ratio.toFixed(2)), -20.54);
});

