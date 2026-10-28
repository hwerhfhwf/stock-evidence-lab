import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { readFile } from 'node:fs/promises';

const sourceHtml=await readFile(new URL('../ui/index.html',import.meta.url),'utf8');
const distHtml=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const generatedUi=await readFile(new URL('../worker/ui.js',import.meta.url),'utf8');

test('worker serves the FinScope research workbench with security headers', async () => {
  const response = await worker.fetch(new Request('https://example.test/'), { FUYAO_API_KEY: 'secret' }, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await response.text(), /公司与业务/);
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

test('distribution includes the optional iFinD provider boundary used by research.js', async () => {
  const source = await readFile(new URL('../worker/ifind.js', import.meta.url), 'utf8');
  const built = await readFile(new URL('../dist/server/ifind.js', import.meta.url), 'utf8');
  assert.equal(built, source);
});

test('source distribution and Worker use one versioned FinScope entrypoint',()=>{
  assert.equal(distHtml,sourceHtml);
  assert.match(sourceHtml,/app\.js\?v=live-workbench-1/);
  assert.match(generatedUi,/live-workbench-1/);
  assert.match(generatedUi,/buildWorkbench/);
  assert.doesNotMatch(generatedUi,/healthModelScript|buildHealthReport/);
});

test('all generated delivery artifacts exclude unsupported investment ratings',()=>{
  for(const banned of ['综合评分','建议买入','建议卖出','表现较稳']){
    assert.doesNotMatch(distHtml+generatedUi,new RegExp(banned));
  }
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

test('research endpoint returns safe company metadata and provider module states', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    let data = { item: [] };
    if (path.endsWith('/prices/snapshot')) data = { timestamp: 10, item: [{ thscode: '000333.SZ', last_price: 80 }] };
    if (path.endsWith('/prices/historical')) data = { timestamp: 10, item: [{ date_ms: 1, close_price: 80 }] };
    if (path.endsWith('/income-statements')) data = { item: [{ period_end_ms: Date.UTC(2026, 5, 30), operating_income: 100 }] };
    if (path.endsWith('/financials/indicators')) data = { report: '2026-2', abilities: [] };
    if (path.endsWith('/valuations/snapshot')) data = { timestamp: 10, item: [{ thscode: '000333.SZ', pe_ttm: 12.5, pb_mrq: 2.1, ps_ttm: 1.4, pcf_ttm: 10.8 }] };
    return new Response(JSON.stringify({ code: 0, message: 'success', request_id: 'live-request', data }), { headers: { 'content-type': 'application/json' } });
  };
  try {
    const request = new Request('https://example.test/api/research?thscode=000333.SZ&name=%E7%BE%8E%E7%9A%84%E9%9B%86%E5%9B%A2');
    const response = await worker.fetch(request, { FUYAO_API_KEY: 'secret-key' }, {});
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.company, { name: '美的集团', thscode: '000333.SZ' });
    assert.equal(body.modules.valuation.status, 'ok');
    assert.equal(body.modules.context.status, 'unavailable');
    assert.equal(JSON.stringify(body).includes('secret-key'), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('AI endpoint forwards an OpenAI-compatible request without returning the API key', async () => {
  const previousFetch = globalThis.fetch;
  let outbound;
  globalThis.fetch = async (url, init) => {
    outbound = { url: String(url), headers: new Headers(init.headers), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"claims":[]}' } }], model: 'qwen-test', usage: { total_tokens: 12 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const request = new Request('https://example.test/api/ai/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://api.example.com/v1', model: 'qwen-test', apiKey: 'user-session-key',
        messages: [{ role: 'user', content: '分析经营质量' }], outputSchema: { type: 'object' },
      }),
    });
    const response = await worker.fetch(request, {}, {});
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(outbound.url, 'https://api.example.com/v1/chat/completions');
    assert.equal(outbound.headers.get('authorization'), 'Bearer user-session-key');
    assert.equal(outbound.body.model, 'qwen-test');
    assert.equal(body.content, '{"claims":[]}');
    assert.equal(JSON.stringify(body).includes('user-session-key'), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('AI endpoint rejects unsafe endpoints before making a network request', async () => {
  const previousFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('should not run'); };
  try {
    const request = new Request('https://example.test/api/ai/analyze', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: 'http://127.0.0.1:8080/v1', model: 'm', apiKey: 'k', messages: [] }),
    });
    const response = await worker.fetch(request, {}, {});
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'invalid_ai_endpoint');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('AI endpoint converts upstream failures into a local safe error', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('upstream secret body', { status: 429 });
  try {
    const request = new Request('https://example.test/api/ai/analyze', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://api.example.com/v1', model: 'm', apiKey: 'k', messages: [] }),
    });
    const response = await worker.fetch(request, {}, {});
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.error.code, 'ai_upstream_error');
    assert.equal(JSON.stringify(body).includes('secret body'), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
