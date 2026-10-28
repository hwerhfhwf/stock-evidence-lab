import { page, styles, appScript, diagnosisModelScript, finscopeDataScript, dataClientScript, researchViewScript, researchProtocolScript, aiAdapterScript, chartSpecScript } from './ui.js';
import { createFuyaoClient, FuyaoError } from './fuyao.js';
import { buildResearchBundle } from './research.js';
import { analyzeWithAI, AIRequestError } from './ai.js';
import { createCompanyProfileProvider } from './company-profile.js';

const securityHeaders = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'",
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

function response(body, { status = 200, contentType = 'application/json; charset=utf-8', cache = 'no-store' } = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { ...securityHeaders, 'content-type': contentType, 'cache-control': cache },
  });
}

function errorResponse(error) {
  const safe = error instanceof FuyaoError || error instanceof AIRequestError ? error : new FuyaoError('Unexpected server error');
  return response({
    error: {
      code: safe.code,
      message: safe.message,
      requestId: safe.requestId ?? null,
    },
  }, { status: safe.status ?? 500 });
}

function searchItems(data) {
  const candidates = Array.isArray(data) ? data : Array.isArray(data?.item) ? data.item : Array.isArray(data?.items) ? data.items : [];
  return candidates
    .filter((item) => /^\d{6}\.(SZ|SH|BJ)$/i.test(item?.thscode ?? ''))
    .slice(0, 8)
    .map((item) => ({
      thscode: item.thscode.toUpperCase(),
      ticker: item.ticker ?? item.thscode.slice(0, 6),
      name: item.name ?? item.name_cn ?? item.stock_name ?? item.short_name ?? item.security_name ?? item.ticker ?? item.thscode,
      market: item.market ?? item.exchange ?? 'A股',
    }));
}

export default {
  async fetch(request, env = {}, ctx = {}) {
    void ctx;
    const url = new URL(request.url);
    if (url.pathname === '/api/ai/analyze') {
      if (request.method !== 'POST') return response({ error: { code: 'method_not_allowed', message: 'Only POST is supported' } }, { status: 405 });
      try {
        const contentLength = Number(request.headers.get('content-length') ?? 0);
        if (contentLength > 180000) throw new AIRequestError('AI 请求内容过长', { code: 'invalid_ai_request', status: 413 });
        return response(await analyzeWithAI(fetch, await request.json()));
      } catch (error) {
        return errorResponse(error);
      }
    }
    if (request.method !== 'GET') return response({ error: { code: 'method_not_allowed', message: 'Only GET is supported' } }, { status: 405 });
    if (url.pathname === '/') return response(page, { contentType: 'text/html; charset=utf-8', cache: 'private, max-age=60' });
    if (url.pathname === '/styles.css') return response(styles, { contentType: 'text/css; charset=utf-8' });
    if (url.pathname === '/app.js') return response(appScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/diagnosis-model.js') return response(diagnosisModelScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/finscope-data.js') return response(finscopeDataScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/data-client.js') return response(dataClientScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/research-view.js') return response(researchViewScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/research-protocol.js') return response(researchProtocolScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/ai-adapter.js') return response(aiAdapterScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/chart-spec.js') return response(chartSpecScript, { contentType: 'text/javascript; charset=utf-8' });
    if (url.pathname === '/api/health') {
      return env.FUYAO_API_KEY
        ? response({ status: 'ok', provider: 'fuyao', secretConfigured: true })
        : response({ status: 'degraded', provider: 'fuyao', secretConfigured: false }, { status: 503 });
    }

    try {
      const client = createFuyaoClient(fetch, env.FUYAO_API_KEY);
      if (url.pathname === '/api/search') {
        const q = (url.searchParams.get('q') ?? '').trim();
        if (!q) throw new FuyaoError('search query is required', { code: 'invalid_input', status: 400 });
        const result = await client.search(q, 8);
        return response({ items: searchItems(result.data), requestId: result.requestId }, { cache: 'private, max-age=120' });
      }
      if (url.pathname === '/api/research') {
        const bundle = await buildResearchBundle(client, url.searchParams.get('thscode'), Date.now(), { profileProvider: createCompanyProfileProvider(fetch) });
        const name = (url.searchParams.get('name') ?? '').trim().slice(0, 80);
        bundle.company = {
          name: name || bundle.modules.profile?.data?.name || bundle.modules.market.snapshot?.name || bundle.thscode,
          thscode: bundle.thscode,
        };
        return response(bundle, { cache: 'private, max-age=90' });
      }
    } catch (error) {
      return errorResponse(error);
    }
    return response({ error: { code: 'not_found', message: 'Route not found' } }, { status: 404 });
  },
};
