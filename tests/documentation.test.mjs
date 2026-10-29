import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('README documents the live product, runtime secret and honest fallback', async () => {
  const readme = await read('../README.md');
  for (const token of ['扶摇主数据', 'iFinD 可选增强', 'FUYAO_API_KEY', '/api/search', '/api/research', '公开披露快照', '模块级降级']) {
    assert.ok(readme.includes(token), token);
  }
  assert.match(readme, /https:\/\/stock-evidence-lab-midea\.violet-lotus-6432\.chatgpt\.site/);
  assert.match(readme, /docs\/finscope-desktop\.png/);
  assert.match(readme, /docs\/finscope-ai-research\.png/);
  assert.match(readme, /AI 研究助手/);
});

test('architecture and handoff separate provider responsibilities and missing data', async () => {
  const architecture = await read('../docs/live-data-architecture.md');
  const handoff = await read('../docs/product-handoff.md');
  for (const token of ['浏览器', 'Worker', '扶摇', 'iFinD', '不补零', 'requestId']) assert.ok(architecture.includes(token), token);
  for (const token of ['事实', '分析推断', '暂无法验证', '收入构成', '前复权', '部署']) assert.ok(handoff.includes(token), token);
});
