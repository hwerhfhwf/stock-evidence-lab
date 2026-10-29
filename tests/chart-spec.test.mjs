import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBalanceFlow,
  buildCashCoverage,
  buildMarketTracks,
  buildProfitConversion,
  renderBalanceFlowChart,
  renderCashCoverageChart,
  renderMarketTracksChart,
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

test('balance flow keeps values in an external legend instead of narrow asset segments', () => {
  const model = buildBalanceFlow({ assets: 9412.8, liabilities: 6679.1, currentAssets: 4200, cash: 587.4 });
  const html = renderBalanceFlowChart(model, ['BS26Q2']);
  assert.match(html, /class="balance-legend asset-legend"/);
  assert.match(html, /现金[^<]*587\.4 亿[^<]*6\.2%/);
  assert.match(html, /其他流动资产[^<]*3,612\.6 亿[^<]*38\.4%/);
  assert.match(html, /非流动资产[^<]*5,212\.8 亿[^<]*55\.4%/);
  assert.doesNotMatch(html, /<text[^>]*y="51"[^>]*>现金/);
});

test('cash coverage separates operating cash capital expenditure and uncovered amount', () => {
  const model = buildCashCoverage({ cfo: 591.36, capex: 1568.08 });
  assert.equal(model.covered, 591.36);
  assert.equal(model.uncovered, 976.72);
  assert.equal(model.coveragePct, 37.71);

  const negativeCash = buildCashCoverage({ cfo: -50, capex: 100 });
  assert.equal(negativeCash.covered, 0);
  assert.equal(negativeCash.uncovered, 100);
  assert.equal(negativeCash.coveragePct, -50);
});

test('cash coverage binds each value to its colored segment and exposes surplus separately', () => {
  const shortfall = buildCashCoverage({ cfo: 373.4, capex: 447, periodLabel: '2026Q2' });
  assert.equal(shortfall.state, 'shortfall');
  assert.equal(shortfall.coveredPct, 83.53);
  assert.equal(shortfall.gapPct, 16.47);
  const shortfallHtml = renderCashCoverageChart(shortfall, ['CF26Q2']);
  assert.match(shortfallHtml, /class="coverage-segment covered"/);
  assert.match(shortfallHtml, /经营现金覆盖[^<]*373\.4 亿[^<]*83\.5%/);
  assert.match(shortfallHtml, /class="coverage-segment shortfall"/);
  assert.match(shortfallHtml, /资金缺口[^<]*73\.6 亿[^<]*16\.5%/);

  const surplus = buildCashCoverage({ cfo: 540, capex: 447 });
  assert.equal(surplus.state, 'surplus');
  assert.equal(surplus.surplus, 93);
  assert.match(renderCashCoverageChart(surplus), /覆盖后结余[^<]*93\.0 亿/);
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

test('market tracks expose readable dates and numeric ranges instead of raw timestamps', () => {
  const rows = [
    { date_ms: Date.UTC(2026, 0, 1), close_price: 100 },
    { date_ms: Date.UTC(2026, 0, 2), close_price: 104 },
    { date_ms: Date.UTC(2026, 0, 5), close_price: 102 },
  ];
  const html = renderMarketTracksChart(buildMarketTracks(rows), ['FUYAO']);
  assert.match(html, /2026-01-01/);
  assert.match(html, /2026-01-05/);
  assert.match(html, /104\.00/);
  assert.doesNotMatch(html, /1767225600000/);
});
