import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkbench } from '../ui/diagnosis-model.js';

test('seven dimensions expose complete subquestions without treating inference as coverage',()=>{
 const w=buildWorkbench({modules:{}},{name:'公司'},'');
 assert.equal(w.dimensions.length,7);
 assert.deepEqual(w.dimensions[0].checks.map(x=>x.label),['增长协调性','盈利能力','现金兑现','运营效率']);
 assert.ok(w.dimensions.every(d=>d.checks.length>=3));
 assert.ok(w.dimensions.every(d=>d.covered===0));
});
test('human readable comparison uses actual numeric operands',()=>{
 const bundle={generatedAt:'2026-10-28',modules:{indicators:{status:'ok',report:'2026-2',data:{abilities:[{indicators:[{index_id:'calculate_operating_income_yoy_growth_ratio',value:3.6},{index_id:'calculate_parent_holder_net_profit_yoy_growth_ratio',value:1.7}]}]}},financials:{income:[]}}};
 const w=buildWorkbench(bundle,{name:'公司'},'');
 assert.equal(w.growthEquation,'1.7% − 3.6% = −1.9 个百分点');
 assert.equal(w.dimensions[0].covered,1);
 assert.doesNotMatch(w.growthEquation,/metric-|request|rounding/);
});
test('charts preserve all dated observations and never substitute missing values with zero',()=>{
 const w=buildWorkbench({modules:{financials:{income:[{period_end_ms:Date.UTC(2025,5,30),operating_income:100},{period_end_ms:Date.UTC(2026,5,30),operating_income:120}],cashflow:[],balance:[]},market:{signals:{series:[{date_ms:1,close_price:5},{date_ms:2,close_price:6}]}}}},{},'');
 assert.equal(w.financialSeries.length,2);
 assert.equal(w.financialSeries[0].profit,null);
 assert.equal(w.marketSeries.length,2);
});

test('negative profit bases show amounts rather than reversed growth rates',()=>{
 const w=buildWorkbench({generatedAt:'2026-10-28',modules:{financials:{income:[{period_end_ms:Date.UTC(2025,5,30),parent_holder_net_profit:-100000000},{period_end_ms:Date.UTC(2026,5,30),parent_holder_net_profit:-50000000}]}}},{},'');
 assert.match(w.dimensions[1].checks[1].fact,/基期非正/);
 assert.doesNotMatch(w.dimensions[1].checks[1].fact,/-50.0%/);
});
test('historical records remain inspectable but stale periods do not count as current coverage',()=>{
 const w=buildWorkbench({generatedAt:'2026-10-28',modules:{financials:{income:[{period_end_ms:Date.UTC(2023,5,30),operating_income:100},{period_end_ms:Date.UTC(2024,5,30),operating_income:120}]}}},{},'');
 assert.equal(w.financialSeries.length,2);
 assert.equal(w.dimensions[1].covered,0);
});

test('China report dates do not move to the previous day when API uses midnight CST',()=>{
 const w=buildWorkbench({modules:{financials:{income:[{period_end_ms:Date.UTC(2026,5,29,16),operating_income:100}]}}},{},'');
 assert.equal(w.financialSeries[0].date,'2026-06-30');
});

test('rounded operands never appear in an arithmetically false equality',()=>{
 const w=buildWorkbench({modules:{indicators:{data:{abilities:[{indicators:[{index_id:'calculate_operating_income_yoy_growth_ratio',value:1.47},{index_id:'calculate_parent_holder_net_profit_yoy_growth_ratio',value:-1.96}]}]}}}},{},'');
 assert.equal(w.growthEquation,'-1.960% − 1.470% ≈ −3.4 个百分点');
});
