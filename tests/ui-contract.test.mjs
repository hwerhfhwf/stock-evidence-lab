import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8').catch(() => '');
const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8').catch(() => '');

test('distribution exposes the same question-first product as the live worker', () => {
  for (const id of ['research-question', 'health-summary', 'causal-chain', 'professional-evidence', 'evidence-drawer']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  assert.match(html, /不构成投资建议/);
  assert.match(html, /你想弄清什么/);
  assert.doesNotMatch(html, /七维|diagnostic-grid|scenario-switcher/);
});

test('distribution client is the same question-first browser entrypoint', () => {
  for (const token of ['buildQuestionReport', 'renderQuestionReport', '/api/research', 'data-detail']) {
    assert.match(app, new RegExp(token), `missing ${token}`);
  }
});
