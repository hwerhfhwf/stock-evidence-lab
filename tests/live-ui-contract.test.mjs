import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../worker/index.js', import.meta.url), 'utf8');

test('client consumes the source-backed snapshot and question router', () => {
  for (const token of ['deriveBydResearch', 'createBydDemoBundle', 'buildWorkbench']) assert.match(app, new RegExp(token));
  for (const token of ['research-question', 'run-diagnosis', 'priority-result']) assert.match(html + app, new RegExp(token));
});

test('evidence drawer exposes direct sources and restores keyboard focus', () => {
  for (const token of ['data-evidence', 'aria-expanded', 'sourceId', 'rawValues', 'pages', 'opener.focus', "event.key === 'Escape'"]) {
    assert.ok(app.includes(token), token);
  }
});

test('simple and professional controls are real pressed-state buttons', () => {
  assert.match(html, /id="mode-simple"[^>]*aria-pressed="true"/);
  assert.match(html, /id="mode-professional"[^>]*aria-pressed="false"/);
  assert.match(app, /setMode/);
});

test('worker exposes the live browser data modules as same-origin scripts', () => {
  assert.match(worker, /\/data-client\.js/);
  assert.match(worker, /\/research-view\.js/);
  assert.match(worker, /dataClientScript/);
  assert.match(worker, /researchViewScript/);
});

test('browser orchestrates live search and module-level research rendering', () => {
  for (const token of ['createResearchClient', 'normalizeResearchView', 'client.search', 'client.research', 'sourceState', 'module-status']) {
    assert.ok(app.includes(token), token);
  }
  for (const token of ['aria-busy', 'role="status"', 'search-results']) assert.ok(html.includes(token), token);
});
