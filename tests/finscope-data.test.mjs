import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BYD_SNAPSHOT,
  createBydDemoBundle,
  deriveBydResearch,
} from '../ui/finscope-data.js';

test('2026H1 facts preserve the disclosed comparison direction', () => {
  const research = deriveBydResearch(BYD_SNAPSHOT);

  assert.equal(research.metrics.h1RevenueGrowthPct, -7.13);
  assert.equal(research.metrics.h1ParentProfitGrowthPct, -20.54);
  assert.equal(research.metrics.h1OperatingCashGrowthPct, 17.28);
});

test('TTM parent profit uses parent-attributable profit for every operand', () => {
  const research = deriveBydResearch(BYD_SNAPSHOT);

  assert.equal(research.metrics.ttmParentProfitYi, 294.34);
  assert.deepEqual(research.metrics.ttmParentProfitOperandsYi, {
    fiscal2025: 326.19,
    h1_2025: 155.11,
    h1_2026: 123.25,
  });
});

test('every research claim resolves to dated raw evidence or an explicit unknown', () => {
  const research = deriveBydResearch(BYD_SNAPSHOT);
  const evidenceById = new Map(research.evidence.map((item) => [item.id, item]));

  for (const claim of research.claims) {
    assert.ok(['fact', 'inference', 'unverified'].includes(claim.epistemicStatus));
    assert.ok(['positive', 'negative', 'conflicting', 'missing'].includes(claim.evidenceDirection));
    if (claim.epistemicStatus === 'unverified') {
      assert.ok(claim.missingReason);
      continue;
    }
    assert.ok(claim.evidenceRefs.length > 0, claim.id);
    for (const ref of claim.evidenceRefs) {
      const evidence = evidenceById.get(ref);
      assert.ok(evidence, `${claim.id} -> ${ref}`);
      assert.ok(evidence.sourceId);
      assert.ok(evidence.period);
      assert.ok(evidence.pages.length > 0);
      assert.ok(evidence.rawValues.length > 0);
    }
  }
});

test('the funding-gap inference cites the capital-spending cash outflow directly', () => {
  const research = deriveBydResearch(BYD_SNAPSHOT);
  const fundingClaim = research.claims.find((claim) => claim.id === 'funding-gap');
  const capexEvidence = research.evidence.find((item) => item.id === 'capex-cash');

  assert.ok(fundingClaim.evidenceRefs.includes('capex-cash'));
  assert.deepEqual(capexEvidence.rawValues, [97_359_768_000, 156_807_853_000]);
});

test('the no-secret demo bundle remains useful without inventing market data', () => {
  const bundle = createBydDemoBundle(BYD_SNAPSHOT);

  assert.equal(bundle.thscode, '002594.SZ');
  assert.equal(bundle.modules.financials.status, 'ok');
  assert.equal(bundle.modules.indicators.status, 'ok');
  assert.equal(bundle.modules.market.status, 'error');
  assert.equal(bundle.modules.market.signals.series.length, 0);
  assert.match(bundle.modules.market.errors[0].message, /未接入/);
});
