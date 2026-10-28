import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../ui/index.html',import.meta.url),'utf8');
const dist=await readFile(new URL('../dist/index.html',import.meta.url),'utf8').catch(()=> '');
const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8').catch(()=> '');

test('distribution is generated from the same multidimensional UI',()=>{
  assert.equal(dist,source);
  for(const id of ['research-task','diagnosis-scope','diagnosis-summary','diagnosis-map','verification-questions','evidence-drawer'])assert.match(dist,new RegExp(`id="${id}"`));
});

test('distribution client renders the diagnosis model and proposition drawer',()=>{
  for(const token of ['buildDiagnosisReport','renderDiagnosisReport','data-proposition','/api/research'])assert.match(app,new RegExp(token));
});
