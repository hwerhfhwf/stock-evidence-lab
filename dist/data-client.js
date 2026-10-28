export class ResearchClientError extends Error {
  constructor(message, { code = 'request_failed', status = 0, requestId = null } = {}) {
    super(message || '数据请求失败');
    this.name = 'ResearchClientError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

async function readPayload(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createResearchClient(fetchFn = globalThis.fetch) {
  if (typeof fetchFn !== 'function') throw new TypeError('fetchFn must be a function');

  async function request(path) {
    let response;
    try {
      response = await fetchFn(path, { headers: { accept: 'application/json' } });
    } catch (error) {
      throw new ResearchClientError('暂时无法连接数据服务', { code: 'network_error' }, { cause: error });
    }
    const payload = await readPayload(response);
    if (!response.ok) {
      const upstream = payload?.error ?? {};
      throw new ResearchClientError(upstream.message || `数据请求失败（${response.status}）`, {
        code: upstream.code || 'request_failed',
        status: response.status,
        requestId: upstream.requestId ?? null,
      });
    }
    return payload ?? {};
  }

  return Object.freeze({
    async search(query) {
      const clean = String(query ?? '').trim().slice(0, 40);
      if (!clean) return [];
      const payload = await request(`/api/search?q=${encodeURIComponent(clean)}`);
      return Array.isArray(payload.items) ? payload.items : [];
    },

    async research(company) {
      const thscode = String(company?.thscode ?? '').trim().toUpperCase();
      if (!/^\d{6}\.(SZ|SH|BJ)$/.test(thscode)) {
        throw new ResearchClientError('请选择有效的 A 股公司', { code: 'invalid_input', status: 400 });
      }
      const params = new URLSearchParams({ thscode });
      const name = String(company?.name ?? '').trim().slice(0, 80);
      if (name) params.set('name', name);
      return request(`/api/research?${params.toString()}`);
    },
  });
}
