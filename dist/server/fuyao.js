const BASE_URL = 'https://fuyao.aicubes.cn';

export class FuyaoError extends Error {
  constructor(message, { code = 'upstream_error', requestId = null, upstreamCode = null, status = 502 } = {}) {
    super(message);
    this.name = 'FuyaoError';
    this.code = code;
    this.requestId = requestId;
    this.upstreamCode = upstreamCode;
    this.status = status;
  }
}

export function validateThscode(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!/^\d{6}\.(SZ|SH|BJ)$/.test(normalized)) {
    throw new FuyaoError('thscode must be a canonical A-share code', { code: 'invalid_input', status: 400 });
  }
  return normalized;
}

function validateThscodes(values) {
  const input = Array.isArray(values) ? values : String(values ?? '').split(',');
  const normalized = [...new Set(input.map(validateThscode))];
  if (!normalized.length) throw new FuyaoError('thscodes are required', { code: 'invalid_input', status: 400 });
  if (normalized.length > 100) throw new FuyaoError('thscodes accepts at most 100 codes', { code: 'invalid_input', status: 400 });
  return normalized.join(',');
}

const businessCodes = {
  2001: ['auth_invalid', 503],
  2003: ['permission_denied', 403],
  4001: ['rate_limited', 429],
  5002: ['upstream_timeout', 504],
  5003: ['upstream_error', 502],
};

export async function normalizeEnvelope(response) {
  if (!response.ok) {
    throw new FuyaoError(`Fuyao HTTP ${response.status}`, { code: 'upstream_http_error', status: 502 });
  }
  let envelope;
  try {
    envelope = await response.json();
  } catch {
    throw new FuyaoError('Fuyao returned invalid JSON', { code: 'invalid_upstream_response', status: 502 });
  }
  if (envelope?.code !== 0) {
    const [code, status] = businessCodes[envelope?.code] ?? ['upstream_business_error', 502];
    throw new FuyaoError(`Fuyao business error ${envelope?.code ?? 'unknown'}`, {
      code,
      status,
      requestId: envelope?.request_id ?? null,
      upstreamCode: envelope?.code ?? null,
    });
  }
  return { data: envelope.data, requestId: envelope.request_id ?? null, message: envelope.message ?? 'success' };
}

function queryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export function createFuyaoClient(fetchFn, apiKey) {
  if (!apiKey) throw new FuyaoError('FUYAO_API_KEY is not configured', { code: 'auth_missing', status: 503 });
  if (typeof fetchFn !== 'function') throw new TypeError('fetchFn must be a function');

  async function get(path, params = {}) {
    const url = `${BASE_URL}${path}?${queryString(params)}`;
    const response = await fetchFn(url, {
      method: 'GET',
      headers: { 'X-api-key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    return normalizeEnvelope(response);
  }

  return {
    search(q, limit = 8) {
      const clean = String(q ?? '').trim().slice(0, 40);
      if (!clean) throw new FuyaoError('search query is required', { code: 'invalid_input', status: 400 });
      return get('/api/meta/tickers/search', { q: clean, limit: Math.min(Math.max(Number(limit) || 8, 1), 12) });
    },
    snapshot(thscode) {
      return get('/api/a-share/prices/snapshot', { thscodes: validateThscode(thscode) });
    },
    historical(thscode, start, end) {
      return get('/api/a-share/prices/historical', {
        thscode: validateThscode(thscode), interval: '1d', start, end, adjust: 'forward',
      });
    },
    incomeStatements(thscode, limit = 8) {
      return get('/api/a-share/financials/income-statements', { thscode: validateThscode(thscode), period: 'quarterly', limit });
    },
    balanceSheets(thscode, limit = 8) {
      return get('/api/a-share/financials/balance-sheets', { thscode: validateThscode(thscode), period: 'quarterly', limit });
    },
    cashFlowStatements(thscode, limit = 8) {
      return get('/api/a-share/financials/cash-flow-statements', { thscode: validateThscode(thscode), period: 'quarterly', limit });
    },
    indicators(thscode, report) {
      if (!/^20\d{2}-[1-4]$/.test(String(report))) {
        throw new FuyaoError('report must match yyyy-[1-4]', { code: 'invalid_input', status: 400 });
      }
      return get('/api/a-share/financials/indicators', { thscode: validateThscode(thscode), report });
    },
    valuations(thscodes) {
      return get('/api/a-share/valuations/snapshot', { thscodes: validateThscodes(thscodes) });
    },
  };
}
