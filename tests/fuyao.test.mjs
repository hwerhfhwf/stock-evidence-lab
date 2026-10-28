import test from 'node:test';
import assert from 'node:assert/strict';
import { createFuyaoClient, normalizeEnvelope, validateThscode } from '../worker/fuyao.js';

test('validateThscode accepts canonical A-share codes only', () => {
  assert.equal(validateThscode('000333.sz'), '000333.SZ');
  assert.equal(validateThscode('600519.SH'), '600519.SH');
  assert.throws(() => validateThscode('000333'), /thscode/);
  assert.throws(() => validateThscode('../secret'), /thscode/);
});

test('normalizeEnvelope rejects HTTP and business failures without leaking upstream bodies', async () => {
  await assert.rejects(() => normalizeEnvelope(new Response('bad gateway', { status: 502 })), /HTTP 502/);
  await assert.rejects(() => normalizeEnvelope(new Response(JSON.stringify({ code: 2003, message: 'forbidden', request_id: 'r1' }), { headers: { 'content-type': 'application/json' } })), (error) => {
    assert.equal(error.code, 'permission_denied');
    assert.equal(error.requestId, 'r1');
    return true;
  });
});

test('client sends API key only in the header and constrains endpoint paths', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ code: 0, message: 'success', request_id: 'r-ok', data: { item: [] } }), { headers: { 'content-type': 'application/json' } });
  };
  const client = createFuyaoClient(fetchFn, 'secret-key');
  await client.snapshot('000333.SZ');
  assert.match(calls[0].url, /prices\/snapshot\?thscodes=000333.SZ/);
  assert.equal(calls[0].init.headers['X-api-key'], 'secret-key');
  assert.doesNotMatch(calls[0].url, /secret-key/);
});

test('client requests the documented Fuyao valuation snapshot for canonical A-share codes', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ code: 0, message: 'success', request_id: 'valuation-ok', data: { item: [] } }), { headers: { 'content-type': 'application/json' } });
  };
  const client = createFuyaoClient(fetchFn, 'secret-key');
  await client.valuations(['002594.sz', '600519.SH']);
  assert.match(calls[0].url, /a-share\/valuations\/snapshot\?thscodes=002594.SZ%2C600519.SH/);
  assert.equal(calls[0].init.headers['X-api-key'], 'secret-key');
  assert.doesNotMatch(calls[0].url, /secret-key/);
  assert.throws(() => client.valuations(['not-a-code']), /thscode/);
});

test('client fails closed when runtime key is absent', () => {
  assert.throws(() => createFuyaoClient(fetch, ''), /FUYAO_API_KEY/);
});
