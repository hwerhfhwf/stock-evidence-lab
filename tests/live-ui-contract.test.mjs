import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8').catch(() => '');
const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8').catch(() => '');

test('live UI leads novices through one continuous one-minute health check', () => {
  for (const id of ['stock-search', 'search-results', 'freshness', 'health-summary', 'health-route', 'next-actions', 'professional-evidence', 'evidence-drawer']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  for (const copy of ['你想弄清什么', '先说结论', '这个结论是怎么来的', '下一步该查什么', '查看专业证据']) assert.match(html, new RegExp(copy));
  assert.match(html, /不构成投资建议/);
  assert.match(html, /实时数据/);
});

test('main screen answers one real question through one causal chain', () => {
  for (const id of ['research-question', 'core-answer', 'causal-chain']) assert.match(html, new RegExp(`id="${id}"`));
  for (const copy of ['你想弄清什么', '先说结论', '这个结论是怎么来的', '还没有答案', '下一步该查什么']) assert.match(html + app, new RegExp(copy));
  assert.match(app, /buildQuestionReport/);
  assert.doesNotMatch(html, /EVIDENCE-FIRST|DIAGNOSTIC|Research Queue/);
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
