import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeResearch, validateChartSpec, validateResearchPatch } from '../ui/ai-adapter.js';

const sourcePackage = {
  fields: [
    { id: 'metric:revenue-growth', value: -7.1, unit: '%', sourceRefs: ['H126'] },
    { id: 'metric:profit-growth', value: -20.5, unit: '%', sourceRefs: ['H126'] },
  ],
  sources: [{ id: 'H126', url: 'https://example.test/report.pdf' }],
};

test('AI adapter sends one provider-neutral request to the same-origin gateway', async () => {
  let captured;
  const result = await analyzeResearch({
    endpoint: 'https://api.example.com/v1',
    model: 'example-model',
    apiKey: 'session-secret',
    messages: [{ role: 'user', content: '分析利润转化' }],
    tools: [{ type: 'function', function: { name: 'add_chart', parameters: { type: 'object' } } }],
    outputSchema: { type: 'object', required: ['claims'] },
  }, async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ content: '{"claims":[]}', model: 'example-model' }), { status: 200, headers: { 'content-type': 'application/json' } });
  });

  assert.equal(captured.url, '/api/ai/analyze');
  assert.equal(captured.body.endpoint, 'https://api.example.com/v1');
  assert.equal(captured.body.apiKey, 'session-secret');
  assert.equal(captured.body.model, 'example-model');
  assert.equal(result.content, '{"claims":[]}');
});

test('AI adapter keeps credentials session-only and returns a safe network error', async () => {
  const source = await readFile(new URL('../ui/ai-adapter.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  await assert.rejects(
    analyzeResearch({ endpoint: 'https://api.example.com/v1', model: 'm', apiKey: 'k', messages: [] }, async () => { throw new Error('socket secret'); }),
    error => error.code === 'network_error' && !error.message.includes('secret'),
  );
});

test('chart spec accepts whitelisted source references without accepting raw replacement values', () => {
  const result = validateChartSpec({
    id: 'growth-gap',
    type: 'grouped_bar_line',
    title: '收入与归母利润同比',
    series: [
      { fieldId: 'metric:revenue-growth', label: '营业收入同比' },
      { fieldId: 'metric:profit-growth', label: '归母净利润同比' },
    ],
    sourceRefs: ['H126'],
    unit: '%',
  }, sourcePackage);
  assert.equal(result.ok, true);
  assert.deepEqual(result.spec.series.map(item => item.fieldId), ['metric:revenue-growth', 'metric:profit-growth']);
});

test('chart spec rejects unknown charts fields arbitrary data and advice copy', () => {
  const invalid = [
    { id: 'x', type: 'gauge', title: '图', series: [], sourceRefs: [] },
    { id: 'x', type: 'time_series', title: '图', series: [{ fieldId: 'invented:value' }], sourceRefs: [] },
    { id: 'x', type: 'time_series', title: '图', series: [{ fieldId: 'metric:revenue-growth', data: [999] }], sourceRefs: ['H126'] },
    { id: 'x', type: 'time_series', title: '建议立即买入', series: [{ fieldId: 'metric:revenue-growth' }], sourceRefs: ['H126'] },
  ];
  for (const spec of invalid) assert.equal(validateChartSpec(spec, sourcePackage).ok, false);
});

test('AI research patch can extend dimensions claims and fixed chart specs without changing sources', () => {
  const claim = {
    id: 'ai-operating', dimension: 'operating_quality', question: '利润如何转化？',
    statement: '归母净利润增速低于营业收入增速。', epistemicStatus: 'inference',
    evidenceGroups: {
      positive: [],
      negative: [{ id: 'gap', label: '利润增速低于收入', evidenceRefs: ['metric:revenue-growth', 'metric:profit-growth'] }],
      conflicting: [], unknown: [],
    },
    sourceRefs: ['metric:revenue-growth', 'metric:profit-growth'],
    drilldowns: [{ type: 'financial_period', label: '查看期次', period: '2026H1', evidenceRefs: ['metric:revenue-growth'] }],
  };
  const result = validateResearchPatch({
    selectedDimensions: ['operating_quality', 'financial_trend'], claims: [claim],
    chartSpecs: [{ id: 'growth', type: 'grouped_bar_line', title: '收入与利润增速', series: [{ fieldId: 'metric:revenue-growth' }, { fieldId: 'metric:profit-growth' }], sourceRefs: ['H126'], unit: '%' }],
  }, sourcePackage);
  assert.equal(result.ok, true);
  assert.equal(result.patch.claims[0].id, 'ai-operating');
  assert.equal(result.patch.chartSpecs[0].id, 'growth');
});

test('AI research patch rejects invented evidence and keeps the deterministic state usable', () => {
  const result = validateResearchPatch({
    selectedDimensions: ['operating_quality'],
    claims: [{
      id: 'invented', dimension: 'operating_quality', question: '问题', statement: '结论', epistemicStatus: 'fact',
      evidenceGroups: { positive: [{ id: 'x', label: 'x', evidenceRefs: ['invented:value'] }], negative: [], conflicting: [], unknown: [] },
      sourceRefs: ['invented:value'], drilldowns: [],
    }], chartSpecs: [],
  }, sourcePackage);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('；'), /invented:value/);
});

