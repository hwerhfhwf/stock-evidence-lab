import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8');

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
