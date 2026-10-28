import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8').catch(() => '');
const app = await readFile(new URL('../dist/app.mjs', import.meta.url), 'utf8').catch(() => '');

test('page exposes the full research workflow and compliance copy', () => {
  for (const id of ['question-form', 'evidence-summary', 'diagnostic-grid', 'scenario-switcher', 'evidence-drawer']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  assert.match(html, /不构成投资建议/);
  assert.match(html, /2026-08-28/);
});

test('client supports question routing, filters, drilldown and error scenarios', () => {
  for (const token of ['routeQuestion', 'renderDiagnostics', 'openDrawer', 'provider-error', 'missing-data']) {
    assert.match(app, new RegExp(token), `missing ${token}`);
  }
});
