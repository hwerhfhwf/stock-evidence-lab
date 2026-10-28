import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanyProfileProvider, eastmoneyCode } from '../worker/company-profile.js';

test('company profile adapter maps canonical A-share codes without leaking upstream structure', async () => {
  assert.equal(eastmoneyCode('000333.SZ'), 'SZ000333');
  assert.equal(eastmoneyCode('600519.SH'), 'SH600519');
  const provider = createCompanyProfileProvider(async url => {
    assert.match(url, /code=SZ000333/);
    return new Response(JSON.stringify({ jbzl: [{
      SECURITY_NAME_ABBR: '美的集团',
      EM2016: '家电-白色家电-白色家电',
      ORG_PROFILE: '覆盖智能家居、工业技术与机器人自动化等业务。',
      BUSINESS_SCOPE: '家用电器及相关设备的研发、制造与销售。',
    }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const result = await provider('000333.SZ');
  assert.equal(result.status, 'ok');
  assert.equal(result.data.industry, '家电-白色家电-白色家电');
  assert.match(result.data.summary, /智能家居/);
  assert.match(result.source.url, /SZ000333/);
});

test('company profile adapter degrades explicitly when the upstream is unavailable', async () => {
  const provider = createCompanyProfileProvider(async () => new Response('no', { status: 503 }));
  const result = await provider('600519.SH');
  assert.equal(result.status, 'unavailable');
  assert.equal(result.data, null);
  assert.equal(result.errors[0].code, 'profile_unavailable');
});
