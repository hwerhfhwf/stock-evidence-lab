import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionReport } from '../ui/health-model.js';

const bundle={generatedAt:'2026-10-28T04:00:00Z',modules:{market:{status:'ok',signals:{return60:-2,maxDrawdown60:-10}},financials:{status:'ok',income:[{period_end_ms:Date.UTC(2026,5,30)}],balance:[],cashflow:[]},indicators:{status:'ok',data:{abilities:[{ability:'growth',indicators:[{index_id:'calculate_operating_income_yoy_growth_ratio',value:8},{index_id:'calculate_parent_holder_net_profit_yoy_growth_ratio',value:3}]},{ability:'cash-flow',indicators:[{index_id:'net_profit_cash_content',value:120}]},{ability:'solvency',indicators:[{index_id:'assets_debt_ratio',value:64}]}]}}}};

test('question report answers one question through a continuous causal chain',()=>{
  const report=buildQuestionReport(bundle,{name:'美的集团',thscode:'000333.SZ'},'美的集团增长还稳吗，为什么？');
  assert.equal(report.question,'美的集团增长还稳吗，为什么？');
  assert.match(report.answer,/增长|收入|利润/);
  assert.deepEqual(report.chain.map(x=>x.role),['phenomenon','reason','counter','unknown','impact','next']);
  assert.ok(report.chain.every(x=>x.title&&x.body&&x.evidence));
  assert.ok(report.chain.some(x=>x.state==='support'));
  assert.ok(report.chain.some(x=>x.state==='counter'));
  assert.ok(report.chain.some(x=>x.state==='unknown'));
});

test('question report keeps missing evidence visible and weakens the answer',()=>{
  const sparse=structuredClone(bundle);sparse.modules.indicators={status:'error',data:null};
  const report=buildQuestionReport(sparse,{name:'美的集团',thscode:'000333.SZ'},'增长还稳吗？');
  assert.match(report.answer,/还不能判断/);
  assert.equal(report.chain[0].state,'unknown');
  assert.ok(report.nextAction.includes('财务'));
});

test('question report uses plain language before terminology',()=>{
  const report=buildQuestionReport(bundle,{name:'美的集团',thscode:'000333.SZ'},'增长还稳吗？');
  const firstText=report.chain.slice(0,3).map(x=>`${x.title}${x.body}`).join('');
  assert.doesNotMatch(firstText,/calculate_|assets_debt_ratio|net_profit_cash_content/);
  assert.doesNotMatch(JSON.stringify(report),/EVIDENCE|DIAGNOSTIC|Research Queue/);
});
