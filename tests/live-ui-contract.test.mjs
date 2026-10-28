import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8').catch(() => '');
const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8').catch(() => '');

test('live UI leads novices through one continuous one-minute health check', () => {
  for (const id of ['stock-search', 'search-results', 'freshness', 'health-summary', 'health-route', 'next-actions', 'professional-evidence', 'evidence-drawer']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  for (const copy of ['一分钟看懂一家公司', '先看结论', '五步看懂', '为什么要看', '接下来做什么', '查看专业证据']) assert.match(html, new RegExp(copy));
  assert.match(html, /不构成投资建议/);
  assert.match(html, /实时数据/);
});

test('live UI calls same-origin APIs and renders partial failures without hidden fallback data', () => {
  for (const token of ['/api/search', '/api/research', 'buildHealthReport', 'renderHealthReport', 'renderProfessionalEvidence', 'requestIds']) {
    assert.match(app, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${token}`);
  }
  assert.doesNotMatch(app, /X-api-key|sk-fuyao/);
  assert.match(app, /result\.items\.length===1/);
  assert.match(app, /财务截至/);
  for (const id of ['calculate_operating_profit_yoy_growth_ratio', 'cash_ratio', 'inventory_turnover_ratio', 'cash_operating_index']) assert.match(app, new RegExp(id));
});
