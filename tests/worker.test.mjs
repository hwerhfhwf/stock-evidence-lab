import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

test('worker serves the multidimensional diagnosis UI with security headers', async () => {
  const response = await worker.fetch(new Request('https://example.test/'), { FUYAO_API_KEY: 'secret' }, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await response.text(), /本次诊断范围/);
});

test('worker serves the multidimensional diagnosis model as a same-origin module', async () => {
  const response = await worker.fetch(new Request('https://example.test/diagnosis-model.js'), {}, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/javascript/);
  assert.match(await response.text(), /buildDiagnosisReport/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('worker does not cache unhashed client scripts across UI revisions', async () => {
  const response = await worker.fetch(new Request('https://example.test/app.js'), {}, {});
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('health endpoint reports missing runtime secret without exposing it', async () => {
  const response = await worker.fetch(new Request('https://example.test/api/health'), {}, {});
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.status, 'degraded');
  assert.equal(JSON.stringify(body).includes('sk-'), false);
});

test('search endpoint validates query before calling upstream', async () => {
  const response = await worker.fetch(new Request('https://example.test/api/search?q='), { FUYAO_API_KEY: 'secret' }, {});
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'invalid_input');
});

test('search endpoint returns only A-share candidates and never returns the API key', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    code: 0,
    message: 'success',
    request_id: 'search-request',
    data: { item: [
      { thscode: '000333.SZ', name: '美的集团', ticker: '000333', market: 'A股' },
      { thscode: '00300.HK', name: '美的集团', ticker: '00300', market: '港股' },
    ] },
  }), { headers: { 'content-type': 'application/json' } });
  try {
    const response = await worker.fetch(new Request('https://example.test/api/search?q=美的'), { FUYAO_API_KEY: 'secret-key' }, {});
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].thscode, '000333.SZ');
    assert.equal(JSON.stringify(body).includes('secret-key'), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
