import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHealthReport } from '../ui/health-model.js';

const bundle = {
  modules: {
    market: { status: 'ok', snapshot: { last_price: 85.5 }, signals: { return60: -2.4, maxDrawdown60: -11.2, ma20: 84 } },
    financials: { status: 'ok', income: [{ operating_income: 120, parent_holder_net_profit: 12 }], balance: [], cashflow: [] },
    indicators: { status: 'ok', data: { abilities: [
      { ability: 'growth', indicators: [{ index_id: 'calculate_operating_income_yoy_growth_ratio', value: 8.2 }, { index_id: 'calculate_parent_holder_net_profit_yoy_growth_ratio', value: 4.1 }] },
      { ability: 'cash-flow', indicators: [{ index_id: 'net_profit_cash_content', value: 126 }] },
      { ability: 'solvency', indicators: [{ index_id: 'assets_debt_ratio', value: 64 }] },
    ] } },
  },
};

test('buildHealthReport creates one ordered five-step novice journey', () => {
  const report = buildHealthReport(bundle, { name: '示例公司', thscode: '000001.SZ' });
  assert.deepEqual(report.steps.map(step => step.key), ['earning', 'cash', 'safety', 'market', 'unknowns']);
  assert.deepEqual(report.steps.map(step => step.question), ['生意还在增长吗？', '赚到的钱真的收到现金了吗？', '公司的财务负担重吗？', '市场最近怎么看它？', '还有哪些事现在不能下结论？']);
  assert.ok(report.steps.every(step => step.why && step.interpretation && step.primaryEvidence));
  assert.match(report.summary, /示例公司/);
  assert.equal(report.steps.some(step => /growth|cash-flow|assets_debt_ratio/.test(step.title)), false);
});

test('buildHealthReport preserves unknowns and partial failures instead of inventing conclusions', () => {
  const degraded = structuredClone(bundle);
  degraded.modules.indicators = { status: 'error', data: null, errors: [{ code: 'upstream_failed' }] };
  const report = buildHealthReport(degraded, { name: '缺失公司', thscode: '000002.SZ' });
  assert.equal(report.steps[0].state, 'unknown');
  assert.equal(report.steps[1].state, 'unknown');
  assert.equal(report.steps[2].state, 'unknown');
  assert.match(report.summary, /证据还不完整|不足以概括基本面/);
  assert.ok(report.actions.some(action => /补齐/.test(action)));
});

test('buildHealthReport uses plain Chinese status labels and avoids investment advice', () => {
  const report = buildHealthReport(bundle, { name: '示例公司', thscode: '000001.SZ' });
  const allowed = new Set(['表现较稳', '需要留意', '出现分化', '暂无结论']);
  assert.ok(report.steps.every(step => allowed.has(step.label)));
  assert.doesNotMatch(JSON.stringify(report), /买入|卖出|目标价|一定会涨/);
  assert.ok(report.actions.length >= 2 && report.actions.length <= 3);
});

test('buildHealthReport stays conservative when most vital signs are unknown even if modules succeeded', () => {
  const sparse = structuredClone(bundle);
  sparse.modules.indicators.data.abilities = [];
  const report = buildHealthReport(sparse, { name: '稀疏公司', thscode: '000003.SZ' });
  assert.match(report.summary, /不足以概括基本面/);
  assert.doesNotMatch(report.summary, /基本面有支撑/);
});

test('buildHealthReport exposes the latest financial report period separately from market freshness', () => {
  const dated = structuredClone(bundle);
  dated.modules.financials.income[0].period_end_ms = Date.UTC(2026, 5, 30);
  const report = buildHealthReport(dated, { name: '示例公司', thscode: '000001.SZ' });
  assert.equal(report.financialPeriod, '2026-06-30');
});
