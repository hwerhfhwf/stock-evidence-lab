import test from 'node:test';
import assert from 'node:assert/strict';
import { mideaSnapshot, sourceRegistry } from '../src/data.mjs';

test('every financial metric is traceable to period, unit and source', () => {
  assert.equal(mideaSnapshot.company.code, '000333.SZ');
  for (const [id, metric] of Object.entries(mideaSnapshot.metrics)) {
    assert.ok(Number.isFinite(metric.value), `${id} needs a numeric value`);
    assert.ok(metric.period, `${id} needs a period`);
    assert.ok(metric.unit, `${id} needs a unit`);
    assert.ok(sourceRegistry[metric.sourceId], `${id} needs a registered source`);
  }
});

test('primary sources include stable links and disclosure dates', () => {
  const sources = Object.values(sourceRegistry);
  assert.ok(sources.some((source) => source.tier === 'primary'));
  for (const source of sources) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.publishedAt, /^20\d{2}-\d{2}-\d{2}$/);
  }
});
