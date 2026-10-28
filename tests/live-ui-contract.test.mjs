import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8').catch(() => '');
const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8').catch(() => '');

test('live UI contains multi-stock search, freshness, chart, modules and evidence drawer', () => {
  for (const id of ['stock-search', 'search-results', 'freshness', 'price-chart', 'market-panel', 'financial-panel', 'diagnostic-grid', 'evidence-drawer']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  assert.match(html, /不构成投资建议/);
  assert.match(html, /实时数据/);
});

test('live UI calls same-origin APIs and renders partial failures without hidden fallback data', () => {
  for (const token of ['/api/search', '/api/research', 'renderPriceChart', 'renderPartialFailure', 'requestIds', 'unknown']) {
    assert.match(app, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${token}`);
  }
  assert.doesNotMatch(app, /X-api-key|sk-fuyao/);
});
