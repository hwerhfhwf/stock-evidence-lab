import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagnosisReport } from '../ui/diagnosis-model.js';

const company={name:'美的集团',thscode:'000333.SZ',companyType:'manufacturing'};
const bundle={generatedAt:'2026-10-28T04:00:00Z',modules:{
  market:{status:'ok',requestIds:['market-1'],signals:{return60:-2,maxDrawdown60:-10,range:{start:'2026-08-01',end:'2026-10-28'},adjustment:'forward_adjusted'}},
  financials:{status:'ok',requestIds:['financial-1'],income:[{period_end_ms:Date.UTC(2026,5,30)}],balance:[],cashflow:[]},
  indicators:{status:'ok',requestIds:['indicator-1'],data:{abilities:[
    {ability:'growth',indicators:[{index_id:'calculate_operating_income_yoy_growth_ratio',value:8},{index_id:'calculate_parent_holder_net_profit_yoy_growth_ratio',value:3}]},
    {ability:'cash-flow',indicators:[{index_id:'net_profit_cash_content',value:120}]},
    {ability:'solvency',indicators:[{index_id:'assets_debt_ratio',value:64}]},
  ]}}
}};

test('manufacturing growth question selects and orders several relevant dimensions',()=>{
  const report=buildDiagnosisReport(bundle,company,'增长放缓是否伴随经营质量下降？');
  assert.equal(report.companyType,'manufacturing');
  assert.deepEqual(report.selectedDimensions.slice(0,3).map(x=>x.dimension),['operating_quality','financial_trend','industry_position']);
  assert.ok(report.selectedDimensions.length>=5);
  assert.ok(report.selectedDimensions.every((x,i)=>x.priority===i+1&&x.relevanceReason&&x.availability));
});

test('cash and valuation questions use different multidimensional priorities',()=>{
  const cash=buildDiagnosisReport(bundle,company,'现金流和负债压力如何？');
  const valuation=buildDiagnosisReport(bundle,company,'估值在同行里处于什么位置？');
  assert.deepEqual(cash.selectedDimensions.slice(0,3).map(x=>x.dimension),['financial_trend','risk','operating_quality']);
  assert.deepEqual(valuation.selectedDimensions.slice(0,3).map(x=>x.dimension),['valuation','industry_position','financial_trend']);
});

test('trading questions state the research boundary without predictions or advice',()=>{
  const report=buildDiagnosisReport(bundle,company,'现在能买吗，会涨吗？');
  assert.equal(report.intent,'investment_boundary');
  assert.match(report.summary,/不能.*预测|不提供.*买卖/);
  assert.doesNotMatch(JSON.stringify(report),/建议买入|建议卖出|目标价|未来会涨/);
});

test('unknown company type degrades explicitly to general corporate',()=>{
  const report=buildDiagnosisReport(bundle,{name:'示例公司',thscode:'000001.SZ'},'增长情况如何？');
  assert.equal(report.companyType,'general_corporate');
  assert.ok(report.limitations.some(x=>/公司类型/.test(x)));
});

test('every proposition separates evidence direction from epistemic status',()=>{
  const report=buildDiagnosisReport(bundle,company,'增长情况如何？');
  const directions=new Set(['positive','negative','conflicting','missing']);
  const statuses=new Set(['fact','inference','unverified']);
  assert.ok(report.propositions.length>=4);
  for(const item of report.propositions){
    assert.ok(directions.has(item.evidenceDirection));
    assert.ok(statuses.has(item.epistemicStatus));
    assert.ok(Array.isArray(item.evidenceRefs));
    assert.ok(Array.isArray(item.limitations));
  }
  assert.ok(report.propositions.some(x=>x.epistemicStatus==='fact'));
  assert.ok(report.propositions.some(x=>x.epistemicStatus==='inference'));
  assert.ok(report.propositions.some(x=>x.epistemicStatus==='unverified'));
});

test('missing modules stay missing and do not generate normal conclusions',()=>{
  const sparse=structuredClone(bundle);
  sparse.modules.indicators={status:'error',error:{message:'provider failed'}};
  const report=buildDiagnosisReport(sparse,company,'增长情况如何？');
  assert.ok(report.propositions.some(x=>x.evidenceDirection==='missing'&&x.epistemicStatus==='unverified'));
  assert.doesNotMatch(report.summary,/稳定|正常|健康|表现较稳/);
});

test('opposing revenue and profit directions remain conflicting',()=>{
  const mixed=structuredClone(bundle);
  mixed.modules.indicators.data.abilities[0].indicators[1].value=-3;
  const report=buildDiagnosisReport(mixed,company,'增长情况如何？');
  assert.ok(report.propositions.some(x=>x.evidenceDirection==='conflicting'));
});

test('every numeric fact resolves to complete evidence metadata',()=>{
  const report=buildDiagnosisReport(bundle,company,'增长情况如何？');
  const facts=report.propositions.filter(x=>x.epistemicStatus==='fact');
  assert.ok(facts.length>=2);
  for(const fact of facts){
    assert.ok(fact.evidenceRefs.length>0);
    for(const ref of fact.evidenceRefs){
      const evidence=report.evidence.find(x=>x.id===ref);
      assert.ok(evidence,`missing evidence ${ref}`);
      for(const field of ['label','unit','period','source','fieldName','scope','freshness'])assert.ok(evidence[field],`${ref} missing ${field}`);
      assert.ok(evidence.source.provider&&evidence.source.retrievedAt);
    }
  }
});

test('financial evidence preserves cumulative reporting scope',()=>{
  const report=buildDiagnosisReport(bundle,company,'增长情况如何？');
  const revenue=report.evidence.find(x=>x.id==='metric-revenue-growth');
  assert.equal(revenue.period.end,'2026-06-30');
  assert.equal(revenue.period.periodType,'half_year_cumulative');
  assert.match(revenue.scope,/累计/);
});

test('market evidence declares range and adjustment',()=>{
  const report=buildDiagnosisReport(bundle,company,'行情特征如何？');
  const market=report.evidence.find(x=>x.type==='market_series');
  assert.equal(market.period.start,'2026-08-01');
  assert.equal(market.period.end,'2026-10-28');
  assert.equal(market.adjustment,'forward_adjusted');
});

test('inferences reference existing fact evidence only',()=>{
  const report=buildDiagnosisReport(bundle,company,'增长情况如何？');
  const factRefs=new Set(report.propositions.filter(x=>x.epistemicStatus==='fact').flatMap(x=>x.evidenceRefs));
  for(const inference of report.propositions.filter(x=>x.epistemicStatus==='inference')){
    assert.ok(inference.evidenceRefs.length>0);
    assert.ok(inference.evidenceRefs.every(ref=>factRefs.has(ref)));
  }
});

test('provider failure and stale evidence become missing unverified propositions',()=>{
  const failed=structuredClone(bundle);
  failed.modules.market={status:'error',error:{code:'provider_failure'}};
  failed.generatedAt='2027-03-01T00:00:00Z';
  const report=buildDiagnosisReport(failed,company,'行情特征如何？');
  assert.ok(report.propositions.some(x=>x.evidenceDirection==='missing'&&x.epistemicStatus==='unverified'&&x.limitations.some(y=>/失败|过期/.test(y))));
  assert.ok(report.evidence.every(x=>x.freshness!=='current'||x.source.retrievedAt));
});

test('deterministic calculations disclose formula inputs unit and rounding',()=>{
  const report=buildDiagnosisReport(bundle,company,'增长情况如何？');
  const calculation=report.calculations.find(x=>x.id==='growth-gap');
  assert.equal(calculation.formula,'归母净利润同比增长 - 营业收入同比增长');
  assert.deepEqual(calculation.inputEvidenceIds,['metric-profit-growth','metric-revenue-growth']);
  assert.equal(calculation.result,-5);
  assert.equal(calculation.unit,'个百分点');
  assert.ok(calculation.roundingRule);
});
