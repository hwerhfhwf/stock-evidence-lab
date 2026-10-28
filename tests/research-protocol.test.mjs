import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResearchClaims,
  buildSourcePackage,
  selectDiagnosisDimensions,
  validateResearchClaim,
} from '../ui/research-protocol.js';
import { normalizeResearchView } from '../ui/research-view.js';
import { BYD_SNAPSHOT, createBydDemoBundle, deriveBydResearch } from '../ui/finscope-data.js';

function bydSourcePackage() {
  const bundle = createBydDemoBundle(BYD_SNAPSHOT);
  const view = normalizeResearchView(bundle, { name: '比亚迪', thscode: '002594.SZ', companyType: 'manufacturing' }, BYD_SNAPSHOT);
  view.company.companyType = 'manufacturing';
  return buildSourcePackage(view, BYD_SNAPSHOT);
}

test('source package preserves deterministic values and complete provenance', () => {
  const sourcePackage = bydSourcePackage();
  const metrics = deriveBydResearch(BYD_SNAPSHOT).metrics;
  const revenue = sourcePackage.fields.find(field => field.id === 'metric:revenue-growth');
  const cash = sourcePackage.fields.find(field => field.id === 'metric:operating-cash-growth');

  assert.equal(revenue.value, metrics.h1RevenueGrowthPct);
  assert.equal(cash.value, metrics.h1OperatingCashGrowthPct);
  assert.equal(revenue.period, '2026H1');
  assert.equal(revenue.unit, '%');
  assert.ok(revenue.sourceRefs.length > 0);
  assert.ok(sourcePackage.sources.every(source => source.id && source.url && source.period));
});

test('research claims separate four evidence directions from epistemic status', () => {
  const claims = buildResearchClaims(bydSourcePackage());
  assert.ok(claims.length >= 4);

  for (const claim of claims) {
    assert.deepEqual(Object.keys(claim.evidenceGroups), ['positive', 'negative', 'conflicting', 'unknown']);
    assert.ok(['fact', 'inference', 'unverified'].includes(claim.epistemicStatus));
    assert.equal(validateResearchClaim(claim).ok, true);
  }

  const conversion = claims.find(claim => claim.id === 'operating-conversion');
  assert.ok(conversion.evidenceGroups.negative.length > 0);
  assert.ok(conversion.evidenceGroups.positive.length > 0);
  assert.ok(conversion.evidenceGroups.conflicting.some(item => item.conflictType === 'metric_divergence'));
  assert.ok(conversion.evidenceGroups.unknown.some(item => item.requiredFields.includes('single_vehicle_profit')));
});

test('claims expose financial period market interval peer and verification drilldowns', () => {
  const claims = buildResearchClaims(bydSourcePackage());
  const types = new Set(claims.flatMap(claim => claim.drilldowns.map(item => item.type)));
  assert.ok(types.has('financial_period'));
  assert.ok(types.has('market_interval'));
  assert.ok(types.has('peer_comparison'));
  assert.ok(types.has('verification_question'));
});

test('manufacturing questions prioritize conversion and operating assets while banks prioritize risk', () => {
  const manufacturing = selectDiagnosisDimensions({
    companyType: 'manufacturing',
    question: '收入下降后利润和经营现金如何变化？',
    availableDimensions: ['operating_quality', 'financial_trend', 'risk', 'valuation'],
  });
  const bank = selectDiagnosisDimensions({
    companyType: 'bank',
    question: '增长是否持续？',
    availableDimensions: ['operating_quality', 'financial_trend', 'risk', 'valuation'],
  });

  assert.deepEqual(manufacturing.slice(0, 2).map(item => item.id), ['operating_quality', 'financial_trend']);
  assert.equal(bank[0].id, 'risk');
  assert.notDeepEqual(bank.slice(0, 3).map(item => item.id), manufacturing.slice(0, 3).map(item => item.id));
  assert.ok(manufacturing[0].reason.includes('利润'));
});

test('missing fields become unknown evidence instead of a fabricated normal claim', () => {
  const sourcePackage = bydSourcePackage();
  sourcePackage.fields = sourcePackage.fields.filter(field => field.id !== 'metric:profit-growth');
  const claims = buildResearchClaims(sourcePackage);
  const conversion = claims.find(claim => claim.id === 'operating-conversion');

  assert.equal(conversion.epistemicStatus, 'unverified');
  assert.equal(conversion.evidenceGroups.negative.length, 0);
  assert.ok(conversion.evidenceGroups.unknown.some(item => item.requiredFields.includes('parent_profit_growth')));
});

test('claim validation rejects missing evidence slots and investment advice', () => {
  const claim = buildResearchClaims(bydSourcePackage())[0];
  const missingSlot = structuredClone(claim);
  delete missingSlot.evidenceGroups.unknown;
  const advice = structuredClone(claim);
  advice.statement = '建议立即买入并保证获得收益。';

  assert.equal(validateResearchClaim(missingSlot).ok, false);
  assert.match(validateResearchClaim(missingSlot).errors.join(' '), /unknown/);
  assert.equal(validateResearchClaim(advice).ok, false);
  assert.match(validateResearchClaim(advice).errors.join(' '), /投资建议/);
});

