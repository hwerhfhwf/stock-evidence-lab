import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../ui/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../ui/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../ui/styles.css',import.meta.url),'utf8');
const combined=html+app+css;

test('page follows the adaptive multidimensional diagnosis hierarchy',()=>{
  for(const id of ['research-task','diagnosis-scope','diagnosis-summary','diagnosis-map','verification-questions','evidence-drawer'])assert.match(html,new RegExp(`id="${id}"`),`missing ${id}`);
  for(const copy of ['研究任务','本次诊断范围','诊断摘要','诊断地图','结论依据','待验证问题'])assert.match(combined,new RegExp(copy));
  assert.match(app,/buildDiagnosisReport/);
  assert.match(app,/renderDiagnosisReport/);
});

test('propositions expose evidence direction and epistemic status independently',()=>{
  assert.match(app,/evidenceDirection/);
  assert.match(app,/epistemicStatus/);
  assert.match(app,/data-proposition/);
  assert.match(combined,/证据方向/);
  assert.match(combined,/认知状态/);
  for(const copy of ['原始字段','计算过程','来源与口径','限制条件'])assert.match(combined,new RegExp(copy));
});

test('old consumer copy and implicit ratings are absent',()=>{
  for(const banned of ['公司体检','一分钟看懂','先说结论','还没有答案','需要反过来看','表现较稳'])assert.doesNotMatch(combined,new RegExp(banned));
  assert.doesNotMatch(combined,/综合评分|目标价|建议买入|建议卖出/);
});

test('interaction and responsive contracts meet the UI quality gate',()=>{
  assert.match(css,/:focus-visible/);
  assert.match(css,/min-height:\s*44px/);
  assert.match(css,/@media\s*\(max-width:\s*600px\)/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(app,/aria-expanded/);
  assert.doesNotMatch(app,/X-api-key|sk-fuyao/);
});

test('all ranked dimensions remain reachable and overlapping requests are ignored',()=>{
  assert.match(app,/selectedDimensions\.map/);
  assert.doesNotMatch(app,/selectedDimensions\.slice\(0,3\)\.map/);
  assert.match(app,/<details class="dimension-group supplementary"/);
  assert.match(app,/requestSequence/);
  assert.match(app,/requestId\s*!==\s*requestSequence/);
});

test('search result hidden state overrides its grid display',()=>{
  assert.match(css,/\.search-results\[hidden\]\s*\{\s*display:\s*none/);
});

