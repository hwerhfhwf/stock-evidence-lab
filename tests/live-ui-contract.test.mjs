import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../ui/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../ui/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../ui/styles.css',import.meta.url),'utf8');
test('systematic checkup retains research navigation and evidence access',()=>{
 for(const id of ['research-task','diagnosis-scope','diagnosis-summary','diagnosis-map','verification-questions','evidence-drawer'])assert.ok(html.includes(`id="${id}"`));
 for(const copy of ['体检全貌','看不懂名词','接下来核对什么'])assert.ok(html.includes(copy));
 for(const token of ['buildWorkbench','data-dimension','data-proposition','data-history','period-select'])assert.ok(app.includes(token));
});
test('client does not expose secrets or investment recommendations',()=>{
 assert.doesNotMatch(html+app,/综合评分|目标价|建议买入|建议卖出|X-api-key|sk-fuyao/);
});
test('responsive keyboard interactions preserve stale response protection',()=>{
 for(const token of [':focus-visible','min-height:44px','@media(max-width:600px)','prefers-reduced-motion'])assert.ok(css.includes(token));
 for(const token of ['aria-expanded','requestId!==requestSequence','searchSequence','x.inert=true','e.key===\'Tab\''])assert.ok(app.includes(token));
 assert.match(css,/\.search-results\[hidden\]\{display:none\}/);
});
test('drawers disclose dated inputs and calculations',()=>{
 for(const token of ['inputValues','计算输入','计算过程','来源与口径','限制条件','原始字段'])assert.ok(app.includes(token));
});
