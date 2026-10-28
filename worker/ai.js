export class AIRequestError extends Error {
  constructor(message, { code = 'ai_request_error', status = 400 } = {}) {
    super(message);
    this.name = 'AIRequestError';
    this.code = code;
    this.status = status;
  }
}

const blockedHosts = new Set(['localhost', '0.0.0.0', '::1', '[::1]']);

function isPrivateIPv4(hostname) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

export function normalizeAIEndpoint(value) {
  let endpoint;
  try {
    endpoint = new URL(String(value ?? '').trim());
  } catch {
    throw new AIRequestError('AI 接口地址无效', { code: 'invalid_ai_endpoint' });
  }
  const hostname = endpoint.hostname.toLowerCase();
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password
    || blockedHosts.has(hostname) || hostname.endsWith('.localhost') || isPrivateIPv4(hostname)) {
    throw new AIRequestError('AI 接口必须是可公开访问的 HTTPS 地址', { code: 'invalid_ai_endpoint' });
  }
  endpoint.hash = '';
  endpoint.search = '';
  const cleanPath = endpoint.pathname.replace(/\/+$/, '');
  endpoint.pathname = cleanPath.endsWith('/chat/completions')
    ? cleanPath
    : `${cleanPath}/chat/completions`.replace(/^\/\//, '/');
  return endpoint.toString();
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length > 40) {
    throw new AIRequestError('messages 格式无效', { code: 'invalid_ai_request' });
  }
  return messages.map(message => {
    const role = String(message?.role ?? '');
    if (!['system', 'user', 'assistant', 'tool'].includes(role)) {
      throw new AIRequestError('messages 包含不支持的角色', { code: 'invalid_ai_request' });
    }
    const content = typeof message?.content === 'string' ? message.content : message?.content;
    if (content == null || JSON.stringify(content).length > 120000) {
      throw new AIRequestError('messages 内容无效或过长', { code: 'invalid_ai_request' });
    }
    return { role, content };
  });
}

export async function analyzeWithAI(fetchFn, payload = {}) {
  const endpoint = normalizeAIEndpoint(payload.endpoint);
  const model = String(payload.model ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  if (!model || model.length > 120 || !apiKey || apiKey.length > 4096) {
    throw new AIRequestError('模型与临时 API Key 均为必填项', { code: 'invalid_ai_request' });
  }
  const body = {
    model,
    messages: normalizeMessages(payload.messages ?? []),
    temperature: 0.1,
  };
  if (Array.isArray(payload.tools) && payload.tools.length) body.tools = payload.tools.slice(0, 12);
  if (payload.outputSchema && typeof payload.outputSchema === 'object') {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'finscope_research', strict: true, schema: payload.outputSchema },
    };
  }

  let upstream;
  try {
    upstream = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AIRequestError('AI 服务暂时无法连接', { code: 'ai_network_error', status: 502 });
  }
  if (!upstream.ok) {
    throw new AIRequestError('AI 服务返回异常', { code: 'ai_upstream_error', status: 502 });
  }
  let result;
  try {
    result = await upstream.json();
  } catch {
    throw new AIRequestError('AI 服务返回了无法解析的结果', { code: 'ai_upstream_error', status: 502 });
  }
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new AIRequestError('AI 服务未返回可用内容', { code: 'ai_upstream_error', status: 502 });
  }
  return { content, model: String(result.model ?? model), usage: result.usage ?? null };
}
