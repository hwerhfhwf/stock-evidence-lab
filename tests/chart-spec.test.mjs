import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBalanceFlow,
  buildCashCoverage,
  buildMarketTracks,
  buildProfitConversion,
  renderBalanceFlowChart,
  renderProfitConversionChart,
} from '../ui/chart-spec.js';

test('profit conversion shows how much parent profit remains per 100 yuan revenue', () => {
  const model = buildProfitConversion([
    { label: '2025H1', revenue: 371_280_948_000, parentProfit: 15_510_533_000 },
    { label: '2026H1', revenue: 344_815_421_000, parentProfit: 12_325_408_000 },
  ]);
  assert.equal(model.rows[0].per100, 4.18);
  assert.equal(model.rows[1].per100, 3.57);
  assert.equal(model.deltaPp, -0.61);
  assert.match(renderProfitConversionChart(model, ['H126']), /每 100 元收入/);
  assert.match(renderProfitConversionChart(model, ['H126']), /data-source-ref="H126"/);
});

test('balance flow preserves one accounting identity and proportional geometry', () => {
  const model = buildBalanceFlow({ assets: 883.73, liabilities: 625.19, currentAssets: 371.47, cash: 75.42 });
  assert.equal(model.equity, 258.54);
  assert.equal(Number((model.sources.liabilities + model.sources.equity).toFixed(2)), 883.73);
  assert.equal(Number((model.uses.cash + model.uses.otherCurrent + model.uses.nonCurrent).toFixed(2)), 883.73);
  assert.notEqual(model.sourceWidths.liabilities, model.sourceWidths.equity);
  assert.match(renderBalanceFlowChart(model, ['AR25']), /资产 = 负债 \+ 权益/);
});

test('cash coverage separates operating cash capital expenditure and uncovered amount', () => {
  const model = buildCashCoverage({ cfo: 591.36, capex: 1568.08 });
  assert.equal(model.covered, 591.36);
  assert.equal(model.uncovered, 976.72);
  assert.equal(model.coveragePct, 37.71);
});

test('three market tracks preserve missing observations and use the same interval', () => {
  const tracks = buildMarketTracks([
    { date_ms: 1, close_price: 100 },
    { date_ms: 2, close_price: 90 },
    { date_ms: 3, close_price: null },
    { date_ms: 4, close_price: 99 },
  ]);
  assert.deepEqual(tracks.price.map(point => point.value), [100, 90, null, 99]);
  assert.deepEqual(tracks.drawdown.map(point => point.value), [0, -10, null, -1]);
  assert.equal(tracks.range.start, 1);
  assert.equal(tracks.range.end, 4);
});
