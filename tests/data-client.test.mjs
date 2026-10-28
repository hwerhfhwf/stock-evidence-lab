import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchClient, ResearchClientError } from '../ui/data-client.js';

test('research client encodes searches and skips empty queries without an upstream call', async () => {
  const calls = [];
  const client = createResearchClient(async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ items: [{ name: '比亚迪', thscode: '002594.SZ' }] }), { headers: { 'content-type': 'application/json' } });
  });
  assert.deepEqual(await client.search('   '), []);
  const items = await client.search('比亚迪 002594');
  assert.equal(items[0].thscode, '002594.SZ');
  assert.equal(calls.length, 1);
  assert.equal(calls[0], '/api/search?q=%E6%AF%94%E4%BA%9A%E8%BF%AA%20002594');
});

test('research client requests a selected company and preserves safe provider errors', async () => {
  const calls = [];
  const client = createResearchClient(async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ thscode: '002594.SZ', company: { name: '比亚迪', thscode: '002594.SZ' }, modules: {} }), { headers: { 'content-type': 'application/json' } });
  });
  const result = await client.research({ name: '比亚迪', thscode: '002594.SZ' });
  assert.equal(result.company.name, '比亚迪');
  assert.equal(calls[0], '/api/research?thscode=002594.SZ&name=%E6%AF%94%E4%BA%9A%E8%BF%AA');

  const failing = createResearchClient(async () => new Response(JSON.stringify({ error: { code: 'rate_limited', message: '稍后重试' } }), { status: 429, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(() => failing.research({ name: '比亚迪', thscode: '002594.SZ' }), (error) => {
    assert.ok(error instanceof ResearchClientError);
    assert.equal(error.code, 'rate_limited');
    assert.equal(error.message, '稍后重试');
    return true;
  });
});

