import test from 'node:test';
import assert from 'node:assert/strict';
import {
  percentChange,
  classifyEvidence,
  routeQuestion,
  buildDiagnostics,
} from '../src/engine.mjs';

test('percentChange returns a rounded percentage and rejects missing denominators', () => {
  assert.equal(percentChange(260042.49, 251123.714), 3.55);
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(null, 3), null);
});

test('classifyEvidence preserves contradiction and unknown states', () => {
  assert.equal(classifyEvidence({ positive: true, negative: true }), 'contradiction');
  assert.equal(classifyEvidence({ value: null }), 'unknown');
  assert.equal(classifyEvidence({ positive: true }), 'positive');
  assert.equal(classifyEvidence({ negative: true }), 'negative');
});

test('routeQuestion selects company-specific dimensions without pretending to answer', () => {
  assert.deepEqual(routeQuestion('增长为什么放缓，应收账款有没有风险？').dimensions, ['growth', 'cash']);
  assert.equal(routeQuestion('能买吗').complianceNotice, true);
  assert.equal(routeQuestion('随便看看').mode, 'overview');
});

test('buildDiagnostics exposes missing data and provider failure', () => {
  const snapshot = { company: { name: '测试公司' }, metrics: {} };
  const missing = buildDiagnostics(snapshot, 'normal');
  assert.ok(missing.some((item) => item.state === 'unknown'));

  const failed = buildDiagnostics(snapshot, 'provider-error');
  assert.equal(failed[0].state, 'unknown');
  assert.match(failed[0].summary, /接口/);
});
